import { db, auth } from './config';
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  doc,
  updateDoc,
  deleteDoc,
  Timestamp,
  orderBy,
  writeBatch,
  getDoc,
  setDoc,
} from 'firebase/firestore';
import { sendPasswordResetEmail, updateProfile as updateAuthProfile } from "firebase/auth";
import type { Project, Transaction, UserProfile, Installment } from '@/lib/types';

// Helper to get current user ID
const getUserId = () => {
  const user = auth.currentUser;
  if (!user) throw new Error('Usuário não autenticado.');
  return user.uid;
};

// Project Functions
export const addProject = async (projectData: Omit<Project, 'id' | 'userId'>) => {
  const userId = getUserId();
  const docRef = await addDoc(collection(db, 'projects'), { 
    ...projectData, 
    userId,
    installments: (projectData.installments || []).map(inst => ({
      ...inst,
      date: Timestamp.fromDate(inst.date),
    })),
  });
  return docRef.id;
};

export const getProjects = async (): Promise<Project[]> => {
  const userId = getUserId();
  const q = query(collection(db, 'projects'), where('userId', '==', userId));
  const querySnapshot = await getDocs(q);
  const projects: Project[] = [];
  querySnapshot.forEach((doc) => {
    const data = doc.data();
    projects.push({ 
      ...data, 
      id: doc.id,
      installments: (data.installments || []).map((inst: any) => ({
        ...inst,
        date: (inst.date as Timestamp).toDate()
      })),
    } as Project);
  });
  projects.sort((a, b) => a.name.localeCompare(b.name));
  return projects;
};

export const getProject = async (projectId: string): Promise<Project | null> => {
    const userId = getUserId();
    const projectRef = doc(db, 'projects', projectId);
    const projectSnap = await getDoc(projectRef);

    if (projectSnap.exists()) {
        const projectData = projectSnap.data() as Omit<Project, 'id'>;
        if (projectData.userId === userId) {
            return { 
              ...projectData, 
              id: projectSnap.id,
              installments: (projectData.installments || []).map((inst: any) => ({
                ...inst,
                date: (inst.date as Timestamp).toDate()
              })),
            };
        }
    }
    return null;
}

export const updateProject = async (projectId: string, projectData: Partial<Omit<Project, 'id' | 'userId'>>) => {
  const projectRef = doc(db, 'projects', projectId);
  const dataToUpdate: Record<string, any> = { ...projectData };
  if (projectData.installments) {
    dataToUpdate.installments = projectData.installments.map(inst => ({
      ...inst,
      date: Timestamp.fromDate(inst.date),
    }));
  }
  await updateDoc(projectRef, dataToUpdate);
};

export const deleteProject = async (projectId: string) => {
    const batch = writeBatch(db);
    const projectRef = doc(db, 'projects', projectId);
    batch.delete(projectRef);
    const transQuery = query(collection(db, 'transactions'), where('projectId', '==', projectId));
    const transSnapshot = await getDocs(transQuery);
    transSnapshot.forEach(doc => {
        batch.delete(doc.ref);
    });
    await batch.commit();
};


// User Profile Functions
export const createUserProfile = async (uid: string, name: string, email: string) => {
  await setDoc(doc(db, 'users', uid), { name, email });
};

export const getUserProfile = async (uid:string): Promise<UserProfile | null> => {
  const userRef = doc(db, "users", uid);
  const userSnap = await getDoc(userRef);

  if (userSnap.exists()) {
    const data = userSnap.data();
    return {
      uid,
      name: data.name,
      email: data.email,
    };
  }
  return null;
}

export const updateUserProfile = async (uid: string, data: { name: string }) => {
    const userRef = doc(db, 'users', uid);
    await setDoc(userRef, data, { merge: true });
    if (auth.currentUser && auth.currentUser.uid === uid) {
      await updateAuthProfile(auth.currentUser, { displayName: data.name });
    }
};

export const sendPasswordReset = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
}


// Transaction Functions
export const addTransaction = async (transactionData: Omit<Transaction, 'id' | 'userId'>) => {
  const userId = getUserId();
  const data = {
    ...transactionData,
    amount: transactionData.amount,
    date: Timestamp.fromDate(transactionData.date),
    userId,
    status: transactionData.status || 'planned',
  };
  await addDoc(collection(db, 'transactions'), data);
};

export const addTransactionsBatch = async (transactionsData: Omit<Transaction, 'id' | 'userId'>[]) => {
  const userId = getUserId();
  const batch = writeBatch(db);

  transactionsData.forEach(transaction => {
    const transactionCollection = collection(db, 'transactions');
    const docRef = doc(transactionCollection);
    const data = {
      ...transaction,
      amount: transaction.amount,
      date: Timestamp.fromDate(transaction.date),
      userId,
      status: transaction.status || 'planned',
    };
    batch.set(docRef, data);
  });

  await batch.commit();
};

export const getTransactions = async (projectId: string): Promise<Transaction[]> => {
    const userId = getUserId();
    const q = query(
        collection(db, 'transactions'), 
        where('projectId', '==', projectId),
        where('userId', '==', userId)
    );
    const querySnapshot = await getDocs(q);
    const transactions: Transaction[] = [];
    querySnapshot.forEach((doc) => {
        const data = doc.data();
        transactions.push({
            ...data,
            id: doc.id,
            date: (data.date as Timestamp).toDate(),
        } as Transaction);
    });
    transactions.sort((a, b) => b.date.getTime() - a.date.getTime());
    return transactions;
};

export const updateTransaction = async (transactionId: string, transactionData: Partial<Transaction>) => {
    const transRef = doc(db, 'transactions', transactionId);
    
    const dataToUpdate: Record<string, any> = { ...transactionData };
    if (transactionData.date) {
        dataToUpdate.date = Timestamp.fromDate(transactionData.date);
    }
    
    await updateDoc(transRef, dataToUpdate);
};

export const deleteTransaction = async (transactionId: string) => {
    const transRef = doc(db, 'transactions', transactionId);
    await deleteDoc(transRef);
};
