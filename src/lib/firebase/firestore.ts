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
import type { Project, Transaction, UserProfile } from '@/lib/types';

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
    } as Project);
  });
  // Sort projects alphabetically by name in the code
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
            return { ...projectData, id: projectSnap.id };
        }
    }
    return null;
}

export const updateProject = async (projectId: string, projectData: Partial<Omit<Project, 'id' | 'userId'>>) => {
  const projectRef = doc(db, 'projects', projectId);
  await updateDoc(projectRef, projectData);
};

export const deleteProject = async (projectId: string) => {
    const batch = writeBatch(db);

    // Delete project
    const projectRef = doc(db, 'projects', projectId);
    batch.delete(projectRef);

    // Delete associated transactions
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
    await updateDoc(userRef, data);

    // Also update the auth profile display name
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
  await addDoc(collection(db, 'transactions'), {
    ...transactionData,
    date: Timestamp.fromDate(transactionData.date),
    userId
  });
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
    // Sort transactions by date descending in the code
    transactions.sort((a, b) => b.date.getTime() - a.date.getTime());
    return transactions;
};

export const deleteTransaction = async (transactionId: string) => {
    const transRef = doc(db, 'transactions', transactionId);
    await deleteDoc(transRef);
};
