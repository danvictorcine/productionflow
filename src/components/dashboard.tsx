
"use client";

import { useState, useMemo } from "react";
import Link from 'next/link';
import type { Transaction, Project, Talent } from "@/lib/types";
import { PlusCircle, Edit, ArrowLeft, BarChart2, Users, Wrench, FileSpreadsheet } from "lucide-react";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EXPENSE_CATEGORIES } from "@/lib/types";
import { UserNav } from "@/components/user-nav";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";


interface DashboardProps {
  project: Project;
  transactions: Transaction[];
  onProjectUpdate: (data: Partial<Project>) => void;
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

  const totalExpenses = useMemo(() => {
    return transactions.reduce((sum, t) => sum + t.amount, 0);
  }, [transactions]);
  
  const totalTalentFee = useMemo(() => {
    return project.talents.reduce((sum, t) => sum + t.fee, 0);
  }, [project.talents]);

  const balance = useMemo(() => {
    return project.budget - totalExpenses;
  }, [project.budget, totalExpenses]);
  
  const breakdownData = useMemo(() => {
    const paidTalentFees = transactions
      .filter(t => t.category === "Cachê do Talento")
      .reduce((sum, t) => sum + t.amount, 0);

    const paidProductionCosts = transactions
        .filter(t => t.category === "Custos de Produção")
        .reduce((sum, t) => sum + t.amount, 0);
      
    const otherExpenses = transactions
      .filter(t => !["Cachê do Talento", "Custos de Produção"].includes(t.category || ''))
      .reduce((sum, t) => sum + t.amount, 0);

    const unpaidTalentFees = Math.max(0, totalTalentFee - paidTalentFees);
    
    const unpaidProductionCosts = project.includeProductionCostsInBudget
      ? Math.max(0, project.productionCosts - paidProductionCosts)
      : 0;
    
    const moneyAccountedFor = totalExpenses + unpaidTalentFees + unpaidProductionCosts;
    const projectedBalance = project.budget - moneyAccountedFor;

    const finalBalance = projectedBalance < 0 ? 0 : projectedBalance;
    const overBudget = projectedBalance < 0 ? Math.abs(projectedBalance) : 0;
    
    let data = [
        { name: 'Saldo Disponível', value: finalBalance, fill: 'hsl(var(--chart-2))' },
        { name: 'Cachês Pagos', value: paidTalentFees, fill: 'hsl(var(--chart-1))' },
        { name: 'Cachês a Pagar', value: unpaidTalentFees, fill: 'hsl(var(--chart-3))' },
        { name: 'Custos de Produção Pagos', value: paidProductionCosts, fill: 'hsl(var(--chart-4))' },
        { name: 'Custos de Produção a Pagar', value: unpaidProductionCosts, fill: 'hsl(var(--chart-5))' },
        { name: 'Outras Despesas', value: otherExpenses, fill: 'hsl(var(--muted-foreground))' },
    ];
    
    if (overBudget > 0) {
        data.push({ name: 'Acima do Orçamento', value: overBudget, fill: 'hsl(var(--destructive))'});
    }
    
    return data.filter(item => item.value > 0);

  }, [project, transactions, totalTalentFee]);

  const productionCostsTransactions = useMemo(() => {
    return transactions.filter(t => t.category === 'Custos de Produção');
  }, [transactions]);
  
  const filteredTransactionsForHistory = useMemo(() => {
    if (categoryFilter === 'all') {
      return transactions;
    }
    return transactions.filter(t => t.category === categoryFilter);
  }, [transactions, categoryFilter]);


  const handleSaveTransaction = (transaction: Omit<Transaction, "id" | "projectId" | "type" | "userId"> & { id?: string }) => {
    const { id, ...data } = transaction;
    if (id) {
        onUpdateTransaction(id, data);
    } else {
        onAddTransaction({
            ...data,
            projectId: project.id,
            type: "expense",
        });
    }
    setAddSheetOpen(false);
    setEditingTransaction(null);
  };
  
