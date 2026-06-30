import { SyncRow, Category, Specialty } from '../types';

/**
 * Robust RFC 4180 compliant CSV Parser.
 * Handles quotes, commas inside fields, escaped quotes, and newlines.
 */
export function parseCSV(text: string): string[][] {
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
          i++; // Skip the next quote
        } else {
          inQuotes = false; // End of quote block
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

  // Filter out completely empty rows
  return lines.filter(r => r.length > 0 && r.some(cell => cell !== ''));
}

/**
 * Parses raw Brazilian city/state/neighborhood text strings to separate fields.
 * Ex: "Passos Minas Gerais. Centro" -> { city: "Passos", state: "MG", neighborhood: "Centro" }
 */
export function parseLocation(raw: string): { city: string; state: string; neighborhood: string } {
  const str = (raw || '').trim();
  let city = 'São Paulo';
  let state = 'SP';
  let neighborhood = 'Centro';

  if (!str) return { city, state, neighborhood };

  // Split by common delimiters
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

    // Substring backup check for state
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

/**
 * Extracts and merges multiple specialties / offers columns into a single string.
 */
export function cleanSpecialties(cols: string[]): string {
  // Combine all specialties/offers columns (Indices: 10, 15, 20, 21)
  const textToSearch = [
    cols[10], // Fornecedor: o que oferece
    cols[15], // Prestador: o que oferece
    cols[20], // Ateliê oferece
    cols[21]  // Perfil do ateliê
  ].filter(Boolean).join(', ');

  const parts = textToSearch.split(/[,;]/)
    .map(p => p.replace(/[☐☑]/g, '').trim())
    .filter(Boolean)
    .filter(p => !p.toLowerCase().includes('pular') && !p.toLowerCase().includes('enquadra'));

  return parts.length > 0 ? parts.join(', ') : 'Modelagem Manual, Alta Temperatura';
}

/**
 * Maps a raw Google Sheets row into a clean SyncRow object.
 */
export function mapRowToSyncRow(cols: string[], index: number): SyncRow {
  const timestamp = cols[0] || new Date().toISOString().replace('T', ' ').substring(0, 19);
  const name = cols[4] || `Sem Nome #${index}`;
  
  // Categorization mapping
  const categoryRaw = cols[2] || '';
  let category: Category = 'Ateliê';
  if (categoryRaw.includes('Fornecedor')) {
    category = 'Fornecedor';
  } else if (categoryRaw.includes('Prestador') || categoryRaw.includes('serviços')) {
    category = 'Outro'; // "Prestador" is mapped to "Outro"
  } else if (categoryRaw.includes('Ateliê')) {
    category = 'Ateliê';
  }

  // Location parsing
  const locationRaw = cols[6] || '';
  const { city, state, neighborhood } = parseLocation(locationRaw);

  // Contact parsing (Instagram or WhatsApp)
  const instagram = (cols[7] || '').trim();
  const whatsapp = (cols[8] || '').trim();
  const contact = instagram || whatsapp || '@ceramica_colaborativa';

  // Specialties
  const specialties = cleanSpecialties(cols);

  // Description / Comments
  const comments = [
    cols[12],
    cols[17],
    cols[22]
  ].filter(Boolean)
   .map(c => c.trim())
   .filter(c => !c.toLowerCase().includes('pular') && !c.toLowerCase().includes('enquadra'))
   .join(' | ');

  const description = comments 
    ? `Cadastro importado do Guia Colaborativo. ${comments}` 
    : `Perfil importado do Guia Colaborativo da Cerâmica. Localizado em ${city} - ${state}.`;

  return {
    id: `sheet_${index}_${Date.now()}`,
    timestamp,
    name,
    category,
    state,
    city,
    address: 'Consulte o Instagram',
    neighborhood,
    contact,
    specialties,
    status: 'pending',
    privacy: 'neighborhood',
    description,
    photo: 'https://images.unsplash.com/photo-1565192647048-f997ded879f9?auto=format&fit=crop&w=800&q=80'
  };
}

/**
 * Fetches the public Google Sheet using the gviz query engine and returns list of parsed rows.
 */
export async function fetchGoogleSheetRows(spreadsheetId: string, sheetName?: string): Promise<SyncRow[]> {
  const cleanId = spreadsheetId.trim();
  let url = `https://docs.google.com/spreadsheets/d/${cleanId}/gviz/tq?tqx=out:csv`;
  
  if (sheetName && sheetName.trim()) {
    url += `&sheet=${encodeURIComponent(sheetName.trim())}`;
  }

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Erro ao baixar a planilha: HTTP status ${res.status}`);
  }

  const text = await res.text();
  const rawLines = parseCSV(text);

  if (rawLines.length <= 1) {
    return []; // Only headers or empty
  }

  // Map each line (skipping header at row 0)
  return rawLines.slice(1).map((cols, i) => mapRowToSyncRow(cols, i + 1));
}
