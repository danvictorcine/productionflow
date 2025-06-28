"use client";

import { useState, useMemo, useEffect } from "react";
import Link from 'next/link';
import type { Transaction, Project } from "@/lib/types";
import { PlusCircle, BarChart2, Edit, ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import SummaryCards from "@/components/summary-cards";
import ExpenseChart from "@/components/expense-chart";
import TransactionsTable from "@/components/transactions-table";
import { AddTransactionSheet } from "@/components/add-transaction-sheet";
import { CreateEditProjectDialog } from "@/components/create-edit-project-dialog";

interface DashboardProps {
  project: Project;
  initialTransactions: Transaction[];
  onProjectUpdate: (project: Project) => void;
}

export default function Dashboard({ project, initialTransactions, onProjectUpdate }: DashboardProps) {
  const [transactions, setTransactions] = useState<Transaction[]>(initialTransactions);
  const [isAddSheetOpen, setAddSheetOpen] = useState(false);
  const [isEditDialogOpen, setEditDialogOpen] = useState(false);

  useEffect(() => {
    try {
        const storedTransactions = localStorage.getItem('production_flow_transactions');
        const allTransactions = storedTransactions ? JSON.parse(storedTransactions) : [];
        const otherProjectTransactions = allTransactions.filter((t: Transaction) => t.projectId !== project.id);
        const updatedAllTransactions = [...otherProjectTransactions, ...transactions];
        localStorage.setItem('production_flow_transactions', JSON.stringify(updatedAllTransactions));
    } catch(e) {
        console.error("Could not save transactions", e)
    }
  }, [transactions, project.id]);


  const totalExpenses = useMemo(() => {
    return transactions.reduce((sum, t) => sum + t.amount, 0);
  }, [transactions]);
  
  const totalTalentFee = useMemo(() => {
    return project.talents.reduce((sum, t) => sum + t.fee, 0);
  }, [project.talents]);

  const balance = useMemo(() => {
    const paidTalentFees = transactions
      .filter(t => t.category === "Cachê do Talento")
      .reduce((sum, t) => sum + t.amount, 0);

    const paidProductionCosts = transactions
        .filter(t => t.category === "Custos de Produção")
        .reduce((sum, t) => sum + t.amount, 0);

    const unpaidTalentFees = Math.max(0, totalTalentFee - paidTalentFees);
    
    const unpaidProductionCosts = project.includeProductionCostsInBudget
      ? Math.max(0, project.productionCosts - paidProductionCosts)
      : 0;
      
    const moneyAccountedFor = totalExpenses + unpaidTalentFees + unpaidProductionCosts;

    return project.budget - moneyAccountedFor;
  }, [project, transactions, totalTalentFee]);


  const expenses = useMemo(
    () => transactions.filter((t) => t.type === "expense"),
    [transactions]
  );

  const handleAddTransaction = (transaction: Omit<Transaction, "id" | "projectId" | "type">) => {
    const newTransaction: Transaction = {
      ...transaction,
      id: crypto.randomUUID(),
      projectId: project.id,
      type: "expense",
    };
    setTransactions((prev) => [...prev, newTransaction].sort((a,b) => b.date.getTime() - a.date.getTime()));
    setAddSheetOpen(false);
  };
  
  const handleDeleteTransaction = (id: string) => {
    setTransactions(prev => prev.filter(t => t.id !== id))
  }

  const handleEditProject = (projectData: Omit<Project, 'id'>) => {
      const updatedProject = { ...project, ...projectData };
      onProjectUpdate(updatedProject);
      setEditDialogOpen(false);
  };

  return (
    <div className="flex flex-col min-h-screen w-full">
      <header className="sticky top-0 z-10 flex h-[60px] items-center gap-4 border-b bg-background/95 backdrop-blur-sm px-6">
        <Link href="/" className="flex items-center gap-2 text-lg font-semibold md:text-base">
            <Button variant="outline" size="icon" className="h-8 w-8">
                <ArrowLeft className="h-4 w-4" />
                <span className="sr-only">Voltar para Projetos</span>
            </Button>
        </Link>
        <h1 className="text-xl font-bold text-primary truncate">{project.name}</h1>
        <div className="ml-auto flex items-center gap-4">
          <Button onClick={() => setEditDialogOpen(true)} variant="outline">
            <Edit className="mr-2 h-4 w-4" />
            Editar Projeto
          </Button>
          <Button onClick={() => setAddSheetOpen(true)}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Adicionar Despesa
          </Button>
        </div>
      </header>

      <main className="flex-1 p-4 sm:p-6 md:p-8 grid gap-6">
        <SummaryCards
          budget={project.budget}
          talentFees={totalTalentFee}
          productionCosts={project.productionCosts}
          paidExpenses={totalExpenses}
          balance={balance}
        />
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart2 className="h-5 w-5 text-muted-foreground" />
                Detalhamento de Despesas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ExpenseChart expenses={expenses} />
            </CardContent>
          </Card>
          <Card className="lg:col-span-1">
             <Tabs defaultValue="all">
              <div className="flex justify-between items-center px-6 pt-4">
                <CardTitle>Transações</CardTitle>
                <TabsList>
                  <TabsTrigger value="all">Todas</TabsTrigger>
                </TabsList>
              </div>
              <CardContent className="pt-4">
                  <TabsContent value="all">
                    <TransactionsTable transactions={transactions} onDelete={handleDeleteTransaction} />
                  </TabsContent>
              </CardContent>
            </Tabs>
          </Card>
        </div>
      </main>
      <AddTransactionSheet
        isOpen={isAddSheetOpen}
        setIsOpen={setAddSheetOpen}
        onSubmit={handleAddTransaction}
      />
      <CreateEditProjectDialog
        isOpen={isEditDialogOpen}
        setIsOpen={setEditDialogOpen}
        onSubmit={handleEditProject}
        project={project}
      />
    </div>
  );
}
