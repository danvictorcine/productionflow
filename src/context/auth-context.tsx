'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { User } from 'firebase/auth';
import { onAuthStateChanged, updateProfile } from 'firebase/auth';
import { auth } from '@/lib/firebase/config';
import { Skeleton } from '@/components/ui/skeleton';
import { getUserProfile, updateUserProfile } from '@/lib/firebase/firestore';
import type { UserProfile } from '@/lib/types';


export type AppUser = User & UserProfile;

interface AuthContextType {
  user: AppUser | null;
  loading: boolean;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({ user: null, loading: true, refreshUser: async () => {} });

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    const firebaseUser = auth.currentUser;
    if (firebaseUser) {
        setLoading(true);
        const userProfile = await getUserProfile(firebaseUser.uid);
        if (userProfile) {
            setUser({ ...firebaseUser, ...userProfile });
        }
        setLoading(false);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        let userProfile = await getUserProfile(firebaseUser.uid);
        
        if (userProfile) {
          // Sync Auth email to Firestore if it's different
          if (firebaseUser.email && firebaseUser.email !== userProfile.email) {
            await updateUserProfile(firebaseUser.uid, { email: firebaseUser.email });
            // Re-fetch profile after update to have the latest data
            userProfile = await getUserProfile(firebaseUser.uid);
          }

          // Sync Firestore profile (name, photo) to Auth profile if they differ
          const authNeedsUpdate: { displayName?: string; photoURL?: string | null } = {};
          if (userProfile && firebaseUser.displayName !== userProfile.name) {
            authNeedsUpdate.displayName = userProfile.name;
          }
          if (userProfile && firebaseUser.photoURL !== userProfile.photoURL) {
            authNeedsUpdate.photoURL = userProfile.photoURL || null;
          }
          if (Object.keys(authNeedsUpdate).length > 0) {
             await updateProfile(firebaseUser, authNeedsUpdate);
          }
        }
        
        setUser(userProfile ? { ...firebaseUser, ...userProfile } : (firebaseUser as AppUser));

      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
          <div className="flex flex-col items-center gap-4">
             <h1 className="text-3xl font-bold text-primary">ProductionFlow</h1>
             <p className="text-muted-foreground">Carregando...</p>
          </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, loading, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
