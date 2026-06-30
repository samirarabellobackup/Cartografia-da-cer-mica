export type Category =
  | 'Ateliê'
  | 'Ateliê Escola'
  | 'Ceramista'
  | 'Professor'
  | 'Escola'
  | 'Fornecedor'
  | 'Fabricante'
  | 'Importador'
  | 'Loja'
  | 'Assistência Técnica'
  | 'Queima'
  | 'Museu'
  | 'Galeria'
  | 'Coworking'
  | 'Residência'
  | 'Evento'
  | 'Feira'
  | 'Coletivo'
  | 'Associação'
  | 'Universidade'
  | 'Outro';

export type Specialty =
  | 'Modelagem Manual'
  | 'Torno'
  | 'Porcelana'
  | 'Escultura'
  | 'Azulejaria'
  | 'Barbotina'
  | 'Moldagem'
  | 'Joalheria Cerâmica'
  | 'Cerâmica Contemporânea'
  | 'Cerâmica Popular'
  | 'Cerâmica Indígena'
  | 'Raku'
  | 'Naked Raku'
  | 'Pit Fire'
  | 'Anagama'
  | 'Noborigama'
  | 'Queima Elétrica'
  | 'Queima a Gás'
  | 'Queima a Lenha'
  | 'Alta Temperatura'
  | 'Baixa Temperatura'
  | 'Impressão 3D'
  | 'Restauro';

export type PrivacyLevel =
  | 'full'         // Exibe endereço completo e rota
  | 'neighborhood' // Exibe bairro, cidade, estado e local aproximado
  | 'city'         // Exibe apenas cidade e estado
  | 'state';       // Exibe apenas o estado

export interface CeramicEvent {
  id: string;
  title: string;
  type: 'curso' | 'workshop' | 'feira' | 'exposicao' | 'encontro' | 'residencia';
  date: string;
  time?: string;
  price?: string;
  instructor?: string;
  description: string;
  location: string;
  establishmentId: string;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  photo: string;
  category: 'argila' | 'esmalte' | 'ferramenta' | 'peca' | 'equipamento' | 'forno';
  description: string;
}

export interface Review {
  id: string;
  establishmentId: string;
  userName: string;
  rating: number;
  comment: string;
  date: string;
  reply?: string;
}

export interface Establishment {
  id: string;
  name: string;
  category: Category;
  specialties: Specialty[];
  services: string[]; // Serviços extras (ex: "Serviço de Queima", "Venda de Argilas", "Torno Livre", "Aulas Regulares")
  privacy: PrivacyLevel;
  address: string;
  neighborhood: string;
  city: string;
  state: string;
  coordinates: [number, number]; // [latitude, longitude]
  description: string;
  longDescription?: string;
  instagram: string;
  whatsapp: string;
  website?: string;
  email?: string;
  phone?: string;
  photo: string;
  gallery?: string[];
  video?: string;
  logo?: string;
  cover?: string;
  isPremium: boolean;
  planTier?: PlanTier; // 'gratuito' | 'atelie' | 'estudio' | 'institucional'
  claimed: boolean;
  ownerId?: string;
  rating: number;
  reviewsCount: number;
  hours?: string;
  events?: CeramicEvent[];
  products?: Product[];
  viewsCount?: number;
  clicksWhatsApp?: number;
  clicksRoute?: number;
  geocodingStatus?: 'valid' | 'pending_review' | 'failed';
  originalAddress?: string;
  benefitId?: string;
  benefitConcession?: BenefitConcession;
}

export type PlanTier = 'gratuito' | 'atelie' | 'estudio' | 'institucional';

export interface PlanConfig {
  id: PlanTier;
  name: string;
  price: number;
  period: string;
  features: string[];
  maxPhotos: number;
  maxVideos: number;
  hasSearchProminence: boolean;
  hasMapHighlight: boolean;
  hasHomeHighlight: boolean;
}

export interface SuggestedSpace {
  id: string;
  name: string;
  category: Category;
  city: string;
  state: string;
  neighborhood: string;
  contact: string;
  specialties: string;
  suggestedBy: string;
  date: string;
  invitedStatus: 'pending' | 'invited' | 'registered';
}

export interface DuplicateReviewItem {
  id: string;
  name: string;
  city: string;
  state: string;
  contact: string;
  existingId: string;
  status: 'pending_review' | 'approved_as_distinct' | 'rejected_as_duplicate';
}

