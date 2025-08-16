
// @/src/lib/firebase/firestore.ts

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
import type { Project, Transaction, UserProfile, Production, ShootingDay, Post, PageContent, LoginFeature, CreativeProject, BoardItem, LoginPageContent, TeamMemberAbout, ThemeSettings, Storyboard, StoryboardScene, StoryboardPanel, BetaLimits, TeamMember, ChecklistItem, ExportedProjectData, UnifiedProject, DisplayableItem, Talent } from '@/lib/types';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { DEFAULT_BETA_LIMITS } from '../app-config';

// Helper to get current user ID, returns null if not authenticated for public views
const getUserId = () => {
  return auth?.currentUser?.uid || null;
};


// Project Functions (Financial)
export const addProject = async (projectData: Omit<Project, 'id' | 'userId' | 'createdAt'>): Promise<string> => {
  const userId = getUserId();
  if (!userId) throw new Error("Usuário não autenticado.");
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
    if (!userId) return [];

    const collRef = collection(db, 'projects');
    const q = query(collRef, where('userId', '==', userId));
    const querySnapshot = await getDocs(q);

    const projects = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
            ...data,
            id: doc.id,
            createdAt: data.createdAt ? (data.createdAt as Timestamp).toDate() : new Date(0),
            installments: (data.installments || []).map((inst: any) => ({ ...inst, date: (inst.date as Timestamp).toDate() }))
        } as Project;
    });

    projects.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return projects;
};

