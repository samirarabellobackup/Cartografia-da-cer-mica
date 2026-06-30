// Geocoding, Address Normalization, and Validation Helper for CeraMapa Brasil
import { Establishment, PrivacyLevel } from '../types';

// Standard Equivalences and RA dictionary for Distrito Federal
export interface RaEquivalence {
  id: string;
  source: string;
  target: string;
}

export const DEFAULT_RA_EQUIVALENCES: RaEquivalence[] = [
  { id: 'eq_1', source: 'Asa Sul', target: 'Plano Piloto' },
  { id: 'eq_2', source: 'Asa Norte', target: 'Plano Piloto' },
  { id: 'eq_3', source: 'Jardim Botânico', target: 'Região Administrativa Jardim Botânico' },
  { id: 'eq_4', source: 'Sudoeste', target: 'Região Administrativa Sudoeste/Octogonal' },
  { id: 'eq_5', source: 'Cruzeiro', target: 'Região Administrativa Cruzeiro' },
  { id: 'eq_6', source: 'Guará', target: 'Região Administrativa Guará' },
  { id: 'eq_7', source: 'Taguatinga', target: 'Região Administrativa Taguatinga' },
  { id: 'eq_8', source: 'Águas Claras', target: 'Região Administrativa Águas Claras' },
  { id: 'eq_9', source: 'Lago Sul', target: 'Lago Sul' },
  { id: 'eq_10', source: 'Lago Norte', target: 'Lago Norte' },
  { id: 'eq_11', source: 'Ceilândia', target: 'Região Administrativa Ceilândia' },
  { id: 'eq_12', source: 'Samambaia', target: 'Região Administrativa Samambaia' },
  { id: 'eq_13', source: 'Sobradinho', target: 'Região Administrativa Sobradinho' },
  { id: 'eq_14', source: 'Planaltina', target: 'Região Administrativa Planaltina' },
  { id: 'eq_15', source: 'Vicente Pires', target: 'Região Administrativa Vicente Pires' },
  { id: 'eq_16', source: 'Park Way', target: 'Região Administrativa Park Way' },
];

export const DF_REGIOES_ADMINISTRATIVAS = [
  'Plano Piloto', 'Asa Norte', 'Asa Sul', 'Lago Sul', 'Lago Norte', 'Jardim Botânico',
  'Cruzeiro', 'Sudoeste', 'Octogonal', 'Guará', 'Águas Claras', 'Taguatinga', 'Ceilândia',
  'Samambaia', 'Sobradinho', 'Sobradinho II', 'Planaltina', 'Paranoá', 'São Sebastião',
  'Park Way', 'Vicente Pires', 'Arniqueira', 'Núcleo Bandeirante', 'Riacho Fundo',
  'Riacho Fundo II', 'Candangolândia', 'Varjão', 'Fercal', 'SCIA', 'SIA', 'Itapoã',
  'Sol Nascente', 'Pôr do Sol', 'Água Quente', 'Arapoanga'
];

// Load equivalence dictionary from LocalStorage or fallback to defaults
export function getRaEquivalences(): RaEquivalence[] {
  const saved = localStorage.getItem('ceramapa_ra_equivalences');
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) {
      return DEFAULT_RA_EQUIVALENCES;
    }
  }
  return DEFAULT_RA_EQUIVALENCES;
}

export function saveRaEquivalences(equivalences: RaEquivalence[]) {
  localStorage.setItem('ceramapa_ra_equivalences', JSON.stringify(equivalences));
}

