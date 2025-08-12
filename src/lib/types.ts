

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

// O Projeto Financeiro agora tem um link para o projeto unificado
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
  unifiedProjectId?: string; // Link para o novo modelo
};

export type Transaction = {
  id: string;
  projectId: string; // Este ainda se refere ao ID do projeto financeiro
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
  isAdmin?: boolean;
};

export type Post = {
  id: string;
  title: string;
  content: string;
  authorId: string;
  authorName:string;
  authorPhotoURL?: string;
  createdAt: Date;
  updatedAt?: Date;
};

export type PageContent = {
  id: 'about' | 'contact' | 'terms';
  title: string;
  content: string;
  updatedAt: Date;
};

export type LoginFeature = {
  id: string;
  title: string;
  description: string;
  icon: string; // Name of a lucide-react icon
  order: number;
};

export type LoginPageContent = {
  features: LoginFeature[];
  backgroundImageUrl?: string;
  isBackgroundEnabled?: boolean;
};

// New type for Team Members on the About Page
export type TeamMemberAbout = {
  id: string;
  name: string;
  role: string;
  bio: string;
  photoURL: string;
  order: number;
  createdAt?: Date; // Optional for backward compatibility
  file?: File; // For upload state management
};


// New types for Production (Call Sheet) Module
export type TeamMember = {
  id:string;
  name: string;
  role: string;
  photoURL?: string;
  contact?: string;
  hasDietaryRestriction?: boolean;
  dietaryRestriction?: string;
  extraNotes?: string;
};

// A Produção agora tem um link para o projeto unificado
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
  unifiedProjectId?: string; // Link para o novo modelo
};

export type WeatherInfo = {
  daily: {
    temperature_2m_max: number[];
    sunrise: string[];
    sunset: string[];
    weather_code: number[];
  };
  hourly: {
    time: string[];
    temperature_2m: number[];
    weather_code: number[];
  };
  lastUpdated: string; // ISO String
  locationName: string;
  date: string; // YYYY-MM-DD
  timezone?: string;
};


export type HospitalInfo = {
  name: string;
  address: string;
  phone: string;
};

export type LocationAddress = {
    displayName: string;
    road?: string;
    house_number?: string;
    city?: string;
    town?: string;
    village?: string;
    county?: string;
    state?: string;
    postcode?: string;
    country?: string;
    suburb?: string;
    neighbourhood?: string;
    amenity?: string;
    shop?: string;
    tourism?: string;
    office?: string;
}

export type Scene = {
  id: string;
  sceneNumber: string;
  title: string; // e.g., EXT. PARK - DAY
  description: string;
  pages: string; // e.g., "1 3/8" or a time like "14:30"
  presentInScene: TeamMember[];
  equipment?: ChecklistItem[];
  costumes?: ChecklistItem[];
  props?: ChecklistItem[];
  location?: LocationAddress;
  latitude?: number;
  longitude?: number;
};

export type CallTime = {
  id: string;
  department: string;
  time: string; // e.g., "08:00"
};

export type ChecklistItem = {
  id: string;
  text: string;
  checked: boolean;
};

export type ShootingDay = {
  id: string;
  productionId: string;
  userId: string;
  date: Date;
  location: LocationAddress;
  scenes: Scene[];
  callTimes: CallTime[];
  dayNumber?: number;
  totalDays?: number;
  startTime?: string; // e.g., "08:00"
  endTime?: string; // e.g., "18:00"
  mealTime?: string;
  radioChannels?: string;
  nearestHospital?: HospitalInfo;
  generalNotes: ChecklistItem[];
  presentTeam: TeamMember[];
  latitude?: number;
  longitude?: number;
  weather?: WeatherInfo;
  parkingInfo?: string;
};

// === Creative Project (Moodboard) Types ===
// O CreativeProject agora tem um link para o projeto unificado
export type CreativeProject = {
  id: string;
  userId: string;
  name: string;
  description: string;
  createdAt: Date;
  unifiedProjectId?: string; // Link para o novo modelo
};

export type BoardItem = {
  id: string;
  projectId: string; // Este ainda se refere ao ID do creative_project
  userId: string;
  type: 'note' | 'image' | 'video' | 'location' | 'checklist' | 'palette' | 'pdf' | 'spotify' | 'text' | 'storyboard';
  content: string; // HTML for note, URL for image, URL for video, JSON for location, Title for checklist, JSON for palette, URL for PDF
  notes?: string; // For storyboard notes
  items?: ChecklistItem[]; // For checklist items
  position: { x: number; y: number };
  size: { width: number | string; height: number | string };
  createdAt: Date;
};

// === Storyboard Project Types ===
// O Storyboard agora tem um link para o projeto unificado
export type Storyboard = {
  id: string;
  userId: string;
  name: string;
  description?: string;
  aspectRatio: '16:9' | '4:3';
  createdAt: Date;
  unifiedProjectId?: string; // Link para o novo modelo
};

export type StoryboardScene = {
  id: string;
  storyboardId: string;
  userId: string;
  title: string;
  description: string;
  order: number;
  createdAt: Date;
};

export type StoryboardPanel = {
  id: string;
  storyboardId: string;
  sceneId: string;
  userId: string;
  imageUrl: string;
  notes: string;
  order: number;
  createdAt: Date;
};

// === Theme Settings ===
export type ThemeSettings = {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  foreground: string;
  card: string;
  destructive: string;
  border: string;
  chart1: string;
  chart2: string;
  chart3: string;
  chart4: string;
  chart5: string;
  brandIcon: string;
  brandText: string;
  brandLogin: string;
};

// === Beta Limits Settings ===
export type BetaLimits = {
  MAX_PROJECTS_PER_USER: number;
  MAX_PROJECTS_PER_GROUP: number;
  MAX_ITEMS_PER_MOODBOARD: number;
  MAX_PANELS_PER_STORYBOARD_SCENE: number;
};

// === Data Export/Import Types ===
type ExportedFinancialProject = { type: 'financial'; project: Project; transactions: Transaction[] };
type ExportedProductionProject = { type: 'production'; production: Production; shootingDays: ShootingDay[] };
type ExportedCreativeProject = { type: 'creative'; creativeProject: CreativeProject; boardItems: BoardItem[] };
type ExportedStoryboardProject = { type: 'storyboard'; storyboard: Storyboard; scenes: StoryboardScene[]; panels: StoryboardPanel[] };

export type ExportedProjectData = ExportedFinancialProject | ExportedProductionProject | ExportedCreativeProject | ExportedStoryboardProject;


// ===================================================================
// === NOVA ARQUITETURA DE PROJETO ÚNICO ===
// ===================================================================

export type UnifiedProject = {
  id: string;
  userId: string;
  name: string;
  description: string;
  createdAt: Date;

  // IDs dos projetos associados
  financialProjectId?: string;
  productionProjectId?: string;
  creativeProjectId?: string;
  storyboardProjectId?: string;
};

// Esta é uma combinação de todos os tipos para a listagem
export type DisplayableItem =
  | (Project & { itemType: 'financial'; unifiedProjectId?: undefined }) // Projetos antigos
  | (Production & { itemType: 'production'; unifiedProjectId?: undefined }) // Projetos antigos
  | (CreativeProject & { itemType: 'creative'; unifiedProjectId?: undefined }) // Projetos antigos
  | (Storyboard & { itemType: 'storyboard'; unifiedProjectId?: undefined }) // Projetos antigos
  | (UnifiedProject & { itemType: 'unified' }); // Novos projetos
