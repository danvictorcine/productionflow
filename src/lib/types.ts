

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
  date: string; // YYYY-MM-DD
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

export type ChecklistItem = {
  id: string;
  text: string;
  checked: boolean;
};

export type LocationAddress = {
    displayName: string;
    road?: string;
    house_number?: string;
    city?: string;
    state?: string;
    postcode?: string;
    country?: string;
}

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
  parkingInfo?: string;
  radioChannels?: string;
  nearestHospital?: HospitalInfo;
  equipment: string | ChecklistItem[];
  costumes: string | ChecklistItem[];
  props: string | ChecklistItem[];
  generalNotes: string | ChecklistItem[];
  presentTeam: TeamMember[];
  latitude?: number;
  longitude?: number;
  weather?: WeatherInfo;
};

// === Creative Project (Moodboard) Types ===
export type CreativeProject = {
  id: string;
  userId: string;
  name: string;
  description: string;
  createdAt: Date;
};

export type BoardItem = {
  id: string;
  projectId: string;
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
export type Storyboard = {
  id: string;
  userId: string;
  name: string;
  description?: string;
  aspectRatio: '16:9' | '4:3';
  createdAt: Date;
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
