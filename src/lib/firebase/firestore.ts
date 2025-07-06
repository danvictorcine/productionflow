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
  deleteField,
  limit,
} from 'firebase/firestore';
import { sendPasswordResetEmail, updateProfile as updateAuthProfile } from "firebase/auth";
import type { Project, Transaction, UserProfile, Production, ShootingDay, Post } from '@/lib/types';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

// Helper to get current user ID
const getUserId = () => {
  const user = auth.currentUser;
  if (!user) throw new Error('Usuário não autenticado.');
  return user.uid;
};

// Project Functions (Financial)
export const addProject = async (projectData: Omit<Project, 'id' | 'userId' | 'createdAt'>) => {
  const userId = getUserId();
  const docRef = await addDoc(collection(db, 'projects'), {
    ...projectData,
    userId,
    createdAt: Timestamp.now(),
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
      createdAt: data.createdAt ? (data.createdAt as Timestamp).toDate() : new Date(0),
    } as Project);
  });
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
               createdAt: projectData.createdAt ? (projectData.createdAt as Timestamp).toDate() : new Date(0),
            };
        }
    }
    return null;
}

export const updateProject = async (projectId: string, projectData: Partial<Omit<Project, 'id' | 'userId' | 'createdAt'>>) => {
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

    const projectRef = doc(db, 'projects', projectId);
    batch.delete(projectRef);

    const transQuery = query(
        collection(db, 'transactions'),
        where('projectId', '==', projectId),
        where('userId', '==', userId)
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
    photoURL,
    isAdmin: email === 'danvictor20@gmail.com', // Automatically make specific user admin
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
      isAdmin: data.isAdmin || false,
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

  const existingProjects = await getProjects();
  const existingProjectNames = new Set(existingProjects.map(p => p.name));

  for (const project of data.projects) {
    const { id: oldProjectId, userId: oldUserId, ...restOfProject } = project;

    let newName = project.name;
    let counter = 2;
    while (existingProjectNames.has(newName)) {
        newName = `${project.name} (${counter})`;
        counter++;
    }
    existingProjectNames.add(newName);

    const newProjectRef = doc(collection(db, 'projects'));
    projectIdMap.set(oldProjectId, newProjectRef.id);

    const newProjectData = {
      ...restOfProject,
      name: newName,
      userId,
      createdAt: Timestamp.now(),
      installments: (project.installments || []).map(inst => ({
        ...inst,
        date: Timestamp.fromDate(new Date(inst.date)),
      })),
    };

    batch.set(newProjectRef, newProjectData);
  }

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


// === Production (Call Sheet) Functions ===

export const addProduction = async (data: Omit<Production, 'id' | 'userId' | 'createdAt'>) => {
  const userId = getUserId();
  await addDoc(collection(db, 'productions'), {
    ...data,
    userId,
    createdAt: Timestamp.now(),
  });
};

export const getProductions = async (): Promise<Production[]> => {
  const userId = getUserId();
  const q = query(collection(db, 'productions'), where('userId', '==', userId));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      createdAt: data.createdAt ? (data.createdAt as Timestamp).toDate() : new Date(0),
    } as Production;
  });
};

export const getProduction = async (productionId: string): Promise<Production | null> => {
  const userId = getUserId();
  const docRef = doc(db, 'productions', productionId);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists() && docSnap.data().userId === userId) {
    const data = docSnap.data();
    return {
      id: docSnap.id,
      ...data,
      createdAt: data.createdAt ? (data.createdAt as Timestamp).toDate() : new Date(0),
    } as Production;
  }
  return null;
};

export const updateProduction = async (productionId: string, data: Partial<Omit<Production, 'id' | 'userId' | 'createdAt'>>) => {
  const docRef = doc(db, 'productions', productionId);
  await updateDoc(docRef, data);
};

export const deleteProductionAndDays = async (productionId: string) => {
  const userId = getUserId();
  const batch = writeBatch(db);

  const productionRef = doc(db, 'productions', productionId);
  batch.delete(productionRef);

  const daysQuery = query(
    collection(db, 'shooting_days'),
    where('productionId', '==', productionId),
    where('userId', '==', userId)
  );
  const daysSnapshot = await getDocs(daysQuery);
  daysSnapshot.forEach(doc => batch.delete(doc.ref));

  await batch.commit();
};

// === Shooting Day Functions ===

export const addShootingDay = async (productionId: string, data: Omit<ShootingDay, 'id' | 'userId' | 'productionId'>) => {
  const userId = getUserId();
  await addDoc(collection(db, 'shooting_days'), {
    ...data,
    productionId,
    userId,
    date: Timestamp.fromDate(data.date),
  });
};

export const getShootingDays = async (productionId: string): Promise<ShootingDay[]> => {
  const userId = getUserId();
  const q = query(
    collection(db, 'shooting_days'),
    where('productionId', '==', productionId),
    where('userId', '==', userId)
  );
  const querySnapshot = await getDocs(q);
  const days = querySnapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      date: (data.date as Timestamp).toDate(),
    } as ShootingDay;
  });
  days.sort((a, b) => a.date.getTime() - b.date.getTime());
  return days;
};

export const updateShootingDay = async (dayId: string, data: Partial<Omit<ShootingDay, 'id' | 'userId' | 'productionId'>>) => {
  const docRef = doc(db, 'shooting_days', dayId);
  const dataToUpdate: Record<string, any> = { ...data };
   if (data.date) {
        dataToUpdate.date = Timestamp.fromDate(data.date);
    }
  
  if (data.hasOwnProperty('weather') && data.weather === undefined) {
      dataToUpdate.weather = deleteField();
  }

  await updateDoc(docRef, dataToUpdate);
};

export const deleteShootingDay = async (dayId: string) => {
  const docRef = doc(db, 'shooting_days', dayId);
  await deleteDoc(docRef);
};

// === Blog Post Functions ===

export const getPosts = async (limitCount?: number): Promise<Post[]> => {
  const postsCollection = collection(db, 'posts');
  let q = query(postsCollection, orderBy('createdAt', 'desc'));
  
  if (limitCount) {
    q = query(q, limit(limitCount));
  }

  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      createdAt: (data.createdAt as Timestamp).toDate(),
    } as Post;
  });
};

export const getPost = async (postId: string): Promise<Post | null> => {
    const postRef = doc(db, 'posts', postId);
    const postSnap = await getDoc(postRef);

    if (postSnap.exists()) {
        const data = postSnap.data();
        return {
            id: postSnap.id,
            ...data,
            createdAt: (data.createdAt as Timestamp).toDate(),
        } as Post;
    }
    return null;
}

export const addPost = async (data: Omit<Post, 'id'|'createdAt'>) => {
  await addDoc(collection(db, 'posts'), {
    ...data,
    createdAt: Timestamp.now(),
  });
};

export const updatePost = async (postId: string, data: Partial<Omit<Post, 'id'|'createdAt'>>) => {
  const docRef = doc(db, 'posts', postId);
  await updateDoc(docRef, {
      ...data,
      updatedAt: Timestamp.now()
  });
};

export const deletePost = async (postId: string) => {
  const docRef = doc(db, 'posts', postId);
  await deleteDoc(docRef);
};

export const uploadImageForPost = async (file: File): Promise<string> => {
  const timestamp = new Date().getTime();
  const randomString = Math.random().toString(36).substring(2, 8);
  const fileName = `${timestamp}-${randomString}-${file.name}`;
  const filePath = `posts/images/${fileName}`;
  const storageRef = ref(storage, filePath);
  
  await uploadBytes(storageRef, file);
  const downloadURL = await getDownloadURL(storageRef);
  
  return downloadURL;
};
