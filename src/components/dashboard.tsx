"use client";

import { useState, useMemo, useEffect } from "react";
import type { Transaction } from "@/lib/types";
import { PlusCircle, BarChart2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import SummaryCards from "@/components/summary-cards";
import ExpenseChart from "@/components/expense-chart";
import TransactionsTable from "@/components/transactions-table";
import { AddTransactionSheet } from "@/components/add-transaction-sheet";

const initialTransactions: Transaction[] = [
    { id: '1', type: 'revenue', amount: 50000, description: 'Initial Funding from Investor', date: new Date('2024-05-15') },
    { id: '2', type: 'expense', amount: 15000, description: 'Lead Actor Advance', category: 'Talent Fee', date: new Date('2024-06-01') },
    { id: '3', type: 'expense', amount: 20000, description: 'Camera Package Rental', category: 'Production Costs', date: new Date('2024-06-10') },
    { id: '4', type: 'expense', amount: 8000, description: 'Color Grading Services', category: 'Post-production', date: new Date('2024-07-05') },
    { id: '5', type: 'revenue', amount: 10000, description: 'Product Placement Deal', date: new Date('2024-07-20') },
    { id: '6', type: 'expense', amount: 5000, description: 'Catering for 2 weeks', category: 'Production Costs', date: new Date('2024-06-25') },
    { id: '7', type: 'expense', amount: 2500, description: 'Social Media Campaign', category: 'Marketing & Distribution', date: new Date('2024-08-01') }
];


export default function Dashboard() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isSheetOpen, setSheetOpen] = useState(false);
  const [transactionType, setTransactionType] = useState<"revenue" | "expense">(
    "expense"
  );
  
  useEffect(() => {
    try {
      const storedTransactions = localStorage.getItem('production_flow_transactions');
      if (storedTransactions) {
        const parsed = JSON.parse(storedTransactions).map((t: any) => ({...t, date: new Date(t.date)}));
        setTransactions(parsed);
      } else {
        setTransactions(initialTransactions);
      }
    } catch (error) {
      console.error("Failed to parse transactions from localStorage", error)
      setTransactions(initialTransactions);
    }
  }, []);

  useEffect(() => {
    if(transactions.length > 0) {
      localStorage.setItem('production_flow_transactions', JSON.stringify(transactions));
    }
  }, [transactions]);


  const { totalRevenue, totalExpenses, balance } = useMemo(() => {
    const revenue = transactions
      .filter((t) => t.type === "revenue")
      .reduce((sum, t) => sum + t.amount, 0);
    const expenses = transactions
      .filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + t.amount, 0);
    return {
      totalRevenue: revenue,
      totalExpenses: expenses,
      balance: revenue - expenses,
    };
  }, [transactions]);

  const revenues = useMemo(
    () => transactions.filter((t) => t.type === "revenue"),
    [transactions]
  );
  const expenses = useMemo(
    () => transactions.filter((t) => t.type === "expense"),
    [transactions]
  );

  const handleAddTransaction = (transaction: Omit<Transaction, "id">) => {
    const newTransaction = { ...transaction, id: crypto.randomUUID() };
    setTransactions((prev) => [...prev, newTransaction].sort((a,b) => b.date.getTime() - a.date.getTime()));
    setSheetOpen(false);
  };
  
  const handleDeleteTransaction = (id: string) => {
    setTransactions(prev => prev.filter(t => t.id !== id))
  }

  const openSheet = (type: "revenue" | "expense") => {
    setTransactionType(type);
    setSheetOpen(true);
  };

  return (
    <div className="flex flex-col min-h-screen w-full">
      <header className="sticky top-0 z-10 flex h-[60px] items-center gap-4 border-b bg-background/95 backdrop-blur-sm px-6">
        <h1 className="text-2xl font-bold text-primary">ProductionFlow</h1>
        <div className="ml-auto flex items-center gap-4">
          <Button onClick={() => openSheet("revenue")} variant="outline">
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Revenue
          </Button>
          <Button onClick={() => openSheet("expense")}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Expense
          </Button>
        </div>
      </header>

      <main className="flex-1 p-4 sm:p-6 md:p-8 grid gap-6">
        <SummaryCards
          totalRevenue={totalRevenue}
          totalExpenses={totalExpenses}
          balance={balance}
        />
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart2 className="h-5 w-5 text-muted-foreground" />
                Expense Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ExpenseChart expenses={expenses} />
            </CardContent>
          </Card>
          <Card className="lg:col-span-1">
             <Tabs defaultValue="all">
              <div className="flex justify-between items-center px-6 pt-4">
                <CardTitle>Transactions</CardTitle>
                <TabsList>
                  <TabsTrigger value="all">All</TabsTrigger>
                  <TabsTrigger value="revenues">Revenues</TabsTrigger>
                  <TabsTrigger value="expenses">Expenses</TabsTrigger>
                </TabsList>
              </div>
              <CardContent className="pt-4">
                  <TabsContent value="all">
                    <TransactionsTable transactions={transactions} onDelete={handleDeleteTransaction} />
                  </TabsContent>
                  <TabsContent value="revenues">
                    <TransactionsTable transactions={revenues} onDelete={handleDeleteTransaction} />
                  </TabsContent>
                  <TabsContent value="expenses">
                    <TransactionsTable transactions={expenses} onDelete={handleDeleteTransaction} />
                  </TabsContent>
              </CardContent>
            </Tabs>
          </Card>
        </div>
      </main>
      <AddTransactionSheet
        isOpen={isSheetOpen}
        setIsOpen={setSheetOpen}
        type={transactionType}
        onSubmit={handleAddTransaction}
      />
    </div>
  );
}