export const getProject = async (projectId: string): Promise<Project | null> => {
    const userId = getUserId();
    if (!userId) return null;

    const projectRef = doc(db, "projects", projectId);
    const projectSnap = await getDoc(projectRef);

    if (!projectSnap.exists() || projectSnap.data().userId !== userId) {
        return null;
    }

    const projectData = projectSnap.data();
    
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

export const updateProject = async (projectId: string, projectData: Partial<Omit<Project, 'id' | 'userId' | 'createdAt'>>) => {
  const userId = getUserId();
  if (!userId) throw new Error("Usuário não autenticado.");
  const projectRef = doc(db, 'projects', projectId);
  
  const docSnap = await getDoc(projectRef);
  if (!docSnap.exists() || docSnap.data().userId !== userId) {
      throw new Error("Permission denied to update this project.");
  }
  
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
    if (!userId) throw new Error("Usuário não autenticado.");
    const batch = writeBatch(db);

    const projectRef = doc(db, 'projects', projectId);
    const docSnap = await getDoc(projectRef);
    if (!docSnap.exists() || docSnap.data().userId !== userId) {
        throw new Error("Permission denied to delete this project.");
    }
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

export const uploadProfilePhoto = async (uid: string, file: File): Promise<string> => {
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
export const addTransaction = async (transactionData: Omit<Transaction, 'id'>) => {
  const userId = getUserId();
  if (!userId) throw new Error("Usuário não autenticado.");
  const data = {
    ...transactionData,
    userId,
    amount: transactionData.amount,
    date: Timestamp.fromDate(transactionData.date),
    status: transactionData.status || 'planned',
  };
  await addDoc(collection(db, 'transactions'), data);
};

export const addTransactionsBatch = async (transactionsData: Omit<Transaction, 'id' | 'userId'>[]) => {
  const userId = getUserId();
  if (!userId) throw new Error("Usuário não autenticado.");
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
    if (!userId) return [];
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
    const userId = getUserId();
    if (!userId) throw new Error("Usuário não autenticado.");
    const transRef = doc(db, 'transactions', transactionId);

    const docSnap = await getDoc(transRef);
    if (!docSnap.exists() || docSnap.data().userId !== userId) {
        throw new Error("Permission denied to update this transaction.");
    }
    
    const dataToUpdate: Record<string, any> = { ...transactionData };
    if (transactionData.date) {
        dataToUpdate.date = Timestamp.fromDate(transactionData.date);
    }

    await updateDoc(transRef, dataToUpdate);
};

export const deleteTransaction = async (transactionId: string) => {
    const userId = getUserId();
    if (!userId) throw new Error("Usuário não autenticado.");
    const transRef = doc(db, 'transactions', transactionId);
    
    const docSnap = await getDoc(transRef);
    if (!docSnap.exists() || docSnap.data().userId !== userId) {
        throw new Error("Permission denied to delete this transaction.");
    }

    await deleteDoc(transRef);
};


// Category Management
export const renameTransactionCategory = async (projectId: string, oldCategory: string, newCategory: string) => {
    const userId = getUserId();
    if (!userId) throw new Error("Usuário não autenticado.");
    const batch = writeBatch(db);

    const projectRef = doc(db, 'projects', projectId);
    const projectSnap = await getDoc(projectRef);
    if (!projectSnap.exists() || projectSnap.data().userId !== userId) {
        throw new Error("Permission denied to modify this project's categories.");
    }

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

    
    const projectData = projectSnap.data() as Project;
    const updatedCategories = (projectData.customCategories || []).map(c => c === oldCategory ? newCategory : c);
    batch.update(projectRef, { customCategories: updatedCategories });

    await batch.commit();
};

// Data Import/Export
export const importData = async (data: { projects: Project[], transactions: Transaction[] }) => {
  const userId = getUserId();
  if (!userId) throw new Error("Usuário não autenticado.");
  const batch = writeBatch(db);
  const projectIdMap = new Map<string, string>();

  const existingProjectsSnapshot = await getDocs(query(collection(db, 'projects'), where('userId', '==', userId)));
  const existingProjectNames = new Set(existingProjectsSnapshot.docs.map(doc => doc.data().name));

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

// This function is kept for legacy support if ever needed, but is not actively used by the UI anymore for import/export.
export const getProjectDataForExport = async (projectId: string, projectType: DisplayableItem['itemType']): Promise<ExportedProjectData> => {
    const userId = getUserId();
    if (!userId) throw new Error("Usuário não autenticado.");
    
    switch (projectType) {
        case 'financial': {
            const project = await getProject(projectId);
            if (!project) throw new Error("Projeto Financeiro não encontrado.");
            const transactions = await getTransactions(projectId);
            return { type: 'financial', project, transactions };
        }
        case 'production': {
            const production = await getProduction(projectId);
            if (!production) throw new Error("Produção não encontrada.");
            const shootingDays = await getShootingDays(projectId);
            return { type: 'production', production, shootingDays };
        }
        case 'creative': {
            const creativeProject = await getCreativeProject(projectId);
            if (!creativeProject) throw new Error("Moodboard não encontrado.");
            const boardItems = await getBoardItems(creativeProject.id);
            return { type: 'creative', creativeProject, boardItems };
        }
        case 'storyboard': {
            const storyboard = await getStoryboard(storyboardId);
            if (!storyboard) throw new Error("Storyboard não encontrado.");
            const scenes = await getStoryboardScenes(storyboard.id);
            const panels = await getStoryboardPanels(storyboard.id);
            return { type: 'storyboard', storyboard, scenes, panels };
        }
        default:
            throw new Error("Tipo de projeto desconhecido para exportação.");
    }
};

// This function is kept for legacy support if ever needed.
export const importProject = async (data: ExportedProjectData) => {
    // ... implementation from previous version
};


// === Production (Call Sheet) Functions ===

export const addProduction = async (data: Omit<Production, 'id' | 'userId' | 'createdAt'>): Promise<string> => {
  const userId = getUserId();
  if (!userId) throw new Error("Usuário não autenticado.");
  const dataWithUser = { ...data, userId, createdAt: Timestamp.now() };
  const docRef = await addDoc(collection(db, 'productions'), dataWithUser);
  return docRef.id;
};

export const getProductions = async (): Promise<Production[]> => {
    const userId = getUserId();
    if (!userId) return [];
    const q = query(collection(db, 'productions'), where('userId', '==', userId));
    const querySnapshot = await getDocs(q);
    const productions = querySnapshot.docs.map(doc => {
      const data = doc.data();
      return ({ ...data, id: doc.id, createdAt: data.createdAt ? (data.createdAt as Timestamp).toDate() : new Date(0) }) as Production
    });
    productions.sort((a,b) => b.createdAt.getTime() - a.createdAt.getTime());
    return productions;
};

export const getProduction = async (productionId: string): Promise<Production | null> => {
  const userId = getUserId();
  // Allow public access by checking if userId is null
  const productionRef = doc(db, 'productions', productionId);
  const docSnap = await getDoc(productionRef);

  if (!docSnap.exists()) {
    return null;
  }
  // If a user is logged in, check for ownership. Public access is allowed if not logged in.
  if (userId && docSnap.data().userId !== userId) {
    return null;
  }
  const data = docSnap.data();
  return {
    id: docSnap.id,
    ...data,
    createdAt: data.createdAt ? (data.createdAt as Timestamp).toDate() : new Date(0),
  } as Production;
};

export const updateProduction = async (productionId: string, data: Partial<Omit<Production, 'id' | 'userId' | 'createdAt'>>) => {
  const userId = getUserId();
  if (!userId) throw new Error("Usuário não autenticado.");

  const productionRef = doc(db, 'productions', productionId);
  const productionDoc = await getDoc(productionRef);
  if (!productionDoc.exists() || productionDoc.data().userId !== userId) {
    throw new Error("Permission denied to update this production.");
  }
  
  const batch = writeBatch(db);
  batch.update(productionRef, data);

  if (data.team) {
    const updatedTeamMap = new Map(data.team.map(member => [member.id, member]));
    const daysQuery = query(collection(db, 'shooting_days'), where('productionId', '==', productionId), where('userId', '==', userId));
    const daysSnapshot = await getDocs(daysQuery);

    daysSnapshot.forEach(dayDoc => {
      const dayData = dayDoc.data() as ShootingDay;
      let dayNeedsUpdate = false;
      const updatedPresentTeam = (dayData.presentTeam || []).map(member => updatedTeamMap.get(member.id)).filter(Boolean) as TeamMember[];
      if (JSON.stringify(updatedPresentTeam) !== JSON.stringify(dayData.presentTeam || [])) {
        dayNeedsUpdate = true;
      }
      
      const updatedScenes = (dayData.scenes || []).map(scene => {
          const updatedPresentInScene = (scene.presentInScene || []).map(member => updatedTeamMap.get(member.id)).filter(Boolean) as TeamMember[];
          if (JSON.stringify(updatedPresentInScene) !== JSON.stringify(scene.presentInScene || [])) {
              dayNeedsUpdate = true;
              return {...scene, presentInScene: updatedPresentInScene};
          }
          return scene;
      });

      if (dayNeedsUpdate) {
        batch.update(dayDoc.ref, { presentTeam: updatedPresentTeam, scenes: updatedScenes });
      }
    });
  }
  
  await batch.commit();
};


export const deleteProductionAndDays = async (productionId: string) => {
  const userId = getUserId();
  if (!userId) throw new Error("Usuário não autenticado.");

  const productionRef = doc(db, 'productions', productionId);
  const productionDoc = await getDoc(productionRef);
  if (!productionDoc.exists() || productionDoc.data().userId !== userId) {
    throw new Error("Permission denied to delete this production.");
  }
  
  const batch = writeBatch(db);
  batch.delete(productionRef);

  const daysQuery = query(collection(db, 'shooting_days'), where('productionId', '==', productionId), where('userId', '==', userId));
  const daysSnapshot = await getDocs(daysQuery);
  daysSnapshot.forEach(doc => batch.delete(doc.ref));

  await batch.commit();
};

// === Shooting Day Functions ===

export const addShootingDay = async (productionId: string, data: Omit<ShootingDay, 'id' | 'productionId' | 'userId'>): Promise<string> => {
  const userId = getUserId();
  if (!userId) throw new Error("Usuário não autenticado.");
  const dataWithUser = {
    ...data,
    userId,
    productionId,
    date: Timestamp.fromDate(data.date),
  };
  const docRef = await addDoc(collection(db, 'shooting_days'), dataWithUser);
  return docRef.id;
};

export const getShootingDays = async (productionId: string): Promise<ShootingDay[]> => {
    const userId = getUserId();
    if (!userId) return [];
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

export const getShootingDay = async (dayId: string): Promise<ShootingDay | null> => {
    const userId = getUserId();
    const docRef = doc(db, 'shooting_days', dayId);
    const dayDoc = await getDoc(docRef);

    if (!dayDoc.exists()) {
        return null;
    }
    // If user is logged in, check ownership. Public access is allowed if not logged in.
    if (userId && dayDoc.data().userId !== userId) {
        return null;
    }

    const data = dayDoc.data();
    return {
      id: docRef.id,
      ...data,
      date: (data.date as Timestamp).toDate(),
    } as ShootingDay;
};

export const updateShootingDay = async (dayId: string, data: Partial<Omit<ShootingDay, 'id' | 'userId' | 'productionId'>>) => {
  const userId = getUserId();
  if (!userId) throw new Error("Usuário não autenticado.");
  const docRef = doc(db, 'shooting_days', dayId);
  
  const dayDoc = await getDoc(docRef);
  if (!dayDoc.exists() || dayDoc.data().userId !== userId) {
      throw new Error("Permission denied to update this shooting day.");
  }

  const dataToUpdate: Record<string, any> = { ...data };
   if (data.date) {
        dataToUpdate.date = Timestamp.fromDate(data.date);
    }
  
  if (data.hasOwnProperty('weather') && data.weather === undefined) {
      dataToUpdate.weather = deleteField();
  }

  await updateDoc(docRef, dataToUpdate);
};

export const updateShootingDayScene = async (dayId: string, sceneId: string, data: Partial<Scene>) => {
    const userId = getUserId();
    if (!userId) throw new Error("Usuário não autenticado.");
    const dayRef = doc(db, 'shooting_days', dayId);

    const dayDoc = await getDoc(dayRef);
    if (!dayDoc.exists() || dayDoc.data().userId !== userId) {
        throw new Error("Permission denied to update this shooting day.");
    }
    
    const dayData = dayDoc.data() as ShootingDay;
    const updatedScenes = dayData.scenes.map(scene => 
        scene.id === sceneId ? { ...scene, ...data } : scene
    );
    
    await updateDoc(dayRef, { scenes: updatedScenes });
};


export const deleteShootingDay = async (dayId: string) => {
    const userId = getUserId();
    if (!userId) throw new Error("Usuário não autenticado.");

    const docRef = doc(db, 'shooting_days', dayId);
    const dayDoc = await getDoc(docRef);
    if (!dayDoc.exists() || dayDoc.data().userId !== userId) {
        throw new Error("Permission denied to delete this shooting day.");
    }
    await deleteDoc(docRef);
};

export const createOrUpdatePublicProduction = async (production: Production, days: ShootingDay[]) => {
  const userId = getUserId();
  if (!userId || production.userId !== userId) throw new Error("Permission denied to share this production.");
  
  const { team, ...productionData } = production;

  const publicData = {
    ...productionData,
    days: days.map(d => ({...d, date: Timestamp.fromDate(d.date)})),
  };
  const docRef = doc(db, 'public_productions', production.id);
  await setDoc(docRef, publicData, { merge: true });
};

export const getPublicProduction = async (productionId: string): Promise<(Production & { days: ShootingDay[] }) | null> => {
    const docRef = doc(db, 'public_productions', productionId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
        return null;
    }
    const data = docSnap.data();
    return {
        ...data,
        id: docSnap.id,
        createdAt: (data.createdAt as Timestamp).toDate(),
        days: (data.days || []).map((day: any) => ({
            ...day,
            date: (day.date as Timestamp).toDate(),
        }))
    } as (Production & { days: ShootingDay[] });
}

export const createOrUpdatePublicShootingDay = async (production: Production, day: ShootingDay) => {
  const userId = getUserId();
  if (!userId || production.userId !== userId) throw new Error("Permission denied to share this day.");
  
  const { team, ...productionData } = production;

  const publicData = {
    production: productionData,
    day: {...day, date: Timestamp.fromDate(day.date)},
  };
  const docRef = doc(db, 'public_shooting_days', day.id);
  await setDoc(docRef, publicData, { merge: true });
};


export const getPublicShootingDay = async (dayId: string): Promise<{ production: Production, day: ShootingDay } | null> => {
    const docRef = doc(db, 'public_shooting_days', dayId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
        return null;
    }
    const data = docSnap.data();
    return {
      production: {
        ...data.production,
        createdAt: (data.production.createdAt as Timestamp).toDate(),
      } as Production,
      day: {
        ...data.day,
        date: (data.day.date as Timestamp).toDate(),
      } as ShootingDay,
    };
}


// === Creative Project (Moodboard) Functions ===
export const addCreativeProject = async (data: Omit<CreativeProject, 'id' | 'userId' | 'createdAt'>): Promise<string> => {
  const userId = getUserId();
  if (!userId) throw new Error("Usuário não autenticado.");
  const docRef = await addDoc(collection(db, 'creative_projects'), {
    ...data,
    userId,
    createdAt: Timestamp.now(),
  });
  return docRef.id;
};

export const getCreativeProjects = async (): Promise<CreativeProject[]> => {
    const userId = getUserId();
    if (!userId) return [];
    const q = query(collection(db, 'creative_projects'), where('userId', '==', userId));
    const querySnapshot = await getDocs(q);
    const projects = querySnapshot.docs.map(doc => {
      const data = doc.data();
      return ({ ...data, id: doc.id, createdAt: data.createdAt ? (data.createdAt as Timestamp).toDate() : new Date(0) }) as CreativeProject
    });
    projects.sort((a,b) => b.createdAt.getTime() - a.createdAt.getTime());
    return projects;
};

export const getCreativeProject = async (projectId: string): Promise<CreativeProject | null> => {
    const userId = getUserId();
    const projectRef = doc(db, 'creative_projects', projectId);
    const docSnap = await getDoc(projectRef);

    if (!docSnap.exists()) return null;

    if (userId && docSnap.data().userId !== userId) {
        return null;
    }
    const data = docSnap.data();
    return {
        id: docSnap.id,
        ...data,
        createdAt: data.createdAt ? (data.createdAt as Timestamp).toDate() : new Date(0),
    } as CreativeProject;
}

export const updateCreativeProject = async (projectId: string, data: Partial<Omit<CreativeProject, 'id' | 'userId' | 'createdAt'>>) => {
  const userId = getUserId();
  if (!userId) throw new Error("Usuário não autenticado.");
  const docRef = doc(db, 'creative_projects', projectId);
  
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists() || docSnap.data().userId !== userId) {
    throw new Error("Permission denied to update this creative project.");
  }
  
  await updateDoc(docRef, data);
};

export const deleteCreativeProjectAndItems = async (projectId: string) => {
  const userId = getUserId();
  if (!userId) throw new Error("Usuário não autenticado.");

  const projectRef = doc(db, 'creative_projects', projectId);
  const docSnap = await getDoc(projectRef);
  if (!docSnap.exists() || docSnap.data().userId !== userId) {
    throw new Error("Permission denied to delete this creative project.");
  }

  const batch = writeBatch(db);
  batch.delete(projectRef);

  const itemsQuery = query(
    collection(db, 'board_items'),
    where('projectId', '==', projectId),
    where('userId', '==', userId)
  );
  const itemsSnapshot = await getDocs(itemsQuery);
  
  for (const itemDoc of itemsSnapshot.docs) {
    const itemData = itemDoc.data();
    if ((itemData.type === 'image' || itemData.type === 'pdf' || itemData.type === 'storyboard') && itemData.content && itemData.content.includes('firebasestorage.googleapis.com')) {
      await deleteImageFromUrl(itemData.content);
    }
    batch.delete(itemDoc.ref);
  }
  
  await batch.commit();
};


export const getBoardItems = async (projectId: string): Promise<BoardItem[]> => {
  const userId = getUserId();
  if (!userId) return [];
  const q = query(
    collection(db, 'board_items'),
    where('projectId', '==', projectId),
    where('userId', '==', userId),
    orderBy('createdAt', 'asc')
  );
  const querySnapshot = await getDocs(q);
  const items = querySnapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      createdAt: (data.createdAt as Timestamp).toDate(),
    } as BoardItem;
  });
  return items;
}

export const addBoardItem = async (projectId: string, itemData: Omit<BoardItem, 'id' | 'userId' | 'createdAt'>) => {
  const userId = getUserId();
  if (!userId) throw new Error("Usuário não autenticado.");
  const docRef = await addDoc(collection(db, 'board_items'), {
    ...itemData,
    projectId,
    userId,
    createdAt: Timestamp.now(),
  });
  return docRef.id;
}

export const updateBoardItem = async (projectId: string, itemId: string, data: Partial<Omit<BoardItem, 'id' | 'userId' | 'projectId' | 'createdAt'>>) => {
  const userId = getUserId();
  if (!userId) throw new Error("Usuário não autenticado.");
  const itemRef = doc(db, 'board_items', itemId);
  
  const docSnap = await getDoc(itemRef);
  if (!docSnap.exists() || docSnap.data().userId !== userId) {
    throw new Error("Permission denied to update this board item.");
  }
  
  await updateDoc(itemRef, data);
}

export const updateBoardItemsBatch = async (projectId: string, items: { id: string; data: Partial<BoardItem> }[]) => {
  const userId = getUserId();
  if (!userId) throw new Error("Usuário não autenticado.");
  if (items.length === 0) return;
  
  const batch = writeBatch(db);
  for (const item of items) {
    const itemRef = doc(db, 'board_items', item.id);
    batch.update(itemRef, item.data);
  }
  await batch.commit();
};

export const deleteBoardItem = async (projectId: string, itemId: string) => {
  const userId = getUserId();
  if (!userId) throw new Error("Usuário não autenticado.");
  const itemRef = doc(db, 'board_items', itemId);
  
  const itemSnap = await getDoc(itemRef);
  if (!itemSnap.exists() || itemSnap.data().userId !== userId) {
    throw new Error("Permission denied to delete this board item.");
  }

  if ((itemSnap.data().type === 'image' || itemSnap.data().type === 'pdf' || itemSnap.data().type === 'storyboard') && itemSnap.data().content.includes('firebasestorage.googleapis.com')) {
    await deleteImageFromUrl(itemSnap.data().content);
  }

  await deleteDoc(itemRef);
};

export const uploadImageForBoard = async (file: File): Promise<string> => {
  const userId = getUserId();
  if (!userId) throw new Error("Usuário não autenticado.");
  const timestamp = new Date().getTime();
  const randomString = Math.random().toString(36).substring(2, 8);
  const fileName = `${timestamp}-${randomString}-${file.name}`;
  const filePath = `content/board_images/${userId}/${fileName}`;
  const storageRef = ref(storage, filePath);
  
  await uploadBytes(storageRef, file);
  const downloadURL = await getDownloadURL(storageRef);
  
  return downloadURL;
};

export const uploadPdfForBoard = async (file: File): Promise<string> => {
  const userId = getUserId();
  if (!userId) throw new Error("Usuário não autenticado.");
  const timestamp = new Date().getTime();
  const randomString = Math.random().toString(36).substring(2, 8);
  const fileName = `${timestamp}-${randomString}-${file.name}`;
  const filePath = `content/board_pdfs/${userId}/${fileName}`;
  const storageRef = ref(storage, filePath);
  
  await uploadBytes(storageRef, file);
  const downloadURL = await getDownloadURL(storageRef);
  
  return downloadURL;
};


// === Storyboard Functions ===

export const addStoryboard = async (data: Omit<Storyboard, 'id' | 'userId' | 'createdAt'>): Promise<string> => {
  const userId = getUserId();
  if (!userId) throw new Error("Usuário não autenticado.");
  const docRef = await addDoc(collection(db, 'storyboards'), {
    ...data,
    aspectRatio: data.aspectRatio || '16:9',
    userId,
    createdAt: Timestamp.now(),
  });
  return docRef.id;
};

export const getStoryboards = async (): Promise<Storyboard[]> => {
    const userId = getUserId();
    if (!userId) return [];
    const q = query(collection(db, 'storyboards'), where('userId', '==', userId));
    const querySnapshot = await getDocs(q);
    const storyboards = querySnapshot.docs.map(doc => {
      const data = doc.data();
      return ({ ...doc.data(), id: doc.id, createdAt: data.createdAt ? (data.createdAt as Timestamp).toDate() : new Date(0) }) as Storyboard
    });
    storyboards.sort((a,b) => b.createdAt.getTime() - a.createdAt.getTime());
    return storyboards;
};

export const getStoryboard = async (storyboardId: string): Promise<Storyboard | null> => {
    const userId = getUserId();
    const storyboardRef = doc(db, 'storyboards', storyboardId);
    const docSnap = await getDoc(storyboardRef);

    if (!docSnap.exists()) return null;

    if (userId && docSnap.data().userId !== userId) {
        return null;
    }
    
    const data = docSnap.data();
    return {
        id: docSnap.id,
        ...data,
        createdAt: data.createdAt ? (data.createdAt as Timestamp).toDate() : new Date(0),
    } as Storyboard;
}

export const updateStoryboard = async (storyboardId: string, data: Partial<Omit<Storyboard, 'id' | 'userId' | 'createdAt'>>) => {
  const userId = getUserId();
  if (!userId) throw new Error("Usuário não autenticado.");
  const docRef = doc(db, 'storyboards', storyboardId);
  
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists() || docSnap.data().userId !== userId) {
    throw new Error("Permission denied to update this storyboard.");
  }
  
  await updateDoc(docRef, data);
};

