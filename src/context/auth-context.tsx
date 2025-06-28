'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { User } from 'firebase/auth';
import { onAuthStateChanged, updateProfile } from 'firebase/auth';
import { auth } from '@/lib/firebase/config';
import { Skeleton } from '@/components/ui/skeleton';
import { getUserProfile } from '@/lib/firebase/firestore';
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
        const userProfile = await getUserProfile(firebaseUser.uid);
        
        // Ensure auth displayName is consistent with Firestore profile
        if (userProfile && firebaseUser.displayName !== userProfile.name) {
          await updateProfile(firebaseUser, { displayName: userProfile.name });
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