export interface SyncRow {
  id: string;
  timestamp: string;
  name: string;
  category: Category;
  state: string;
  city: string;
  address: string;
  neighborhood: string;
  contact: string; // Instagram ou WhatsApp
  specialties: string; // Separadas por vírgula
  status: 'pending' | 'synced' | 'duplicate';
  privacy?: PrivacyLevel;
  description?: string;
  photo?: string;
}

export interface SyncLog {
  id: string;
  timestamp: string;
  action: string;
  recordsSynced: number;
  recordsIgnored: number;
  operator: string;
}

export interface IntegrationConfig {
  url: string;
  spreadsheetId: string;
  sheetName: string;
  syncInterval: number; // in seconds
  syncMethod: 'automatic' | 'manual';
  status: 'active' | 'inactive';
}

// === NEW STRUCTURES FOR GEOLOCATION AND BENEFITS COMPLEMENTARY MODULES ===

export interface BenefitProgram {
  id: string;
  name: string;
  description: string;
  objective: string;
  category: string; // e.g. "🎓 Bolsa Institucional", "🏛️ Isenção Cultural", etc.
  type: 'exemption' | 'percentage' | 'fixed' | 'temp_free' | 'perm_free' | 'upgrade' | 'sponsored' | 'covenant' | 'custom';
  discountPercent?: number;
  discountValue?: number;
  planTier: PlanTier;
  expirationDate?: string;
  maxBeneficiaries?: number;
  eligibilityCriteria: string;
  renowable: boolean;
  notes?: string;
  sponsor?: string;
  covenantPartner?: string;
}

export interface BenefitConcession {
  id: string;
  programId: string;
  establishmentId: string;
  status: 'pending' | 'approved' | 'rejected';
  dateRequested: string;
  dateApproved?: string;
  concessionMethod: 'manual' | 'automatic' | 'user_request' | 'invite' | 'covenant_import';
  documentsSubmitted?: string[];
  justification?: string;
  notes?: string;
}

export interface BenefitAuditLog {
  id: string;
  adminEmail: string;
  timestamp: string;
  programName: string;
  action: string; // 'Criação', 'Aprovação', 'Upgrade', 'Cancelamento'
  rationale: string;
  targetProfileName: string;
}

export interface GeocodingReviewItem {
  id: string;
  establishmentId: string;
  name: string;
  rawAddress: string;
  currentCoords: [number, number];
  city: string;
  state: string;
  neighborhood: string;
  errorReason: 'out_of_bounds' | 'wrong_state' | 'ocean' | 'no_coords' | 'divergent_city';
}

// === NEW SECURITY, RBAC & HOMOLOGATION SYSTEM TYPES ===

export type UserRole = 'visitor' | 'owner' | 'moderator' | 'coordinator' | 'admin' | 'super_admin';

export interface UserSession {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  confirmedEmail: boolean;
  confirmedPhone: boolean;
  document?: string; // CPF or CNPJ
  instagram?: string;
  establishmentId?: string; // Connected establishment if owner
}

export type HomologationStatus =
  | 'Perfil Importado'
  | 'Cadastro em Análise'
  | 'Aguardando Complementação'
  | 'Homologado'
  | 'Perfil Oficial'
  | 'Perfil Premium'
  | 'Perfil Institucional'
  | 'Suspenso'
  | 'Arquivado'
  | 'Rejeitado';

export type ValidationStepStatus = 'valid' | 'pending' | 'failed' | 'not_applicable';

export interface HomologationChecklist {
  emailConfirmed: ValidationStepStatus;
  phoneConfirmed: ValidationStepStatus;
  documentValid: ValidationStepStatus;
  instagramCoherence: ValidationStepStatus;
  geolocValid: ValidationStepStatus;
  noDuplicity: ValidationStepStatus;
}

export interface TeamMember {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  permissions: string[];
  status: 'active' | 'inactive';
  history: string[];
}

export interface AuditLog {
  id: string;
  operatorEmail: string;
  timestamp: string;
  action: string;
  targetId?: string;
  targetName?: string;
  previousValue?: string;
  newValue?: string;
  notes?: string;
  ip?: string;
}

// Add our additional fields to Establishment using an inline union type
export interface EstablishmentWithHomologation extends Establishment {
  homologationStatus?: HomologationStatus;
  homologationChecklist?: HomologationChecklist;
  responsibleName?: string;
  origin?: 'Google Forms' | 'aplicativo' | 'importação' | 'outro';
  notes?: string;
  instagramAccount?: string;
  documentCPF_CNPJ?: string;
}