export const deleteStoryboardAndPanels = async (storyboardId: string) => {
  const userId = getUserId();
  if (!userId) throw new Error("Usuário não autenticado.");

  const projectRef = doc(db, 'storyboards', storyboardId);
  const docSnap = await getDoc(projectRef);
  if (!docSnap.exists() || docSnap.data().userId !== userId) {
    throw new Error("Permission denied to delete this storyboard.");
  }

  const batch = writeBatch(db);
  batch.delete(projectRef);
  
  const scenesQuery = query(collection(db, 'storyboard_scenes'), where('storyboardId', '==', storyboardId), where('userId', '==', userId));
  const scenesSnapshot = await getDocs(scenesQuery);
  scenesSnapshot.forEach(sceneDoc => batch.delete(sceneDoc.ref));


  const panelsQuery = query(
    collection(db, 'storyboard_panels'),
    where('storyboardId', '==', storyboardId),
    where('userId', '==', userId)
  );
  const panelsSnapshot = await getDocs(panelsQuery);
  for (const panelDoc of panelsSnapshot.docs) {
      const panelData = panelDoc.data();
      if (panelData.imageUrl && panelData.imageUrl.includes('firebasestorage.googleapis.com')) {
          await deleteImageFromUrl(panelData.imageUrl);
      }
      batch.delete(panelDoc.ref);
  }

  await batch.commit();
};

