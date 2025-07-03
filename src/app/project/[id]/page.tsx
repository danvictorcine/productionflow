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
import { DEFAULT_EXPENSE_CATEGORIES } from '@/lib/types';
import { CopyableError } from '@/components/copyable-error';


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
                hasProductionCosts: projectData.hasProductionCosts ?? true,
                isBudgetParcelado: projectData.isBudgetParcelado ?? false,
                installments: projectData.installments ?? [],
                talents: (projectData.talents ?? []).map(t => ({...t, paymentType: t.paymentType || 'fixed'})),
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
                const errorTyped = error as { code?: string; message: string };
                toast({ 
                    variant: "destructive", 
                    title: "Erro ao carregar dados", 
                    description: <CopyableError userMessage="Não foi possível carregar os dados do projeto." errorCode={errorTyped.code || errorTyped.message} />,
                });
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
            const batch = writeBatch(db);

            const projectRef = doc(db, 'projects', project.id);
            const dataToUpdate: Record<string, any> = { ...updatedProjectData };
             if (updatedProjectData.installments) {
                dataToUpdate.installments = updatedProjectData.installments.map(inst => ({
                    ...inst,
                    date: new Date(inst.date),
                }));
            }
            batch.update(projectRef, dataToUpdate);
            
            await batch.commit();
            
            await fetchProject(); // Re-fetch to get latest data
            await fetchTransactions(); // Re-fetch transactions to update UI
            toast({ title: "Projeto atualizado!" });
        } catch (error) {
            const errorTyped = error as { code?: string; message: string };
            toast({ 
                variant: 'destructive', 
                title: 'Erro ao atualizar projeto', 
                description: <CopyableError userMessage="Não foi possível atualizar o projeto." errorCode={errorTyped.code || errorTyped.message} /> 
            });
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
            const errorTyped = error as { code?: string; message: string };
            toast({ 
                variant: 'destructive', 
                title: 'Erro ao adicionar despesa', 
                description: <CopyableError userMessage="Não foi possível adicionar a despesa." errorCode={errorTyped.code || errorTyped.message} /> 
            });
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
             const errorTyped = error as { code?: string; message: string };
            toast({ 
                variant: 'destructive', 
                title: 'Erro ao importar transações', 
                description: <CopyableError userMessage="Não foi possível importar as transações." errorCode={errorTyped.code || errorTyped.message} /> 
            });
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
            const errorTyped = error as { code?: string; message: string };
            toast({ 
                variant: 'destructive', 
                title: 'Erro ao atualizar despesa', 
                description: <CopyableError userMessage="Não foi possível atualizar a despesa." errorCode={errorTyped.code || errorTyped.message} /> 
            });
        }
    }
    
    const handleDeleteTransaction = async (transactionId: string) => {
        try {
            await api.deleteTransaction(transactionId);
            await fetchTransactions();
            toast({ title: 'Despesa excluída.' });
        } catch(error) {
            const errorTyped = error as { code?: string; message: string };
            toast({ 
                variant: 'destructive', 
                title: 'Erro ao excluir despesa', 
                description: <CopyableError userMessage="Não foi possível excluir a despesa." errorCode={errorTyped.code || errorTyped.message} /> 
            });
        }
    }

    const handleAddCategory = async (name: string) => {
        if (!project) return;
        const newName = name.trim();
        if (!newName) return;

        const allCategories = [...DEFAULT_EXPENSE_CATEGORIES, ...(project.customCategories || [])];
        if (allCategories.map(c => c.toLowerCase()).includes(newName.toLowerCase())) {
            toast({ variant: 'destructive', title: 'Categoria já existe' });
            return;
        }

        const updatedCategories = [...(project.customCategories || []), newName];
        await api.updateProject(project.id, { customCategories: updatedCategories });
        await fetchProject();
        toast({ title: 'Categoria adicionada!' });
    };

    const handleDeleteCategory = async (name: string): Promise<boolean> => {
        if (!project) return false;

        const isUsed = transactions.some(t => t.category === name);
        if (isUsed) {
            toast({ variant: 'destructive', title: 'Não é possível excluir', description: `A categoria "${name}" está em uso por uma ou mais transações.` });
            return false;
        }

        const updatedCategories = (project.customCategories || []).filter(c => c !== name);
        await api.updateProject(project.id, { customCategories: updatedCategories });
        await fetchProject();
        toast({ title: 'Categoria excluída!' });
        return true;
    };

    const handleUpdateCategory = async (oldName: string, newName: string) => {
        if (!project) return;
        const newTrimmedName = newName.trim();
        if (!newTrimmedName || oldName === newTrimmedName) return;

        const allCategories = [...DEFAULT_EXPENSE_CATEGORIES, ...(project.customCategories || [])];
        if (allCategories.filter(c => c !== oldName).map(c => c.toLowerCase()).includes(newTrimmedName.toLowerCase())) {
            toast({ variant: 'destructive', title: 'Nome de categoria já existe' });
            return;
        }
        
        await api.renameTransactionCategory(project.id, oldName, newTrimmedName);
        
        await fetchProject();
        await fetchTransactions();
        toast({ title: 'Categoria atualizada!' });
    };


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
            onAddCategory={handleAddCategory}
            onUpdateCategory={handleUpdateCategory}
            onDeleteCategory={handleDeleteCategory}
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
