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
import type { Project, Transaction, UserProfile, Production, ShootingDay, Post, PageContent, LoginFeature, CreativeProject, BoardItem, LoginPageContent, AboutPageContent } from '@/lib/types';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';

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
        const projectData = projectSnap.data();
        if (projectData.userId === userId) {
            return {
              ...projectData,
              id: projectSnap.id,
              installments: (projectData.installments || []).map((inst: any) => ({
                ...inst,
                date: (inst.date as Timestamp).toDate()
              })),
               createdAt: projectData.createdAt ? (projectData.createdAt as Timestamp).toDate() : new Date(0),
            } as Project;
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

// === Creative Project Functions ===
export const addCreativeProject = async (data: Omit<CreativeProject, 'id' | 'userId' | 'createdAt'>) => {
  const userId = getUserId();
  await addDoc(collection(db, 'creative_projects'), {
    ...data,
    userId,
    createdAt: Timestamp.now(),
  });
};

export const getCreativeProjects = async (): Promise<CreativeProject[]> => {
  const userId = getUserId();
  const q = query(collection(db, 'creative_projects'), where('userId', '==', userId));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      createdAt: data.createdAt ? (data.createdAt as Timestamp).toDate() : new Date(0),
    } as CreativeProject;
  });
};

export const getCreativeProject = async (projectId: string): Promise<CreativeProject | null> => {
    const userId = getUserId();
    const docRef = doc(db, 'creative_projects', projectId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists() && docSnap.data().userId === userId) {
        const data = docSnap.data();
        return {
            id: docSnap.id,
            ...data,
            createdAt: data.createdAt ? (data.createdAt as Timestamp).toDate() : new Date(0),
        } as CreativeProject;
    }
    return null;
}

export const updateCreativeProject = async (projectId: string, data: Partial<Omit<CreativeProject, 'id' | 'userId' | 'createdAt'>>) => {
  const docRef = doc(db, 'creative_projects', projectId);
  await updateDoc(docRef, data);
};

export const deleteCreativeProjectAndItems = async (projectId: string) => {
  const userId = getUserId();
  const batch = writeBatch(db);

  const projectRef = doc(db, 'creative_projects', projectId);
  batch.delete(projectRef);

  const itemsQuery = query(
    collection(db, 'board_items'),
    where('projectId', '==', projectId),
    where('userId', '==', userId)
  );
  const itemsSnapshot = await getDocs(itemsQuery);
  itemsSnapshot.forEach(doc => batch.delete(doc.ref));

  await batch.commit();
};

export const getBoardItems = async (projectId: string): Promise<BoardItem[]> => {
  const userId = getUserId();
  const q = query(
    collection(db, 'board_items'),
    where('projectId', '==', projectId),
    where('userId', '==', userId),
    orderBy('createdAt', 'asc')
  );
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      createdAt: (data.createdAt as Timestamp).toDate(),
    } as BoardItem;
  });
}

export const addBoardItem = async (projectId: string, itemData: Omit<BoardItem, 'id' | 'userId' | 'projectId' | 'createdAt'>) => {
  const userId = getUserId();
  const docRef = await addDoc(collection(db, 'board_items'), {
    ...itemData,
    projectId,
    userId,
    createdAt: Timestamp.now(),
  });
  return docRef.id;
}

export const updateBoardItem = async (itemId: string, data: Partial<Omit<BoardItem, 'id' | 'userId' | 'projectId' | 'createdAt'>>) => {
  const itemRef = doc(db, 'board_items', itemId);
  await updateDoc(itemRef, data);
}

export const deleteBoardItem = async (itemId: string) => {
  const itemRef = doc(db, 'board_items', itemId);
  const itemSnap = await getDoc(itemRef);

  if (itemSnap.exists()) {
    const itemData = itemSnap.data();
    // If it's an image with a Firebase Storage URL, delete it from storage first
    if (itemData.type === 'image' && itemData.content && itemData.content.includes('firebasestorage.googleapis.com')) {
      try {
        const imageRef = ref(storage, itemData.content);
        await deleteObject(imageRef);
      } catch (error: any) {
        // If file doesn't exist or other error, log it but don't block deletion of firestore doc
        if (error.code !== 'storage/object-not-found') {
          console.error("Could not delete image from storage:", error);
        }
      }
    }
  }

  await deleteDoc(itemRef);
};

