import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';

// Import initial mock data and structures
import { 
  INITIAL_ESTABLISHMENTS, MOCK_SHEETS_DATA, INITIAL_SYNC_LOGS, DEFAULT_PLANS, INITIAL_SUGGESTED_SPACES, DEFAULT_INTEGRATION_CONFIG 
} from './src/data';
import { 
  EstablishmentWithHomologation, SyncRow, SyncLog, PlanConfig, SuggestedSpace, IntegrationConfig, UserSession, AuditLog, TeamMember, Category
} from './src/types';

const PORT = 3000;
const DB_FILE = path.join(process.cwd(), 'server_db.json');

// --- GEOLOCATION DATABASES & HELPERS ---
const GEOCONTEXT_DB_LOCAL: Record<string, [number, number]> = {
  'são paulo, são paulo': [-23.55052, -46.633308],
  'são paulo': [-23.55052, -46.633308],
  'cunha, são paulo': [-22.9284, -44.8719],
  'porto ferreira, são paulo': [-21.8547, -47.4786],
  'distrito federal': [-15.7801, -47.9292],
  'minas novas, minas gerais': [-17.2185, -42.5912],
  'porto alegre, rio grande do sul': [-30.0346, -51.2177],
  'soure, pará': [-0.7188, -48.5135],
  'salvador, bahia': [-12.9714, -38.5014],
  'tiradentes, minas gerais': [-21.1107, -44.1784],
  'paraty, rio de janeiro': [-23.2178, -44.7131],
  'curitiba, paraná': [-25.4284, -49.2733],
  'florianópolis, santa catarina': [-27.5954, -48.5480],
  'fortaleza, ceará': [-3.7172, -38.5284],
  'belo horizonte, minas gerais': [-19.9173, -43.9345],
  'rio de janeiro, rio de janeiro': [-22.9068, -43.1729]
};

const STATE_CENTERS_LOCAL: Record<string, [number, number]> = {
  'Distrito Federal': [-15.7801, -47.9292],
  'São Paulo': [-23.5505, -46.6333],
  'Rio de Janeiro': [-22.9068, -43.1729],
  'Minas Gerais': [-19.9173, -43.9345],
  'Rio Grande do Sul': [-30.0346, -51.2177],
  'Pará': [-1.4558, -48.4902],
  'Bahia': [-12.9714, -38.5014],
  'Ceará': [-3.7172, -38.5284],
  'Pernambuco': [-8.05428, -34.8813],
  'Paraná': [-25.4284, -49.2733],
  'Santa Catarina': [-27.5954, -48.5480],
  'Goiás': [-16.6869, -49.2648],
};

const DF_RA_COORDINATES: Record<string, [number, number]> = {
  'Plano Piloto': [-15.7938, -47.8828],
  'Asa Norte': [-15.7635, -47.8858],
  'Asa Sul': [-15.8119, -47.8988],
  'Lago Sul': [-15.8385, -47.8542],
  'Lago Norte': [-15.7335, -47.8423],
  'Jardim Botânico': [-15.8902, -47.7885],
  'Cruzeiro': [-15.7900, -47.9400],
  'Sudoeste': [-15.7985, -47.9250],
  'Octogonal': [-15.7985, -47.9250],
  'Guará': [-15.8143, -47.9806],
  'Águas Claras': [-15.8398, -48.0264],
  'Taguatinga': [-15.8336, -48.0569],
  'Ceilândia': [-15.8170, -48.1160],
  'Samambaia': [-15.8770, -48.0860],
  'Sobradinho': [-15.6515, -47.7915],
  'Sobradinho II': [-15.6315, -47.7915],
  'Planaltina': [-15.6180, -47.6600],
  'Paranoá': [-15.7720, -47.7780],
  'São Sebastião': [-15.9030, -47.7730],
  'Park Way': [-15.8820, -47.9650],
  'Vicente Pires': [-15.8080, -48.0260],
  'Arniqueira': [-15.8650, -48.0250],
  'Núcleo Bandeirante': [-15.8730, -47.9690],
  'Riacho Fundo': [-15.8810, -48.0160],
  'Riacho Fundo II': [-15.8950, -48.0430],
  'Candangolândia': [-15.8580, -47.9500],
  'Varjão': [-15.7310, -47.8760],
  'Fercal': [-15.5920, -47.8680],
  'SCIA': [-15.7830, -47.9800],
  'SIA': [-15.7920, -47.9540],
  'Itapoã': [-15.7480, -47.7420],
  'Sol Nascente': [-15.8230, -48.1390],
  'Pôr do Sol': [-15.8330, -48.1390],
  'Água Quente': [-15.9910, -48.1110],
  'Arapoanga': [-15.6020, -47.6980],
};

function parseCSV(text: string): string[][] {
  const lines: string[][] = [];
  let row: string[] = [];
  let inQuotes = false;
  let cell = '';

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          cell += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cell += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        row.push(cell.trim());
        cell = '';
      } else if (char === '\n' || char === '\r') {
        if (char === '\r' && nextChar === '\n') {
          i++;
        }
        row.push(cell.trim());
        lines.push(row);
        row = [];
        cell = '';
      } else {
        cell += char;
      }
    }
  }

  if (cell || row.length > 0) {
    row.push(cell.trim());
    lines.push(row);
  }

  return lines.filter(r => r.length > 0 && r.some(c => c !== ''));
}

function titleCase(str: string): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .map(w => {
      if (['de', 'do', 'da', 'e', 'o', 'em'].includes(w)) return w;
      return w.charAt(0).toUpperCase() + w.slice(1);
    })
    .join(' ');
}

