import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Instagram, Phone, Calendar, Mail, MapPin, Globe, Clock, Star, 
  Send, ShieldCheck, Video, Image as ImageIcon, ChevronRight, MessageSquare, 
  Sparkles, Plus, Check, Award
} from 'lucide-react';
import { Establishment, CeramicEvent, Product, Review, PlanConfig, UserSession } from '../types';

interface ProfileDetailsProps {
  establishment: Establishment;
  onClose: () => void;
  onAddReview: (establishmentId: string, review: Omit<Review, 'id' | 'date' | 'establishmentId'>) => void;
  onClaimProfile: (id: string, details: { name: string; email: string; document: string; phone: string; justification: string; }) => void;
  onTriggerRoute: (coords: [number, number]) => void;
  plans?: PlanConfig[];
  currentSession?: UserSession | null;
}

export default function ProfileDetails({ 
  establishment, 
  onClose, 
  onAddReview, 
  onClaimProfile,
  onTriggerRoute,
  plans,
  currentSession
}: ProfileDetailsProps) {
  const [activeTab, setActiveTab] = useState<'sobre' | 'agenda' | 'produtos' | 'avaliacoes'>('sobre');

  const activeTier: string = 'atelie';
  const planName = 'Perfil Oficial Cadastrado';

  const hasTabs = true;
  
  // Feature flags
  const showGallery = true;
  const maxPhotosAllowed = 20;
  
  const showLogoAndBanner = true;
  const showServices = true;
  
  const showVideo = true;
  const showAgendaTab = true;
  const showProductsTab = true;
  const showStats = true;
  const showCustomButtons = true;

  
  // Modals state
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [showVisitModal, setShowVisitModal] = useState(false);
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [showAddReviewModal, setShowAddReviewModal] = useState(false);

  // Form states
  const [budgetName, setBudgetName] = useState('');
  const [budgetEmail, setBudgetEmail] = useState('');
  const [budgetPhone, setBudgetPhone] = useState('');
  const [budgetMessage, setBudgetMessage] = useState('');
  const [budgetSuccess, setBudgetSuccess] = useState(false);

  const [visitDate, setVisitDate] = useState('');
  const [visitTime, setVisitTime] = useState('');
  const [visitSuccess, setVisitSuccess] = useState(false);

  const [reviewerName, setReviewerName] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');

  // Local sync stats increment simulation
  const [viewsCount, setViewsCount] = useState(establishment.viewsCount || 24);
  const [waClicks, setWaClicks] = useState(establishment.clicksWhatsApp || 8);
  const [routeClicks, setRouteClicks] = useState(establishment.clicksRoute || 4);

  const handleWhatsAppClick = () => {
    setWaClicks(prev => prev + 1);
    establishment.clicksWhatsApp = (establishment.clicksWhatsApp || 0) + 1;
    window.open(`https://wa.me/55${establishment.whatsapp}`, '_blank');
  };

  const handleInstagramClick = () => {
    window.open(`https://instagram.com/${establishment.instagram.replace('@', '')}`, '_blank');
  };

  const handleRouteClick = () => {
    setRouteClicks(prev => prev + 1);
    establishment.clicksRoute = (establishment.clicksRoute || 0) + 1;
    onTriggerRoute(establishment.coordinates);
  };

  const handleBudgetSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setBudgetSuccess(true);
    setTimeout(() => {
      setShowBudgetModal(false);
      setBudgetSuccess(false);
      setBudgetName('');
      setBudgetEmail('');
      setBudgetPhone('');
      setBudgetMessage('');
    }, 2500);
  };

  const handleVisitSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setVisitSuccess(true);
    setTimeout(() => {
      setShowVisitModal(false);
      setVisitSuccess(false);
      setVisitDate('');
      setVisitTime('');
    }, 2500);
  };

  const handleReviewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewerName.trim() || !reviewComment.trim()) return;

    onAddReview(establishment.id, {
      userName: reviewerName,
      rating: reviewRating,
      comment: reviewComment
    });

    setReviewerName('');
    setReviewRating(5);
    setReviewComment('');
    setShowAddReviewModal(false);
  };

  // Claim Form States
  const [claimantName, setClaimantName] = useState(currentSession?.name || '');
  const [claimantEmail, setClaimantEmail] = useState(currentSession?.email || '');
  const [claimantDocument, setClaimantDocument] = useState(currentSession?.document || '');
  const [claimantPhone, setClaimantPhone] = useState('');
  const [claimantJustification, setClaimantJustification] = useState('');
  const [claimError, setClaimError] = useState('');

  const handleClaimSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setClaimError('');
    if (!claimantName.trim() || !claimantEmail.trim() || !claimantDocument.trim() || !claimantPhone.trim()) {
      setClaimError('Por favor, preencha todos os campos obrigatórios.');
      return;
    }
    
    onClaimProfile(establishment.id, {
      name: claimantName,
      email: claimantEmail,
      document: claimantDocument,
      phone: claimantPhone,
      justification: claimantJustification
    });
    setShowClaimModal(false);
  };

  const formatAddressByPrivacy = () => {
    if (establishment.privacy === 'full') {
      return `${establishment.address}, ${establishment.neighborhood} - ${establishment.city}, ${establishment.state}`;
    }
    if (establishment.privacy === 'neighborhood') {
      return `Bairro ${establishment.neighborhood} (Aproximado) - ${establishment.city}, ${establishment.state}`;
    }
    if (establishment.privacy === 'city') {
      return `${establishment.city}, ${establishment.state} (Apenas município visível)`;
    }
    return `Região do Estado de ${establishment.state} (Endereço Ocultado)`;
  };

  return (
    <div className="bg-white rounded-2xl border border-clay-border shadow-xl overflow-hidden h-full flex flex-col font-sans">
      
      {/* 1. Header Banner & Profile Branding */}
      <div className="relative">
        {/* Banner: cover image for Premium, fallback gradient for Free */}
        {showLogoAndBanner && establishment.cover ? (
          <div className="h-44 md:h-52 w-full bg-cover bg-center" style={{ backgroundImage: `url(${establishment.cover})` }} />
        ) : (
          <div className="h-28 w-full bg-gradient-to-r from-[#FAF2EE] to-[#E9D9D2] flex items-center px-6">
            <span className="text-[10px] uppercase font-black tracking-widest text-terracotta bg-white px-2.5 py-1 rounded-md shadow-sm border border-clay-border">
              {planName}
            </span>
          </div>
        )}

        {/* Floating actions (Close button) */}
        <button 
          onClick={onClose}
          className="absolute top-3 right-3 bg-white/90 hover:bg-white text-earth-dark p-1.5 rounded-full shadow-md z-10 transition-all text-[11px] font-bold uppercase tracking-wider cursor-pointer border border-clay-border"
        >
          Fechar ×
        </button>

        {/* Profile Logo & Title Overlay */}
        <div className="px-5 pt-3 pb-4 relative flex flex-col md:flex-row items-start md:items-end gap-4 -mt-10 md:-mt-12 z-2">
          {/* Logo element for Premium, initial badge for Free */}
          {showLogoAndBanner && establishment.logo ? (
            <img 
              src={establishment.logo} 
              alt={establishment.name} 
              className="w-20 h-20 rounded-2xl border-4 border-white shadow-md object-cover bg-white"
            />
          ) : (
            <div className="w-16 h-16 rounded-2xl border-4 border-white shadow-md bg-terracotta text-white flex items-center justify-center font-serif text-2xl font-bold">
              {establishment.name.charAt(0)}
            </div>
          )}

          <div className="flex-1 min-w-0 md:mb-1">
            <div className="flex flex-wrap items-center gap-1.5 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-sand-card text-terracotta border border-sand-border">
                {establishment.category}
              </span>
              {activeTier !== 'gratuito' && (
                <span className="inline-flex items-center gap-0.5 text-[9px] font-bold uppercase tracking-wider text-sienna bg-sand-card px-2 py-0.5 rounded-full border border-sand-border">
                  <Award className="w-3 h-3 text-terracotta" /> {planName}
                </span>
              )}
              {establishment.claimed ? (
                <span className="inline-flex items-center gap-0.5 text-[9px] font-bold uppercase tracking-wider text-olive bg-sand-card px-2 py-0.5 rounded-full border border-sand-border">
                  <ShieldCheck className="w-3 h-3 text-olive" /> Verificado
                </span>
              ) : (
                <span className="inline-flex items-center gap-0.5 text-[9px] font-bold uppercase tracking-wider text-earth-gray bg-sand-card px-2 py-0.5 rounded-full border border-sand-border">
                  Não Reivindicado
                </span>
              )}
            </div>
            
            <h2 className="text-xl md:text-2xl font-serif italic font-bold text-earth-dark tracking-tight leading-tight truncate">
              {establishment.name}
            </h2>

            <p className="flex items-center gap-1 text-xs text-earth-gray font-medium mt-0.5">
              <MapPin className="w-3 h-3 text-earth-gray shrink-0" />
              <span>{establishment.city} - {establishment.state}</span>
            </p>
          </div>

          {/* Core Star Rating summary */}
          <div className="flex items-center gap-1 bg-sand-card border border-sand-border px-2.5 py-1 rounded-xl shrink-0 self-start md:self-end">
            <Star className="w-3.5 h-3.5 fill-terracotta text-terracotta" />
            <span className="text-xs font-bold text-sienna">{establishment.rating.toFixed(1)}</span>
            <span className="text-[10px] text-earth-gray">({establishment.reviewsCount})</span>
          </div>
        </div>
      </div>

      {/* 2. Primary Actions Toolbar */}
      <div className="px-5 py-3 border-y border-gray-100 bg-gray-50 flex flex-wrap gap-2 items-center">
        <button 
          id="btn-route-action"
          onClick={handleRouteClick}
          className="flex-1 min-w-[120px] flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-white border border-clay-border hover:border-terracotta text-earth-dark hover:text-terracotta transition-all cursor-pointer shadow-sm"
        >
          <MapPin className="w-3.5 h-3.5 text-terracotta" />
          Como Chegar
        </button>

        <button 
          id="btn-whatsapp-action"
          onClick={handleWhatsAppClick}
          className="flex-1 min-w-[120px] flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-[#25D366] text-white hover:bg-[#20ba59] transition-all cursor-pointer shadow-sm"
        >
          <Phone className="w-3.5 h-3.5" />
          WhatsApp
        </button>

        {establishment.instagram && (
          <button 
            id="btn-instagram-action"
            onClick={handleInstagramClick}
            className="flex items-center justify-center p-2 rounded-xl bg-white border border-gray-200 text-gray-600 hover:text-[#E1306C] hover:border-[#E1306C] transition-all cursor-pointer"
            title="Instagram"
          >
            <Instagram className="w-4 h-4" />
          </button>
        )}

        {/* Premium extra actions */}
        {showCustomButtons && (
          <>
            <button 
              id="btn-budget-action"
              onClick={() => setShowBudgetModal(true)}
              className="flex-1 min-w-[120px] flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-terracotta text-white hover:bg-sienna transition-all cursor-pointer shadow-sm"
            >
              <Send className="w-3.5 h-3.5" />
              Solicitar Orçamento
            </button>

            <button 
              id="btn-visit-action"
              onClick={() => setShowVisitModal(true)}
              className="flex-1 min-w-[120px] flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-gray-900 text-white hover:bg-black transition-all cursor-pointer shadow-sm"
            >
              <Calendar className="w-3.5 h-3.5 text-amber-400" />
              Agendar Visita
            </button>
          </>
        )}
      </div>

      {/* 3. Sub-navigation tabs (Only for premium accounts, standard shows simple lists) */}
      {hasTabs ? (
        <div className="flex border-b border-gray-100 px-5 text-sm overflow-x-auto">
          <button 
            id="tab-btn-sobre"
            onClick={() => setActiveTab('sobre')}
            className={`py-3 px-1.5 border-b-2 font-medium transition-all mr-6 shrink-0 cursor-pointer ${
              activeTab === 'sobre' ? 'border-terracotta text-terracotta' : 'border-transparent text-earth-gray hover:text-earth-dark'
            }`}
          >
            Sobre
          </button>
          {showAgendaTab && (
            <button 
              id="tab-btn-agenda"
              onClick={() => setActiveTab('agenda')}
              className={`py-3 px-1.5 border-b-2 font-medium transition-all mr-6 shrink-0 cursor-pointer relative ${
                activeTab === 'agenda' ? 'border-terracotta text-terracotta' : 'border-transparent text-earth-gray hover:text-earth-dark'
              }`}
            >
              Agenda & Cursos
              {establishment.events && establishment.events.length > 0 && (
                <span className="absolute -top-0.5 -right-2 w-4 h-4 text-[9px] bg-terracotta text-white rounded-full flex items-center justify-center font-bold">
                  {establishment.events.length}
                </span>
              )}
            </button>
          )}
          {showProductsTab && (
            <button 
              id="tab-btn-produtos"
              onClick={() => setActiveTab('produtos')}
              className={`py-3 px-1.5 border-b-2 font-medium transition-all mr-6 shrink-0 cursor-pointer ${
                activeTab === 'produtos' ? 'border-terracotta text-terracotta' : 'border-transparent text-earth-gray hover:text-earth-dark'
              }`}
            >
              Produtos / Peças
            </button>
          )}
          <button 
            id="tab-btn-avaliacoes"
            onClick={() => setActiveTab('avaliacoes')}
            className={`py-3 px-1.5 border-b-2 font-medium transition-all shrink-0 cursor-pointer ${
              activeTab === 'avaliacoes' ? 'border-terracotta text-terracotta' : 'border-transparent text-earth-gray hover:text-earth-dark'
            }`}
          >
            Avaliações
          </button>
        </div>
      ) : null}

      {/* 4. Tab / Content Panels */}
      <div className="flex-1 overflow-y-auto p-5 space-y-6">
        
        {/* PREMIUM WRAPPER or STANDARD WRAPPER */}
        {(!hasTabs || activeTab === 'sobre') && (
          <div className="space-y-5 animate-fadeIn">
            
            {/* Short / Long Description */}
            <div>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 font-sans">
                Quem Somos
              </h3>
              <p className="text-gray-700 text-sm leading-relaxed">
                {hasTabs && establishment.longDescription 
                  ? establishment.longDescription 
                  : establishment.description}
              </p>
            </div>

            {/* Video embed showcase for Premium */}
            {showVideo && establishment.video && (
              <div>
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 font-sans flex items-center gap-1">
                  <Video className="w-3.5 h-3.5 text-terracotta" /> Tour Virtual
                </h3>
                <div className="relative aspect-video rounded-xl bg-black overflow-hidden shadow-inner border border-gray-100">
                  <video 
                    src={establishment.video} 
                    controls 
                    className="w-full h-full object-cover"
                    poster="https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?auto=format&fit=crop&w=800&q=80"
                  />
                </div>
              </div>
            )}

            {/* Specialties & Clay Focus tags */}
            <div>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2.5 font-sans">
                Especialidades Cerâmicas
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {establishment.specialties.map((spec) => (
                  <span 
                    key={spec}
                    className="px-2.5 py-1 text-xs font-sans rounded-lg bg-gray-50 text-gray-700 border border-gray-100"
                  >
                    🎨 {spec}
                  </span>
                ))}
              </div>
            </div>

            {/* Services provided */}
            {showServices && establishment.services && establishment.services.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2.5 font-sans">
                  Serviços Oferecidos
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {establishment.services.map((serv) => (
                    <span 
                      key={serv}
                      className="px-2.5 py-1 text-xs font-sans rounded-lg bg-blue-50/60 text-blue-800 border border-blue-100/50"
                    >
                      ✔ {serv}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Photos gallery */}
            {showGallery && establishment.gallery && establishment.gallery.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2.5 font-sans flex items-center gap-1">
                  <ImageIcon className="w-3.5 h-3.5 text-terracotta" /> Galeria de Fotos ({establishment.gallery.slice(0, maxPhotosAllowed).length} de {maxPhotosAllowed})
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {establishment.gallery.slice(0, maxPhotosAllowed).map((img, index) => (
                    <div key={index} className="aspect-[4/3] rounded-xl overflow-hidden border border-gray-100 bg-gray-50">
                      <img 
                        src={img} 
                        alt="Ateliê" 
                        className="w-full h-full object-cover hover:scale-105 transition-all duration-300" 
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Statistics Panel (Estúdio & Institucional Only) */}
            {showStats && (
              <div className="bg-[#FAF9F5] p-3.5 rounded-xl border border-clay-border/50 space-y-2.5">
                <h4 className="text-[10px] uppercase font-bold tracking-wider text-earth-gray flex items-center gap-1">
                  📊 Estatísticas de Desempenho do Perfil
                </h4>
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="bg-white p-2 rounded-lg border border-clay-border/30">
                    <span className="text-[10px] text-earth-gray block">Visualizações</span>
                    <strong className="text-sm text-earth-dark font-extrabold">{viewsCount}</strong>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-clay-border/30">
                    <span className="text-[10px] text-earth-gray block">Cliques Whats</span>
                    <strong className="text-sm text-earth-dark font-extrabold">{waClicks}</strong>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-clay-border/30">
                    <span className="text-[10px] text-earth-gray block">Rotas Traçadas</span>
                    <strong className="text-sm text-earth-dark font-extrabold">{routeClicks}</strong>
                  </div>
                </div>
              </div>
            )}

            {/* Metadata (Address Privacy & Work Hours) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="bg-[#FAF9F5] p-3.5 rounded-xl border border-gray-100 text-xs">
                <p className="font-semibold text-gray-700 mb-1 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-terracotta" /> Endereço & Privacidade
                </p>
                <p className="text-gray-600 leading-normal">{formatAddressByPrivacy()}</p>
                
                {/* Visual state warning if approximate */}
                {establishment.privacy !== 'full' && (
                  <p className="text-[10px] text-amber-700 font-medium mt-1 bg-amber-50 px-2 py-0.5 rounded border border-amber-100">
                    ⚠ Localização aproximada no mapa para proteger a privacidade residencial.
                  </p>
                )}
              </div>

              <div className="bg-[#FAF9F5] p-3.5 rounded-xl border border-gray-100 text-xs">
                <p className="font-semibold text-gray-700 mb-1 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-terracotta" /> Horário de Funcionamento
                </p>
                <p className="text-gray-600 whitespace-pre-line leading-relaxed">
                  {establishment.hours || 'Segunda a Sexta: 09:00 às 18:00\nSábado: Sob agendamento'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Tab Agenda (Courses & Events list) */}
        {showAgendaTab && activeTab === 'agenda' && (
          <div className="space-y-4 animate-fadeIn">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider font-sans mb-1">
              Próximos Cursos & Eventos
            </h3>
            {establishment.events && establishment.events.length > 0 ? (
              <div className="space-y-3">
                {establishment.events.map((ev) => (
                  <div key={ev.id} className="p-4 border border-gray-100 rounded-xl bg-[#FAF9F5] hover:shadow-md transition-all">
                    <div className="flex justify-between items-start gap-2">
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-terracotta/10 text-terracotta">
                        {ev.type}
                      </span>
                      {ev.price && (
                        <span className="text-xs font-bold text-terracotta bg-white px-2 py-0.5 rounded border border-clay-border shadow-sm">
                          {ev.price}
                        </span>
                      )}
                    </div>
                    <h4 className="text-sm font-bold text-gray-800 mt-2">{ev.title}</h4>
                    <p className="text-xs text-gray-600 mt-1 leading-relaxed">{ev.description}</p>
                    
                    <div className="grid grid-cols-2 gap-2 text-[11px] text-gray-500 pt-3 mt-3 border-t border-gray-100/50">
                      <div>
                        <strong>Data:</strong> {ev.date} {ev.time && `| ${ev.time}`}
                      </div>
                      <div>
                        <strong>Instrutor:</strong> {ev.instructor || 'Equipe Ateliê'}
                      </div>
                    </div>
                    <div className="mt-3.5 flex justify-end">
                      <button 
                        onClick={() => {
                          setShowVisitModal(true);
                        }}
                        className="px-3 py-1 text-xs font-medium rounded-lg bg-gray-900 text-white hover:bg-black transition-all cursor-pointer"
                      >
                        Inscrições & Detalhes
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 bg-gray-50 rounded-xl text-gray-400 text-xs border border-dashed border-gray-200">
                Sem eventos cadastrados no momento.
              </div>
            )}
          </div>
        )}

        {/* Tab Vitrine (Products showcase list) */}
        {showProductsTab && activeTab === 'produtos' && (
          <div className="space-y-4 animate-fadeIn">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider font-sans mb-1">
              Vitrine de Peças & Produtos
            </h3>
            {establishment.products && establishment.products.length > 0 ? (
              <div className="grid grid-cols-2 gap-3">
                {establishment.products.map((p) => (
                  <div key={p.id} className="border border-gray-100 rounded-xl overflow-hidden bg-white hover:shadow-md transition-all flex flex-col">
                    <div className="aspect-square bg-gray-50 overflow-hidden relative">
                      <img src={p.photo} alt={p.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      <span className="absolute bottom-2 right-2 bg-black/75 backdrop-blur-sm text-[10px] font-bold text-white px-2 py-0.5 rounded-md">
                        R$ {p.price}
                      </span>
                    </div>
                    <div className="p-3 flex-1 flex flex-col justify-between">
                      <div>
                        <h4 className="text-xs font-bold text-gray-800 line-clamp-1">{p.name}</h4>
                        <p className="text-[10px] text-gray-500 mt-1 line-clamp-2 leading-relaxed">{p.description}</p>
                      </div>
                      <button 
                        onClick={() => {
                          setBudgetMessage(`Olá! Gostaria de solicitar um orçamento para o produto: "${p.name}" (R$ ${p.price}).`);
                          setShowBudgetModal(true);
                        }}
                        className="mt-2.5 w-full py-1 text-[10px] font-semibold rounded-lg bg-gray-50 text-earth-dark hover:bg-sand-card hover:text-terracotta border border-clay-border hover:border-terracotta/30 transition-all text-center cursor-pointer"
                      >
                        Comprar / Orçar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 bg-gray-50 rounded-xl text-gray-400 text-xs border border-dashed border-gray-200">
                Sem produtos expostos nesta vitrine.
              </div>
            )}
          </div>
        )}

        {/* Tab Reviews (Ratings left, list of feedback) */}
        {(!hasTabs || activeTab === 'avaliacoes') && hasTabs && (
          <div className="space-y-4 animate-fadeIn">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider font-sans">
                Opiniões da Comunidade ({establishment.reviewsCount})
              </h3>
              <button 
                id="btn-trigger-review-modal"
                onClick={() => setShowAddReviewModal(true)}
                className="inline-flex items-center gap-1 text-xs text-terracotta font-semibold hover:underline cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Escrever Avaliação
              </button>
            </div>

            {/* List reviews */}
            <div className="space-y-3">
              {/* Preloaded reviews filtered */}
              {/* Since we have custom state reviews loaded in App, we will display them */}
              <ReviewsSection establishmentId={establishment.id} onAddReview={onAddReview} />
            </div>
          </div>
        )}
      </div>

      {/* 5. BACKUP STANDARD REVIEWS (For standard listings that don't support Premium tabs) */}
      {!hasTabs && (
        <div className="border-t border-gray-100 p-5 space-y-4 bg-gray-50/50">
          <div className="flex justify-between items-center">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider font-sans">
              Avaliações ({establishment.reviewsCount})
            </h3>
            <button 
              id="btn-trigger-review-modal-standard"
              onClick={() => setShowAddReviewModal(true)}
              className="inline-flex items-center gap-1 text-xs text-terracotta font-semibold hover:underline cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Avaliar
            </button>
          </div>
          <ReviewsSection establishmentId={establishment.id} onAddReview={onAddReview} />
        </div>
      )}

      {/* ========================================================= */}
      {/* MODALS RENDER SECTION                                     */}
      {/* ========================================================= */}

      {/* Modal A: Claim Profile */}
      <AnimatePresence>
        {showClaimModal && (
          <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm overflow-y-auto">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl border border-gray-100 p-6 max-w-lg w-full shadow-2xl relative my-8"
            >
              <button onClick={() => setShowClaimModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 font-bold text-lg cursor-pointer">×</button>
              
              {establishment.ownerId ? (
                // 1. BLOCKED CASE: Owner ID already exists
                <div className="space-y-4">
                  <div className="text-center space-y-3">
                    <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto border border-red-100">
                      <ShieldCheck className="w-6 h-6 text-red-600" />
                    </div>
                    <h3 className="text-lg font-bold text-red-900">Perfil Bloqueado para Reivindicação</h3>
                    <p className="text-xs text-gray-500 leading-normal">
                      Este estabelecimento já possui uma propriedade digital vinculada de forma exclusiva e permanente a um <strong>Owner ID</strong> ({establishment.ownerId}).
                    </p>
                  </div>
                  
                  <div className="p-4 bg-red-50/40 border border-red-100 rounded-xl text-xs text-red-900 leading-relaxed space-y-2">
                    <p className="font-bold">Por que isto está bloqueado?</p>
                    <p>
                      Para evitar fraudes e sequestros de perfis, nenhum usuário recém-criado ou externo pode assumir a identidade de um ateliê que já possui proprietário homologado.
                    </p>
                    <p>
                      Se você é o legítimo proprietário ou precisa de transferência de propriedade, solicite que o atual Proprietário inicie um fluxo de <strong>Transferência de Propriedade</strong> ou contate nosso suporte através do e-mail de homologação.
                    </p>
                  </div>
                  
                  <button 
                    onClick={() => setShowClaimModal(false)}
                    className="w-full py-2 text-xs font-bold rounded-xl bg-gray-900 text-white hover:bg-black transition-all cursor-pointer"
                  >
                    Entendido e Fechar
                  </button>
                </div>
              ) : (
                // 2. CLAIM FORM CASE: Start Process
                <form onSubmit={handleClaimSubmit} className="space-y-4 text-xs">
                  <div className="text-center space-y-2">
                    <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center mx-auto border border-emerald-100">
                      <ShieldCheck className="w-6 h-6 text-emerald-600" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900">Reivindicar Propriedade Digital</h3>
                    <p className="text-[11px] text-gray-500 leading-normal">
                      Solicite a veracidade cadastral deste ateliê para gerar seu <strong>Owner ID</strong> permanente e liberar o painel de edição.
                    </p>
                  </div>

                  {claimError && (
                    <div className="p-2.5 bg-red-50 text-red-800 rounded-lg text-xs font-semibold">
                      {claimError}
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-gray-600 font-semibold mb-1">Nome do Proprietário/Responsável *</label>
                      <input 
                        type="text" 
                        required 
                        value={claimantName}
                        onChange={(e) => setClaimantName(e.target.value)}
                        className="w-full p-2 rounded-lg border border-gray-200 focus:outline-none focus:border-terracotta"
                        placeholder="Ex: Clara Silva"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-600 font-semibold mb-1">E-mail de Contato Comercial *</label>
                      <input 
                        type="email" 
                        required 
                        value={claimantEmail}
                        onChange={(e) => setClaimantEmail(e.target.value)}
                        className="w-full p-2 rounded-lg border border-gray-200 focus:outline-none focus:border-terracotta"
                        placeholder="clara@exemplo.com"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-gray-600 font-semibold mb-1">CPF ou CNPJ de Validação *</label>
                      <input 
                        type="text" 
                        required 
                        value={claimantDocument}
                        onChange={(e) => setClaimantDocument(e.target.value)}
                        className="w-full p-2 rounded-lg border border-gray-200 focus:outline-none focus:border-terracotta"
                        placeholder="Ex: 123.456.789-00 ou CNPJ"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-600 font-semibold mb-1">Telefone/WhatsApp Principal *</label>
                      <input 
                        type="tel" 
                        required 
                        value={claimantPhone}
                        onChange={(e) => setClaimantPhone(e.target.value)}
                        className="w-full p-2 rounded-lg border border-gray-200 focus:outline-none focus:border-terracotta"
                        placeholder="Ex: (11) 99999-9999"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-gray-600 font-semibold mb-1">Justificativa ou Link de Comprovação (opcional)</label>
                    <textarea 
                      rows={2}
                      value={claimantJustification}
                      onChange={(e) => setClaimantJustification(e.target.value)}
                      className="w-full p-2 rounded-lg border border-gray-200 focus:outline-none focus:border-terracotta"
                      placeholder="Ex: Sou o professor fundador desde 2021, link do nosso site oficial..."
                    />
                  </div>

                  <div className="p-3 bg-gray-50 border border-gray-150 rounded-xl space-y-1.5 leading-normal text-[11px] text-gray-600">
                    <p className="font-bold text-gray-800">🔒 Segurança de Homologação</p>
                    <p>
                      Sua solicitação entrará em estado de <strong>Cadastro em Análise</strong>. A coordenação do CeraMapa auditará a documentação antes de aprovar e vincular seu Owner ID definitivo.
                    </p>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button 
                      type="button"
                      onClick={() => setShowClaimModal(false)}
                      className="flex-1 py-2 text-xs font-semibold rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button 
                      id="btn-confirm-claim"
                      type="submit"
                      className="flex-1 py-2 text-xs font-bold rounded-xl bg-terracotta text-white hover:bg-sienna cursor-pointer"
                    >
                      Solicitar Reivindicação
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal B: Request Budget (Orçamento) */}
      <AnimatePresence>
        {showBudgetModal && (
          <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl border border-gray-100 p-6 max-w-md w-full shadow-2xl relative"
            >
              <button onClick={() => setShowBudgetModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 font-bold text-lg cursor-pointer">×</button>
              
              <h3 className="text-lg font-bold text-gray-900 mb-1 flex items-center gap-1.5 font-serif italic">
                <Send className="w-5 h-5 text-terracotta" /> Solicitar Orçamento
              </h3>
              <p className="text-xs text-gray-500 mb-4">
                Envie uma mensagem direta de solicitação de serviços de queima, encomendas ou cursos.
              </p>

              {budgetSuccess ? (
                <div className="py-8 text-center space-y-2">
                  <div className="w-10 h-10 bg-emerald-50 rounded-full flex items-center justify-center mx-auto border border-emerald-100">
                    <Check className="w-5 h-5 text-emerald-600" />
                  </div>
                  <h4 className="text-sm font-bold text-gray-900">Mensagem Enviada!</h4>
                  <p className="text-xs text-gray-500">O proprietário recebeu seu contato e responderá em breve por email ou WhatsApp.</p>
                </div>
              ) : (
                <form onSubmit={handleBudgetSubmit} className="space-y-3.5 text-xs">
                  <div>
                    <label className="block text-gray-600 font-medium mb-1">Seu Nome Completo *</label>
                    <input 
                      type="text" 
                      required 
                      value={budgetName}
                      onChange={(e) => setBudgetName(e.target.value)}
                      className="w-full p-2.5 rounded-lg border border-clay-border focus:outline-none focus:border-terracotta focus:ring-1 focus:ring-terracotta bg-white text-earth-dark placeholder-earth-gray" 
                      placeholder="Ex: Clara Mendes"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-gray-600 font-medium mb-1">Seu Email *</label>
                      <input 
                        type="email" 
                        required 
                        value={budgetEmail}
                        onChange={(e) => setBudgetEmail(e.target.value)}
                        className="w-full p-2.5 rounded-lg border border-clay-border focus:outline-none focus:border-terracotta focus:ring-1 focus:ring-terracotta bg-white text-earth-dark placeholder-earth-gray" 
                        placeholder="clara@example.com"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-600 font-medium mb-1">Seu WhatsApp *</label>
                      <input 
                        type="tel" 
                        required 
                        value={budgetPhone}
                        onChange={(e) => setBudgetPhone(e.target.value)}
                        className="w-full p-2.5 rounded-lg border border-clay-border focus:outline-none focus:border-terracotta focus:ring-1 focus:ring-terracotta bg-white text-earth-dark placeholder-earth-gray" 
                        placeholder="(11) 98888-8888"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-gray-600 font-medium mb-1">Mensagem ou Especificação de Projeto *</label>
                    <textarea 
                      required 
                      rows={4}
                      value={budgetMessage}
                      onChange={(e) => setBudgetMessage(e.target.value)}
                      className="w-full p-2.5 rounded-lg border border-clay-border focus:outline-none focus:border-terracotta focus:ring-1 focus:ring-terracotta bg-white text-earth-dark placeholder-earth-gray" 
                      placeholder="Especifique dimensões, volume, tipo de argila ou quantidade de peças de alta temperatura para queimar."
                    />
                  </div>

                  <button 
                    id="btn-submit-budget"
                    type="submit"
                    className="w-full py-2.5 font-bold rounded-xl bg-terracotta text-white hover:bg-sienna transition-all cursor-pointer shadow-md"
                  >
                    Enviar Solicitação
                  </button>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal C: Schedule Visit */}
      <AnimatePresence>
        {showVisitModal && (
          <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl border border-gray-100 p-6 max-w-md w-full shadow-2xl relative"
            >
              <button onClick={() => setShowVisitModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 font-bold text-lg cursor-pointer">×</button>
              
              <h3 className="text-lg font-bold text-gray-900 mb-1 flex items-center gap-1.5">
                <Calendar className="w-5 h-5 text-amber-500" /> Agendar Visita / Curso
              </h3>
              <p className="text-xs text-gray-500 mb-4">
                Selecione uma data e horário preferencial para visitar o ateliê ou realizar um tour guiado de queimas.
              </p>

              {visitSuccess ? (
                <div className="py-8 text-center space-y-2">
                  <div className="w-10 h-10 bg-emerald-50 rounded-full flex items-center justify-center mx-auto border border-emerald-100">
                    <Check className="w-5 h-5 text-emerald-600" />
                  </div>
                  <h4 className="text-sm font-bold text-gray-900">Visita Pré-Agendada!</h4>
                  <p className="text-xs text-gray-500">
                    Confirmamos sua intenção de visita para o dia <strong>{visitDate}</strong> às <strong>{visitTime}</strong>. Uma mensagem automática foi enviada ao WhatsApp do local para confirmação final.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleVisitSubmit} className="space-y-4 text-xs">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-gray-600 font-medium mb-1">Data Escolhida *</label>
                      <input 
                        type="date" 
                        required 
                        value={visitDate}
                        onChange={(e) => setVisitDate(e.target.value)}
                        className="w-full p-2.5 rounded-lg border border-clay-border focus:outline-none focus:border-terracotta focus:ring-1 focus:ring-terracotta bg-white text-earth-dark placeholder-earth-gray" 
                      />
                    </div>
                    <div>
                      <label className="block text-gray-600 font-medium mb-1">Horário Escolhido *</label>
                      <select 
                        required 
                        value={visitTime}
                        onChange={(e) => setVisitTime(e.target.value)}
                        className="w-full p-2.5 rounded-lg border border-clay-border focus:outline-none focus:border-terracotta focus:ring-1 focus:ring-terracotta bg-white text-earth-dark"
                      >
                        <option value="">Selecione...</option>
                        <option value="09:00">09:00</option>
                        <option value="11:00">11:00</option>
                        <option value="14:00">14:00</option>
                        <option value="16:00">16:00</option>
                        <option value="18:00">18:00</option>
                      </select>
                    </div>
                  </div>

                  <div className="p-3 bg-amber-50 border border-amber-100 text-[11px] text-amber-800 rounded-lg">
                    💡 <strong>Nota Importante:</strong> O ateliê requer confirmação de agendamentos com pelo menos 24 horas de antecedência.
                  </div>

                  <button 
                    id="btn-submit-visit"
                    type="submit"
                    className="w-full py-2.5 font-bold rounded-xl bg-gray-900 text-white hover:bg-black transition-all cursor-pointer animate-pulse"
                  >
                    Confirmar Solicitação de Data
                  </button>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal D: Write a Review */}
      <AnimatePresence>
        {showAddReviewModal && (
          <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl border border-gray-100 p-6 max-w-md w-full shadow-2xl relative"
            >
              <button onClick={() => setShowAddReviewModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 font-bold text-lg cursor-pointer">×</button>
              
              <h3 className="text-lg font-bold text-gray-900 mb-1 flex items-center gap-1.5">
                <Star className="w-5 h-5 text-amber-500 fill-amber-500" /> Escrever Avaliação
              </h3>
              <p className="text-xs text-gray-500 mb-4">
                Compartilhe sua experiência de compra, curso ou queima neste estabelecimento de cerâmica.
              </p>

              <form onSubmit={handleReviewSubmit} className="space-y-4 text-xs">
                <div>
                  <label className="block text-gray-600 font-medium mb-1">Seu Nome *</label>
                  <input 
                    type="text" 
                    required 
                    value={reviewerName}
                    onChange={(e) => setReviewerName(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-clay-border focus:outline-none focus:border-terracotta focus:ring-1 focus:ring-terracotta bg-white text-earth-dark placeholder-earth-gray" 
                    placeholder="Ex: João Silva"
                  />
                </div>

                <div>
                  <label className="block text-gray-600 font-medium mb-1">Nota (Estrelas) *</label>
                  <div className="flex gap-2.5 mt-1">
                    {[1, 2, 3, 4, 5].map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setReviewRating(val)}
                        className="focus:outline-none cursor-pointer"
                      >
                        <Star className={`w-7 h-7 transition-all ${
                          val <= reviewRating ? 'fill-amber-400 text-amber-400 scale-110' : 'text-gray-300'
                        }`} />
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-gray-600 font-medium mb-1">Seu Comentário *</label>
                  <textarea 
                    required 
                    rows={3}
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-clay-border focus:outline-none focus:border-terracotta focus:ring-1 focus:ring-terracotta bg-white text-earth-dark placeholder-earth-gray" 
                    placeholder="Conte como foi o atendimento, a centralização da peça no torno ou as cores dos esmaltes de alta temperatura..."
                  />
                </div>

                <button 
                  id="btn-submit-review"
                  type="submit"
                  className="w-full py-2.5 font-bold rounded-xl bg-terracotta text-white hover:bg-sienna transition-all cursor-pointer shadow-md"
                >
                  Publicar Avaliação
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}

// Inner subcomponent to display and manage reviews locally with mock store
interface ReviewsSectionProps {
  establishmentId: string;
  onAddReview: (id: string, r: Omit<Review, 'id' | 'date'>) => void;
}

import { INITIAL_REVIEWS } from '../data';

function ReviewsSection({ establishmentId }: ReviewsSectionProps) {
  // Let's lookup local storage reviews if stored, or fetch from static seed
  const storedReviews = localStorage.getItem(`reviews_${establishmentId}`);
  const reviews: Review[] = storedReviews 
    ? JSON.parse(storedReviews) 
    : INITIAL_REVIEWS.filter((r) => r.establishmentId === establishmentId);

  // Local owner reply state
  const [activeReplyId, setActiveReplyId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');

  const handlePostReply = (reviewId: string) => {
    if (!replyText.trim()) return;
    const updated = reviews.map((r) => {
      if (r.id === reviewId) {
        return { ...r, reply: replyText };
      }
      return r;
    });
    localStorage.setItem(`reviews_${establishmentId}`, JSON.stringify(updated));
    setReplyText('');
    setActiveReplyId(null);
    // Force simple reload (mock)
    window.dispatchEvent(new Event('storage'));
  };

  if (reviews.length === 0) {
    return (
      <div className="text-center py-6 text-xs text-gray-400 font-sans border border-dashed border-gray-200 rounded-xl bg-white">
        Nenhuma avaliação escrita. Seja o primeiro a apoiar este ceramista!
      </div>
    );
  }

  return (
    <div className="space-y-3.5">
      {reviews.map((r) => (
        <div key={r.id} className="p-3.5 bg-white border border-gray-100 rounded-xl shadow-sm text-xs space-y-1.5">
          <div className="flex justify-between items-center">
            <span className="font-bold text-gray-800">{r.userName}</span>
            <span className="text-[10px] text-gray-400">{r.date}</span>
          </div>

          <div className="flex gap-0.5">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star key={s} className={`w-3.5 h-3.5 ${s <= r.rating ? 'fill-amber-400 text-amber-400' : 'text-gray-200'}`} />
            ))}
          </div>

          <p className="text-gray-600 leading-normal italic font-sans">
            "{r.comment}"
          </p>

          {/* Owner Reply */}
          {r.reply ? (
            <div className="bg-[#FAF9F5] border-l-2 border-terracotta p-2.5 rounded-r-lg mt-2 space-y-0.5">
              <p className="font-semibold text-gray-700 text-[10px] uppercase tracking-wider flex items-center gap-1">
                <Award className="w-3 h-3 text-terracotta" /> Resposta do Proprietário
              </p>
              <p className="text-gray-600 italic">"{r.reply}"</p>
            </div>
          ) : (
            <div className="flex justify-end pt-1">
              {activeReplyId === r.id ? (
                <div className="w-full space-y-2 mt-1">
                  <textarea
                    rows={2}
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Escreva sua resposta como proprietário..."
                    className="w-full p-2 border border-clay-border rounded-lg bg-gray-50 text-xs focus:outline-none focus:border-terracotta focus:ring-1 focus:ring-terracotta bg-white text-earth-dark placeholder-earth-gray"
                  />
                  <div className="flex justify-end gap-1.5 text-[11px]">
                    <button 
                      onClick={() => setActiveReplyId(null)}
                      className="px-2.5 py-1 rounded border border-clay-border text-earth-gray hover:bg-gray-50 cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button 
                      onClick={() => handlePostReply(r.id)}
                      className="px-2.5 py-1 rounded bg-terracotta text-white hover:bg-sienna cursor-pointer"
                    >
                      Enviar Resposta
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  id={`btn-reply-review-${r.id}`}
                  onClick={() => setActiveReplyId(r.id)}
                  className="text-[11px] text-earth-gray hover:text-terracotta font-semibold flex items-center gap-0.5 cursor-pointer"
                >
                  <MessageSquare className="w-3 h-3" /> Responder (Dono do Perfil)
                </button>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
