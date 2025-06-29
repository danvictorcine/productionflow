'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import type { Project, Transaction } from '@/lib/types';
import Dashboard from '@/components/dashboard';
import { Skeleton } from '@/components/ui/skeleton';
import AuthGuard from '@/components/auth-guard';
import * as api from '@/lib/firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/auth-context';
import { db } from '@/lib/firebase/config';
import { writeBatch, doc } from 'firebase/firestore';


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

    const fetchProject = useCallback(async () => {
        if (!projectId) return;
         const projectData = await api.getProject(projectId);

        if (projectData) {
            // Add default values for backward compatibility
            const projectWithDefaults: Project = {
                ...projectData,
                isBudgetParcelado: projectData.isBudgetParcelado ?? false,
                installments: projectData.installments ?? [],
                talents: projectData.talents ?? [],
                customCategories: projectData.customCategories ?? [],
                includeProductionCostsInBudget: projectData.includeProductionCostsInBudget ?? true,
            };
            setProject(projectWithDefaults);
        } else {
            toast({ variant: "destructive", title: "Erro", description: "Projeto não encontrado ou você não tem permissão para acessá-lo." });
            router.push('/');
        }
    }, [projectId, router, toast]);

    useEffect(() => {
        if (!projectId || !user) return;

        const fetchData = async () => {
            setIsLoading(true);
            try {
                await fetchProject();
                await fetchTransactions();
            } catch (error) {
                toast({ variant: "destructive", title: "Erro ao carregar dados", description: (error as Error).message });
                router.push('/');
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [projectId, user, router, toast, fetchProject, fetchTransactions]);

    const handleUpdateProject = async (updatedProjectData: Partial<Project>) => {
        if (!project) return;
        try {
            // Check if talent fees have changed and update associated transactions
            if (updatedProjectData.talents && project.talents) {
                const changedTalents = updatedProjectData.talents.filter(updatedTalent => {
                    const originalTalent = project.talents.find(t => t.id === updatedTalent.id);
                    return originalTalent && originalTalent.fee !== updatedTalent.fee;
                });

                if (changedTalents.length > 0) {
                    const currentTransactions = await api.getTransactions(project.id);
                    const batch = writeBatch(db);

                    changedTalents.forEach(changedTalent => {
                        const transactionsToUpdate = currentTransactions.filter(tx => tx.talentId === changedTalent.id);
                        
                        transactionsToUpdate.forEach(tx => {
                            if (tx.amount !== changedTalent.fee) {
                                const txRef = doc(db, 'transactions', tx.id);
                                batch.update(txRef, { amount: changedTalent.fee });
                            }
                        });
                    });
                    
                    await batch.commit();
                }
            }

            await api.updateProject(project.id, updatedProjectData);
            await fetchProject(); // Re-fetch to get latest data
            await fetchTransactions(); // Re-fetch transactions to update UI
            toast({ title: "Projeto atualizado!" });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Erro ao atualizar projeto', description: (error as Error).message });
        }
    };
    
    const handleAddTransaction = async (transactionData: Omit<Transaction, 'id' | 'userId'>) => {
        try {
            await api.addTransaction(transactionData);
            await fetchTransactions();

            if (transactionData.status === 'paid') {
              toast({ title: 'Despesa paga com sucesso!' });
            } else {
              toast({ title: 'Despesa planejada com sucesso!' });
            }
        } catch(error) {
            toast({ variant: 'destructive', title: 'Erro ao adicionar despesa', description: (error as Error).message });
        }
    };
    
    const handleAddTransactionsBatch = async (transactionsData: Omit<Transaction, 'id' | 'userId'>[]) => {
        if (transactionsData.length === 0) {
            toast({ variant: 'destructive', title: 'Nenhuma transação válida para importar.' });
            return;
        }
        try {
            await api.addTransactionsBatch(transactionsData);
            await fetchTransactions();
            toast({ title: `${transactionsData.length} transações importadas com sucesso!` });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Erro ao importar transações', description: (error as Error).message });
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
            onAddTransactionsBatch={handleAddTransactionsBatch}
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