// Bounding boxes for Brazilian States (Rough limits for validation)
export const STATE_BOUNDING_BOXES: { [key: string]: { minLat: number; maxLat: number; minLng: number; maxLng: number } } = {
  'Distrito Federal': { minLat: -16.15, maxLat: -15.45, minLng: -48.35, maxLng: -47.25 },
  'São Paulo': { minLat: -25.5, maxLat: -19.5, minLng: -53.5, maxLng: -44.0 },
  'Rio de Janeiro': { minLat: -23.5, maxLat: -20.5, minLng: -45.0, maxLng: -41.0 },
  'Minas Gerais': { minLat: -23.0, maxLat: -14.0, minLng: -51.5, maxLng: -39.5 },
  'Rio Grande do Sul': { minLat: -34.0, maxLat: -27.0, minLng: -58.0, maxLng: -49.5 },
  'Pará': { minLat: -10.0, maxLat: 3.0, minLng: -59.0, maxLng: -46.0 },
  'Bahia': { minLat: -18.5, maxLat: -8.5, minLng: -46.5, maxLng: -37.0 },
  'Ceará': { minLat: -8.0, maxLat: -2.0, minLng: -41.5, maxLng: -37.0 },
  'Pernambuco': { minLat: -9.5, maxLat: -7.0, minLng: -41.5, maxLng: -34.5 },
  'Paraná': { minLat: -26.8, maxLat: -22.5, minLng: -54.8, maxLng: -48.0 },
  'Santa Catarina': { minLat: -29.5, maxLat: -25.8, minLng: -54.0, maxLng: -48.0 },
  'Goiás': { minLat: -19.5, maxLat: -12.5, minLng: -53.0, maxLng: -45.8 },
};

// Center points for Brazilian States / key areas when address is hidden (Privacy Levels)
export const STATE_CENTERS: { [key: string]: [number, number] } = {
  'Distrito Federal': [-15.7801, -47.9292],
  'São Paulo': [-23.5505, -46.6333],
  'Rio de Janeiro': [-22.9068, -43.1729],
  'Minas Gerais': [-19.9173, -43.9345],
  'Rio Grande do Sul': [-30.0346, -51.2177],
  'Pará': [-1.4558, -48.4902],
  'Bahia': [-12.9714, -38.5014],
  'Ceará': [-3.7172, -38.5284],
};

// ETAPA 1 — NORMALIZAÇÃO DOS DADOS
export function normalizeState(state: string): string {
  const s = state.trim().toLowerCase();
  
  // DF Maps
  if (['df', 'distrito federal', 'distrito fed.', 'federal district', 'distrito fed', 'brasília-df', 'brasilia-df', 'brasilia df', 'brasília df'].includes(s)) {
    return 'Distrito Federal';
  }
  // SP Maps
  if (['sp', 'são paulo', 'sao paulo', 's. paulo', 'sao paul', 'estado de são paulo'].includes(s)) {
    return 'São Paulo';
  }
  // RJ Maps
  if (['rj', 'rio de janeiro', 'rio', 'r. janeiro', 'estado do rio de janeiro'].includes(s)) {
    return 'Rio de Janeiro';
  }
  // MG Maps
  if (['mg', 'minas gerais', 'minas', 'm. gerais', 'estado de minas gerais'].includes(s)) {
    return 'Minas Gerais';
  }
  // RS Maps
  if (['rs', 'rio grande do sul', 'r. g. do sul', 'rg do sul', 'rio grande sul'].includes(s)) {
    return 'Rio Grande do Sul';
  }
  // PA Maps
  if (['pa', 'pará', 'para', 'estado do pará'].includes(s)) {
    return 'Pará';
  }

  // Capitalize full name or leave uppercase if 2 chars
  if (state.length === 2) {
    return state.toUpperCase();
  }
  return state.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
}

export function normalizeCep(cep: string): string {
  const digits = cep.replace(/\D/g, '');
  if (digits.length === 8) {
    return `${digits.slice(0, 5)}-${digits.slice(5)}`;
  }
  return cep.trim();
}

export function normalizeString(str: string): string {
  if (!str) return '';
  return str
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .map(w => {
      if (w.toLowerCase() === 'de' || w.toLowerCase() === 'do' || w.toLowerCase() === 'da' || w.toLowerCase() === 'e' || w.toLowerCase() === 'o') return w.toLowerCase();
      return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
    })
    .join(' ');
}

export interface NormalizedLocation {
  address: string;
  neighborhood: string;
  city: string;
  state: string;
  cep: string;
}

