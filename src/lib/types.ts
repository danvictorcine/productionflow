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
  hasProductionCosts: boolean;
  productionCosts: number;
  talents: Talent[];
  includeProductionCostsInBudget: boolean;
  customCategories?: string[];
  isBudgetParcelado: boolean;
  installments: Installment[];
  createdAt: Date;
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


// New types for Production (Call Sheet) Module
export type TeamMember = {
  id: string;
  name: string;
  role: string;
};

export type Production = {
  id: string;
  userId: string;
  name: string;
  type: string; // e.g., 'Curta-metragem', 'Publicidade'
  director: string;
  client: string;
  createdAt: Date;
  team: TeamMember[];
};

export type ShootingDay = {
  id: string;
  productionId: string;
  userId: string;
  date: Date;
  location: string;
  scenes: string; // Using textarea
  generalNotes: string; // Using textarea
  callTimes: string; // Using textarea
  equipment: string; // Using textarea
  costumes: string; // Using textarea
  props: string; // Using textarea
  presentTeam: TeamMember[];
};
