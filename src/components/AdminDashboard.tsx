import React, { useState } from 'react';
import { 
  BarChart3, Users, MapPin, Award, FileText, Check, X, ShieldAlert,
  TrendingUp, Download, Settings, RefreshCw, Layers, Sparkles, Send, 
  Mail, MessageSquare, ShieldCheck, Copy, Sliders, Trash, CheckSquare,
  AlertCircle, DollarSign, Calendar, Eye, Play, Plus, BookOpen, AlertTriangle
} from 'lucide-react';
import { 
  Establishment, PlanConfig, SuggestedSpace, PlanTier, Category, IntegrationConfig, SyncLog,
  UserSession, AuditLog, TeamMember, HomologationStatus, ValidationStepStatus, HomologationChecklist, EstablishmentWithHomologation, UserRole
} from '../types';
import GeocodingReview from './GeocodingReview';
import BenefitsModule from './BenefitsModule';

interface AdminDashboardProps {
  establishments: Establishment[];
  onApproveClaim: (estId: string) => void;
  onRejectClaim: (estId: string) => void;
  onTogglePremium: (estId: string) => void;
  onExportCSV: () => void;
  
  // Plan and referrals state
  plans: PlanConfig[];
  onUpdatePlans: (updatedPlans: PlanConfig[]) => void;
  suggestedSpaces: SuggestedSpace[];
  onInviteSpace: (id: string) => void;
  onRemoveSuggestedSpace: (id: string) => void;
  onUpdateEstablishmentPlan: (estId: string, plan: PlanTier) => void;

  // Integrations state
  integrationConfig: IntegrationConfig;
  onUpdateIntegrationConfig: (config: IntegrationConfig) => void;
  onManualSyncGoogleSheets: () => Promise<void>;
  syncLogs: SyncLog[];

  // Callback for geolocation and benefits corrections
  onUpdateEstablishmentCoords: (id: string, coords: [number, number], addressDetails?: Partial<Establishment>) => void;
  onUpdateEstablishment: (id: string, updates: Partial<Establishment>) => void;

  // Auth & RBAC extensions
  currentSession: UserSession | null;
  auditLogs: AuditLog[];
  onAddAuditLog: (action: string, notes?: string, targetId?: string, targetName?: string, prevVal?: string, newVal?: string) => void;
  teamMembers: TeamMember[];
  onUpdateTeamMembers: (members: TeamMember[]) => void;
}

