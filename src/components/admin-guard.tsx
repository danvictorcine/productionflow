'use client';

import { useAuth } from '@/context/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { AlertCircle } from 'lucide-react';
import { Button } from './ui/button';
import Link from 'next/link';

export default function AdminGuard({ children }: { children: React.ReactNode }) {
    const { user, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && !user?.isAdmin) {
            router.push('/');
        }
    }, [user, loading, router]);

    if (loading || !user) {
        // Show a generic loading state while auth is being resolved
        return (
            <div className="flex items-center justify-center min-h-screen bg-background">
                <p className="text-muted-foreground">Verificando permissões...</p>
            </div>
        );
    }
    
    if (!user.isAdmin) {
        return (
             <div className="flex flex-col items-center justify-center min-h-screen bg-background">
                <div className="text-center p-8 max-w-md">
                    <AlertCircle className="mx-auto h-12 w-12 text-destructive" />
                    <h1 className="mt-4 text-2xl font-bold">Acesso Negado</h1>
                    <p className="mt-2 text-muted-foreground">
                        Você não tem permissão para visualizar esta página. Se você acredita que isso é um erro, contate o suporte.
                    </p>
                    <Button asChild className="mt-6">
                        <Link href="/">Voltar para a Página Inicial</Link>
                    </Button>
                </div>
             </div>
        );
    }

    return <>{children}</>;
}