export function normalizeLocationData(
  address: string,
  neighborhood: string,
  city: string,
  state: string,
  cep: string = ''
): NormalizedLocation {
  const normalizedState = normalizeState(state);
  const normalizedCity = normalizedState === 'Distrito Federal' ? 'Brasília' : normalizeString(city);
  const normalizedNeighborhood = normalizeString(neighborhood);
  const normalizedAddress = address.trim().replace(/\s+/g, ' ');
  const normalizedCepVal = normalizeCep(cep);

  return {
    address: normalizedAddress,
    neighborhood: normalizedNeighborhood,
    city: normalizedCity,
    state: normalizedState,
    cep: normalizedCepVal
  };
}

// ETAPA 4 — VALIDAÇÃO DAS COORDENADAS
export function validateCoordinates(lat: number, lng: number, state: string): { isValid: boolean; reason?: string } {
  // Check if coordinates point to the ocean (lat/lng around 0,0) or outside Brazil limits
  // Brazil is roughly lat [5.3, -33.8], lng [-74.0, -34.7]
  if (lat > 6 || lat < -34 || lng > -34 || lng < -75) {
    return { isValid: false, reason: 'Coordenada fora do limite nacional ou no oceano' };
  }

  // Check if point matches the state bounding box
  const bbox = STATE_BOUNDING_BOXES[state];
  if (bbox) {
    if (lat < bbox.minLat || lat > bbox.maxLat || lng < bbox.minLng || lng > bbox.maxLng) {
      return { isValid: false, reason: `Coordenada divergente: o ponto não pertence ao estado informado (${state})` };
    }
  }

  return { isValid: true };
}

// Simulated Geocoder database based on Brazil coordinates
// Allows us to do real deterministic lookups
export const GEOCONTEXT_DB: { [search: string]: [number, number] } = {
  // São Paulo
  'rua harmonia, 1250, vila madalena, são paulo, são paulo': [-23.5532, -46.6891],
  '05435-001': [-23.5532, -46.6891],
  'vila madalena, são paulo, são paulo': [-23.5540, -46.6882],
  'são paulo, são paulo': [-23.55052, -46.633308],
  'são paulo': [-23.55052, -46.633308],

  // Cunha
  'rodovia cunha-paraty, km 50, vila rica, cunha, são paulo': [-23.0768, -44.9542],
  '12090-000': [-22.9284, -44.8719],
  'vila rica, cunha, são paulo': [-23.0780, -44.9550],
  'cunha, são paulo': [-22.9284, -44.8719],

  // Porto Ferreira
  'av. industrial, 400, centro, porto ferreira, são paulo': [-21.8547, -47.4786],
  '13660-000': [-21.8547, -47.4786],
  'centro, porto ferreira, são paulo': [-21.8550, -47.4790],
  'porto ferreira, são paulo': [-21.8547, -47.4786],

  // Brasília & DF - Special treatment simulations
  'cln 115 bloco c, plano piloto, brasília, distrito federal': [-15.7538, -47.8827],
  'cls 312 bloco b, plano piloto, brasília, distrito federal': [-15.8085, -47.8992],
  '70770-530': [-15.7538, -47.8827],
  '70375-520': [-15.8085, -47.8992],
  'plano piloto, distrito federal': [-15.7801, -47.9292],
  'asa norte, brasília, distrito federal': [-15.7612, -47.8765],
  'asa sul, brasília, distrito federal': [-15.8115, -47.8988],
  'lago sul, brasília, distrito federal': [-15.8362, -47.8680],
  'águas claras, brasília, distrito federal': [-15.8398, -48.0264],
  'guará, brasília, distrito federal': [-15.8152, -47.9798],
  'taguatinga, brasília, distrito federal': [-15.8336, -48.0567],
  'jardim botânico, brasília, distrito federal': [-15.8902, -47.7885],
  'sobradinho, brasília, distrito federal': [-15.6512, -47.7915],
  'distrito federal': [-15.7801, -47.9292],

  // Minas Gerais
  'praça central, s/n, coqueiro campo, minas novas, minas gerais': [-17.2185, -42.5912],
  '39650-000': [-17.2185, -42.5912],
  'coqueiro campo, minas novas, minas gerais': [-17.2190, -42.5900],
  'minas novas, minas gerais': [-17.2185, -42.5912],
  'minas gerais': [-19.9173, -43.9345],

  // Rio Grande do Sul
  'rua fernando machado, 450, centro histórico, porto alegre, rio grande do sul': [-30.0345, -51.2312],
  '90010-180': [-30.0345, -51.2312],
  'centro histórico, porto alegre, rio grande do sul': [-30.0340, -51.2300],
  'porto alegre, rio grande do sul': [-30.0346, -51.2177],
  'rio grande do sul': [-30.0346, -51.2177],

  // Pará
  'travessa 15 de novembro, 88, icaraí, soure, pará': [-0.7188, -48.5135],
  '68870-000': [-0.7188, -48.5135],
  'icaraí, soure, pará': [-0.7190, -48.5120],
  'soure, pará': [-0.7188, -48.5135],
  'pará': [-1.4558, -48.4902],
};

