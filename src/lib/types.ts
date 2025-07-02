export const DEFAULT_EXPENSE_CATEGORIES = [
  "Aluguel de Equipamentos",
  "Custos de Produção",
  "Pós-produção",
  "Marketing e Distribuição",
  "Contingência",
  "Outros",
] as const;

export type ExpenseCategory = string;

export type Talent = {
  id: string;
  name: string;
  role: string;
  paymentType: 'fixed' | 'daily';
  fee?: number; // For fixed payment
  dailyRate?: number; // For daily payment
  days?: number; // For daily payment
};

export type Installment = {
  id: string;
  amount: number;
  date: Date;
  description: string;
}

export type Project = {
  id: string;
  userId: string;
  name: string;
  budget: number;
  productionCosts: number;
  talents: Talent[];
  includeProductionCostsInBudget: boolean;
  customCategories?: string[];
  isBudgetParcelado: boolean;
  installments: Installment[];
};

export type Transaction = {
  id: string;
  projectId: string;
  userId: string;
  type: "expense";
  amount: number;
  description: string;
  category?: ExpenseCategory;
  date: Date;
  status: 'planned' | 'paid';
  talentId?: string;
  paidDay?: number; // For daily payments
};

export type UserProfile = {
  uid: string;
  name: string;
  email: string;
  photoURL?: string;
};
