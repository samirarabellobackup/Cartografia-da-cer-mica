import React, { useState } from 'react';
import { 
  Award, ShieldCheck, FileText, Check, X, Sparkles, Plus, Trash, Edit, DollarSign,
  TrendingUp, Calendar, Layers, Eye, Users, Search, HelpCircle, FileDown, Briefcase
} from 'lucide-react';
import { BenefitProgram, BenefitConcession, BenefitAuditLog, Establishment, PlanTier, UserSession } from '../types';

interface BenefitsModuleProps {
  establishments: Establishment[];
  onUpdateEstablishmentPlan: (estId: string, plan: PlanTier) => void;
  onUpdateEstablishment: (estId: string, updates: Partial<Establishment>) => void;
  currentSession?: UserSession | null;
}

// Initial Mock Programs
const INITIAL_PROGRAMS: BenefitProgram[] = [
  {
    id: 'prog_1',
    name: 'Bolsa para Mestres da Cultura Popular',
    description: 'Isenção total do Plano Estúdio para artesãos e ceramistas que preservam a técnica tradicional brasileira.',
    objective: 'Salvaguardar técnicas ancestrais e tradicionais da cerâmica brasileira.',
    category: '🎨 Bolsa para Mestres da Cultura',
    type: 'exemption',
    planTier: 'estudio',
    expirationDate: '2027-12-31',
    maxBeneficiaries: 50,
    eligibilityCriteria: 'Idade mínima 50 anos, autodeclaração, portfólio comprovando técnica tradicional ou popular brasileira.',
    renowable: true,
    notes: 'Incentivo integral apoiado pelo comitê gestor do CeraMapa Brasil.'
  },
  {
    id: 'prog_2',
    name: 'Convênio Universidade Federal de Belas Artes',
    description: 'Desconto percentual de 50% em qualquer plano pago para professores e departamentos acadêmicos vinculados à universidade.',
    objective: 'Promover a pesquisa acadêmica de design cerâmico nas universidades brasileiras.',
    category: '💼 Convênio',
    type: 'percentage',
    discountPercent: 50,
    planTier: 'institucional',
    expirationDate: '2028-06-30',
    maxBeneficiaries: 20,
    eligibilityCriteria: 'Vinculação ativa como docente ou laboratório de cerâmica da universidade conveniada.',
    renowable: true,
    covenantPartner: 'Universidade Federal de Belas Artes (UFBA)',
    notes: 'Certificado de convênio renovado anualmente pelo comitê administrativo.'
  },
  {
    id: 'prog_3',
    name: 'Plano Patrocinado por Massa Cerâmica São José',
    description: 'A fabricante São José patrocina 30 bolsas anuais gratuitas no Plano Ateliê para ateliês em vulnerabilidade social ou iniciantes.',
    objective: 'Fomento do empreendedorismo na cerâmica de baixa renda.',
    category: '⭐ Plano Patrocinado',
    type: 'sponsored',
    planTier: 'atelie',
    expirationDate: '2026-12-31',
    maxBeneficiaries: 30,
    eligibilityCriteria: 'Ateliês com faturamento menor de 3 salários mínimos ou iniciantes com menos de 1 ano de CNPJ.',
    renowable: false,
    sponsor: 'Massa Cerâmica São José S.A.',
    notes: 'Parceria de fornecimento estratégico de insumos e visibilidade no mapa.'
  },
  {
    id: 'prog_4',
    name: 'Isenção Cultural para Museus e Patrimônio',
    description: 'Isenção perpétua de 100% no Plano Institucional para museus de utilidade pública ou coleções arqueológicas e históricas.',
    objective: 'Mapear e dar visibilidade digital ao patrimônio cultural e arqueológico de cerâmica do país.',
    category: '🏺 Benefício para Museus e Patrimônio',
    type: 'perm_free',
    planTier: 'institucional',
    maxBeneficiaries: 100,
    eligibilityCriteria: 'Cadastro público ativo como Museu, Centro de Memória ou instituição tombada pelo IPHAN.',
    renowable: true,
    notes: 'Integração direta com o projeto de catalogação museológica nacional.'
  }
];

