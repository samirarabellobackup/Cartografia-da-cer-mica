import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  User, Sparkles, Eye, Smartphone, Calendar, ShoppingBag, Plus, 
  Settings, CreditCard, ShieldCheck, Check, Clock, EyeOff, BarChart3, ChevronRight, MapPin 
} from 'lucide-react';
import { Establishment, CeramicEvent, Product, PrivacyLevel, UserSession, EstablishmentRole, EstablishmentTeamMember, EstablishmentWithHomologation } from '../types';

interface UserDashboardProps {
  establishments: Establishment[];
  onUpdateEstablishment: (id: string, updates: Partial<EstablishmentWithHomologation>) => void;
  onUpgradeToPremium: (id: string) => void;
  onAddEventToEstablishment: (estId: string, event: Omit<CeramicEvent, 'id' | 'establishmentId'>) => void;
  onAddProductToEstablishment: (estId: string, product: Omit<Product, 'id'>) => void;
  currentSession: UserSession | null;
  onAddAuditLog?: (action: string, details: string, establishmentId?: string, establishmentName?: string) => void;
}

export default function UserDashboard({
  establishments,
  onUpdateEstablishment,
  onUpgradeToPremium,
  onAddEventToEstablishment,
  onAddProductToEstablishment,
  currentSession,
  onAddAuditLog
}: UserDashboardProps) {
  // Filter only claimed establishments belonging to the user based on active session
  const claimedEsts = establishments.filter((e) => {
    if (!e.claimed) return false;
    if (!currentSession) return false;
    // Admins and Super Admins can see everything
    if (['super_admin', 'admin'].includes(currentSession.role)) {
      return true;
    }
    const estWithH = e as EstablishmentWithHomologation;
    // User is direct owner
    if (estWithH.ownerEmail === currentSession.email || estWithH.ownerId === currentSession.id) {
      return true;
    }
    // User is in the team and active
    if (estWithH.team?.some(t => t.email === currentSession.email && t.status === 'active')) {
      return true;
    }
    // Backward compatibility for newly claimed items that haven't been approved yet
    if (estWithH.claimantEmail === currentSession.email) {
      return true;
    }
    return false;
  });

  const [selectedEstId, setSelectedEstId] = useState<string>(claimedEsts[0]?.id || '');
  const currentEst = establishments.find((e) => e.id === selectedEstId) as EstablishmentWithHomologation | undefined;

  // Helper to determine active user's hierarchical role
  const getUserRoleInEstablishment = (est: EstablishmentWithHomologation | undefined): EstablishmentRole | null => {
    if (!est || !currentSession) return null;
    if (est.ownerEmail === currentSession.email || est.ownerId === currentSession.id) {
      return 'proprietario';
    }
    const teamMember = est.team?.find(t => t.email === currentSession.email && t.status === 'active');
    if (teamMember) {
      return teamMember.role;
    }
    // If super admin, treat as proprietor
    if (['super_admin', 'admin'].includes(currentSession.role)) {
      return 'proprietario';
    }
    return null;
  };

  const userRole = getUserRoleInEstablishment(currentEst);

  // States
  const [isEditing, setIsEditing] = useState(false);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState<'options' | 'pix' | 'card' | 'success'>('options');

  // States for Team Invitation
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<EstablishmentRole>('editor');
  const [inviteError, setInviteError] = useState('');
  const [inviteSuccess, setInviteSuccess] = useState('');

  // States for Ownership Transfer (Owner ID flow)
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferEmail, setTransferEmail] = useState('');
  const [transferPassword, setTransferPassword] = useState('');
  const [transferError, setTransferError] = useState('');
  const [transferSuccess, setTransferSuccess] = useState('');
  const [showMfaStep, setShowMfaStep] = useState(false);
  const [mfaCode, setMfaCode] = useState('');

  // Form states for profile editor
  const [desc, setDesc] = useState(currentEst?.description || '');
  const [longDesc, setLongDesc] = useState(currentEst?.longDescription || '');
  const [privacy, setPrivacy] = useState<PrivacyLevel>(currentEst?.privacy || 'full');
  const [whatsapp, setWhatsapp] = useState(currentEst?.whatsapp || '');
  const [instagram, setInstagram] = useState(currentEst?.instagram || '');
  const [hours, setHours] = useState(currentEst?.hours || '');

  // Form states for adding course/event
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [evTitle, setEvTitle] = useState('');
  const [evType, setEvType] = useState<'curso' | 'workshop' | 'feira' | 'exposicao' | 'encontro' | 'residencia'>('workshop');
  const [evDate, setEvDate] = useState('');
  const [evPrice, setEvPrice] = useState('');
  const [evDesc, setEvDesc] = useState('');

  // Form states for adding product
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [pName, setPName] = useState('');
  const [pPrice, setPPrice] = useState(0);
  const [pDesc, setPDesc] = useState('');
  const [pCat, setPCat] = useState<'argila' | 'esmalte' | 'ferramenta' | 'peca' | 'equipamento' | 'forno'>('peca');

  const handleProfileSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentEst) return;

    const isEditor = userRole === 'editor';
    const isRestricted = userRole === 'colaborador' || userRole === 'financeiro';

    if (isRestricted) {
      alert('Seu nível de acesso atual (Colaborador/Financeiro) não possui autorização para alterar dados cadastrais do estabelecimento.');
      return;
    }

    const updates: Partial<EstablishmentWithHomologation> = {
      description: desc,
      longDescription: longDesc,
      instagram: instagram,
      hours: hours
    };

    if (!isEditor) {
      // Proprietários and Admins can edit structural contacts
      updates.whatsapp = whatsapp;
      updates.privacy = privacy;
    } else {
      // If editor, block phone/privacy alterations and notify
      if (whatsapp !== currentEst.whatsapp || privacy !== currentEst.privacy) {
        alert('Nível Editor: Você não tem permissão para alterar contatos principais (WhatsApp) ou nível de privacidade. Essas alterações foram descartadas.');
      }
    }

    onUpdateEstablishment(currentEst.id, updates);
    setIsEditing(false);

    if (onAddAuditLog) {
      onAddAuditLog(
        'Edição de Perfil',
        `O usuário ${currentSession?.name || 'Membro'} atualizou dados editoriais do espaço. Perfil de acesso: ${userRole?.toUpperCase()}`,
        currentEst.id,
        currentEst.name
      );
    }
  };

  const handleSelectEstablishment = (id: string) => {
    setSelectedEstId(id);
    const selected = establishments.find(e => e.id === id);
    if (selected) {
      setDesc(selected.description);
      setLongDesc(selected.longDescription || '');
      setPrivacy(selected.privacy);
      setWhatsapp(selected.whatsapp);
      setInstagram(selected.instagram);
      setHours(selected.hours || '');
    }
  };

  const handleAddEventSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentEst || !evTitle.trim()) return;

    if (userRole === 'financeiro') {
      alert('Acesso negado: Usuários com o perfil Financeiro não podem criar cursos ou eventos.');
      return;
    }

    onAddEventToEstablishment(currentEst.id, {
      title: evTitle,
      type: evType,
      date: evDate,
      price: evPrice,
      description: evDesc,
      location: 'No ateliê principal'
    });

    setEvTitle('');
    setEvDate('');
    setEvPrice('');
    setEvDesc('');
    setShowAddEvent(false);

    if (onAddAuditLog) {
      onAddAuditLog(
        'Criação de Curso',
        `Curso "${evTitle}" adicionado ao calendário por ${currentSession?.name} (${userRole?.toUpperCase()})`,
        currentEst.id,
        currentEst.name
      );
    }
  };

  const handleAddProductSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentEst || !pName.trim()) return;

    if (userRole === 'financeiro') {
      alert('Acesso negado: Usuários com o perfil Financeiro não podem cadastrar produtos.');
      return;
    }

    onAddProductToEstablishment(currentEst.id, {
      name: pName,
      price: Number(pPrice),
      description: pDesc,
      category: pCat,
      photo: 'https://images.unsplash.com/photo-1578500494198-246f612d3b3d?auto=format&fit=crop&w=500&q=80' // default elegant mug photo
    });

    setPName('');
    setPPrice(0);
    setPDesc('');
    setShowAddProduct(false);

    if (onAddAuditLog) {
      onAddAuditLog(
        'Cadastro de Produto',
        `Produto "${pName}" adicionado à vitrine digital por ${currentSession?.name} (${userRole?.toUpperCase()})`,
        currentEst.id,
        currentEst.name
      );
    }
  };

  const handlePremiumUpgradeSuccess = () => {
    if (!currentEst) return;
    onUpgradeToPremium(currentEst.id);
    setCheckoutStep('success');
    setTimeout(() => {
      setShowCheckoutModal(false);
      setCheckoutStep('options');
    }, 2500);
  };

  // Action: Invite Team Member
  const handleInviteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setInviteError('');
    setInviteSuccess('');

    if (!inviteName.trim() || !inviteEmail.trim()) {
      setInviteError('Por favor, preencha o nome e e-mail do convidado.');
      return;
    }

    if (!currentEst) return;

    // Permissions check: only Proprietário and Administrador can invite
    if (userRole !== 'proprietario' && userRole !== 'administrador') {
      setInviteError('Apenas Proprietários e Administradores podem gerenciar a equipe do estabelecimento.');
      return;
    }

    // Double-check if the member is already on the team
    const currentTeam = currentEst.team || [];
    if (currentTeam.some(m => m.email.toLowerCase() === inviteEmail.toLowerCase())) {
      setInviteError('Este e-mail já está associado a um membro da equipe deste ateliê.');
      return;
    }

    const newMember: EstablishmentTeamMember = {
      id: 'tm_' + Math.floor(100000 + Math.random() * 900000),
      establishmentId: currentEst.id,
      email: inviteEmail.trim().toLowerCase(),
      name: inviteName.trim(),
      role: inviteRole,
      status: 'active',
      permissions: inviteRole === 'administrador' ? ['all'] : ['edit_content'],
      addedBy: currentSession?.name || 'Proprietário',
      addedAt: new Date().toISOString().replace('T', ' ').substring(0, 19)
    };

    const updatedTeam = [...currentTeam, newMember];
    onUpdateEstablishment(currentEst.id, { team: updatedTeam });

    setInviteSuccess(`Convite enviado com sucesso para ${inviteName}!`);
    setInviteName('');
    setInviteEmail('');
    setInviteRole('editor');

    if (onAddAuditLog) {
      onAddAuditLog(
        'Membro Adicionado à Equipe',
        `Novo integrante ${newMember.name} convidado como ${newMember.role.toUpperCase()} por ${currentSession?.name}.`,
        currentEst.id,
        currentEst.name
      );
    }
  };

  // Action: Toggle Member Status (Suspend or Activate)
  const handleToggleMemberStatus = (memberId: string) => {
    if (!currentEst) return;

    if (userRole !== 'proprietario' && userRole !== 'administrador') {
      alert('Apenas Proprietários e Administradores podem alterar o status de membros da equipe.');
      return;
    }

    const currentTeam = currentEst.team || [];
    const targetMember = currentTeam.find(m => m.id === memberId);
    if (!targetMember) return;

    // Rules:
    // 1. Cannot suspend/remove the Proprietário
    if (targetMember.role === 'proprietario') {
      alert('Ação bloqueada: O Proprietário Oficial e detentor do Owner ID não pode ser suspenso ou removido da equipe.');
      return;
    }

    // 2. Administrador cannot suspend/remove other Administradors or Proprietário
    if (userRole === 'administrador' && targetMember.role === 'administrador') {
      alert('Ação bloqueada: Administradores de suporte não podem alterar o status de outros administradores.');
      return;
    }

    const updatedTeam = currentTeam.map(m => {
      if (m.id === memberId) {
        return { ...m, status: m.status === 'active' ? 'suspended' : 'active' } as EstablishmentTeamMember;
      }
      return m;
    });

    onUpdateEstablishment(currentEst.id, { team: updatedTeam });

    if (onAddAuditLog) {
      onAddAuditLog(
        'Status de Membro Alterado',
        `Membro ${targetMember.name} teve o acesso alterado para ${targetMember.status === 'active' ? 'SUSPENSO' : 'ATIVO'} por ${currentSession?.name}.`,
        currentEst.id,
        currentEst.name
      );
    }
  };

  // Action: Remove Member
  const handleRemoveMember = (memberId: string) => {
    if (!currentEst) return;

    if (userRole !== 'proprietario' && userRole !== 'administrador') {
      alert('Apenas Proprietários e Administradores podem remover membros da equipe.');
      return;
    }

    const currentTeam = currentEst.team || [];
    const targetMember = currentTeam.find(m => m.id === memberId);
    if (!targetMember) return;

    if (targetMember.role === 'proprietario') {
      alert('Ação bloqueada: O Proprietário e detentor do Owner ID não pode ser removido.');
      return;
    }

    if (userRole === 'administrador' && targetMember.role === 'administrador') {
      alert('Ação bloqueada: Administradores de suporte não podem remover outros administradores.');
      return;
    }

    if (!confirm(`Tem certeza de que deseja remover ${targetMember.name} da equipe?`)) {
      return;
    }

    const updatedTeam = currentTeam.filter(m => m.id !== memberId);
    onUpdateEstablishment(currentEst.id, { team: updatedTeam });

    if (onAddAuditLog) {
      onAddAuditLog(
        'Membro Removido da Equipe',
        `Integrante ${targetMember.name} (${targetMember.email}) removido da equipe por ${currentSession?.name}.`,
        currentEst.id,
        currentEst.name
      );
    }
  };

  // Action: Ownership Transfer (Step-by-step with secure MFA simulation)
  const handleTransferSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setTransferError('');
    setTransferSuccess('');

    if (!transferEmail.trim() || !transferPassword.trim()) {
      setTransferError('Por favor, preencha todos os campos.');
      return;
    }

    if (!currentEst) return;

    // Rules:
    // Only Proprietário (Owner ID owner) or Super Admin can transfer ownership
    if (userRole !== 'proprietario') {
      setTransferError('Ação exclusiva de Proprietário: Apenas o detentor do Owner ID atual pode transferir a propriedade digital deste ateliê.');
      return;
    }

    if (transferEmail.toLowerCase() === currentEst.ownerEmail?.toLowerCase()) {
      setTransferError('O e-mail de destino já é o proprietário atual deste estabelecimento.');
      return;
    }

    // Step 1: MFA check simulation
    if (!showMfaStep) {
      // Show MFA simulation verification
      setShowMfaStep(true);
      return;
    }

    // Step 2: Code confirmation
    if (mfaCode !== '123456') {
      setTransferError('Código de verificação MFA inválido. Use o simulador de token (digite 123456).');
      return;
    }

    // Success! Perform ownership transfer
    const originalOwnerName = currentSession?.name || 'Antigo Proprietário';
    const originalOwnerEmail = currentEst.ownerEmail || 'antigo@exemplo.com';
    const generatedOwnerId = 'owner_' + Math.floor(100000 + Math.random() * 900000);
    const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);

    const historyLine = `Propriedade digital transferida de ${originalOwnerName} (${originalOwnerEmail}) para ${transferEmail} sob novo Owner ID: ${generatedOwnerId} em ${timestamp}.`;
    const newHistory = [...(currentEst.ownershipHistory || []), historyLine];

    // Re-initialize the team with the new Proprietário, and demote the old proprietor to Administrador so they don't get completely locked out immediately
    const currentTeam = currentEst.team || [];
    const updatedTeam = currentTeam.map(m => {
      if (m.role === 'proprietario') {
        return { ...m, role: 'administrador', name: `${m.name} (Ex-Proprietário)` } as EstablishmentTeamMember;
      }
      return m;
    });

    // Add new proprietor to team
    const newProprietorMember: EstablishmentTeamMember = {
      id: 'tm_' + Math.floor(100000 + Math.random() * 900000),
      establishmentId: currentEst.id,
      email: transferEmail.trim().toLowerCase(),
      name: 'Novo Proprietário',
      role: 'proprietario',
      status: 'active',
      permissions: ['all'],
      addedBy: 'Transferência de Titularidade (MFA)',
      addedAt: timestamp
    };

    updatedTeam.push(newProprietorMember);

    onUpdateEstablishment(currentEst.id, {
      ownerId: generatedOwnerId,
      ownerEmail: transferEmail.trim().toLowerCase(),
      ownershipHistory: newHistory,
      team: updatedTeam
    });

    setTransferSuccess('Sucesso! Propriedade digital transferida. Um novo Owner ID foi gerado de forma permanente.');
    
    if (onAddAuditLog) {
      onAddAuditLog(
        'Transferência de Propriedade Homologada',
        `Titularidade transferida de ${originalOwnerEmail} para ${transferEmail}. Novo Owner ID: ${generatedOwnerId} gerado de forma irreversível.`,
        currentEst.id,
        currentEst.name
      );
    }

    setTimeout(() => {
      setShowTransferModal(false);
      setShowMfaStep(false);
      setTransferEmail('');
      setTransferPassword('');
      setMfaCode('');
      setTransferSuccess('');
    }, 3000);
  };

  if (claimedEsts.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center space-y-4 font-sans">
        <div className="w-16 h-16 bg-sand-card rounded-full flex items-center justify-center mx-auto border border-clay-border text-terracotta">
          <User className="w-8 h-8" />
        </div>
        <div className="max-w-md mx-auto space-y-2">
          <h2 className="text-lg font-bold text-gray-900">Seu Painel está Vazio</h2>
          <p className="text-xs text-gray-400 leading-normal">
            Você ainda não reivindicou nenhum estabelecimento no CeraMapa. Volte ao Mapa Nacional, clique em um ponto de cerâmica e procure o botão "Reivindicar Perfil Grátis" para vinculá-lo à sua conta de ceramista parceiro.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-6 font-sans">
      
      {/* 1. Profile selector & Premium Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-2.5">
          <span className="p-2 rounded-xl bg-sand-card border border-clay-border text-terracotta">
            <User className="w-5 h-5" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-gray-900 tracking-tight">Painel do Parceiro</h2>
              <select
                id="user-dashboard-est-select"
                value={selectedEstId}
                onChange={(e) => handleSelectEstablishment(e.target.value)}
                className="px-2.5 py-1 rounded bg-gray-50 hover:bg-gray-100 text-xs font-semibold text-gray-700 cursor-pointer border border-gray-200"
              >
                {claimedEsts.map((est) => (
                  <option key={est.id} value={est.id}>{est.name}</option>
                ))}
              </select>
            </div>
            <p className="text-xs text-gray-400">Edite dados, lance ofertas e gerencie sua privacidade geográfica</p>
          </div>
        </div>

        {/* Premium Upgrade Status or CTA */}
        {currentEst && (
          <div className="shrink-0 w-full md:w-auto">
            {currentEst.isPremium ? (
              <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl flex items-center gap-2 text-xs">
                <Sparkles className="w-4 h-4 text-amber-500 fill-amber-500" />
                <div className="text-amber-900 font-semibold">
                  Seu Perfil é Premium! <span className="text-[10px] text-amber-600 block font-normal">Sua vitrine e agenda estão online no mapa</span>
                </div>
              </div>
            ) : (
              <button 
                id="user-dashboard-upgrade-btn"
                onClick={() => {
                  setCheckoutStep('options');
                  setShowCheckoutModal(true);
                }}
                className="w-full md:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-xl text-xs font-bold shadow-md hover:brightness-105 transition-all cursor-pointer animate-pulse"
              >
                <Sparkles className="w-3.5 h-3.5 text-yellow-200 fill-yellow-200" />
                Turbinar para Premium (R$ 79)
              </button>
            )}
          </div>
        )}
      </div>

      {currentEst && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* LEFT: Visitas Analytics & Working Hours */}
          <div className="lg:col-span-1 space-y-5">
            
            {/* Visual Analytics Counter */}
            <div className="p-4 bg-sand-card border border-clay-border rounded-2xl space-y-4">
              <h3 className="text-xs font-bold text-earth-dark uppercase tracking-wide flex items-center gap-1.5">
                <BarChart3 className="w-4 h-4 text-terracotta" /> Desempenho do Perfil
              </h3>

              <div className="grid grid-cols-3 gap-2.5 text-center">
                <div className="p-2.5 bg-white border border-clay-border rounded-xl">
                  <Eye className="w-4 h-4 mx-auto text-earth-gray" />
                  <p className="text-xs text-earth-gray mt-1">Visitas</p>
                  <p className="text-base font-black text-earth-dark leading-none mt-1">{currentEst.viewsCount || 24}</p>
                </div>
                <div className="p-2.5 bg-white border border-clay-border rounded-xl">
                  <Smartphone className="w-4 h-4 mx-auto text-[#25D366]" />
                  <p className="text-xs text-earth-gray mt-1">Cliques WA</p>
                  <p className="text-base font-black text-earth-dark leading-none mt-1">{currentEst.clicksWhatsApp || 8}</p>
                </div>
                <div className="p-2.5 bg-white border border-clay-border rounded-xl">
                  <MapPin className="w-4 h-4 mx-auto text-terracotta" />
                  <p className="text-xs text-earth-gray mt-1">Rota Cliques</p>
                  <p className="text-base font-black text-earth-dark leading-none mt-1">{currentEst.clicksRoute || 4}</p>
                </div>
              </div>
            </div>

            {/* Quick Profile Information Card */}
            <div className="p-4 bg-gray-50 border border-gray-100 rounded-2xl space-y-3.5 text-xs text-gray-600">
              <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wide">
                Identidade Verificada
              </h3>

              <div className="flex gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-500 shrink-0" />
                <div>
                  <p className="font-semibold text-gray-800">Parceiro CeraMapa Brasil</p>
                  <p className="text-[11px] text-gray-500 leading-normal mt-0.5">Sua titularidade foi confirmada. Seus dados estão sincronizados.</p>
                </div>
              </div>

              <div className="border-t border-gray-200/60 pt-3 space-y-2">
                <div className="flex justify-between">
                  <span>Categoria:</span>
                  <span className="font-semibold text-gray-800">{currentEst.category}</span>
                </div>
                <div className="flex justify-between">
                  <span>Município:</span>
                  <span className="font-semibold text-gray-800">{currentEst.city} - {currentEst.state}</span>
                </div>
                <div className="flex justify-between">
                  <span>Bairro:</span>
                  <span className="font-semibold text-gray-800">{currentEst.neighborhood}</span>
                </div>
              </div>
            </div>

            {/* Owner ID & Team Management (Módulo Owner ID & Equipe) */}
            <div className="p-4 bg-amber-50/50 border border-amber-100 rounded-2xl space-y-4 text-xs">
              <div className="space-y-1">
                <h3 className="text-xs font-bold text-amber-900 uppercase tracking-wide flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-amber-600" /> Propriedade & Equipe
                </h3>
                <p className="text-[10px] text-amber-800 leading-normal">Apenas o detentor da propriedade (Proprietário Titular) possui privilégios de transferência.</p>
              </div>

              {/* Owner ID Banner */}
              <div className="p-3 bg-white border border-amber-200 rounded-xl space-y-1.5 shadow-sm">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-amber-800 uppercase font-bold tracking-wide">Owner ID Permanente</span>
                  <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-black uppercase">Ativo</span>
                </div>
                <p className="font-mono text-[11px] font-bold text-gray-800 bg-gray-50 p-1.5 rounded border border-gray-100 select-all select-text">
                  {currentEst.ownerId || 'owner_imported_pending'}
                </p>
                <div className="text-[10px] text-gray-500 pt-0.5">
                  👤 <strong>Dono:</strong> {currentEst.ownerEmail}
                </div>
                {userRole === 'proprietario' && (
                  <button
                    onClick={() => {
                      setShowTransferModal(true);
                      setShowMfaStep(false);
                      setTransferError('');
                      setTransferSuccess('');
                    }}
                    className="w-full mt-2 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded text-[10px] font-bold cursor-pointer transition-colors shadow-sm"
                  >
                    🔄 Transferir Titularidade (Owner ID)
                  </button>
                )}
              </div>

              {/* Your Active Role Notice */}
              <div className="p-2.5 bg-white/70 border border-gray-100 rounded-lg flex items-center justify-between text-[11px]">
                <span className="text-gray-500">Seu nível hierárquico:</span>
                <span className="font-bold text-terracotta bg-terracotta/5 px-2 py-0.5 rounded uppercase text-[10px]">
                  {userRole?.toUpperCase()}
                </span>
              </div>

              {/* Team list */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <h4 className="font-bold text-gray-700 uppercase text-[10px] tracking-wider">Membros da Equipe ({currentEst.team?.length || 1})</h4>
                  {(userRole === 'proprietario' || userRole === 'administrador') && (
                    <button
                      onClick={() => setShowInviteForm(!showInviteForm)}
                      className="text-[10px] text-terracotta hover:underline font-bold cursor-pointer bg-transparent border-0"
                    >
                      {showInviteForm ? 'Fechar' : '+ Convidar'}
                    </button>
                  )}
                </div>

                {/* Invite Form */}
                {showInviteForm && (
                  <form onSubmit={handleInviteSubmit} className="p-3 bg-white border border-gray-200 rounded-xl space-y-2.5 shadow-sm text-xs">
                    <h5 className="font-bold text-gray-800 text-[11px]">Novo Integrante da Equipe</h5>
                    
                    {inviteError && <p className="text-[10px] text-red-600 bg-red-50 p-1 rounded font-medium">{inviteError}</p>}
                    {inviteSuccess && <p className="text-[10px] text-emerald-700 bg-emerald-50 p-1 rounded font-medium">{inviteSuccess}</p>}

                    <div className="space-y-1.5">
                      <input
                        type="text"
                        placeholder="Nome do integrante"
                        value={inviteName}
                        onChange={(e) => setInviteName(e.target.value)}
                        className="w-full p-1.5 text-[11px] rounded border border-gray-200 focus:outline-none"
                      />
                      <input
                        type="email"
                        placeholder="E-mail de login"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        className="w-full p-1.5 text-[11px] rounded border border-gray-200 focus:outline-none"
                      />
                      <select
                        value={inviteRole}
                        onChange={(e) => setInviteRole(e.target.value as any)}
                        className="w-full p-1.5 text-[11px] rounded border border-gray-200 focus:outline-none bg-white"
                      >
                        <option value="administrador">Administrador (Suporte)</option>
                        <option value="editor">Editor (Conteúdos)</option>
                        <option value="colaborador">Colaborador (Agenda)</option>
                        <option value="financeiro">Financeiro (Faturas)</option>
                      </select>
                    </div>

                    <button
                      type="submit"
                      className="w-full py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded text-[10px] cursor-pointer"
                    >
                      Convidar e Autorizar Acesso
                    </button>
                  </form>
                )}

                {/* List item rendering */}
                <div className="space-y-1.5">
                  {/* Always render proprietor first */}
                  <div className="p-2 bg-white rounded-lg border border-gray-100 flex justify-between items-center shadow-xs">
                    <div>
                      <p className="font-bold text-gray-900">{currentEst.claimantName || 'Proprietário Oficial'}</p>
                      <p className="text-[9px] text-gray-400 font-mono select-all select-text">{currentEst.ownerEmail}</p>
                    </div>
                    <span className="text-[9px] bg-amber-100 text-amber-800 font-bold px-1.5 py-0.5 rounded uppercase">
                      PROPRIETÁRIO
                    </span>
                  </div>

                  {/* Render other team members */}
                  {currentEst.team?.filter(m => m.role !== 'proprietario').map((member) => (
                    <div key={member.id} className="p-2 bg-white rounded-lg border border-gray-100 flex flex-col gap-1.5 shadow-xs">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-bold text-gray-900 flex items-center gap-1">
                            {member.name}
                            {member.status === 'suspended' && (
                              <span className="text-[8px] bg-red-100 text-red-700 px-1 rounded font-bold">SUSPENSO</span>
                            )}
                          </p>
                          <p className="text-[9px] text-gray-400 font-mono select-all select-text">{member.email}</p>
                        </div>
                        <span className="text-[9px] bg-gray-100 text-gray-700 font-bold px-1.5 py-0.5 rounded uppercase">
                          {member.role}
                        </span>
                      </div>

                      {/* Management actions */}
                      {(userRole === 'proprietario' || userRole === 'administrador') && (
                        <div className="flex justify-end gap-2 border-t border-gray-50 pt-1.5 mt-0.5">
                          <button
                            type="button"
                            onClick={() => handleToggleMemberStatus(member.id)}
                            className="text-[9px] font-bold text-gray-500 hover:text-earth-dark cursor-pointer bg-transparent border-0"
                          >
                            {member.status === 'active' ? '🔑 Suspender' : '✅ Reativar'}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveMember(member.id)}
                            className="text-[9px] font-bold text-red-500 hover:text-red-700 cursor-pointer bg-transparent border-0"
                          >
                            🗑️ Remover
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* History trail */}
              {currentEst.ownershipHistory && currentEst.ownershipHistory.length > 0 && (
                <div className="space-y-1.5 border-t border-amber-100/50 pt-2.5">
                  <span className="text-[9px] text-amber-900 uppercase font-bold tracking-wide block">Rastro de Propriedade (Auditado)</span>
                  <div className="space-y-1 max-h-24 overflow-y-auto bg-white/50 p-2 rounded-lg border border-amber-100/30">
                    {currentEst.ownershipHistory.map((line, idx) => (
                      <p key={idx} className="text-[9px] text-gray-500 leading-normal border-b border-gray-100/40 pb-1 last:border-0 last:pb-0 font-sans italic">
                        🛡️ {line}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>

          </div>

          {/* MIDDLE: Profile Editor */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Form Editor Card */}
            <div className="border border-gray-100 rounded-2xl p-5 shadow-inner">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wide flex items-center gap-1.5 font-serif italic">
                  <Settings className="w-4 h-4 text-terracotta" /> Editor Cadastral de Perfil
                </h3>

                <button
                  id="btn-edit-toggle-user"
                  onClick={() => setIsEditing(!isEditing)}
                  className="px-2.5 py-1 rounded bg-gray-100 hover:bg-gray-200 text-xs font-bold cursor-pointer text-gray-700"
                >
                  {isEditing ? 'Cancelar' : 'Editar Dados'}
                </button>
              </div>

              {isEditing ? (
                <form onSubmit={handleProfileSave} className="space-y-4 text-xs">
                  <div>
                    <label className="block text-gray-600 font-medium mb-1">Descrição Curta *</label>
                    <input 
                      type="text" 
                      required
                      value={desc}
                      onChange={(e) => setDesc(e.target.value)}
                      className="w-full p-2.5 rounded-lg border border-clay-border focus:outline-none focus:border-terracotta focus:ring-1 focus:ring-terracotta bg-white text-earth-dark placeholder-earth-gray" 
                      placeholder="Resuma seu ateliê em uma frase atraente."
                    />
                  </div>

                  <div>
                    <label className="block text-gray-600 font-medium mb-1">Sobre nós / História Detalhada (Premium)</label>
                    <textarea 
                      rows={4}
                      value={longDesc}
                      onChange={(e) => setLongDesc(e.target.value)}
                      className="w-full p-2.5 rounded-lg border border-clay-border focus:outline-none focus:border-terracotta focus:ring-1 focus:ring-terracotta bg-white text-earth-dark placeholder-earth-gray disabled:bg-gray-50" 
                      placeholder="Conte sobre sua jornada na cerâmica, fornos e modelagem."
                      disabled={!currentEst.isPremium}
                    />
                    {!currentEst.isPremium && (
                      <span className="text-[10px] text-amber-600 mt-1 block">⭐ Requer upgrade Premium para expor biografia longa.</span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-gray-600 font-medium mb-1">WhatsApp de Contato *</label>
                      <input 
                        type="text" 
                        required
                        value={whatsapp}
                        onChange={(e) => setWhatsapp(e.target.value)}
                        className="w-full p-2.5 rounded-lg border border-clay-border focus:outline-none focus:border-terracotta focus:ring-1 focus:ring-terracotta bg-white text-earth-dark placeholder-earth-gray" 
                      />
                    </div>
                    <div>
                      <label className="block text-gray-600 font-medium mb-1">Instagram (@) *</label>
                      <input 
                        type="text" 
                        required
                        value={instagram}
                        onChange={(e) => setInstagram(e.target.value)}
                        className="w-full p-2.5 rounded-lg border border-clay-border focus:outline-none focus:border-terracotta focus:ring-1 focus:ring-terracotta bg-white text-earth-dark placeholder-earth-gray" 
                      />
                    </div>
                  </div>

                  {/* PRIVACY SELECTOR (MÓDULO 4) */}
                  <div className="bg-[#FAF9F5] p-3.5 border border-gray-100 rounded-xl space-y-3">
                    <div className="space-y-0.5">
                      <label className="block text-gray-700 font-bold">Nível de Privacidade do Endereço (Módulo 4)</label>
                      <p className="text-[10px] text-gray-400">Ceramistas residenciais podem ocultar seu endereço do mapa por segurança.</p>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <label className="flex items-center gap-2 p-2 rounded-lg bg-white border border-gray-100 hover:border-emerald-200 cursor-pointer">
                        <input 
                          type="radio" 
                          name="privacy" 
                          value="full" 
                          checked={privacy === 'full'}
                          onChange={() => setPrivacy('full')}
                        />
                        <div>
                          <strong className="block text-gray-800">Endereço Completo</strong>
                          <span className="text-[10px] text-gray-400">Mostra rua, número e rota.</span>
                        </div>
                      </label>

                      <label className="flex items-center gap-2 p-2 rounded-lg bg-white border border-gray-100 hover:border-emerald-200 cursor-pointer">
                        <input 
                          type="radio" 
                          name="privacy" 
                          value="neighborhood" 
                          checked={privacy === 'neighborhood'}
                          onChange={() => setPrivacy('neighborhood')}
                        />
                        <div>
                          <strong className="block text-gray-800">Apenas Bairro</strong>
                          <span className="text-[10px] text-gray-400">Mostra raio circular de 400m.</span>
                        </div>
                      </label>

                      <label className="flex items-center gap-2 p-2 rounded-lg bg-white border border-gray-100 hover:border-emerald-200 cursor-pointer">
                        <input 
                          type="radio" 
                          name="privacy" 
                          value="city" 
                          checked={privacy === 'city'}
                          onChange={() => setPrivacy('city')}
                        />
                        <div>
                          <strong className="block text-gray-800">Apenas Cidade</strong>
                          <span className="text-[10px] text-gray-400">Sem rua ou bairro visível.</span>
                        </div>
                      </label>

                      <label className="flex items-center gap-2 p-2 rounded-lg bg-white border border-gray-100 hover:border-emerald-200 cursor-pointer">
                        <input 
                          type="radio" 
                          name="privacy" 
                          value="state" 
                          checked={privacy === 'state'}
                          onChange={() => setPrivacy('state')}
                        />
                        <div>
                          <strong className="block text-gray-800">Apenas Estado</strong>
                          <span className="text-[10px] text-gray-400">Oculta localização inteira.</span>
                        </div>
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="block text-gray-600 font-medium mb-1">Horário de Atendimento público</label>
                    <textarea 
                      rows={2}
                      value={hours}
                      onChange={(e) => setHours(e.target.value)}
                      className="w-full p-2.5 rounded-lg border border-clay-border focus:outline-none focus:border-terracotta focus:ring-1 focus:ring-terracotta bg-white text-earth-dark placeholder-earth-gray" 
                      placeholder="Ex: Terça a Sábado: 09:00 às 18:00"
                    />
                  </div>

                  <button 
                    id="btn-save-profile-user"
                    type="submit"
                    className="w-full py-2.5 font-bold rounded-xl bg-gray-900 text-white hover:bg-black cursor-pointer text-center"
                  >
                    Salvar Alterações no Mapa
                  </button>
                </form>
              ) : (
                <div className="space-y-4 text-xs text-gray-700">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="block text-gray-400 font-sans">Descrição Curta:</span>
                      <strong className="text-gray-800">{currentEst.description}</strong>
                    </div>
                    <div>
                      <span className="block text-gray-400 font-sans">Nível de Privacidade Ativo:</span>
                      <strong className="text-terracotta flex items-center gap-1 mt-0.5">
                        🛡 {currentEst.privacy === 'full' ? 'Endereço Completo' : currentEst.privacy === 'neighborhood' ? 'Mapeamento por Bairro' : currentEst.privacy === 'city' ? 'Mapeamento por Cidade' : 'Mapeamento por Estado'}
                      </strong>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 border-t border-gray-100 pt-3">
                    <div>
                      <span className="block text-gray-400 font-sans">WhatsApp público:</span>
                      <strong className="text-gray-800">{currentEst.whatsapp}</strong>
                    </div>
                    <div>
                      <span className="block text-gray-400 font-sans">Instagram:</span>
                      <strong className="text-gray-800">{currentEst.instagram}</strong>
                    </div>
                  </div>

                  <div className="border-t border-gray-100 pt-3">
                    <span className="block text-gray-400 font-sans">Sobre / Biografia Completa (Apenas Premium):</span>
                    <p className="text-gray-600 italic mt-1 leading-relaxed">
                      {currentEst.isPremium ? currentEst.longDescription || 'Biografia longa não preenchida.' : 'Disponível apenas para contas Premium.'}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* PREMIUM VITRINE & AGENDA MANAGER (Only active if Premium) */}
            {currentEst.isPremium ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* 1. Managed Events / Course list */}
                <div className="border border-gray-100 rounded-2xl p-4 space-y-3.5 shadow-sm">
                  <div className="flex justify-between items-center">
                    <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wide flex items-center gap-1.5 font-serif italic">
                      <Calendar className="w-4 h-4 text-terracotta" /> Gerenciar Cursos
                    </h3>
                    <button 
                      onClick={() => setShowAddEvent(!showAddEvent)}
                      className="p-1 rounded-full bg-gray-50 hover:bg-gray-100 text-gray-600 border border-gray-200 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {showAddEvent && (
                    <form onSubmit={handleAddEventSubmit} className="p-3 bg-[#FAF9F5] border border-gray-100 rounded-xl space-y-2.5 text-xs">
                      <input 
                        type="text" 
                        required 
                        value={evTitle}
                        onChange={(e) => setEvTitle(e.target.value)}
                        placeholder="Nome do Curso/Workshop"
                        className="w-full p-2 rounded-lg bg-white border border-gray-200"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <select 
                          value={evType}
                          onChange={(e) => setEvType(e.target.value as any)}
                          className="w-full p-2 rounded-lg bg-white border border-gray-200"
                        >
                          <option value="curso">Curso Regular</option>
                          <option value="workshop">Workshop</option>
                          <option value="feira">Feira</option>
                          <option value="exposicao">Exposição</option>
                        </select>
                        <input 
                          type="text" 
                          required 
                          value={evDate}
                          onChange={(e) => setEvDate(e.target.value)}
                          placeholder="Ex: 15 de Julho"
                          className="w-full p-2 rounded-lg bg-white border border-gray-200"
                        />
                      </div>
                      <input 
                        type="text" 
                        required 
                        value={evPrice}
                        onChange={(e) => setEvPrice(e.target.value)}
                        placeholder="Preço (Ex: R$ 250)"
                        className="w-full p-2 rounded-lg bg-white border border-gray-200"
                      />
                      <textarea 
                        rows={2} 
                        required 
                        value={evDesc}
                        onChange={(e) => setEvDesc(e.target.value)}
                        placeholder="Breve descrição sobre o conteúdo das aulas..."
                        className="w-full p-2 rounded-lg bg-white border border-gray-200"
                      />
                      <button 
                        id="btn-save-event-user"
                        type="submit" 
                        className="w-full py-1.5 rounded-lg bg-terracotta text-white font-bold cursor-pointer hover:bg-sienna transition-all shadow-md"
                      >
                        Salvar Curso
                      </button>
                    </form>
                  )}

                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {currentEst.events && currentEst.events.length > 0 ? (
                      currentEst.events.map((ev) => (
                        <div key={ev.id} className="p-2 border border-gray-50 rounded-lg bg-white flex justify-between items-center text-xs">
                          <div>
                            <strong className="block text-gray-800 text-[11px]">{ev.title}</strong>
                            <span className="text-[10px] text-gray-400">{ev.date} | {ev.price}</span>
                          </div>
                          <span className="px-1.5 py-0.5 rounded bg-gray-50 text-gray-500 font-bold uppercase text-[9px]">
                            {ev.type}
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="text-[10px] text-gray-400 text-center py-4">Sem cursos cadastrados.</p>
                    )}
                  </div>
                </div>

                {/* 2. Managed Products / Store Items list */}
                <div className="border border-gray-100 rounded-2xl p-4 space-y-3.5 shadow-sm">
                  <div className="flex justify-between items-center">
                    <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wide flex items-center gap-1.5 font-serif italic">
                      <ShoppingBag className="w-4 h-4 text-terracotta" /> Vitrine Digital
                    </h3>
                    <button 
                      onClick={() => setShowAddProduct(!showAddProduct)}
                      className="p-1 rounded-full bg-gray-50 hover:bg-gray-100 text-gray-600 border border-gray-200 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {showAddProduct && (
                    <form onSubmit={handleAddProductSubmit} className="p-3 bg-[#FAF9F5] border border-gray-100 rounded-xl space-y-2.5 text-xs">
                      <input 
                        type="text" 
                        required 
                        value={pName}
                        onChange={(e) => setPName(e.target.value)}
                        placeholder="Nome da peça de cerâmica"
                        className="w-full p-2 rounded-lg bg-white border border-gray-200"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <input 
                          type="number" 
                          required 
                          value={pPrice}
                          onChange={(e) => setPPrice(Number(e.target.value))}
                          placeholder="Valor R$"
                          className="w-full p-2 rounded-lg bg-white border border-gray-200"
                        />
                        <select 
                          value={pCat}
                          onChange={(e) => setPCat(e.target.value as any)}
                          className="w-full p-2 rounded-lg bg-white border border-gray-200"
                        >
                          <option value="peca">Peça Utilitária</option>
                          <option value="argila">Argila/Massa</option>
                          <option value="esmalte">Esmalte</option>
                          <option value="ferramenta">Ferramenta</option>
                        </select>
                      </div>
                      <textarea 
                        rows={2} 
                        required 
                        value={pDesc}
                        onChange={(e) => setPDesc(e.target.value)}
                        placeholder="Especifique argila, queima, esmaltes ou dimensões."
                        className="w-full p-2 rounded-lg bg-white border border-gray-200"
                      />
                      <button 
                        id="btn-save-product-user"
                        type="submit" 
                        className="w-full py-1.5 rounded-lg bg-terracotta text-white font-bold cursor-pointer hover:bg-sienna transition-all shadow-md"
                      >
                        Adicionar à Vitrine
                      </button>
                    </form>
                  )}

                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {currentEst.products && currentEst.products.length > 0 ? (
                      currentEst.products.map((p) => (
                        <div key={p.id} className="p-2 border border-gray-50 rounded-lg bg-white flex justify-between items-center text-xs">
                          <div>
                            <strong className="block text-gray-800 text-[11px]">{p.name}</strong>
                            <span className="text-[10px] text-gray-400">R$ {p.price}</span>
                          </div>
                          <span className="text-[10px] text-terracotta font-bold uppercase tracking-wider">
                            {p.category}
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="text-[10px] text-gray-400 text-center py-4">Sua vitrine está vazia.</p>
                    )}
                  </div>
                </div>

              </div>
            ) : (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3 text-xs text-amber-800">
                <Sparkles className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-amber-900">Vitrine e Agenda Ocultadas</h4>
                  <p className="leading-relaxed text-amber-700 mt-0.5">
                    Seu ateliê está ativo no mapa, mas recursos como <strong>Vitrine Digital de Produtos</strong> e <strong>Calendário de Cursos/Workshops</strong> são exclusivos de parceiros Premium. Assine o plano para desbloquear e atrair novos alunos e compradores.
                  </p>
                </div>
              </div>
            )}

          </div>

        </div>
      )}

      {/* ========================================== */}
      {/* CHECKOUT MODAL SIMULATION (MÓDULO 12)       */}
      {/* ========================================== */}
      <AnimatePresence>
        {showCheckoutModal && (
          <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl border border-gray-100 p-6 max-w-md w-full shadow-2xl relative"
            >
              <button 
                onClick={() => setShowCheckoutModal(false)} 
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 font-bold text-lg cursor-pointer"
              >
                ×
              </button>

              <div className="text-center space-y-1 mb-5">
                <h3 className="text-lg font-bold text-gray-900 flex items-center justify-center gap-1.5">
                  <Sparkles className="w-5 h-5 text-amber-500 fill-amber-500 animate-spin" />
                  Assinar CeraMapa Premium
                </h3>
                <p className="text-xs text-gray-400">Destaque profissional nacional para seu negócio cerâmico</p>
              </div>

              {checkoutStep === 'options' && (
                <div className="space-y-4 text-xs">
                  <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-100 space-y-2">
                    <p className="font-bold text-gray-800 text-sm">O que está incluso por R$ 79/mês?</p>
                    <ul className="space-y-1.5 text-gray-600">
                      <li>✨ Banner de capa personalizado e foto de logo oficial</li>
                      <li>🖼 Galeria rica de até 10 fotos e vídeo virtual</li>
                      <li>📅 Cadastro ilimitado de Cursos, Oficinas e Workshops</li>
                      <li>🛍 Vitrine digital integrada para expor peças utilitárias</li>
                      <li>📈 Relatório de métricas detalhadas (views, cliques em rota)</li>
                    </ul>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      id="checkout-pay-pix-btn"
                      onClick={() => setCheckoutStep('pix')}
                      className="p-3 rounded-xl border border-gray-200 hover:border-emerald-500 bg-[#FAF9F5] hover:bg-emerald-50/20 text-center font-bold text-gray-800 transition-all cursor-pointer"
                    >
                      📱 Pagar via PIX
                    </button>
                    <button
                      id="checkout-pay-card-btn"
                      onClick={() => setCheckoutStep('card')}
                      className="p-3 rounded-xl border border-gray-200 hover:border-blue-500 bg-[#FAF9F5] hover:bg-blue-50/20 text-center font-bold text-gray-800 transition-all cursor-pointer"
                    >
                      💳 Cartão de Crédito
                    </button>
                  </div>
                </div>
              )}

              {checkoutStep === 'pix' && (
                <div className="space-y-4 text-center text-xs">
                  <p className="text-gray-600 font-medium">Escaneie o QR Code ou copie o código Pix abaixo para realizar o pagamento.</p>
                  
                  {/* Mock QR Code vector */}
                  <div className="w-36 h-36 bg-gray-100 border border-gray-200 rounded-xl mx-auto flex items-center justify-center shadow-inner relative">
                    <div className="w-28 h-28 border-4 border-gray-900 border-dashed animate-pulse rounded flex items-center justify-center font-bold text-[10px] text-gray-400">
                      PIX QR CODE
                    </div>
                  </div>

                  <div className="p-2 bg-gray-50 border border-gray-200 rounded-lg select-all font-mono text-[9px] text-gray-500 max-w-xs mx-auto break-all">
                    00020101021226830014br.gov.bcb.pix2561cerama_br_prod_79_942183204918349214710520400005303986540579.005802BR5915CeraMapaBrasil6009SaoPaulo62070503***
                  </div>

                  <button
                    id="confirm-pix-payment-btn"
                    onClick={handlePremiumUpgradeSuccess}
                    className="w-full py-2.5 font-bold rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 cursor-pointer"
                  >
                    Já realizei o Pix (Simular Aprovação)
                  </button>
                </div>
              )}

              {checkoutStep === 'card' && (
                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    handlePremiumUpgradeSuccess();
                  }} 
                  className="space-y-3 text-xs"
                >
                  <div>
                    <label className="block text-gray-600 font-medium mb-1">Nome Impresso no Cartão</label>
                    <input type="text" required placeholder="Ex: Clara Mendes" className="w-full p-2.5 rounded-lg border border-clay-border focus:outline-none focus:border-terracotta focus:ring-1 focus:ring-terracotta bg-white text-earth-dark placeholder-earth-gray" />
                  </div>
                  <div>
                    <label className="block text-gray-600 font-medium mb-1">Número do Cartão</label>
                    <input type="text" required placeholder="4444 5555 6666 7777" className="w-full p-2.5 rounded-lg border border-clay-border focus:outline-none focus:border-terracotta focus:ring-1 focus:ring-terracotta bg-white text-earth-dark placeholder-earth-gray" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-gray-600 font-medium mb-1">Validade</label>
                      <input type="text" required placeholder="MM/AA" className="w-full p-2.5 rounded-lg border border-clay-border focus:outline-none focus:border-terracotta focus:ring-1 focus:ring-terracotta bg-white text-earth-dark placeholder-earth-gray text-center" />
                    </div>
                    <div>
                      <label className="block text-gray-600 font-medium mb-1">CVC</label>
                      <input type="password" required placeholder="123" maxLength={3} className="w-full p-2.5 rounded-lg border border-clay-border focus:outline-none focus:border-terracotta focus:ring-1 focus:ring-terracotta bg-white text-earth-dark placeholder-earth-gray text-center" />
                    </div>
                  </div>

                  <button
                    id="confirm-card-payment-btn"
                    type="submit"
                    className="w-full py-2.5 font-bold rounded-xl bg-terracotta text-white hover:bg-sienna cursor-pointer transition-all shadow-md"
                  >
                    Autorizar Cobrança de R$ 79,00
                  </button>
                </form>
              )}

              {checkoutStep === 'success' && (
                <div className="py-8 text-center space-y-3 animate-bounce font-sans">
                  <div className="w-14 h-14 bg-emerald-50 rounded-full flex items-center justify-center mx-auto border border-emerald-100 shadow-sm text-emerald-600">
                    <Check className="w-7 h-7" />
                  </div>
                  <h3 className="text-base font-bold text-gray-900">Upgrade Concluído com Sucesso!</h3>
                  <p className="text-xs text-gray-400">Bem-vindo à comunidade Premium CeraMapa. Seus recursos foram liberados.</p>
                </div>
              )}

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================== */}
      {/* OWNER ID TRANSFER MODAL WITH MFA           */}
      {/* ========================================== */}
      <AnimatePresence>
        {showTransferModal && currentEst && (
          <div className="fixed inset-0 z-[2100] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl border border-amber-200 p-6 max-w-md w-full shadow-2xl relative font-sans"
            >
              <button 
                onClick={() => setShowTransferModal(false)} 
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 font-bold text-lg cursor-pointer bg-transparent border-0"
              >
                ×
              </button>

              <div className="text-center space-y-1.5 mb-5">
                <span className="p-2 bg-amber-50 rounded-full border border-amber-200 text-amber-700 inline-block">
                  <ShieldCheck className="w-6 h-6" />
                </span>
                <h3 className="text-base font-bold text-gray-900">
                  Transferir Propriedade Digital (Módulo Owner ID)
                </h3>
                <p className="text-xs text-gray-400 leading-normal">
                  Transfira permanentemente a propriedade do ateliê <strong>{currentEst.name}</strong> para outro e-mail cadastrado. Um novo Owner ID exclusivo será gerado.
                </p>
              </div>

              {transferError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-semibold mb-4 leading-normal">
                  ⚠️ {transferError}
                </div>
              )}

              {transferSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold mb-4 leading-normal">
                  🎉 {transferSuccess}
                </div>
              )}

              {!transferSuccess && (
                <form onSubmit={handleTransferSubmit} className="space-y-4 text-xs">
                  {!showMfaStep ? (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-gray-600 font-bold mb-1">E-mail do Novo Proprietário *</label>
                        <input 
                          type="email" 
                          required 
                          value={transferEmail}
                          onChange={(e) => setTransferEmail(e.target.value)}
                          placeholder="Ex: novo_ceramista@gmail.com" 
                          className="w-full p-2.5 rounded-lg border border-clay-border focus:outline-none focus:border-terracotta bg-white text-earth-dark text-xs" 
                        />
                      </div>
                      <div>
                        <label className="block text-gray-600 font-bold mb-1">Sua Senha de Confirmação *</label>
                        <input 
                          type="password" 
                          required 
                          value={transferPassword}
                          onChange={(e) => setTransferPassword(e.target.value)}
                          placeholder="Digite sua senha de login" 
                          className="w-full p-2.5 rounded-lg border border-clay-border focus:outline-none focus:border-terracotta bg-white text-earth-dark text-xs" 
                        />
                      </div>
                      <div className="p-3 bg-amber-50/70 border border-amber-100 rounded-xl text-[10px] text-amber-900 leading-normal">
                        🚨 <strong>Atenção:</strong> Ao clicar em prosseguir, você iniciará uma transferência irrevogável. O novo e-mail assumirá o controle total do perfil e herdará o Owner ID atualizado.
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3.5">
                      <div className="p-3 bg-blue-50 border border-blue-200 text-blue-800 rounded-xl leading-normal text-[11px]">
                        🔐 <strong>Dupla Validação Ativada (MFA):</strong> Enviamos um código de segurança temporário para o e-mail do proprietário atual (<strong>{currentEst.ownerEmail}</strong>) para fins de auditoria.
                      </div>
                      <div>
                        <label className="block text-blue-900 font-bold mb-1">Código de Segurança MFA *</label>
                        <input 
                          type="text" 
                          maxLength={6}
                          required 
                          value={mfaCode}
                          onChange={(e) => setMfaCode(e.target.value)}
                          placeholder="Digite o código (Use 123456)" 
                          className="w-full p-2.5 rounded-lg border border-blue-300 bg-white text-center text-sm font-bold tracking-widest text-blue-900 focus:outline-none focus:ring-1 focus:ring-blue-500" 
                        />
                        <span className="text-[10px] text-blue-600 block mt-1.5 text-center">💡 Código simulado: digite <strong>123456</strong> para homologar.</span>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowTransferModal(false);
                        setShowMfaStep(false);
                      }}
                      className="w-1/2 py-2.5 font-bold rounded-xl border border-clay-border text-earth-dark hover:bg-gray-100 cursor-pointer text-xs"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="w-1/2 py-2.5 font-bold rounded-xl bg-amber-600 hover:bg-amber-700 text-white cursor-pointer shadow-sm text-xs"
                    >
                      {!showMfaStep ? 'Iniciar Transferência' : 'Validar e Confirmar'}
                    </button>
                  </div>
                </form>
              )}

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
