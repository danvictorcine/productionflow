
"use client";

import { useState, useMemo } from "react";
import Link from 'next/link';
import type { Transaction, Project, Talent, ExpenseCategory } from "@/lib/types";
import { PlusCircle, Edit, ArrowLeft, BarChart2, Users, FileSpreadsheet, FileText, ClipboardList } from "lucide-react";
import * as XLSX from 'xlsx';
import { format } from 'date-fns';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import SummaryCards from "@/components/summary-cards";
import BudgetBreakdownChart from "@/components/budget-breakdown-chart";
import TransactionsTable from "@/components/transactions-table";
import { AddTransactionSheet } from "@/components/add-transaction-sheet";
import { CreateEditProjectDialog } from "@/components/create-edit-project-dialog";
import TalentsTable from "@/components/talents-table";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DEFAULT_EXPENSE_CATEGORIES } from "@/lib/types";
import { UserNav } from "@/components/user-nav";
import { useToast } from "@/hooks/use-toast";


interface DashboardProps {
  project: Project;
  transactions: Transaction[];
  onProjectUpdate: (data: Partial<Project>) => Promise<void>;
  onAddTransaction: (data: Omit<Transaction, "id" | "userId">) => void;
  onUpdateTransaction: (id: string, data: Partial<Transaction>) => void;
  onDeleteTransaction: (id: string) => void;
}

