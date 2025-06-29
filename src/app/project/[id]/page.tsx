"use client";

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import type { Project, Transaction } from '@/lib/types';
import Dashboard from '@/components/dashboard';
import { Skeleton } from '@/components/ui/skeleton';
import AuthGuard from '@/components/auth-guard';
import * as api from '@/lib/firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/auth-context';


function ProjectPageDetail() {
    const router = useRouter();
    const params = useParams();
    const projectId = params.id as string;
    const { toast } = useToast();
    const { user } = useAuth();

    const [project, setProject] = useState<Project | null>(null);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchTransactions = useCallback(async () => {
        if (!projectId) return;
        const transactionsData = await api.getTransactions(projectId);
        setTransactions(transactionsData);
    }, [projectId]);

    useEffect(() => {
        if (!projectId || !user) return;

        const fetchData = async () => {
            setIsLoading(true);
            try {
                const projectData = await api.getProject(projectId);

                if (projectData) {
                    setProject(projectData);
                    await fetchTransactions();
                } else {
                    toast({ variant: "destructive", title: "Erro", description: "Projeto não encontrado ou você não tem permissão para acessá-lo." });
                    router.push('/');
                }
            } catch (error) {
                toast({ variant: "destructive", title: "Erro ao carregar dados", description: (error as Error).message });
                router.push('/');
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [projectId, user, router, toast, fetchTransactions]);

    const handleUpdateProject = async (updatedProjectData: Partial<Project>) => {
        if (!project) return;
        try {
            await api.updateProject(project.id, updatedProjectData);
            setProject(prev => prev ? { ...prev, ...updatedProjectData } : null);
            toast({ title: "Projeto atualizado!" });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Erro ao atualizar projeto', description: (error as Error).message });
        }
    };
    
    const handleAddTransaction = async (transactionData: Omit<Transaction, 'id' | 'userId' | 'status'>) => {
        try {
            await api.addTransaction(transactionData);
            await fetchTransactions();
            toast({ title: 'Despesa planejada com sucesso!' });
        } catch(error) {
            toast({ variant: 'destructive', title: 'Erro ao planejar despesa', description: (error as Error).message });
        }
    };

    const handleUpdateTransaction = async (transactionId: string, transactionData: Partial<Transaction>) => {
        try {
            await api.updateTransaction(transactionId, transactionData);
            await fetchTransactions();
            
            if(transactionData.status) {
                const message = transactionData.status === 'paid' ? 'Despesa paga com sucesso!' : 'Pagamento desfeito.';
                toast({ title: message });
            } else {
                toast({ title: 'Despesa atualizada com sucesso!' });
            }
        } catch(error) {
            toast({ variant: 'destructive', title: 'Erro ao atualizar despesa', description: (error as Error).message });
        }
    }
    
    const handleDeleteTransaction = async (transactionId: string) => {
        try {
            await api.deleteTransaction(transactionId);
            await fetchTransactions();
            toast({ title: 'Despesa excluída.' });
        } catch(error) {
            toast({ variant: 'destructive', title: 'Erro ao excluir despesa', description: (error as Error).message });
        }
    }


    if (isLoading) {
        return (
            <div className="p-8 space-y-6">
                <Skeleton className="h-[60px] w-full" />
                <div className="grid gap-4 md:grid-cols-3">
                    <Skeleton className="h-[125px] w-full" />
                    <Skeleton className="h-[125px] w-full" />
                    <Skeleton className="h-[125px] w-full" />
                </div>
                 <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <Skeleton className="lg:col-span-2 h-[350px]" />
                    <Skeleton className="lg:col-span-1 h-[350px]" />
                </div>
            </div>
        );
    }
    
    if (!project) {
        // This case is handled by redirection in useEffect, but as a fallback.
        return <div>Projeto não encontrado. Redirecionando...</div>;
    }

    return (
        <Dashboard 
            project={project} 
            transactions={transactions} 
            onProjectUpdate={handleUpdateProject}
            onAddTransaction={handleAddTransaction}
            onUpdateTransaction={handleUpdateTransaction}
            onDeleteTransaction={handleDeleteTransaction}
        />
    );
}


export default function ProjectPage() {
    return (
        <AuthGuard>
            <ProjectPageDetail />
        </AuthGuard>
    )
}
