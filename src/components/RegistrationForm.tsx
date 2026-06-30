import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Sparkles, Check, AlertCircle, MapPin, ShieldCheck, 
  Instagram, Phone, FileText, Layers, HelpCircle, Image as ImageIcon,
  UserCheck, Send, User, MessageCircle, Mail, AlertTriangle
} from 'lucide-react';
import { Category, Specialty, PrivacyLevel, SyncRow, SuggestedSpace } from '../types';
import { CATEGORIES, SPECIALTIES } from '../data';

interface RegistrationFormProps {
  onAddFormSubmission: (submission: Omit<SyncRow, 'id' | 'timestamp' | 'status'> & { privacy: PrivacyLevel; description: string; photo?: string }) => void;
  onAddSuggestedSpace: (space: Omit<SuggestedSpace, 'id' | 'date' | 'invitedStatus'>) => void;
  onSuccess: () => void;
}

const TEMPLATE_PHOTOS = [
  { url: 'https://images.unsplash.com/photo-1565192647048-f997ded879f9?auto=format&fit=crop&w=800&q=80', label: 'Torno e Modelagem' },
  { url: 'https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?auto=format&fit=crop&w=800&q=80', label: 'Queima e Forno' },
  { url: 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=800&q=80', label: 'Ateliê Organizado' },
  { url: 'https://images.unsplash.com/photo-1606744824163-985d376605aa?auto=format&fit=crop&w=800&q=80', label: 'Esmaltação Manual' },
];

export default function RegistrationForm({ 
  onAddFormSubmission, 
  onAddSuggestedSpace, 
  onSuccess 
}: RegistrationFormProps) {
  const [regType, setRegType] = useState<'oficial' | 'indicacao'>('oficial');
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Core fields
  const [name, setName] = useState('');
  const [category, setCategory] = useState<Category>('Ateliê');
  const [state, setState] = useState('SP');
  const [city, setCity] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [address, setAddress] = useState('');
  const [contact, setContact] = useState('');
  const [description, setDescription] = useState('');
  const [privacy, setPrivacy] = useState<PrivacyLevel>('full');
  const [selectedSpecialties, setSelectedSpecialties] = useState<Specialty[]>([]);
  const [photoUrl, setPhotoUrl] = useState(TEMPLATE_PHOTOS[0].url);

  // Additional referral fields
  const [suggestedBy, setSuggestedBy] = useState('');

  // Form validation states
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const toggleSpecialty = (spec: Specialty) => {
    setSelectedSpecialties((prev) =>
      prev.includes(spec) ? prev.filter((s) => s !== spec) : [...prev, spec]
    );
  };

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};
    if (!name.trim()) newErrors.name = 'Nome é obrigatório';
    if (!city.trim()) newErrors.city = 'Cidade é obrigatória';
    if (!neighborhood.trim()) newErrors.neighborhood = 'Bairro é obrigatório';
    if (!contact.trim()) newErrors.contact = 'Contato do espaço é obrigatório';
    
    if (regType === 'oficial') {
      if (!description.trim()) newErrors.description = 'Descrição resumida é obrigatória';
      if (selectedSpecialties.length === 0) newErrors.specialties = 'Selecione pelo menos uma especialidade';
    } else {
      if (!suggestedBy.trim()) newErrors.suggestedBy = 'Seu nome é obrigatório para indicar';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    if (regType === 'oficial') {
      onAddFormSubmission({
        name,
        category,
        state: state.toUpperCase(),
        city,
        address,
        neighborhood,
        contact,
        specialties: selectedSpecialties.join(', '),
        privacy,
        description,
        photo: photoUrl
      });
    } else {
      onAddSuggestedSpace({
        name,
        category,
        city,
        state: state.toUpperCase(),
        neighborhood,
        contact,
        specialties: selectedSpecialties.join(', ') || 'Modelagem Manual',
        suggestedBy
      });
    }

    setIsSubmitted(true);
    onSuccess();

    // Reset form states
    setTimeout(() => {
      setIsSubmitted(false);
      setName('');
      setCategory('Ateliê');
      setState('SP');
      setCity('');
      setNeighborhood('');
      setAddress('');
      setContact('');
      setDescription('');
      setPrivacy('full');
      setSelectedSpecialties([]);
      setSuggestedBy('');
      setPhotoUrl(TEMPLATE_PHOTOS[0].url);
    }, 5000);
  };

  return (
    <div className="max-w-3xl mx-auto bg-white rounded-2xl border border-clay-border shadow-md overflow-hidden font-sans">
      
      {/* Banner de Boas-Vindas */}
      <div className="bg-gradient-to-r from-terracotta to-sienna p-6 text-white relative">
        <div className="absolute top-4 right-4 opacity-15">
          <Sparkles className="w-24 h-24 text-white" />
        </div>
        <div className="max-w-xl space-y-1.5">
          <span className="text-[9px] uppercase tracking-widest font-bold bg-white/20 px-2.5 py-0.5 rounded-full text-white inline-block">
            REDE NACIONAL DE CERÂMICA BRASILEIRA
          </span>
          <h2 className="text-2xl font-serif italic font-bold">Cadastro & Indicações</h2>
          <p className="text-xs text-white/80 leading-relaxed">
            Nossa plataforma conecta toda a cadeia produtiva da cerâmica no Brasil. Escolha abaixo se você é o proprietário para publicar seu <strong>Perfil Oficial Gratuito</strong> de forma imediata ou se deseja <strong>indicar um espaço parceiro</strong> para receber um convite da moderação.
          </p>
        </div>
      </div>

      {/* Tipo de Cadastro - Tab Switcher */}
      <div className="flex border-b border-clay-border bg-sand-bg/30">
        <button
          type="button"
          onClick={() => { setRegType('oficial'); setErrors({}); }}
          className={`flex-1 py-4 text-center font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 border-b-2 cursor-pointer ${
            regType === 'oficial' 
              ? 'border-terracotta text-terracotta bg-white font-extrabold' 
              : 'border-transparent text-earth-dark/60 hover:text-earth-dark'
          }`}
        >
          <UserCheck className="w-4 h-4 text-terracotta" />
          Sou Proprietário (Criar Perfil Oficial)
        </button>
        <button
          type="button"
          onClick={() => { setRegType('indicacao'); setErrors({}); }}
          className={`flex-1 py-4 text-center font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 border-b-2 cursor-pointer ${
            regType === 'indicacao' 
              ? 'border-terracotta text-terracotta bg-white font-extrabold' 
              : 'border-transparent text-earth-dark/60 hover:text-earth-dark'
          }`}
        >
          <Send className="w-4 h-4 text-terracotta" />
          Indicar um Espaço (Referência de Terceiro)
        </button>
      </div>

      <div className="p-6 md:p-8">
        {isSubmitted ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="py-12 text-center space-y-4"
          >
            <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto border border-emerald-100 text-emerald-600 shadow-sm">
              <Check className="w-8 h-8" />
            </div>
            <div className="max-w-md mx-auto space-y-2">
              <h3 className="text-lg font-bold text-earth-dark">
                {regType === 'oficial' ? 'Cadastro Enviado com Sucesso!' : 'Indicação Registrada!'}
              </h3>
              <p className="text-xs text-earth-gray leading-relaxed">
                {regType === 'oficial' 
                  ? 'Suas informações foram salvas na Google Sheets oficial e sincronizadas automaticamente no banco de dados. O Perfil Oficial Gratuito já está disponível no mapa nacional!' 
                  : 'Sua indicação foi registrada com sucesso! Ela ficará disponível para a moderação no painel administrativo "Estabelecimentos Indicados". O sistema simulará o envio de um convite de participação para o proprietário.'}
              </p>
              <div className="pt-4 flex justify-center gap-3">
                <span className="text-[10px] font-mono bg-emerald-50 text-emerald-700 px-3 py-1 rounded-md border border-emerald-100 font-bold uppercase">
                  ✔ Google Sheets Ok
                </span>
                <span className="text-[10px] font-mono bg-emerald-50 text-emerald-700 px-3 py-1 rounded-md border border-emerald-100 font-bold uppercase">
                  {regType === 'oficial' ? '✔ Publicado no Mapa' : '✔ Fila de Convites Ok'}
                </span>
              </div>
            </div>
          </motion.div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6 text-xs md:text-sm">
            
            {/* INFORMAÇÃO IMPORTANTE DE REGRA DE NEGÓCIO */}
            <div className={`p-4 rounded-xl border leading-relaxed flex items-start gap-2.5 text-xs ${
              regType === 'oficial' 
                ? 'bg-emerald-50/50 border-emerald-150 text-emerald-900' 
                : 'bg-amber-50/50 border-amber-150 text-amber-900'
            }`}>
              {regType === 'oficial' ? (
                <>
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <strong>Regra Oficial:</strong> Como proprietário, seu estabelecimento será considerado um <strong>Perfil Oficial Gratuito</strong> e inserido automaticamente no mapa nacional de forma imediata após a sincronização!
                  </div>
                </>
              ) : (
                <>
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <strong>Regra de Indicação Colaborativa:</strong> Espaços sugeridos por terceiros <strong>NÃO</strong> são mostrados diretamente no mapa. Eles ficarão na fila de convite do administrador, para garantir que apenas proprietários autorizados publiquem perfis oficiais no ecossistema cerâmico.
                  </div>
                </>
              )}
            </div>

            {/* SEU NOME (Apenas se for indicação) */}
            {regType === 'indicacao' && (
              <div className="space-y-2 animate-fadeIn">
                <label className="block text-gray-700 font-bold mb-1">Seu Nome Completo (Quem está sugerindo) *</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                    <User className="w-4 h-4" />
                  </span>
                  <input 
                    type="text"
                    required
                    value={suggestedBy}
                    onChange={(e) => setSuggestedBy(e.target.value)}
                    placeholder="Ex: Amanda Ferreira dos Santos"
                    className="w-full pl-10 pr-3.5 py-3 rounded-xl border border-clay-border focus:outline-none focus:border-terracotta focus:ring-1 focus:ring-terracotta text-xs bg-white text-earth-dark placeholder-earth-gray shadow-sm"
                  />
                </div>
                {errors.suggestedBy && <p className="text-[10px] text-red-500 font-bold mt-1">⚠ {errors.suggestedBy}</p>}
              </div>
            )}

            {/* Seção 1: Identificação Básica */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-sienna uppercase tracking-wider border-b border-clay-border/40 pb-1.5 flex items-center gap-1.5 font-serif italic">
                <Layers className="w-4 h-4 text-terracotta" /> 1. Informações Básicas do Espaço
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-700 font-bold mb-1">Nome do Estabelecimento / Ceramista *</label>
                  <input 
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: Ateliê do Oleiro Cunha"
                    className="w-full p-3 rounded-xl border border-clay-border focus:outline-none focus:border-terracotta focus:ring-1 focus:ring-terracotta text-xs bg-white text-earth-dark placeholder-earth-gray shadow-sm"
                  />
                  {errors.name && <p className="text-[10px] text-red-500 font-bold mt-1">⚠ {errors.name}</p>}
                </div>

                <div>
                  <label className="block text-gray-700 font-bold mb-1">Categoria Principal *</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as Category)}
                    className="w-full p-3 rounded-xl border border-clay-border focus:outline-none focus:border-terracotta focus:ring-1 focus:ring-terracotta text-xs bg-white text-earth-dark shadow-sm"
                  >
                    {CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>

              {regType === 'oficial' && (
                <div className="animate-fadeIn">
                  <label className="block text-gray-700 font-bold mb-1">Descrição Resumida (Proposta do espaço) *</label>
                  <input 
                    type="text"
                    required={regType === 'oficial'}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Ex: Ensino de modelagem livre, esmaltação e queimas elétricas."
                    className="w-full p-3 rounded-xl border border-clay-border focus:outline-none focus:border-terracotta focus:ring-1 focus:ring-terracotta text-xs bg-white text-earth-dark placeholder-earth-gray shadow-sm"
                  />
                  {errors.description && <p className="text-[10px] text-red-500 font-bold mt-1">⚠ {errors.description}</p>}
                </div>
              )}
            </div>

            {/* Seção 2: Localização & Privacidade (Oculta seções de privacidade detalhada se for indicação para simplificar) */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-sienna uppercase tracking-wider border-b border-clay-border/40 pb-1.5 flex items-center gap-1.5 font-serif italic">
                <MapPin className="w-4 h-4 text-terracotta" /> 2. Localização Geográfica
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-gray-700 font-bold mb-1">Estado (UF) *</label>
                  <input 
                    type="text"
                    required
                    maxLength={2}
                    value={state}
                    onChange={(e) => setState(e.target.value.toUpperCase())}
                    placeholder="Ex: SP"
                    className="w-full p-3 rounded-xl border border-clay-border focus:outline-none focus:border-terracotta focus:ring-1 focus:ring-terracotta text-xs text-center font-bold bg-white text-earth-dark placeholder-earth-gray shadow-sm"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 font-bold mb-1">Cidade *</label>
                  <input 
                    type="text"
                    required
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Ex: Cunha"
                    className="w-full p-3 rounded-xl border border-clay-border focus:outline-none focus:border-terracotta focus:ring-1 focus:ring-terracotta text-xs bg-white text-earth-dark placeholder-earth-gray shadow-sm"
                  />
                  {errors.city && <p className="text-[10px] text-red-500 font-bold mt-1">⚠ {errors.city}</p>}
                </div>

                <div>
                  <label className="block text-gray-700 font-bold mb-1">Bairro *</label>
                  <input 
                    type="text"
                    required
                    value={neighborhood}
                    onChange={(e) => setNeighborhood(e.target.value)}
                    placeholder="Ex: Vila Rica"
                    className="w-full p-3 rounded-xl border border-clay-border focus:outline-none focus:border-terracotta focus:ring-1 focus:ring-terracotta text-xs bg-white text-earth-dark placeholder-earth-gray shadow-sm"
                  />
                  {errors.neighborhood && <p className="text-[10px] text-red-500 font-bold mt-1">⚠ {errors.neighborhood}</p>}
                </div>
              </div>

              {regType === 'oficial' && (
                <div className="space-y-4 animate-fadeIn">
                  <div>
                    <label className="block text-gray-700 font-bold mb-1">Endereço Completo (Opcional)</label>
                    <input 
                      type="text"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Ex: Km 45 da Rodovia Cunha-Paraty"
                      className="w-full p-3 rounded-xl border border-clay-border focus:outline-none focus:border-terracotta focus:ring-1 focus:ring-terracotta text-xs bg-white text-earth-dark placeholder-earth-gray shadow-sm"
                    />
                  </div>

                  {/* Nível de Privacidade */}
                  <div>
                    <label className="block text-gray-700 font-bold mb-1.5 flex items-center gap-1">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" /> Nível de Privacidade Autorizado *
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                      <button
                        type="button"
                        onClick={() => setPrivacy('full')}
                        className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                          privacy === 'full' 
                            ? 'border-terracotta bg-sand-card/60 text-earth-dark font-semibold' 
                            : 'border-clay-border bg-white text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        <span className="font-bold text-[10px] uppercase text-terracotta">Completo</span>
                        <span className="text-[9px] mt-1 text-earth-gray leading-normal">Exibe marcador com rota direta no mapa.</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setPrivacy('neighborhood')}
                        className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                          privacy === 'neighborhood' 
                            ? 'border-terracotta bg-sand-card/60 text-earth-dark font-semibold' 
                            : 'border-clay-border bg-white text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        <span className="font-bold text-[10px] uppercase text-terracotta">Bairro</span>
                        <span className="text-[9px] mt-1 text-earth-gray leading-normal">Oculta rua. Mostra localização aproximada no bairro.</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setPrivacy('city')}
                        className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                          privacy === 'city' 
                            ? 'border-terracotta bg-sand-card/60 text-earth-dark font-semibold' 
                            : 'border-clay-border bg-white text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        <span className="font-bold text-[10px] uppercase text-terracotta">Cidade</span>
                        <span className="text-[9px] mt-1 text-earth-gray leading-normal">Oculta rua e bairro. Mostra apenas cidade no mapa.</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setPrivacy('state')}
                        className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                          privacy === 'state' 
                            ? 'border-terracotta bg-sand-card/60 text-earth-dark font-semibold' 
                            : 'border-clay-border bg-white text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        <span className="font-bold text-[10px] uppercase text-terracotta">Estado</span>
                        <span className="text-[9px] mt-1 text-earth-gray leading-normal">Exibe apenas o estado sem pino centralizado.</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Seção 3: Especialidades & Contatos */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-sienna uppercase tracking-wider border-b border-clay-border/40 pb-1.5 flex items-center gap-1.5 font-serif italic">
                <FileText className="w-4 h-4 text-terracotta" /> 3. Especialidades & Contatos do Proprietário
              </h3>

              {regType === 'oficial' && (
                <div className="animate-fadeIn">
                  <label className="block text-gray-700 font-bold mb-2">Especialidades Atendidas * (Selecione pelo menos uma)</label>
                  <div className="flex flex-wrap gap-1.5 p-3 border border-clay-border rounded-xl bg-gray-50/50 max-h-32 overflow-y-auto">
                    {SPECIALTIES.map(spec => {
                      const active = selectedSpecialties.includes(spec);
                      return (
                        <button
                          key={spec}
                          type="button"
                          onClick={() => toggleSpecialty(spec)}
                          className={`px-3 py-1.5 rounded-lg text-[10px] font-semibold border transition-all cursor-pointer ${
                            active 
                              ? 'bg-terracotta border-terracotta text-white' 
                              : 'bg-white hover:bg-gray-100 border-clay-border text-gray-600'
                          }`}
                        >
                          {active ? '✓ ' : ''}{spec}
                        </button>
                      );
                    })}
                  </div>
                  {errors.specialties && <p className="text-[10px] text-red-500 font-bold mt-1">⚠ {errors.specialties}</p>}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-700 font-bold mb-1">Instagram ou WhatsApp Oficial *</label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 font-bold">@ / WA</span>
                    <input 
                      type="text"
                      required
                      value={contact}
                      onChange={(e) => setContact(e.target.value)}
                      placeholder="Ex: @ceramicasuzuki ou 11999998888"
                      className="w-full pl-16 pr-3.5 py-3 rounded-xl border border-clay-border focus:outline-none focus:border-terracotta focus:ring-1 focus:ring-terracotta text-xs bg-white text-earth-dark placeholder-earth-gray shadow-sm"
                    />
                  </div>
                  {errors.contact && <p className="text-[10px] text-red-500 font-bold mt-1">⚠ {errors.contact}</p>}
                  <p className="text-[9px] text-earth-gray mt-1 leading-normal">
                    {regType === 'oficial' 
                      ? 'Utilizado para criar botões diretos de contato no mapa.' 
                      : 'Utilizado para enviar o convite automático de publicação gratuita.'}
                  </p>
                </div>

                {regType === 'oficial' ? (
                  <div className="animate-fadeIn">
                    <label className="block text-gray-700 font-bold mb-1">Foto Principal (Selecione um tema de fundo)</label>
                    <div className="grid grid-cols-4 gap-1.5 mt-1">
                      {TEMPLATE_PHOTOS.map((tpl, i) => (
                        <button
                          key={i}
                          type="button; button"
                          onClick={() => setPhotoUrl(tpl.url)}
                          className={`relative aspect-[4/3] rounded-lg overflow-hidden border-2 transition-all cursor-pointer ${
                            photoUrl === tpl.url ? 'border-terracotta ring-1 ring-terracotta' : 'border-transparent opacity-60 hover:opacity-100'
                          }`}
                          title={tpl.label}
                        >
                          <img src={tpl.url} alt={tpl.label} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          <span className="absolute bottom-0 inset-x-0 bg-black/60 text-[8px] text-white py-0.5 text-center truncate">
                            {tpl.label}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-gray-50 border border-clay-border rounded-xl flex flex-col justify-center text-xs text-earth-gray">
                    <span className="font-bold text-earth-dark mb-1">Fluxo do Convite de Terceiros:</span>
                    <p className="leading-relaxed text-[11px]">
                      Nossa equipe moderadora verificará o contato do espaço sugerido e enviará uma mensagem automatizada convidando-o a aceitar o convite e atualizar o cadastro.
                    </p>
                  </div>
                )}
              </div>
            </div>

            <button
              id="registration-submit-btn"
              type="submit"
              className="w-full py-3.5 font-bold rounded-xl bg-terracotta text-white hover:bg-sienna transition-all cursor-pointer shadow-md text-xs font-sans uppercase tracking-wider text-center"
            >
              {regType === 'oficial' ? 'Salvar Perfil Oficial Gratuito e Atualizar Mapa' : 'Registrar Sugestão e Enviar Convite ao Proprietário'}
            </button>

          </form>
        )}
      </div>

    </div>
  );
}