export const getStoryboardPanels = async (storyboardId: string): Promise<StoryboardPanel[]> => {
  const userId = getUserId();
  if (!userId) return [];
  const q = query(
    collection(db, 'storyboard_panels'),
    where('storyboardId', '==', storyboardId),
    where('userId', '==', userId)
  );
  const querySnapshot = await getDocs(q);
  const panels = querySnapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      createdAt: (data.createdAt as Timestamp).toDate(),
    } as StoryboardPanel;
  });
  // Sort in-memory to avoid composite index requirement
  panels.sort((a, b) => a.order - b.order);
  return panels;
}

export const addStoryboardPanelsBatch = async (panelsData: Omit<StoryboardPanel, 'id' | 'userId' | 'createdAt'>[]) => {
  const userId = getUserId();
  if (!userId) throw new Error("Usuário não autenticado.");
  const batch = writeBatch(db);

  panelsData.forEach(panel => {
    const panelCollection = collection(db, 'storyboard_panels');
    const docRef = doc(panelCollection);
    const data = {
      ...panel,
      userId,
      createdAt: Timestamp.now(),
    };
    batch.set(docRef, data);
  });

  await batch.commit();
};

export const updateStoryboardPanel = async (panelId: string, data: Partial<Omit<StoryboardPanel, 'id' | 'userId' | 'storyboardId' | 'createdAt'>>) => {
  const userId = getUserId();
  if (!userId) throw new Error("Usuário não autenticado.");
  const panelRef = doc(db, 'storyboard_panels', panelId);

  const docSnap = await getDoc(panelRef);
  if (!docSnap.exists() || docSnap.data().userId !== userId) {
    throw new Error("Permission denied to update this panel.");
  }
  
  await updateDoc(panelRef, data);
}