export const uploadImageForBoard = async (file: File): Promise<string> => {
  const timestamp = new Date().getTime();
  const randomString = Math.random().toString(36).substring(2, 8);
  const fileName = `${timestamp}-${randomString}-${file.name}`;
  const filePath = `board_images/${getUserId()}/${fileName}`;
  const storageRef = ref(storage, filePath);
  
  await uploadBytes(storageRef, file);
  const downloadURL = await getDownloadURL(storageRef);
  
  return downloadURL;
};

// === Blog & Page Content Functions ===

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

export const addPost = async (data: Omit<Post, 'id'|'createdAt'|'updatedAt'>) => {
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

export const getPage = async (pageId: 'about' | 'contact' | 'terms'): Promise<any | null> => {
  const pageRef = doc(db, 'pages', pageId);
  const pageSnap = await getDoc(pageRef);

  if (pageSnap.exists()) {
    const data = pageSnap.data();
    const result: PageContent = {
      id: pageSnap.id,
      ...data,
      updatedAt: (data.updatedAt as Timestamp).toDate(),
    } as PageContent
    
    // For 'about' page, ensure team array exists
    if (result.id === 'about' && !result.team) {
      result.team = [];
    }

    return result;
  }
  return null;
};

export const updatePage = async (pageId: 'about' | 'contact' | 'terms', data: Partial<PageContent>) => {
  const pageRef = doc(db, 'pages', pageId);
  await setDoc(pageRef, {
    ...data,
    updatedAt: Timestamp.now(),
  }, { merge: true });
};

export const uploadAboutTeamMemberPhoto = async (file: File, memberId: string): Promise<string> => {
  const filePath = `pages/about/team/${memberId}-${file.name}`;
  const storageRef = ref(storage, filePath);
  await uploadBytes(storageRef, file);
  return await getDownloadURL(storageRef);
}


// === Login Page Features ===

export const getLoginPageContent = async (): Promise<LoginPageContent> => {
  const docRef = doc(db, 'pages', 'login');
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    return docSnap.data() as LoginPageContent;
  }

  // Return default hardcoded values if nothing exists in Firestore
  return {
    features: [
      { title: 'Orçamento Inteligente', description: 'Controle seu orçamento, despesas e saldo em tempo real, com gráficos claros e detalhados.', icon: 'DollarSign', order: 0, id: 'default-0' },
      { title: 'Gestão de Equipe Completa', description: 'Cadastre sua equipe, gerencie informações de contato e controle pagamentos de cachês e diárias.', icon: 'Users', order: 1, id: 'default-1' },
      { title: 'Ordem do Dia Detalhada', description: 'Crie e gerencie Ordens do Dia (Call Sheets) com horários, cenas, clima e checklists interativos.', icon: 'Clapperboard', order: 2, id: 'default-2' },
      { title: 'Relatórios Simplificados', description: 'Exporte relatórios financeiros e de produção para Excel e PDF com um clique.', icon: 'FileSpreadsheet', order: 3, id: 'default-3' },
    ],
    backgroundImageUrl: '',
    isBackgroundEnabled: false,
  };
};

export const saveLoginPageContent = async (content: Omit<LoginPageContent, 'features'> & { features: Omit<LoginFeature, 'id'>[] }) => {
  const docRef = doc(db, 'pages', 'login');
  const dataToSave = {
    ...content,
    features: content.features.map((feature, index) => ({...feature, order: index}))
  }
  await setDoc(docRef, dataToSave, { merge: true });
};

export const uploadLoginBackground = async (file: File): Promise<string> => {
  const filePath = `pages/login/background.jpg`; // Fixed name to auto-replace
  const storageRef = ref(storage, filePath);
  await uploadBytes(storageRef, file);
  return await getDownloadURL(storageRef);
}


export const deleteImageFromUrl = async (url: string): Promise<void> => {
  if (!url.includes('firebasestorage.googleapis.com')) {
    return;
  }

  try {
    const imageRef = ref(storage, url);
    await deleteObject(imageRef);
  } catch (error: any) {
    if (error.code === 'storage/object-not-found') {
      console.warn(`Image for deletion not found in storage: ${url}`);
    } else {
      console.error(`Error deleting image from storage: ${url}`, error);
    }
  }
};
