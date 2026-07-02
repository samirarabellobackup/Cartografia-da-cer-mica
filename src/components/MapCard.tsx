import React from 'react';
import { 
  X, Instagram, Phone, MapPin, Star, Award, 
  ShieldCheck, HelpCircle, ArrowRight 
} from 'lucide-react';
import { Establishment, PlanConfig } from '../types';

interface MapCardProps {
  establishment: Establishment;
  onClose: () => void;
  onOpenProfile: () => void;
  onClaimProfile: () => void;
  plans?: PlanConfig[];
}

export default function MapCard({ 
  establishment, 
  onClose, 
  onOpenProfile,
  onClaimProfile,
  plans
}: MapCardProps) {
  
  // Respecting Privacy logic
  const getAddressDisplay = () => {
    if (establishment.privacy === 'full') {
      return {
        cityState: `${establishment.city} - ${establishment.state}`,
        neighborhood: establishment.neighborhood,
        approximate: false
      };
    }
    if (establishment.privacy === 'neighborhood') {
      return {
        cityState: `${establishment.city} - ${establishment.state}`,
        neighborhood: `${establishment.neighborhood} (Aproximado)`,
        approximate: true
      };
    }
    if (establishment.privacy === 'city') {
      return {
        cityState: `${establishment.city} - ${establishment.state}`,
        neighborhood: null,
        approximate: true
      };
    }
    // state privacy
    return {
      cityState: `Região de ${establishment.state}`,
      neighborhood: null,
      approximate: true
    };
  };

  const addr = getAddressDisplay();

  const handleWhatsAppClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(`https://wa.me/55${establishment.whatsapp}`, '_blank');
  };

  const handleInstagramClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(`https://instagram.com/${establishment.instagram.replace('@', '')}`, '_blank');
  };

  const planName = 'Perfil Oficial Cadastrado';
  const canOpenProfile = true;

  return (
    <div className="absolute bottom-4 left-4 right-4 sm:right-auto sm:w-[360px] bg-white/95 backdrop-blur-md rounded-2xl border-2 border-clay-border shadow-2xl p-4.5 z-[1000] space-y-3.5 animate-slideUp text-xs text-earth-dark font-sans">
      
      {/* Header and Close Button */}
      <div className="flex justify-between items-start gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-sand-card text-terracotta border border-sand-border">
            {establishment.category}
          </span>
        </div>
        <button 
          onClick={onClose}
          className="text-earth-gray hover:text-earth-dark p-1 rounded-full hover:bg-sand-bg transition-all cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Main Content Layout (Left Photo, Right Details) */}
      <div className="flex gap-3">
        {/* Thumbnail Photo */}
        <div className="w-20 h-20 rounded-xl overflow-hidden shrink-0 bg-sand-bg border border-clay-border shadow-sm">
          <img 
            src={establishment.photo} 
            alt={establishment.name} 
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
        </div>

        {/* Text Info */}
        <div className="flex-1 min-w-0 space-y-1">
          <h4 className="text-sm font-serif italic font-bold text-earth-dark leading-tight line-clamp-1">
            {establishment.name}
          </h4>
          
          <p className="text-[11px] text-earth-gray font-medium flex items-center gap-1">
            <MapPin className="w-3 h-3 text-terracotta shrink-0" />
            <span className="truncate">{addr.cityState} {addr.neighborhood ? `(${addr.neighborhood})` : ''}</span>
          </p>

          <p className="text-[11px] text-gray-600 line-clamp-2 leading-normal">
            {establishment.description}
          </p>
        </div>
      </div>

      {/* Specialties Tags */}
      <div>
        <p className="text-[9px] uppercase tracking-wider font-bold text-earth-gray mb-1">Especialidades:</p>
        <div className="flex flex-wrap gap-1 max-h-12 overflow-hidden">
          {establishment.specialties.slice(0, 3).map(spec => (
            <span 
              key={spec} 
              className="px-1.5 py-0.5 rounded bg-gray-50 text-gray-600 text-[10px] border border-gray-100"
            >
              {spec}
            </span>
          ))}
          {establishment.specialties.length > 3 && (
            <span className="text-[9px] text-earth-gray font-semibold pt-0.5 ml-1">
              +{establishment.specialties.length - 3} mais
            </span>
          )}
        </div>
      </div>

      {/* Contact Social Badges & Actions */}
      <div className="flex gap-2 items-center pt-2 border-t border-clay-border/40">
        <button 
          onClick={handleInstagramClick}
          className="flex-1 py-1.5 px-2 rounded-lg bg-gray-50 border border-clay-border hover:border-terracotta text-earth-dark hover:text-terracotta transition-all cursor-pointer flex items-center justify-center gap-1 font-semibold text-[11px]"
        >
          <Instagram className="w-3.5 h-3.5 text-[#E1306C]" />
          Instagram
        </button>

        <button 
          onClick={handleWhatsAppClick}
          className="flex-1 py-1.5 px-2 rounded-lg bg-[#25D366] text-white hover:bg-[#20ba59] transition-all cursor-pointer flex items-center justify-center gap-1 font-semibold text-[11px]"
        >
          <Phone className="w-3.5 h-3.5" />
          WhatsApp
        </button>
      </div>

      {/* Primary Button: Ver Perfil */}
      <div className="pt-1.5">
        <button
          onClick={onOpenProfile}
          className="w-full py-2 rounded-xl bg-terracotta hover:bg-sienna text-white text-xs font-bold transition-all cursor-pointer shadow-md flex items-center justify-center gap-1 uppercase tracking-wider"
        >
          Ver Perfil Completo
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

    </div>
  );
}