export default function AdminDashboard({
  establishments,
  onApproveClaim,
  onRejectClaim,
  onTogglePremium,
  onExportCSV,
  plans,
  onUpdatePlans,
  suggestedSpaces,
  onInviteSpace,
  onRemoveSuggestedSpace,
  onUpdateEstablishmentPlan,
  integrationConfig,
  onUpdateIntegrationConfig,
  onManualSyncGoogleSheets,
  syncLogs,
  onUpdateEstablishmentCoords,
  onUpdateEstablishment,
  
  currentSession,
  auditLogs,
  onAddAuditLog,
  teamMembers,
  onUpdateTeamMembers
}: AdminDashboardProps) {
  const [activeAdminSubTab, setActiveAdminSubTab] = useState<'metrics' | 'plans' | 'suggested' | 'claims' | 'subscribers' | 'duplicates' | 'integrations' | 'geocoding' | 'benefits' | 'homologation' | 'team' | 'audit' | 'settings'>('metrics');
  const [isExporting, setIsExporting] = useState(false);
  const [inviteModalSpace, setInviteModalSpace] = useState<SuggestedSpace | null>(null);
  
  // Plan edit form states
  const [editingPlanId, setEditingPlanId] = useState<PlanTier | null>(null);
  const [editPlanName, setEditPlanName] = useState('');
  const [editPlanPrice, setEditPlanPrice] = useState(0);
  const [editPlanPeriod, setEditPlanPeriod] = useState('Mês');
  const [editPlanMaxPhotos, setEditPlanMaxPhotos] = useState(1);
  const [editPlanMaxVideos, setEditPlanMaxVideos] = useState(0);
  const [editPlanSearch, setEditPlanSearch] = useState(false);
  const [editPlanMap, setEditPlanMap] = useState(false);
  const [editPlanHome, setEditPlanHome] = useState(false);
  const [editPlanFeaturesStr, setEditPlanFeaturesStr] = useState('');

  // Integrations local state
  const [formUrl, setFormUrl] = useState(integrationConfig.url);
  const [formSpreadsheetId, setFormSpreadsheetId] = useState(integrationConfig.spreadsheetId);
  const [formSheetName, setFormSheetName] = useState(integrationConfig.sheetName);
  const [formSyncInterval, setFormSyncInterval] = useState(integrationConfig.syncInterval);
  const [formSyncMethod, setFormSyncMethod] = useState(integrationConfig.syncMethod);
  const [formStatus, setFormStatus] = useState(integrationConfig.status);
  const [isLiveSyncing, setIsLiveSyncing] = useState(false);
  const [showSuccessBanner, setShowSuccessBanner] = useState(false);

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value;
    setFormUrl(url);
    const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (match && match[1]) {
      setFormSpreadsheetId(match[1]);
    }
  };

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateIntegrationConfig({
      url: formUrl,
      spreadsheetId: formSpreadsheetId,
      sheetName: formSheetName,
      syncInterval: formSyncInterval,
      syncMethod: formSyncMethod,
      status: formStatus
    });
    setShowSuccessBanner(true);
    setTimeout(() => {
      setShowSuccessBanner(false);
    }, 3000);
  };

  const handleTriggerLiveSync = async () => {
    setIsLiveSyncing(true);
    try {
      await onManualSyncGoogleSheets();
    } catch (err) {
      console.error(err);
    } finally {
      setIsLiveSyncing(false);
    }
  };

  // Duplicities review checklist (simulation)
  const suspectedDuplicates = establishments.filter((est, i) => {
    return establishments.some((other, j) => {
      if (i === j) return false;
      // Proximity check or contact/address check (but not name alone)
      const contactMatch = est.instagram === other.instagram || est.whatsapp === other.whatsapp;
      const addressMatch = est.city === other.city && est.neighborhood === other.neighborhood && est.address.toLowerCase() === other.address.toLowerCase();
      return contactMatch || addressMatch;
    });
  });

  const [approvedDistinctIds, setApprovedDistinctIds] = useState<string[]>([]);

  // Filter duplicate list for display
  const activeDuplicates = suspectedDuplicates.filter(est => !approvedDistinctIds.includes(est.id));

  // Count active subscribers for each tier
  const getSubscribersCount = (tier: PlanTier) => {
    return establishments.filter(e => {
      if (tier === 'gratuito') return !e.isPremium && e.planTier !== 'atelie' && e.planTier !== 'estudio' && e.planTier !== 'institucional';
      if (tier === 'atelie') return e.planTier === 'atelie' || (e.isPremium && !e.planTier);
      return e.planTier === tier;
    }).length;
  };

  // Dynamically calculate MRR based on dynamically configured prices!
  const calculateMRR = () => {
    return plans.reduce((acc, plan) => {
      const count = getSubscribersCount(plan.id);
      return acc + (count * plan.price);
    }, 0);
  };

  const handleExportClick = () => {
    setIsExporting(true);
    setTimeout(() => {
      onExportCSV();
      setIsExporting(false);
    }, 1200);
  };

  const startEditPlan = (plan: PlanConfig) => {
    setEditingPlanId(plan.id);
    setEditPlanName(plan.name);
    setEditPlanPrice(plan.price);
    setEditPlanPeriod(plan.period);
    setEditPlanMaxPhotos(plan.maxPhotos);
    setEditPlanMaxVideos(plan.maxVideos);
    setEditPlanSearch(plan.hasSearchProminence);
    setEditPlanMap(plan.hasMapHighlight);
    setEditPlanHome(plan.hasHomeHighlight);
    setEditPlanFeaturesStr(plan.features.join('\n'));
  };

  const saveEditedPlan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlanId) return;

    const updated = plans.map(p => {
      if (p.id === editingPlanId) {
        return {
          ...p,
          name: editPlanName,
          price: editPlanPrice,
          period: editPlanPeriod,
          maxPhotos: editPlanMaxPhotos,
          maxVideos: editPlanMaxVideos,
          hasSearchProminence: editPlanSearch,
          hasMapHighlight: editPlanMap,
          hasHomeHighlight: editPlanHome,
          features: editPlanFeaturesStr.split('\n').map(f => f.trim()).filter(f => f.length > 0)
        };
      }
      return p;
    });

    onUpdatePlans(updated);
    setEditingPlanId(null);
  };

  // Trigger simulated multi-channel invite
  const triggerSimulatedInvite = (space: SuggestedSpace) => {
    onInviteSpace(space.id);
    setInviteModalSpace(space);
  };

  return (
    <div className="bg-white rounded-2xl border border-clay-border/60 shadow-md p-5 space-y-6 font-sans text-xs text-earth-dark">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-clay-border/40 pb-4">
        <div className="flex items-center gap-2.5">
          <span className="p-2.5 rounded-xl bg-terracotta border border-terracotta/20 text-white shadow-sm">
            <Sliders className="w-5 h-5" />
          </span>
          <div>
            <h2 className="text-base font-bold text-earth-dark tracking-tight">Painel Executivo CeraMapa</h2>
            <p className="text-[11px] text-earth-gray">Controle de Planos, Indicações de Terceiros e Auditoria de Duplicidades</p>
          </div>
        </div>

        <button 
          id="export-csv-btn"
          onClick={handleExportClick}
          disabled={isExporting}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 bg-sienna hover:bg-earth-dark text-white rounded-xl text-[11px] font-bold shadow-md cursor-pointer disabled:bg-clay-border transition-all"
        >
          <Download className="w-3.5 h-3.5" />
          {isExporting ? 'Exportando dados...' : 'Exportar Base de Perfis (CSV)'}
        </button>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex flex-wrap border-b border-clay-border/30 text-[11px] font-bold gap-2">
        <button 
          onClick={() => setActiveAdminSubTab('metrics')}
          className={`pb-3 px-3 border-b-2 tracking-wider uppercase transition-all cursor-pointer ${
            activeAdminSubTab === 'metrics' 
              ? 'border-terracotta text-terracotta font-extrabold' 
              : 'border-transparent text-earth-dark/60 hover:text-earth-dark'
          }`}
        >
          Métricas Gerais
        </button>

        {/* CENTRAL DE HOMOLOGAÇÃO - ACCESSIBLE BY ALL AUTHORIZED ROLES */}
        <button 
          onClick={() => setActiveAdminSubTab('homologation')}
          className={`pb-3 px-3 border-b-2 tracking-wider uppercase transition-all cursor-pointer relative ${
            activeAdminSubTab === 'homologation' 
              ? 'border-terracotta text-terracotta font-extrabold' 
              : 'border-transparent text-earth-dark/60 hover:text-earth-dark'
          }`}
        >
          ⚖️ Central de Homologação
          {establishments.filter(e => {
            const ext = e as EstablishmentWithHomologation;
            return ext.homologationStatus === 'Cadastro em Análise' || !ext.homologationStatus;
          }).length > 0 && (
            <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-terracotta text-white text-[9px] font-bold">
              {establishments.filter(e => {
                const ext = e as EstablishmentWithHomologation;
                return ext.homologationStatus === 'Cadastro em Análise' || !ext.homologationStatus;
              }).length}
            </span>
          )}
        </button>

        <button 
          onClick={() => setActiveAdminSubTab('plans')}
          className={`pb-3 px-3 border-b-2 tracking-wider uppercase transition-all cursor-pointer ${
            activeAdminSubTab === 'plans' 
              ? 'border-terracotta text-terracotta font-extrabold' 
              : 'border-transparent text-earth-dark/60 hover:text-earth-dark'
          }`}
        >
          ⚙ Configuração dos Planos
        </button>
        <button 
          onClick={() => setActiveAdminSubTab('suggested')}
          className={`pb-3 px-3 border-b-2 tracking-wider uppercase transition-all cursor-pointer relative ${
            activeAdminSubTab === 'suggested' 
              ? 'border-terracotta text-terracotta font-extrabold' 
              : 'border-transparent text-earth-dark/60 hover:text-earth-dark'
          }`}
        >
          📨 Espaços Indicados
          {suggestedSpaces.filter(s => s.invitedStatus === 'pending').length > 0 && (
            <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-terracotta text-white text-[9px] font-bold animate-pulse">
              {suggestedSpaces.filter(s => s.invitedStatus === 'pending').length}
            </span>
          )}
        </button>
        <button 
          onClick={() => setActiveAdminSubTab('claims')}
          className={`pb-3 px-3 border-b-2 tracking-wider uppercase transition-all cursor-pointer ${
            activeAdminSubTab === 'claims' 
              ? 'border-terracotta text-terracotta font-extrabold' 
              : 'border-transparent text-earth-dark/60 hover:text-earth-dark'
          }`}
        >
          Reivindicações
        </button>
        <button 
          onClick={() => setActiveAdminSubTab('subscribers')}
          className={`pb-3 px-3 border-b-2 tracking-wider uppercase transition-all cursor-pointer ${
            activeAdminSubTab === 'subscribers' 
              ? 'border-terracotta text-terracotta font-extrabold' 
              : 'border-transparent text-earth-dark/60 hover:text-earth-dark'
          }`}
        >
          Gerenciar Assinantes
        </button>
        <button 
          onClick={() => setActiveAdminSubTab('duplicates')}
          className={`pb-3 px-3 border-b-2 tracking-wider uppercase transition-all cursor-pointer relative ${
            activeAdminSubTab === 'duplicates' 
              ? 'border-terracotta text-terracotta font-extrabold' 
              : 'border-transparent text-earth-dark/60 hover:text-earth-dark'
          }`}
        >
          🔍 Duplicidades
          {activeDuplicates.length > 0 && (
            <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-amber-500 text-white text-[9px] font-bold">
              {activeDuplicates.length}
            </span>
          )}
        </button>
        <button 
          onClick={() => setActiveAdminSubTab('integrations')}
          className={`pb-3 px-3 border-b-2 tracking-wider uppercase transition-all cursor-pointer ${
            activeAdminSubTab === 'integrations' 
              ? 'border-terracotta text-terracotta font-extrabold' 
              : 'border-transparent text-earth-dark/60 hover:text-earth-dark'
          }`}
        >
          🔌 Integrações
        </button>
        <button 
          onClick={() => setActiveAdminSubTab('geocoding')}
          className={`pb-3 px-3 border-b-2 tracking-wider uppercase transition-all cursor-pointer ${
            activeAdminSubTab === 'geocoding' 
              ? 'border-terracotta text-terracotta font-extrabold' 
              : 'border-transparent text-earth-dark/60 hover:text-earth-dark'
          }`}
        >
          📍 Revisar Localização
        </button>
        <button 
          onClick={() => setActiveAdminSubTab('benefits')}
          className={`pb-3 px-3 border-b-2 tracking-wider uppercase transition-all cursor-pointer ${
            activeAdminSubTab === 'benefits' 
              ? 'border-terracotta text-terracotta font-extrabold' 
              : 'border-transparent text-earth-dark/60 hover:text-earth-dark'
          }`}
        >
          🎁 Benefícios & Bolsas
        </button>

        {/* TEAM & ACCESS CONTROL - RESTRICTED TO ADMIN/SUPER_ADMIN */}
        {(currentSession?.role === 'super_admin' || currentSession?.role === 'admin') && (
          <button 
            onClick={() => setActiveAdminSubTab('team')}
            className={`pb-3 px-3 border-b-2 tracking-wider uppercase transition-all cursor-pointer ${
              activeAdminSubTab === 'team' 
                ? 'border-terracotta text-terracotta font-extrabold' 
                : 'border-transparent text-earth-dark/60 hover:text-earth-dark'
            }`}
          >
            👥 Equipe & Permissões
          </button>
        )}

        {/* AUDIT LOGS - RESTRICTED TO ADMIN/SUPER_ADMIN */}
        {(currentSession?.role === 'super_admin' || currentSession?.role === 'admin') && (
          <button 
            onClick={() => setActiveAdminSubTab('audit')}
            className={`pb-3 px-3 border-b-2 tracking-wider uppercase transition-all cursor-pointer ${
              activeAdminSubTab === 'audit' 
                ? 'border-terracotta text-terracotta font-extrabold' 
                : 'border-transparent text-earth-dark/60 hover:text-earth-dark'
            }`}
          >
            📜 Auditoria Perpétua
          </button>
        )}

        {/* GLOBAL SETTINGS */}
        {(currentSession?.role === 'super_admin' || currentSession?.role === 'admin') && (
          <button 
            onClick={() => setActiveAdminSubTab('settings')}
            className={`pb-3 px-3 border-b-2 tracking-wider uppercase transition-all cursor-pointer ${
              activeAdminSubTab === 'settings' 
                ? 'border-terracotta text-terracotta font-extrabold' 
                : 'border-transparent text-earth-dark/60 hover:text-earth-dark'
            }`}
          >
            🔧 Configurações do Sistema
          </button>
        )}
      </div>

      {/* SUB-TAB: METRICS */}
      {activeAdminSubTab === 'metrics' && (
        <div className="space-y-6 animate-fadeIn">
          
          {/* Platform Positioning Alert Banner */}
          <div className="p-4 bg-gradient-to-r from-sand-card to-clay-bg border border-clay-border rounded-xl space-y-1 text-xs">
            <h4 className="font-bold text-sienna flex items-center gap-1">
              <Sparkles className="w-4 h-4 text-terracotta" /> Posicionamento Estratégico da Plataforma
            </h4>
            <p className="text-earth-gray leading-relaxed text-[11px]">
              O CeraMapa evoluiu de um simples mapa colaborativo para uma <strong>plataforma de conexão e crescimento de toda a cadeia produtiva da cerâmica</strong>. O mapa nacional agora hospeda exclusivamente perfis oficiais, garantindo o máximo de confiabilidade. O sistema está modularizado para futuras ativações de <strong>Marketplace de Peças/Equipamentos</strong>, <strong>Agendamento de Cursos</strong> e <strong>Editais e Residências Artísticas</strong>.
            </p>
          </div>

          {/* Bento Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-gray-50 rounded-2xl border border-clay-border/40 space-y-1.5">
              <span className="text-[9px] uppercase font-bold tracking-wider text-earth-gray">Total de Perfis Oficiais</span>
              <p className="text-2xl font-black text-earth-dark leading-tight">{establishments.length}</p>
              <div className="text-[10px] text-emerald-600 font-semibold">
                ✓ 100% verificado e autorizado
              </div>
            </div>

            <div className="p-4 bg-gray-50 rounded-2xl border border-clay-border/40 space-y-1.5">
              <span className="text-[9px] uppercase font-bold tracking-wider text-earth-gray">Assinantes Ativos</span>
              <p className="text-2xl font-black text-terracotta leading-tight">
                {establishments.filter(e => e.planTier === 'atelie' || e.planTier === 'estudio' || e.planTier === 'institucional' || e.isPremium).length}
              </p>
              <div className="text-[10px] text-earth-gray font-medium">
                Em planos recorrentes pagos
              </div>
            </div>

            <div className="p-4 bg-gray-50 rounded-2xl border border-clay-border/40 space-y-1.5">
              <span className="text-[9px] uppercase font-bold tracking-wider text-earth-gray">Indicações Pendentes</span>
              <p className="text-2xl font-black text-sienna leading-tight">{suggestedSpaces.length}</p>
              <div className="text-[10px] text-amber-600 font-semibold">
                ⚡ {suggestedSpaces.filter(s => s.invitedStatus === 'invited').length} convidados enviados
              </div>
            </div>

            <div className="p-4 bg-gray-50 rounded-2xl border border-clay-border/40 space-y-1.5">
              <span className="text-[9px] uppercase font-bold tracking-wider text-earth-gray">Receita Recorrente (MRR)</span>
              <p className="text-2xl font-black text-emerald-700 leading-tight">R$ {calculateMRR().toFixed(2)}</p>
              <div className="text-[10px] text-emerald-600 font-semibold">
                Calculado com os preços dinâmicos
              </div>
            </div>
          </div>

          {/* Table of Subscribers breakdown by current Configured Tiers */}
          <div className="p-4 border border-clay-border/50 rounded-xl bg-white space-y-3">
            <h3 className="text-xs font-bold text-sienna uppercase tracking-wider font-serif">Métricas de Receita de Planos Dinâmicos</h3>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
              {plans.map(plan => {
                const count = getSubscribersCount(plan.id);
                return (
                  <div key={plan.id} className="p-3 bg-sand-bg/40 border border-sand-border rounded-xl space-y-1">
                    <span className="font-bold text-earth-dark text-[11px] block truncate">{plan.name}</span>
                    <p className="text-[10px] text-earth-gray">Preço: <strong className="text-terracotta">R$ {plan.price}/{plan.period === 'Sempre' ? 'Único' : plan.period}</strong></p>
                    <p className="text-[10px] text-earth-gray">Membros: <strong className="text-earth-dark">{count}</strong></p>
                    <p className="text-xs font-extrabold text-emerald-800 pt-1">R$ {(count * plan.price).toFixed(2)} / mês</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Logs Terminal */}
          <div className="border border-clay-border/50 rounded-xl overflow-hidden bg-white shadow-sm p-4 space-y-3">
            <h3 className="text-xs font-semibold text-earth-gray uppercase tracking-wider flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-terracotta" /> Auditoria e Segurança da Cadeia Produtiva
            </h3>
            <div className="font-mono text-[10px] text-earth-gray bg-gray-900 text-gray-200 p-3 rounded-lg space-y-1 max-h-36 overflow-y-auto">
              <p className="text-gray-400">[2026-06-29 16:15:33] PLAN: Planos de monetização ajustados dinamicamente.</p>
              <p className="text-emerald-400">[2026-06-29 15:45:12] SYSTEM: Duplicidade evitada no contato @ceramiland.</p>
              <p className="text-gray-400">[2026-06-29 14:10:02] INVITE: Convite WhatsApp simulado para Ateliê Terra de Fogo.</p>
              <p className="text-amber-400">[2026-06-29 12:20:19] SECURITY_GATE: Perfil colaborativo de terceiro direcionado à fila de indicações.</p>
            </div>
          </div>

        </div>
      )}

      {/* SUB-TAB: PLAN CONFIGURATION EDITOR (CRITICAL REQUIREMENT) */}
      {activeAdminSubTab === 'plans' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="flex justify-between items-center border-b border-clay-border/40 pb-2">
            <div>
              <h3 className="text-xs font-bold text-sienna uppercase tracking-wider font-serif">Gerenciar Configuração de Planos Comerciais</h3>
              <p className="text-[10px] text-earth-gray">Edite preços, nomes, limite de fotos e privilégios que afetam imediatamente o comportamento da plataforma.</p>
            </div>
            <span className="text-[9px] bg-terracotta/15 text-terracotta px-2.5 py-0.5 rounded-full font-bold">Sem Mudar Código</span>
          </div>

          {/* Form when editing */}
          {editingPlanId && (
            <form onSubmit={saveEditedPlan} className="p-4 bg-sand-card/40 border border-clay-border rounded-xl space-y-4 animate-fadeIn">
              <h4 className="font-bold text-terracotta uppercase tracking-wide flex items-center gap-1.5">
                ✏ Editando: {plans.find(p => p.id === editingPlanId)?.name}
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Nome do Plano *</label>
                  <input 
                    type="text" 
                    value={editPlanName} 
                    onChange={e => setEditPlanName(e.target.value)}
                    required
                    className="w-full p-2 rounded-lg border border-clay-border text-xs bg-white text-earth-dark"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Preço Mensal (R$) *</label>
                  <input 
                    type="number" 
                    value={editPlanPrice} 
                    onChange={e => setEditPlanPrice(Number(e.target.value))}
                    required
                    min={0}
                    className="w-full p-2 rounded-lg border border-clay-border text-xs bg-white text-earth-dark"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Frequência/Período *</label>
                  <input 
                    type="text" 
                    value={editPlanPeriod} 
                    onChange={e => setEditPlanPeriod(e.target.value)}
                    required
                    className="w-full p-2 rounded-lg border border-clay-border text-xs bg-white text-earth-dark"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Máximo de Fotos Permitidas *</label>
                  <input 
                    type="number" 
                    value={editPlanMaxPhotos} 
                    onChange={e => setEditPlanMaxPhotos(Number(e.target.value))}
                    required
                    min={1}
                    className="w-full p-2 rounded-lg border border-clay-border text-xs bg-white text-earth-dark"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Máximo de Vídeos Permitidos *</label>
                  <input 
                    type="number" 
                    value={editPlanMaxVideos} 
                    onChange={e => setEditPlanMaxVideos(Number(e.target.value))}
                    required
                    min={0}
                    className="w-full p-2 rounded-lg border border-clay-border text-xs bg-white text-earth-dark"
                  />
                </div>
              </div>

              {/* Privileges check */}
              <div className="space-y-2">
                <label className="block font-bold text-gray-700">Destaques e Privilégios Técnicos</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <label className="flex items-center gap-2 p-2 rounded-lg border border-clay-border bg-white cursor-pointer hover:bg-gray-50">
                    <input 
                      type="checkbox" 
                      checked={editPlanSearch} 
                      onChange={e => setEditPlanSearch(e.target.checked)}
                      className="w-4 h-4 text-terracotta rounded"
                    />
                    <span className="font-semibold text-earth-dark">Destaque nas Buscas</span>
                  </label>
                  <label className="flex items-center gap-2 p-2 rounded-lg border border-clay-border bg-white cursor-pointer hover:bg-gray-50">
                    <input 
                      type="checkbox" 
                      checked={editPlanMap} 
                      onChange={e => setEditPlanMap(e.target.checked)}
                      className="w-4 h-4 text-terracotta rounded"
                    />
                    <span className="font-semibold text-earth-dark">Pino Customizado no Mapa</span>
                  </label>
                  <label className="flex items-center gap-2 p-2 rounded-lg border border-clay-border bg-white cursor-pointer hover:bg-gray-50">
                    <input 
                      type="checkbox" 
                      checked={editPlanHome} 
                      onChange={e => setEditPlanHome(e.target.checked)}
                      className="w-4 h-4 text-terracotta rounded"
                    />
                    <span className="font-semibold text-earth-dark">Banner Destaque Home</span>
                  </label>
                </div>
              </div>

              {/* Features strings */}
              <div>
                <label className="block font-bold text-gray-700 mb-1">Lista de Funcionalidades do Plano (Uma por linha) *</label>
                <textarea
                  rows={4}
                  value={editPlanFeaturesStr}
                  onChange={e => setEditPlanFeaturesStr(e.target.value)}
                  placeholder="Ex: Suporte 24h&#10;Logo em destaque"
                  className="w-full p-2 rounded-lg border border-clay-border text-xs bg-white text-earth-dark font-mono"
                />
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingPlanId(null)}
                  className="px-4 py-2 border border-clay-border text-earth-dark hover:bg-gray-50 rounded-xl font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-terracotta hover:bg-sienna text-white rounded-xl font-bold shadow-md cursor-pointer"
                >
                  Salvar Alterações
                </button>
              </div>
            </form>
          )}

          {/* Plans Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {plans.map(plan => (
              <div key={plan.id} className="p-4 border border-clay-border rounded-xl bg-white space-y-3 relative overflow-hidden flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-sm text-earth-dark">{plan.name}</h4>
                      <span className="text-[10px] text-terracotta font-bold uppercase tracking-wider">{plan.id}</span>
                    </div>
                    <p className="text-sm font-black text-emerald-800">
                      R$ {plan.price}/{plan.period === 'Sempre' ? 'Único' : plan.period}
                    </p>
                  </div>

                  <div className="pt-1.5 border-t border-clay-border/30 grid grid-cols-2 gap-2 text-[10px] text-earth-gray">
                    <p>📸 Fotos: <strong className="text-earth-dark">{plan.maxPhotos}</strong></p>
                    <p>🎥 Vídeos: <strong className="text-earth-dark">{plan.maxVideos}</strong></p>
                    <p>🔍 Busca Prominente: <strong className="text-earth-dark">{plan.hasSearchProminence ? 'Sim' : 'Não'}</strong></p>
                    <p>🗺️ Destaque Mapa: <strong className="text-earth-dark">{plan.hasMapHighlight ? 'Sim' : 'Não'}</strong></p>
                  </div>

                  <div className="pt-2">
                    <p className="text-[9px] uppercase tracking-wider font-bold text-earth-gray">Funcionalidades:</p>
                    <ul className="list-disc pl-3 text-[10px] text-earth-dark space-y-0.5 mt-1 leading-normal">
                      {plan.features.slice(0, 4).map((f, i) => (
                        <li key={i}>{f}</li>
                      ))}
                      {plan.features.length > 4 && (
                        <li className="text-[9px] text-terracotta font-bold list-none">+ {plan.features.length - 4} adicionais</li>
                      )}
                    </ul>
                  </div>
                </div>

                <div className="pt-3 border-t border-clay-border/20 flex justify-end">
                  <button
                    type="button"
                    onClick={() => startEditPlan(plan)}
                    className="px-3 py-1.5 bg-sand-card hover:bg-clay-bg border border-clay-border text-earth-dark rounded-lg font-bold flex items-center gap-1 cursor-pointer text-[10px]"
                  >
                    <Settings className="w-3.5 h-3.5 text-terracotta" />
                    Editar Plano
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUB-TAB: SUGGESTED SPACES (INDICADOS - NOVO CONCEITO) */}
      {activeAdminSubTab === 'suggested' && (
        <div className="space-y-4 animate-fadeIn">
          <div className="p-4 bg-sand-bg/40 border border-sand-border rounded-xl">
            <h3 className="text-xs font-bold text-sienna uppercase tracking-wider font-serif">Estabelecimentos Indicados pela Comunidade</h3>
            <p className="text-[11px] text-earth-gray leading-relaxed mt-1">
              Estes estabelecimentos foram recomendados por terceiros. <strong>Eles não aparecem no mapa nacional</strong> até que o proprietário oficial confirme o convite e atualize os dados gratuitamente. Use o botão abaixo para simular o envio de convite via WhatsApp ou E-mail.
            </p>
          </div>

          {suggestedSpaces.length > 0 ? (
            <div className="space-y-3">
              {suggestedSpaces.map((space) => (
                <div key={space.id} className="p-4 border border-clay-border/60 bg-white rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-xs">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h4 className="font-bold text-sm text-earth-dark leading-tight">{space.name}</h4>
                      <span className="text-[9px] bg-sand-card text-terracotta px-2 py-0.5 rounded border border-sand-border font-bold uppercase">
                        {space.category}
                      </span>
                      {space.invitedStatus === 'invited' && (
                        <span className="text-[9px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded border border-emerald-100 font-bold flex items-center gap-0.5">
                          <Check className="w-3 h-3" /> Convite Enviado
                        </span>
                      )}
                    </div>
                    <p className="text-earth-gray font-medium text-[11px]">
                      📍 {space.city} - {space.state} ({space.neighborhood})
                    </p>
                    <p className="text-[11px] text-earth-gray">
                      Contato do Espaço: <strong className="text-terracotta">{space.contact}</strong>
                    </p>
                    <p className="text-[10px] text-gray-400 italic">
                      Recomendado por: <strong className="text-earth-dark font-semibold">{space.suggestedBy}</strong> em {space.date}
                    </p>
                  </div>

                  <div className="flex gap-2 w-full md:w-auto justify-end">
                    <button
                      type="button"
                      onClick={() => onRemoveSuggestedSpace(space.id)}
                      className="p-1.5 rounded-lg border border-gray-200 text-gray-400 hover:text-red-500 hover:bg-red-50 cursor-pointer transition-all"
                      title="Excluir Indicação"
                    >
                      <Trash className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => triggerSimulatedInvite(space)}
                      className={`px-3 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1 transition-all cursor-pointer ${
                        space.invitedStatus === 'invited'
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
                          : 'bg-terracotta hover:bg-sienna text-white shadow-sm'
                      }`}
                    >
                      <Mail className="w-3.5 h-3.5" />
                      {space.invitedStatus === 'invited' ? 'Re-enviar Convite' : 'Enviar Convite Oficial'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-gray-50 border border-dashed border-clay-border rounded-xl text-earth-gray">
              Nenhum estabelecimento indicado na fila no momento.
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB: CLAIM VERIFICATION REQUESTS */}
      {activeAdminSubTab === 'claims' && (
        <div className="space-y-4 animate-fadeIn">
          <div>
            <h3 className="text-xs font-bold text-sienna uppercase tracking-wider font-serif">Auditar Reivindicações Oficiais</h3>
            <p className="text-[11px] text-earth-gray">
              Quando um proprietário encontra seu espaço no mapa e reivindica o perfil com documentos, ele aguarda aprovação da moderação para liberar o painel de edição.
            </p>
          </div>

          {establishments.filter(e => e.claimed && !e.isPremium && e.id !== 'e1' && e.id !== 'e2').length > 0 ? (
            <div className="space-y-3">
              {establishments.filter(e => e.claimed && !e.isPremium && e.id !== 'e1' && e.id !== 'e2').map((est) => (
                <div key={est.id} className="p-4 border border-clay-border bg-sand-card/30 rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-xs font-sans">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5">
                      <h4 className="font-bold text-sm text-earth-dark">{est.name}</h4>
                      <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-bold">
                        Aguardando Auditoria
                      </span>
                    </div>
                    <p className="text-earth-gray font-medium">
                      📍 {est.city} - {est.state} ({est.neighborhood})
                    </p>
                    <p className="text-earth-gray text-[11px]">
                      Instagram: <strong className="text-terracotta">{est.instagram}</strong> | WhatsApp: <strong className="text-terracotta">{est.whatsapp}</strong>
                    </p>
                  </div>

                  <div className="flex gap-2 w-full md:w-auto justify-end">
                    <button 
                      onClick={() => onRejectClaim(est.id)}
                      className="px-3 py-1.5 rounded-lg border border-clay-border text-earth-dark hover:bg-gray-100 text-xs font-semibold cursor-pointer"
                    >
                      Recusar
                    </button>
                    <button 
                      onClick={() => onApproveClaim(est.id)}
                      className="px-3.5 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 text-xs font-bold cursor-pointer shadow-sm"
                    >
                      Aprovar e Liberar Painel
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-gray-50 border border-dashed border-clay-border rounded-xl text-earth-gray">
              Nenhuma reivindicação oficial pendente de verificação.
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB: ASSINANTES (MONETIZATION & PLANS ATTACHMENT) */}
      {activeAdminSubTab === 'subscribers' && (
        <div className="space-y-4 animate-fadeIn">
          <div>
            <h3 className="text-xs font-bold text-sienna uppercase tracking-wider font-serif">Membros Cadastrados e Nível de Assinatura</h3>
            <p className="text-[11px] text-earth-gray">
              Promova ou mude o plano comercial ativo de qualquer espaço oficial cadastrado na plataforma.
            </p>
          </div>

          <div className="border border-clay-border rounded-xl overflow-hidden bg-white shadow-sm overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-gray-50 text-earth-gray border-b border-clay-border uppercase tracking-wider text-[10px] font-bold">
                  <th className="py-2.5 px-3">Ateliê</th>
                  <th className="py-2.5 px-3">Cidade/UF</th>
                  <th className="py-2.5 px-3">Plano Atual</th>
                  <th className="py-2.5 px-3">Preço Configurado</th>
                  <th className="py-2.5 px-3 text-right">Alterar Plano</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {establishments.map((est) => {
                  // Determine active tier
                  const activeTier: PlanTier = est.planTier || (est.isPremium ? 'atelie' : 'gratuito');
                  const currentPlan = plans.find(p => p.id === activeTier) || plans[0];

                  return (
                    <tr key={est.id} className="hover:bg-gray-50/50">
                      <td className="py-3 px-3 font-semibold text-earth-dark">{est.name}</td>
                      <td className="py-3 px-3">{est.city} - {est.state}</td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border uppercase ${
                          activeTier === 'gratuito' 
                            ? 'bg-gray-50 text-gray-600 border-gray-200'
                            : activeTier === 'atelie'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : activeTier === 'estudio'
                            ? 'bg-purple-50 text-purple-700 border-purple-200'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        }`}>
                          {currentPlan.name}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono font-extrabold text-emerald-800">
                        R$ {currentPlan.price.toFixed(2)}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <select
                          value={activeTier}
                          onChange={(e) => {
                            const selectedTier = e.target.value as PlanTier;
                            onUpdateEstablishmentPlan(est.id, selectedTier);
                          }}
                          className="p-1 rounded border border-clay-border bg-white text-[10px] font-bold text-earth-dark focus:outline-none focus:border-terracotta"
                        >
                          <option value="gratuito">Gratuito</option>
                          <option value="atelie">Ateliê</option>
                          <option value="estudio">Estúdio</option>
                          <option value="institucional">Institucional</option>
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB-TAB: DUPLICITIES AUDITING (CRITICAL SECURITY) */}
      {activeAdminSubTab === 'duplicates' && (
        <div className="space-y-4 animate-fadeIn">
          <div className="p-4 bg-amber-50/30 border border-amber-200 rounded-xl">
            <h3 className="text-xs font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1.5 font-serif">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" /> Auditoria Avançada de Duplicidades Suspeitas
            </h3>
            <p className="text-[11px] text-amber-800 leading-relaxed mt-1">
              O sistema compara automaticamente dados como <strong>E-mail, Instagram, WhatsApp, telefone, CNPJ, endereço</strong> e <strong>coordenadas geográficas</strong>. Nomes idênticos em cidades ou bairros distintos <strong>NÃO</strong> são travados, pois representam negócios diferentes. Use os botões para aprovar como legítimo ou mesclar.
            </p>
          </div>

          {activeDuplicates.length > 0 ? (
            <div className="space-y-3">
              {activeDuplicates.map((est) => (
                <div key={est.id} className="p-4 border-2 border-dashed border-amber-200 bg-amber-50/10 rounded-xl space-y-3 text-xs">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-sm text-earth-dark">{est.name}</h4>
                      <p className="text-earth-gray font-medium">📍 {est.city} - {est.state} | {est.neighborhood} - {est.address}</p>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-bold uppercase text-[9px]">
                      Suspeita de Duplicidade
                    </span>
                  </div>

                  <div className="p-2.5 bg-white border border-clay-border/40 rounded-lg space-y-1.5 text-earth-gray text-[11px]">
                    <p><strong>Gatilhos Encontrados:</strong> Outro cadastro compartilha o contato <span className="text-terracotta font-semibold font-mono">{est.instagram}</span> ou <span className="text-terracotta font-semibold font-mono">{est.whatsapp}</span> na mesma região.</p>
                    <p className="text-[10px] text-gray-400"><strong>Regra de Negócio:</strong> Nunca excluímos automaticamente. A moderação decide se são unidades filiais do mesmo proprietário ou duplicatas acidentais.</p>
                  </div>

                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        // Mark as approved/distinct
                        setApprovedDistinctIds(prev => [...prev, est.id]);
                      }}
                      className="px-3 py-1.5 rounded-lg border border-emerald-500 text-emerald-700 hover:bg-emerald-50 font-bold text-[10px] cursor-pointer"
                    >
                      Aprovar como Estabelecimento Distinto
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        // Reject/Delete
                        onRejectClaim(est.id);
                      }}
                      className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold text-[10px] cursor-pointer"
                    >
                      Mesclar / Remover Duplicata
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-gray-50 border border-dashed border-clay-border rounded-xl text-earth-gray">
              Excelente! Nenhum conflito de duplicidade suspeita pendente de análise.
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB: GOOGLE SHEETS INTEGRATIONS (OFFICIAL DATA SOURCE) */}
      {activeAdminSubTab === 'integrations' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Card: Status and Info */}
          <div className="p-4 bg-emerald-50/30 border border-emerald-200 rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="space-y-1">
              <h3 className="text-xs font-bold text-emerald-900 uppercase tracking-wider flex items-center gap-1.5 font-serif">
                <RefreshCw className="w-4 h-4 text-emerald-600 animate-spin-slow" /> Módulo de Integração com Google Sheets
              </h3>
              <p className="text-[11px] text-emerald-800 leading-relaxed">
                Importe e sincronize automaticamente os cadastros realizados no Guia Colaborativo da Cerâmica como Perfis Importados oficiais.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                formStatus === 'active' 
                  ? 'bg-emerald-100 text-emerald-800' 
                  : 'bg-red-100 text-red-800'
              }`}>
                ● {formStatus === 'active' ? 'Ativa' : 'Inativa'}
              </span>
            </div>
          </div>

          {showSuccessBanner && (
            <div className="p-3 bg-emerald-100 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-lg animate-fadeIn flex items-center gap-2">
              <ShieldCheck className="w-4 h-4" /> Configurações de sincronização salvas com sucesso no banco administrativo!
            </div>
          )}

          <form onSubmit={handleSaveConfig} className="grid grid-cols-1 md:grid-cols-2 gap-5 bg-[#FAF9F5] p-5 rounded-xl border border-clay-border/40">
            <div className="space-y-4">
              <div>
                <label className="block text-gray-700 font-bold mb-1 text-xs">URL do Google Sheets *</label>
                <input 
                  type="text"
                  required
                  value={formUrl}
                  onChange={handleUrlChange}
                  className="w-full p-2.5 rounded-lg border border-clay-border bg-white text-earth-dark focus:outline-none focus:border-terracotta focus:ring-1 focus:ring-terracotta text-xs"
                  placeholder="Ex: https://docs.google.com/spreadsheets/d/.../edit"
                />
                <p className="text-[10px] text-earth-gray mt-1">Insira o link completo da planilha. O ID é extraído automaticamente.</p>
              </div>

              <div>
                <label className="block text-gray-700 font-bold mb-1 text-xs">ID da Planilha (Extraído)</label>
                <input 
                  type="text"
                  readOnly
                  disabled
                  value={formSpreadsheetId}
                  className="w-full p-2.5 rounded-lg border border-clay-border bg-gray-50 text-gray-500 font-mono text-xs"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-bold mb-1 text-xs">Nome da Aba (Sheet Name)</label>
                <input 
                  type="text"
                  value={formSheetName}
                  onChange={(e) => setFormSheetName(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-clay-border bg-white text-earth-dark focus:outline-none focus:border-terracotta text-xs"
                  placeholder="Ex: Respostas do formulário 1"
                />
                <p className="text-[10px] text-earth-gray mt-1">Caso em branco, utiliza a primeira aba da planilha.</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-gray-700 font-bold mb-1 text-xs">Método de Sincronização</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormSyncMethod('automatic')}
                    className={`p-3 rounded-lg border text-left flex flex-col justify-between transition-all cursor-pointer ${
                      formSyncMethod === 'automatic'
                        ? 'border-terracotta bg-white shadow-sm ring-1 ring-terracotta'
                        : 'border-clay-border bg-gray-50 text-gray-500'
                    }`}
                  >
                    <span className="font-bold text-[11px] text-earth-dark">Automático (Cron)</span>
                    <span className="text-[9px] text-earth-gray mt-1">Sincroniza novos dados em background de forma periódica.</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormSyncMethod('manual')}
                    className={`p-3 rounded-lg border text-left flex flex-col justify-between transition-all cursor-pointer ${
                      formSyncMethod === 'manual'
                        ? 'border-terracotta bg-white shadow-sm ring-1 ring-terracotta'
                        : 'border-clay-border bg-gray-50 text-gray-500'
                    }`}
                  >
                    <span className="font-bold text-[11px] text-earth-dark">Manual</span>
                    <span className="text-[9px] text-earth-gray mt-1">Novas linhas só são importadas se o operador clicar no botão.</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-gray-700 font-bold mb-1 text-xs">Frequência de Sincronização</label>
                <select
                  value={formSyncInterval}
                  disabled={formSyncMethod === 'manual'}
                  onChange={(e) => setFormSyncInterval(Number(e.target.value))}
                  className="w-full p-2.5 rounded-lg border border-clay-border bg-white text-earth-dark focus:outline-none focus:border-terracotta disabled:bg-gray-50 disabled:text-gray-400 text-xs"
                >
                  <option value={5}>Cada 5 segundos (Ideais para testes de laboratório)</option>
                  <option value={10}>Cada 10 segundos</option>
                  <option value={30}>Cada 30 segundos</option>
                  <option value={60}>Cada 1 minuto</option>
                  <option value={300}>Cada 5 minutos</option>
                  <option value={1800}>Cada 30 minutos</option>
                  <option value={86400}>Diariamente (24h)</option>
                </select>
              </div>

              <div>
                <label className="block text-gray-700 font-bold mb-1 text-xs">Status da Integração</label>
                <div className="flex gap-4 items-center text-xs mt-1">
                  <label className="flex items-center gap-1.5 cursor-pointer font-bold text-earth-dark">
                    <input 
                      type="radio"
                      name="status"
                      checked={formStatus === 'active'}
                      onChange={() => setFormStatus('active')}
                      className="w-3.5 h-3.5 text-emerald-600 border-gray-300 focus:ring-emerald-500"
                    />
                    Habilitada / Ativa
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer font-bold text-earth-dark">
                    <input 
                      type="radio"
                      name="status"
                      checked={formStatus === 'inactive'}
                      onChange={() => setFormStatus('inactive')}
                      className="w-3.5 h-3.5 text-red-600 border-gray-300 focus:ring-red-500"
                    />
                    Desabilitada / Inativa
                  </label>
                </div>
              </div>
            </div>

            <div className="md:col-span-2 border-t border-clay-border/30 pt-4 flex flex-col sm:flex-row justify-between items-center gap-3">
              <div className="text-[10px] text-earth-gray flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                Segurança: Esta planilha será a fonte oficial durante a transição da plataforma.
              </div>
              <div className="flex gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={handleTriggerLiveSync}
                  disabled={isLiveSyncing || formStatus === 'inactive'}
                  className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl border border-emerald-600 text-emerald-700 hover:bg-emerald-50 disabled:opacity-50 text-[11px] font-bold cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLiveSyncing ? 'animate-spin' : ''}`} />
                  {isLiveSyncing ? 'Sincronizando...' : 'Sincronizar Agora'}
                </button>
                <button
                  type="submit"
                  className="flex-1 sm:flex-initial inline-flex items-center justify-center px-5 py-2 rounded-xl bg-terracotta hover:bg-sienna text-white text-[11px] font-bold shadow-md cursor-pointer"
                >
                  Salvar Configuração
                </button>
              </div>
            </div>
          </form>

          {/* Integration Logs */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-earth-dark uppercase tracking-wider">Histórico de Eventos da Integração</h4>
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {syncLogs.length > 0 ? (
                syncLogs.slice(0, 10).map((log) => (
                  <div key={log.id} className="p-3 border border-clay-border/30 rounded-xl bg-gray-50/50 flex justify-between items-start gap-4">
                    <div className="space-y-1 text-xs">
                      <div className="flex items-center gap-1.5 font-semibold text-earth-dark text-[11px]">
                        <span className={`w-1.5 h-1.5 rounded-full ${log.action.includes('Erro') ? 'bg-red-500' : 'bg-emerald-500'}`} />
                        {log.action}
                      </div>
                      <p className="text-[10px] text-earth-gray">
                        Operador: <span className="font-mono text-earth-dark/70">{log.operator}</span>
                      </p>
                    </div>
                    <div className="text-right text-[10px] text-earth-gray whitespace-nowrap">
                      <span className="font-mono">{log.timestamp}</span>
                      {log.recordsSynced > 0 && (
                        <span className="block text-emerald-700 font-bold mt-1">+{log.recordsSynced} perfis</span>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-earth-gray border border-dashed border-clay-border rounded-xl">
                  Nenhum log de integração registrado ainda.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeAdminSubTab === 'geocoding' && (
        <div className="animate-fadeIn">
          <GeocodingReview 
            establishments={establishments}
            onUpdateEstablishmentCoords={onUpdateEstablishmentCoords}
            onUpdateEstablishment={onUpdateEstablishment}
          />
        </div>
      )}

      {activeAdminSubTab === 'benefits' && (
        <div className="animate-fadeIn">
          <BenefitsModule 
            establishments={establishments}
            onUpdateEstablishmentPlan={onUpdateEstablishmentPlan}
            onUpdateEstablishment={onUpdateEstablishment}
            currentSession={currentSession}
          />
        </div>
      )}

      {/* SUB-TAB: CENTRAL DE HOMOLOGAÇÃO (COMPLEMENTARY REQUIREMENT) */}
      {activeAdminSubTab === 'homologation' && (
        <div className="space-y-6 animate-fadeIn text-xs" id="central-homologacao-module">
          
          {/* Conceptual Header */}
          <div className="p-4 bg-gradient-to-r from-sienna/5 to-terracotta/5 border border-clay-border/50 rounded-2xl flex justify-between items-center flex-wrap gap-4">
            <div className="space-y-1">
              <h3 className="font-serif italic font-bold text-base text-earth-dark">Central de Homologação de Cadastros</h3>
              <p className="text-[11px] text-earth-gray">
                Garantia de autenticidade da rede. Analise os resultados automáticos e atribua o status oficial correspondente.
              </p>
            </div>
            <div className="flex gap-2">
              <span className="px-3 py-1 bg-amber-500 text-white font-bold rounded-lg text-[10px] uppercase">
                {establishments.filter(e => {
                  const ext = e as EstablishmentWithHomologation;
                  return (ext.homologationStatus === 'Cadastro em Análise' || !ext.homologationStatus);
                }).length} em análise
              </span>
              <span className="px-3 py-1 bg-emerald-600 text-white font-bold rounded-lg text-[10px] uppercase">
                {establishments.filter(e => {
                  const ext = e as EstablishmentWithHomologation;
                  return ext.homologationStatus === 'Homologado' || ext.homologationStatus === 'Perfil Oficial';
                }).length} homologados
              </span>
            </div>
          </div>

          {/* Interactive Homologation Area */}
          <div className="space-y-4">
            {establishments.map((est) => {
              const item = est as EstablishmentWithHomologation;
              
              // Fallbacks or default initial values for dynamic validation checks
              const currentStatus: HomologationStatus = item.homologationStatus || 'Perfil Oficial';
              const checklist: HomologationChecklist = item.homologationChecklist || {
                emailConfirmed: item.email ? 'valid' : 'pending',
                phoneConfirmed: item.whatsapp ? 'valid' : 'pending',
                documentValid: item.documentCPF_CNPJ ? 'valid' : 'pending',
                instagramCoherence: item.instagram ? 'valid' : 'pending',
                geolocValid: (item.coordinates[0] !== 0) ? 'valid' : 'failed',
                noDuplicity: 'valid'
              };

              const origin = item.origin || 'importação';
              const responsibleName = item.responsibleName || 'Responsável Não Identificado';
              
              // Color helper for step status dots
              const renderBadge = (status: ValidationStepStatus) => {
                switch(status) {
                  case 'valid': return <span className="inline-flex items-center gap-1 font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100 text-[10px]">🟢 Validada</span>;
                  case 'pending': return <span className="inline-flex items-center gap-1 font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100 text-[10px]">🟡 Pendente</span>;
                  case 'failed': return <span className="inline-flex items-center gap-1 font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded border border-red-100 text-[10px]">🔴 Reprovada</span>;
                  default: return <span className="inline-flex items-center gap-1 font-bold text-gray-500 bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100 text-[10px]">⚪ N/A</span>;
                }
              };

              // Local action helper
              const changeStatus = (newStatus: HomologationStatus, motive: string) => {
                const updatedCheck: HomologationChecklist = { ...checklist };
                if (newStatus === 'Homologado' || newStatus === 'Perfil Oficial') {
                  updatedCheck.emailConfirmed = 'valid';
                  updatedCheck.phoneConfirmed = 'valid';
                  updatedCheck.documentValid = 'valid';
                }
                
                onUpdateEstablishment(item.id, {
                  homologationStatus: newStatus,
                  homologationChecklist: updatedCheck
                } as any);

                onAddAuditLog(
                  `Homologação: Alteração de Status`,
                  `Membro ${item.name} alterado para ${newStatus.toUpperCase()}. Motivo: ${motive}`,
                  item.id,
                  item.name,
                  currentStatus,
                  newStatus
                );
              };

              // Complementation request handler
              const requestInfo = (msg: string) => {
                onUpdateEstablishment(item.id, {
                  homologationStatus: 'Aguardando Complementação',
                  notes: msg
                } as any);

                onAddAuditLog(
                  `Homologação: Solicitação de Ajustes`,
                  `Mensagem enviada: "${msg}"`,
                  item.id,
                  item.name,
                  currentStatus,
                  'Aguardando Complementação'
                );
                alert(`Solicitação de ajustes enviada com sucesso para o e-mail cadastrado em ${item.name}!`);
              };

              return (
                <div key={item.id} className="p-5 bg-white border border-clay-border rounded-2xl shadow-sm hover:shadow-md transition-all space-y-4">
                  
                  {/* Top Row: Brand & Status metadata */}
                  <div className="flex flex-wrap justify-between items-start gap-2 border-b border-clay-border/30 pb-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-serif font-bold text-sm text-earth-dark">{item.name}</h4>
                        <span className="px-2 py-0.5 bg-sand-bg text-sienna border border-sand-border text-[9px] rounded font-black uppercase">
                          {item.category}
                        </span>
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-[9px] rounded font-semibold">
                          Origem: {origin}
                        </span>
                      </div>
                      <p className="text-[11px] text-earth-gray">
                        📍 {item.address} — {item.city}/{item.state} | Responsável: <strong>{responsibleName}</strong>
                      </p>
                    </div>

                    <div className="text-right">
                      <span className={`px-2.5 py-1 text-[10px] font-extrabold uppercase rounded-full border ${
                        currentStatus === 'Homologado' || currentStatus === 'Perfil Oficial'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : currentStatus === 'Cadastro em Análise'
                          ? 'bg-amber-50 text-amber-800 border-amber-200 animate-pulse'
                          : currentStatus === 'Aguardando Complementação'
                          ? 'bg-blue-50 text-blue-800 border-blue-200'
                          : 'bg-red-50 text-red-800 border-red-200'
                      }`}>
                        {currentStatus}
                      </span>
                      {item.notes && (
                        <p className="text-[10px] text-amber-700 italic mt-1.5 max-w-xs text-right">
                          💡 Obs: "{item.notes}"
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Checklist Auto-Verificações */}
                  <div className="grid grid-cols-2 md:grid-cols-6 gap-3 pt-1">
                    <div className="p-2.5 bg-sand-bg/20 rounded-xl border border-clay-border/30 text-center space-y-1">
                      <span className="block text-[9px] font-bold text-earth-gray uppercase">E-mail</span>
                      {renderBadge(checklist.emailConfirmed)}
                    </div>
                    <div className="p-2.5 bg-sand-bg/20 rounded-xl border border-clay-border/30 text-center space-y-1">
                      <span className="block text-[9px] font-bold text-earth-gray uppercase">Telefone</span>
                      {renderBadge(checklist.phoneConfirmed)}
                    </div>
                    <div className="p-2.5 bg-sand-bg/20 rounded-xl border border-clay-border/30 text-center space-y-1">
                      <span className="block text-[9px] font-bold text-earth-gray uppercase">CPF/CNPJ</span>
                      {renderBadge(checklist.documentValid)}
                    </div>
                    <div className="p-2.5 bg-sand-bg/20 rounded-xl border border-clay-border/30 text-center space-y-1">
                      <span className="block text-[9px] font-bold text-earth-gray uppercase">Instagram</span>
                      {renderBadge(checklist.instagramCoherence)}
                    </div>
                    <div className="p-2.5 bg-sand-bg/20 rounded-xl border border-clay-border/30 text-center space-y-1">
                      <span className="block text-[9px] font-bold text-earth-gray uppercase">Geo / Coords</span>
                      {renderBadge(checklist.geolocValid)}
                    </div>
                    <div className="p-2.5 bg-sand-bg/20 rounded-xl border border-clay-border/30 text-center space-y-1">
                      <span className="block text-[9px] font-bold text-earth-gray uppercase">Duplicidades</span>
                      {renderBadge(checklist.noDuplicity)}
                    </div>
                  </div>

                  {/* Actions buttons */}
                  <div className="flex flex-wrap justify-between items-center gap-3 pt-2.5 border-t border-clay-border/20">
                    
                    {/* Quick message request */}
                    <div className="flex items-center gap-1.5 w-full md:w-auto">
                      <input 
                        type="text"
                        placeholder="Mensagem de ajuste (ex: Enviar comprovante)"
                        id={`req_input_${item.id}`}
                        className="p-1.5 border border-clay-border rounded-lg text-xs bg-white text-earth-dark w-48 focus:outline-none focus:border-terracotta"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const val = (document.getElementById(`req_input_${item.id}`) as HTMLInputElement)?.value;
                          if (!val) {
                            alert('Insira uma mensagem explicativa para enviar.');
                            return;
                          }
                          requestInfo(val);
                        }}
                        className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold uppercase text-[9px]"
                      >
                        Solicitar Ajustes
                      </button>
                    </div>

                    {/* Standard decisions buttons */}
                    <div className="flex flex-wrap gap-1.5 justify-end ml-auto">
                      <button
                        type="button"
                        onClick={() => changeStatus('Rejeitado', 'Dados inconsistentes ou suspeitos.')}
                        className="px-2.5 py-1.5 hover:bg-red-50 text-red-600 border border-red-200 rounded-lg font-bold uppercase text-[9px]"
                      >
                        Rejeitar
                      </button>
                      <button
                        type="button"
                        onClick={() => changeStatus('Suspenso', 'Suspenso pela administração.')}
                        className="px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-bold uppercase text-[9px]"
                      >
                        Suspender
                      </button>
                      <button
                        type="button"
                        onClick={() => changeStatus('Arquivado', 'Inatividade ou arquivamento permanente.')}
                        className="px-2.5 py-1.5 text-gray-500 hover:bg-gray-50 border border-gray-200 rounded-lg font-bold uppercase text-[9px]"
                      >
                        Arquivar
                      </button>
                      <button
                        type="button"
                        onClick={() => changeStatus('Homologado', 'Homologação concluída com sucesso.')}
                        className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold uppercase text-[9px] shadow-sm"
                      >
                        Aprovar Cadastro
                      </button>
                    </div>

                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SUB-TAB: EQUIPE & PERMISSÕES (RBAC) */}
      {activeAdminSubTab === 'team' && (
        <div className="space-y-6 animate-fadeIn text-xs" id="equipe-permissoes-module">
          <div className="p-4 bg-[#FAF9F5] border border-clay-border/50 rounded-2xl flex justify-between items-center">
            <div>
              <h3 className="font-serif italic font-bold text-base text-earth-dark">Controle da Equipe Administrativa</h3>
              <p className="text-[11px] text-earth-gray">Convidar colaboradores, gerenciar permissões e auditar acessos corporativos.</p>
            </div>
            <span className="text-[10px] bg-sienna/10 text-sienna border border-sienna/20 px-2.5 py-1 rounded-full font-bold">
              RBAC Ativo
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Column: Add Team Member */}
            <div className="lg:col-span-1 p-5 border border-clay-border rounded-2xl bg-white space-y-4 h-fit">
              <h4 className="font-bold text-sienna uppercase tracking-wide border-b border-clay-border/30 pb-1.5">Convidar Colaborador</h4>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-gray-700 font-bold mb-1">Nome Completo</label>
                  <input 
                    type="text" 
                    id="tm_name"
                    placeholder="Nome do integrante"
                    className="w-full p-2 border border-clay-border rounded-lg text-xs bg-white text-earth-dark"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 font-bold mb-1">E-mail Corporativo</label>
                  <input 
                    type="email" 
                    id="tm_email"
                    placeholder="email@ceramapa.org"
                    className="w-full p-2 border border-clay-border rounded-lg text-xs bg-white text-earth-dark"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 font-bold mb-1">Cargo / Função</label>
                  <select 
                    id="tm_role"
                    className="w-full p-2 border border-clay-border rounded-lg text-xs bg-white text-earth-dark"
                  >
                    <option value="moderator">Moderador Regional</option>
                    <option value="coordinator">Coordenador do Estado</option>
                    <option value="admin">Administrador Geral</option>
                  </select>
                </div>

                <div className="space-y-1.5 pt-1">
                  <label className="block text-gray-700 font-bold">Permissões Específicas</label>
                  <div className="space-y-1">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input type="checkbox" defaultChecked className="w-3.5 h-3.5 text-terracotta" />
                      <span>Homologar cadastros novos</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input type="checkbox" defaultChecked className="w-3.5 h-3.5 text-terracotta" />
                      <span>Revisar geocodificação</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input type="checkbox" className="w-3.5 h-3.5 text-terracotta" />
                      <span>Editar planos comerciais</span>
                    </label>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const nameVal = (document.getElementById('tm_name') as HTMLInputElement)?.value;
                    const emailVal = (document.getElementById('tm_email') as HTMLInputElement)?.value;
                    const roleVal = (document.getElementById('tm_role') as HTMLSelectElement)?.value as UserRole;
                    
                    if (!nameVal || !emailVal) {
                      alert('Preencha os dados do colaborador.');
                      return;
                    }

                    const newMember: TeamMember = {
                      id: 'tm_' + Date.now(),
                      email: emailVal,
                      name: nameVal,
                      role: roleVal,
                      permissions: ['homologate', 'geocoding'],
                      status: 'active',
                      history: [`Convidado por ${currentSession?.name || 'Administrador'}`]
                    };

                    onUpdateTeamMembers([...teamMembers, newMember]);
                    onAddAuditLog('Convidar Colaborador', `Colaborador ${nameVal} convidado com cargo de ${roleVal.toUpperCase()}`);
                    alert(`Colaborador ${nameVal} convidado com sucesso!`);
                    
                    (document.getElementById('tm_name') as HTMLInputElement).value = '';
                    (document.getElementById('tm_email') as HTMLInputElement).value = '';
                  }}
                  className="w-full py-2 bg-sienna hover:bg-earth-dark text-white font-bold rounded-xl text-xs uppercase"
                >
                  Enviar Convite Oficial
                </button>
              </div>
            </div>

            {/* Column: Active Members List */}
            <div className="lg:col-span-2 p-5 border border-clay-border rounded-2xl bg-white space-y-4">
              <h4 className="font-bold text-earth-dark uppercase tracking-wide border-b border-clay-border/30 pb-1.5">Equipe Registrada</h4>

              <div className="space-y-3">
                {teamMembers.map((member) => (
                  <div key={member.id} className="p-3.5 border border-clay-border/40 rounded-xl bg-sand-bg/20 flex justify-between items-center gap-4 flex-wrap">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-earth-dark">{member.name}</span>
                        <span className="text-[8px] bg-terracotta text-white font-extrabold uppercase px-1.5 py-0.5 rounded">
                          {member.role}
                        </span>
                      </div>
                      <p className="text-earth-gray mt-0.5 font-mono text-[10px]">{member.email}</p>
                      
                      <div className="text-[10px] text-gray-400 mt-1">
                        Histórico: {member.history?.join(' | ') || 'Sem registros.'}
                      </div>
                    </div>

                    <div className="flex gap-1.5 items-center">
                      <button
                        type="button"
                        onClick={() => {
                          const updated = teamMembers.map(m => m.id === member.id ? {
                            ...m,
                            status: m.status === 'active' ? 'inactive' : 'active'
                          } as TeamMember : m);
                          onUpdateTeamMembers(updated);
                          onAddAuditLog('Alteração de Acesso', `Membro ${member.name} alterado para status ${member.status === 'active' ? 'INATIVO' : 'ATIVO'}`);
                        }}
                        className={`px-2.5 py-1.5 rounded-lg font-bold text-[10px] ${
                          member.status === 'active'
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : 'bg-red-50 text-red-800 border border-red-200'
                        }`}
                      >
                        {member.status === 'active' ? '🟢 Ativo' : '🔴 Inativo'}
                      </button>
                      
                      {member.role !== 'super_admin' && (
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm(`Deseja remover ${member.name} da equipe?`)) {
                              const updated = teamMembers.filter(m => m.id !== member.id);
                              onUpdateTeamMembers(updated);
                              onAddAuditLog('Remover Colaborador', `Colaborador ${member.name} removido da equipe.`);
                            }
                          }}
                          className="p-1.5 rounded-lg border border-red-200 text-red-500 hover:bg-red-50"
                        >
                          <Trash className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* SUB-TAB: AUDITORIA PERPÉTUA (AUDIT) */}
      {activeAdminSubTab === 'audit' && (
        <div className="space-y-4 animate-fadeIn text-xs" id="auditoria-perpetua-module">
          <div className="p-4 bg-gray-900 border border-gray-800 rounded-2xl flex justify-between items-center text-white flex-wrap gap-4">
            <div>
              <h3 className="font-mono text-emerald-400 font-bold text-sm tracking-widest flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400 animate-pulse" /> SECURITY_GATE: AUDITORIA PERPÉTUA
              </h3>
              <p className="text-[10px] text-gray-400 mt-1">
                Registros inalteráveis e perpétuos de todas as transações, homologações, e configurações administrativas da rede.
              </p>
            </div>
            <span className="text-[9px] bg-red-600 text-white font-black px-2 py-0.5 rounded tracking-widest uppercase">
              IMUTÁVEL
            </span>
          </div>

          <div className="border border-clay-border rounded-2xl overflow-hidden bg-white shadow-sm overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-gray-100 text-earth-dark border-b border-clay-border uppercase tracking-wider text-[9px] font-bold">
                  <th className="py-2.5 px-3">Data/Hora</th>
                  <th className="py-2.5 px-3">Operador</th>
                  <th className="py-2.5 px-3">Ação</th>
                  <th className="py-2.5 px-3">Origem/Alvo</th>
                  <th className="py-2.5 px-3">Valores (Anterior &gt; Novo)</th>
                  <th className="py-2.5 px-3">Notas Técnicas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-sans">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50/40 text-[11px]">
                    <td className="py-2.5 px-3 font-mono text-gray-400 whitespace-nowrap">{log.timestamp}</td>
                    <td className="py-2.5 px-3 font-semibold text-sienna whitespace-nowrap">{log.operatorEmail}</td>
                    <td className="py-2.5 px-3 font-bold text-earth-dark whitespace-nowrap">
                      <span className="px-1.5 py-0.5 bg-clay-bg/40 border border-clay-border rounded">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-earth-dark whitespace-nowrap">{log.targetName || 'Plataforma Global'}</td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      {log.previousValue ? (
                        <span className="font-mono text-gray-400 text-[10px]">
                          {log.previousValue} &rarr; <strong className="text-emerald-700">{log.newValue}</strong>
                        </span>
                      ) : (
                        <span className="text-gray-400 italic">N/A</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-earth-gray italic leading-normal max-w-xs truncate" title={log.notes}>
                      {log.notes || 'Nenhuma nota informada.'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB-TAB: CONFIGURAÇÕES DO SISTEMA (SETTINGS) */}
      {activeAdminSubTab === 'settings' && (
        <div className="space-y-6 animate-fadeIn text-xs" id="configuracoes-sistema-module">
          <div className="p-4 bg-sand-bg/40 border border-sand-border rounded-2xl">
            <h3 className="font-serif italic font-bold text-base text-earth-dark">Configurações Gerais de Operação</h3>
            <p className="text-[11px] text-earth-gray mt-0.5">Ajuste os parâmetros de validação, limites de rede e taxas comerciais sem encostar no código.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Box: Network Rules */}
            <div className="p-5 border border-clay-border rounded-2xl bg-white space-y-4">
              <h4 className="font-bold text-sienna uppercase tracking-wide border-b border-clay-border/30 pb-1 flex items-center gap-1">
                🛡️ Regras de Validação & Segurança
              </h4>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-bold text-earth-dark">Exigir E-mail Confirmado</p>
                    <p className="text-[10px] text-earth-gray">O perfil só pode ser homologado após o usuário confirmar o e-mail principal.</p>
                  </div>
                  <input type="checkbox" defaultChecked className="w-4.5 h-4.5 text-terracotta rounded" />
                </div>

                <div className="flex justify-between items-center pt-2 border-t border-sand-bg">
                  <div>
                    <p className="font-bold text-earth-dark">Habilitar Cadastro de Espaços</p>
                    <p className="text-[10px] text-earth-gray">Permitir que usuários façam novos registros a partir do formulário público.</p>
                  </div>
                  <input type="checkbox" defaultChecked className="w-4.5 h-4.5 text-terracotta rounded" />
                </div>

                <div className="flex justify-between items-center pt-2 border-t border-sand-bg">
                  <div>
                    <p className="font-bold text-earth-dark">Auditoria de Duplicidades em Tempo Real</p>
                    <p className="text-[10px] text-earth-gray">Bloqueia cadastros duplicados com o mesmo WhatsApp ou Instagram antes da homologação.</p>
                  </div>
                  <input type="checkbox" defaultChecked className="w-4.5 h-4.5 text-terracotta rounded" />
                </div>
              </div>
            </div>

            {/* Box: Commercial parameters */}
            <div className="p-5 border border-clay-border rounded-2xl bg-white space-y-4">
              <h4 className="font-bold text-sienna uppercase tracking-wide border-b border-clay-border/30 pb-1 flex items-center gap-1">
                💸 Parâmetros Comerciais & Taxas
              </h4>

              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-gray-700 font-bold mb-1">Taxa de Adesão Premium</label>
                    <input type="text" defaultValue="R$ 49,90" className="p-2 border border-clay-border rounded-lg text-xs w-full bg-white text-earth-dark" />
                  </div>
                  <div>
                    <label className="block text-gray-700 font-bold mb-1">Moeda da Plataforma</label>
                    <input type="text" defaultValue="BRL (Real)" readOnly className="p-2 border border-clay-border rounded-lg text-xs w-full bg-gray-100 text-gray-500 font-bold" />
                  </div>
                </div>

                <div>
                  <label className="block text-gray-700 font-bold mb-1">Contato de Suporte Comercial</label>
                  <input type="text" defaultValue="comercial@ceramapa.org" className="p-2 border border-clay-border rounded-lg text-xs w-full bg-white text-earth-dark" />
                </div>

                <button
                  type="button"
                  onClick={() => {
                    onAddAuditLog('Configurações Globais', 'Parâmetros comerciais e taxas do sistema atualizados.');
                    alert('Parâmetros operacionais atualizados com sucesso no banco administrativo!');
                  }}
                  className="w-full py-2 bg-earth-dark hover:bg-earth-dark/95 text-white font-bold rounded-xl text-xs uppercase"
                >
                  Salvar Parâmetros
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* SIMULATED INVITATION DETAIL MODAL OVERLAY */}
      {inviteModalSpace && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[9999] animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 border border-clay-border shadow-2xl relative">
            <button 
              onClick={() => setInviteModalSpace(null)}
              className="absolute top-4 right-4 p-1 rounded-full text-earth-gray hover:text-earth-dark hover:bg-sand-bg transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2 border-b border-clay-border/40 pb-3">
              <span className="p-2 rounded-lg bg-emerald-50 text-emerald-700">
                <Send className="w-5 h-5 animate-pulse" />
              </span>
              <div>
                <h4 className="font-bold text-sm text-earth-dark">Convite de Participação Enviado</h4>
                <p className="text-[10px] text-earth-gray">Simulação de canais de notificação em tempo real</p>
              </div>
            </div>

            <div className="space-y-3 text-xs leading-relaxed text-earth-gray">
              <p>O proprietário de <strong>{inviteModalSpace.name}</strong> recebeu as instruções de convite.</p>
              
              {/* WhatsApp Message Template */}
              <div className="p-3 bg-emerald-50/50 border border-emerald-100 rounded-xl space-y-1">
                <span className="text-[9px] uppercase font-bold tracking-wider text-emerald-800 flex items-center gap-1">
                  <MessageSquare className="w-3 h-3 text-[#25D366]" /> Template WhatsApp Enviado:
                </span>
                <p className="text-[11px] text-emerald-950 italic leading-snug">
                  "Olá! Seu espaço '{inviteModalSpace.name}' foi indicado pela nossa comunidade de cerâmica no Brasil. Gostaríamos de convidá-lo a publicar gratuitamente seu Perfil Oficial no mapa nacional. O cadastro é rápido e 100% gratuito. Clique aqui para ativar: https://ceramapa.org/confirm?id={inviteModalSpace.id}"
                </p>
              </div>

              {/* Email Message Template */}
              <div className="p-3 bg-gray-50 border border-clay-border/40 rounded-xl space-y-1">
                <span className="text-[9px] uppercase font-bold tracking-wider text-earth-dark flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5 text-terracotta" /> Template E-mail Enviado:
                </span>
                <p className="text-[11px] text-earth-dark italic leading-snug">
                  <strong>Assunto:</strong> Convite Especial: Publique seu Ateliê no CeraMapa Brasil<br/>
                  "Prezado artista, seu espaço foi indicado como uma referência em {inviteModalSpace.city}. Para manter a qualidade e segurança de nossa rede de cerâmica, permitimos que apenas os proprietários oficiais publiquem seus perfis públicos. Crie seu cadastro gratuito hoje mesmo..."
                </p>
              </div>
            </div>

            <button
              onClick={() => setInviteModalSpace(null)}
              className="w-full py-2.5 rounded-xl bg-earth-dark hover:bg-earth-dark/95 text-white font-bold text-center text-xs transition-all cursor-pointer shadow-md uppercase tracking-wider"
            >
              Fechar Visualização de Simulação
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
