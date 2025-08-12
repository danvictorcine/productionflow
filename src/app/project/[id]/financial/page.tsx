// src/app/project/[id]/financial/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import type { Project, Transaction, UnifiedProject } from '@/lib/types';
import Dashboard from '@/components/dashboard';
import { Skeleton } from '@/components/ui/skeleton';
import * as api from '@/lib/firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/auth-context';
import { CopyableError } from '@/components/copyable-error';
import { Button } from '@/components/ui/button';
import { DollarSign, PlusCircle } from 'lucide-react';

function FinancialProjectPageDetail() {
    const router = useRouter();
    const params = useParams();
    const unifiedProjectId = params.id as string;
    const { toast } = useToast();
    const { user } = useAuth();

    const [unifiedProject, setUnifiedProject] = useState<UnifiedProject | null>(null);
    const [project, setProject] = useState<Project | null>(null);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchProjectData = useCallback(async () => {
        if (!unifiedProjectId || !user) return;
        setIsLoading(true);

        try {
            const uProject = await api.getUnifiedProject(unifiedProjectId);
            if (!uProject) {
                toast({ variant: 'destructive', title: 'Erro', description: 'Projeto não encontrado.' });
                router.push('/');
                return;
            }
            setUnifiedProject(uProject);

            if (uProject.financialProjectId) {
                const financialProject = await api.getProject(uProject.financialProjectId);
                const financialTransactions = await api.getTransactions(uProject.financialProjectId);
                
                if(financialProject) {
                    const projectWithDefaults: Project = {
                        ...financialProject,
                        hasProductionCosts: financialProject.hasProductionCosts ?? true,
                        isBudgetParcelado: financialProject.isBudgetParcelado ?? false,
                        installments: financialProject.installments ?? [],
                        talents: (financialProject.talents ?? []).map(t => ({...t, paymentType: t.paymentType || 'fixed'})),
                        customCategories: financialProject.customCategories ?? [],
                        includeProductionCostsInBudget: financialProject.includeProductionCostsInBudget ?? true,
                    };
                    setProject(projectWithDefaults);
                } else {
                    setProject(null);
                }
                setTransactions(financialTransactions);
            } else {
                setProject(null);
                setTransactions([]);
            }
        } catch (error) {
            const errorTyped = error as { code?: string; message: string };
            toast({
                variant: 'destructive',
                title: 'Erro ao carregar dados financeiros',
                description: <CopyableError userMessage="Não foi possível carregar os dados." errorCode={errorTyped.code || errorTyped.message} />,
            });
        } finally {
            setIsLoading(false);
        }
    }, [unifiedProjectId, user, router, toast]);

    useEffect(() => {
        fetchProjectData();
    }, [fetchProjectData]);

    const handleCreateFinancialProject = async () => {
        if (!unifiedProject) return;
        setIsLoading(true);
        try {
            const newFinancialProjectData = {
                name: unifiedProject.name,
                description: unifiedProject.description,
                budget: 0,
                hasProductionCosts: true,
                productionCosts: 0,
                includeProductionCostsInBudget: true,
                talents: [],
                isBudgetParcelado: false,
                installments: [],
                unifiedProjectId: unifiedProject.id,
            };
            const newProjectId = await api.addProject(newFinancialProjectData);
            await api.updateUnifiedProject(unifiedProject.id, { financialProjectId: newProjectId });
            toast({ title: 'Módulo Financeiro Criado!' });
            await fetchProjectData(); // Re-fetch data
        } catch (error) {
            toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível criar o módulo financeiro.' });
        } finally {
            setIsLoading(false);
        }
    };
    
    // Handlers
    const handleUpdateProject = async (updatedProjectData: Partial<Project>) => {
        if (!project) return;
        try {
            await api.updateProject(project.id, updatedProjectData);
            await fetchProjectData();
            toast({ title: "Projeto atualizado!" });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Erro ao atualizar projeto' });
        }
    };

    const handleAddTransaction = async (transactionData: Omit<Transaction, 'id' | 'userId'>) => {
        if(!project) return;
        try {
            await api.addTransaction({...transactionData, projectId: project.id});
            await fetchProjectData();
            toast({ title: 'Transação adicionada!' });
        } catch(error) {
            toast({ variant: 'destructive', title: 'Erro ao adicionar transação' });
        }
    };
    
    const handleAddTransactionsBatch = async (transactionsData: Omit<Transaction, 'id' | 'userId'>[]) => {
        if(!project) return;
        const transactionsWithProjectId = transactionsData.map(tx => ({...tx, projectId: project.id}));
        try {
            await api.addTransactionsBatch(transactionsWithProjectId);
            await fetchProjectData();
            toast({ title: `${transactionsData.length} transações importadas!` });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Erro ao importar transações' });
        }
    };

    const handleUpdateTransaction = async (transactionId: string, transactionData: Partial<Transaction>) => {
        try {
            await api.updateTransaction(transactionId, transactionData);
            await fetchProjectData();
            toast({ title: 'Transação atualizada!' });
        } catch(error) {
            toast({ variant: 'destructive', title: 'Erro ao atualizar transação' });
        }
    };
    
    const handleDeleteTransaction = async (transactionId: string) => {
        try {
            await api.deleteTransaction(transactionId);
            await fetchProjectData();
            toast({ title: 'Transação excluída.' });
        } catch(error) {
            toast({ variant: 'destructive', title: 'Erro ao excluir transação' });
        }
    };

    const handleAddCategory = async (name: string) => {
        if (!project) return;
        const updatedCategories = [...(project.customCategories || []), name];
        await api.updateProject(project.id, { customCategories: updatedCategories });
        await fetchProjectData();
        toast({ title: 'Categoria adicionada!' });
    };

    const handleDeleteCategory = async (name: string): Promise<boolean> => {
        if (!project) return false;
        const isUsed = transactions.some(t => t.category === name);
        if (isUsed) {
            toast({ variant: 'destructive', title: 'Não é possível excluir', description: `A categoria "${name}" está em uso.` });
            return false;
        }
        const updatedCategories = (project.customCategories || []).filter(c => c !== name);
        await api.updateProject(project.id, { customCategories: updatedCategories });
        await fetchProjectData();
        toast({ title: 'Categoria excluída!' });
        return true;
    };

    const handleUpdateCategory = async (oldName: string, newName: string) => {
        if (!project) return;
        await api.renameTransactionCategory(project.id, oldName, newName);
        await fetchProjectData();
        toast({ title: 'Categoria atualizada!' });
    };

    if (isLoading) {
        return (
            <div className="p-8 space-y-6">
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
        return (
             <div className="flex flex-col items-center justify-center text-center p-12 min-h-[400px]">
                <DollarSign className="mx-auto h-10 w-10 text-primary" />
                <h3 className="mt-4 text-lg font-semibold">
                    Módulo Financeiro não iniciado
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                    Crie um orçamento para começar a gerenciar as finanças deste projeto.
                </p>
                <Button className="mt-6" onClick={handleCreateFinancialProject}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Criar Orçamento
                </Button>
            </div>
        );
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

export default function FinancialProjectPage() {
    return <FinancialProjectPageDetail />;
}
