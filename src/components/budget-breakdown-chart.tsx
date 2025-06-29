"use client"

import * as React from "react"
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Cell, Tooltip } from "recharts"

import {
  ChartContainer,
  ChartTooltipContent,
} from "@/components/ui/chart"

interface BreakdownChartProps {
  data: {
    name: string
    value: number
    fill: string
  }[]
}

const chartConfig = {}

export default function BudgetBreakdownChart({ data }: BreakdownChartProps) {
    if (data.every(d => d.value === 0)) {
        return (
            <div className="flex items-center justify-center h-[350px] text-muted-foreground">
                Nenhum dado para exibir no gráfico.
            </div>
        );
    }
  return (
    <ChartContainer
      config={chartConfig}
      className="min-h-[350px] w-full"
    >
      <ResponsiveContainer width="100%" height={350}>
        <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            barSize={50}
        >
            <XAxis type="number" hide />
            <YAxis
                dataKey="name"
                type="category"
                tickLine={false}
                axisLine={false}
                tick={{ fill: 'hsl(var(--foreground))', fontSize: 12 }}
                width={150}
                interval={0}
            />
            <Tooltip
                cursor={{ fill: "hsl(var(--accent) / 0.2)" }}
                content={<ChartTooltipContent formatter={(value) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value as number)} nameKey="name" />}
            />
            <Bar dataKey="value" layout="vertical" radius={4}>
                {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
            </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartContainer>
  )
}
