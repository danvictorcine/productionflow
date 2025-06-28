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
} from 'firebase/firestore';
import type { Project, Transaction } from '@/lib/types';

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
  const q = query(collection(db, 'projects'), where('userId', '==', userId), orderBy('name'));
  const querySnapshot = await getDocs(q);
  const projects: Project[] = [];
  querySnapshot.forEach((doc) => {
    const data = doc.data();
    projects.push({
        ...data,
        id: doc.id,
    } as Project);
  });
  return projects;
};

export const getProject = async (projectId: string): Promise<Project | null> => {
    const userId = getUserId();
    const projectRef = doc(db, 'projects', projectId);
    const projectSnap = await getDoc(projectRef);

    if (projectSnap.exists()) {
        const projectData = projectSnap.data() as Project;
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
        where('userId', '==', userId),
        orderBy('date', 'desc')
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
    return transactions;
};

export const deleteTransaction = async (transactionId: string) => {
    const transRef = doc(db, 'transactions', transactionId);
    await deleteDoc(transRef);
};