// Initial mock concession requests
const INITIAL_CONCESSIONS: BenefitConcession[] = [
  {
    id: 'con_1',
    programId: 'prog_1',
    establishmentId: 'e2', // Cerâmica de Cunha
    status: 'approved',
    dateRequested: '2026-06-25',
    dateApproved: '2026-06-26',
    concessionMethod: 'manual',
    documentsSubmitted: ['declaracao_mestre_cultura.pdf', 'portfolia_cunha.pdf'],
    justification: 'Artesão renomado mantendo queimas tradicionais há mais de 35 anos.'
  },
  {
    id: 'con_2',
    programId: 'prog_4',
    establishmentId: 'e4', // Ateliê Casa da Argila (simulando museu cadastrado)
    status: 'pending',
    dateRequested: '2026-06-29',
    concessionMethod: 'user_request',
    documentsSubmitted: ['documento_museologico.pdf', 'estatuto_ong.pdf'],
    justification: 'Solicitação de Isenção Cultural para espaço que mantém acervo público de cerâmica de barro indígena.'
  }
];

// Initial mock audits
const INITIAL_AUDITS: BenefitAuditLog[] = [
  {
    id: 'aud_1',
    adminEmail: 'samirarabello.backup@gmail.com',
    timestamp: '2026-06-26 14:32:10',
    programName: 'Bolsa para Mestres da Cultura Popular',
    action: 'Aprovação de Concessão',
    rationale: 'Portfólio aprovado em comitê. Concedida isenção integral no plano Estúdio.',
    targetProfileName: 'Ateliê de Cunha'
  },
  {
    id: 'aud_2',
    adminEmail: 'samirarabello.backup@gmail.com',
    timestamp: '2026-06-29 09:15:45',
    programName: 'Isenção Cultural para Museus e Patrimônio',
    action: 'Criação de Programa',
    rationale: 'Novo edital para mapear instituições públicas de cerâmica.',
    targetProfileName: 'Sistema Geral de Museus'
  }
];

