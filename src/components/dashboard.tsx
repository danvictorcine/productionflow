// @/src/components/dashboard.tsx
"use client";

import { useState, useMemo } from "react";
import Link from 'next/link';
import type { Transaction, Project, Talent, ExpenseCategory, TeamMember } from "@/lib/types";
import { PlusCircle, Edit, ArrowLeft, BarChart2, Users, FileSpreadsheet, FileText, Upload, ClipboardList, DollarSign, CheckCircle, Trash2 } from "lucide-react";
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
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DEFAULT_EXPENSE_CATEGORIES } from "@/lib/types";
import { UserNav } from "@/components/user-nav";
import { useToast } from "@/hooks/use-toast";
import { ImportTransactionsDialog } from "./import-transactions-dialog";
import { PayDailyRateDialog } from "./pay-daily-rate-dialog";
import { ManageCategoriesDialog } from "./manage-categories-dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "./ui/alert-dialog";
import { CopyableError } from "./copyable-error";


interface DashboardProps {
  project: Project;
  transactions: Transaction[];
  onProjectUpdate: (data: Partial<Project>) => Promise<void>;
  onAddTransaction: (data: Omit<Transaction, "id" | "userId">) => void;
  onAddTransactionsBatch: (data: Omit<Transaction, "id" | "userId">[]) => void;
  onUpdateTransaction: (id: string, data: Partial<Transaction>) => void;
  onDeleteTransaction: (id: string) => void;
  onAddCategory: (name: string) => Promise<void>;
  onUpdateCategory: (oldName: string, newName: string) => Promise<void>;
  onDeleteCategory: (name: string) => Promise<boolean>;
  onDeleteModule?: () => void;
}

