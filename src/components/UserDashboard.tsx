import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  User, Sparkles, Eye, Smartphone, Calendar, ShoppingBag, Plus, 
  Settings, CreditCard, ShieldCheck, Check, Clock, EyeOff, BarChart3, ChevronRight, MapPin 
} from 'lucide-react';
import { Establishment, CeramicEvent, Product, PrivacyLevel } from '../types';

interface UserDashboardProps {
  establishments: Establishment[];
  onUpdateEstablishment: (id: string, updates: Partial<Establishment>) => void;
  onUpgradeToPremium: (id: string) => void;
  onAddEventToEstablishment: (estId: string, event: Omit<CeramicEvent, 'id' | 'establishmentId'>) => void;
  onAddProductToEstablishment: (estId: string, product: Omit<Product, 'id'>) => void;
}

export default function UserDashboard({
  establishments,
  onUpdateEstablishment,
  onUpgradeToPremium,
  onAddEventToEstablishment,
  onAddProductToEstablishment
}: UserDashboardProps) {
  // Filter only claimed establishments belonging to the user (mock user owns all claimed profiles or has claimed them)
  const claimedEsts = establishments.filter((e) => e.claimed);
  const [selectedEstId, setSelectedEstId] = useState<string>(claimedEsts[0]?.id || '');
  
  const currentEst = establishments.find((e) => e.id === selectedEstId);

  // States
  const [isEditing, setIsEditing] = useState(false);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState<'options' | 'pix' | 'card' | 'success'>('options');

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

    onUpdateEstablishment(currentEst.id, {
      description: desc,
      longDescription: longDesc,
      privacy: privacy,
      whatsapp: whatsapp,
      instagram: instagram,
      hours: hours
    });
    setIsEditing(false);
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
  };

  const handleAddProductSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentEst || !pName.trim()) return;

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

    </div>
  );
}
