"use client"

import * as React from "react"
import { Pie, PieChart, ResponsiveContainer, Cell, Legend, Tooltip } from "recharts"

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

export default function BudgetBreakdownChart({ data }: BreakdownChartProps) {
    if (data.every(d => d.value === 0)) {
        return (
            <div className="flex items-center justify-center h-[250px] text-muted-foreground">
                Nenhum dado para exibir no gráfico.
            </div>
        );
    }
  return (
    <ChartContainer
      config={{}}
      className="mx-auto aspect-square min-h-[250px] max-h-[350px]"
    >
      <ResponsiveContainer width="100%" height={350}>
        <PieChart>
          <Tooltip
            cursor={{ fill: "hsl(var(--accent) / 0.2)" }}
            content={<ChartTooltipContent formatter={(value) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value as number)} nameKey="name" />}
          />
          <Legend
            verticalAlign="bottom"
            height={48}
            iconSize={10}
            wrapperStyle={{
                fontSize: "12px",
                paddingTop: "20px"
            }}
          />
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius="60%"
            outerRadius="80%"
            paddingAngle={2}
            labelLine={false}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.fill} stroke={entry.fill} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
    </ChartContainer>
  )
}