export default function Dashboard({ 
    project, 
    transactions, 
    onProjectUpdate, 
    onAddTransaction,
    onAddTransactionsBatch,
    onUpdateTransaction,
    onDeleteTransaction,
    onAddCategory,
    onUpdateCategory,
    onDeleteCategory,
    onDeleteModule
}: DashboardProps) {
  const [isAddSheetOpen, setAddSheetOpen] = useState(false);
  const [isEditDialogOpen, setEditDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [isDailyPaymentOpen, setIsDailyPaymentOpen] = useState(false);
  const [isManageCategoriesOpen, setIsManageCategoriesOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedTalent, setSelectedTalent] = useState<TeamMember | null>(null);
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
    return project.talents.reduce((sum, talent) => {
        if (talent.paymentType === 'daily') {
            return sum + (talent.dailyRate || 0) * (talent.days || 0);
        }
        return sum + (talent.fee || 0);
    }, 0);
  }, [project.talents]);


  const totalInstallments = useMemo(() => {
    if (!project.isBudgetParcelado || !project.installments) return 0;
    return project.installments.reduce((sum, i) => sum + i.amount, 0);
  }, [project.isBudgetParcelado, project.installments]);

  const balance = useMemo(() => {
    const sourceOfFunds = project.isBudgetParcelado ? totalInstallments : project.budget;
    return sourceOfFunds - totalExpenses;
  }, [project.budget, project.isBudgetParcelado, totalInstallments, totalExpenses]);
  
  const totalGeneralExpenses = useMemo(() => {
    return generalExpenses.reduce((sum, t) => sum + t.amount, 0);
  }, [generalExpenses]);

  // Data for Tab 1: Visão Geral
  const geralChartData = useMemo(() => {
    const baseData = [
      { name: "Orçamento Total", value: project.budget, fill: "hsl(var(--chart-3))" },
      { name: "Cachês Planejados", value: totalTalentFee, fill: "hsl(var(--chart-1))" },
      { name: "Valor de Produção", value: project.productionCosts, fill: "hsl(var(--chart-4))" },
      { name: "Despesas Pagas", value: totalExpenses, fill: "hsl(var(--destructive))" },
      { name: "Saldo Atual", value: balance, fill: "hsl(var(--chart-2))" },
    ];
    
    if (project.isBudgetParcelado) {
        baseData.splice(1, 0, { name: "Valor em Conta", value: totalInstallments, fill: "hsl(var(--chart-5))" });
    }

    return baseData.filter(d => d.value > 0 || ['Saldo Atual', 'Orçamento Total', 'Valor em Conta'].includes(d.name));
  }, [project, totalTalentFee, totalExpenses, balance, totalInstallments]);

  // Data for Tab 2: Situação Paga
  const totalPaidTalentFees = useMemo(() => {
    return paidTransactions
      .filter(t => t.category === 'Cachê de Equipe e Talentos')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [paidTransactions]);

  const paidChartData = useMemo(() => {
    const sourceName = project.isBudgetParcelado ? "Valor em Conta" : "Orçamento Total";
    const sourceValue = project.isBudgetParcelado ? totalInstallments : project.budget;
    const sourceFill = project.isBudgetParcelado ? "hsl(var(--chart-5))" : "hsl(var(--chart-3))";
    
    return [
      { name: sourceName, value: sourceValue, fill: sourceFill },
      { name: "Total Pago", value: totalExpenses, fill: "hsl(var(--destructive))" },
      { name: "Cachês Pagos", value: totalPaidTalentFees, fill: "hsl(var(--chart-1))" },
      { name: "Saldo Atual", value: balance, fill: "hsl(var(--chart-2))" },
    ].filter(d => d.value > 0 || d.name === "Saldo Atual" || d.name === sourceName);
  }, [project.isBudgetParcelado, project.budget, totalInstallments, totalExpenses, totalPaidTalentFees, balance]);
  
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
  
  const handleEditProject = async (projectData: Omit<Project, 'id' | 'userId' | 'createdAt'>) => {
      try {
        await onProjectUpdate(projectData);
        setEditDialogOpen(false);
      } catch (error) {
        const errorTyped = error as { code?: string; message: string };
        toast({
            variant: "destructive",
            title: "Erro ao Atualizar Projeto",
            description: <CopyableError userMessage="Não foi possível salvar o projeto." errorCode={errorTyped.code || errorTyped.message} />,
        });
      }
  };

  const handleDeleteTalent = async (talentId: string) => {
    const updatedTalents = project.talents.filter(t => t.id !== talentId);
    await onProjectUpdate({ talents: updatedTalents });
    toast({ title: 'Talento removido com sucesso!'});
  };
  
  const handlePayFixedFeeTalent = async (talent: TeamMember, transaction: Transaction | undefined) => {
    if (transaction && transaction.status === 'planned') {
      await onUpdateTransaction(transaction.id, { status: 'paid' });
    } else if (!transaction) {
      const newTransactionData: Omit<Transaction, 'id' | 'userId'> = {
        projectId: project.id,
        type: 'expense',
        amount: talent.fee || 0,
        description: `Cachê: ${talent.name}`,
        category: 'Cachê de Equipe e Talentos',
        date: new Date(),
        talentId: talent.id,
        status: 'paid',
      };
      await onAddTransaction(newTransactionData);
    }
  };

  const handleManageDailyPayment = (talent: TeamMember) => {
      setSelectedTalent(talent);
      setIsDailyPaymentOpen(true);
  };

  const handlePayDailyRate = async (talent: TeamMember, dayNumber: number) => {
      const newTransactionData: Omit<Transaction, 'id' | 'userId'> = {
        projectId: project.id,
        type: 'expense',
        amount: talent.dailyRate || 0,
        description: `Diária ${dayNumber}/${talent.days}: ${talent.name}`,
        category: 'Cachê de Equipe e Talentos',
        date: new Date(),
        talentId: talent.id,
        status: 'paid',
        paidDay: dayNumber,
      };
      await onAddTransaction(newTransactionData);
      toast({ title: `Diária ${dayNumber} paga!`});
  };

  const handleUndoDailyPayment = async (transactionId: string) => {
      await onDeleteTransaction(transactionId);
      toast({ title: 'Pagamento da diária desfeito.'});
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

    const titleStyle = { font: { sz: 16, bold: true }, alignment: { horizontal: "center" } };
    const headerStyle = { font: { bold: true, color: { rgb: "FFFFFFFF" } }, fill: { fgColor: { rgb: "FF3F51B5" } }, alignment: { horizontal: "center" } };
    const paidStyle = { fill: { fgColor: { rgb: "FFD1FAE5" } } }; 
    const plannedStyle = { fill: { fgColor: { rgb: "FFFFFBEB" } } }; 
    
    const summaryDataForSheet = [
        ['Orçamento Total', project.budget],
        ...(project.isBudgetParcelado ? [['Valor em Conta (Soma das Parcelas)', totalInstallments]] : []),
        ['Cachês Planejados (Total)', totalTalentFee],
        ['Valor de Produção Planejado', project.productionCosts],
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
    wsSummary['!cols'] = [{ wch: 35 }, { wch: 20 }];
    wsSummary['A1'].s = titleStyle;
    ['A3', 'B3'].forEach(cell => { wsSummary[cell].s = headerStyle; });
    summaryDataForSheet.forEach((_, i) => {
        wsSummary[`B${i + 4}`].z = currencyFormat;
    });
    XLSX.utils.book_append_sheet(wb, wsSummary, "Resumo");

    const talentData = project.talents.map(talent => {
        const talentTransactions = paidTransactions.filter(t => t.talentId === talent.id && t.category === "Cachê de Equipe e Talentos");
        const paidAmount = talentTransactions.reduce((sum, t) => sum + t.amount, 0);
        
        let paymentDetail = '';
        let status = 'Não Pago';
        
        if (talent.paymentType === 'daily') {
            const totalPlanned = (talent.dailyRate || 0) * (talent.days || 0);
            paymentDetail = `${new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(talent.dailyRate || 0)} x ${talent.days} diárias`;
            if (paidAmount >= totalPlanned) {
                status = 'Totalmente Pago';
            } else if (paidAmount > 0) {
                status = `Parcialmente Pago (${talentTransactions.length}/${talent.days})`;
            }
        } else {
            paymentDetail = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(talent.fee || 0);
             if (paidAmount >= (talent.fee || 0)) {
                status = 'Pago';
            }
        }

        return [
            talent.name,
            talent.role,
            paymentDetail,
            paidAmount,
            status
        ];
    });

    const wsTalents = XLSX.utils.aoa_to_sheet([
        [`Relatório de Equipe e Talentos - ${project.name}`],
        [],
        ['Nome', 'Função', 'Cachê (Planejado)', 'Valor Pago', 'Status'],
        ...talentData
    ]);

    wsTalents['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 4 } }];
    wsTalents['!cols'] = [{ wch: 30 }, { wch: 30 }, { wch: 25 }, { wch: 20 }, { wch: 25 }];
    wsTalents['A1'].s = titleStyle;
    ['A3', 'B3', 'C3', 'D3', 'E3'].forEach(cell => { wsTalents[cell].s = headerStyle; });
    talentData.forEach((row, i) => {
        wsTalents[`D${i + 4}`].z = currencyFormat;
    });
    XLSX.utils.book_append_sheet(wb, wsTalents, "Equipe e Talentos");
    
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
    <div className="flex flex-col h-full w-full">
      <div className="flex-none border-b px-4 sm:px-6 md:px-8 py-2">
         <div className="flex items-center gap-1">
           <Button onClick={openAddSheet} variant="ghost" size="sm">
            <PlusCircle className="h-4 w-4 md:mr-2" />
            <span className="hidden md:inline">Adicionar Despesa</span>
          </Button>
           <Button onClick={() => setEditDialogOpen(true)} variant="ghost" size="sm">
            <Edit className="h-4 w-4 md:mr-2" />
            <span className="hidden md:inline">Editar Orçamento</span>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                  <FileSpreadsheet className="h-4 w-4 md:mr-2" />
                  <span className="hidden md:inline">Exportar</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setIsImportDialogOpen(true)}>
                    <Upload className="mr-2 h-4 w-4" />
                    <span>Importar Despesas (.xlsx)</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
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
          {onDeleteModule && (
              <Button onClick={() => setIsDeleteDialogOpen(true)} variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10">
                  <Trash2 className="h-4 w-4" />
                  <span className="sr-only">Excluir Módulo</span>
              </Button>
          )}
        </div>
      </div>

      <main className="flex-1 p-4 sm:p-6 md:p-8 flex flex-col gap-6 overflow-y-auto">
        <SummaryCards
          budget={project.budget}
          talentFees={totalTalentFee}
          productionCosts={project.productionCosts}
          paidExpenses={totalExpenses}
          balance={balance}
          isBudgetParcelado={project.isBudgetParcelado}
          totalInstallments={totalInstallments}
        />
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="flex flex-col gap-6 lg:w-2/3">
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
              <CardContent className="p-0">
                 <ScrollArea>
                    <TalentsTable
                        talents={project.talents}
                        transactions={transactions}
                        onEdit={() => setEditDialogOpen(true)}
                        onDelete={handleDeleteTalent}
                        onPayFixedFee={handlePayFixedFeeTalent}
                        onUndoPayment={handleUndoPayment}
                        onManageDailyPayment={handleManageDailyPayment}
                    />
                    <ScrollBar orientation="horizontal" />
                </ScrollArea>
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
          <div className="lg:w-1/3">
            <Card className="h-full flex flex-col">
                <CardHeader>
                    <CardTitle>Histórico de Transações Pagas</CardTitle>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 pt-2">
                        <label htmlFor="category-filter" className="text-sm font-medium text-muted-foreground shrink-0">Filtrar por Categoria:</label>
                        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                            <SelectTrigger id="category-filter" className="w-full">
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
                    <ScrollArea className="h-full">
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
        onManageCategories={() => setIsManageCategoriesOpen(true)}
      />
      <CreateEditProjectDialog
        isOpen={isEditDialogOpen}
        setIsOpen={setEditDialogOpen}
        onSubmit={handleEditProject}
        project={project}
      />
       <ImportTransactionsDialog
        isOpen={isImportDialogOpen}
        setIsOpen={setIsImportDialogOpen}
        onSubmit={onAddTransactionsBatch}
        project={project}
      />
      <ManageCategoriesDialog
        isOpen={isManageCategoriesOpen}
        setIsOpen={setIsManageCategoriesOpen}
        customCategories={project.customCategories || []}
        onAddCategory={onAddCategory}
        onUpdateCategory={onUpdateCategory}
        onDeleteCategory={onDeleteCategory}
        transactions={transactions}
      />
      {selectedTalent && (
        <PayDailyRateDialog
            isOpen={isDailyPaymentOpen}
            setIsOpen={setIsDailyPaymentOpen}
            talent={selectedTalent}
            transactions={transactions.filter(t => t.talentId === selectedTalent.id)}
            onPay={handlePayDailyRate}
            onUndo={handleUndoDailyPayment}
        />
      )}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Excluir Módulo Financeiro?</AlertDialogTitle>
                <AlertDialogDescription>
                    Esta ação não pode ser desfeita. Isso excluirá permanentemente o módulo financeiro e todos os seus dados associados (orçamento, transações, etc.). O projeto principal permanecerá.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={onDeleteModule} className="bg-destructive hover:bg-destructive/90">
                    Sim, Excluir
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
