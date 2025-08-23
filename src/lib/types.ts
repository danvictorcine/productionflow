// @/src/lib/types.ts

export const DEFAULT_EXPENSE_CATEGORIES = [
  "Aluguel de Equipamentos",
  "Custos de Produção",
  "Pós-produção",
  "Marketing e Distribuição",
  "Contingência",
  "Outros",
] as const;

export type ExpenseCategory = string;

// Modelo principal para o Banco de Talentos. Contém informações pessoais.
export type Talent = {
  id: string;
  userId: string;
  name: string;
  photoURL?: string;
  contact?: string;
  hasDietaryRestriction?: boolean;
  dietaryRestriction?: string;
  extraNotes?: string;
  // O campo 'file' é apenas para o estado de upload no frontend
  file?: File;
};

// Modelo para um membro de equipe DENTRO de um projeto.
// Inclui informações específicas do projeto, como a função e pagamento.
export type TeamMember = {
  id: string; // ID único do talento no banco de talentos (usado como talentId)
  name: string;     // Denormalized para exibição fácil
  role: string;     // Específico para este projeto. Agora tem um default no schema de validação.
  
  // Informações de pagamento específicas do projeto
  paymentType?: 'fixed' | 'daily';
  fee?: number; 
  dailyRate?: number; 
  days?: number; 

  // Informações denormalizadas do talento para exibição e uso na ordem do dia
  photoURL?: string;
  contact?: string;
  hasDietaryRestriction?: boolean;
  dietaryRestriction?: string;
  extraNotes?: string;
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
  talents: TeamMember[]; // Alterado de Talent[] para TeamMember[]
  includeProductionCostsInBudget: boolean;
  customCategories?: string[];
  isBudgetParcelado: boolean;
  installments: Installment[];
  createdAt: Date;
  unifiedProjectId?: string;
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
  talentId?: string; // ID do Talent (NÃO do TeamMember)
  paidDay?: number;
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
  icon: string;
  order: number;
};

export type LoginCarouselImage = {
  id: string;
  url: string;
  file?: File;
};

export type LoginPageContent = {
  carouselImages?: LoginCarouselImage[];
};

export type TeamMemberAbout = {
  id: string;
  name: string;
  role: string;
  bio: string;
  photoURL: string;
  order: number;
  createdAt?: Date;
  file?: File;
};

export type Production = {
  id: string;
  userId: string;
  name: string;
  type: string;
  director: string;
  responsibleProducer?: string;
  client?: string;
  producer?: string;
  createdAt: Date;
  team: TeamMember[];
  unifiedProjectId?: string;
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
  lastUpdated: string;
  locationName: string;
  date: string;
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
  title: string;
  description: string;
  pages: string;
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
  time: string;
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
  startTime?: string;
  endTime?: string;
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

export type CreativeProject = {
  id: string;
  userId: string;
  name: string;
  description: string;
  createdAt: Date;
  unifiedProjectId?: string;
};

export type BoardItem = {
  id: string;
  projectId: string;
  userId: string;
  type: 'note' | 'image' | 'video' | 'location' | 'checklist' | 'pdf' | 'spotify' | 'text' | 'storyboard';
  content: string;
  notes?: string;
  items?: ChecklistItem[];
  position: { x: number; y: number };
  size: { width: number | string; height: number | string };
  createdAt: Date;
};

export type Storyboard = {
  id: string;
  userId: string;
  name: string;
  description?: string;
  createdAt: Date;
  unifiedProjectId?: string;
};

export type StoryboardScene = {
  id: string;
  storyboardId: string;
  userId: string;
  title: string;
  description: string;
  order: number;
  createdAt: Date;
  aspectRatio: '16:9' | '4:3' | '9:16' | '2.39:1';
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
};

export type BetaLimits = {
  MAX_PROJECTS_PER_USER: number;
  MAX_PROJECTS_PER_GROUP: number;
  MAX_ITEMS_PER_MOODBOARD: number;
  MAX_PANELS_PER_STORYBOARD_SCENE: number;
};

type ExportedFinancialProject = { type: 'financial'; project: Project; transactions: Transaction[] };
type ExportedProductionProject = { type: 'production'; production: Production; shootingDays: ShootingDay[] };
type ExportedCreativeProject = { type: 'creative'; creativeProject: CreativeProject; boardItems: BoardItem[] };
type ExportedStoryboardProject = { type: 'storyboard'; storyboard: Storyboard; scenes: StoryboardScene[]; panels: StoryboardPanel[] };

export type ExportedProjectData = ExportedFinancialProject | ExportedProductionProject | ExportedCreativeProject | ExportedStoryboardProject;

export type UnifiedProject = {
  id: string;
  userId: string;
  name: string;
  description: string;
  createdAt: Date;
  financialProjectId?: string;
  productionProjectId?: string;
  creativeProjectId?: string;
  storyboardProjectId?: string;
};

export type DisplayableItem =
  | (Project & { itemType: 'financial'; unifiedProjectId?: undefined })
  | (Production & { itemType: 'production'; unifiedProjectId?: undefined })
  | (CreativeProject & { itemType: 'creative'; unifiedProjectId?: undefined })
  | (Storyboard & { itemType: 'storyboard'; unifiedProjectId?: undefined })
  | (UnifiedProject & { itemType: 'unified' });
  
export type GanttTask = {
  id: string;
  userId: string;
  phase: 'Desenvolvimento' | 'Pre' | 'Prod' | 'Post' | 'Distribuição';
  title: string;
  startDate: string;
  endDate: string;
  progress: number;
  assignees?: string[];
  notes?: string;
  color?: string;
  createdAt: Date;
  updatedAt: Date;
};