export default function Dashboard({ 
    project, 
    transactions, 
    onProjectUpdate, 
    onAddTransaction,
    onUpdateTransaction,
    onDeleteTransaction
}: DashboardProps) {
  const [isAddSheetOpen, setAddSheetOpen] = useState(false);
  const [isEditDialogOpen, setEditDialogOpen] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const { toast } = useToast();
  
  const generalExpenses = useMemo(() => {
    return transactions.filter(t => t.category !== "Cachê de Equipe e Talentos");
  }, [transactions]);

  const paidTransactions = useMemo(() => {
    return transactions.filter(t => t.status === 'paid');
  }, [transactions]);

  const totalExpenses = useMemo(() => {
    return paidTransactions.reduce((sum, t) => sum + t.amount, 0);
  }, [paidTransactions]);
  
  const totalTalentFee = useMemo(() => {
    return project.talents.reduce((sum, t) => sum + t.fee, 0);
  }, [project.talents]);

  const balance = useMemo(() => {
    return project.budget - totalExpenses;
  }, [project.budget, totalExpenses]);
  
  const totalGeneralExpenses = useMemo(() => {
    return generalExpenses.reduce((sum, t) => sum + t.amount, 0);
  }, [generalExpenses]);

  const remainingBudget = useMemo(() => {
    const totalPlanned = totalTalentFee + totalGeneralExpenses + (project.includeProductionCostsInBudget ? project.productionCosts : 0);
    return project.budget - totalPlanned;
  }, [project.budget, project.includeProductionCostsInBudget, totalTalentFee, totalGeneralExpenses, project.productionCosts]);
  
  // Data for Tab 1: Visão Geral
  const geralChartData = useMemo(() => {
    return [
      { name: "Orçamento Total", value: project.budget, fill: "hsl(var(--chart-3))" },
      { name: "Cachês Planejados", value: totalTalentFee, fill: "hsl(var(--chart-1))" },
      { name: "Custos de Produção", value: project.productionCosts, fill: "hsl(var(--chart-4))" },
      { name: "Despesas Pagas", value: totalExpenses, fill: "hsl(var(--destructive))" },
      { name: "Saldo Atual", value: balance, fill: "hsl(var(--chart-2))" },
    ].filter(d => d.value > 0 || d.name === "Saldo Atual" || d.name === "Orçamento Total");
  }, [project.budget, totalTalentFee, project.productionCosts, totalExpenses, balance]);

  // Data for Tab 2: Situação Paga
  const totalPaidTalentFees = useMemo(() => {
    return paidTransactions
      .filter(t => t.category === 'Cachê de Equipe e Talentos')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [paidTransactions]);

  const paidChartData = useMemo(() => {
    return [
      { name: "Orçamento Total", value: project.budget, fill: "hsl(var(--chart-3))" },
      { name: "Total Pago", value: totalExpenses, fill: "hsl(var(--destructive))" },
      { name: "Cachês Pagos", value: totalPaidTalentFees, fill: "hsl(var(--chart-1))" },
      { name: "Saldo Atual", value: balance, fill: "hsl(var(--chart-2))" },
    ].filter(d => d.value > 0 || d.name === "Saldo Atual" || d.name === "Orçamento Total");
  }, [project.budget, totalExpenses, totalPaidTalentFees, balance]);
  
  // Data for Tab 3: Pagamentos por Categoria
  const categoryChartData = useMemo(() => {
    const categoryTotals: { [key: string]: number } = {};
    let paidTalentFeesTotal = 0;

    paidTransactions.forEach(t => {
      if (t.category === 'Cachê de Equipe e Talentos') {
        paidTalentFeesTotal += t.amount;
      } else {
        const category = t.category || 'Outros';
        categoryTotals[category] = (categoryTotals[category] || 0) + t.amount;
      }
    });

    const data = [];

    if (paidTalentFeesTotal > 0) {
      data.push({ name: 'Total Cachês Pagos', value: paidTalentFeesTotal, fill: 'hsl(var(--chart-1))' });
    }

    Object.entries(categoryTotals).forEach(([name, value], index) => {
      if (value > 0) {
        data.push({ name, value, fill: `hsl(var(--chart-${(index % 4) + 2}))` });
      }
    });

    return data.sort((a, b) => b.value - a.value);
  }, [paidTransactions]);

   const allCategories = useMemo(() => {
    const categoriesInUse = new Set(transactions.map(t => t.category).filter(Boolean) as string[]);
    const projectCustomCategories = project.customCategories || [];
    return Array.from(new Set([...DEFAULT_EXPENSE_CATEGORIES, ...projectCustomCategories, ...categoriesInUse, "Cachê de Equipe e Talentos"])).sort();
  }, [transactions, project.customCategories]);
  
  const filteredPaidTransactions = useMemo(() => {
    if (categoryFilter === 'all') {
      return paidTransactions;
    }
    return paidTransactions.filter(t => t.category === categoryFilter);
  }, [paidTransactions, categoryFilter]);


  const handleSaveTransaction = (transaction: Omit<Transaction, "id" | "projectId" | "type" | "userId" | "status"> & { id?: string }) => {
    const { id, ...data } = transaction;
    if (id) { // Editing existing transaction
        const originalTransaction = transactions.find(t => t.id === id);
        onUpdateTransaction(id, {
            ...data,
            status: originalTransaction?.status || 'planned' // Preserve status on edit
        });
    } else { // Adding new transaction
        onAddTransaction({
            ...data,
            projectId: project.id,
            type: "expense",
            status: 'planned'
        });
    }
    setAddSheetOpen(false);
    setEditingTransaction(null);
  };
  
  const handleStartEditTransaction = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setAddSheetOpen(true);
  };
  
  const handleEditProject = async (projectData: Omit<Project, 'id' | 'userId'>) => {
      await onProjectUpdate(projectData);
      setEditDialogOpen(false);
  };

  const handleDeleteTalent = async (talentId: string) => {
    const updatedTalents = project.talents.filter(t => t.id !== talentId);
    await onProjectUpdate({ talents: updatedTalents });
  };
  
  const handlePayTalent = async (talent: Talent, transaction: Transaction | undefined) => {
    if (transaction && transaction.status === 'planned') {
      await onUpdateTransaction(transaction.id, { status: 'paid' });
    } else if (!transaction) {
      const newTransactionData: Omit<Transaction, 'id' | 'userId'> = {
        projectId: project.id,
        type: 'expense',
        amount: talent.fee,
        description: `Cachê: ${talent.name}`,
        category: 'Cachê de Equipe e Talentos',
        date: new Date(),
        talentId: talent.id,
        status: 'paid',
      };
      await onAddTransaction(newTransactionData);
    }
  };
  
  const handlePayTransaction = (transactionId: string) => {
    onUpdateTransaction(transactionId, { status: 'paid' });
  };

  const handleUndoPayment = (transactionId: string) => {
    onUpdateTransaction(transactionId, { status: 'planned' });
  }

  const handleExportToExcel = () => {
    const wb = XLSX.utils.book_new();
    const currencyFormat = 'R$#,##0.00;[Red]-R$#,##0.00';

    // --- Common Styles ---
    const titleStyle = { font: { sz: 16, bold: true }, alignment: { horizontal: "center" } };
    const headerStyle = { font: { bold: true, color: { rgb: "FFFFFFFF" } }, fill: { fgColor: { rgb: "FF3F51B5" } }, alignment: { horizontal: "center" } };
    const paidStyle = { fill: { fgColor: { rgb: "FFD1FAE5" } } }; // Green tint
    const plannedStyle = { fill: { fgColor: { rgb: "FFFFFBEB" } } }; // Yellow tint
    
    // --- 1. Summary Sheet ---
    const summaryDataForSheet = [
        ['Orçamento Total', project.budget],
        ['Cachês Planejados (Total)', totalTalentFee],
        ['Custos de Produção Planejados', project.productionCosts],
        ['Despesas Totais Pagas', totalExpenses],
        ['Saldo Atual', balance],
    ];

    const wsSummary = XLSX.utils.aoa_to_sheet([
        [`Resumo Financeiro - ${project.name}`],
        [],
        ['Item', 'Valor'],
        ...summaryDataForSheet
    ]);

    wsSummary['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 1 } }];
    wsSummary['!cols'] = [{ wch: 30 }, { wch: 20 }];
    wsSummary['A1'].s = titleStyle;
    ['A3', 'B3'].forEach(cell => { wsSummary[cell].s = headerStyle; });
    summaryDataForSheet.forEach((_, i) => {
        wsSummary[`B${i + 4}`].z = currencyFormat;
    });
    XLSX.utils.book_append_sheet(wb, wsSummary, "Resumo");


    // --- 2. Talents Sheet ---
    const talentData = project.talents.map(talent => {
        const paidAmount = paidTransactions
            .filter(t => t.talentId === talent.id && t.category === "Cachê de Equipe e Talentos")
            .reduce((sum, t) => sum + t.amount, 0);
        return [
            talent.name,
            talent.role,
            talent.fee,
            paidAmount,
            paidAmount >= talent.fee ? 'Pago' : 'Não Pago'
        ];
    });

    const wsTalents = XLSX.utils.aoa_to_sheet([
        [`Relatório de Equipe e Talentos - ${project.name}`],
        [],
        ['Nome', 'Função', 'Cachê (Planejado)', 'Valor Pago', 'Status'],
        ...talentData
    ]);

    wsTalents['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 4 } }];
    wsTalents['!cols'] = [{ wch: 30 }, { wch: 30 }, { wch: 20 }, { wch: 20 }, { wch: 20 }];
    wsTalents['A1'].s = titleStyle;
    ['A3', 'B3', 'C3', 'D3', 'E3'].forEach(cell => { wsTalents[cell].s = headerStyle; });
    talentData.forEach((row, i) => {
        wsTalents[`C${i + 4}`].z = currencyFormat;
        wsTalents[`D${i + 4}`].z = currencyFormat;
        const statusCell = wsTalents[`E${i + 4}`];
        statusCell.s = row[4] === 'Pago' ? paidStyle : plannedStyle;
    });
    XLSX.utils.book_append_sheet(wb, wsTalents, "Equipe e Talentos");
    

    // --- 3 & 4. Transactions Sheets ---
    const createTransactionSheet = (sheetName: string, title: string, data: any[]) => {
        const ws = XLSX.utils.aoa_to_sheet([
            [title],
            [],
            ['Descrição', 'Categoria', 'Data', 'Valor', 'Status'],
            ...data
        ]);
        ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 4 } }];
        ws['!cols'] = [{ wch: 40 }, { wch: 25 }, { wch: 15 }, { wch: 15 }, { wch: 15 }];
        ws['A1'].s = titleStyle;
        ['A3', 'B3', 'C3', 'D3', 'E3'].forEach(cell => { ws[cell].s = headerStyle; });
        data.forEach((row, i) => {
            ws[`D${i + 4}`].z = currencyFormat;
            const statusCell = ws[`E${i + 4}`];
            statusCell.s = row[4] === 'Pago' ? paidStyle : plannedStyle;
        });
        XLSX.utils.book_append_sheet(wb, ws, sheetName);
    };

    const allOtherTransactions = transactions
        .map(t => ([
            t.description,
            t.category || 'Não especificada',
            format(t.date, "dd/MM/yyyy"),
            t.amount,
            t.status === 'paid' ? 'Pago' : 'Planejado'
        ]));
        
    createTransactionSheet("Todas as Despesas", `Relatório de Todas as Despesas - ${project.name}`, allOtherTransactions);
    

    // --- Trigger Download ---
    XLSX.writeFile(wb, `Relatorio_Financeiro_${project.name.replace(/ /g, "_")}.xlsx`);
    toast({ title: "Exportação Concluída", description: "Seu relatório do Excel foi baixado." });
  };
  
  const handleExportTransactionReceipt = () => {
    const wb = XLSX.utils.book_new();
    const currencyFormat = 'R$#,##0.00';
    const titleStyle = { font: { sz: 16, bold: true }, alignment: { horizontal: "center" } };
    const headerStyle = { font: { bold: true, color: { rgb: "FFFFFFFF" } }, fill: { fgColor: { rgb: "FF3F51B5" } }, alignment: { horizontal: "center" } };

    const paidData = paidTransactions.map(t => ([
        format(t.date, "dd/MM/yyyy"),
        t.description,
        t.category || 'Não especificada',
        t.amount,
        'Pago'
    ]));

    const ws = XLSX.utils.aoa_to_sheet([
        [`Comprovante de Transações Pagas - ${project.name}`],
        [],
        ['Data', 'Descrição', 'Categoria', 'Valor', 'Status'],
        ...paidData
    ]);

    ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 4 } }];
    ws['!cols'] = [{ wch: 15 }, { wch: 40 }, { wch: 25 }, { wch: 15 }, { wch: 15 }];
    ws['A1'].s = titleStyle;
    ['A3', 'B3', 'C3', 'D3', 'E3'].forEach(cell => { ws[cell].s = headerStyle; });
    paidData.forEach((row, i) => {
        ws[`D${i + 4}`].z = currencyFormat;
    });

    XLSX.utils.book_append_sheet(wb, ws, "Transações Pagas");

    XLSX.writeFile(wb, `Comprovante_Transacoes_${project.name.replace(/ /g, "_")}.xlsx`);
    toast({ title: "Exportação Concluída", description: "Seu comprovante de transações foi baixado." });
  };


  const openAddSheet = () => {
    setEditingTransaction(null);
    setAddSheetOpen(true);
  };
  
  return (
    <div className="flex flex-col min-h-screen w-full">
      <header className="sticky top-0 z-10 flex h-[60px] items-center gap-4 border-b bg-background/95 backdrop-blur-sm px-6">
        <Link href="/" className="flex items-center gap-2 text-lg font-semibold md:text-base" aria-label="Voltar para a página de projetos">
            <Button variant="outline" size="icon" className="h-8 w-8">
                <ArrowLeft className="h-4 w-4" />
                <span className="sr-only">Voltar para Projetos</span>
            </Button>
        </Link>
        <h1 className="text-xl font-bold text-primary truncate">{project.name}</h1>
        <div className="ml-auto flex items-center gap-2">
          <Button onClick={() => setEditDialogOpen(true)} variant="outline">
            <Edit className="mr-2 h-4 w-4" />
            Editar Projeto
          </Button>
          <Button onClick={openAddSheet}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Adicionar Despesa
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" aria-label="Opções de Exportação">
                  <FileSpreadsheet className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleExportToExcel}>
                    <FileSpreadsheet className="mr-2 h-4 w-4" />
                    <span>Relatório Financeiro</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportTransactionReceipt}>
                    <FileText className="mr-2 h-4 w-4" />
                    <span>Relatório de Transações</span>
                </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <UserNav />
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
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 flex flex-col gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart2 className="h-5 w-5 text-muted-foreground" />
                  Balanço do Orçamento
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="overview">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="overview">Visão Geral</TabsTrigger>
                    <TabsTrigger value="paid">Situação Paga</TabsTrigger>
                    <TabsTrigger value="categories">Categorias</TabsTrigger>
                  </TabsList>
                  <TabsContent value="overview" className="mt-4">
                     <BudgetBreakdownChart data={geralChartData} />
                  </TabsContent>
                  <TabsContent value="paid" className="mt-4">
                    <BudgetBreakdownChart data={paidChartData} />
                  </TabsContent>
                  <TabsContent value="categories" className="mt-4">
                     <BudgetBreakdownChart data={categoryChartData} />
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-muted-foreground" />
                  Equipe e Talentos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <TalentsTable
                    talents={project.talents}
                    transactions={transactions}
                    onEdit={() => setEditDialogOpen(true)}
                    onDelete={handleDeleteTalent}
                    onPay={handlePayTalent}
                    onUndo={handleUndoPayment}
                />
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ClipboardList className="h-5 w-5 text-muted-foreground" />
                  Despesas Gerais
                </CardTitle>
              </CardHeader>
              <CardContent>
                 <TransactionsTable
                    transactions={generalExpenses}
                    onDelete={onDeleteTransaction}
                    onEdit={handleStartEditTransaction}
                    onPay={handlePayTransaction}
                    onUndo={handleUndoPayment}
                />
              </CardContent>
            </Card>

          </div>
          <div className="lg:col-span-1">
            <Card className="h-full flex flex-col">
                <CardHeader>
                    <CardTitle>Histórico de Transações Pagas</CardTitle>
                    <div className="flex items-center gap-2 pt-2">
                        <label htmlFor="category-filter" className="text-sm font-medium text-muted-foreground">Filtrar por Categoria:</label>
                        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                            <SelectTrigger id="category-filter" className="w-full sm:w-[220px]">
                                <SelectValue placeholder="Selecionar categoria" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todas as Categorias</SelectItem>
                                {allCategories.map(cat => (
                                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </CardHeader>
                <CardContent className="flex-1 overflow-hidden p-0">
                    <ScrollArea className="h-full whitespace-nowrap">
                      <TransactionsTable
                        transactions={filteredPaidTransactions}
                        variant="history"
                        onUndo={handleUndoPayment}
                      />
                      <ScrollBar orientation="horizontal" />
                    </ScrollArea>
                </CardContent>
            </Card>
          </div>
        </div>
      </main>
      <AddTransactionSheet
        isOpen={isAddSheetOpen}
        setIsOpen={setAddSheetOpen}
        onSubmit={handleSaveTransaction}
        transactionToEdit={editingTransaction}
        project={project}
        onProjectUpdate={onProjectUpdate}
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
