export const EXPENSE_CATEGORIES = [
  "Cachê do Talento",
  "Custos de Produção",
  "Pós-produção",
  "Marketing e Distribuição",
  "Contingência",
  "Outros",
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export type Talent = {
  id: string;
  name: string;
  role: string;
  fee: number;
};

export type Project = {
  id: string;
  name: string;
  budget: number;
  productionCosts: number;
  talents: Talent[];
};

export type Transaction = {
  id: string;
  projectId: string;
  type: "expense";
  amount: number;
  description: string;
  category?: ExpenseCategory;
  date: Date;
};
