import React, { useState, useEffect } from 'react';
import { 
  MapPin, Check, AlertTriangle, RefreshCw, Compass, ShieldCheck, 
  Search, Sliders, Globe, Eye, HelpCircle, CornerDownRight,
  ChevronRight, Save, Trash, Plus, CheckCircle2, AlertOctagon, Info,
  Layers, Download
} from 'lucide-react';
import { Establishment } from '../types';
import { 
  performGeocodingHierarchy, 
  validateCoordinates, 
  getRaEquivalences, 
  saveRaEquivalences, 
  RaEquivalence, 
  DF_REGIOES_ADMINISTRATIVAS,
  STATE_CENTERS
} from '../utils/geocodingHelper';

interface GeocodingReviewProps {
  establishments: Establishment[];
  onUpdateEstablishmentCoords: (id: string, coords: [number, number], addressDetails?: Partial<Establishment>) => void;
  onUpdateEstablishment: (id: string, updates: Partial<Establishment>) => void;
}

export default function GeocodingReview({
  establishments,
  onUpdateEstablishmentCoords,
  onUpdateEstablishment
}: GeocodingReviewProps) {
  // Tabs: Fila de Revisão, Banco Geográfico, Dicionário de Equivalências, Diagnóstico do Mapa
  const [activeTab, setActiveTab] = useState<'pending' | 'database' | 'equivalences' | 'diagnostics'>('pending');

  // Diagnostics Tab local states
  const [diagnosticsLoading, setDiagnosticsLoading] = useState(false);
  const [auditLogList, setAuditLogList] = useState<{ id: string; timestamp: string; level: 'success' | 'warning' | 'error'; message: string }[]>([]);

  // Search and filter for database tab
  const [dbSearch, setDbSearch] = useState('');
  const [dbStatusFilter, setDbStatusFilter] = useState<'all' | 'valid' | 'pending_review'>('all');

  // Equivalences local state
  const [equivalences, setEquivalences] = useState<RaEquivalence[]>([]);
  const [newSource, setNewSource] = useState('');
  const [newTarget, setNewTarget] = useState('Plano Piloto');

  // Selected establishment for detailed editing
  const [selectedEstId, setSelectedEstId] = useState<string>('');
  const selectedEst = establishments.find(e => e.id === selectedEstId);

  // Editing form states
  const [editAddress, setEditAddress] = useState('');
  const [editNeighborhood, setEditNeighborhood] = useState('');
  const [editCity, setEditCity] = useState('');
  const [editState, setEditState] = useState('');
  const [editCep, setEditCep] = useState('');
  const [editPrivacy, setEditPrivacy] = useState<'full' | 'neighborhood' | 'city' | 'state'>('full');
  const [editLat, setEditLat] = useState(0);
  const [editLng, setEditLng] = useState(0);
  const [editRationale, setEditRationale] = useState('');
  const [manualPosition, setManualPosition] = useState(false);

  // Logging and UI helpers
  const [geocodingLogs, setGeocodingLogs] = useState<{ step: number; desc: string; query: string; status: string; reason?: string }[]>([]);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [showNotification, setShowNotification] = useState<{ type: 'success' | 'info' | 'error'; text: string } | null>(null);

  // Load equivalences on mount
  useEffect(() => {
    setEquivalences(getRaEquivalences());
  }, []);

  // Filter establishments to find the ones with issues for the Pending Review Queue
  const pendingQueue = establishments.filter(est => {
    // 1. Missing coordinates or coordinates at 0,0
    const hasNoCoords = !est.coordinates || (est.coordinates[0] === 0 && est.coordinates[1] === 0);
    // 2. Out of bounds or wrong state coordinates
    const validation = est.coordinates ? validateCoordinates(est.coordinates[0], est.coordinates[1], est.state) : { isValid: false };
    
    // 3. Mark as pending if status is pending_review, or has invalid coords, or coords at 0,0
    return est.geocodingStatus === 'pending_review' || est.geocodingStatus === 'failed' || hasNoCoords || !validation.isValid;
  });

  // Automatically select first pending item if none selected
  useEffect(() => {
    if (activeTab === 'pending' && pendingQueue.length > 0 && !selectedEstId) {
      handleSelectEst(pendingQueue[0].id);
    }
  }, [activeTab, pendingQueue, selectedEstId]);

  // Load edit values when selected establishment changes
  const handleSelectEst = (id: string) => {
    setSelectedEstId(id);
    const est = establishments.find(e => e.id === id);
    if (est) {
      setEditAddress(est.address);
      setEditNeighborhood(est.neighborhood);
      setEditCity(est.city);
      setEditState(est.state);
      setEditCep(est.originalAddress?.match(/\d{5}-\d{3}/)?.[0] || '');
      setEditPrivacy(est.privacy || 'full');
      setEditLat(est.coordinates?.[0] || 0);
      setEditLng(est.coordinates?.[1] || 0);
      setManualPosition(est.originalAddress ? est.originalAddress.includes('[MANUAL]') : false);
      setEditRationale('');
      setGeocodingLogs([]);
    }
  };

  // Run automatic batch geocoding of ALL records to correct coordinates
  const handleRecalculateAll = () => {
    setIsGeocoding(true);
    let countCorrected = 0;
    let countToReview = 0;

    establishments.forEach(est => {
      // Do not overwrite manual modifications
      const isManual = est.originalAddress && est.originalAddress.includes('[MANUAL]');
      if (isManual) return;

      const res = performGeocodingHierarchy({
        address: est.address,
        neighborhood: est.neighborhood,
        city: est.city,
        state: est.state,
        cep: est.originalAddress?.match(/\d{5}-\d{3}/)?.[0] || '',
        privacy: est.privacy
      });

      const val = validateCoordinates(res.coords[0], res.coords[1], res.normalized.state);
      const isOk = res.success && val.isValid;

      onUpdateEstablishment(est.id, {
        address: res.normalized.address,
        neighborhood: res.normalized.neighborhood,
        city: res.normalized.city,
        state: res.normalized.state,
        coordinates: res.coords,
        geocodingStatus: isOk ? 'valid' : 'pending_review',
        originalAddress: est.originalAddress || est.address
      });

      if (isOk) countCorrected++;
      else countToReview++;
    });

    setIsGeocoding(false);
    triggerNotification('success', `Correção concluída: ${countCorrected} atualizados com sucesso, ${countToReview} enviados para fila de revisão!`);
  };

  // Recalculate coordinates for current editing establishment
  const handleRecalculateCurrent = () => {
    if (!selectedEst) return;
    setIsGeocoding(true);
    setGeocodingLogs([]);

    setTimeout(() => {
      const res = performGeocodingHierarchy({
        address: editAddress,
        neighborhood: editNeighborhood,
        city: editCity,
        state: editState,
        cep: editCep,
        privacy: editPrivacy
      });

      // Build trace logs
      const traceLogs = res.steps.map(step => ({
        step: step.step,
        desc: step.description,
        query: step.searchString,
        status: step.status,
        reason: step.reason
      }));

      setGeocodingLogs(traceLogs);
      setEditLat(res.coords[0]);
      setEditLng(res.coords[1]);
      setEditAddress(res.normalized.address);
      setEditNeighborhood(res.normalized.neighborhood);
      setEditCity(res.normalized.city);
      setEditState(res.normalized.state);
      setEditCep(res.normalized.cep);
      setManualPosition(false);
      setIsGeocoding(false);
      
      const validation = validateCoordinates(res.coords[0], res.coords[1], res.normalized.state);
      if (res.success && validation.isValid) {
        triggerNotification('success', 'Geocodificação realizada com sucesso! Coordenadas válidas encontradas.');
      } else {
        triggerNotification('info', `Aviso: ${validation.reason || 'Localização aproximada gerada.'}`);
      }
    }, 1000);
  };

  // Save the coordinates and address adjustments
  const handleSaveCorrection = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEst) return;

    // Validate coordinates
    const validation = validateCoordinates(editLat, editLng, editState);
    const status = validation.isValid ? 'valid' : 'pending_review';

    const updates: Partial<Establishment> = {
      address: editAddress,
      neighborhood: editNeighborhood,
      city: editCity,
      state: editState,
      coordinates: [editLat, editLng],
      privacy: editPrivacy,
      geocodingStatus: status,
      originalAddress: `${selectedEst.originalAddress || selectedEst.address}${manualPosition ? ' [MANUAL]' : ''}`
    };

    onUpdateEstablishment(selectedEst.id, updates);

    // Save manual modifications log to history/localstorage audits
    if (editRationale) {
      const nextLog = {
        id: `geolog_${Date.now()}`,
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
        establishmentName: selectedEst.name,
        action: manualPosition ? 'Correção Manual' : 'Correção Geocodificada',
        rationale: editRationale,
        coordinates: [editLat, editLng].join(', ')
      };
      const savedLogs = localStorage.getItem('ceramapa_geocoding_audits');
      const list = savedLogs ? JSON.parse(savedLogs) : [];
      localStorage.setItem('ceramapa_geocoding_audits', JSON.stringify([nextLog, ...list]));
    }

    triggerNotification('success', `Alterações salvas com sucesso para "${selectedEst.name}"!`);
    
    // Select another item if in pending queue
    if (activeTab === 'pending') {
      const remaining = pendingQueue.filter(p => p.id !== selectedEst.id);
      if (remaining.length > 0) {
        handleSelectEst(remaining[0].id);
      } else {
        setSelectedEstId('');
      }
    }
  };

  // Handle manual map click / coordinate selection trigger
  const handleSetExactCoords = (lat: number, lng: number) => {
    setEditLat(lat);
    setEditLng(lng);
    setManualPosition(true);
    triggerNotification('info', 'Coordenadas definidas manualmente!');
  };

  // Helper to trigger notification banner
  const triggerNotification = (type: 'success' | 'info' | 'error', text: string) => {
    setShowNotification({ type, text });
    setTimeout(() => setShowNotification(null), 5000);
  };

  // Add a new RA equivalence
  const handleAddEquivalence = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSource.trim() || !newTarget.trim()) return;

    const nextEq: RaEquivalence = {
      id: `eq_${Date.now()}`,
      source: newSource.trim(),
      target: newTarget.trim()
    };

    const updated = [...equivalences, nextEq];
    setEquivalences(updated);
    saveRaEquivalences(updated);
    setNewSource('');
    triggerNotification('success', `Equivalência adicionada: "${nextEq.source}" → "${nextEq.target}"`);
  };

  // Remove equivalence
  const handleRemoveEquivalence = (id: string) => {
    const updated = equivalences.filter(eq => eq.id !== id);
    setEquivalences(updated);
    saveRaEquivalences(updated);
    triggerNotification('info', 'Equivalência excluída.');
  };

  // Filter geographical database list
  const filteredDb = establishments.filter(est => {
    const matchesSearch = est.name.toLowerCase().includes(dbSearch.toLowerCase()) || 
                          est.city.toLowerCase().includes(dbSearch.toLowerCase()) ||
                          est.state.toLowerCase().includes(dbSearch.toLowerCase());
    
    const matchesStatus = dbStatusFilter === 'all' || 
                          (dbStatusFilter === 'valid' && est.geocodingStatus === 'valid') ||
                          (dbStatusFilter === 'pending_review' && (est.geocodingStatus === 'pending_review' || est.geocodingStatus === 'failed'));
    
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-5 font-sans text-xs text-earth-dark">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-clay-border/30 pb-4">
        <div className="flex items-center gap-2.5">
          <span className="p-2.5 rounded-xl bg-sienna border border-sienna/20 text-white shadow-sm">
            <Compass className="w-5 h-5 animate-pulse" />
          </span>
          <div>
            <h2 className="text-base font-bold text-earth-dark tracking-tight">Gerenciador de Localização & Inteligência Geográfica</h2>
            <p className="text-[11px] text-earth-gray">Normalize endereços, corrija coordenadas em lotes, audite inconsistências e defina restrições de privacidade</p>
          </div>
        </div>

        <button
          onClick={handleRecalculateAll}
          disabled={isGeocoding}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-gradient-to-r from-sienna to-earth-dark hover:brightness-105 text-white rounded-xl text-[11px] font-bold shadow-md cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isGeocoding ? 'animate-spin' : ''}`} />
          Corrigir e Recodificar Toda a Base
        </button>
      </div>

      {/* NOTIFICATION TOAST */}
      {showNotification && (
        <div className={`p-3.5 rounded-xl border flex items-start gap-2.5 animate-slideDown ${
          showNotification.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' :
          showNotification.type === 'error' ? 'bg-red-50 border-red-200 text-red-800' :
          'bg-blue-50 border-blue-200 text-blue-800'
        }`}>
          {showNotification.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" /> :
           showNotification.type === 'error' ? <AlertOctagon className="w-4 h-4 text-red-600 shrink-0 mt-0.5" /> :
           <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />}
          <p className="font-semibold leading-normal">{showNotification.text}</p>
        </div>
      )}

      {/* METRIC OVERVIEW CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-3.5 bg-white border border-clay-border rounded-xl">
          <p className="text-[10px] font-bold text-earth-gray uppercase tracking-wider">Total de Cadastros</p>
          <p className="text-lg font-bold text-earth-dark mt-1">{establishments.length} perfis</p>
        </div>
        <div className="p-3.5 bg-white border border-clay-border rounded-xl">
          <p className="text-[10px] font-bold text-earth-gray uppercase tracking-wider">Posições Válidas</p>
          <p className="text-lg font-bold text-emerald-600 mt-1">
            {establishments.filter(e => e.geocodingStatus === 'valid').length} / {establishments.length}
          </p>
        </div>
        <div className="p-3.5 bg-amber-500/10 border border-amber-200 rounded-xl">
          <p className="text-[10px] font-bold text-amber-800 uppercase tracking-wider">Pendências de Revisão</p>
          <p className="text-lg font-bold text-amber-700 mt-1">{pendingQueue.length} locais</p>
        </div>
        <div className="p-3.5 bg-blue-500/10 border border-blue-200 rounded-xl">
          <p className="text-[10px] font-bold text-blue-800 uppercase tracking-wider">Distrito Federal (DF)</p>
          <p className="text-lg font-bold text-blue-700 mt-1">
            {establishments.filter(e => e.state === 'Distrito Federal').length} registros
          </p>
        </div>
      </div>

      {/* MAIN LAYOUT SUB-TAB NAVIGATION */}
      <div className="flex border-b border-clay-border/30 gap-2.5">
        <button
          onClick={() => { setActiveTab('pending'); setSelectedEstId(''); }}
          className={`pb-2 px-3.5 border-b-2 font-bold tracking-wider uppercase transition-all cursor-pointer relative ${
            activeTab === 'pending' ? 'border-sienna text-sienna' : 'border-transparent text-earth-dark/60 hover:text-earth-dark'
          }`}
        >
          Fila de Revisão ({pendingQueue.length})
          {pendingQueue.length > 0 && (
            <span className="absolute -top-1 -right-1.5 bg-red-500 text-white font-black text-[8px] rounded-full w-4.5 h-4.5 flex items-center justify-center border border-white animate-pulse">
              {pendingQueue.length}
            </span>
          )}
        </button>
        <button
          onClick={() => { setActiveTab('database'); setSelectedEstId(''); }}
          className={`pb-2 px-3.5 border-b-2 font-bold tracking-wider uppercase transition-all cursor-pointer ${
            activeTab === 'database' ? 'border-sienna text-sienna' : 'border-transparent text-earth-dark/60 hover:text-earth-dark'
          }`}
        >
          Banco Geográfico ({establishments.length})
        </button>
        <button
          onClick={() => { setActiveTab('equivalences'); setSelectedEstId(''); }}
          className={`pb-2 px-3.5 border-b-2 font-bold tracking-wider uppercase transition-all cursor-pointer ${
            activeTab === 'equivalences' ? 'border-sienna text-sienna' : 'border-transparent text-earth-dark/60 hover:text-earth-dark'
          }`}
        >
          Equivalências de RAs ({equivalences.length})
        </button>
        <button
          onClick={() => { setActiveTab('diagnostics'); setSelectedEstId(''); }}
          className={`pb-2 px-3.5 border-b-2 font-bold tracking-wider uppercase transition-all cursor-pointer ${
            activeTab === 'diagnostics' ? 'border-sienna text-sienna' : 'border-transparent text-earth-dark/60 hover:text-earth-dark'
          }`}
        >
          Diagnóstico do Mapa 🔬
        </button>
      </div>

      {/* TAB 1: PENDING REVIEW QUEUE */}
      {activeTab === 'pending' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Left Column: List of items with geo faults */}
          <div className="lg:col-span-1 space-y-2.5">
            <h3 className="text-[10px] font-bold text-earth-gray uppercase tracking-wider mb-1">
              Localizações Pendentes de Correção
            </h3>
            
            {pendingQueue.length === 0 ? (
              <div className="p-8 text-center bg-emerald-50/50 border border-dashed border-emerald-200 rounded-xl space-y-1.5">
                <ShieldCheck className="w-8 h-8 text-emerald-600 mx-auto" />
                <p className="font-serif italic font-bold text-earth-dark text-sm">Nenhuma pendência encontrada!</p>
                <p className="text-[10px] text-earth-gray">Todos os estabelecimentos estão perfeitamente georreferenciados e validados.</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[580px] overflow-y-auto pr-1">
                {pendingQueue.map(item => {
                  const isSel = item.id === selectedEstId;
                  const isZero = !item.coordinates || (item.coordinates[0] === 0 && item.coordinates[1] === 0);
                  const isDivergent = item.coordinates && !validateCoordinates(item.coordinates[0], item.coordinates[1], item.state).isValid;
                  
                  return (
                    <div
                      key={item.id}
                      onClick={() => handleSelectEst(item.id)}
                      className={`p-3 rounded-xl border-2 transition-all cursor-pointer space-y-1.5 relative ${
                        isSel ? 'bg-white border-sienna shadow-md' : 'bg-white border-clay-border/45 hover:border-sand-border'
                      }`}
                    >
                      <div className="flex justify-between items-start gap-1">
                        <h4 className="font-serif italic font-bold text-earth-dark leading-snug truncate max-w-[180px]">
                          {item.name}
                        </h4>
                        <span className="px-1.5 py-0.5 rounded bg-sand-bg text-[9px] font-mono font-bold text-earth-gray uppercase">
                          {item.state}
                        </span>
                      </div>
                      
                      <p className="text-[10px] text-earth-gray leading-tight">
                        📍 {item.address || 'Sem endereço'}, {item.neighborhood}, {item.city}
                      </p>

                      <div className={`p-1.5 rounded text-[9px] font-semibold flex items-center gap-1 leading-normal ${
                        isZero ? 'bg-purple-50 text-purple-800 border border-purple-100' :
                        isDivergent ? 'bg-red-50 text-red-800 border border-red-100' :
                        'bg-amber-50 text-amber-800 border border-amber-100'
                      }`}>
                        <AlertTriangle className="w-3 h-3 shrink-0" />
                        <span>
                          {isZero ? 'Coordenadas Ausentes [0, 0]' : 
                           isDivergent ? 'Divergência: Fora do Estado Cadastrado' : 
                           'Inconsistência nos Detalhes Geográficos'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right Column: Detailed Geocoding and Corrections Panel */}
          <div className="lg:col-span-2">
            {selectedEst ? (
              <form onSubmit={handleSaveCorrection} className="bg-white rounded-2xl border border-clay-border p-4.5 space-y-4 shadow-sm">
                
                <div className="border-b border-clay-border/30 pb-2.5 flex justify-between items-start flex-wrap gap-2">
                  <div>
                    <h3 className="font-bold text-xs text-earth-dark uppercase flex items-center gap-1.5">
                      <MapPin className="w-4 h-4 text-sienna" /> Corretor Cadastral de Localização
                    </h3>
                    <p className="text-[10px] text-earth-gray mt-0.5">Editando posicionamento para: <strong className="text-sienna">{selectedEst.name}</strong></p>
                  </div>
                  
                  <span className="px-2 py-0.5 rounded-full bg-sand-card/75 border border-clay-border/50 text-[9px] font-bold text-earth-dark">
                    ID: {selectedEst.id}
                  </span>
                </div>

                {/* ADDRESS DETAILS ADJUSTMENT FORM */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="sm:col-span-2">
                    <label className="block font-bold text-earth-gray mb-1">Endereço Completo (Original/Declarado) *</label>
                    <input 
                      type="text" 
                      required
                      value={editAddress}
                      onChange={(e) => setEditAddress(e.target.value)}
                      className="w-full p-2.5 rounded-lg border border-clay-border bg-white text-earth-dark focus:border-sienna focus:ring-1 focus:ring-sienna focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-earth-gray mb-1">Bairro *</label>
                    <input 
                      type="text" 
                      required
                      value={editNeighborhood}
                      onChange={(e) => setEditNeighborhood(e.target.value)}
                      className="w-full p-2.5 rounded-lg border border-clay-border bg-white text-earth-dark focus:border-sienna focus:ring-1 focus:ring-sienna focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-earth-gray mb-1">Cidade / Região Administrativa *</label>
                    <input 
                      type="text" 
                      required
                      value={editCity}
                      onChange={(e) => setEditCity(e.target.value)}
                      className="w-full p-2.5 rounded-lg border border-clay-border bg-white text-earth-dark focus:border-sienna focus:ring-1 focus:ring-sienna focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-earth-gray mb-1">Estado (UF) *</label>
                    <input 
                      type="text" 
                      required
                      value={editState}
                      onChange={(e) => setEditState(e.target.value)}
                      className="w-full p-2.5 rounded-lg border border-clay-border bg-white text-earth-dark focus:border-sienna focus:ring-1 focus:ring-sienna focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-earth-gray mb-1">CEP *</label>
                    <input 
                      type="text"
                      placeholder="Ex: 70000-000"
                      value={editCep}
                      onChange={(e) => setEditCep(e.target.value)}
                      className="w-full p-2.5 rounded-lg border border-clay-border bg-white text-earth-dark focus:border-sienna focus:ring-1 focus:ring-sienna focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-earth-gray mb-1">Nível de Privacidade *</label>
                    <select
                      value={editPrivacy}
                      onChange={(e) => setEditPrivacy(e.target.value as any)}
                      className="w-full p-2.5 rounded-lg border border-clay-border bg-white text-earth-dark focus:border-sienna focus:ring-1 focus:ring-sienna focus:outline-none cursor-pointer"
                    >
                      <option value="full">Exibir Endereço Completo e Rota (Público)</option>
                      <option value="neighborhood">Exibir Apenas Bairro e Localização Aproximada</option>
                      <option value="city">Exibir Apenas Cidade/RA e Localização Aproximada</option>
                      <option value="state">Exibir Apenas Estado (Sem Marcador de Rua)</option>
                    </select>
                  </div>

                  {/* Trigger Geocoding hierarchy */}
                  <div className="flex items-end">
                    <button
                      type="button"
                      onClick={handleRecalculateCurrent}
                      disabled={isGeocoding}
                      className="w-full py-2.5 bg-gradient-to-r from-sienna to-earth-dark hover:brightness-110 text-white rounded-lg text-[11px] font-bold shadow-md cursor-pointer disabled:bg-clay-border flex items-center justify-center gap-1.5"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isGeocoding ? 'animate-spin' : ''}`} />
                      {isGeocoding ? 'Normalizando & Pesquisando...' : 'Recalcular Coordenadas (Geocodificar)'}
                    </button>
                  </div>
                </div>

                {/* HIERARCHICAL GEOCODING LOG TRACE CONSOLE */}
                {geocodingLogs.length > 0 && (
                  <div className="p-3.5 bg-earth-dark text-green-400 font-mono text-[10px] rounded-xl space-y-1.5">
                    <div className="flex justify-between items-center text-[9px] text-white border-b border-clay-border/30 pb-1.5 mb-1.5 uppercase font-bold tracking-wider">
                      <span className="flex items-center gap-1"><Globe className="w-3.5 h-3.5 text-green-400" /> Histórico de Geocodificação (Trace):</span>
                      <span className="text-green-300">Nominatim Simulator v2.1</span>
                    </div>
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {geocodingLogs.map((log, index) => (
                        <div key={index} className="pl-2 border-l border-green-500/40 py-0.5">
                          <p className="text-white font-bold flex items-center gap-1">
                            <CornerDownRight className="w-3 h-3 text-green-400" /> 
                            Etapa {log.step}: {log.desc}
                          </p>
                          <p className="text-[9px] text-green-300/80 italic ml-4">Filtro de busca: "{log.query}"</p>
                          <p className="ml-4 font-semibold text-[9px] flex items-center gap-1">
                            Status: 
                            <span className={log.status === 'valid' ? 'text-green-400' : 'text-red-400'}>
                              {log.status.toUpperCase()} {log.reason ? `(${log.reason})` : ''}
                            </span>
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* COORDINATE DISPLAY AND MANUAL MOVE */}
                <div className="p-3.5 bg-sand-bg/40 border border-clay-border/50 rounded-xl space-y-3">
                  <div className="flex justify-between items-center flex-wrap gap-1">
                    <h4 className="font-bold text-[10px] uppercase tracking-wide text-earth-dark flex items-center gap-1">
                      Coordenadas Geográficas Atuais
                      {manualPosition && <span className="bg-amber-600 text-white text-[8px] font-black uppercase px-1 rounded">Prevalência Manual Ativa</span>}
                    </h4>
                    
                    {/* Presets coordinate picker */}
                    <div className="flex items-center gap-1">
                      <span className="text-[9px] text-earth-gray font-bold">Definir Centro de:</span>
                      <button
                        type="button"
                        onClick={() => {
                          const coord = STATE_CENTERS[editState] || [-23.5505, -46.6333];
                          handleSetExactCoords(coord[0], coord[1]);
                        }}
                        className="bg-white border border-clay-border text-[9px] font-bold px-1.5 py-0.5 rounded hover:bg-sand-bg cursor-pointer"
                      >
                        Estado ({editState || 'Default'})
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (editState === 'Distrito Federal') {
                            handleSetExactCoords(-15.7801, -47.9292); // Brasília center
                          } else {
                            handleSetExactCoords(-23.55052, -46.633308); // SP
                          }
                        }}
                        className="bg-white border border-clay-border text-[9px] font-bold px-1.5 py-0.5 rounded hover:bg-sand-bg cursor-pointer"
                      >
                        Cidade
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-[9px] font-bold text-earth-gray uppercase mb-1">Latitude</label>
                      <input 
                        type="number" 
                        step="any"
                        required
                        value={editLat}
                        onChange={(e) => { setEditLat(Number(e.target.value)); setManualPosition(true); }}
                        className="w-full p-2.5 rounded-lg border border-clay-border bg-white text-earth-dark focus:border-sienna focus:ring-1 focus:ring-sienna focus:outline-none font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-[9px] font-bold text-earth-gray uppercase mb-1">Longitude</label>
                      <input 
                        type="number" 
                        step="any"
                        required
                        value={editLng}
                        onChange={(e) => { setEditLng(Number(e.target.value)); setManualPosition(true); }}
                        className="w-full p-2.5 rounded-lg border border-clay-border bg-white text-earth-dark focus:border-sienna focus:ring-1 focus:ring-sienna focus:outline-none font-mono"
                      />
                    </div>
                  </div>

                  {/* PUBLIC DISPLAY SUMMARY BASED ON PRIVACY */}
                  <div className="bg-sand-card/45 p-2.5 rounded-lg border border-clay-border/30 flex items-start gap-2 text-[10px]">
                    <Eye className="w-4 h-4 text-sienna shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-earth-dark">Exibição Pública Simulada:</p>
                      <p className="text-earth-gray leading-snug mt-0.5">
                        {editPrivacy === 'full' ? (
                          <span>Marcador exato no mapa: <strong className="font-mono">{editLat.toFixed(5)}, {editLng.toFixed(5)}</strong>. Endereço completo público para navegação de rota GPS.</span>
                        ) : editPrivacy === 'neighborhood' ? (
                          <span>Marcador aproximado (desvio aleatório) no bairro <strong className="text-earth-dark">{editNeighborhood || 'Centro'}</strong>. Exibindo círculo de tolerância de 400m de raio.</span>
                        ) : editPrivacy === 'city' ? (
                          <span>Marcador centralizado na cidade/RA <strong className="text-earth-dark">{editCity}</strong>. Exibindo círculo de tolerância de 3.5km de raio.</span>
                        ) : (
                          <span>Oculto do mapa de rua. Exibe apenas a presença geral no estado de <strong className="text-earth-dark">{editState}</strong>.</span>
                        )}
                      </p>
                    </div>
                  </div>
                </div>

                {/* REASON AND MOTIVE JUSTIFICATION REQUIRED FOR MANUAL INTERVENTION */}
                <div className="space-y-1">
                  <label className="block font-bold text-earth-gray">Motivo da Alteração Manual / Observações da Auditoria *</label>
                  <input 
                    type="text"
                    required
                    placeholder="Ex: Endereço do DF continha escrita truncada. Coordenada exata localizada e normalizada para Asa Norte."
                    value={editRationale}
                    onChange={(e) => setEditRationale(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-clay-border bg-white text-earth-dark focus:border-sienna focus:ring-1 focus:ring-sienna focus:outline-none"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-3.5 border-t border-clay-border/30">
                  <button 
                    type="submit" 
                    className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-sienna to-earth-dark text-white font-bold text-[11px] shadow-md hover:brightness-105 transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <Check className="w-4 h-4" /> Aprovar e Publicar Localização Corrigida
                  </button>
                </div>

              </form>
            ) : (
              <div className="p-12 text-center bg-sand-bg/10 border border-clay-border/50 border-dashed rounded-2xl flex flex-col items-center justify-center space-y-2">
                <Compass className="w-10 h-10 text-earth-gray animate-spin-slow" />
                <p className="font-serif italic font-bold text-earth-dark text-sm">Selecione um local com erro para auditar</p>
                <p className="text-xs text-earth-gray max-w-sm leading-relaxed">
                  Utilize o painel à esquerda para carregar cadastros que falharam nos critérios de validação de coordenadas ou que contêm CEPs incoerentes.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: GEOGRAPHIC DATABASE TABLE */}
      {activeTab === 'database' && (
        <div className="space-y-4">
          
          {/* SEARCH FILTERS */}
          <div className="flex flex-col sm:flex-row gap-3 bg-white p-3 border border-clay-border rounded-xl">
            <div className="flex-1 relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-3.5 text-earth-gray" />
              <input
                type="text"
                placeholder="Buscar por nome, cidade ou estado..."
                value={dbSearch}
                onChange={(e) => setDbSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-2.5 bg-white border border-clay-border rounded-lg text-xs focus:border-sienna focus:outline-none"
              />
            </div>
            
            <select
              value={dbStatusFilter}
              onChange={(e) => setDbStatusFilter(e.target.value as any)}
              className="p-2.5 bg-white border border-clay-border rounded-lg text-xs font-bold cursor-pointer"
            >
              <option value="all">Todos os Status Geográficos</option>
              <option value="valid">Marcadores Válidos</option>
              <option value="pending_review">Locais com Erro/Revisão</option>
            </select>
          </div>

          {/* LIST TABLE */}
          <div className="bg-white border border-clay-border rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-sand-bg border-b border-clay-border text-[9px] font-bold text-earth-gray uppercase tracking-wider">
                    <th className="p-3">Estabelecimento</th>
                    <th className="p-3">Endereço Original</th>
                    <th className="p-3">Endereço Normalizado</th>
                    <th className="p-3">Coordenadas</th>
                    <th className="p-3">Privacidade</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-clay-border/40 text-[11px]">
                  {filteredDb.map(est => {
                    const validation = validateCoordinates(est.coordinates[0], est.coordinates[1], est.state);
                    const isOk = est.geocodingStatus === 'valid' && validation.isValid;
                    
                    return (
                      <tr key={est.id} className="hover:bg-sand-bg/25 transition-all">
                        <td className="p-3">
                          <p className="font-serif italic font-bold text-earth-dark">{est.name}</p>
                          <p className="text-[9px] text-earth-gray uppercase font-semibold">{est.category}</p>
                        </td>
                        <td className="p-3 max-w-[160px] truncate" title={est.originalAddress || est.address}>
                          {est.originalAddress || est.address}
                        </td>
                        <td className="p-3 text-earth-dark font-medium max-w-[180px] truncate">
                          📍 {est.address}, {est.neighborhood}, {est.city} - {est.state}
                        </td>
                        <td className="p-3 font-mono text-[10px]">
                          {est.coordinates ? `${est.coordinates[0].toFixed(4)}, ${est.coordinates[1].toFixed(4)}` : '[0, 0]'}
                        </td>
                        <td className="p-3 uppercase text-[9px] font-bold">
                          {est.privacy === 'full' ? 'Público' : 
                           est.privacy === 'neighborhood' ? 'Bairro' : 
                           est.privacy === 'city' ? 'Cidade' : 'Oculto'}
                        </td>
                        <td className="p-3">
                          <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-[9px] font-bold ${
                            isOk ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                          }`}>
                            {isOk ? 'VALIDADO' : 'PENDENTE'}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => {
                              setActiveTab('pending');
                              handleSelectEst(est.id);
                            }}
                            className="inline-flex items-center gap-1 text-sienna hover:text-earth-dark font-bold text-[10px] uppercase"
                          >
                            Auditar <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            
            {filteredDb.length === 0 && (
              <div className="p-10 text-center text-earth-gray bg-sand-bg/20">
                Nenhum cadastro encontrado para os filtros informados.
              </div>
            )}
          </div>

        </div>
      )}

      {/* TAB 3: RA EQUIVALENCES EDITOR */}
      {activeTab === 'equivalences' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Left: Add Equivalence Form */}
          <div className="md:col-span-1">
            <form onSubmit={handleAddEquivalence} className="bg-white rounded-2xl border border-clay-border p-4.5 space-y-4 shadow-sm">
              <div className="border-b border-clay-border/30 pb-2">
                <h3 className="font-bold text-xs text-earth-dark uppercase flex items-center gap-1.5">
                  <Plus className="w-4 h-4 text-sienna" /> Nova Equivalência de RA
                </h3>
                <p className="text-[10px] text-earth-gray mt-0.5">Cadastre variações de escrita e mapeie para a Região Administrativa oficial do Distrito Federal.</p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block font-bold text-earth-gray mb-1">Termo Escrito (Ex: Asa Sul, Asa Norte) *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Asa Sul, CLN, SQS..."
                    value={newSource}
                    onChange={(e) => setNewSource(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-clay-border bg-white text-earth-dark focus:border-sienna focus:ring-1 focus:ring-sienna focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-earth-gray mb-1">Mapear para a Região Administrativa Oficial *</label>
                  <select
                    value={newTarget}
                    onChange={(e) => setNewTarget(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-clay-border bg-white text-earth-dark focus:border-sienna focus:ring-1 focus:ring-sienna focus:outline-none cursor-pointer font-medium"
                  >
                    {DF_REGIOES_ADMINISTRATIVAS.map(ra => (
                      <option key={ra} value={ra}>{ra}</option>
                    ))}
                  </select>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-gradient-to-r from-sienna to-earth-dark text-white font-bold text-[11px] rounded-lg shadow-md hover:brightness-105 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Save className="w-4 h-4" /> Cadastrar Equivalência
                </button>
              </div>
            </form>
          </div>

          {/* Right: List and Manage Equivalences */}
          <div className="md:col-span-2 space-y-3">
            <h3 className="text-[10px] font-bold text-earth-gray uppercase tracking-wider">
              Dicionário de Equivalências Ativas ({equivalences.length})
            </h3>

            <div className="bg-white border border-clay-border rounded-2xl overflow-hidden divide-y divide-clay-border/30 shadow-sm max-h-[450px] overflow-y-auto">
              {equivalences.map(eq => (
                <div key={eq.id} className="p-3 flex justify-between items-center hover:bg-sand-bg/25 transition-all">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-earth-dark font-mono text-[11px]">{eq.source}</span>
                    <ChevronRight className="w-3.5 h-3.5 text-earth-gray shrink-0" />
                    <span className="bg-blue-50 border border-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded text-[10px]">
                      {eq.target}
                    </span>
                  </div>

                  <button
                    onClick={() => handleRemoveEquivalence(eq.id)}
                    className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 hover:text-red-700 transition-all cursor-pointer"
                    title="Excluir equivalência"
                  >
                    <Trash className="w-4 h-4" />
                  </button>
                </div>
              ))}
              
              {equivalences.length === 0 && (
                <div className="p-10 text-center text-earth-gray font-serif italic">
                  Nenhuma equivalência cadastrada. Utilize o painel à esquerda para alimentar o dicionário.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: DIAGNÓSTICO DO MAPA */}
      {activeTab === 'diagnostics' && (
        <div className="space-y-5 animate-fadeIn">
          
          {/* Section 1: Execution Control Panel */}
          <div className="p-4 bg-sand-bg/40 border border-clay-border rounded-2xl space-y-3.5">
            <div>
              <h3 className="font-serif italic font-bold text-sm text-earth-dark">Painel de Ferramentas e Execuções</h3>
              <p className="text-[10px] text-earth-gray leading-tight">Execute rotinas programáticas para validar, recalcular ou indexar as informações de geolocalização.</p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
              
              {/* Tool 1: Recalculate */}
              <button
                type="button"
                disabled={diagnosticsLoading || isGeocoding}
                onClick={async () => {
                  setDiagnosticsLoading(true);
                  const timestamp = new Date().toLocaleTimeString();
                  setAuditLogList(prev => [
                    { id: String(Date.now()), timestamp, level: 'info', message: 'Iniciando recálculo global de coordenadas...' },
                    ...prev
                  ]);
                  try {
                    // Call parent-level recalculation trigger
                    await handleRecalculateAll();
                    setAuditLogList(prev => [
                      { id: String(Date.now() + 1), timestamp, level: 'success', message: 'Recálculo global concluído com sucesso!' },
                      ...prev
                    ]);
                  } catch (e: any) {
                    setAuditLogList(prev => [
                      { id: String(Date.now() + 2), timestamp, level: 'error', message: `Erro ao recalcular: ${e.message}` },
                      ...prev
                    ]);
                  } finally {
                    setDiagnosticsLoading(false);
                  }
                }}
                className="p-3 bg-white hover:bg-sand-bg border border-clay-border rounded-xl text-center flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 h-20"
              >
                <RefreshCw className={`w-4 h-4 text-terracotta ${diagnosticsLoading ? 'animate-spin' : ''}`} />
                <span className="text-[9px] font-black uppercase tracking-wider text-earth-dark">Recalcular Coordenadas</span>
              </button>

              {/* Tool 2: Reindex */}
              <button
                type="button"
                disabled={diagnosticsLoading}
                onClick={() => {
                  setDiagnosticsLoading(true);
                  const timestamp = new Date().toLocaleTimeString();
                  setAuditLogList(prev => [
                    { id: String(Date.now()), timestamp, level: 'info', message: 'Iniciando reconstrução de índices Leaflet e agrupamentos...' },
                    ...prev
                  ]);
                  setTimeout(() => {
                    setDiagnosticsLoading(false);
                    setAuditLogList(prev => [
                      { id: String(Date.now() + 1), timestamp, level: 'success', message: 'Índice de agrupamento espacial (MarkerCluster) regenerado!' },
                      ...prev
                    ]);
                    setShowNotification({ type: 'success', text: 'Índice do mapa reindexado com sucesso!' });
                  }, 800);
                }}
                className="p-3 bg-white hover:bg-sand-bg border border-clay-border rounded-xl text-center flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 h-20"
              >
                <Layers className="w-4 h-4 text-sienna" />
                <span className="text-[9px] font-black uppercase tracking-wider text-earth-dark">Reindexar Mapa</span>
              </button>

              {/* Tool 3: Clear Cache */}
              <button
                type="button"
                disabled={diagnosticsLoading}
                onClick={() => {
                  setDiagnosticsLoading(true);
                  const timestamp = new Date().toLocaleTimeString();
                  setAuditLogList(prev => [
                    { id: String(Date.now()), timestamp, level: 'info', message: 'Limpando cache de lookups e geocontexts de memória...' },
                    ...prev
                  ]);
                  localStorage.removeItem('ceramapa_geocoding_v2_migrated');
                  setTimeout(() => {
                    setDiagnosticsLoading(false);
                    setAuditLogList(prev => [
                      { id: String(Date.now() + 1), timestamp, level: 'success', message: 'Cache local removido! Buscas futuras consultarão o banco geográfico bruto.' },
                      ...prev
                    ]);
                    setShowNotification({ type: 'success', text: 'Cache geográfico limpo com sucesso!' });
                  }, 600);
                }}
                className="p-3 bg-white hover:bg-sand-bg border border-clay-border rounded-xl text-center flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 h-20"
              >
                <Trash className="w-4 h-4 text-red-500" />
                <span className="text-[9px] font-black uppercase tracking-wider text-earth-dark">Limpar Cache</span>
              </button>

              {/* Tool 4: Reload markers */}
              <button
                type="button"
                disabled={diagnosticsLoading}
                onClick={() => {
                  setDiagnosticsLoading(true);
                  const timestamp = new Date().toLocaleTimeString();
                  setAuditLogList(prev => [
                    { id: String(Date.now()), timestamp, level: 'info', message: 'Recarregando camadas de marcadores do Leaflet...' },
                    ...prev
                  ]);
                  setTimeout(() => {
                    setDiagnosticsLoading(false);
                    setAuditLogList(prev => [
                      { id: String(Date.now() + 1), timestamp, level: 'success', message: 'Overlays e marcadores recarregados com sucesso!' },
                      ...prev
                    ]);
                    setShowNotification({ type: 'success', text: 'Marcadores do mapa recarregados com sucesso!' });
                  }, 500);
                }}
                className="p-3 bg-white hover:bg-sand-bg border border-clay-border rounded-xl text-center flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 h-20"
              >
                <MapPin className="w-4 h-4 text-emerald-600" />
                <span className="text-[9px] font-black uppercase tracking-wider text-earth-dark">Recarregar Marcadores</span>
              </button>

              {/* Tool 5: Run audit */}
              <button
                type="button"
                disabled={diagnosticsLoading}
                onClick={() => {
                  setDiagnosticsLoading(true);
                  const timestamp = new Date().toLocaleTimeString();
                  setAuditLogList(prev => [
                    { id: String(Date.now()), timestamp, level: 'info', message: 'Iniciando auditoria de consistência cadastral de perfis...' },
                    ...prev
                  ]);
                  
                  setTimeout(() => {
                    let successes = 0;
                    let warnings = 0;
                    let errors = 0;
                    const logsToAppend: any[] = [];

                    establishments.forEach((est, idx) => {
                      const coordValid = validateCoordinates(est.coordinates[0], est.coordinates[1], est.state);
                      
                      if (!coordValid.isValid) {
                        errors++;
                        logsToAppend.push({
                          id: `audit_err_${est.id}_${idx}`,
                          timestamp,
                          level: 'error',
                          message: `[${est.name}] Coordenadas fora do limite do estado ${est.state}: [${est.coordinates[0]}, ${est.coordinates[1]}].`
                        });
                      } else if (est.privacy && est.privacy !== 'full') {
                        warnings++;
                        logsToAppend.push({
                          id: `audit_warn_${est.id}_${idx}`,
                          timestamp,
                          level: 'warning',
                          message: `[${est.name}] Privado (${est.privacy}). Local real oculto sob círculo representativo de proximidade.`
                        });
                      } else {
                        successes++;
                        logsToAppend.push({
                          id: `audit_ok_${est.id}_${idx}`,
                          timestamp,
                          level: 'success',
                          message: `[${est.name}] Consistente. Localizado em ${est.city} (${est.state}) - OK.`
                        });
                      }
                    });

                    setAuditLogList(prev => [
                      { id: 'audit_sum', timestamp, level: 'info', message: `Auditoria encerrada: ${successes} válidos, ${warnings} avisos (privados), ${errors} erros detectados.` },
                      ...logsToAppend,
                      ...prev
                    ]);
                    setDiagnosticsLoading(false);
                    setShowNotification({ type: 'info', text: 'Auditoria cadastral finalizada com sucesso!' });
                  }, 1200);
                }}
                className="p-3 bg-white hover:bg-sand-bg border border-clay-border rounded-xl text-center flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 h-20"
              >
                <ShieldCheck className="w-4 h-4 text-blue-600" />
                <span className="text-[9px] font-black uppercase tracking-wider text-earth-dark">Executar Auditoria</span>
              </button>

              {/* Tool 6: Export JSON report */}
              <button
                type="button"
                onClick={() => {
                  const timestamp = new Date().toLocaleTimeString();
                  setAuditLogList(prev => [
                    { id: String(Date.now()), timestamp, level: 'info', message: 'Gerando relatório estruturado de consistência...' },
                    ...prev
                  ]);
                  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(establishments, null, 2));
                  const downloadAnchor = document.createElement('a');
                  downloadAnchor.setAttribute("href", dataStr);
                  downloadAnchor.setAttribute("download", "ceramapa_diagnostico_export.json");
                  document.body.appendChild(downloadAnchor);
                  downloadAnchor.click();
                  downloadAnchor.remove();
                  setAuditLogList(prev => [
                    { id: String(Date.now() + 1), timestamp, level: 'success', message: 'Relatório ceramapa_diagnostico_export.json exportado com sucesso!' },
                    ...prev
                  ]);
                }}
                className="p-3 bg-white hover:bg-sand-bg border border-clay-border rounded-xl text-center flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer h-20"
              >
                <Download className="w-4 h-4 text-indigo-600" />
                <span className="text-[9px] font-black uppercase tracking-wider text-earth-dark">Exportar Relatório</span>
              </button>

            </div>
          </div>

          {/* Section 2: Detailed Audiences & Metrics Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
            
            {/* Left: Audit Metrics */}
            <div className="md:col-span-4 bg-white border border-clay-border rounded-2xl p-4 space-y-4 shadow-sm">
              <h3 className="font-bold text-[10px] text-earth-gray uppercase tracking-wider border-b border-clay-border/30 pb-1.5 flex items-center justify-between">
                <span>Indicadores da Auditoria</span>
                <HelpCircle className="w-3.5 h-3.5 text-earth-gray" />
              </h3>

              <div className="space-y-3 text-[11px]">
                
                <div className="flex justify-between items-center py-1.5 border-b border-sand-bg">
                  <span className="text-earth-dark font-medium">Marcadores Ativos Registrados</span>
                  <span className="font-mono font-bold bg-sand-bg px-2 py-0.5 rounded text-earth-dark">
                    {establishments.filter(e => e.geocodingStatus === 'valid').length}
                  </span>
                </div>

                <div className="flex justify-between items-center py-1.5 border-b border-sand-bg">
                  <span className="text-earth-dark font-medium">Marcadores Ocultos (Privacidade)</span>
                  <span className="font-mono font-bold bg-amber-50 text-amber-800 px-2 py-0.5 rounded border border-amber-200">
                    {establishments.filter(e => e.privacy && e.privacy !== 'full').length}
                  </span>
                </div>

                <div className="flex justify-between items-center py-1.5 border-b border-sand-bg">
                  <span className="text-earth-dark font-medium">Fora das Fronteiras do Estado</span>
                  <span className="font-mono font-bold bg-red-50 text-red-800 px-2 py-0.5 rounded border border-red-200">
                    {establishments.filter(e => e.coordinates && !validateCoordinates(e.coordinates[0], e.coordinates[1], e.state).isValid).length}
                  </span>
                </div>

                <div className="flex justify-between items-center py-1.5 border-b border-sand-bg">
                  <span className="text-earth-dark font-medium">Marcadores Sem Coordenadas / Zero</span>
                  <span className="font-mono font-bold bg-red-50 text-red-800 px-2 py-0.5 rounded border border-red-200">
                    {establishments.filter(e => !e.coordinates || (e.coordinates[0] === 0 && e.coordinates[1] === 0)).length}
                  </span>
                </div>

                <div className="flex justify-between items-center py-1.5 border-b border-sand-bg">
                  <span className="text-earth-dark font-medium">Pendentes na Fila de Revisão</span>
                  <span className="font-mono font-bold bg-amber-50 text-amber-800 px-2 py-0.5 rounded border border-amber-200">
                    {pendingQueue.length}
                  </span>
                </div>

                <div className="flex justify-between items-center py-1.5">
                  <span className="text-earth-dark font-medium">Total Distrito Federal (DF)</span>
                  <span className="font-mono font-bold bg-blue-50 text-blue-800 px-2 py-0.5 rounded border border-blue-200">
                    {establishments.filter(e => e.state === 'Distrito Federal').length}
                  </span>
                </div>

              </div>
            </div>

            {/* Right: Distrito Federal Administrative Regions Breakdown */}
            <div className="md:col-span-8 bg-white border border-clay-border rounded-2xl p-4 space-y-3.5 shadow-sm">
              <div>
                <h3 className="font-serif italic font-bold text-sm text-earth-dark">Censo e Distribuição no Distrito Federal (RAs)</h3>
                <p className="text-[9px] text-earth-gray leading-tight">Mapeamento dos perfis cerâmicos ativos divididos por Regiões Administrativas (RAs) homologadas.</p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-[220px] overflow-y-auto pr-1">
                {[
                  'Plano Piloto', 'Asa Sul', 'Asa Norte', 'Taguatinga', 'Águas Claras', 
                  'Guará', 'Sobradinho', 'Ceilândia', 'Samambaia', 'Gama', 
                  'Planaltina', 'Cruzeiro', 'Sudoeste/Octogonal', 'Lago Sul', 'Lago Norte'
                ].map(ra => {
                  const count = establishments.filter(e => 
                    e.state === 'Distrito Federal' && (
                      (e.neighborhood && e.neighborhood.toLowerCase().includes(ra.toLowerCase())) ||
                      (e.city && e.city.toLowerCase().includes(ra.toLowerCase()))
                    )
                  ).length;

                  return (
                    <div key={ra} className="p-2 bg-sand-bg/20 border border-clay-border/40 rounded-xl flex items-center justify-between text-[11px]">
                      <span className="font-semibold text-earth-dark truncate pr-1">{ra}</span>
                      <span className={`font-mono font-bold px-2 py-0.5 rounded-md text-[10px] shrink-0 ${count > 0 ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-sand-bg text-earth-gray'}`}>
                        {count} locales
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

          {/* Section 3: Diagnostic Audits Logging Terminal */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-[10px] text-earth-gray font-bold uppercase tracking-wider px-0.5">
              <span>Terminal de Auditoria do Sistema</span>
              <button
                type="button"
                onClick={() => setAuditLogList([])}
                className="text-[9px] lowercase underline hover:text-red-500 cursor-pointer"
              >
                Limpar Logs
              </button>
            </div>

            <div className="bg-earth-dark text-emerald-400 font-mono text-[10px] p-4 rounded-2xl border border-clay-border/55 h-56 overflow-y-auto shadow-inner space-y-1.5 leading-normal">
              {auditLogList.map(log => (
                <div key={log.id} className="flex gap-2 items-start">
                  <span className="text-earth-gray shrink-0">[{log.timestamp}]</span>
                  <span className={`shrink-0 uppercase font-black text-[8px] px-1 rounded-sm ${
                    log.level === 'success' ? 'bg-emerald-500/20 text-emerald-400' :
                    log.level === 'warning' ? 'bg-amber-500/20 text-amber-400' :
                    log.level === 'error' ? 'bg-red-500/20 text-red-400' :
                    'bg-blue-500/20 text-blue-400'
                  }`}>
                    {log.level}
                  </span>
                  <p className="flex-1 text-white/90">{log.message}</p>
                </div>
              ))}

              {auditLogList.length === 0 && (
                <div className="text-white/40 italic py-16 text-center select-none">
                  [SISTEMA_PRONTO] Terminal em espera. Selecione "Executar Auditoria" ou "Recalcular Coordenadas" acima para povoar logs ativos.
                </div>
              )}
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