export const updatePanelOrder = async (panels: {id: string; order: number}[]) => {
  const userId = getUserId();
  if (!userId) throw new Error("Usuário não autenticado.");
  
  const batch = writeBatch(db);
  for (const panel of panels) {
    const docRef = doc(db, 'storyboard_panels', panel.id);
    batch.update(docRef, { order: panel.order });
  }
  await batch.commit();
}


export const deleteStoryboardPanel = async (panelId: string) => {
  const userId = getUserId();
  if (!userId) throw new Error("Usuário não autenticado.");
  const panelRef = doc(db, 'storyboard_panels', panelId);
  
  const panelSnap = await getDoc(panelRef);
  if (!panelSnap.exists() || panelSnap.data().userId !== userId) {
    throw new Error("Permission denied to delete this panel.");
  }

  if (panelSnap.data().imageUrl && panelSnap.data().imageUrl.includes('firebasestorage.googleapis.com')) {
    await deleteImageFromUrl(panelSnap.data().imageUrl);
  }

  await deleteDoc(panelRef);
};

export const uploadImageForStoryboard = async (file: File): Promise<string> => {
  const userId = getUserId();
  if (!userId) throw new Error("Usuário não autenticado.");
  const timestamp = new Date().getTime();
  const randomString = Math.random().toString(36).substring(2, 8);
  const fileName = `${timestamp}-${randomString}-${file.name}`;
  const filePath = `content/storyboard_images/${userId}/${fileName}`;
  const storageRef = ref(storage, filePath);
  
  await uploadBytes(storageRef, file);
  const downloadURL = await getDownloadURL(storageRef);
  
  return downloadURL;
};

// === Storyboard Scene Functions ===
export const getStoryboardScenes = async (storyboardId: string): Promise<StoryboardScene[]> => {
  const userId = getUserId();
  if (!userId) return [];

  const scenesQuery = query(
    collection(db, 'storyboard_scenes'),
    where('storyboardId', '==', storyboardId),
    where('userId', '==', userId)
  );
  const scenesSnapshot = await getDocs(scenesQuery);
  const scenes = scenesSnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    createdAt: (doc.data().createdAt as Timestamp).toDate(),
  }) as StoryboardScene);

  // If no scenes exist, check for panels that need migration
  if (scenes.length === 0) {
    const panelsToMigrateSnapshot = await getDocs(query(
      collection(db, 'storyboard_panels'),
      where('storyboardId', '==', storyboardId),
      where('userId', '==', userId)
    ));
    
    if (!panelsToMigrateSnapshot.empty) {
        const panelsToMigrate = panelsToMigrateSnapshot.docs.map(d => ({id: d.id, ...d.data()}) as StoryboardPanel);
        if (panelsToMigrate.length > 0 && panelsToMigrate.some(p => !p.sceneId)) {
          const newSceneId = await migratePanelsToScene(storyboardId, panelsToMigrate);
          const newSceneDoc = await getDoc(doc(db, 'storyboard_scenes', newSceneId));
           if (newSceneDoc.exists()) {
             const newSceneData = newSceneDoc.data();
             const scene = { id: newSceneDoc.id, ...newSceneData, createdAt: (newSceneData.createdAt as Timestamp).toDate() } as StoryboardScene;
             scenes.push(scene);
           }
        }
    }
  }

  // Sort scenes by order property in-memory
  scenes.sort((a, b) => a.order - b.order);
  return scenes;
};


export const addStoryboardScene = async (data: Omit<StoryboardScene, 'id'|'createdAt'>) => {
  const userId = getUserId();
  if (!userId) throw new Error("Usuário não autenticado.");
  await addDoc(collection(db, 'storyboard_scenes'), {
    ...data,
    userId,
    createdAt: Timestamp.now(),
  });
};

