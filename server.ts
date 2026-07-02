import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';

// Import initial mock data and structures
import { 
  INITIAL_ESTABLISHMENTS, MOCK_SHEETS_DATA, INITIAL_SYNC_LOGS, DEFAULT_PLANS, INITIAL_SUGGESTED_SPACES, DEFAULT_INTEGRATION_CONFIG 
} from './src/data';
import { 
  EstablishmentWithHomologation, SyncRow, SyncLog, PlanConfig, SuggestedSpace, IntegrationConfig, UserSession, AuditLog, TeamMember 
} from './src/types';

const PORT = 3000;
const DB_FILE = path.join(process.cwd(), 'server_db.json');

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

// Ensure database file exists or seed it
function loadDatabase(): ServerDatabase {
  if (fs.existsSync(DB_FILE)) {
    try {
      const content = fs.readFileSync(DB_FILE, 'utf-8');
      return JSON.parse(content);
    } catch (e) {
      console.error('Error reading database file, reseeding...', e);
    }
  }

  // Create initial seeded state
  const initialDb: ServerDatabase = {
    establishments: INITIAL_ESTABLISHMENTS.map(est => {
      // Ensure existing establishments have a default status and geocoding state
      const estWithH = est as EstablishmentWithHomologation;
      return {
        ...estWithH,
        homologationStatus: estWithH.homologationStatus || 'Perfil Oficial',
        geocodingStatus: estWithH.geocodingStatus || 'valid',
        origin: estWithH.origin || 'importação',
        team: estWithH.team || []
      };
    }),
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

  // Sync Google Sheets Rows with Establishments (Admin Only, Filter by "Divulgando minha empresa")
  app.post('/api/sync-sheets', (req, res) => {
    const session = getSession(req);
    const { fetchedRows, isBackground } = req.body;

    if (!isBackground && (!session || session.email.toLowerCase() !== 'samirarabello.backup@gmail.com')) {
      res.status(403).json({ error: 'Permissão de moderador/administrador necessária para sincronização.' });
      return;
    }

    if (!fetchedRows || fetchedRows.length === 0) {
      res.json({ success: true, imported: 0, ignored: 0 });
      return;
    }

    let newlyImportedCount = 0;
    let duplicatesCount = 0;
    let filteredCount = 0;

    for (const row of fetchedRows) {
      // MANDATORY CRITICAL SECURITY: Only import rows with Category: "Divulgando minha empresa"
      // Wait, is row.category a description on Sheets, or category of intent?
      // Yes, "Divulgando minha empresa" vs "Indicando um estabelecimento".
      // Let's check row.category or row.intent or custom category indicator. Let's make sure it checks both or row.category!
      // In the mock sheets, let's see how category is represented or we check row.category === 'Divulgando minha empresa'
      const rowCategory = String(row.category || '');
      const isMyCompany = rowCategory.includes('Divulgando minha empresa') || row.category === 'Divulgando minha empresa';
      const isSuggest = rowCategory.includes('Indicando um estabelecimento') || row.category === 'Indicando um estabelecimento';

      if (!isMyCompany) {
        // If it is 'Indicando um estabelecimento', do NOT import automatically.
        // Keep it only as suggested spaces or ignore from automatic import.
        if (isSuggest) {
          filteredCount++;
          // Append to suggestedSpaces list so it stays as suggestion for future homologation!
          const existsInSuggested = db.suggestedSpaces.some(s => s.name.toLowerCase() === row.name.toLowerCase() && s.city.toLowerCase() === row.city.toLowerCase());
          if (!existsInSuggested) {
            db.suggestedSpaces.push({
              id: `sug_imported_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
              name: row.name,
              category: 'Ateliê', // Default suggested category
              city: row.city || 'Desconhecida',
              state: row.state || 'SP',
              neighborhood: row.neighborhood || '',
              contact: row.contact || '',
              specialties: row.specialties || '',
              suggestedBy: 'Sincronizador (Indicação de Terceiro)',
              date: new Date().toISOString().replace('T', ' ').substring(0, 16),
              invitedStatus: 'pending'
            });
          }
        }
        continue;
      }

      // Check if already exists in establishments list
      const existsInEst = db.establishments.some(
        e => e.name.toLowerCase().trim() === row.name.toLowerCase().trim() ||
             (e.city.toLowerCase().trim() === row.city.toLowerCase().trim() && 
              e.instagram?.toLowerCase().trim() === row.contact.toLowerCase().trim())
      );

      const existingSheetRowIndex = db.sheetRows.findIndex(
        sr => sr.name.toLowerCase().trim() === row.name.toLowerCase().trim() &&
              sr.city.toLowerCase().trim() === row.city.toLowerCase().trim()
      );

      if (existsInEst) {
        duplicatesCount++;
        if (existingSheetRowIndex >= 0) {
          db.sheetRows[existingSheetRowIndex].status = 'duplicate';
        }
        continue;
      }

      // Successful import
      const nextEst: EstablishmentWithHomologation = {
        id: `est_imported_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
        name: row.name,
        category: 'Ateliê', // Seed category cleanly
        specialties: (row.specialties || '').split(', ').map((s: string) => s.trim()).filter(Boolean),
        services: [],
        privacy: row.privacy || 'neighborhood',
        address: row.address || '',
        neighborhood: row.neighborhood || '',
        city: row.city || '',
        state: row.state || '',
        coordinates: [-23.55052, -46.633308], // Seed default coordinates
        geocodingStatus: 'pending_review',
        originalAddress: row.address || 'Consulte as redes sociais',
        description: row.description || `Perfil importado do Guia Colaborativo. Localizado em ${row.city} - ${row.state}.`,
        instagram: row.contact.startsWith('@') ? row.contact : `@${row.contact}`,
        whatsapp: row.contact.replace(/\D/g, '') || '',
        photo: 'https://images.unsplash.com/photo-1565192647048-f997ded879f9?auto=format&fit=crop&w=800&q=80',
        isPremium: false,
        claimed: false,
        rating: 4.8,
        reviewsCount: 0,
        homologationStatus: 'Perfil Importado', // Set to Perfil Importado
        origin: 'Google Forms',
        team: []
      };

      db.establishments.unshift(nextEst);
      newlyImportedCount++;

      if (existingSheetRowIndex >= 0) {
        db.sheetRows[existingSheetRowIndex].status = 'synced';
      } else {
        db.sheetRows.push({
          ...row,
          status: 'synced'
        });
      }
    }

    saveDatabase(db);

    const logMsg = isBackground
      ? `Sincronização Automática (Sheets): ${newlyImportedCount} importados, ${duplicatesCount} ignorados, ${filteredCount} indicações mantidas como sugestões.`
      : `Sincronização Manual (Sheets): ${newlyImportedCount} importados, ${duplicatesCount} ignorados, ${filteredCount} indicações mantidas como sugestões.`;

    const nextLog: SyncLog = {
      id: `log_${Date.now()}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      action: logMsg,
      recordsSynced: newlyImportedCount,
      recordsIgnored: duplicatesCount,
      operator: isBackground ? 'Frequência de Sincronia' : (session?.email || 'Sistema')
    };

    db.syncLogs.unshift(nextLog);
    saveDatabase(db);

    res.json({ success: true, imported: newlyImportedCount, ignored: duplicatesCount, filtered: filteredCount });
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
