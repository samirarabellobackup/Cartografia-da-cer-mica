import React, { useState, useEffect, useMemo } from 'react';
import { 
  Compass, MapPin, Star, Sparkles, BookOpen, Warehouse, HelpCircle, 
  ChevronRight, Heart, Locate, Search, CheckCircle2, Award, ArrowUpRight, 
  ShieldCheck, SlidersHorizontal, Map, Calendar, ChevronDown, Check, Printer, 
  Download, Navigation, HeartHandshake, Info
} from 'lucide-react';
import { Establishment, Category, Specialty, PlanTier } from '../types';
import { calculateDistance } from '../utils/geocodingHelper';

interface SearchDiscoverProps {
  establishments: Establishment[];
  onSelectEstablishment: (id: string) => void;
  selectedId: string | null;
  filters: any;
  onFilterChange: (filters: any) => void;
  userCoords: [number, number] | null;
  onToggleUserCoords: () => void;
  onCenterMap: (coords: [number, number]) => void;
  mapClickedCoords?: [number, number] | null;
  onClearMapClick?: () => void;
}

// Preset locations for common typed references / CEP / POIs
const COMMON_REFERENCES: { [key: string]: [number, number] } = {
  // Brasília
  'aeroporto de brasília': [-15.8697, -47.9172],
  'aeroporto bsb': [-15.8697, -47.9172],
  'rodoviária do plano piloto': [-15.7938, -47.8828],
  'unb': [-15.7612, -47.8703],
  'universidade de brasília': [-15.7612, -47.8703],
  'asa sul': [-15.8119, -47.8988],
  'asa norte': [-15.7635, -47.8858],
  'taguatinga': [-15.8336, -48.0569],
  'águas claras': [-15.8398, -48.0264],
  'guará': [-15.8143, -47.9806],
  'sobradinho': [-15.6515, -47.7915],
  'lago sul': [-15.8385, -47.8542],
  'lago norte': [-15.7335, -47.8423],
  'hotel em brasília': [-15.7950, -47.8900],
  'airbnb em brasília': [-15.7890, -47.8800],
  
  // São Paulo
  'masp': [-23.5615, -46.6559],
  'paulista': [-23.5615, -46.6559],
  'aeroporto de congonhas': [-23.6273, -46.6565],
  'aeroporto de guarulhos': [-23.4356, -46.4731],
  'rodoviária do tietê': [-23.5163, -46.6247],
  'centro de são paulo': [-23.5505, -46.6333],
  'pinheiros': [-23.5615, -46.6993],
  'vila madalena': [-23.5540, -46.6901],
  'hotel em são paulo': [-23.5600, -46.6600],
  'airbnb em são paulo': [-23.5580, -46.6500],
  
  // Cunha
  'centro de cunha': [-22.8638, -44.8817],
  'casa do ceramista cunha': [-22.8688, -44.8767],
  'ateliê do lelé': [-22.8715, -44.8699],
  'portal de cunha': [-22.8450, -44.8980],
  'hotel em cunha': [-22.8600, -44.8800],

  // Paraty
  'centro histórico de paraty': [-23.2198, -44.7135],
  'hotel imperatriz': [-23.2155, -44.7198],
  'airbnb caborê paraty': [-23.2111, -44.7212],
  
  // Porto Ferreira
  'porto ferreira': [-21.8540, -47.4789],
  'avenida do comércio': [-21.8590, -47.4739]
};

function resolveReferenceCoords(searchTerm: string): [number, number] | null {
  const normalized = searchTerm.toLowerCase().trim();
  if (!normalized) return null;
  
  // 1. Exact match
  if (COMMON_REFERENCES[normalized]) {
    return COMMON_REFERENCES[normalized];
  }
  
  // 2. Contains match
  for (const [key, coords] of Object.entries(COMMON_REFERENCES)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return coords;
    }
  }
  
  // 3. CEP style matching
  const cepRegex = /(\d{5})-?(\d{3})/;
  if (cepRegex.test(normalized)) {
    const match = normalized.match(cepRegex);
    if (match) {
      const prefix = parseInt(match[1].substring(0, 2));
      if (prefix >= 70 && prefix <= 72) return [-15.7938, -47.8828]; // Brasília
      if (prefix >= 1 && prefix <= 19) return [-23.5505, -46.6333]; // SP
      if (prefix >= 20 && prefix <= 28) return [-22.9068, -43.1729]; // Rio
    }
  }

  // 4. City matches in standard list (simulate search)
  if (normalized.includes('brasília') || normalized.includes('distrito federal') || normalized.includes('df')) {
    return [-15.7938, -47.8828];
  }
  if (normalized.includes('são paulo') || normalized.includes('sp')) {
    return [-23.5505, -46.6333];
  }
  if (normalized.includes('cunha')) {
    return [-22.8638, -44.8817];
  }
  if (normalized.includes('paraty')) {
    return [-23.2198, -44.7135];
  }
  
  return null;
}