function parseLocationText(raw: string): { city: string; state: string; neighborhood: string } {
  const str = (raw || '').trim();
  let city = 'São Paulo';
  let state = 'SP';
  let neighborhood = 'Centro';

  if (!str) return { city, state, neighborhood };

  const parts = str.split(/[-.,|]/).map(p => p.trim()).filter(Boolean);

  const stateMap: Record<string, string> = {
    'sao paulo': 'SP', 'são paulo': 'SP', 'sp': 'SP',
    'rio de janeiro': 'RJ', 'rj': 'RJ',
    'minas gerais': 'MG', 'mg': 'MG',
    'bahia': 'BA', 'ba': 'BA',
    'rio grande do sul': 'RS', 'rs': 'RS',
    'pernambuco': 'PE', 'pe': 'PE',
    'parana': 'PR', 'paraná': 'PR', 'pr': 'PR',
    'santa catarina': 'SC', 'sc': 'SC',
    'espirito santo': 'ES', 'espírito santo': 'ES', 'es': 'ES',
    'ceara': 'CE', 'ceará': 'CE', 'ce': 'CE',
    'goias': 'GO', 'goiás': 'GO', 'go': 'GO',
    'distrito federal': 'DF', 'df': 'DF',
    'para': 'PA', 'pará': 'PA', 'pa': 'PA',
    'alagoas': 'AL', 'al': 'AL',
    'amazonas': 'AM', 'am': 'AM',
    'paraiba': 'PB', 'paraíba': 'PB', 'pb': 'PB',
    'rio grande do norte': 'RN', 'rn': 'RN',
    'sergipe': 'SE', 'se': 'SE',
    'maranhao': 'MA', 'maranhão': 'MA', 'ma': 'MA',
    'piaui': 'PI', 'piauí': 'PI', 'pi': 'PI',
    'tocantins': 'TO', 'to': 'TO',
    'mato grosso': 'MT', 'mt': 'MT',
    'mato grosso do sul': 'MS', 'ms': 'MS',
    'rondonia': 'RO', 'rondônia': 'RO', 'ro': 'RO',
    'acre': 'AC', 'ac': 'AC',
    'amapa': 'AP', 'amapá': 'AP', 'ap': 'AP',
    'roraima': 'RR', 'rr': 'RR'
  };

  if (parts.length > 0) {
    let foundState = '';
    let foundCity = '';
    let foundNeighborhood = '';

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const partLower = part.toLowerCase();

      if (stateMap[partLower]) {
        foundState = stateMap[partLower];
      } else if (partLower.length === 2 && /^[a-z]{2}$/i.test(partLower)) {
        foundState = partLower.toUpperCase();
      } else if (partLower.includes('bairro') || partLower === 'centro' || (i === parts.length - 1 && parts.length > 2)) {
        foundNeighborhood = part.replace(/^bairro\s+/i, '');
      } else {
        if (!foundCity) {
          foundCity = part;
        } else if (!foundNeighborhood) {
          foundNeighborhood = part;
        }
      }
    }

    if (foundCity) city = foundCity;
    if (foundState) state = foundState;
    if (foundNeighborhood) neighborhood = foundNeighborhood;

    if (!foundState) {
      for (const [key, val] of Object.entries(stateMap)) {
        if (str.toLowerCase().includes(key)) {
          state = val;
          break;
        }
      }
    }
  }

  return { city, state, neighborhood };
}

function normalizeStateName(state: string): string {
  const s = state.trim().toLowerCase();
  if (['df', 'distrito federal', 'distrito fed.', 'federal district', 'brasília-df', 'brasilia-df', 'brasília df'].includes(s)) {
    return 'Distrito Federal';
  }
  if (['sp', 'são paulo', 'sao paulo', 's. paulo', 'estado de são paulo'].includes(s)) {
    return 'São Paulo';
  }
  if (['rj', 'rio de janeiro', 'rio', 'estado do rio de janeiro'].includes(s)) {
    return 'Rio de Janeiro';
  }
  if (['mg', 'minas gerais', 'minas', 'estado de minas gerais'].includes(s)) {
    return 'Minas Gerais';
  }
  if (['rs', 'rio grande do sul', 'rg do sul', 'rio grande sul'].includes(s)) {
    return 'Rio Grande do Sul';
  }
  if (['pa', 'pará', 'para', 'estado do pará'].includes(s)) {
    return 'Pará';
  }
  if (['ba', 'bahia', 'ba'].includes(s)) {
    return 'Bahia';
  }
  if (['ce', 'ceará', 'ceara', 'ce'].includes(s)) {
    return 'Ceará';
  }
  if (['pr', 'paraná', 'parana', 'pr'].includes(s)) {
    return 'Paraná';
  }
  if (['sc', 'santa catarina', 'sc'].includes(s)) {
    return 'Santa Catarina';
  }
  if (['pe', 'pernambuco', 'pe'].includes(s)) {
    return 'Pernambuco';
  }
  if (['go', 'goiás', 'goias', 'go'].includes(s)) {
    return 'Goiás';
  }

  if (state.length === 2) {
    return state.toUpperCase();
  }
  return state.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
}

function detectDFRegiaoAdministrativa(address: string): string | null {
  const fullText = address.toLowerCase();
  const DF_REGIOES_ADMINISTRATIVAS = [
    'Plano Piloto', 'Asa Norte', 'Asa Sul', 'Lago Sul', 'Lago Norte', 'Jardim Botânico',
    'Cruzeiro', 'Sudoeste', 'Octogonal', 'Guará', 'Águas Claras', 'Taguatinga', 'Ceilândia',
    'Samambaia', 'Sobradinho', 'Sobradinho II', 'Planaltina', 'Paranoá', 'São Sebastião',
    'Park Way', 'Vicente Pires', 'Arniqueira', 'Núcleo Bandeirante', 'Riacho Fundo',
    'Riacho Fundo II', 'Candangolândia', 'Varjão', 'Fercal', 'SCIA', 'SIA', 'Itapoã',
    'Sol Nascente', 'Pôr do Sol', 'Água Quente', 'Arapoanga'
  ];

  for (const ra of DF_REGIOES_ADMINISTRATIVAS) {
    if (fullText.includes(ra.toLowerCase())) {
      return ra;
    }
  }

  if (fullText.includes('asa sul') || fullText.includes('cls') || fullText.includes('sqs')) return 'Asa Sul';
  if (fullText.includes('asa norte') || fullText.includes('cln') || fullText.includes('sqn')) return 'Asa Norte';
  if (fullText.includes('lago sul') || fullText.includes('shis') || fullText.includes('qil')) return 'Lago Sul';
  if (fullText.includes('lago norte') || fullText.includes('shin') || fullText.includes('qin')) return 'Lago Norte';
  if (fullText.includes('sudoeste') || fullText.includes('ccsw') || fullText.includes('qmsw')) return 'Sudoeste';
  if (fullText.includes('octogonal') || fullText.includes('aos')) return 'Octogonal';
  if (fullText.includes('cruzeiro') || fullText.includes('shces')) return 'Cruzeiro';

  return null;
}

// Interface for DB file
interface ServerDatabase {
  establishments: EstablishmentWithHomologation[];
  auditLogs: AuditLog[];
  sheetRows: SyncRow[];
  syncLogs: SyncLog[];
  plans: PlanConfig[];
  suggestedSpaces: SuggestedSpace[];
  teamMembers: TeamMember[];
  integrationConfig: IntegrationConfig;
}

