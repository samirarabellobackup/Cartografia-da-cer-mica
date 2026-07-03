import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Instagram, Phone, Calendar, Mail, MapPin, Globe, Clock, Star, 
  Send, ShieldCheck, Video, Image as ImageIcon, ChevronRight, MessageSquare, 
  Sparkles, Plus, Check, Award
} from 'lucide-react';
import { Establishment, EstablishmentWithHomologation, Review, PlanConfig, UserSession } from '../types';

interface ProfileDetailsProps {
  establishment: EstablishmentWithHomologation;
  onClose: () => void;
  onAddReview: (establishmentId: string, review: Omit<Review, 'id' | 'date' | 'establishmentId'>) => void;
  onClaimProfile: (id: string, details: { name: string; email: string; document: string; phone: string; justification: string; }) => void;
  onTriggerRoute: (coords: [number, number]) => void;
  plans?: PlanConfig[];
  currentSession?: UserSession | null;
}

// Helper to determine if a value is actually filled and valid (excluding "Pular" placeholders)
const isValidField = (val: any): boolean => {
  if (val === null || val === undefined) return false;
  if (typeof val === 'string') {
    const clean = val.trim().toLowerCase();
    if (!clean) return false;
    if (clean.includes('pular') || clean.includes('não se enquadra') || clean.includes('nao se enquadra')) {
      return false;
    }
    return true;
  }
  if (Array.isArray(val)) {
    return val.filter(item => isValidField(item)).length > 0;
  }
  return true;
};

