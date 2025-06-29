
"use client";

import { useState, useMemo } from "react";
import Link from 'next/link';
import type { Transaction, Project, Talent, ExpenseCategory } from "@/lib/types";
import { PlusCircle, Edit, ArrowLeft, BarChart2, Users, FileSpreadsheet, ChevronDown } from "lucide-react";
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
import { DEFAULT_EXPENSE_CATEGORIES } from "@/lib/types";
import { UserNav } from "@/components/user-nav";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
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

  const paidTransactions = useMemo(() => {
    return transactions.filter(t => t.status === 'paid');
  }, [transactions]);
  
  const transactionsByCategory = useMemo(() => {
    return transactions.reduce((acc, t) => {
        const category = t.category || 'Outros';
        if (!acc[category]) {
            acc[category] = [];
        }
        acc[category].push(t);
        return acc;
    }, {} as Record<ExpenseCategory, Transaction[]>)
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
  
  const breakdownData = useMemo(() => {
    const paidTalentFees = paidTransactions
      .filter((t) => t.category === "Cachê do Talento")
      .reduce((sum, t) => sum + t.amount, 0);

    const paidProductionCosts = paidTransactions
      .filter((t) => t.category === "Custos de Produção")
      .reduce((sum, t) => sum + t.amount, 0);

    const otherExpenses = paidTransactions
      .filter(
        (t) =>
          !["Cachê do Talento", "Custos de Produção"].includes(t.category || "")
      )
      .reduce((sum, t) => sum + t.amount, 0);
      
    const chartBalance = balance < 0 ? 0 : balance;

    const data = [
      { name: "Saldo Atual", value: chartBalance, fill: "hsl(var(--chart-2))" },
      { name: "Cachês Pagos", value: paidTalentFees, fill: "hsl(var(--chart-1))" },
      {
        name: "Custos de Produção Pagos",
        value: paidProductionCosts,
        fill: "hsl(var(--chart-4))",
      },
      {
        name: "Outras Despesas",
        value: otherExpenses,
        fill: "hsl(var(--muted-foreground))",
      },
    ];

    return data.filter((item) => item.value > 0);
  }, [paidTransactions, balance]);
  
   const allCategories = useMemo(() => {
    const categoriesInUse = new Set(transactions.map(t => t.category).filter(Boolean) as string[]);
    const projectCustomCategories = project.customCategories || [];
    return Array.from(new Set([...DEFAULT_EXPENSE_CATEGORIES, ...projectCustomCategories, ...categoriesInUse])).sort();
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
        category: 'Cachê do Talento',
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
            .filter(t => t.talentId === talent.id && t.category === "Cachê do Talento")
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
        .filter(t => t.category !== 'Cachê do Talento')
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
                    <span>Exportar para Excel</span>
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
                <BudgetBreakdownChart data={breakdownData} />
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

            {Object.entries(transactionsByCategory)
              .filter(([category, categoryTransactions]) => category !== 'Cachê do Talento' && categoryTransactions.length > 0)
              .map(([category, categoryTransactions]) => (
                <Collapsible key={category} defaultOpen>
                    <Card>
                        <CollapsibleTrigger asChild>
                            <div className="flex cursor-pointer items-center justify-between p-6">
                                <CardTitle>{category}</CardTitle>
                                <Button variant="ghost" size="icon" className="data-[state=open]:rotate-180">
                                    <ChevronDown className="h-5 w-5"/>
                                </Button>
                            </div>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                            <CardContent>
                                <TransactionsTable 
                                    transactions={categoryTransactions} 
                                    onDelete={onDeleteTransaction} 
                                    onEdit={handleStartEditTransaction}
                                    onPay={handlePayTransaction}
                                    onUndo={handleUndoPayment}
                                />
                            </CardContent>
                        </CollapsibleContent>
                    </Card>
                </Collapsible>
            ))}

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
