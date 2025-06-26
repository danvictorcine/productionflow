"use client";

import { useMemo } from "react";
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";
import type { Transaction } from "@/lib/types";
import {
  ChartContainer,
  ChartTooltipContent,
  ChartConfig
} from "@/components/ui/chart";

interface ExpenseChartProps {
  expenses: Transaction[];
}

const chartConfig = {
  total: {
    label: "Total",
    color: "hsl(var(--primary))",
  },
} satisfies ChartConfig;

export default function ExpenseChart({ expenses }: ExpenseChartProps) {
  const chartData = useMemo(() => {
    if (!expenses || expenses.length === 0) return [];
    
    const categoryTotals = expenses.reduce((acc, expense) => {
      const category = expense.category || "Outros";
      acc[category] = (acc[category] || 0) + expense.amount;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(categoryTotals)
      .map(([name, total]) => ({
        name,
        total,
      }))
      .sort((a, b) => b.total - a.total);
  }, [expenses]);

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-[250px] text-muted-foreground">
        Nenhum dado de despesa para exibir.
      </div>
    );
  }

  return (
    <ChartContainer config={chartConfig} className="min-h-[250px] w-full">
        <ResponsiveContainer width="100%" height={250}>
            <BarChart data={chartData} margin={{ top: 20, right: 20, bottom: 5, left: 20 }}>
                <XAxis
                dataKey="name"
                stroke="#888888"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                />
                <YAxis
                stroke="#888888"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `R$${value / 1000}k`}
                />
                <Tooltip
                cursor={{ fill: "hsl(var(--accent) / 0.2)" }}
                content={<ChartTooltipContent formatter={(value) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value as number)} />}
                />
                <Bar dataKey="total" fill="var(--color-total)" radius={[4, 4, 0, 0]} />
            </BarChart>
        </ResponsiveContainer>
    </ChartContainer>
  );
}