export default function SearchDiscover({
  establishments,
  onSelectEstablishment,
  selectedId,
  filters,
  onFilterChange,
  userCoords,
  onToggleUserCoords,
  onCenterMap,
  mapClickedCoords,
  onClearMapClick
}: SearchDiscoverProps) {
  // Tabs: Explorar, Ao Meu Redor (Proximidade), Planejar Viagem, Descobrir
  const [activePanel, setActivePanel] = useState<'explorar' | 'proximidade' | 'planejar' | 'descobrir'>('explorar');
  
  // Proximity options
  const [proximitySourceType, setProximitySourceType] = useState<'device' | 'address' | 'map_click'>('device');
  const [typedAddress, setTypedAddress] = useState('');
  const [selectedRadius, setSelectedRadius] = useState<number>(10); // Default 10km
  const [addressResolveError, setAddressResolveError] = useState(false);
  const [addressResolvedLabel, setAddressResolvedLabel] = useState<string>('');

  // Trip planner inputs
  const [tripDest, setTripDest] = useState('Brasília');
  const [tripRef, setTripRef] = useState('Rodoviária do Plano Piloto');
  const [tripRadius, setTripRadius] = useState<number>(20);
  const [tripDate, setTripDate] = useState('');
  const [showItinerary, setShowItinerary] = useState(false);

  const [favorites, setFavorites] = useState<string[]>(() => {
    const saved = localStorage.getItem('ceramapa_favorites');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('ceramapa_favorites', JSON.stringify(favorites));
  }, [favorites]);

  const toggleFavorite = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setFavorites(prev => 
      prev.includes(id) ? prev.filter(fId => fId !== id) : [...prev, id]
    );
  };

  // Listen to map clicked coordinates
  useEffect(() => {
    if (mapClickedCoords) {
      setActivePanel('proximidade');
      setProximitySourceType('map_click');
      setAddressResolvedLabel(`Coordenadas: [${mapClickedCoords[0].toFixed(4)}, ${mapClickedCoords[1].toFixed(4)}]`);
      
      // Update global proximity filter
      onFilterChange({
        ...filters,
        proximityCenter: mapClickedCoords,
        proximityRadius: selectedRadius,
        proximityLabel: `Ponto Selecionado no Mapa`
      });
    }
  }, [mapClickedCoords]);

  // Handle proximity radius change
  const handleRadiusChange = (radius: number) => {
    setSelectedRadius(radius);
    
    // Check which center coordinates are active and update filter
    let activeCenter: [number, number] | null = null;
    if (proximitySourceType === 'device' && userCoords) {
      activeCenter = userCoords;
    } else if (proximitySourceType === 'address') {
      const coords = resolveReferenceCoords(typedAddress);
      if (coords) activeCenter = coords;
    } else if (proximitySourceType === 'map_click' && mapClickedCoords) {
      activeCenter = mapClickedCoords;
    }

    onFilterChange({
      ...filters,
      proximityCenter: activeCenter,
      proximityRadius: radius,
      proximityLabel: proximitySourceType === 'device' ? 'Minha Localização' :
                       proximitySourceType === 'address' ? typedAddress : 'Ponto no Mapa'
    });
  };

  // Handle proximity center type change
  const handleProximitySourceChange = (type: 'device' | 'address' | 'map_click') => {
    setProximitySourceType(type);
    setAddressResolveError(false);
    setAddressResolvedLabel('');

    if (type === 'device') {
      if (onClearMapClick) onClearMapClick();
      if (userCoords) {
        onCenterMap(userCoords);
        onFilterChange({
          ...filters,
          proximityCenter: userCoords,
          proximityRadius: selectedRadius,
          proximityLabel: 'Minha Localização'
        });
      } else {
        // Clear proximity filter if no device location is available yet
        onFilterChange({
          ...filters,
          proximityCenter: null,
          proximityRadius: null,
          proximityLabel: ''
        });
      }
    } else if (type === 'address') {
      if (onClearMapClick) onClearMapClick();
      // Resolve default SP reference on switch
      setTypedAddress('Asa Sul, Brasília');
      const coords = resolveReferenceCoords('Asa Sul, Brasília');
      if (coords) {
        onCenterMap(coords);
        setAddressResolvedLabel('Asa Sul, Brasília (Localizado)');
        onFilterChange({
          ...filters,
          proximityCenter: coords,
          proximityRadius: selectedRadius,
          proximityLabel: 'Asa Sul, Brasília'
        });
      }
    } else if (type === 'map_click') {
      // Clear filters until they actually click somewhere on the map
      if (!mapClickedCoords) {
        onFilterChange({
          ...filters,
          proximityCenter: null,
          proximityRadius: null,
          proximityLabel: ''
        });
      } else {
        onFilterChange({
          ...filters,
          proximityCenter: mapClickedCoords,
          proximityRadius: selectedRadius,
          proximityLabel: 'Ponto no Mapa'
        });
      }
    }
  };

  // Run typed address lookup
  const handleAddressLookupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAddressResolveError(false);
    
    const coords = resolveReferenceCoords(typedAddress);
    if (coords) {
      onCenterMap(coords);
      setAddressResolvedLabel(`"${typedAddress}" localizado com sucesso!`);
      onFilterChange({
        ...filters,
        proximityCenter: coords,
        proximityRadius: selectedRadius,
        proximityLabel: typedAddress
      });
    } else {
      setAddressResolveError(true);
      setAddressResolvedLabel('');
      // Keep old proximity center or clear it
    }
  };

  // Reset proximity filtering completely
  const handleClearProximity = () => {
    if (onClearMapClick) onClearMapClick();
    setTypedAddress('');
    setAddressResolvedLabel('');
    setAddressResolveError(false);
    onFilterChange({
      ...filters,
      proximityCenter: null,
      proximityRadius: null,
      proximityLabel: ''
    });
  };

  // Calculate distance for all establishments based on active proximity center (global or local)
  const activeCenterCoords = useMemo<[number, number] | null>(() => {
    if (filters.proximityCenter) return filters.proximityCenter;
    if (userCoords) return userCoords;
    return null;
  }, [filters.proximityCenter, userCoords]);

  const establishmentsWithDistance = useMemo(() => {
    return establishments.map(est => {
      // Do not list invalid locations
      if (est.geocodingStatus === 'pending_review' || est.geocodingStatus === 'failed') {
        return { ...est, distance: null };
      }
      if (!activeCenterCoords) return { ...est, distance: null };
      const dist = calculateDistance(activeCenterCoords[0], activeCenterCoords[1], est.coordinates[0], est.coordinates[1]);
      return { ...est, distance: parseFloat(dist.toFixed(1)) };
    });
  }, [establishments, activeCenterCoords]);

  // Derived recommendation lists for the "Descobrir" tab
  const discoveries = useMemo(() => {
    const recommended = [...establishments]
      .filter(e => e.geocodingStatus === 'valid' && (e.isPremium || e.rating >= 4.5))
      .slice(0, 3);
      
    const hiddenGems = [...establishments]
      .filter(e => e.geocodingStatus === 'valid' && e.rating >= 4.6 && e.reviewsCount <= 15)
      .slice(0, 3);
      
    const newStudios = [...establishments]
      .filter(e => e.geocodingStatus === 'valid')
      .slice(-3);

    return { recommended, hiddenGems, newStudios };
  }, [establishments]);

  // Separate lists for proximity lists
  const filteredListings = useMemo(() => {
    let result = [...establishmentsWithDistance].filter(est => {
      if (est.geocodingStatus === 'pending_review' || est.geocodingStatus === 'failed') {
        return false;
      }
      
      // Proximity range validation
      if (filters.proximityCenter && filters.proximityRadius) {
        if (est.distance === null || est.distance > filters.proximityRadius) {
          return false;
        }
      }

      // Base category filter
      if (filters.category && est.category !== filters.category) return false;
      
      // Base state filter
      if (filters.state && est.state !== filters.state) return false;

      // Specialties matches
      if (filters.specialties && filters.specialties.length > 0) {
        const matchesAll = filters.specialties.every((spec: Specialty) => est.specialties.includes(spec));
        if (!matchesAll) return false;
      }

      // Services matches
      if (filters.services && filters.services.length > 0) {
        const matchesAll = filters.services.every((srv: string) => est.services && est.services.includes(srv));
        if (!matchesAll) return false;
      }

      // Query text search
      if (filters.query) {
        const q = filters.query.toLowerCase().trim();
        const nameM = est.name.toLowerCase().includes(q);
        const cityM = est.city.toLowerCase().includes(q);
        const stateM = est.state.toLowerCase().includes(q);
        const neighM = est.neighborhood ? est.neighborhood.toLowerCase().includes(q) : false;
        const categoryM = est.category.toLowerCase().includes(q);
        const specM = est.specialties.some(s => s.toLowerCase().includes(q));
        const servM = est.services ? est.services.some(s => s.toLowerCase().includes(q)) : false;
        const descM = est.description ? est.description.toLowerCase().includes(q) : false;

        if (!nameM && !cityM && !stateM && !neighM && !categoryM && !specM && !servM && !descM) {
          return false;
        }
      }

      return true;
    });

    // Sort by premium first, then by distance (if available)
    return result.sort((a, b) => {
      const aPlan = a.planTier || (a.isPremium ? 'atelie' : 'gratuito');
      const bPlan = b.planTier || (b.isPremium ? 'atelie' : 'gratuito');
      const aIsPrem = aPlan !== 'gratuito';
      const bIsPrem = bPlan !== 'gratuito';
      
      if (aIsPrem && !bIsPrem) return -1;
      if (!aIsPrem && bIsPrem) return 1;
      
      if (a.distance !== null && b.distance !== null) {
        return a.distance - b.distance;
      }
      return b.rating - a.rating;
    });
  }, [establishmentsWithDistance, filters]);

  // Trip planner generator logic
  const resolvedTripCoords = useMemo(() => {
    return resolveReferenceCoords(tripRef) || resolveReferenceCoords(tripDest) || [-15.7938, -47.8828];
  }, [tripRef, tripDest]);

  const itinerarySpaces = useMemo(() => {
    if (!showItinerary) return [];
    
    return establishments.map(est => {
      if (est.geocodingStatus === 'pending_review' || est.geocodingStatus === 'failed') {
        return { ...est, distance: null };
      }
      const dist = calculateDistance(resolvedTripCoords[0], resolvedTripCoords[1], est.coordinates[0], est.coordinates[1]);
      return { ...est, distance: parseFloat(dist.toFixed(1)) };
    }).filter(est => est.distance !== null && est.distance <= tripRadius)
      .sort((a, b) => (a.distance || 0) - (b.distance || 0));
  }, [establishments, resolvedTripCoords, tripRadius, showItinerary]);

  const structuredItinerary = useMemo(() => {
    const ateliers = itinerarySpaces.filter(s => ['Ateliê', 'Ceramista'].includes(s.category));
    const schools = itinerarySpaces.filter(s => ['Ateliê Escola', 'Escola', 'Universidade'].includes(s.category));
    const infrastructure = itinerarySpaces.filter(s => ['Fornecedor', 'Fabricante', 'Queima', 'Assistência Técnica'].includes(s.category));
    const cultural = itinerarySpaces.filter(s => ['Museu', 'Galeria', 'Coletivo', 'Associação'].includes(s.category));
    
    return {
      ateliers,
      schools,
      infrastructure,
      cultural
    };
  }, [itinerarySpaces]);

  // Auto-suggest tags for quick search
  const quickSearchTags = ['Torno', 'Raku', 'Modelagem Manual', 'Porcelana', 'Alta Temperatura', 'Queima a Gás'];

  // Categories counts for summaries
  const nearbyCounts = useMemo(() => {
    const spaces = establishmentsWithDistance.filter(e => e.distance !== null && e.distance <= 15);
    return {
      ateliers: spaces.filter(e => ['Ateliê', 'Ceramista'].includes(e.category)).length,
      schools: spaces.filter(e => ['Ateliê Escola', 'Escola', 'Universidade'].includes(e.category)).length,
      vendors: spaces.filter(e => ['Fornecedor', 'Fabricante', 'Importador', 'Loja'].includes(e.category)).length
    };
  }, [establishmentsWithDistance]);

  return (
    <div className="bg-white rounded-2xl border border-clay-border shadow-sm overflow-hidden flex flex-col h-full font-sans text-xs text-earth-dark">
      
      {/* Top Header Selector - Responsive 4 Columns */}
      <div className="grid grid-cols-4 bg-sand-bg/60 border-b border-clay-border/50 text-[10px] font-bold text-center shrink-0">
        <button
          onClick={() => setActivePanel('explorar')}
          className={`py-3.5 flex flex-col items-center justify-center gap-1 border-r border-clay-border/30 transition-all cursor-pointer ${
            activePanel === 'explorar' 
              ? 'bg-white text-terracotta border-b-2 border-b-terracotta' 
              : 'text-earth-dark/70 hover:bg-white/40'
          }`}
        >
          <Search className="w-3.5 h-3.5 shrink-0" />
          <span>Explorar</span>
        </button>
        <button
          onClick={() => setActivePanel('proximidade')}
          className={`py-3.5 flex flex-col items-center justify-center gap-1 border-r border-clay-border/30 transition-all cursor-pointer ${
            activePanel === 'proximidade' 
              ? 'bg-white text-terracotta border-b-2 border-b-terracotta' 
              : 'text-earth-dark/70 hover:bg-white/40'
          }`}
        >
          <Locate className="w-3.5 h-3.5 shrink-0" />
          <span>Ao Meu Redor</span>
        </button>
        <button
          onClick={() => setActivePanel('planejar')}
          className={`py-3.5 flex flex-col items-center justify-center gap-1 border-r border-clay-border/30 transition-all cursor-pointer ${
            activePanel === 'planejar' 
              ? 'bg-white text-terracotta border-b-2 border-b-terracotta' 
              : 'text-earth-dark/70 hover:bg-white/40'
          }`}
        >
          <Calendar className="w-3.5 h-3.5 shrink-0" />
          <span>Viagem Cerâmica</span>
        </button>
        <button
          onClick={() => setActivePanel('descobrir')}
          className={`py-3.5 flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
            activePanel === 'descobrir' 
              ? 'bg-white text-terracotta border-b-2 border-b-terracotta' 
              : 'text-earth-dark/70 hover:bg-white/40'
          }`}
        >
          <Compass className="w-3.5 h-3.5 shrink-0 animate-spin-slow" />
          <span>Descobrir ✨</span>
        </button>
      </div>

      {/* Main Panel Content Area */}
      <div className="p-4 flex-1 overflow-y-auto space-y-4">
        
        {/* PANEL A: EXPLORAR */}
        {activePanel === 'explorar' && (
          <div className="space-y-3">
            {/* Intelligent Search Input */}
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-earth-gray/70" />
              <input
                type="text"
                placeholder="Busque por nome, cidade, estado, especialidade, argila..."
                value={filters.query || ''}
                onChange={(e) => onFilterChange({ ...filters, query: e.target.value })}
                className="w-full pl-10 pr-9 py-2.5 bg-[#FAF9F5] border border-clay-border rounded-xl text-xs font-semibold focus:border-terracotta focus:ring-1 focus:ring-terracotta focus:outline-none placeholder-earth-gray/70 text-earth-dark shadow-inner transition-all"
              />
              {filters.query && (
                <button
                  type="button"
                  onClick={() => onFilterChange({ ...filters, query: '' })}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-earth-gray hover:text-terracotta bg-sand-bg/60 hover:bg-sand-bg w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] transition-all cursor-pointer"
                  title="Limpar Pesquisa"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Quick Filter Tags */}
            <div>
              <p className="text-[9px] font-bold text-earth-gray uppercase tracking-wider mb-1.5">
                Pesquisas Frequentes
              </p>
              <div className="flex flex-wrap gap-1.5">
                {quickSearchTags.map(tag => {
                  const isSelected = filters.query?.toLowerCase() === tag.toLowerCase();
                  return (
                    <button
                      key={tag}
                      onClick={() => onFilterChange({ ...filters, query: isSelected ? '' : tag })}
                      className={`px-2.5 py-1 rounded-lg border text-[9px] font-bold transition-all cursor-pointer ${
                        isSelected 
                          ? 'bg-terracotta border-terracotta text-white' 
                          : 'bg-sand-bg border-clay-border/40 text-earth-dark hover:border-sand-border hover:bg-white'
                      }`}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* List Header */}
            <div className="space-y-2.5">
              <div className="flex justify-between items-center text-[10px] text-earth-gray font-bold uppercase tracking-wider px-0.5">
                <span>Resultados: {filteredListings.length}</span>
                {filters.proximityCenter && (
                  <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    📍 Próximo a: {filters.proximityLabel || 'Filtro de Raio'}
                  </span>
                )}
              </div>

              {/* Listings Output */}
              {filteredListings.length === 0 ? (
                <div className="text-center py-10 bg-sand-bg/30 border border-dashed border-clay-border rounded-xl p-4 space-y-2">
                  <p className="font-serif italic font-semibold text-earth-gray">Nenhum espaço localizado</p>
                  <p className="text-[10px] text-earth-gray/70">
                    Selecione filtros menos restritivos ou amplie o raio de busca.
                  </p>
                  {filters.proximityCenter && (
                    <button 
                      onClick={handleClearProximity}
                      className="px-3 py-1 bg-white border border-clay-border hover:border-terracotta text-earth-dark text-[9px] font-bold rounded-lg transition-all cursor-pointer"
                    >
                      Limpar Filtro de Raio
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredListings.map(est => {
                    const isSelected = est.id === selectedId;
                    const isFav = favorites.includes(est.id);
                    const activePlan = est.planTier || (est.isPremium ? 'atelie' : 'gratuito');

                    return (
                      <div
                        key={est.id}
                        onClick={() => onSelectEstablishment(est.id)}
                        className={`p-3 rounded-xl border transition-all cursor-pointer flex gap-3 group relative ${
                          isSelected 
                            ? 'bg-white border-terracotta shadow-md ring-1 ring-terracotta' 
                            : 'bg-white border-clay-border/60 hover:border-sand-border hover:shadow-sm'
                        }`}
                      >
                        {/* Thumbnail */}
                        <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0 bg-sand-bg border border-clay-border">
                          <img 
                            src={est.photo} 
                            alt={est.name} 
                            className="w-full h-full object-cover group-hover:scale-105 transition-all duration-300"
                            referrerPolicy="no-referrer"
                          />
                        </div>

                        {/* Info details */}
                        <div className="flex-1 min-w-0 flex flex-col justify-between">
                          <div>
                            <div className="flex items-center justify-between gap-1 mb-0.5">
                              <span className="text-[8px] uppercase font-black tracking-widest text-terracotta">
                                {est.category}
                              </span>
                              
                              <div className="flex items-center gap-1 shrink-0">
                                {activePlan !== 'gratuito' && (
                                  <span className="bg-amber-500/10 text-amber-800 border border-amber-200 text-[7px] font-black uppercase tracking-wider px-1 rounded-sm">
                                    ★ PREMIUM
                                  </span>
                                )}
                                {est.claimed && (
                                  <span className="bg-emerald-500/10 text-emerald-800 border border-emerald-200 text-[7px] font-black uppercase tracking-wider px-1 rounded-sm">
                                    ✓ Verificado
                                  </span>
                                )}
                                <button 
                                  onClick={(e) => toggleFavorite(e, est.id)}
                                  className="text-earth-gray/70 hover:text-red-500 p-0.5 rounded transition-colors"
                                >
                                  <Heart className={`w-3 h-3 ${isFav ? 'text-red-500 fill-red-500' : ''}`} />
                                </button>
                              </div>
                            </div>

                            <h4 className="text-xs font-serif italic font-bold text-earth-dark truncate group-hover:text-terracotta transition-all leading-tight">
                              {est.name}
                            </h4>

                            <p className="text-[10px] text-earth-gray/90 truncate mt-0.5">
                              📍 {est.city} - {est.state} {est.neighborhood ? `(${est.neighborhood})` : ''}
                            </p>
                          </div>

                          {/* Ratings and calculated distance */}
                          <div className="flex justify-between items-center pt-1 border-t border-sand-bg mt-1 text-[9px] text-earth-gray">
                            <div className="flex items-center gap-1 font-semibold">
                              <Star className="w-2.5 h-2.5 fill-terracotta text-terracotta" />
                              <span>{est.rating.toFixed(1)}</span>
                              {est.reviewsCount > 0 && <span className="font-normal">({est.reviewsCount})</span>}
                            </div>

                            {est.distance !== null && (
                              <span className="font-mono font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded-md flex items-center gap-0.5">
                                <MapPin className="w-2.5 h-2.5 shrink-0 text-emerald-600" />
                                {est.distance} km
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* PANEL B: AO MEU REDOR (Proximity module) */}
        {activePanel === 'proximidade' && (
          <div className="space-y-4 animate-fadeIn">
            
            {/* Geo Search Method Selector */}
            <div className="bg-sand-bg/40 border border-clay-border rounded-2xl p-3.5 space-y-3">
              <div className="flex items-center gap-2">
                <Locate className="w-5 h-5 text-terracotta shrink-0" />
                <div>
                  <h3 className="font-bold text-xs text-earth-dark">Busca de Proximidade & Raio Ativo</h3>
                  <p className="text-[9px] text-earth-gray leading-tight">Combine um ponto central com um raio geográfico de interesse.</p>
                </div>
              </div>

              {/* Source Mode Toggle Tabs */}
              <div className="grid grid-cols-3 gap-1 bg-white p-1 rounded-lg border border-clay-border/40 text-[9px] font-bold">
                <button
                  type="button"
                  onClick={() => handleProximitySourceChange('device')}
                  className={`py-1.5 rounded transition-all cursor-pointer ${proximitySourceType === 'device' ? 'bg-terracotta text-white' : 'text-earth-dark/70 hover:bg-sand-bg/30'}`}
                >
                  📍 Dispositivo
                </button>
                <button
                  type="button"
                  onClick={() => handleProximitySourceChange('address')}
                  className={`py-1.5 rounded transition-all cursor-pointer ${proximitySourceType === 'address' ? 'bg-terracotta text-white' : 'text-earth-dark/70 hover:bg-sand-bg/30'}`}
                >
                  ✍️ Endereço / Ref
                </button>
                <button
                  type="button"
                  onClick={() => handleProximitySourceChange('map_click')}
                  className={`py-1.5 rounded transition-all cursor-pointer ${proximitySourceType === 'map_click' ? 'bg-terracotta text-white' : 'text-earth-dark/70 hover:bg-sand-bg/30'}`}
                >
                  🎯 Clique no Mapa
                </button>
              </div>

              {/* 1. DEVICE SOURCE LAYOUT */}
              {proximitySourceType === 'device' && (
                <div className="space-y-2 pt-1">
                  <div className={`p-2.5 rounded-xl border flex items-center gap-2 ${userCoords ? 'bg-emerald-50 border-emerald-100 text-emerald-800' : 'bg-amber-50 border-amber-100 text-amber-800'}`}>
                    <Locate className={`w-4 h-4 shrink-0 ${userCoords ? 'animate-pulse text-emerald-600' : 'text-amber-500'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-[9px] leading-tight">
                        {userCoords ? 'Localização ativa (Simulada)' : 'Localização inativa'}
                      </p>
                      <p className="text-[8px] opacity-90 truncate leading-snug mt-0.5">
                        {userCoords ? 'Coordenadas: -15.7938, -47.8828 (Brasília DF)' : 'Ative para obter as coordenadas de referência.'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={onToggleUserCoords}
                    className="w-full py-2 bg-white hover:bg-sand-bg/30 text-earth-dark border border-clay-border rounded-lg font-bold text-[9px] transition-all cursor-pointer"
                  >
                    {userCoords ? 'Desativar Localização 📍' : 'Ativar Minha Localização 📍'}
                  </button>
                </div>
              )}

              {/* 2. TYPED ADDRESS SEARCH INPUT */}
              {proximitySourceType === 'address' && (
                <div className="space-y-2 pt-1">
                  <form onSubmit={handleAddressLookupSubmit} className="flex gap-1.5">
                    <div className="relative flex-1">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-earth-gray" />
                      <input
                        type="text"
                        required
                        placeholder="Ex: Asa Sul, Aeroporto de Brasília, MASP, CEP..."
                        value={typedAddress}
                        onChange={(e) => setTypedAddress(e.target.value)}
                        className="w-full pl-8 pr-2 py-2 rounded-lg border border-clay-border text-[10px] focus:outline-none focus:border-terracotta bg-white text-earth-dark placeholder-earth-gray"
                      />
                    </div>
                    <button
                      type="submit"
                      className="px-3 bg-earth-dark text-white rounded-lg font-bold hover:brightness-105 cursor-pointer text-[9px]"
                    >
                      Mapear
                    </button>
                  </form>

                  {addressResolvedLabel && (
                    <p className="text-[9px] font-bold text-emerald-700 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> {addressResolvedLabel}
                    </p>
                  )}

                  {addressResolveError && (
                    <div className="p-2 bg-red-50 border border-red-100 text-red-700 text-[9px] rounded-lg space-y-1">
                      <p className="font-semibold">⚠️ Endereço/Referência não mapeado!</p>
                      <p className="text-[8px] opacity-90 leading-tight">Experimente usar uma referência comum cadastrada como "Asa Sul", "UnB", "MASP", ou digite um CEP válido do DF.</p>
                    </div>
                  )}
                </div>
              )}

              {/* 3. CLICK IN MAP INSTRUCTIONS */}
              {proximitySourceType === 'map_click' && (
                <div className="space-y-1 pt-1 text-[9px] text-earth-gray leading-normal">
                  {!mapClickedCoords ? (
                    <div className="p-3 bg-white border border-dashed border-clay-border rounded-xl text-center space-y-1.5">
                      <Map className="w-5 h-5 mx-auto text-terracotta animate-bounce" />
                      <p className="font-semibold text-[10px]">Aguardando Clique no Mapa</p>
                      <p className="text-[8px]">Clique em qualquer ponto do mapa principal para transformá-lo no centro geométrico da pesquisa.</p>
                    </div>
                  ) : (
                    <div className="p-2.5 bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-xl space-y-1">
                      <p className="font-semibold text-[10px] flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Ponto Selecionado!
                      </p>
                      <p className="text-[8px] opacity-90">Latitude: {mapClickedCoords[0].toFixed(5)}, Longitude: {mapClickedCoords[1].toFixed(5)}</p>
                      <button
                        onClick={handleClearProximity}
                        className="text-[8px] font-bold underline hover:text-red-500 cursor-pointer text-left block"
                      >
                        Limpar ponto selecionado
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* SHARED PROXIMITY RADIUS SELECTOR & COMBINED STATUS */}
              <div className="border-t border-clay-border/30 pt-3 flex flex-wrap gap-2 items-center justify-between">
                <div>
                  <label className="block text-[9px] font-bold text-earth-gray uppercase tracking-wider mb-1">Raio de Cobertura:</label>
                  <select
                    value={selectedRadius}
                    onChange={(e) => handleRadiusChange(parseInt(e.target.value))}
                    className="p-1.5 rounded border border-clay-border bg-white text-earth-dark focus:outline-none text-[10px] font-semibold cursor-pointer"
                  >
                    <option value={0.5}>500 metros (Quadra)</option>
                    <option value={1}>1 km (Bairro Próximo)</option>
                    <option value={3}>3 km (Comunidade)</option>
                    <option value={5}>5 km (Região)</option>
                    <option value={10}>10 km (Intermunicipal)</option>
                    <option value={20}>20 km (Metropolitano)</option>
                    <option value={30}>30 km (Amplo)</option>
                    <option value={50}>50 km (Regional Ampliado)</option>
                  </select>
                </div>

                {filters.proximityCenter && (
                  <button
                    onClick={handleClearProximity}
                    className="px-2.5 py-1.5 text-[9px] font-bold text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100/50 border border-red-100 rounded-md transition-all cursor-pointer"
                  >
                    Remover Filtro
                  </button>
                )}
              </div>
            </div>

            {/* Proximity Summary Insights */}
            <div className="grid grid-cols-3 gap-2.5">
              <div className="p-2 bg-white border border-clay-border rounded-xl text-center">
                <span className="block font-black text-xs text-terracotta">{nearbyCounts.ateliers}</span>
                <span className="text-[8px] text-earth-gray">Ateliês (&lt;15km)</span>
              </div>
              <div className="p-2 bg-white border border-clay-border rounded-xl text-center">
                <span className="block font-black text-xs text-sienna">{nearbyCounts.schools}</span>
                <span className="text-[8px] text-earth-gray">Escolas (&lt;15km)</span>
              </div>
              <div className="p-2 bg-white border border-clay-border rounded-xl text-center">
                <span className="block font-black text-xs text-olive">{nearbyCounts.vendors}</span>
                <span className="text-[8px] text-earth-gray">Fornecedores (&lt;15km)</span>
              </div>
            </div>

            {/* List with Proximity Results directly below */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-[9px] font-bold uppercase text-earth-gray tracking-wider px-0.5">
                <span>Resultados de Proximidade: {filteredListings.length}</span>
                {filters.proximityCenter && <span className="text-emerald-700">✓ Filtro Ativo</span>}
              </div>

              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                {filteredListings.slice(0, 8).map(est => (
                  <div
                    key={est.id}
                    onClick={() => { onSelectEstablishment(est.id); onCenterMap(est.coordinates); }}
                    className="p-2.5 bg-white border border-clay-border hover:border-sand-border rounded-xl flex justify-between items-center cursor-pointer transition-all hover:shadow-sm"
                  >
                    <div className="truncate pr-2">
                      <h4 className="font-serif italic font-bold text-earth-dark truncate leading-tight">{est.name}</h4>
                      <p className="text-[9px] text-earth-gray truncate">{est.category} • {est.city}</p>
                    </div>

                    <div className="shrink-0 flex items-center gap-1.5 font-semibold text-[9px]">
                      {est.distance !== null ? (
                        <span className="font-mono font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">
                          {est.distance} km
                        </span>
                      ) : (
                        <span className="text-earth-gray">Sem distância</span>
                      )}
                    </div>
                  </div>
                ))}

                {filteredListings.length === 0 && (
                  <div className="p-8 text-center text-earth-gray bg-sand-bg/10 border border-dashed border-clay-border rounded-xl">
                    Selecione uma localização de referência válida ou aumente o raio de cobertura para ver os estabelecimentos recomendados.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* PANEL C: PLANEJAR VIAGEM (Planejador de Viagem Cerâmica) */}
        {activePanel === 'planejar' && (
          <div className="space-y-4 animate-fadeIn">
            
            <div className="p-3.5 bg-gradient-to-r from-sienna/10 to-terracotta/5 border border-clay-border rounded-2xl space-y-2">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-terracotta shrink-0" />
                <div>
                  <h3 className="font-bold text-xs text-earth-dark">Planejar Viagem Cerâmica 🗺️</h3>
                  <p className="text-[9px] text-earth-gray leading-tight">Monte roteiros artísticos automáticos perto de hotéis ou rodoviárias.</p>
                </div>
              </div>

              {/* Planner Inputs Form */}
              <div className="space-y-2.5 pt-1.5">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[8px] font-black text-earth-gray uppercase mb-1">Cidade Destino:</label>
                    <select
                      value={tripDest}
                      onChange={(e) => {
                        setTripDest(e.target.value);
                        if (e.target.value === 'Brasília') setTripRef('Rodoviária do Plano Piloto');
                        else if (e.target.value === 'São Paulo') setTripRef('Paulista');
                        else if (e.target.value === 'Cunha') setTripRef('Centro de Cunha');
                        else if (e.target.value === 'Paraty') setTripRef('Centro histórico de Paraty');
                      }}
                      className="w-full p-2 rounded-lg border border-clay-border text-[9px] font-bold bg-white text-earth-dark cursor-pointer"
                    >
                      <option value="Brasília">Brasília (DF)</option>
                      <option value="São Paulo">São Paulo (SP)</option>
                      <option value="Cunha">Cunha (SP)</option>
                      <option value="Paraty">Paraty (RJ)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[8px] font-black text-earth-gray uppercase mb-1">Referência (Hotel/Aeroporto):</label>
                    <input
                      type="text"
                      value={tripRef}
                      onChange={(e) => setTripRef(e.target.value)}
                      placeholder="Ex: Rodoviária, Hotel, Aeroporto..."
                      className="w-full p-2 rounded-lg border border-clay-border text-[9px] font-medium bg-white text-earth-dark"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[8px] font-black text-earth-gray uppercase mb-1">Raio de Interesse:</label>
                    <select
                      value={tripRadius}
                      onChange={(e) => setTripRadius(parseInt(e.target.value))}
                      className="w-full p-2 rounded-lg border border-clay-border text-[9px] font-bold bg-white text-earth-dark cursor-pointer"
                    >
                      <option value={5}>Até 5 km (Rápido)</option>
                      <option value={10}>Até 10 km (Moderado)</option>
                      <option value={20}>Até 20 km (Amplo)</option>
                      <option value={50}>Até 50 km (Expedição)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[8px] font-black text-earth-gray uppercase mb-1">Data da Viagem (Opcional):</label>
                    <input
                      type="date"
                      value={tripDate}
                      onChange={(e) => setTripDate(e.target.value)}
                      className="w-full p-1.5 rounded-lg border border-clay-border text-[9px] font-medium bg-white text-earth-dark cursor-pointer"
                    />
                  </div>
                </div>

                <button
                  onClick={() => setShowItinerary(true)}
                  className="w-full py-2.5 bg-gradient-to-r from-terracotta to-sienna hover:brightness-105 text-white font-bold rounded-xl text-[9px] shadow-sm uppercase tracking-wider cursor-pointer"
                >
                  ✨ Gerar Roteiro Cerâmico Personalizado
                </button>
              </div>
            </div>

            {/* Generated Itinerary Section */}
            {showItinerary && (
              <div className="bg-white border border-clay-border rounded-2xl p-4.5 space-y-4 animate-fadeIn shadow-sm">
                
                {/* Itinerary Header */}
                <div className="flex justify-between items-start border-b border-clay-border/35 pb-2.5">
                  <div>
                    <h4 className="font-serif italic text-sm font-bold text-earth-dark">Roteiro: Expedição {tripDest}</h4>
                    <p className="text-[9px] text-earth-gray">Mapeado a partir de: <strong className="text-sienna">{tripRef}</strong> ({tripRadius}km de raio)</p>
                    {tripDate && <p className="text-[8px] text-terracotta font-bold mt-0.5">🗓️ Data Programada: {tripDate.split('-').reverse().join('/')}</p>}
                  </div>
                  
                  <div className="flex gap-1">
                    <button 
                      onClick={() => window.print()}
                      className="p-1.5 text-earth-dark bg-sand-bg rounded-lg hover:bg-clay-border/20 transition-all cursor-pointer" 
                      title="Imprimir Roteiro"
                    >
                      <Printer className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Categories blocks */}
                <div className="space-y-3.5 text-[10px] leading-relaxed">
                  
                  {/* 1. Ateliês e Ceramistas */}
                  {structuredItinerary.ateliers.length > 0 && (
                    <div className="space-y-1.5">
                      <h5 className="font-bold text-terracotta uppercase text-[8px] tracking-wider border-l-2 border-terracotta pl-1.5 flex items-center justify-between">
                        <span>🏺 Ateliês & Ceramistas Recomendados</span>
                        <span className="text-[8px] text-earth-gray font-semibold">({structuredItinerary.ateliers.length})</span>
                      </h5>
                      <div className="space-y-1.5">
                        {structuredItinerary.ateliers.slice(0, 3).map(est => (
                          <div 
                            key={est.id} 
                            onClick={() => { onSelectEstablishment(est.id); onCenterMap(est.coordinates); }}
                            className="p-2 rounded-lg bg-sand-bg/25 border border-clay-border/30 hover:border-terracotta cursor-pointer transition-all flex justify-between items-center"
                          >
                            <div>
                              <p className="font-semibold italic text-[10px] text-earth-dark">{est.name}</p>
                              <p className="text-[8px] text-earth-gray leading-tight">{est.neighborhood} • ⭐ {est.rating.toFixed(1)}</p>
                            </div>
                            <span className="font-mono text-[8px] font-bold text-emerald-800 bg-emerald-50 px-1 py-0.5 rounded">{est.distance} km</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 2. Escolas */}
                  {structuredItinerary.schools.length > 0 && (
                    <div className="space-y-1.5">
                      <h5 className="font-bold text-sienna uppercase text-[8px] tracking-wider border-l-2 border-sienna pl-1.5 flex items-center justify-between">
                        <span>🎓 Cursos & Ateliês Escola para Visitar</span>
                        <span className="text-[8px] text-earth-gray font-semibold">({structuredItinerary.schools.length})</span>
                      </h5>
                      <div className="space-y-1.5">
                        {structuredItinerary.schools.slice(0, 2).map(est => (
                          <div 
                            key={est.id} 
                            onClick={() => { onSelectEstablishment(est.id); onCenterMap(est.coordinates); }}
                            className="p-2 rounded-lg bg-sand-bg/25 border border-clay-border/30 hover:border-sienna cursor-pointer transition-all flex justify-between items-center"
                          >
                            <div>
                              <p className="font-semibold italic text-[10px] text-earth-dark">{est.name}</p>
                              <p className="text-[8px] text-earth-gray leading-tight">{est.neighborhood} • {est.specialties.slice(0, 2).join(', ')}</p>
                            </div>
                            <span className="font-mono text-[8px] font-bold text-emerald-800 bg-emerald-50 px-1 py-0.5 rounded">{est.distance} km</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 3. Cultural e Coleções */}
                  {structuredItinerary.cultural.length > 0 && (
                    <div className="space-y-1.5">
                      <h5 className="font-bold text-blue-800 uppercase text-[8px] tracking-wider border-l-2 border-blue-600 pl-1.5 flex items-center justify-between">
                        <span>🏛️ Galerias, Museus & Associações</span>
                        <span className="text-[8px] text-earth-gray font-semibold">({structuredItinerary.cultural.length})</span>
                      </h5>
                      <div className="space-y-1.5">
                        {structuredItinerary.cultural.slice(0, 2).map(est => (
                          <div 
                            key={est.id} 
                            onClick={() => { onSelectEstablishment(est.id); onCenterMap(est.coordinates); }}
                            className="p-2 rounded-lg bg-sand-bg/25 border border-clay-border/30 hover:border-blue-500 cursor-pointer transition-all flex justify-between items-center"
                          >
                            <div>
                              <p className="font-semibold italic text-[10px] text-earth-dark">{est.name}</p>
                              <p className="text-[8px] text-earth-gray leading-tight">{est.neighborhood} • Acervo público</p>
                            </div>
                            <span className="font-mono text-[8px] font-bold text-emerald-800 bg-emerald-50 px-1 py-0.5 rounded">{est.distance} km</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Empty state within radius */}
                  {itinerarySpaces.length === 0 && (
                    <div className="p-6 text-center text-earth-gray bg-sand-bg/10 rounded-xl border border-clay-border/50">
                      Nenhum espaço cerâmico localizado neste raio. Tente ampliar o raio para até 50km de expedição!
                    </div>
                  )}

                  {/* Summary Footer */}
                  <div className="p-2.5 bg-sand-bg/50 border border-clay-border/20 rounded-xl space-y-1">
                    <p className="font-bold text-[9px] text-earth-dark flex items-center gap-1">
                      <HeartHandshake className="w-3.5 h-3.5 text-terracotta shrink-0" /> Dicas da CeraMapa:
                    </p>
                    <p className="text-[8px] text-earth-gray leading-normal">Ligue sempre com antecedência (usando o botão de WhatsApp no mapa) para agendar sua visita aos ateliês particulares. Boas queimas!</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* PANEL D: DESCOBRIR */}
        {activePanel === 'descobrir' && (
          <div className="space-y-4">
            
            {/* 1. Recommended spaces */}
            <div className="space-y-2">
              <h3 className="text-[10px] font-bold text-terracotta uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-500 fill-amber-500 animate-pulse" /> Recomendações em Destaque
              </h3>
              <div className="grid grid-cols-1 gap-2.5">
                {discoveries.recommended.map(est => (
                  <div 
                    key={est.id}
                    onClick={() => { onSelectEstablishment(est.id); onCenterMap(est.coordinates); }}
                    className="p-3 bg-gradient-to-br from-amber-50/40 to-white hover:to-amber-50/20 border-2 border-amber-200/55 hover:border-amber-300 rounded-xl flex gap-3 cursor-pointer group transition-all"
                  >
                    <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0 bg-sand-bg border border-clay-border">
                      <img src={est.photo} alt={est.name} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-[7px] uppercase font-bold tracking-widest text-amber-800 bg-amber-50 border border-amber-200 px-1 rounded-sm">★ RECOMENDADO</span>
                        <span className="text-[8px] text-earth-gray font-semibold">{est.city}</span>
                      </div>
                      <h4 className="text-xs font-serif font-bold italic truncate group-hover:text-terracotta transition-all">{est.name}</h4>
                      <p className="text-[10px] text-earth-gray line-clamp-1">{est.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 2. Hidden Gems */}
            <div className="space-y-2">
              <h3 className="text-[10px] font-bold text-sienna uppercase tracking-wider flex items-center gap-1">
                <Compass className="w-3.5 h-3.5 text-sienna shrink-0" /> Pérolas Escondidas
              </h3>
              <div className="space-y-2">
                {discoveries.hiddenGems.map(est => (
                  <div
                    key={est.id}
                    onClick={() => { onSelectEstablishment(est.id); onCenterMap(est.coordinates); }}
                    className="p-2.5 bg-white border border-clay-border/50 hover:border-sand-border hover:shadow-sm rounded-lg flex items-center justify-between cursor-pointer group transition-all"
                  >
                    <div className="truncate pr-2">
                      <p className="font-serif font-bold italic truncate group-hover:text-terracotta transition-all">{est.name}</p>
                      <p className="text-[9px] text-earth-gray truncate leading-normal">
                        Ateliê impecável localizado em {est.city} - {est.state}. Super recomendado por quem conhece!
                      </p>
                    </div>
                    <span className="font-bold text-[9px] text-amber-600 bg-amber-50 border border-amber-100 px-1.5 py-0.5 rounded shrink-0 flex items-center gap-0.5">
                      <Star className="w-2.5 h-2.5 fill-amber-500 text-amber-500" /> {est.rating.toFixed(1)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* 3. New Studios */}
            <div className="space-y-2">
              <h3 className="text-[10px] font-bold text-olive uppercase tracking-wider flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-olive shrink-0" /> Novos Integrantes na Rede
              </h3>
              <div className="space-y-2">
                {discoveries.newStudios.map(est => (
                  <div
                    key={est.id}
                    onClick={() => { onSelectEstablishment(est.id); onCenterMap(est.coordinates); }}
                    className="p-2.5 bg-white border border-clay-border/50 hover:border-sand-border hover:shadow-sm rounded-lg flex items-center justify-between cursor-pointer group transition-all"
                  >
                    <div className="truncate pr-2">
                      <p className="font-serif font-bold italic truncate group-hover:text-terracotta transition-all">{est.name}</p>
                      <p className="text-[9px] text-earth-gray truncate">{est.category} • {est.city} - {est.state}</p>
                    </div>
                    <span className="text-[8px] font-black uppercase tracking-wider text-white bg-terracotta px-1.5 py-0.5 rounded shrink-0">
                      Novo
                    </span>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