export const updateStoryboardScene = async (sceneId: string, data: Partial<Omit<StoryboardScene, 'id' | 'storyboardId' | 'userId' | 'createdAt'>>) => {
    const userId = getUserId();
    if (!userId) throw new Error("Usuário não autenticado.");
    const docRef = doc(db, 'storyboard_scenes', sceneId);

    const docSnap = await getDoc(docRef);
    if (!docSnap.exists() || docSnap.data().userId !== userId) {
        throw new Error("Permission denied to update this scene.");
    }
    await updateDoc(docRef, data);
};

export const deleteStoryboardScene = async (sceneId: string, storyboardId: string) => {
    const userId = getUserId();
    if (!userId) throw new Error("Usuário não autenticado.");
    
    const sceneRef = doc(db, 'storyboard_scenes', sceneId);
    const sceneDoc = await getDoc(sceneRef);
    if (!sceneDoc.exists() || sceneDoc.data().userId !== userId) {
        throw new Error("Permission denied to delete this scene.");
    }
    
    const batch = writeBatch(db);
    batch.delete(sceneRef);

    // Find and delete all panels within that scene
    const panelsQuery = query(
        collection(db, 'storyboard_panels'),
        where('storyboardId', '==', storyboardId),
        where('sceneId', '==', sceneId),
        where('userId', '==', userId)
    );
    const panelsSnapshot = await getDocs(panelsQuery);
    for (const panelDoc of panelsSnapshot.docs) {
      const panelData = panelDoc.data();
      if (panelData.imageUrl && panelData.imageUrl.includes('firebasestorage.googleapis.com')) {
          await deleteImageFromUrl(panelData.imageUrl);
      }
      batch.delete(panelDoc.ref);
    }
    
    await batch.commit();
};

export const migratePanelsToScene = async (storyboardId: string, panels: StoryboardPanel[]): Promise<string> => {
    const userId = getUserId();
    if (!userId) throw new Error("Not authenticated");

    const batch = writeBatch(db);

    // Create a new default scene
    const sceneRef = doc(collection(db, 'storyboard_scenes'));
    const newScene: Omit<StoryboardScene, 'id'> = {
        storyboardId,
        userId,
        title: "Cena 1",
        description: "Quadros importados de um projeto antigo.",
        order: 0,
        createdAt: new Date(),
    };
    batch.set(sceneRef, {
      ...newScene,
      createdAt: Timestamp.fromDate(newScene.createdAt) // Convert date to timestamp for Firestore
    });
    
    // Update all panels to belong to this new scene
    panels.forEach(panel => {
        const panelRef = doc(db, 'storyboard_panels', panel.id);
        batch.update(panelRef, { sceneId: sceneRef.id });
    });

    await batch.commit();
    return sceneRef.id;
}


// === Blog & Page Content Functions ===

