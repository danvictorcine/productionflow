
"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DollarSign, CreditCard, Wallet, Users, Wrench } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface SummaryCardsProps {
  budget: number;
  talentFees: number;
  productionCosts: number;
  paidExpenses: number;
  balance: number;
  isBudgetParcelado: boolean;
  totalInstallments?: number;
}

export default function SummaryCards({
  budget,
  talentFees,
  productionCosts,
  paidExpenses,
  balance,
  isBudgetParcelado,
  totalInstallments,
}: SummaryCardsProps) {
  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Orçamento Total</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-xl md:text-2xl font-bold">
            {formatCurrency(budget)}
          </div>
          <p className="text-xs text-muted-foreground">Valor total para a produção.</p>
        </CardContent>
      </Card>
      
      {isBudgetParcelado ? (
         <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor em Conta</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl md:text-2xl font-bold">
              {formatCurrency(totalInstallments || 0)}
            </div>
            <p className="text-xs text-muted-foreground">Soma das parcelas recebidas.</p>
          </CardContent>
        </Card>
      ) : (
         <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cachês (Planejado)</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl md:text-2xl font-bold">
              {formatCurrency(talentFees)}
            </div>
            <p className="text-xs text-muted-foreground">Custo total com talentos.</p>
          </CardContent>
        </Card>
      )}

      {productionCosts > 0 && (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor de Produção</CardTitle>
            <Wrench className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
            <div className="text-xl md:text-2xl font-bold">
                {formatCurrency(productionCosts)}
            </div>
            <p className="text-xs text-muted-foreground">Valor geral da produção.</p>
            </CardContent>
        </Card>
      )}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Despesas Pagas</CardTitle>
          <CreditCard className="h-4 w-4 text-red-500" />
        </CardHeader>
        <CardContent>
          <div className="text-xl md:text-2xl font-bold">
            {formatCurrency(paidExpenses)}
          </div>
           <p className="text-xs text-muted-foreground">Total de gastos até o momento.</p>
        </CardContent>
      </Card>
      <Card className="bg-primary text-primary-foreground sm:col-span-2 lg:col-span-1 xl:col-span-1">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Saldo Atual</CardTitle>
          <Wallet className="h-4 w-4 text-primary-foreground/80" />
        </CardHeader>
        <CardContent>
          <div className="text-xl md:text-2xl font-bold">{formatCurrency(balance)}</div>
           <p className="text-xs text-primary-foreground/80">{isBudgetParcelado ? 'Saldo com base no valor em conta.' : 'Seu orçamento disponível.'}</p>
        </CardContent>
      </Card>
    </div>
  );
}