  const handleStartEditTransaction = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setAddSheetOpen(true);
  };
  
  const handleEditProject = (projectData: Omit<Project, 'id' | 'userId'>) => {
      onProjectUpdate(projectData);
      setEditDialogOpen(false);
  };

  const handleDeleteTalent = (talentId: string) => {
    const updatedTalents = project.talents.filter(t => t.id !== talentId);
    onProjectUpdate({ talents: updatedTalents });
  };
  
  const handlePayTalent = (talent: Talent) => {
    const paidAmount = transactions
      .filter(t => t.talentId === talent.id)
      .reduce((sum, t) => sum + t.amount, 0);

    if (paidAmount >= talent.fee) {
        console.warn("Este talento já foi pago.");
        return;
    }

    const newTransactionData: Omit<Transaction, "id" | "userId"> = {
      projectId: project.id,
      type: "expense",
      amount: talent.fee, // Assumes full payment
      description: `Cachê: ${talent.name}`,
      category: "Cachê do Talento",
      date: new Date(),
      talentId: talent.id,
    };
    onAddTransaction(newTransactionData);
  };
  
  const handleUndoPayment = (transactionId: string) => {
    onDeleteTransaction(transactionId);
  }

  const handleExportToExcel = () => {
    const wb = XLSX.utils.book_new();

    const borderStyle = { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } };
    const titleStyle = { font: { sz: 16, bold: true }, alignment: { horizontal: "center" } };
    const headerStyle = {
        font: { bold: true, color: { rgb: "FFFFFFFF" } },
        fill: { fgColor: { rgb: "FF4F46E5" } }, // A primary-like color
        border: borderStyle,
        alignment: { horizontal: "center" }
    };
    const defaultCellStyle = { border: borderStyle };
    const currencyCellStyle = { ...defaultCellStyle, numFmt: 'R$#,##0.00' };
    const paidStyle = { ...defaultCellStyle, font: { color: { rgb: "FF16A34A" } }, fill: { fgColor: { rgb: "FFDCFCE7" }, patternType: "solid" } }; // Green
    const unpaidStyle = { ...defaultCellStyle, font: { color: { rgb: "FFDC2626" } }, fill: { fgColor: { rgb: "FFFEE2E2" }, patternType: "solid" } }; // Red
    
    // Helper function to apply styles
    const applyStylesToSheet = (ws: XLSX.WorkSheet, rowCount: number, colCount: number, colStyles: any) => {
        const range = { s: { r: 0, c: 0 }, e: { r: rowCount, c: colCount } };
        for (let R = range.s.r; R <= range.e.r; ++R) {
            for (let C = range.s.c; C <= range.e.c; ++C) {
                const cell_address = { c: C, r: R };
                const cell_ref = XLSX.utils.encode_cell(cell_address);
                if (!ws[cell_ref]) continue;

                if (R === 0) { // Title
                    ws[cell_ref].s = titleStyle;
                } else if (R === 2) { // Header
                    ws[cell_ref].s = headerStyle;
                } else if (R > 2) { // Data
                    const colStyle = colStyles[C];
                    if (colStyle) {
                        const cell = ws[cell_ref];
                        if (colStyle.type === 'currency') {
                            cell.s = currencyCellStyle;
                        } else if (colStyle.type === 'conditional') {
                            cell.s = colStyle.condition(cell.v) ? paidStyle : unpaidStyle;
                        } else {
                            cell.s = defaultCellStyle;
                        }
                    } else {
                         ws[cell_ref].s = defaultCellStyle;
                    }
                }
            }
        }
    };


    // 1. Prepare Talents Data
    const talentData = project.talents.map(talent => {
        const paidAmount = transactions
            .filter(t => t.talentId === talent.id && t.category === "Cachê do Talento")
            .reduce((sum, t) => sum + t.amount, 0);
        return [
            talent.name,
            talent.role,
            talent.fee,
            paidAmount >= talent.fee ? 'Pago' : 'Não Pago'
        ];
    });

    const talentSheetData = [
        [`Relatório de Equipe e Talentos - ${project.name}`],
        [],
        ['Nome', 'Função', 'Cachê (R$)', 'Status do Pagamento'],
        ...talentData
    ];

    const wsTalents = XLSX.utils.aoa_to_sheet(talentSheetData);
    wsTalents['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 3 } }];
    wsTalents['!cols'] = [{ wch: 30 }, { wch: 30 }, { wch: 20 }, { wch: 20 }];
    applyStylesToSheet(wsTalents, talentData.length + 2, 3, { 2: { type: 'currency' }, 3: { type: 'conditional', condition: (v: string) => v === 'Pago' } });
    XLSX.utils.book_append_sheet(wb, wsTalents, "Equipe e Talentos");


    // 2. Prepare Production Costs Data
    const productionCostsForExport = transactions
        .filter(t => t.category === 'Custos de Produção')
        .map(t => ([t.description, t.amount, format(t.date, "dd/MM/yyyy")]));
    
    const prodCostsSheetData = [
        ["Relatório de Custos de Produção"],
        [],
        ['Descrição', 'Valor (R$)', 'Data'],
        ...productionCostsForExport
    ];

    const wsProdCosts = XLSX.utils.aoa_to_sheet(prodCostsSheetData);
    wsProdCosts['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 2 } }];
    wsProdCosts['!cols'] = [{ wch: 50 }, { wch: 20 }, { wch: 20 }];
    applyStylesToSheet(wsProdCosts, productionCostsForExport.length + 2, 2, { 1: { type: 'currency' } });
    XLSX.utils.book_append_sheet(wb, wsProdCosts, "Custos de Produção");


    // 3. Prepare Other Expenses Data
    const otherExpensesForExport = transactions
        .filter(t => t.category !== 'Custos de Produção' && t.category !== 'Cachê do Talento')
        .map(t => ([t.description, t.category || 'Não especificada', t.amount, format(t.date, "dd/MM/yyyy")]));

    const otherExpensesSheetData = [
        ["Relatório de Outras Despesas"],
        [],
        ['Descrição', 'Categoria', 'Valor (R$)', 'Data'],
        ...otherExpensesForExport
    ];
    
    const wsOtherExpenses = XLSX.utils.aoa_to_sheet(otherExpensesSheetData);
    wsOtherExpenses['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 3 } }];
    wsOtherExpenses['!cols'] = [{ wch: 50 }, { wch: 30 }, { wch: 20 }, { wch: 20 }];
    applyStylesToSheet(wsOtherExpenses, otherExpensesForExport.length + 2, 3, { 2: { type: 'currency' } });
    XLSX.utils.book_append_sheet(wb, wsOtherExpenses, "Outras Despesas");


    // Trigger the download
    XLSX.writeFile(wb, `${project.name}-relatorio-formatado.xlsx`);
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
          <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button onClick={handleExportToExcel} variant="outline" size="icon" aria-label="Exportar para Excel">
                        <FileSpreadsheet className="h-4 w-4" />
                    </Button>
                </TooltipTrigger>
                <TooltipContent>
                    <p>Exportar para Excel</p>
                </TooltipContent>
            </Tooltip>
          </TooltipProvider>
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
                <ScrollArea className="h-[265px] w-full">
                  <TalentsTable
                      talents={project.talents}
                      transactions={transactions}
                      onEdit={() => setEditDialogOpen(true)}
                      onDelete={handleDeleteTalent}
                      onPay={handlePayTalent}
                      onUndoPayment={handleUndoPayment}
                  />
                </ScrollArea>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wrench className="h-5 w-5 text-muted-foreground" />
                  Custos de Produção
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[265px] w-full">
                  <TransactionsTable transactions={productionCostsTransactions} onDelete={onDeleteTransaction} onEdit={handleStartEditTransaction} />
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
          <div className="lg:col-span-1">
            <Card className="h-full flex flex-col">
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle>Histórico</CardTitle>
                        <div className="flex items-center gap-2">
                            <label htmlFor="category-filter" className="text-sm font-medium text-muted-foreground">Filtrar:</label>
                            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                                <SelectTrigger id="category-filter" className="w-[220px]">
                                    <SelectValue placeholder="Selecionar categoria" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todas as Categorias</SelectItem>
                                    {EXPENSE_CATEGORIES.map(cat => (
                                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="flex-1 relative min-h-0">
                    <ScrollArea className="absolute inset-0">
                      <TransactionsTable transactions={filteredTransactionsForHistory} onDelete={onDeleteTransaction} onEdit={handleStartEditTransaction} />
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