export const getPosts = async (limitCount?: number): Promise<Post[]> => {
  const postsCollection = collection(db, 'posts');
  let q = query(postsCollection, orderBy('createdAt', 'desc'));
  
  if (limitCount) {
    q = query(q, limit(limitCount));
  }

  const querySnapshot = await getDocs(q);
  const posts = querySnapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      createdAt: (data.createdAt as Timestamp).toDate(),
    } as Post;
  });

  return posts;
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
  const userId = getUserId();
  if (!userId) throw new Error("Usuário não autenticado.");
  await addDoc(collection(db, 'posts'), {
    ...data,
    authorId: userId,
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

export const uploadImageForPageContent = async (file: File): Promise<string> => {
  const timestamp = new Date().getTime();
  const randomString = Math.random().toString(36).substring(2, 8);
  const fileName = `${timestamp}-${randomString}-${file.name}`;
  const filePath = `content/pages/${fileName}`;
  const storageRef = ref(storage, filePath);
  
  await uploadBytes(storageRef, file);
  return await getDownloadURL(storageRef);
};

export const getPage = async (pageId: 'about' | 'contact' | 'terms'): Promise<PageContent | null> => {
  const pageRef = doc(db, 'pages', pageId);
  const pageSnap = await getDoc(pageRef);

  if (pageSnap.exists()) {
    const data = pageSnap.data();
    return {
      id: pageSnap.id,
      ...data,
      updatedAt: (data.updatedAt as Timestamp).toDate(),
    } as PageContent;
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


export const getLoginPageContent = async (): Promise<LoginPageContent> => {
  const docRef = doc(db, 'pages', 'login');
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    return docSnap.data() as LoginPageContent;
  }

  // Return default hardcoded values if nothing exists in Firestore
  return {
    features: [
      { id: 'default-0', title: 'Orçamento Inteligente', description: 'Controle seu orçamento, despesas e saldo em tempo real, com gráficos claros e detalhados.', icon: 'DollarSign', order: 0 },
      { id: 'default-1', title: 'Gestão de Equipe Completa', description: 'Cadastre sua equipe, gerencie informações de contato e controle pagamentos de cachês e diárias.', icon: 'Users', order: 1 },
      { id: 'default-2', title: 'Ordem do Dia Detalhada', description: 'Crie e gerencie Ordens do Dia (Call Sheets) com horários, cenas, clima e checklists interativos.', icon: 'Clapperboard', order: 2 },
      { id: 'default-3', title: 'Relatórios Simplificados', description: 'Exporte relatórios financeiros e de produção para Excel e PDF com um clique.', icon: 'FileSpreadsheet', order: 3 },
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
  const filePath = `content/login_background/background.jpg`; // Fixed name to auto-replace
  const storageRef = ref(storage, filePath);
  await uploadBytes(storageRef, file);
  return await getDownloadURL(storageRef);
}


export const deleteImageFromUrl = async (url: string): Promise<void> => {
    if (!url.includes('firebasestorage.googleapis.com')) {
        console.warn("Attempted to delete a non-Firebase Storage URL:", url);
        return;
    }

    try {
        const decodedUrl = decodeURIComponent(url);
        const path = decodedUrl.substring(decodedUrl.indexOf('/o/') + 3, decodedUrl.indexOf('?alt=media'));
        const imageRef = ref(storage, path);
        await deleteObject(imageRef);
    } catch (error: any) {
        if (error.code === 'storage/object-not-found') {
            console.warn(`Image for deletion not found in storage: ${url}`);
        } else {
            console.error(`Error deleting image from storage: ${url}`, error);
            // Re-throw if it's not a 'not found' error, as it might be a permissions issue.
            throw error;
        }
    }
};

// === Team Members (About Page) Functions ===

export const getTeamMembers = async (): Promise<TeamMemberAbout[]> => {
  const q = query(collection(db, 'teamMembers'), orderBy('order', 'asc'));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => {
    const data = doc.data();
    // Fallback for documents that might not have createdAt
    const createdAt = data.createdAt ? (data.createdAt as Timestamp).toDate() : new Date();
    return {
      id: doc.id,
      ...data,
      createdAt,
    } as TeamMemberAbout;
  });
};

export const saveTeamMembers = async (members: Omit<TeamMemberAbout, 'createdAt'>[]) => {
    const batch = writeBatch(db);
    const collectionRef = collection(db, 'teamMembers');

    // Get current members to find which ones to delete
    const currentMembersSnapshot = await getDocs(query(collectionRef));
    const currentMemberIds = new Set(currentMembersSnapshot.docs.map(doc => doc.id));
    const newMemberIds = new Set(members.map(member => member.id));

    // Delete members that are no longer in the list
    currentMemberIds.forEach(id => {
        if (!newMemberIds.has(id)) {
            batch.delete(doc(collectionRef, id));
        }
    });

    // Set/Update members
    members.forEach((member, index) => {
        const { file, ...data } = member as Partial<TeamMemberAbout> & { id: string }; // Type assertion
        const dataToSave = {
            ...data,
            order: index, // Update order based on array position
            createdAt: Timestamp.now(), // Always set/update timestamp on save
        };
        batch.set(doc(collectionRef, member.id), dataToSave, { merge: true });
    });

    await batch.commit();
};


export const uploadTeamMemberPhoto = async (file: File): Promise<string> => {
  const timestamp = new Date().getTime();
  const randomString = Math.random().toString(36).substring(2, 8);
  const fileName = `${timestamp}-${randomString}-${file.name}`;
  const filePath = `team_photos/${fileName}`;
  const storageRef = ref(storage, filePath);
  
  await uploadBytes(storageRef, file);
  return await getDownloadURL(storageRef);
};


// === Theme Settings Functions ===

export const getThemeSettings = async (): Promise<ThemeSettings | null> => {
    const docRef = doc(db, 'settings', 'theme');
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
        return docSnap.data() as ThemeSettings;
    }
    return null;
}

export const saveThemeSettings = async (theme: ThemeSettings) => {
    const docRef = doc(db, 'settings', 'theme');
    await setDoc(docRef, theme);
}

export const deleteThemeSettings = async () => {
    const docRef = doc(db, 'settings', 'theme');
    await deleteDoc(docRef);
}


// Beta Limits
export const getBetaLimits = async (): Promise<BetaLimits> => {
    const docRef = doc(db, 'settings', 'betaLimits');
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
        return docSnap.data() as BetaLimits;
    }
    return DEFAULT_BETA_LIMITS; // Return defaults if not set in Firestore
}

export const saveBetaLimits = async (limits: BetaLimits) => {
    const docRef = doc(db, 'settings', 'betaLimits');
    await setDoc(docRef, limits, { merge: true });
}

// === Talent Pool Functions ===

export const getTalents = async (): Promise<Talent[]> => {
  const userId = getUserId();
  if (!userId) return [];
  const q = query(collection(db, 'talents'), where('userId', '==', userId));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Talent);
};

export const saveTalents = async (talents: Omit<Talent, 'file'>[]) => {
  const userId = getUserId();
  if (!userId) throw new Error("Usuário não autenticado.");

  const batch = writeBatch(db);
  const collectionRef = collection(db, 'talents');

  const currentTalentsSnapshot = await getDocs(query(collectionRef, where('userId', '==', userId)));
  const currentTalentIds = new Set(currentTalentsSnapshot.docs.map(doc => doc.id));
  const newTalentIds = new Set(talents.map(t => t.id));

  currentTalentIds.forEach(id => {
    if (!newTalentIds.has(id)) {
      batch.delete(doc(collectionRef, id));
    }
  });

  talents.forEach(talent => {
    const talentRef = doc(collectionRef, talent.id);
    const { id, ...dataToSave } = talent;
    batch.set(talentRef, { ...dataToSave, userId }, { merge: true });
  });

  await batch.commit();
};

export const uploadTalentPhoto = async (file: File): Promise<string> => {
  const userId = getUserId();
  if (!userId) throw new Error("Usuário não autenticado.");
  const timestamp = new Date().getTime();
  const randomString = Math.random().toString(36).substring(2, 8);
  const fileName = `${timestamp}-${randomString}-${file.name}`;
  const filePath = `talent_photos/${userId}/${fileName}`;
  const storageRef = ref(storage, filePath);
  
  await uploadBytes(storageRef, file);
  return await getDownloadURL(storageRef);
};

export const migrateTeamToTalentPool = async (): Promise<void> => {
    const userId = getUserId();
    if (!userId) throw new Error("Usuário não autenticado.");

    const [productions, projects, existingTalents] = await Promise.all([
        getProductions(),
        getProjects(),
        getTalents()
    ]);
    
    const legacyProdTeam: any[] = productions.flatMap(p => p.team || []);
    const legacyFinTeam: any[] = projects.flatMap(p => p.talents || []);
    const combinedLegacyTeam: any[] = [...legacyProdTeam, ...legacyFinTeam];

    const uniqueTalents = new Map<string, Talent>();

    // Helper to create a clean talent object
    const createCleanTalent = (member: any): Omit<Talent, 'id'> => ({
      name: member.name || "Nome Desconhecido",
      role: member.role || "Função Desconhecida",
      paymentType: member.paymentType === 'daily' ? 'daily' : 'fixed',
      fee: typeof member.fee === 'number' ? member.fee : undefined,
      dailyRate: typeof member.dailyRate === 'number' ? member.dailyRate : undefined,
      days: typeof member.days === 'number' ? member.days : undefined,
      photoURL: member.photoURL || undefined,
      contact: member.contact || undefined,
      hasDietaryRestriction: member.hasDietaryRestriction === true,
      dietaryRestriction: member.dietaryRestriction || undefined,
      extraNotes: member.extraNotes || undefined,
    });

    // Prioritize existing talents
    existingTalents.forEach(talent => {
        const key = `${talent.name.trim().toLowerCase()}-${talent.role.trim().toLowerCase()}`;
        if (!uniqueTalents.has(key)) {
            uniqueTalents.set(key, talent);
        }
    });

    // Process legacy members, merging data if a more complete record is found
    combinedLegacyTeam.forEach(member => {
        if (!member.name || !member.role) return;
        const key = `${member.name.trim().toLowerCase()}-${member.role.trim().toLowerCase()}`;
        if (!uniqueTalents.has(key)) {
            const newTalent: Talent = {
                id: doc(collection(db, 'talents')).id, // Generate a new ID
                ...createCleanTalent(member),
            };
            uniqueTalents.set(key, newTalent);
        } else {
            // Merge info: if existing entry is missing info that the new one has, add it.
            const existing = uniqueTalents.get(key)!;
            if (!existing.contact && member.contact) existing.contact = member.contact;
            if (!existing.photoURL && member.photoURL) existing.photoURL = member.photoURL;
            if (existing.hasDietaryRestriction === undefined && member.hasDietaryRestriction !== undefined) {
                 existing.hasDietaryRestriction = member.hasDietaryRestriction;
                 existing.dietaryRestriction = member.dietaryRestriction;
            }
            if (!existing.extraNotes && member.extraNotes) existing.extraNotes = member.extraNotes;
        }
    });

    const talentsToSave = Array.from(uniqueTalents.values());
    
    if (talentsToSave.length > 0) {
        await saveTalents(talentsToSave);
    }
};


// === Unified Project Functions ===

export const addUnifiedProject = async (data: Omit<UnifiedProject, 'id' | 'userId' | 'createdAt'>): Promise<string> => {
  const userId = getUserId();
  if (!userId) throw new Error("Usuário não autenticado.");
  const docRef = await addDoc(collection(db, 'unified_projects'), {
    ...data,
    userId,
    createdAt: Timestamp.now(),
  });
  return docRef.id;
};

export const getUnifiedProjects = async (): Promise<UnifiedProject[]> => {
    const userId = getUserId();
    if (!userId) return [];
    const q = query(collection(db, 'unified_projects'), where('userId', '==', userId));
    const querySnapshot = await getDocs(q);
    const projects = querySnapshot.docs.map(doc => {
      const data = doc.data();
      return ({ ...data, id: doc.id, createdAt: data.createdAt ? (data.createdAt as Timestamp).toDate() : new Date(0) }) as UnifiedProject
    });
    projects.sort((a,b) => b.createdAt.getTime() - a.createdAt.getTime());
    return projects;
};

export const getUnifiedProject = async (projectId: string): Promise<UnifiedProject | null> => {
    const userId = getUserId();
    if (!userId) return null;
    const projectRef = doc(db, 'unified_projects', projectId);
    const docSnap = await getDoc(projectRef);

    if (!docSnap.exists() || docSnap.data().userId !== userId) {
        return null;
    }
    const data = docSnap.data();
    return {
        id: docSnap.id,
        ...data,
        createdAt: data.createdAt ? (data.createdAt as Timestamp).toDate() : new Date(0),
    } as UnifiedProject;
}

export const updateUnifiedProject = async (projectId: string, data: Partial<Omit<UnifiedProject, 'id' | 'userId' | 'createdAt'>>) => {
  const userId = getUserId();
  if (!userId) throw new Error("Usuário não autenticado.");
  const docRef = doc(db, 'unified_projects', projectId);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists() || docSnap.data().userId !== userId) {
    throw new Error("Permission denied to update this project.");
  }
  await updateDoc(docRef, data);
};


