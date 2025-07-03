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
  id:string;
  name: string;
  role: string;
  contact?: string;
  hasDietaryRestriction?: boolean;
  dietaryRestriction?: string;
  extraNotes?: string;
};

export type Production = {
  id: string;
  userId: string;
  name: string;
  type: string; // e.g., 'Curta-metragem', 'Publicidade'
  director: string;
  responsibleProducer?: string;
  client?: string;
  producer?: string;
  createdAt: Date;
  team: TeamMember[];
};

export type WeatherInfo = {
  temperature: number;
  windSpeed: number;
  sunrise: string; // ISO String
  sunset: string; // ISO String
  weatherCode: number;
  lastUpdated: string; // ISO String
  locationName: string;
};

export type HospitalInfo = {
  name: string;
  address: string;
  phone: string;
};

export type Scene = {
  id: string;
  sceneNumber: string;
  title: string; // e.g., EXT. PARK - DAY
  description: string;
  pages: string; // e.g., "1 3/8"
  presentInScene: TeamMember[];
};

export type CallTime = {
  id: string;
  department: string;
  time: string; // e.g., "08:00"
};


export type ShootingDay = {
  id: string;
  productionId: string;
  userId: string;
  date: Date;
  location: string;
  // Deprecated fields, kept for backward compatibility during transition
  scenes?: string | Scene[];
  callTimes?: string | CallTime[];
  // New structured fields
  dayNumber?: number;
  totalDays?: number;
  mealTime?: string;
  parkingInfo?: string;
  radioChannels?: string;
  nearestHospital?: HospitalInfo;
  // Common fields
  equipment: string;
  costumes: string;
  props: string;
  generalNotes: string;
  presentTeam: TeamMember[];
  latitude?: number;
  longitude?: number;
  weather?: WeatherInfo;
};