export default function BenefitsModule({
  establishments,
  onUpdateEstablishmentPlan,
  onUpdateEstablishment,
  currentSession
}: BenefitsModuleProps) {
  const [programs, setPrograms] = useState<BenefitProgram[]>(() => {
    const saved = localStorage.getItem('ceramapa_benefit_programs');
    return saved ? JSON.parse(saved) : INITIAL_PROGRAMS;
  });

  const [concessions, setConcessions] = useState<BenefitConcession[]>(() => {
    const saved = localStorage.getItem('ceramapa_benefit_concessions');
    return saved ? JSON.parse(saved) : INITIAL_CONCESSIONS;
  });

  const [auditLogs, setAuditLogs] = useState<BenefitAuditLog[]>(() => {
    const saved = localStorage.getItem('ceramapa_benefit_audit_logs');
    return saved ? JSON.parse(saved) : INITIAL_AUDITS;
  });

  const [activeTab, setActiveTab] = useState<'programs' | 'requests' | 'reports' | 'audit'>('programs');

  // Form states to create program
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newObj, setNewObj] = useState('');
  const [newCat, setNewCat] = useState('🎓 Bolsa Institucional');
  const [newType, setNewType] = useState<BenefitProgram['type']>('exemption');
  const [newPlan, setNewPlan] = useState<PlanTier>('atelie');
  const [newDiscountPct, setNewDiscountPct] = useState<number>(100);
  const [newDiscountVal, setNewDiscountVal] = useState<number>(0);
  const [newSponsor, setNewSponsor] = useState('');
  const [newCovenant, setNewCovenant] = useState('');
  const [newCriteria, setNewCriteria] = useState('');
  const [newExpiration, setNewExpiration] = useState('');
  const [newMaxBeneficiaries, setNewMaxBeneficiaries] = useState(50);

  // Filter lists
  const availableCategories = [
    '🎓 Bolsa Institucional',
    '🏛️ Isenção Cultural',
    '🤝 Parceria',
    '🌱 Programa de Incentivo',
    '🎨 Bolsa para Mestres da Cultura',
    '🏺 Benefício para Museus e Patrimônio',
    '📚 Benefício para Instituições de Ensino',
    '🌍 Programa de Internacionalização',
    '💼 Convênio',
    '⭐ Plano Patrocinado',
    '🎭 Programa de Apoio à Cultura',
    '🧱 Programa de Fortalecimento da Cerâmica Brasileira'
  ];

  const handleSaveProgram = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    const nextProgram: BenefitProgram = {
      id: `prog_${Date.now()}`,
      name: newName,
      description: newDesc,
      objective: newObj,
      category: newCat,
      type: newType,
      planTier: newPlan,
      discountPercent: newType === 'percentage' ? newDiscountPct : undefined,
      discountValue: newType === 'fixed' ? newDiscountVal : undefined,
      sponsor: newType === 'sponsored' ? newSponsor : undefined,
      covenantPartner: newType === 'covenant' ? newCovenant : undefined,
      eligibilityCriteria: newCriteria || 'Análise de portfólio e autodeclaração.',
      expirationDate: newExpiration || undefined,
      maxBeneficiaries: newMaxBeneficiaries,
      renowable: true
    };

    const updated = [nextProgram, ...programs];
    setPrograms(updated);
    localStorage.setItem('ceramapa_benefit_programs', JSON.stringify(updated));

    // Audit log
    const nextLog: BenefitAuditLog = {
      id: `aud_${Date.now()}`,
      adminEmail: currentSession?.email || 'samirarabello.backup@gmail.com',
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      programName: newName,
      action: 'Criação de Programa',
      rationale: `Criação do programa de benefício com plano ${newPlan.toUpperCase()}.`,
      targetProfileName: 'Novo Programa Cadastrado'
    };
    const updatedAudits = [nextLog, ...auditLogs];
    setAuditLogs(updatedAudits);
    localStorage.setItem('ceramapa_benefit_audit_logs', JSON.stringify(updatedAudits));

    // Reset Form
    setNewName('');
    setNewDesc('');
    setNewObj('');
    setNewCriteria('');
    setNewExpiration('');
    setNewSponsor('');
    setNewCovenant('');
    setShowAddForm(false);
  };

  const handleApproveConcession = (conId: string, estId: string, progId: string) => {
    const program = programs.find(p => p.id === progId);
    const establishment = establishments.find(e => e.id === estId);
    if (!program || !establishment) return;

    // Apply benefit to establishment in core database
    onUpdateEstablishmentPlan(estId, program.planTier);
    onUpdateEstablishment(estId, {
      benefitId: progId,
      benefitConcession: {
        id: conId,
        programId: progId,
        establishmentId: estId,
        status: 'approved',
        dateRequested: new Date().toISOString().split('T')[0],
        dateApproved: new Date().toISOString().split('T')[0],
        concessionMethod: 'manual',
        justification: 'Elegibilidade confirmada e documentação validada pelo administrador.'
      }
    });

    // Update state
    const updatedConcessions = concessions.map(c => 
      c.id === conId 
        ? { ...c, status: 'approved' as const, dateApproved: new Date().toISOString().split('T')[0] } 
        : c
    );
    setConcessions(updatedConcessions);
    localStorage.setItem('ceramapa_benefit_concessions', JSON.stringify(updatedConcessions));

    // Audit log
    const nextLog: BenefitAuditLog = {
      id: `aud_${Date.now()}`,
      adminEmail: currentSession?.email || 'samirarabello.backup@gmail.com',
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      programName: program.name,
      action: 'Aprovação de Concessão',
      rationale: 'Elegibilidade confirmada e documentação validada com upgrade automático para plano contemplado.',
      targetProfileName: establishment.name
    };
    const updatedAudits = [nextLog, ...auditLogs];
    setAuditLogs(updatedAudits);
    localStorage.setItem('ceramapa_benefit_audit_logs', JSON.stringify(updatedAudits));
  };

  const handleRejectConcession = (conId: string, estId: string, progId: string) => {
    const program = programs.find(p => p.id === progId);
    const establishment = establishments.find(e => e.id === estId);
    if (!program || !establishment) return;

    const updatedConcessions = concessions.map(c => 
      c.id === conId ? { ...c, status: 'rejected' as const } : c
    );
    setConcessions(updatedConcessions);
    localStorage.setItem('ceramapa_benefit_concessions', JSON.stringify(updatedConcessions));

    // Audit log
    const nextLog: BenefitAuditLog = {
      id: `aud_${Date.now()}`,
      adminEmail: currentSession?.email || 'samirarabello.backup@gmail.com',
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      programName: program.name,
      action: 'Recusa de Concessão',
      rationale: 'Documentação pendente ou inconsistência nos critérios de elegibilidade informados.',
      targetProfileName: establishment.name
    };
    const updatedAudits = [nextLog, ...auditLogs];
    setAuditLogs(updatedAudits);
    localStorage.setItem('ceramapa_benefit_audit_logs', JSON.stringify(updatedAudits));
  };

  return (
    <div className="space-y-5 font-sans text-xs text-earth-dark">
      
      {/* Module Title */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-clay-border/30 pb-4">
        <div className="flex items-center gap-2.5">
          <span className="p-2.5 rounded-xl bg-[#6B8E23] border border-olive/20 text-white shadow-sm">
            <Award className="w-5 h-5" />
          </span>
          <div>
            <h2 className="text-base font-bold text-earth-dark tracking-tight">Gestão de Bolsas, Parcerias e Incentivos Culturais</h2>
            <p className="text-[11px] text-earth-gray">Concessão flexível de benefícios para apoiar e fortalecer a comunidade cerâmica nacional</p>
          </div>
        </div>

        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-[#6B8E23] to-[#556B2F] text-white rounded-xl text-[11px] font-bold shadow-md cursor-pointer transition-all hover:brightness-105"
        >
          <Plus className="w-3.5 h-3.5" />
          Novo Programa de Incentivo
        </button>
      </div>

      {/* Local Sub-Navigation tabs */}
      <div className="flex flex-wrap border-b border-clay-border/30 gap-2">
        <button
          onClick={() => { setActiveTab('programs'); setShowAddForm(false); }}
          className={`pb-2 px-3.5 border-b-2 font-bold tracking-wider uppercase transition-all cursor-pointer ${
            activeTab === 'programs' ? 'border-olive text-olive' : 'border-transparent text-earth-dark/60 hover:text-earth-dark'
          }`}
        >
          Programas Ativos ({programs.length})
        </button>
        <button
          onClick={() => { setActiveTab('requests'); setShowAddForm(false); }}
          className={`pb-2 px-3.5 border-b-2 font-bold tracking-wider uppercase transition-all cursor-pointer relative ${
            activeTab === 'requests' ? 'border-olive text-olive' : 'border-transparent text-earth-dark/60 hover:text-earth-dark'
          }`}
        >
          Solicitações Pendentes
          {concessions.filter(c => c.status === 'pending').length > 0 && (
            <span className="absolute -top-1.5 -right-1 bg-red-500 text-white font-black text-[8px] rounded-full w-4.5 h-4.5 flex items-center justify-center border-2 border-white animate-bounce">
              {concessions.filter(c => c.status === 'pending').length}
            </span>
          )}
        </button>
        <button
          onClick={() => { setActiveTab('reports'); setShowAddForm(false); }}
          className={`pb-2 px-3.5 border-b-2 font-bold tracking-wider uppercase transition-all cursor-pointer ${
            activeTab === 'reports' ? 'border-olive text-olive' : 'border-transparent text-earth-dark/60 hover:text-earth-dark'
          }`}
        >
          Relatório de Subsídios
        </button>
        <button
          onClick={() => { setActiveTab('audit'); setShowAddForm(false); }}
          className={`pb-2 px-3.5 border-b-2 font-bold tracking-wider uppercase transition-all cursor-pointer ${
            activeTab === 'audit' ? 'border-olive text-olive' : 'border-transparent text-earth-dark/60 hover:text-earth-dark'
          }`}
        >
          Histórico & Auditoria
        </button>
      </div>

      {/* ADD PROGRAM FORM SCREEN OVERLAY */}
      {showAddForm && (
        <form onSubmit={handleSaveProgram} className="bg-sand-bg/40 border-2 border-[#6B8E23]/30 rounded-2xl p-4.5 space-y-4 animate-slideDown">
          <div className="flex justify-between items-center border-b border-clay-border/30 pb-2">
            <h3 className="font-serif italic font-bold text-earth-dark flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-olive" /> Criar Novo Programa de Apoio e Incentivo
            </h3>
            <button 
              type="button" 
              onClick={() => setShowAddForm(false)}
              className="text-earth-gray hover:text-earth-dark"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-earth-gray mb-1">Nome do Programa de Apoio *</label>
              <input 
                type="text" 
                required 
                placeholder="Ex: Bolsa Jovem Ceramista de Baixa Renda"
                value={newName} 
                onChange={(e) => setNewName(e.target.value)}
                className="w-full p-2.5 rounded-lg border border-clay-border bg-white text-earth-dark focus:border-olive focus:ring-1 focus:ring-olive focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-earth-gray mb-1">Categoria de Incentivo *</label>
              <select
                value={newCat}
                onChange={(e) => setNewCat(e.target.value)}
                className="w-full p-2.5 rounded-lg border border-clay-border bg-white text-earth-dark focus:border-olive focus:ring-1 focus:ring-olive focus:outline-none cursor-pointer font-medium"
              >
                {availableCategories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block font-bold text-earth-gray mb-1">Descrição e Foco *</label>
              <textarea 
                required 
                placeholder="Explique o que este programa cobre e qual é o incentivo concedido..."
                value={newDesc} 
                onChange={(e) => setNewDesc(e.target.value)}
                rows={2}
                className="w-full p-2.5 rounded-lg border border-clay-border bg-white text-earth-dark focus:border-olive focus:ring-1 focus:ring-olive focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-earth-gray mb-1">Objetivo Social / Estratégico *</label>
              <input 
                type="text" 
                required 
                placeholder="Ex: Expandir a representatividade de cerâmica indígena regional."
                value={newObj} 
                onChange={(e) => setNewObj(e.target.value)}
                className="w-full p-2.5 rounded-lg border border-clay-border bg-white text-earth-dark focus:border-olive focus:ring-1 focus:ring-olive focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-earth-gray mb-1">Tipo de Isenção / Bolsa *</label>
              <select
                value={newType}
                onChange={(e) => setNewType(e.target.value as any)}
                className="w-full p-2.5 rounded-lg border border-clay-border bg-white text-earth-dark focus:border-olive focus:ring-1 focus:ring-olive focus:outline-none cursor-pointer font-medium"
              >
                <option value="exemption">Isenção Parcial / Total</option>
                <option value="percentage">Desconto Percentual (%)</option>
                <option value="fixed">Desconto de Valor Fixo (R$)</option>
                <option value="temp_free">Gratuidade Temporária</option>
                <option value="perm_free">Gratuidade Permanente</option>
                <option value="sponsored">Patrocínio Privado de Terceiros</option>
                <option value="covenant">Parceria / Convênio de Cooperação</option>
              </select>
            </div>

            {newType === 'percentage' && (
              <div>
                <label className="block font-bold text-earth-gray mb-1">Percentual de Desconto (%) *</label>
                <input 
                  type="number" 
                  min="1" 
                  max="100" 
                  value={newDiscountPct} 
                  onChange={(e) => setNewDiscountPct(Number(e.target.value))}
                  className="w-full p-2.5 rounded-lg border border-clay-border bg-white text-earth-dark focus:border-olive focus:ring-1 focus:ring-olive focus:outline-none"
                />
              </div>
            )}

            {newType === 'fixed' && (
              <div>
                <label className="block font-bold text-earth-gray mb-1">Valor de Abatimento Fixo (R$ Mensal) *</label>
                <input 
                  type="number" 
                  min="1" 
                  value={newDiscountVal} 
                  onChange={(e) => setNewDiscountVal(Number(e.target.value))}
                  className="w-full p-2.5 rounded-lg border border-clay-border bg-white text-earth-dark focus:border-olive focus:ring-1 focus:ring-olive focus:outline-none"
                />
              </div>
            )}

            {newType === 'sponsored' && (
              <div>
                <label className="block font-bold text-earth-gray mb-1">Empresa Patrocinadora / Mecenas *</label>
                <input 
                  type="text" 
                  required 
                  placeholder="Ex: Fornos Pascoal S/A"
                  value={newSponsor} 
                  onChange={(e) => setNewSponsor(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-clay-border bg-white text-earth-dark focus:border-olive focus:ring-1 focus:ring-olive focus:outline-none"
                />
              </div>
            )}

            {newType === 'covenant' && (
              <div>
                <label className="block font-bold text-earth-gray mb-1">Instituição Conveniada de Ensino / Cultura *</label>
                <input 
                  type="text" 
                  required 
                  placeholder="Ex: Iphan Regional SP ou Escola Estadual"
                  value={newCovenant} 
                  onChange={(e) => setNewCovenant(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-clay-border bg-white text-earth-dark focus:border-olive focus:ring-1 focus:ring-olive focus:outline-none"
                />
              </div>
            )}

            <div>
              <label className="block font-bold text-earth-gray mb-1">Plano Correspondente Concedido *</label>
              <select
                value={newPlan}
                onChange={(e) => setNewPlan(e.target.value as PlanTier)}
                className="w-full p-2.5 rounded-lg border border-clay-border bg-white text-earth-dark focus:border-olive focus:ring-1 focus:ring-olive focus:outline-none cursor-pointer font-medium"
              >
                <option value="atelie">Upgrade para Plano Ateliê (Destaque Básico)</option>
                <option value="estudio">Upgrade para Plano Estúdio (Destaque Intermediário)</option>
                <option value="institucional">Upgrade para Plano Institucional (Destaque Total)</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-earth-gray mb-1">Limite Máximo de Bolsas *</label>
              <input 
                type="number" 
                value={newMaxBeneficiaries} 
                onChange={(e) => setNewMaxBeneficiaries(Number(e.target.value))}
                className="w-full p-2.5 rounded-lg border border-clay-border bg-white text-earth-dark focus:border-olive focus:ring-1 focus:ring-olive focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-earth-gray mb-1">Prazo de Validade / Vigência</label>
              <input 
                type="date" 
                value={newExpiration} 
                onChange={(e) => setNewExpiration(e.target.value)}
                className="w-full p-2.5 rounded-lg border border-clay-border bg-white text-earth-dark focus:border-olive focus:ring-1 focus:ring-olive focus:outline-none"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block font-bold text-earth-gray mb-1">Critérios de Elegibilidade & Documentos *</label>
              <input 
                type="text" 
                required 
                placeholder="Ex: Cadastro de MEI ativo, envio de portfólio comprovando atividades de queima coletiva."
                value={newCriteria} 
                onChange={(e) => setNewCriteria(e.target.value)}
                className="w-full p-2.5 rounded-lg border border-clay-border bg-white text-earth-dark focus:border-olive focus:ring-1 focus:ring-olive focus:outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-clay-border/30">
            <button 
              type="button" 
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold"
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              className="px-5 py-2 rounded-lg bg-gradient-to-r from-olive to-[#556B2F] text-white font-bold"
            >
              Salvar e Publicar Programa
            </button>
          </div>
        </form>
      )}

      {/* TAB 1: PROGRAMS LISTING */}
      {activeTab === 'programs' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {programs.map(prog => (
            <div key={prog.id} className="p-4 bg-white rounded-2xl border border-clay-border/50 hover:border-olive/50 hover:shadow-sm transition-all space-y-3 relative group">
              <div className="flex justify-between items-start gap-2">
                <span className="px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider rounded-full bg-sand-bg border border-clay-border/40 text-olive">
                  {prog.category}
                </span>

                <span className="text-[10px] font-mono font-bold text-earth-gray">
                  Limite: {concessions.filter(c => c.programId === prog.id && c.status === 'approved').length} / {prog.maxBeneficiaries} bolsas
                </span>
              </div>

              <div>
                <h4 className="text-sm font-serif italic font-bold text-earth-dark group-hover:text-olive transition-all">
                  {prog.name}
                </h4>
                <p className="text-[11px] text-earth-gray leading-normal mt-1">
                  {prog.description}
                </p>
              </div>

              <div className="p-2.5 bg-sand-bg/40 border border-clay-border/30 rounded-xl space-y-1.5 text-[10px]">
                <div className="flex justify-between text-earth-gray">
                  <span>Plano Concedido:</span>
                  <span className="font-bold text-earth-dark uppercase">{prog.planTier}</span>
                </div>
                <div className="flex justify-between text-earth-gray">
                  <span>Critério de Entrada:</span>
                  <span className="font-semibold text-earth-dark truncate max-w-[200px]">{prog.eligibilityCriteria}</span>
                </div>
                {prog.sponsor && (
                  <div className="flex justify-between text-earth-gray">
                    <span>Mecenas / Patrocínio:</span>
                    <span className="font-black text-amber-800">{prog.sponsor}</span>
                  </div>
                )}
                {prog.covenantPartner && (
                  <div className="flex justify-between text-earth-gray">
                    <span>Parceiro Conveniado:</span>
                    <span className="font-black text-purple-800">{prog.covenantPartner}</span>
                  </div>
                )}
                <div className="flex justify-between text-earth-gray">
                  <span>Renovável automaticamente:</span>
                  <span className="font-semibold text-earth-dark">{prog.renowable ? 'Sim (Anual)' : 'Não'}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 2: REQUESTS / CONCESSIONS */}
      {activeTab === 'requests' && (
        <div className="space-y-3.5">
          {concessions.filter(c => c.status === 'pending').length === 0 ? (
            <div className="p-8 text-center bg-sand-bg/30 border border-dashed border-clay-border rounded-xl">
              <ShieldCheck className="w-8 h-8 text-emerald-600 mx-auto" />
              <p className="font-serif italic font-semibold text-earth-gray mt-2">Nenhuma solicitação pendente</p>
              <p className="text-[10px] text-earth-gray/70 mt-1">Todos os pedidos de bolsas, isenções e convênios estão processados!</p>
            </div>
          ) : (
            concessions.filter(c => c.status === 'pending').map(con => {
              const program = programs.find(p => p.id === con.programId);
              const est = establishments.find(e => e.id === con.establishmentId);
              if (!program || !est) return null;

              return (
                <div key={con.id} className="p-4 bg-white rounded-2xl border-2 border-[#6B8E23]/20 shadow-sm space-y-3">
                  <div className="flex justify-between items-start gap-2 flex-wrap">
                    <div>
                      <span className="text-[9px] uppercase font-bold text-olive tracking-wider bg-sand-bg px-2 py-0.5 rounded border border-clay-border/40">
                        {program.category}
                      </span>
                      <h4 className="text-xs font-bold text-earth-dark mt-1">
                        Pedido de Bolsa: <span className="font-serif italic font-semibold text-terracotta">{est.name}</span>
                      </h4>
                      <p className="text-[10px] text-earth-gray">Solicitado em: {con.dateRequested} | Origem: {con.concessionMethod === 'user_request' ? 'Formulário do Usuário' : 'Importação / Convênio'}</p>
                    </div>

                    <div className="flex gap-1.5">
                      <button
                        onClick={() => handleRejectConcession(con.id, est.id, program.id)}
                        className="p-1.5 rounded-lg border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 transition-all cursor-pointer"
                        title="Recusar"
                      >
                        <X className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleApproveConcession(con.id, est.id, program.id)}
                        className="p-1.5 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-all cursor-pointer flex items-center gap-1 font-bold text-[10px]"
                        title="Aprovar"
                      >
                        <Check className="w-4 h-4" /> Aprovar Benefício
                      </button>
                    </div>
                  </div>

                  <div className="p-3 bg-sand-bg/40 border border-clay-border/30 rounded-xl space-y-2 text-[10px]">
                    <div>
                      <span className="font-bold text-earth-gray block">Justificativa apresentada:</span>
                      <p className="italic text-earth-dark">"{con.justification}"</p>
                    </div>
                    {con.documentsSubmitted && con.documentsSubmitted.length > 0 && (
                      <div>
                        <span className="font-bold text-earth-gray block mb-1">Documentações enviadas para auditoria (Simuladas):</span>
                        <div className="flex flex-wrap gap-1.5">
                          {con.documentsSubmitted.map(doc => (
                            <span key={doc} className="px-2 py-0.5 rounded bg-white border border-clay-border/50 text-earth-gray font-mono flex items-center gap-1">
                              <FileText className="w-3 h-3 text-olive" /> {doc}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* TAB 3: REPORTS / SUBSIDIES */}
      {activeTab === 'reports' && (
        <div className="space-y-4">
          
          {/* Key Subsidy Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-4 bg-[#6B8E23]/10 border border-olive/20 rounded-2xl">
              <Users className="w-5 h-5 text-olive mb-1" />
              <p className="text-xs text-earth-gray font-medium">Bolsistas Ativos</p>
              <p className="text-xl font-black text-earth-dark leading-none mt-1">
                {concessions.filter(c => c.status === 'approved').length} espaços
              </p>
            </div>
            <div className="p-4 bg-amber-500/10 border border-amber-200 rounded-2xl">
              <DollarSign className="w-5 h-5 text-amber-700 mb-1" />
              <p className="text-xs text-earth-gray font-medium">Valor Total Subsidiado</p>
              <p className="text-xl font-black text-earth-dark leading-none mt-1">
                R$ {concessions.filter(c => c.status === 'approved').length * 79},00 <span className="text-[10px] text-earth-gray font-normal">/ mês</span>
              </p>
            </div>
            <div className="p-4 bg-purple-500/10 border border-purple-200 rounded-2xl">
              <Briefcase className="w-5 h-5 text-purple-700 mb-1" />
              <p className="text-xs text-earth-gray font-medium">Parcerias Conveniadas</p>
              <p className="text-xl font-black text-earth-dark leading-none mt-1">
                {programs.filter(p => p.covenantPartner).length} universidades
              </p>
            </div>
          </div>

          {/* Demographic distribution */}
          <div className="p-4 bg-white border border-clay-border/50 rounded-2xl space-y-3">
            <h4 className="font-serif italic font-bold text-earth-dark flex items-center justify-between">
              <span>Distribuição de Bolsas e Apoios por Estado</span>
              <span className="text-[10px] font-sans font-bold text-olive uppercase tracking-wider">Auditoria de Subsídios</span>
            </h4>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="font-bold text-earth-dark font-mono">São Paulo (SP)</span>
                <span className="text-earth-gray">4 ateliês contemplados</span>
              </div>
              <div className="w-full bg-sand-bg rounded-full h-1.5">
                <div className="bg-[#6B8E23] h-1.5 rounded-full" style={{ width: '80%' }}></div>
              </div>

              <div className="flex justify-between items-center mt-2">
                <span className="font-bold text-earth-dark font-mono">Rio de Janeiro (RJ)</span>
                <span className="text-earth-gray">2 ateliês contemplados</span>
              </div>
              <div className="w-full bg-sand-bg rounded-full h-1.5">
                <div className="bg-olive h-1.5 rounded-full" style={{ width: '40%' }}></div>
              </div>

              <div className="flex justify-between items-center mt-2">
                <span className="font-bold text-earth-dark font-mono">Minas Gerais (MG)</span>
                <span className="text-earth-gray">1 ateliê contemplado</span>
              </div>
              <div className="w-full bg-sand-bg rounded-full h-1.5">
                <div className="bg-olive h-1.5 rounded-full" style={{ width: '20%' }}></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: HISTORIC & AUDITING */}
      {activeTab === 'audit' && (
        <div className="space-y-3">
          <div className="flex justify-between items-center text-[10px] text-earth-gray font-bold uppercase tracking-wider px-0.5">
            <span>Registros de Auditoria: {auditLogs.length}</span>
            <span className="text-olive flex items-center gap-1 font-extrabold"><ShieldCheck className="w-3.5 h-3.5" /> Transações Assinadas</span>
          </div>

          <div className="bg-white border border-clay-border/50 rounded-2xl overflow-hidden divide-y divide-clay-border/30">
            {auditLogs.map(log => (
              <div key={log.id} className="p-3 space-y-1.5 hover:bg-sand-bg/20 transition-all">
                <div className="flex justify-between items-center text-[10px] text-earth-gray font-mono">
                  <span>{log.timestamp}</span>
                  <span className="font-bold text-olive">{log.adminEmail}</span>
                </div>
                <div>
                  <h5 className="font-bold text-earth-dark flex items-center gap-1">
                    <span className="text-[#6B8E23]">[{log.action}]</span> {log.programName}
                  </h5>
                  <p className="text-[11px] text-earth-gray/90 mt-0.5 leading-snug">
                    Rationale: {log.rationale} • Beneficiário: <strong>{log.targetProfileName}</strong>
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
