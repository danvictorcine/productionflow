

'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { User } from 'firebase/auth';
import { onAuthStateChanged, updateProfile } from 'firebase/auth';
import { auth, firebaseError } from '@/lib/firebase/config';
import { getUserProfile, updateUserProfile } from '@/lib/firebase/firestore';
import type { UserProfile } from '@/lib/types';
import { AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';


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
    // Only proceed if auth is initialized
    if (auth && auth.currentUser) {
        const firebaseUser = auth.currentUser;
        setLoading(true);
        const userProfile = await getUserProfile(firebaseUser.uid);
        if (userProfile) {
            setUser({ ...firebaseUser, ...userProfile, isAdmin: userProfile.isAdmin || false });
        }
        setLoading(false);
    }
  }, []);

  useEffect(() => {
    // If auth object is not initialized due to an error, stop loading and do nothing.
    if (!auth) {
        setLoading(false);
        return;
    }

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
        
        const finalProfile = userProfile || {} as UserProfile;
        setUser({ ...firebaseUser, ...finalProfile, isAdmin: finalProfile.isAdmin || false });

      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // If there was an error during Firebase initialization, show a helpful error screen.
  if (firebaseError) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background text-foreground">
        <div className="w-full max-w-lg p-6 mx-4 text-center bg-card border border-destructive rounded-lg shadow-lg">
          <div className="flex flex-col items-center">
            <AlertCircle className="w-12 h-12 text-destructive" />
            <h1 className="mt-4 text-2xl font-bold text-destructive">Erro de Configuração do Firebase</h1>
          </div>
          <p className="mt-2 text-foreground">Não foi possível conectar ao seu projeto Firebase.</p>
          <div className="p-3 mt-4 text-sm text-left bg-muted text-destructive rounded-md">
            <p className="font-semibold">Detalhes do Erro:</p>
            <div className="mt-1 select-all font-mono text-xs break-words">
              {'code' in firebaseError && (
                <p>Código: {(firebaseError as any).code}</p>
              )}
              <p>Mensagem: {firebaseError.message}</p>
            </div>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            Por favor, verifique se o arquivo <code className="px-1 py-0.5 font-mono text-sm bg-muted rounded">.env</code> na raiz do seu projeto está presente e preenchido com as credenciais corretas do seu projeto Firebase.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
          <div className="flex flex-col items-center gap-4">
             <div className="flex items-center justify-center gap-3">
                <svg width="40" height="40" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" style={{color: "hsl(var(--brand-login, var(--primary)))"}}>
                    <rect width="32" height="32" rx="6" fill="currentColor"/>
                    <path d="M22 16L12 22V10L22 16Z" fill="hsl(var(--primary-foreground))" style={{opacity: 0.8}}/>
                </svg>
                <div className="flex items-center gap-2">
                  <h1 className="text-3xl font-bold tracking-tighter" style={{color: "hsl(var(--brand-login, var(--primary)))"}}>ProductionFlow</h1>
                  <Badge variant="outline" className="text-xs font-normal">BETA</Badge>
                </div>
             </div>
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