export default function ProfileDetails({ 
  establishment, 
  onClose, 
  onAddReview, 
  onClaimProfile,
  onTriggerRoute,
  plans,
  currentSession
}: ProfileDetailsProps) {
  // Modals state
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [showVisitModal, setShowVisitModal] = useState(false);
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

  // Performance simulation states
  const [viewsCount] = useState(establishment.viewsCount || 37);
  const [waClicks, setWaClicks] = useState(establishment.clicksWhatsApp || 12);
  const [routeClicks, setRouteClicks] = useState(establishment.clicksRoute || 6);

  const handleWhatsAppClick = () => {
    setWaClicks(prev => prev + 1);
    establishment.clicksWhatsApp = (establishment.clicksWhatsApp || 0) + 1;
    window.open(`https://wa.me/55${establishment.whatsapp.replace(/\D/g, '')}`, '_blank');
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

  // Filter lists & prepare section visibilities
  const specialties = (establishment.specialties || []).filter(isValidField);
  const services = (establishment.services || []).filter(isValidField);
  const products = establishment.products || [];
  const gallery = (establishment.gallery || []).filter(isValidField);

  const hasPhoto = isValidField(establishment.photo);
  const hasCover = isValidField(establishment.cover);

  const showGenerais = isValidField(establishment.description) || specialties.length > 0 || gallery.length > 0 || hasPhoto;
  const showContatos = isValidField(establishment.whatsapp) || isValidField(establishment.instagram) || isValidField(establishment.website) || isValidField(establishment.email) || isValidField(establishment.phone);
  const showServicos = services.length > 0;
  const showProdutos = products.length > 0;
  const showEstrutura = isValidField(establishment.hours) || isValidField(establishment.neighborhood) || isValidField(establishment.address);
  const showComplementares = true; // Always show as it contains reviews and geoloc validation info

  return (
    <div className="bg-white rounded-2xl border border-clay-border shadow-xl overflow-hidden h-full flex flex-col font-sans">
      
      {/* 1. Header Banner */}
      <div className="relative shrink-0">
        {hasCover ? (
          <div className="h-32 md:h-40 w-full bg-cover bg-center" style={{ backgroundImage: `url(${establishment.cover})` }} />
        ) : (
          <div className="h-24 w-full bg-gradient-to-r from-[#FAF2EE] to-[#E9D9D2] flex items-center px-6">
            <span className="text-[10px] uppercase font-black tracking-widest text-terracotta bg-white px-2.5 py-1 rounded-md shadow-sm border border-clay-border">
              Cartografia da Cerâmica
            </span>
          </div>
        )}

        {/* Floating actions (Close button) */}
        <button 
          onClick={onClose}
          className="absolute top-3 right-3 bg-white/90 hover:bg-white text-earth-dark p-1.5 rounded-full shadow-md z-10 transition-all text-xs font-bold uppercase tracking-wider cursor-pointer border border-clay-border"
        >
          Fechar ×
        </button>

        {/* Profile Logo & Title Overlay */}
        <div className="px-5 pt-3 pb-4 relative flex items-start gap-4 -mt-8 z-2">
          {hasPhoto ? (
            <img 
              src={establishment.photo} 
              alt={establishment.name} 
              className="w-16 h-16 rounded-xl border-4 border-white shadow-md object-cover bg-white shrink-0"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-16 h-16 rounded-xl border-4 border-white shadow-md bg-terracotta text-white flex items-center justify-center font-serif text-2xl font-bold shrink-0">
              {establishment.name.charAt(0)}
            </div>
          )}

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-1.5 mb-1">
              <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-sand-card text-terracotta border border-sand-border">
                {establishment.category}
              </span>
              {establishment.claimed && (
                <span className="inline-flex items-center gap-0.5 text-[9px] font-bold uppercase tracking-wider text-olive bg-sand-card px-2 py-0.5 rounded-full border border-sand-border">
                  <ShieldCheck className="w-3 h-3 text-olive" /> Verificado
                </span>
              )}
            </div>
            
            <h2 className="text-lg font-serif italic font-bold text-earth-dark tracking-tight leading-tight truncate">
              {establishment.name}
            </h2>

            <p className="flex items-center gap-1 text-[11px] text-earth-gray font-semibold mt-0.5">
              <MapPin className="w-3.5 h-3.5 text-terracotta shrink-0" />
              <span>{establishment.city} - {establishment.state}</span>
            </p>
          </div>
        </div>
      </div>

      {/* 2. Primary Actions Toolbar */}
      <div className="px-5 py-3 border-y border-gray-100 bg-gray-50 flex flex-wrap gap-2 items-center shrink-0">
        <button 
          id="btn-route-action"
          onClick={handleRouteClick}
          className="flex-1 min-w-[110px] flex items-center justify-center gap-1 px-2.5 py-2 text-xs font-bold rounded-xl bg-white border border-clay-border hover:border-terracotta text-earth-dark hover:text-terracotta transition-all cursor-pointer shadow-sm uppercase tracking-wider"
        >
          <MapPin className="w-3.5 h-3.5 text-terracotta animate-bounce" />
          Como Chegar
        </button>

        {isValidField(establishment.whatsapp) && (
          <button 
            id="btn-whatsapp-action"
            onClick={handleWhatsAppClick}
            className="flex-1 min-w-[110px] flex items-center justify-center gap-1 px-2.5 py-2 text-xs font-bold rounded-xl bg-[#25D366] text-white hover:bg-[#20ba59] transition-all cursor-pointer shadow-sm uppercase tracking-wider"
          >
            <Phone className="w-3.5 h-3.5" />
            WhatsApp
          </button>
        )}

        {isValidField(establishment.instagram) && (
          <button 
            id="btn-instagram-action"
            onClick={handleInstagramClick}
            className="flex items-center justify-center p-2 rounded-xl bg-white border border-gray-200 text-gray-600 hover:text-[#E1306C] hover:border-[#E1306C] transition-all cursor-pointer shadow-sm"
            title="Instagram"
          >
            <Instagram className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* 3. Organized Blocks Container */}
      <div className="flex-1 overflow-y-auto p-5 space-y-6 bg-[#FAF9F5]/40">
        
        {/* BLOCK 1: Informações Gerais */}
        {showGenerais && (
          <div className="bg-white p-4.5 rounded-2xl border border-clay-border/60 shadow-sm space-y-3">
            <h3 className="text-xs font-bold text-terracotta uppercase tracking-wider border-b border-gray-100 pb-1.5 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" /> Informações Gerais
            </h3>
            
            {isValidField(establishment.description) && (
              <p className="text-gray-700 text-xs leading-relaxed">
                {establishment.description}
              </p>
            )}

            {specialties.length > 0 && (
              <div className="space-y-1.5 pt-1">
                <span className="text-[10px] uppercase font-bold tracking-wider text-earth-gray block">Especialidades Cerâmicas:</span>
                <div className="flex flex-wrap gap-1.5">
                  {specialties.map((spec) => (
                    <span 
                      key={spec}
                      className="px-2.5 py-1 text-[10px] font-sans font-bold uppercase tracking-wide rounded-lg bg-sand-card text-terracotta border border-sand-border"
                    >
                      🎨 {spec}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {gallery.length > 0 && (
              <div className="space-y-2 pt-2">
                <span className="text-[10px] uppercase font-bold tracking-wider text-earth-gray block flex items-center gap-1">
                  <ImageIcon className="w-3.5 h-3.5 text-terracotta" /> Galeria de Imagens:
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {gallery.map((img, index) => (
                    <div key={index} className="aspect-[4/3] rounded-xl overflow-hidden border border-gray-100 bg-gray-50">
                      <img 
                        src={img} 
                        alt="Foto do espaço" 
                        className="w-full h-full object-cover hover:scale-105 transition-all duration-300" 
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* BLOCK 2: Contatos */}
        {showContatos && (
          <div className="bg-white p-4.5 rounded-2xl border border-clay-border/60 shadow-sm space-y-3.5">
            <h3 className="text-xs font-bold text-terracotta uppercase tracking-wider border-b border-gray-100 pb-1.5 flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5" /> Contatos Principais
            </h3>

            <div className="grid grid-cols-1 gap-2.5 text-xs text-earth-dark">
              {isValidField(establishment.whatsapp) && (
                <div className="flex items-center gap-2.5 p-2 rounded-xl bg-emerald-50/50 border border-emerald-100">
                  <Phone className="w-4 h-4 text-emerald-600 shrink-0" />
                  <div>
                    <span className="text-[10px] text-gray-500 block uppercase font-bold">WhatsApp Comercial</span>
                    <button 
                      onClick={handleWhatsAppClick}
                      className="font-mono font-bold text-emerald-700 hover:underline cursor-pointer"
                    >
                      {establishment.whatsapp}
                    </button>
                  </div>
                </div>
              )}

              {isValidField(establishment.instagram) && (
                <div className="flex items-center gap-2.5 p-2 rounded-xl bg-pink-50/50 border border-pink-100">
                  <Instagram className="w-4 h-4 text-pink-600 shrink-0" />
                  <div>
                    <span className="text-[10px] text-gray-500 block uppercase font-bold">Instagram</span>
                    <button 
                      onClick={handleInstagramClick}
                      className="font-bold text-pink-700 hover:underline cursor-pointer"
                    >
                      {establishment.instagram}
                    </button>
                  </div>
                </div>
              )}

              {isValidField(establishment.website) && (
                <div className="flex items-center gap-2.5 p-2 rounded-xl bg-blue-50/50 border border-blue-100">
                  <Globe className="w-4 h-4 text-blue-600 shrink-0" />
                  <div>
                    <span className="text-[10px] text-gray-500 block uppercase font-bold">Website / Catálogo</span>
                    <a 
                      href={establishment.website} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="font-bold text-blue-700 hover:underline"
                    >
                      {establishment.website}
                    </a>
                  </div>
                </div>
              )}

              {isValidField(establishment.email) && (
                <div className="flex items-center gap-2.5 p-2 rounded-xl bg-gray-50 border border-gray-200">
                  <Mail className="w-4 h-4 text-gray-600 shrink-0" />
                  <div>
                    <span className="text-[10px] text-gray-500 block uppercase font-bold">E-mail Comercial</span>
                    <span className="font-semibold text-gray-700">{establishment.email}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* BLOCK 3: Serviços */}
        {showServicos && (
          <div className="bg-white p-4.5 rounded-2xl border border-clay-border/60 shadow-sm space-y-3">
            <h3 className="text-xs font-bold text-terracotta uppercase tracking-wider border-b border-gray-100 pb-1.5 flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5" /> Serviços Oferecidos
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {services.map((serv) => (
                <div 
                  key={serv}
                  className="p-2.5 text-xs font-bold rounded-xl bg-sand-card border border-sand-border text-sienna flex items-center gap-2"
                >
                  <span className="w-2 h-2 rounded-full bg-terracotta"></span>
                  {serv}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* BLOCK 4: Produtos */}
        {showProdutos && (
          <div className="bg-white p-4.5 rounded-2xl border border-clay-border/60 shadow-sm space-y-3">
            <h3 className="text-xs font-bold text-terracotta uppercase tracking-wider border-b border-gray-100 pb-1.5 flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5" /> Produtos / Peças
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {products.map((p) => (
                <div key={p.id} className="border border-gray-100 rounded-xl overflow-hidden bg-white hover:shadow-sm transition-all flex flex-col">
                  <div className="aspect-square bg-gray-50 overflow-hidden relative">
                    <img src={p.photo} alt={p.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    <span className="absolute bottom-2 right-2 bg-black/70 backdrop-blur-xs text-[10px] font-bold text-white px-2 py-0.5 rounded-md">
                      R$ {p.price}
                    </span>
                  </div>
                  <div className="p-2.5 flex-1 flex flex-col justify-between text-xs">
                    <div>
                      <h4 className="font-bold text-gray-800 line-clamp-1">{p.name}</h4>
                      <p className="text-[10px] text-gray-500 mt-0.5 line-clamp-2 leading-relaxed">{p.description}</p>
                    </div>
                    <button 
                      onClick={() => {
                        setBudgetMessage(`Olá! Gostaria de solicitar um orçamento para a peça: "${p.name}" (R$ ${p.price}).`);
                        setShowBudgetModal(true);
                      }}
                      className="mt-2 w-full py-1 text-[10px] font-bold rounded-lg bg-[#FAF9F5] text-earth-dark hover:bg-sand-card hover:text-terracotta border border-clay-border hover:border-terracotta/30 transition-all text-center cursor-pointer uppercase tracking-wider"
                    >
                      Comprar / Orçar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* BLOCK 5: Estrutura */}
        {showEstrutura && (
          <div className="bg-white p-4.5 rounded-2xl border border-clay-border/60 shadow-sm space-y-3.5">
            <h3 className="text-xs font-bold text-terracotta uppercase tracking-wider border-b border-gray-100 pb-1.5 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" /> Estrutura & Horários
            </h3>

            <div className="space-y-3 text-xs">
              {isValidField(establishment.hours) && (
                <div className="p-3 bg-gray-50 border border-gray-150 rounded-xl space-y-1">
                  <span className="text-[10px] uppercase font-bold text-gray-500 block flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-terracotta" /> Horário de Funcionamento
                  </span>
                  <p className="text-gray-700 whitespace-pre-line leading-relaxed">{establishment.hours}</p>
                </div>
              )}

              <div className="p-3 bg-gray-50 border border-gray-150 rounded-xl space-y-1">
                <span className="text-[10px] uppercase font-bold text-gray-500 block flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-terracotta" /> Endereço & Cobertura
                </span>
                <p className="text-gray-700 leading-relaxed font-semibold">{formatAddressByPrivacy()}</p>
                {establishment.privacy !== 'full' && (
                  <p className="text-[10px] text-amber-800 font-medium bg-amber-50/50 p-2 border border-amber-100 rounded-lg mt-1.5">
                    ⚠ <strong>Privacidade Preservada:</strong> A localização exata deste ateliê é mantida aproximada no mapa. O endereço real está resguardado sob a política nacional da Cartografia.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* BLOCK 6: Informações Complementares */}
        {showComplementares && (
          <div className="bg-white p-4.5 rounded-2xl border border-clay-border/60 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-terracotta uppercase tracking-wider border-b border-gray-100 pb-1.5 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" /> Informações Complementares
            </h3>

            <div className="grid grid-cols-2 gap-2 text-center text-xs">
              <div className="bg-[#FAF9F5] p-2 rounded-xl border border-clay-border/20">
                <span className="text-[9px] text-earth-gray block uppercase font-bold">Visualizações</span>
                <strong className="text-sm text-earth-dark font-extrabold">{viewsCount}</strong>
              </div>
              <div className="bg-[#FAF9F5] p-2 rounded-xl border border-clay-border/20">
                <span className="text-[9px] text-earth-gray block uppercase font-bold">Contatos Ativados</span>
                <strong className="text-sm text-earth-dark font-extrabold">{waClicks + routeClicks}</strong>
              </div>
            </div>

            <div className="p-3 bg-[#FAF9F5] border border-clay-border/40 rounded-xl text-[11px] text-earth-gray space-y-1 leading-normal">
              <p><strong>Origem dos Dados:</strong> {establishment.origin || 'Google Forms'}</p>
              <p><strong>Status Cadastral:</strong> {establishment.claimed ? 'Verificado & Legítimo' : 'Cadastro Colaborativo Sincronizado'}</p>
              <p><strong>Geocodificação:</strong> {establishment.geocodingStatus === 'valid' ? 'Aprovado com Sucesso' : 'Análise Geográfica de Vizinhança'}</p>
            </div>

            {/* Simple Community feedback embedded directly inside Complementary block */}
            <div className="pt-3 border-t border-gray-100 space-y-3.5">
              <div className="flex justify-between items-center">
                <h4 className="text-xs font-bold text-earth-dark uppercase tracking-wider">
                  Avaliações ({establishment.reviewsCount})
                </h4>
                <button 
                  id="btn-trigger-review-modal"
                  onClick={() => setShowAddReviewModal(true)}
                  className="inline-flex items-center gap-1 text-[11px] text-terracotta font-bold hover:underline cursor-pointer uppercase tracking-wider"
                >
                  <Plus className="w-3.5 h-3.5" /> Avaliar
                </button>
              </div>

              <ReviewsSection establishmentId={establishment.id} onAddReview={onAddReview} />
            </div>
          </div>
        )}

      </div>

      {/* ========================================================= */}
      {/* MODALS SECTION                                            */}
      {/* ========================================================= */}

      {/* Modal B: Request Budget (Orçamento) */}
      <AnimatePresence>
        {showBudgetModal && (
          <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl border border-gray-100 p-6 max-w-md w-full shadow-2xl relative text-xs"
            >
              <button onClick={() => setShowBudgetModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 font-bold text-lg cursor-pointer">×</button>
              
              <h3 className="text-base font-serif italic font-bold text-gray-900 mb-1 flex items-center gap-1.5">
                <Send className="w-5 h-5 text-terracotta" /> Solicitar Orçamento
              </h3>
              <p className="text-[11px] text-gray-500 mb-4">
                Envie uma mensagem de orçamento para queimas, peças, cursos ou encomendas especiais.
              </p>

              {budgetSuccess ? (
                <div className="py-8 text-center space-y-2">
                  <div className="w-10 h-10 bg-emerald-50 rounded-full flex items-center justify-center mx-auto border border-emerald-100">
                    <Check className="w-5 h-5 text-emerald-600" />
                  </div>
                  <h4 className="font-bold text-gray-900">Mensagem Enviada!</h4>
                  <p className="text-gray-500">O proprietário do espaço foi notificado e responderá diretamente pelo WhatsApp.</p>
                </div>
              ) : (
                <form onSubmit={handleBudgetSubmit} className="space-y-3">
                  <div>
                    <label className="block text-gray-600 font-bold mb-1">Seu Nome *</label>
                    <input 
                      type="text" 
                      required 
                      value={budgetName}
                      onChange={(e) => setBudgetName(e.target.value)}
                      className="w-full p-2.5 rounded-lg border border-clay-border focus:outline-none focus:border-terracotta" 
                      placeholder="Ex: Clara Mendes"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-gray-600 font-bold mb-1">Seu Email *</label>
                      <input 
                        type="email" 
                        required 
                        value={budgetEmail}
                        onChange={(e) => setBudgetEmail(e.target.value)}
                        className="w-full p-2.5 rounded-lg border border-clay-border focus:outline-none" 
                        placeholder="clara@exemplo.com"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-600 font-bold mb-1">WhatsApp *</label>
                      <input 
                        type="tel" 
                        required 
                        value={budgetPhone}
                        onChange={(e) => setBudgetPhone(e.target.value)}
                        className="w-full p-2.5 rounded-lg border border-clay-border focus:outline-none" 
                        placeholder="(11) 98888-8888"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-gray-600 font-bold mb-1">Especificações / Mensagem *</label>
                    <textarea 
                      required 
                      rows={3}
                      value={budgetMessage}
                      onChange={(e) => setBudgetMessage(e.target.value)}
                      className="w-full p-2.5 rounded-lg border border-clay-border focus:outline-none" 
                      placeholder="Diga qual tipo de argila ou serviço de queima necessita."
                    />
                  </div>

                  <button 
                    id="btn-submit-budget"
                    type="submit"
                    className="w-full py-2.5 font-bold rounded-xl bg-terracotta text-white hover:bg-sienna transition-all cursor-pointer shadow-md uppercase tracking-wider text-xs"
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
              className="bg-white rounded-2xl border border-gray-100 p-6 max-w-md w-full shadow-2xl relative text-xs"
            >
              <button onClick={() => setShowVisitModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 font-bold text-lg cursor-pointer">×</button>
              
              <h3 className="text-base font-serif italic font-bold text-gray-900 mb-1 flex items-center gap-1.5">
                <Calendar className="w-5 h-5 text-amber-500" /> Agendar Visita
              </h3>
              <p className="text-[11px] text-gray-500 mb-4">
                Escolha um dia de preferência para realizar uma visita agendada ao local.
              </p>

              {visitSuccess ? (
                <div className="py-8 text-center space-y-2">
                  <div className="w-10 h-10 bg-emerald-50 rounded-full flex items-center justify-center mx-auto border border-emerald-100">
                    <Check className="w-5 h-5 text-emerald-600" />
                  </div>
                  <h4 className="font-bold text-gray-900">Visita Pré-Agendada!</h4>
                  <p className="text-gray-500">
                    Sua intenção de visita no dia <strong>{visitDate}</strong> às <strong>{visitTime}</strong> foi enviada! O responsável confirmará em breve pelo seu contato.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleVisitSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-gray-600 font-bold mb-1">Data Escolhida *</label>
                      <input 
                        type="date" 
                        required 
                        value={visitDate}
                        onChange={(e) => setVisitDate(e.target.value)}
                        className="w-full p-2.5 rounded-lg border border-clay-border focus:outline-none" 
                      />
                    </div>
                    <div>
                      <label className="block text-gray-600 font-bold mb-1">Horário Preferencial *</label>
                      <select 
                        required 
                        value={visitTime}
                        onChange={(e) => setVisitTime(e.target.value)}
                        className="w-full p-2.5 rounded-lg border border-clay-border bg-white"
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

                  <button 
                    id="btn-submit-visit"
                    type="submit"
                    className="w-full py-2.5 font-bold rounded-xl bg-gray-900 text-white hover:bg-black transition-all cursor-pointer uppercase tracking-wider text-xs"
                  >
                    Confirmar Data de Visita
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
              className="bg-white rounded-2xl border border-gray-100 p-6 max-w-md w-full shadow-2xl relative text-xs"
            >
              <button onClick={() => setShowAddReviewModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 font-bold text-lg cursor-pointer">×</button>
              
              <h3 className="text-base font-serif italic font-bold text-gray-900 mb-1 flex items-center gap-1.5">
                <Star className="w-5 h-5 text-amber-500 fill-amber-500" /> Escrever Avaliação
              </h3>
              <p className="text-[11px] text-gray-500 mb-4">
                Deixe uma opinião construtiva sobre sua experiência neste espaço de cerâmica.
              </p>

              <form onSubmit={handleReviewSubmit} className="space-y-4">
                <div>
                  <label className="block text-gray-600 font-bold mb-1">Seu Nome *</label>
                  <input 
                    type="text" 
                    required 
                    value={reviewerName}
                    onChange={(e) => setReviewerName(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-clay-border focus:outline-none" 
                    placeholder="Ex: João Silva"
                  />
                </div>

                <div>
                  <label className="block text-gray-600 font-bold mb-1">Nota (Estrelas) *</label>
                  <div className="flex gap-2 mt-1">
                    {[1, 2, 3, 4, 5].map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setReviewRating(val)}
                        className="focus:outline-none cursor-pointer"
                      >
                        <Star className={`w-6 h-6 transition-all ${
                          val <= reviewRating ? 'fill-amber-400 text-amber-400 scale-110' : 'text-gray-300'
                        }`} />
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-gray-600 font-bold mb-1">Seu Comentário *</label>
                  <textarea 
                    required 
                    rows={3}
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-clay-border focus:outline-none" 
                    placeholder="Atendimento, torneamento, forno, argilas, etc."
                  />
                </div>

                <button 
                  id="btn-submit-review"
                  type="submit"
                  className="w-full py-2.5 font-bold rounded-xl bg-terracotta text-white hover:bg-sienna transition-all cursor-pointer shadow-md uppercase tracking-wider text-xs"
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

// Subcomponent to load and render reviews list
interface ReviewsSectionProps {
  establishmentId: string;
  onAddReview: (id: string, r: Omit<Review, 'id' | 'date'>) => void;
}

import { INITIAL_REVIEWS } from '../data';

function ReviewsSection({ establishmentId }: ReviewsSectionProps) {
  const storedReviews = localStorage.getItem(`reviews_${establishmentId}`);
  const reviews: Review[] = storedReviews 
    ? JSON.parse(storedReviews) 
    : INITIAL_REVIEWS.filter((r) => r.establishmentId === establishmentId);

  if (reviews.length === 0) {
    return (
      <div className="text-center py-4 text-[11px] text-gray-400 font-sans border border-dashed border-gray-200 rounded-xl bg-gray-50/50">
        Nenhuma avaliação escrita. Seja o primeiro a apoiar este espaço de cerâmica!
      </div>
    );
  }

  return (
    <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
      {reviews.map((r) => (
        <div key={r.id} className="p-3 bg-white border border-gray-100 rounded-xl shadow-xs text-xs space-y-1">
          <div className="flex justify-between items-center text-[10px] text-gray-500">
            <span className="font-bold text-gray-800">{r.userName}</span>
            <span>{r.date}</span>
          </div>

          <div className="flex gap-0.5">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star key={s} className={`w-3 h-3 ${s <= r.rating ? 'fill-amber-400 text-amber-400' : 'text-gray-200'}`} />
            ))}
          </div>

          <p className="text-gray-600 leading-relaxed italic font-sans text-[11px]">
            "{r.comment}"
          </p>
        </div>
      ))}
    </div>
  );
}
