export const EXPENSE_CATEGORIES = [
  "Cachê do Talento",
  "Custos de Produção",
  "Pós-produção",
  "Marketing e Distribuição",
  "Contingência",
  "Outros",
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export type Transaction = {
  id: string;
  type: "revenue" | "expense";
  amount: number;
  description: string;
  category?: ExpenseCategory;
  date: Date;
};