// Helper to clean, filter, and deduplicate establishments
function cleanDatabaseAndDeduplicate(establishments: EstablishmentWithHomologation[]): EstablishmentWithHomologation[] {
  // Keep only establishments that are from Google Forms
  const googleFormsEsts = establishments.filter(e => e.origin === 'Google Forms');

  const seenNamesAndCities = new Set<string>();
  const seenInstagrams = new Set<string>();
  const seenWhatsapps = new Set<string>();
  const uniqueEsts: EstablishmentWithHomologation[] = [];

  for (const est of googleFormsEsts) {
    const normName = est.name.toLowerCase().replace(/\s+/g, '').trim();
    const normCity = est.city.toLowerCase().trim();
    const normState = est.state.toLowerCase().trim();
    const nameCityKey = `${normName}|${normCity}|${normState}`;

    const normInsta = est.instagram ? est.instagram.toLowerCase().replace(/[@\s]/g, '').trim() : '';
    const normPhone = est.whatsapp ? est.whatsapp.replace(/\D/g, '').trim() : '';

    let isDuplicate = false;

    if (seenNamesAndCities.has(nameCityKey)) {
      isDuplicate = true;
    }
    if (normInsta && seenInstagrams.has(normInsta)) {
      isDuplicate = true;
    }
    if (normPhone && seenWhatsapps.has(normPhone)) {
      isDuplicate = true;
    }

    if (!isDuplicate) {
      uniqueEsts.push(est);
      seenNamesAndCities.add(nameCityKey);
      if (normInsta) seenInstagrams.add(normInsta);
      if (normPhone) seenWhatsapps.add(normPhone);
    } else {
      console.log(`[Deduplicator] Removido ateliê duplicado no carregamento: ${est.name} em ${est.city}-${est.state}`);
    }
  }

  return uniqueEsts;
}

// Ensure database file exists or seed it
function loadDatabase(): ServerDatabase {
  if (fs.existsSync(DB_FILE)) {
    try {
      const content = fs.readFileSync(DB_FILE, 'utf-8');
      const dbParsed = JSON.parse(content);
      // Ensure we immediately scrub duplicates and keep only Google Forms "divulgando" entries
      dbParsed.establishments = cleanDatabaseAndDeduplicate(dbParsed.establishments);
      saveDatabase(dbParsed);
      return dbParsed;
    } catch (e) {
      console.error('Error reading database file, reseeding...', e);
    }
  }

  // Create initial seeded state
  const initialDb: ServerDatabase = {
    establishments: [], // Start with empty so we only populate from Google Forms sync!
    auditLogs: [
      {
        id: 'aud_init',
        operatorEmail: 'samirarabello.backup@gmail.com',
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
        action: 'Inicialização da Plataforma de Homologação Segura',
        notes: 'Módulo de auditoria perpétuo configurado e iniciado no backend.',
        ip: '127.0.0.1'
      }
    ],
    sheetRows: MOCK_SHEETS_DATA,
    syncLogs: INITIAL_SYNC_LOGS,
    plans: DEFAULT_PLANS,
    suggestedSpaces: INITIAL_SUGGESTED_SPACES,
    teamMembers: [
      {
        id: 'tm_samira',
        email: 'samirarabello.backup@gmail.com',
        name: 'Samira Rabello',
        role: 'super_admin',
        permissions: ['all'],
        status: 'active',
        history: ['Fundadora do CeraMapa.']
      },
      {
        id: 'tm_mod1',
        email: 'moderador.mapa@gmail.com',
        name: 'Clara Nunes',
        role: 'moderator',
        permissions: ['review_claims', 'review_geocoding'],
        status: 'active',
        history: ['Convidada por Samira Rabello.']
      }
    ],
    integrationConfig: DEFAULT_INTEGRATION_CONFIG
  };

  saveDatabase(initialDb);
  return initialDb;
}

function saveDatabase(db: ServerDatabase) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
  } catch (e) {
    console.error('Failed to save database file:', e);
  }
}