// Search equivalents helper for scanning raw address text
function scanAddressForDFArea(address: string, neighborhood: string): string | null {
  const fullText = `${address} ${neighborhood}`.toLowerCase();
  
  // Check against our list of RAs
  for (const ra of DF_REGIOES_ADMINISTRATIVAS) {
    if (fullText.includes(ra.toLowerCase())) {
      return ra;
    }
  }

  // Common landmarks / sectors in DF
  if (fullText.includes('asa sul') || fullText.includes('cls') || fullText.includes('sqs')) return 'Asa Sul';
  if (fullText.includes('asa norte') || fullText.includes('cln') || fullText.includes('sqn')) return 'Asa Norte';
  if (fullText.includes('lago sul') || fullText.includes('shis') || fullText.includes('qil')) return 'Lago Sul';
  if (fullText.includes('lago norte') || fullText.includes('shin') || fullText.includes('qin')) return 'Lago Norte';
  if (fullText.includes('sudoeste') || fullText.includes('ccsw') || fullText.includes('qmsw')) return 'Sudoeste';
  if (fullText.includes('octogonal') || fullText.includes('aos')) return 'Octogonal';
  if (fullText.includes('cruzeiro') || fullText.includes('shces')) return 'Cruzeiro';

  return null;
}

// ETAPA 2 — HIERARQUIA DE GEOLOCALIZAÇÃO & TRATAMENTO ESPECIAL DO DISTRITO FEDERAL
export interface GeocodeStepResult {
  step: number;
  description: string;
  searchString: string;
  coords: [number, number] | null;
  status: 'valid' | 'invalid' | 'skipped';
  reason?: string;
}