export const deleteUnifiedProject = async (projectId: string) => {
  const userId = getUserId();
  if (!userId) throw new Error("Usuário não autenticado.");

  const unifiedProjectRef = doc(db, 'unified_projects', projectId);
  const unifiedProjectSnap = await getDoc(unifiedProjectRef);
  if (!unifiedProjectSnap.exists() || unifiedProjectSnap.data().userId !== userId) {
    throw new Error("Permission denied to delete this unified project.");
  }

  const unifiedProjectData = unifiedProjectSnap.data() as UnifiedProject;
  const batch = writeBatch(db);

  // Deletar sub-projetos associados
  if (unifiedProjectData.financialProjectId) {
    await deleteProject(unifiedProjectData.financialProjectId);
  }
  if (unifiedProjectData.productionProjectId) {
    await deleteProductionAndDays(unifiedProjectData.productionProjectId);
  }
  if (unifiedProjectData.creativeProjectId) {
    await deleteCreativeProjectAndItems(unifiedProjectData.creativeProjectId);
  }
  if (unifiedProjectData.storyboardProjectId) {
    await deleteStoryboardAndPanels(unifiedProjectData.storyboardProjectId);
  }

  // Deletar o projeto unificado
  batch.delete(unifiedProjectRef);
  await batch.commit();
};

export const migrateLegacyProjects = async (legacyProjects: DisplayableItem[]) => {
    const userId = getUserId();
    if (!userId) throw new Error("Usuário não autenticado.");

    const batch = writeBatch(db);

    for (const legacy of legacyProjects) {
        if (legacy.itemType === 'unified') continue;

        const unifiedProjectRef = doc(collection(db, 'unified_projects'));
        
        let financialProjectId: string | undefined;
        let productionProjectId: string | undefined;
        let creativeProjectId: string | undefined;
        let storyboardProjectId: string | undefined;
        let legacyProjectRef: any;

        switch (legacy.itemType) {
            case 'financial':
                financialProjectId = legacy.id;
                legacyProjectRef = doc(db, 'projects', legacy.id);
                break;
            case 'production':
                productionProjectId = legacy.id;
                legacyProjectRef = doc(db, 'productions', legacy.id);
                break;
            case 'creative':
                creativeProjectId = legacy.id;
                legacyProjectRef = doc(db, 'creative_projects', legacy.id);
                break;
            case 'storyboard':
                storyboardProjectId = legacy.id;
                legacyProjectRef = doc(db, 'storyboards', legacy.id);
                break;
        }

        const unifiedProjectData: Omit<UnifiedProject, 'id'> = {
            userId,
            name: legacy.name,
            description: (legacy as any).description || "",
            createdAt: Timestamp.now(),
            financialProjectId,
            productionProjectId,
            creativeProjectId,
            storyboardProjectId,
        };
        
        // This is safe to set because we ensure legacy.itemType is not 'unified'.
        const validLegacyData = unifiedProjectData as any;
        
        batch.set(unifiedProjectRef, validLegacyData);
        
        if (legacyProjectRef) {
            batch.update(legacyProjectRef, { unifiedProjectId: unifiedProjectRef.id });
        }
    }
    
    await batch.commit();
}