async function startServer() {
  const app = express();
  app.use(express.json());

  // Load database
  const db = loadDatabase();

  // --- AUTOMATIC GOOGLE SHEETS BACKGROUND SYNC ENG ---
  async function syncWithGoogleSheetsInternal() {
    const spreadsheetId = db.integrationConfig?.spreadsheetId || '1mUr3cwLDMe5DIufp2n5zH8S3955Z58A6lJqq1o0ULYs';
    const sheetName = db.integrationConfig?.sheetName || 'Respostas do formulário 1';
    console.log(`[AutoSync] Sincronizando planilha: ${spreadsheetId} - ${sheetName}`);

    try {
      const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`;
      const res = await fetch(url);
      if (!res.ok) {
        const errMsg = `Erro HTTP ao buscar planilha: ${res.status} - ${res.statusText}`;
        console.error(`[AutoSync] ${errMsg}`);
        db.syncLogs.unshift({
          id: `log_err_${Date.now()}`,
          timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
          action: `Erro de Sincronização: ${errMsg}`,
          recordsSynced: 0,
          recordsIgnored: 0,
          operator: 'Sincronizador Automático'
        });
        saveDatabase(db);
        return;
      }
      const csvText = await res.text();
      const rows = parseCSV(csvText);
      if (rows.length <= 1) {
        console.log('[AutoSync] Planilha vazia ou apenas cabeçalhos.');
        return;
      }

      const dataRows = rows.slice(1);
      
      // Store IDs of establishments matched/synced during this run to detect deletions later
      const activeGoogleFormEstIds: string[] = [];
      
      let imported = 0;
      let updated = 0;
      let duplicateCount = 0;
      let ignoredCount = 0;
      let geocodingErrors = 0;

      for (let i = 0; i < dataRows.length; i++) {
        const cols = dataRows[i];
        if (cols.length < 5) continue;

        // cols[3] is "Você fazendo uma indicação ou divulgação" (Intent)
        const intent = (cols[3] || '').trim();
        
        // STRICT RULE: Only import "Divulgando meu espaço" / "Divulgando - minha empresa"
        const isMySpace = intent.toLowerCase().includes('divulgando');

        if (!isMySpace) {
          ignoredCount++;
          continue;
        }

        // cols[4] is the Establishment Name
        const nameRaw = (cols[4] || '').trim();
        if (!nameRaw) {
          ignoredCount++;
          continue;
        }

        // cols[7] is State, cols[8] is City, cols[9] is Neighborhood / RA
        const stateRaw = (cols[7] || '').trim();
        const cityRaw = (cols[8] || '').trim();
        const neighborhoodRaw = (cols[9] || '').trim();
        const instagramRaw = (cols[10] || '').trim();
        const whatsappRaw = (cols[11] || '').trim();
        const websiteRaw = (cols[12] || '').trim();

        // 1. DATA TREATMENT LAYER (CAMADA DE PROCESSAMENTO)
        // Clean, replace multiple spaces and trim
        let cleanName = nameRaw.replace(/\s+/g, ' ').trim();
        cleanName = titleCase(cleanName);

        // Parse and standardize location
        let cleanState = normalizeStateName(stateRaw);
        let cleanCity = cleanState === 'Distrito Federal' ? 'Brasília' : titleCase(cityRaw.trim());
        let cleanNeighborhood = titleCase(neighborhoodRaw.trim());

        // Standardize Instagram (remove spaces, ensure starting with @)
        let cleanInstagram = instagramRaw.replace(/\s+/g, '').trim();
        if (cleanInstagram && !cleanInstagram.startsWith('@')) {
          cleanInstagram = '@' + cleanInstagram;
        }

        // Standardize WhatsApp (digits only)
        let cleanWhatsapp = whatsappRaw.replace(/\D/g, '').trim();

        // Standardize Specialties from spreadsheet columns
        // cols[13] is Fornecedor details, cols[18] is Prestador details, cols[23], [24] is Ateliê details, cols[25] is description
        const specialtiesCol = [cols[13], cols[18], cols[23], cols[24], cols[25]].filter(Boolean).join(', ').toLowerCase();
        let cleanSpecialtiesVal: string[] = [];
        // Clean checkbox symbols and separate
        const specParts = specialtiesCol.replace(/[☐☒☑]/g, '').split(/[,\n]/);
        for (let part of specParts) {
          part = part.trim();
          if (part && part !== 'pular. não se enquadra nesta categoria' && part !== 'não se enquadra nesta categoria' && part.length > 2) {
            cleanSpecialtiesVal.push(titleCase(part));
          }
        }
        if (cleanSpecialtiesVal.length === 0) {
          cleanSpecialtiesVal = ['Modelagem Manual', 'Alta Temperatura'];
        }

        // Standardize Categories based on column 2 ("O que você está cadastrando?")
        let detectedCategory: Category = 'Ateliê';
        const typeRaw = (cols[2] || '').toLowerCase();
        if (typeRaw.includes('fornecedor') || typeRaw.includes('material') || typeRaw.includes('insumo')) {
          detectedCategory = 'Fornecedor';
        } else if (typeRaw.includes('prestador') || typeRaw.includes('serviço')) {
          detectedCategory = 'Ceramista';
        } else if (typeRaw.includes('escola') || specialtiesCol.includes('escola') || specialtiesCol.includes('curso')) {
          detectedCategory = 'Ateliê Escola';
        } else {
          detectedCategory = 'Ateliê';
        }

        // 2. GEOCODING AND DF HANDLING (DISTRITO FEDERAL SPECIFIC LOGIC)
        let coordinates: [number, number] = [-23.55052, -46.633308]; // fallback SP
        let geocodingStatus: 'valid' | 'pending_review' | 'failed' = 'pending_review';

        const combinedAddress = `${cleanNeighborhood}, ${cleanCity} - ${cleanState}`;
        if (cleanState === 'Distrito Federal') {
          const ra = detectDFRegiaoAdministrativa(combinedAddress) || 'Plano Piloto';
          if (ra && DF_RA_COORDINATES[ra]) {
            coordinates = DF_RA_COORDINATES[ra];
            geocodingStatus = 'valid';
            cleanNeighborhood = ra;
          } else {
            coordinates = [-15.7801, -47.9292]; // Center of DF
            geocodingStatus = 'valid';
          }
        } else {
          const searchQuery = `${cleanCity}, ${cleanState}`.toLowerCase();
          if (GEOCONTEXT_DB_LOCAL[searchQuery]) {
            coordinates = GEOCONTEXT_DB_LOCAL[searchQuery];
            geocodingStatus = 'valid';
          } else if (STATE_CENTERS_LOCAL[cleanState]) {
            coordinates = STATE_CENTERS_LOCAL[cleanState];
            geocodingStatus = 'valid';
          } else {
            geocodingErrors++;
          }
        }

        // 3. MATCH OR CREATE (DEDUPLICATION AND UPDATE DETECTION)
        // Check if we already have this record in the local database
        const existingEstIndex = db.establishments.findIndex(e => {
          const sameName = e.name.toLowerCase().replace(/\s+/g, '') === cleanName.toLowerCase().replace(/\s+/g, '');
          const sameCity = e.city.toLowerCase().trim() === cleanCity.toLowerCase().trim();
          const sameState = e.state.toLowerCase().trim() === cleanState.toLowerCase().trim();
          const sameInsta = cleanInstagram && e.instagram && e.instagram.toLowerCase().trim() === cleanInstagram.toLowerCase().trim();
          const samePhone = cleanWhatsapp && e.whatsapp && e.whatsapp.replace(/\D/g, '') === cleanWhatsapp;
          
          return (sameName && sameCity && sameState) || sameInsta || (sameName && samePhone);
        });

        if (existingEstIndex !== -1) {
          // Alteração de Registro existente (Detectar Alterações)
          const existing = db.establishments[existingEstIndex];
          
          // Update details from sheet
          existing.name = cleanName;
          existing.category = detectedCategory;
          existing.specialties = cleanSpecialtiesVal as any;
          existing.instagram = cleanInstagram;
          existing.whatsapp = cleanWhatsapp;
          existing.city = cleanCity;
          existing.state = cleanState;
          existing.neighborhood = cleanNeighborhood || existing.neighborhood || 'Centro';
          existing.originalAddress = combinedAddress;
          existing.coordinates = coordinates;
          existing.geocodingStatus = geocodingStatus;
          if (websiteRaw) {
            existing.website = websiteRaw.startsWith('http') ? websiteRaw : `https://${websiteRaw}`;
          }
          
          // Ensure it keeps its source attributes
          existing.origin = 'Google Forms';
          
          activeGoogleFormEstIds.push(existing.id);
          updated++;
        } else {
          // Novo Registro (Detectar Novos Registros)
          const newId = `est_auto_${Date.now()}_${i}_${Math.floor(Math.random() * 1000)}`;
          const newEst: EstablishmentWithHomologation = {
            id: newId,
            name: cleanName,
            category: detectedCategory,
            specialties: cleanSpecialtiesVal as any,
            services: [],
            privacy: 'neighborhood', // Bairro e Cidade aproximados por segurança
            address: 'Consulte as redes sociais',
            neighborhood: cleanNeighborhood || 'Centro',
            city: cleanCity,
            state: cleanState,
            coordinates,
            geocodingStatus,
            originalAddress: combinedAddress,
            description: (cols[25] || '').trim() || `Espaço de cerâmica integrado colaborativamente. Localizado em ${cleanCity} - ${cleanState}.`,
            instagram: cleanInstagram,
            whatsapp: cleanWhatsapp,
            website: websiteRaw ? (websiteRaw.startsWith('http') ? websiteRaw : `https://${websiteRaw}`) : undefined,
            photo: 'https://images.unsplash.com/photo-1565192647048-f997ded879f9?auto=format&fit=crop&w=800&q=80',
            isPremium: false,
            claimed: false,
            rating: 4.8,
            reviewsCount: 0,
            homologationStatus: 'Perfil Oficial',
            origin: 'Google Forms',
            team: []
          };
          db.establishments.unshift(newEst);
          activeGoogleFormEstIds.push(newId);
          imported++;
        }
      }

      // 4. DETECT AND REMOVE DELETED RECORDS (REMOVER REGISTROS EXCLUÍDOS E MOCKS ANTIGOS)
      // Any establishment with origin === 'Google Forms' whose ID is NOT in the synced list was deleted from the Sheet!
      // Also filter out any non-Google Forms items (so only clean "divulgando" remains)
      const beforeFilterLength = db.establishments.length;
      db.establishments = db.establishments.filter(e => {
        if (e.origin === 'Google Forms') {
          return activeGoogleFormEstIds.includes(e.id);
        }
        return false; // Keep only genuine Google Forms entries
      });
      const deletedCount = beforeFilterLength - db.establishments.length;

      // Save database if anything has changed
      if (imported > 0 || updated > 0 || deletedCount > 0) {
        saveDatabase(db);
        console.log(`[AutoSync] Concluído: ${imported} importados, ${updated} atualizados, ${deletedCount} excluídos.`);
        
        const logMsg = `Sincronização Concluída: ${imported} novos, ${updated} atualizados, ${deletedCount} excluídos.`;
        const nextLog: SyncLog = {
          id: `log_${Date.now()}`,
          timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
          action: logMsg,
          recordsSynced: imported + updated,
          recordsIgnored: ignoredCount + duplicateCount,
          operator: 'Sincronizador Automático'
        };
        db.syncLogs.unshift(nextLog);
        saveDatabase(db);
      }

      return {
        imported,
        updated,
        deletedCount,
        ignoredCount,
        duplicateCount
      };
    } catch (err: any) {
      console.error('[AutoSync] Erro crítico na sincronização automática:', err);
      db.syncLogs.unshift({
        id: `log_err_${Date.now()}`,
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
        action: `Erro Crítico de Sincronização: ${err?.message || err}`,
        recordsSynced: 0,
        recordsIgnored: 0,
        operator: 'Sincronizador Automático'
      });
      saveDatabase(db);
    }
  }

  // Trigger startup sync
  setTimeout(() => {
    syncWithGoogleSheetsInternal().catch(err => console.error('Error on startup sync:', err));
  }, 1000);

  // Sync every 30 seconds
  setInterval(() => {
    syncWithGoogleSheetsInternal().catch(err => console.error('Error in periodic sync:', err));
  }, 30000);

  // Helper to append audit logs
  function logAction(
    operatorEmail: string,
    action: string,
    notes?: string,
    targetId?: string,
    targetName?: string,
    previousValue?: string,
    newValue?: string
  ) {
    const newLog: AuditLog = {
      id: 'aud_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      operatorEmail,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      action,
      targetId,
      targetName,
      previousValue,
      newValue,
      notes,
      ip: '189.120.45.102'
    };
    db.auditLogs.unshift(newLog);
    saveDatabase(db);
  }

  // --- MIDDLEWARE TO PARSE USER SESSION AND VALIDATE AUTH ---
  function getSession(req: express.Request): UserSession | null {
    const sessionHeader = req.headers['x-user-session'];
    if (!sessionHeader) return null;
    try {
      return JSON.parse(sessionHeader as string);
    } catch {
      return null;
    }
  }

  // --- REUSABLE AUTHORIZATION VERIFICATION FUNCTION ---
  function authorizeChange(
    session: UserSession | null,
    est: EstablishmentWithHomologation,
    allowedFieldsOnly: boolean = false
  ): { authorized: boolean; reason?: string } {
    if (!session) {
      return { authorized: false, reason: 'Usuário não autenticado' };
    }

    // Platform Admins and Super Admins can edit any profile
    if (session.email.toLowerCase() === 'samirarabello.backup@gmail.com') {
      return { authorized: true };
    }

    // If profile does NOT have Owner ID, then only Admins can edit it
    if (!est.ownerId) {
      return { 
        authorized: false, 
        reason: 'Perfil Não Verificado (sem Owner ID). Somente administradores da plataforma podem realizar alterações.' 
      };
    }

    // Check if user is the direct Owner (by ID or Email)
    if (est.ownerId === session.id || est.ownerEmail === session.email) {
      return { authorized: true };
    }

    // Check if user is in the authorized team list
    const teamMember = est.team?.find(t => t.email === session.email && t.status === 'active');
    if (!teamMember) {
      return { 
        authorized: false, 
        reason: 'Usuário não possui vínculo de equipe autorizado com este estabelecimento.' 
      };
    }

    // If team member is Proprietor or Admin, they have full edit access
    if (['proprietario', 'administrador'].includes(teamMember.role)) {
      return { authorized: true };
    }

    // If team member is Editor, they can edit basic fields but not structural ones
    if (teamMember.role === 'editor') {
      if (allowedFieldsOnly) {
        return { authorized: true };
      } else {
        return { 
          authorized: false, 
          reason: 'Acesso Restrito: Editores não podem alterar contatos principais (WhatsApp) ou níveis de privacidade.' 
        };
      }
    }

    // Colaboradores and Financeiros have no edit permissions
    return { 
      authorized: false, 
      reason: `Acesso Negado: Perfil ${teamMember.role.toUpperCase()} não possui permissão de edição.` 
    };
  }

  // --- REUSABLE DATABASE SANITIZER FOR ACCESS SEGREGATION ---
  function sanitizeDbForRole(session: UserSession | null, rawDb: ServerDatabase): Partial<ServerDatabase> {
    const isPlatformAdmin = session && session.email.toLowerCase() === 'samirarabello.backup@gmail.com';
    const isSuperAdmin = session && session.email.toLowerCase() === 'samirarabello.backup@gmail.com';

    if (isPlatformAdmin) {
      return {
        establishments: rawDb.establishments,
        auditLogs: isSuperAdmin ? rawDb.auditLogs : rawDb.auditLogs.map(l => ({ ...l, ip: 'REDACTED' })),
        sheetRows: rawDb.sheetRows,
        syncLogs: rawDb.syncLogs,
        plans: rawDb.plans,
        suggestedSpaces: rawDb.suggestedSpaces,
        teamMembers: rawDb.teamMembers,
        integrationConfig: rawDb.integrationConfig
      };
    }

    if (session) {
      // Authenticated Partner: strip other establishments' sensitive details
      const sanitizedEstablishments = rawDb.establishments.map(est => {
        const isOwnerOrTeam = est.ownerEmail === session.email || 
                             est.ownerId === session.id || 
                             est.claimantEmail === session.email ||
                             est.team?.some(t => t.email === session.email);
        if (isOwnerOrTeam) {
          return est;
        } else {
          const { 
            claimantEmail, claimantName, claimantDocument, claimantPhone, claimantJustification, 
            team, ...publicEst 
          } = est;
          return {
            ...publicEst,
            team: []
          };
        }
      });

      return {
        establishments: sanitizedEstablishments as any,
        plans: rawDb.plans,
        auditLogs: [],
        sheetRows: [],
        syncLogs: [],
        suggestedSpaces: [],
        teamMembers: [],
        integrationConfig: { status: 'inactive', syncMethod: 'manual', syncInterval: 60 } as any
      };
    }

    // Anonymous Public Visitor
    const publicEstablishments = rawDb.establishments.map(est => {
      const { 
        claimantEmail, claimantName, claimantDocument, claimantPhone, claimantJustification, 
        team, ...publicEst 
      } = est;
      return {
        ...publicEst,
        team: []
      };
    });

    return {
      establishments: publicEstablishments as any,
      plans: rawDb.plans,
      auditLogs: [],
      sheetRows: [],
      syncLogs: [],
      suggestedSpaces: [],
      teamMembers: [],
      integrationConfig: { status: 'inactive', syncMethod: 'manual', syncInterval: 60 } as any
    };
  }

  // --- REST API ENDPOINTS ---

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  // Fetch full state (Sanitized based on active environment session)
  app.get('/api/db', (req, res) => {
    const session = getSession(req);
    res.json(sanitizeDbForRole(session, db));
  });

  // Fetch establishments
  app.get('/api/establishments', (req, res) => {
    const session = getSession(req);
    const sanitized = sanitizeDbForRole(session, db);
    res.json(sanitized.establishments);
  });

  // Submit / Update Audit Log
  app.post('/api/audit-logs', (req, res) => {
    const { action, notes, targetId, targetName, previousValue, newValue } = req.body;
    const session = getSession(req);
    const email = session?.email || 'Visitante Anônimo';
    logAction(email, action, notes, targetId, targetName, previousValue, newValue);
    res.json({ success: true });
  });

  // Update establishment details (Protected by owner validation)
  app.put('/api/establishments/:id', (req, res) => {
    const { id } = req.params;
    const updates = req.body;
    const session = getSession(req);

    const estIndex = db.establishments.findIndex(e => e.id === id);
    if (estIndex === -1) {
      res.status(404).json({ error: 'Estabelecimento não encontrado' });
      return;
    }

    const est = db.establishments[estIndex];

    // Determine if updates contain restricted fields (WhatsApp, Privacy, Plan, Owner information, Team, etc.)
    const updatedKeys = Object.keys(updates);
    const restrictedKeys = ['whatsapp', 'privacy', 'planTier', 'isPremium', 'ownerId', 'ownerEmail', 'team', 'homologationStatus', 'homologationChecklist'];
    const hasRestrictedKeys = updatedKeys.some(key => restrictedKeys.includes(key));

    const auth = authorizeChange(session, est, !hasRestrictedKeys);

    if (!auth.authorized) {
      // Log unauthorized attempt to audit database
      const operatorEmail = session?.email || 'Usuário Não Autenticado';
      logAction(
        operatorEmail,
        'Tentativa de Edição Negada (403)',
        `Acesso bloqueado pelo backend: ${auth.reason || 'permissão insuficiente'}.`,
        id,
        est.name
      );
      res.status(403).json({ error: auth.reason || 'Acesso Negado (403)' });
      return;
    }

    // Apply edits safely
    const previousState = JSON.stringify(est);
    db.establishments[estIndex] = {
      ...est,
      ...updates
    };
    const newState = JSON.stringify(db.establishments[estIndex]);

    saveDatabase(db);

    // Audit Log success
    logAction(
      session?.email || 'Sistema',
      'Perfil Atualizado no Backend',
      `Alterações salvas com sucesso para o perfil.`,
      id,
      est.name,
      previousState.substring(0, 300) + '...',
      newState.substring(0, 300) + '...'
    );

    res.json({ success: true, establishment: db.establishments[estIndex] });
  });

  // Add event to establishment (Protected)
  app.post('/api/establishments/:id/events', (req, res) => {
    const { id } = req.params;
    const eventData = req.body;
    const session = getSession(req);

    const estIndex = db.establishments.findIndex(e => e.id === id);
    if (estIndex === -1) {
      res.status(404).json({ error: 'Estabelecimento não encontrado' });
      return;
    }

    const est = db.establishments[estIndex];
    // Check if authorized
    const auth = authorizeChange(session, est, true); // Editors can add events
    if (!auth.authorized) {
      logAction(
        session?.email || 'Anônimo',
        'Cadastro de Evento Negado (403)',
        `Tentativa de adicionar curso bloqueada: ${auth.reason}`,
        id,
        est.name
      );
      res.status(403).json({ error: auth.reason || 'Acesso Negado (403)' });
      return;
    }

    const nextEvent = {
      ...eventData,
      id: `ev_${Date.now()}`,
      establishmentId: id
    };

    if (!db.establishments[estIndex].events) {
      db.establishments[estIndex].events = [];
    }
    db.establishments[estIndex].events!.unshift(nextEvent);
    saveDatabase(db);

    logAction(
      session?.email || 'Sistema',
      'Curso/Evento Publicado',
      `Novo evento cadastrado: "${nextEvent.title}"`,
      id,
      est.name
    );

    res.json({ success: true, establishment: db.establishments[estIndex] });
  });

  // Add product to establishment (Protected)
  app.post('/api/establishments/:id/products', (req, res) => {
    const { id } = req.params;
    const productData = req.body;
    const session = getSession(req);

    const estIndex = db.establishments.findIndex(e => e.id === id);
    if (estIndex === -1) {
      res.status(404).json({ error: 'Estabelecimento não encontrado' });
      return;
    }

    const est = db.establishments[estIndex];
    // Check if authorized
    const auth = authorizeChange(session, est, true); // Editors can add products
    if (!auth.authorized) {
      logAction(
        session?.email || 'Anônimo',
        'Cadastro de Produto Negado (403)',
        `Tentativa de adicionar vitrine bloqueada: ${auth.reason}`,
        id,
        est.name
      );
      res.status(403).json({ error: auth.reason || 'Acesso Negado (403)' });
      return;
    }

    const nextProduct = {
      ...productData,
      id: `p_${Date.now()}`
    };

    if (!db.establishments[estIndex].products) {
      db.establishments[estIndex].products = [];
    }
    db.establishments[estIndex].products!.unshift(nextProduct);
    saveDatabase(db);

    logAction(
      session?.email || 'Sistema',
      'Produto Publicado',
      `Novo produto vitrine: "${nextProduct.name}"`,
      id,
      est.name
    );

    res.json({ success: true, establishment: db.establishments[estIndex] });
  });

  // Claim a profile (Publicly available, but starts checking)
  app.post('/api/establishments/:id/claim', (req, res) => {
    const { id } = req.params;
    const { name, email, document, phone, justification } = req.body;

    const estIndex = db.establishments.findIndex(e => e.id === id);
    if (estIndex === -1) {
      res.status(404).json({ error: 'Estabelecimento não encontrado' });
      return;
    }

    const est = db.establishments[estIndex];
    if (est.ownerId) {
      res.status(400).json({ error: 'Este perfil já possui proprietário homologado.' });
      return;
    }

    db.establishments[estIndex] = {
      ...est,
      claimed: true,
      homologationStatus: 'Perfil em Verificação', // Perfil em Verificação matches standard status
      claimantEmail: email,
      claimantName: name,
      claimantDocument: document,
      claimantPhone: phone,
      claimantJustification: justification
    };

    saveDatabase(db);

    logAction(
      email,
      'Reivindicação de Proprietário Iniciada',
      `O usuário ${name} reivindicou a titularidade. Documento: ${document}. Justificativa: ${justification}`,
      id,
      est.name
    );

    res.json({ success: true, establishment: db.establishments[estIndex] });
  });

  // Admin approves claim (Admin only)
  app.post('/api/establishments/:id/approve-claim', (req, res) => {
    const { id } = req.params;
    const session = getSession(req);

    if (!session || session.email.toLowerCase() !== 'samirarabello.backup@gmail.com') {
      res.status(403).json({ error: 'Permissão administrativa necessária.' });
      return;
    }

    const estIndex = db.establishments.findIndex(e => e.id === id);
    if (estIndex === -1) {
      res.status(404).json({ error: 'Estabelecimento não encontrado' });
      return;
    }

    const est = db.establishments[estIndex];
    const targetEmail = est.claimantEmail || 'samirarabello.backup@gmail.com';
    const targetName = est.claimantName || 'Proprietário';

    // Generate unique Owner ID after official verification
    const generatedOwnerId = 'owner_' + Math.floor(100000 + Math.random() * 900000);
    const initialTeam = [
      {
        id: 'tm_' + Math.floor(100000 + Math.random() * 900000),
        establishmentId: id,
        email: targetEmail,
        name: targetName,
        role: 'proprietario' as const,
        status: 'active' as const,
        permissions: ['all'],
        addedBy: 'Sistema (Homologação)',
        addedAt: new Date().toISOString().replace('T', ' ').substring(0, 19)
      }
    ];

    db.establishments[estIndex] = {
      ...est,
      claimed: true,
      isPremium: true,
      planTier: 'atelie',
      homologationStatus: 'Perfil Oficial Verificado', // Status matches official
      ownerId: generatedOwnerId,
      ownerEmail: targetEmail,
      team: initialTeam,
      ownershipHistory: [
        `Propriedade digital homologada e vinculada a ${targetName} (${targetEmail}) sob Owner ID: ${generatedOwnerId} em ${new Date().toISOString().replace('T', ' ').substring(0, 19)}.`
      ]
    };

    saveDatabase(db);

    logAction(
      session.email,
      'Propriedade Digital Homologada',
      `Reivindicação homologada com sucesso. Proprietário: ${targetName} (${targetEmail}). Owner ID: ${generatedOwnerId} vinculado de forma permanente.`,
      id,
      est.name
    );

    res.json({ success: true, establishment: db.establishments[estIndex] });
  });

  // Admin rejects claim (Admin only)
  app.post('/api/establishments/:id/reject-claim', (req, res) => {
    const { id } = req.params;
    const session = getSession(req);

    if (!session || session.email.toLowerCase() !== 'samirarabello.backup@gmail.com') {
      res.status(403).json({ error: 'Permissão administrativa necessária.' });
      return;
    }

    const estIndex = db.establishments.findIndex(e => e.id === id);
    if (estIndex === -1) {
      res.status(404).json({ error: 'Estabelecimento não encontrado' });
      return;
    }

    const est = db.establishments[estIndex];
    
    // Clean claimant details and reject
    db.establishments[estIndex] = {
      ...est,
      claimed: false,
      homologationStatus: 'Perfil Não Verificado',
      claimantEmail: undefined,
      claimantName: undefined,
      claimantDocument: undefined,
      claimantPhone: undefined,
      claimantJustification: undefined
    };

    saveDatabase(db);

    logAction(
      session.email,
      'Reivindicação Rejeitada',
      `Reivindicação rejeitada pela moderação devido a inconsistências cadastrais. Perfil redefinido para Não Verificado.`,
      id,
      est.name
    );

    res.json({ success: true, establishment: db.establishments[estIndex] });
  });

  // Transfer Ownership (Multi-Factor verification simulator & Audited endpoint)
  app.post('/api/establishments/:id/transfer-ownership', (req, res) => {
    const { id } = req.params;
    const { newOwnerEmail, password, mfaCode, step } = req.body;
    const session = getSession(req);

    const estIndex = db.establishments.findIndex(e => e.id === id);
    if (estIndex === -1) {
      res.status(404).json({ error: 'Estabelecimento não encontrado' });
      return;
    }

    const est = db.establishments[estIndex];

    // Ensure session exists and is the actual proprietor
    if (!session || (est.ownerId !== session.id && est.ownerEmail !== session.email && !['super_admin', 'admin'].includes(session.role))) {
      res.status(403).json({ error: 'Apenas o proprietário oficial (Owner ID) pode transferir a propriedade digital.' });
      return;
    }

    // Step 1: Password authentication check (simulated)
    if (step === 'initiate') {
      if (!newOwnerEmail) {
        res.status(400).json({ error: 'Por favor informe o e-mail do novo proprietário.' });
        return;
      }
      if (!password || password.length < 4) {
        res.status(400).json({ error: 'Senha inválida ou em branco.' });
        return;
      }

      // Start MFA verification
      logAction(
        session.email,
        'Transferência de Propriedade Iniciada (MFA pendente)',
        `Início do processo de transferência irrevogável do estabelecimento para ${newOwnerEmail}. Aguardando código MFA.`,
        id,
        est.name
      );

      res.json({ success: true, step: 'mfa_required', message: 'MFA enviado para o e-mail do proprietário cadastrado.' });
      return;
    }

    // Step 2: MFA Validation & Confirmation
    if (step === 'confirm') {
      if (mfaCode !== '123456') {
        logAction(
          session.email,
          'Falha de Segurança: MFA incorreto',
          `Bloqueio de transferência de propriedade: código MFA inválido informado.`,
          id,
          est.name
        );
        res.status(400).json({ error: 'Código MFA de segurança inválido. Tente novamente com o código simulado 123456.' });
        return;
      }

      // Finalize transfer
      const previousOwnerEmail = est.ownerEmail;
      const previousOwnerId = est.ownerId;
      const generatedOwnerId = 'owner_' + Math.floor(100000 + Math.random() * 900000);

      // Create new proprietor team member
      const cleanTeam = est.team?.filter(t => t.role !== 'proprietario') || [];
      const newProprietor = {
        id: 'tm_' + Math.floor(100000 + Math.random() * 900000),
        establishmentId: id,
        email: newOwnerEmail,
        name: 'Novo Ceramista Proprietário',
        role: 'proprietario' as const,
        status: 'active' as const,
        permissions: ['all'],
        addedBy: 'Processo de Transferência',
        addedAt: new Date().toISOString().replace('T', ' ').substring(0, 19)
      };

      db.establishments[estIndex] = {
        ...est,
        ownerEmail: newOwnerEmail,
        ownerId: generatedOwnerId,
        team: [newProprietor, ...cleanTeam],
        ownershipHistory: [
          ...(est.ownershipHistory || []),
          `Propriedade digital transferida com segurança de ${previousOwnerEmail} (Owner: ${previousOwnerId}) para ${newOwnerEmail} (Novo Owner: ${generatedOwnerId}) em ${new Date().toISOString().replace('T', ' ').substring(0, 19)} sob código MFA verificado.`
        ]
      };

      saveDatabase(db);

      logAction(
        session.email,
        'Transferência de Propriedade Concluída',
        `A propriedade digital de "${est.name}" foi transferida com sucesso para o novo e-mail: ${newOwnerEmail}. Novo Owner ID gerado: ${generatedOwnerId}`,
        id,
        est.name
      );

      res.json({ 
        success: true, 
        message: 'A propriedade digital foi transferida com sucesso!',
        establishment: db.establishments[estIndex]
      });
      return;
    }

    res.status(400).json({ error: 'Passo de transferência inválido.' });
  });

  // Fetch sheet rows (Restricted to logged-in administrative roles)
  app.get('/api/sheet-rows', (req, res) => {
    const session = getSession(req);
    if (!session || session.email.toLowerCase() !== 'samirarabello.backup@gmail.com') {
      logAction(
        session?.email || 'Anônimo',
        'Tentativa Violada: Acesso à API de Planilha Negado (403)',
        'Tentativa não autorizada de ler dados brutos da planilha de sincronização.'
      );
      res.status(403).json({ error: 'Permissão de administrador necessária.' });
      return;
    }
    res.json(db.sheetRows);
  });

  // Fetch admin team members list (Admin only)
  app.get('/api/admin/team-members', (req, res) => {
    const session = getSession(req);
    if (!session || session.email.toLowerCase() !== 'samirarabello.backup@gmail.com') {
      res.status(403).json({ error: 'Acesso negado.' });
      return;
    }
    res.json(db.teamMembers);
  });

  // Add platform team member (Super Administradora only)
  app.post('/api/admin/team-members', (req, res) => {
    const session = getSession(req);
    if (!session || session.email.toLowerCase() !== 'samirarabello.backup@gmail.com') {
      logAction(
        session?.email || 'Anônimo',
        'Invasão de Permissões Negada (403)',
        'Tentativa não autorizada de convidar membro para a equipe corporativa da plataforma.'
      );
      res.status(403).json({ error: 'Apenas a Super Administradora da plataforma pode gerenciar a Equipe da Plataforma.' });
      return;
    }
    const member = req.body;
    db.teamMembers.push(member);
    saveDatabase(db);
    logAction(session.email, 'Membro da Equipe Convidado', `O integrante ${member.name} foi convidado para o cargo de ${member.role.toUpperCase()}.`);
    res.json({ success: true, teamMembers: db.teamMembers });
  });

  // Edit or Suspend platform team member (Super Administradora only)
  app.put('/api/admin/team-members/:id', (req, res) => {
    const session = getSession(req);
    if (!session || session.email.toLowerCase() !== 'samirarabello.backup@gmail.com') {
      res.status(403).json({ error: 'Apenas a Super Administradora pode alterar o status ou cargo de membros de equipe.' });
      return;
    }
    const { id } = req.params;
    const updates = req.body;
    const index = db.teamMembers.findIndex(m => m.id === id);
    if (index !== -1) {
      const prev = JSON.stringify(db.teamMembers[index]);
      db.teamMembers[index] = { ...db.teamMembers[index], ...updates };
      saveDatabase(db);
      logAction(session.email, 'Membro da Equipe Atualizado', `Integrante ${db.teamMembers[index].name} atualizado.`, id, db.teamMembers[index].name, prev, JSON.stringify(db.teamMembers[index]));
    }
    res.json({ success: true, teamMembers: db.teamMembers });
  });

  // Delete platform team member (Super Administradora only)
  app.delete('/api/admin/team-members/:id', (req, res) => {
    const session = getSession(req);
    if (!session || session.email.toLowerCase() !== 'samirarabello.backup@gmail.com') {
      res.status(403).json({ error: 'Apenas a Super Administradora pode remover membros da equipe.' });
      return;
    }
    const { id } = req.params;
    const index = db.teamMembers.findIndex(m => m.id === id);
    if (index !== -1) {
      const name = db.teamMembers[index].name;
      db.teamMembers.splice(index, 1);
      saveDatabase(db);
      logAction(session.email, 'Membro da Equipe Excluído', `O integrante de equipe ${name} foi excluído permanentemente da administração.`);
    }
    res.json({ success: true, teamMembers: db.teamMembers });
  });

  // Create form submission (New row from frontend)
  app.post('/api/sheet-rows', (req, res) => {
    const submission = req.body;

    const isDuplicate = db.establishments.some(
      e => e.name.toLowerCase() === submission.name.toLowerCase() || 
           (e.city.toLowerCase() === submission.city.toLowerCase() && e.address.toLowerCase() === submission.address.toLowerCase())
    );

    const nextRow: SyncRow = {
      ...submission,
      id: `row_${Date.now()}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      status: isDuplicate ? 'duplicate' : 'pending'
    };

    db.sheetRows.unshift(nextRow);
    saveDatabase(db);

    res.json({ success: true, row: nextRow });
  });

  // Sync Google Sheets Rows with Establishments (Triggered on demand, no login/admin auth required for MVP)
  app.post('/api/sync-sheets', async (req, res) => {
    try {
      console.log('[API] Chamada manual de sincronização de planilha recebida.');
      const stats = await syncWithGoogleSheetsInternal();
      res.json({ success: true, ...stats, message: 'Sincronização processada com sucesso via Camada de Tratamento de Dados.' });
    } catch (err: any) {
      console.error('[API] Erro na sincronização manual:', err);
      res.status(500).json({ error: 'Erro ao processar sincronização.', details: err.message });
    }
  });

  // Vite middleware for development or Static Assets for Production
  if (process.env.DISABLE_HMR) {
    console.log('HMR disabled by platform configuration.');
  }

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