export function performGeocodingHierarchy(
  est: {
    address: string;
    neighborhood: string;
    city: string;
    state: string;
    cep?: string;
    privacy?: PrivacyLevel;
  }
): {
  normalized: NormalizedLocation;
  success: boolean;
  coords: [number, number];
  steps: GeocodeStepResult[];
  reviewQueueReason?: string;
} {
  const norm = normalizeLocationData(est.address, est.neighborhood, est.city, est.state, est.cep || '');
  const steps: GeocodeStepResult[] = [];
  let foundCoords: [number, number] | null = null;
  let successfulStepIndex = -1;

  // Equivalences for RAs in DF
  const equivalences = getRaEquivalences();

  // Determine if DF Rules Apply
  const isDF = norm.state === 'Distrito Federal';

  // Build the hierarchical steps
  const rawSteps: { desc: string; getQuery: () => string; skip?: boolean }[] = [];

  if (isDF) {
    // REGRA DE BRASÍLIA / DISTRITO FEDERAL
    // Check if we can extract a specific RA/Sector from address or neighborhood
    let detectedRA = norm.neighborhood;
    const scannedRA = scanAddressForDFArea(norm.address, norm.neighborhood);
    if (scannedRA) {
      detectedRA = scannedRA;
    }

    // Apply Equivalences
    const matchEq = equivalences.find(eq => eq.source.toLowerCase() === detectedRA.toLowerCase());
    const targetRA = matchEq ? matchEq.target : detectedRA;

    // 1. Full Address (with extracted RA)
    rawSteps.push({
      desc: 'Endereço completo estruturado com Região Administrativa',
      getQuery: () => `${norm.address}, ${targetRA}, Brasília, Distrito Federal`.toLowerCase(),
      skip: est.privacy !== 'full'
    });

    // 2. CEP
    rawSteps.push({
      desc: 'Código de Endereçamento Postal (CEP)',
      getQuery: () => norm.cep,
      skip: !norm.cep || norm.cep.length < 8
    });

    // 3. Região Administrativa + DF
    rawSteps.push({
      desc: 'Bairro/Região Administrativa mapeada e normalizada',
      getQuery: () => `${targetRA}, distrito federal`.toLowerCase()
    });

    // 4. Fallback: Distrito Federal General Center
    rawSteps.push({
      desc: 'Centro Geográfico do Distrito Federal (Fallback)',
      getQuery: () => 'distrito federal'
    });

  } else {
    // NORMAL STATES (SP, RJ, MG, RS, PA)
    // 1. Complete Address (authorized by privacy)
    rawSteps.push({
      desc: 'Endereço completo estruturado (Rua, Bairro, Cidade, Estado)',
      getQuery: () => `${norm.address}, ${norm.neighborhood}, ${norm.city}, ${norm.state}`.toLowerCase(),
      skip: est.privacy !== 'full'
    });

    // 2. CEP
    rawSteps.push({
      desc: 'Código de Endereçamento Postal (CEP)',
      getQuery: () => norm.cep,
      skip: !norm.cep || norm.cep.length < 8
    });

    // 3. Bairro + Município + Estado
    rawSteps.push({
      desc: 'Bairro e Município integrados',
      getQuery: () => `${norm.neighborhood}, ${norm.city}, ${norm.state}`.toLowerCase()
    });

    // 4. Município + Estado
    rawSteps.push({
      desc: 'Município e Estado de origem',
      getQuery: () => `${norm.city}, ${norm.state}`.toLowerCase()
    });

    // 5. Estado Fallback
    rawSteps.push({
      desc: 'Centro do Estado de origem',
      getQuery: () => `${norm.state}`.toLowerCase()
    });
  }

  // Execute each step in the hierarchy
  for (let i = 0; i < rawSteps.length; i++) {
    const stepConf = rawSteps[i];
    if (stepConf.skip) {
      steps.push({
        step: i + 1,
        description: stepConf.desc,
        searchString: '[Ignorado pelas restrições de privacidade ou falta de dados]',
        coords: null,
        status: 'skipped'
      });
      continue;
    }

    const queryStr = stepConf.getQuery();
    
    // Check our simulated database
    let coords: [number, number] | null = null;
    if (GEOCONTEXT_DB[queryStr]) {
      coords = GEOCONTEXT_DB[queryStr];
    } else {
      // Fallback search matches: scan database keys for containing text
      const matchingKey = Object.keys(GEOCONTEXT_DB).find(key => 
        key.includes(queryStr) || queryStr.includes(key)
      );
      if (matchingKey) {
        coords = GEOCONTEXT_DB[matchingKey];
      }
    }

    if (coords) {
      // Validate Coordinates
      const val = validateCoordinates(coords[0], coords[1], norm.state);
      if (val.isValid) {
        foundCoords = coords;
        successfulStepIndex = i;
        steps.push({
          step: i + 1,
          description: stepConf.desc,
          searchString: queryStr,
          coords: coords,
          status: 'valid'
        });
        break; // Stop hierarchy, successful match!
      } else {
        steps.push({
          step: i + 1,
          description: stepConf.desc,
          searchString: queryStr,
          coords: coords,
          status: 'invalid',
          reason: val.reason
        });
      }
    } else {
      steps.push({
        step: i + 1,
        description: stepConf.desc,
        searchString: queryStr,
        coords: null,
        status: 'invalid',
        reason: 'Endereço não localizado pelo geocodificador'
      });
    }
  }

  // Determine final outcome
  if (foundCoords) {
    return {
      normalized: norm,
      success: true,
      coords: foundCoords,
      steps: steps
    };
  }

  // Fallback if absolutely nothing matches: place at default state center or São Paulo
  const defaultCenter = STATE_CENTERS[norm.state] || [-23.55052, -46.633308];
  return {
    normalized: norm,
    success: false,
    coords: defaultCenter,
    steps: steps,
    reviewQueueReason: 'Falha total na geocodificação ou coordenada divergente'
  };
}

// Haversine distance calculator in kilometers
export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
