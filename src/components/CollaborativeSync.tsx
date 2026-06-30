import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FileSpreadsheet, RefreshCw, Plus, Check, AlertTriangle, Play, CheckCircle, 
  Trash2, Layers, Search, History, HelpCircle 
} from 'lucide-react';
import { SyncRow, SyncLog, Category, Specialty } from '../types';
import { CATEGORIES, SPECIALTIES } from '../data';

interface CollaborativeSyncProps {
  sheetRows: SyncRow[];
  syncLogs: SyncLog[];
  onAddFormSubmission: (submission: Omit<SyncRow, 'id' | 'timestamp' | 'status'>) => void;
  onSyncRows: () => void;
  onMergeRow: (rowId: string) => void;
  onDeleteRow: (rowId: string) => void;
  autoSync: boolean;
  setAutoSync: (val: boolean) => void;
  syncInterval: number;
  setSyncInterval: (val: number) => void;
}

export default function CollaborativeSync({
  sheetRows,
  syncLogs,
  onAddFormSubmission,
  onSyncRows,
  onMergeRow,
  onDeleteRow,
  autoSync,
  setAutoSync,
  syncInterval,
  setSyncInterval
}: CollaborativeSyncProps) {
  const [activeSubTab, setActiveSubTab] = useState<'planilha' | 'form' | 'logs'>('planilha');
  const [isSyncing, setIsSyncing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Google Forms Mock State
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState<Category>('Ateliê');
  const [formState, setFormState] = useState('SP');
  const [formCity, setFormCity] = useState('');
  const [formNeighborhood, setFormNeighborhood] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formContact, setFormContact] = useState('');
  const [formSpecialties, setFormSpecialties] = useState<Specialty[]>([]);
  const [formSuccess, setFormSuccess] = useState(false);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formCity.trim() || !formContact.trim()) return;

    onAddFormSubmission({
      name: formName,
      category: formCategory,
      state: formState.toUpperCase(),
      city: formCity,
      address: formAddress,
      neighborhood: formNeighborhood,
      contact: formContact,
      specialties: formSpecialties.join(', '),
    });

    setFormSuccess(true);
    setTimeout(() => {
      setFormSuccess(false);
      setFormName('');
      setFormCategory('Ateliê');
      setFormState('SP');
      setFormCity('');
      setFormNeighborhood('');
      setFormAddress('');
      setFormContact('');
      setFormSpecialties([]);
    }, 2500);
  };

  const handleSyncClick = () => {
    setIsSyncing(true);
    setTimeout(() => {
      onSyncRows();
      setIsSyncing(false);
    }, 1800); // Elegant loader duration
  };

  const toggleFormSpecialty = (spec: Specialty) => {
    setFormSpecialties((prev) =>
      prev.includes(spec) ? prev.filter((s) => s !== spec) : [...prev, spec]
    );
  };

  const filteredRows = sheetRows.filter((row) => {
    const q = searchQuery.toLowerCase();
    return (
      row.name.toLowerCase().includes(q) ||
      row.city.toLowerCase().includes(q) ||
      row.category.toLowerCase().includes(q) ||
      row.specialties.toLowerCase().includes(q)
    );
  });

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-6 font-sans">
      
      {/* 1. Header with Title & Stats */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600">
              <FileSpreadsheet className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-xl font-serif italic font-bold text-earth-dark tracking-tight">Sincronizador Colaborativo</h2>
              <p className="text-xs text-earth-gray">Banco de Dados Sincronizado com Google Sheets & Forms</p>
            </div>
          </div>
        </div>

        {/* Action Button & Navigation */}
        <div className="flex flex-wrap gap-2 shrink-0">
          <button 
            id="sub-tab-planilha-btn"
            onClick={() => setActiveSubTab('planilha')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
              activeSubTab === 'planilha' 
                ? 'bg-gray-100 text-gray-800' 
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            Planilha ({sheetRows.length})
          </button>
          <button 
            id="sub-tab-form-btn"
            onClick={() => setActiveSubTab('form')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
              activeSubTab === 'form' 
                ? 'bg-gray-100 text-gray-800' 
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            Ficha de Indicação (Forms)
          </button>
          <button 
            id="sub-tab-logs-btn"
            onClick={() => setActiveSubTab('logs')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
              activeSubTab === 'logs' 
                ? 'bg-gray-100 text-gray-800' 
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            Histórico de Sincronia
          </button>
        </div>
      </div>

      {/* 2. Subtab Contents */}

      {/* SUBTAB 2A: SPREADSHEET */}
      {activeSubTab === 'planilha' && (
        <div className="space-y-4 animate-fadeIn">
          
          {/* Synchronizer Controls */}
          <div className="space-y-3">
            <div className="p-4 bg-[#FAF9F5] border border-gray-100 rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wide flex items-center gap-1.5">
                  🔌 Link Ativo Google Sheets
                </h4>
                <p className="text-[11px] text-gray-500 font-mono select-all">
                  https://docs.google.com/spreadsheets/d/1mUr3cwLDMe5DIufp2n5zH8S3955Z58A6lJqq1o0ULYs/edit?usp=sharing
                </p>
              </div>
              
              <div className="flex gap-2 w-full md:w-auto">
                <div className="relative flex-1 md:w-64">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                  <input 
                    type="text"
                    placeholder="Filtrar planilha..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-clay-border bg-white text-xs focus:outline-none focus:border-terracotta focus:ring-1 focus:ring-terracotta"
                  />
                </div>

                <button
                  id="sync-sheets-now-btn"
                  onClick={handleSyncClick}
                  disabled={isSyncing}
                  className="flex items-center justify-center gap-1.5 px-4 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:bg-emerald-300 text-xs font-bold shadow-sm transition-all cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                  {isSyncing ? 'Buscando...' : 'Puxar Dados'}
                </button>
              </div>
            </div>

            {/* Auto-Sync Configuration Panel */}
            <div className="p-4 bg-emerald-50/40 border border-emerald-100 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex items-center gap-3">
                <span className="relative flex h-3 w-3">
                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${autoSync ? 'bg-emerald-400' : 'bg-gray-400'}`}></span>
                  <span className={`relative inline-flex rounded-full h-3 w-3 ${autoSync ? 'bg-emerald-500' : 'bg-gray-500'}`}></span>
                </span>
                <div>
                  <h5 className="text-xs font-bold text-emerald-900 uppercase tracking-wider">Sincronização em Tempo Real (Cron Automático)</h5>
                  <p className="text-[11px] text-emerald-700">Verifica o Google Forms e Sheets em background e atualiza o mapa nacional sem intervenção humana.</p>
                </div>
              </div>

              <div className="flex items-center gap-4 text-xs font-sans">
                <label className="flex items-center gap-2 cursor-pointer font-semibold text-emerald-800">
                  <input 
                    type="checkbox" 
                    checked={autoSync}
                    onChange={(e) => setAutoSync(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                  />
                  Cron Habilitado
                </label>

                <div className="flex items-center gap-1.5">
                  <span className="text-emerald-800 font-semibold">Intervalo:</span>
                  <select
                    value={syncInterval}
                    onChange={(e) => setSyncInterval(Number(e.target.value))}
                    className="p-1 rounded-md border border-emerald-200 bg-white text-xs font-bold text-emerald-800 focus:outline-none"
                  >
                    <option value={5}>5 seg</option>
                    <option value={10}>10 seg</option>
                    <option value={30}>30 seg</option>
                    <option value={60}>1 min</option>
                    <option value={300}>5 min</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Sync warning alerts for duplicates */}
          {sheetRows.some(r => r.status === 'duplicate') && (
            <div className="p-3 bg-amber-50 border border-amber-200/60 rounded-xl flex items-start gap-2.5 text-xs text-amber-800">
              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <strong>Atenção:</strong> Identificamos registros duplicados ou já existentes no banco de dados. Eles estão marcados em amarelo e devem ser descartados ou revisados para evitar poluição do mapa.
              </div>
            </div>
          )}

          {/* Spreadsheet Table */}
          <div className="border border-gray-150 rounded-xl overflow-hidden bg-white shadow-sm overflow-x-auto max-h-96">
            <table className="w-full text-left border-collapse text-xs font-sans">
              <thead>
                <tr className="bg-gray-50 text-gray-500 border-b border-gray-150 uppercase tracking-wider text-[10px] font-semibold">
                  <th className="py-2.5 px-3">Timestamp</th>
                  <th className="py-2.5 px-3">Nome Indicado</th>
                  <th className="py-2.5 px-3">Categoria</th>
                  <th className="py-2.5 px-3">Local (Cidade/UF)</th>
                  <th className="py-2.5 px-3">Especialidades</th>
                  <th className="py-2.5 px-3">Contato</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                  <th className="py-2.5 px-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredRows.length > 0 ? (
                  filteredRows.map((row) => (
                    <tr 
                      key={row.id}
                      className={`hover:bg-gray-50/50 transition-all ${
                        row.status === 'duplicate' 
                          ? 'bg-amber-50/40 hover:bg-amber-50/60' 
                          : row.status === 'synced' 
                          ? 'bg-emerald-50/20 text-gray-400' 
                          : ''
                      }`}
                    >
                      <td className="py-3 px-3 text-gray-400 whitespace-nowrap">{row.timestamp}</td>
                      <td className="py-3 px-3 font-semibold text-gray-800">{row.name}</td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-600 text-[10px]">
                          {row.category}
                        </span>
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        {row.city} - {row.state}
                      </td>
                      <td className="py-3 px-3 max-w-xs truncate" title={row.specialties}>
                        {row.specialties}
                      </td>
                      <td className="py-3 px-3 text-terracotta font-mono">{row.contact}</td>
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        {row.status === 'pending' && (
                          <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[9px] font-bold border border-blue-100">
                            Pendente
                          </span>
                        )}
                        {row.status === 'duplicate' && (
                          <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 text-[9px] font-bold border border-amber-200">
                            Duplicado
                          </span>
                        )}
                        {row.status === 'synced' && (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[9px] font-bold border border-emerald-100">
                            Integrado
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right space-x-1 whitespace-nowrap">
                        {row.status !== 'synced' && (
                          <>
                            <button
                              id={`merge-row-btn-${row.id}`}
                              onClick={() => onMergeRow(row.id)}
                              className="px-2 py-1 rounded bg-emerald-500 hover:bg-emerald-600 text-white text-[11px] font-bold cursor-pointer"
                              title="Aprovar e Integrar ao CeraMapa"
                            >
                              Integrar
                            </button>
                            <button
                              id={`delete-row-btn-${row.id}`}
                              onClick={() => onDeleteRow(row.id)}
                              className="px-2 py-1 rounded border border-gray-200 hover:border-red-400 text-gray-500 hover:text-red-500 text-[11px] font-medium cursor-pointer"
                              title="Descartar Linha"
                            >
                              Descartar
                            </button>
                          </>
                        )}
                        {row.status === 'synced' && (
                          <span className="text-emerald-500 font-bold inline-flex items-center gap-0.5 text-[11px]">
                            <CheckCircle className="w-3.5 h-3.5" /> Ok
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-gray-400">
                      Nenhum registro pendente de sincronização encontrado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUBTAB 2B: COLLABORATIVE INDICATION FORM */}
      {activeSubTab === 'form' && (
        <div className="max-w-2xl mx-auto space-y-4 animate-fadeIn">
          <div className="p-4 bg-sand-card/40 border border-sand-border rounded-xl text-xs text-earth-dark flex items-start gap-3">
            <span className="p-1 rounded-lg bg-white shadow-sm text-terracotta">
              <HelpCircle className="w-4 h-4" />
            </span>
            <div>
              <h4 className="font-bold text-earth-dark mb-0.5">Fluxo de Cadastro Colaborativo (Simulador)</h4>
              <p className="leading-relaxed text-gray-600">
                Este formulário simula o preenchimento que a comunidade faz via Google Forms. Ao enviar, os dados cairão instantaneamente na planilha acima como pendentes, prontos para serem revisados e integrados ao mapa pelos administradores.
              </p>
            </div>
          </div>

          {formSuccess ? (
            <div className="py-12 bg-emerald-50 rounded-2xl border border-emerald-100 text-center space-y-3">
              <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center mx-auto border border-emerald-150 shadow-sm text-emerald-600">
                <Check className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-gray-900">Resposta Registrada no Google Sheets!</h3>
              <p className="text-xs text-gray-500">Volte para a aba "Planilha" para realizar a triagem e sincronia do novo ponto.</p>
            </div>
          ) : (
            <form onSubmit={handleFormSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-600 font-medium mb-1">Nome do Ateliê / Ceramista / Espaço *</label>
                  <input 
                    type="text" 
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-clay-border focus:outline-none focus:border-terracotta focus:ring-1 focus:ring-terracotta bg-white text-earth-dark placeholder-earth-gray" 
                    placeholder="Ex: Cerâmica do Sol Nascente"
                  />
                </div>
                <div>
                  <label className="block text-gray-600 font-medium mb-1">Categoria Principal *</label>
                  <select 
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as Category)}
                    className="w-full p-2.5 rounded-lg border border-clay-border focus:outline-none focus:border-terracotta focus:ring-1 focus:ring-terracotta bg-white text-earth-dark"
                  >
                    {CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-1">
                  <label className="block text-gray-600 font-medium mb-1">Estado (UF) *</label>
                  <input 
                    type="text" 
                    maxLength={2}
                    required
                    value={formState}
                    onChange={(e) => setFormState(e.target.value.toUpperCase())}
                    className="w-full p-2.5 rounded-lg border border-clay-border focus:outline-none focus:border-terracotta focus:ring-1 focus:ring-terracotta text-center uppercase bg-white text-earth-dark placeholder-earth-gray" 
                    placeholder="Ex: MG"
                  />
                </div>
                <div className="col-span-1">
                  <label className="block text-gray-600 font-medium mb-1">Cidade *</label>
                  <input 
                    type="text" 
                    required
                    value={formCity}
                    onChange={(e) => setFormCity(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-clay-border focus:outline-none focus:border-terracotta focus:ring-1 focus:ring-terracotta bg-white text-earth-dark placeholder-earth-gray" 
                    placeholder="Ex: São João del Rei"
                  />
                </div>
                <div className="col-span-1">
                  <label className="block text-gray-600 font-medium mb-1">Bairro *</label>
                  <input 
                    type="text" 
                    required
                    value={formNeighborhood}
                    onChange={(e) => setFormNeighborhood(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-clay-border focus:outline-none focus:border-terracotta focus:ring-1 focus:ring-terracotta bg-white text-earth-dark placeholder-earth-gray" 
                    placeholder="Ex: Centro"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-600 font-medium mb-1">Endereço Completo (Opcional, respeita privacidade)</label>
                <input 
                  type="text" 
                  value={formAddress}
                  onChange={(e) => setFormAddress(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-clay-border focus:outline-none focus:border-terracotta focus:ring-1 focus:ring-terracotta bg-white text-earth-dark placeholder-earth-gray" 
                  placeholder="Ex: Rua do Rosário, 142"
                />
              </div>

              <div>
                <label className="block text-gray-600 font-medium mb-1">Contato de Divulgação (Instagram @ ou WhatsApp) *</label>
                <input 
                  type="text" 
                  required
                  value={formContact}
                  onChange={(e) => setFormContact(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-clay-border focus:outline-none focus:border-terracotta focus:ring-1 focus:ring-terracotta bg-white text-earth-dark placeholder-earth-gray" 
                  placeholder="Ex: @ceramica_dosol ou 11999999999"
                />
              </div>

              {/* Specialties Checkbox Multi-selector */}
              <div>
                <label className="block text-gray-600 font-medium mb-1.5">Especialidades Atendidas *</label>
                <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-2 border border-gray-100 rounded-lg bg-gray-50/60">
                  {SPECIALTIES.map(spec => {
                    const active = formSpecialties.includes(spec);
                    return (
                      <button
                        key={spec}
                        type="button"
                        onClick={() => toggleFormSpecialty(spec)}
                        className={`px-2 py-1 rounded text-[10px] font-sans border transition-all cursor-pointer ${
                          active 
                            ? 'bg-terracotta border-terracotta text-white font-semibold' 
                            : 'bg-white hover:bg-gray-100 border-gray-200 text-gray-600'
                        }`}
                      >
                        {spec}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="pt-2">
                <button
                  id="submit-colab-form-btn"
                  type="submit"
                  className="w-full py-2.5 font-bold rounded-xl bg-gray-900 hover:bg-black text-white transition-all cursor-pointer shadow-md text-center"
                >
                  Registrar Resposta na Planilha Google Sheets
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* SUBTAB 2C: SYNC HISTORY LOGS */}
      {activeSubTab === 'logs' && (
        <div className="space-y-4 animate-fadeIn">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider font-sans mb-1">
            Logs de Sincronia do Banco de Dados Geral
          </h3>
          <div className="space-y-2.5">
            {syncLogs.map((log) => (
              <div key={log.id} className="p-3.5 border border-gray-100 rounded-xl bg-gray-50/50 flex justify-between items-start gap-4 text-xs font-sans">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 font-semibold text-gray-800">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    {log.action}
                  </div>
                  <p className="text-[11px] text-gray-400">
                    Operador: <span className="font-mono text-gray-600">{log.operator}</span> | ID: <span className="font-mono">{log.id}</span>
                  </p>
                </div>
                
                <div className="text-right whitespace-nowrap shrink-0">
                  <div className="font-mono text-[10px] text-gray-400">{log.timestamp}</div>
                  <div className="text-[10px] text-emerald-700 font-bold mt-1 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                    +{log.recordsSynced} sincronizados
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
