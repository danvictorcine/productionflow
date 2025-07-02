import { db, auth, storage } from './config';
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
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

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
    const userId = getUserId();
    const batch = writeBatch(db);
    
    // Delete the project document
    const projectRef = doc(db, 'projects', projectId);
    batch.delete(projectRef);

    // Find and delete all associated transactions securely
    const transQuery = query(
        collection(db, 'transactions'), 
        where('projectId', '==', projectId), 
        where('userId', '==', userId) // This makes the query secure
    );
    const transSnapshot = await getDocs(transQuery);
    transSnapshot.forEach(doc => {
        batch.delete(doc.ref);
    });

    await batch.commit();
};


// User Profile Functions
export const createUserProfile = async (uid: string, name: string, email: string, photoURL: string | null = null) => {
  await setDoc(doc(db, 'users', uid), { 
    name, 
    email, 
    photoURL
  });
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
      photoURL: data.photoURL,
    };
  }
  return null;
}

export const updateUserProfile = async (uid: string, data: Partial<Omit<UserProfile, 'uid'>>) => {
    const userRef = doc(db, 'users', uid);
    await setDoc(userRef, data, { merge: true });

    if (auth.currentUser && auth.currentUser.uid === uid) {
      const authUpdateData: { displayName?: string; photoURL?: string | null } = {};
      if (data.name) {
        authUpdateData.displayName = data.name;
      }
      // Check for photoURL specifically, including null to remove it
      if (data.hasOwnProperty('photoURL')) {
        authUpdateData.photoURL = data.photoURL || null;
      }

      if (Object.keys(authUpdateData).length > 0) {
        await updateAuthProfile(auth.currentUser, authUpdateData);
      }
    }
};

export const uploadProfilePhoto = async (uid: string, file: Blob): Promise<string> => {
    const filePath = `users/${uid}/profile.jpg`;
    const storageRef = ref(storage, filePath);
    await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(storageRef);
    
    await updateUserProfile(uid, { photoURL: downloadURL });
    
    return downloadURL;
}

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


// Category Management
export const renameTransactionCategory = async (projectId: string, oldCategory: string, newCategory: string) => {
    const userId = getUserId();
    const batch = writeBatch(db);

    // 1. Update transactions
    const transQuery = query(
        collection(db, 'transactions'),
        where('projectId', '==', projectId),
        where('userId', '==', userId),
        where('category', '==', oldCategory)
    );
    const transSnapshot = await getDocs(transQuery);
    transSnapshot.forEach(doc => {
        batch.update(doc.ref, { category: newCategory });
    });

    // 2. Update project's customCategories array
    const projectRef = doc(db, 'projects', projectId);
    const projectSnap = await getDoc(projectRef);
    if (projectSnap.exists()) {
        const projectData = projectSnap.data() as Project;
        if (projectData.userId === userId) {
            const updatedCategories = (projectData.customCategories || []).map(c => c === oldCategory ? newCategory : c);
            batch.update(projectRef, { customCategories: updatedCategories });
        }
    }

    await batch.commit();
};

// Data Import/Export
export const importData = async (data: { projects: Project[], transactions: Transaction[] }) => {
  const userId = getUserId();
  const batch = writeBatch(db);
  const projectIdMap = new Map<string, string>();

  // Fetch existing projects to check for name collisions
  const existingProjects = await getProjects();
  const existingProjectNames = new Set(existingProjects.map(p => p.name));

  // Process projects
  for (const project of data.projects) {
    const { id: oldProjectId, userId: oldUserId, ...restOfProject } = project;
    
    let newName = project.name;
    let counter = 2;
    while (existingProjectNames.has(newName)) {
        newName = `${project.name} (${counter})`;
        counter++;
    }
    existingProjectNames.add(newName); // Add to set to handle duplicates within the import file itself

    const newProjectRef = doc(collection(db, 'projects'));
    projectIdMap.set(oldProjectId, newProjectRef.id);

    const newProjectData = {
      ...restOfProject,
      name: newName,
      userId,
      installments: (project.installments || []).map(inst => ({
        ...inst,
        date: Timestamp.fromDate(new Date(inst.date)),
      })),
    };
    
    batch.set(newProjectRef, newProjectData);
  }

  // Process transactions
  for (const transaction of data.transactions) {
    const { id: oldTxId, userId: oldTxUserId, projectId: oldTxProjectId, ...restOfTx } = transaction;

    const newProjectId = projectIdMap.get(oldTxProjectId);
    if (!newProjectId) {
      console.warn(`Skipping transaction for unknown project ID: ${oldTxProjectId}`);
      continue;
    }

    const newTransactionRef = doc(collection(db, 'transactions'));
    const newTransactionData = {
      ...restOfTx,
      userId,
      projectId: newProjectId,
      date: Timestamp.fromDate(new Date(transaction.date)),
    };

    batch.set(newTransactionRef, newTransactionData);
  }

  await batch.commit();
};
