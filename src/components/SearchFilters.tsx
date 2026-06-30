import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, SlidersHorizontal, RotateCcw, ChevronDown, ChevronUp } from 'lucide-react';
import { Category, Specialty } from '../types';
import { CATEGORIES, SPECIALTIES } from '../data';

interface SearchFiltersProps {
  onFilterChange: (filters: FilterState) => void;
  availableStates: string[];
}

export interface FilterState {
  query: string;
  category: Category | '';
  state: string;
  specialties: Specialty[];
  services: string[];
  proximityCenter?: [number, number] | null;
  proximityRadius?: number | null;
  proximityLabel?: string;
}

const COMMON_SERVICES = [
  'Cursos Regulares',
  'Workshops',
  'Serviço de Queima',
  'Coworking',
  'Venda de Peças Autoriais',
  'Visita Agendada',
  'Residências Artísticas',
  'Assistência Técnica',
  'Fornos',
  'Argilas'
];

export default function SearchFilters({ onFilterChange, availableStates }: SearchFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<Category | ''>('');
  const [state, setState] = useState('');
  const [selectedSpecialties, setSelectedSpecialties] = useState<Specialty[]>([]);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);

  const handleApplyFilters = (updates: Partial<FilterState>) => {
    const nextFilters = {
      query: updates.query !== undefined ? updates.query : query,
      category: updates.category !== undefined ? updates.category : category,
      state: updates.state !== undefined ? updates.state : state,
      specialties: updates.specialties !== undefined ? updates.specialties : selectedSpecialties,
      services: updates.services !== undefined ? updates.services : selectedServices,
    };
    onFilterChange(nextFilters);
  };

  const handleReset = () => {
    setQuery('');
    setCategory('');
    setState('');
    setSelectedSpecialties([]);
    setSelectedServices([]);
    onFilterChange({
      query: '',
      category: '',
      state: '',
      specialties: [],
      services: []
    });
  };

  const toggleSpecialty = (spec: Specialty) => {
    const updated = selectedSpecialties.includes(spec)
      ? selectedSpecialties.filter((s) => s !== spec)
      : [...selectedSpecialties, spec];
    setSelectedSpecialties(updated);
    handleApplyFilters({ specialties: updated });
  };

  const toggleService = (srv: string) => {
    const updated = selectedServices.includes(srv)
      ? selectedServices.filter((s) => s !== srv)
      : [...selectedServices, srv];
    setSelectedServices(updated);
    handleApplyFilters({ services: updated });
  };

  return (
    <div className="bg-white rounded-2xl border border-clay-border shadow-sm p-4 w-full transition-all">
      {/* Primary Search Bar */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-earth-gray" />
          <input
            id="search-input"
            type="text"
            placeholder="Pesquise por nome, cidade, bairro, especialidade..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              handleApplyFilters({ query: e.target.value });
            }}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-clay-border focus:outline-none focus:border-terracotta focus:ring-1 focus:ring-terracotta text-sm font-sans placeholder-earth-gray bg-sand-bg focus:bg-white transition-all"
          />
        </div>

        <div className="flex gap-2">
          {/* Quick Category Selector */}
          <select
            id="category-select"
            value={category}
            onChange={(e) => {
              const cat = e.target.value as Category | '';
              setCategory(cat);
              handleApplyFilters({ category: cat });
            }}
            className="px-3.5 py-2.5 rounded-xl border border-clay-border focus:outline-none focus:border-terracotta focus:ring-1 focus:ring-terracotta text-xs font-sans font-medium bg-sand-bg cursor-pointer"
          >
            <option value="">Todas Categorias</option>
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          {/* Quick State Selector */}
          <select
            id="state-select"
            value={state}
            onChange={(e) => {
              setState(e.target.value);
              handleApplyFilters({ state: e.target.value });
            }}
            className="px-3.5 py-2.5 rounded-xl border border-clay-border focus:outline-none focus:border-terracotta focus:ring-1 focus:ring-terracotta text-xs font-sans font-medium bg-sand-bg cursor-pointer"
          >
            <option value="">UF (Todos)</option>
            {availableStates.map((st) => (
              <option key={st} value={st}>
                {st}
              </option>
            ))}
          </select>

          {/* Toggle Advanced Filters */}
          <button
            id="toggle-filters-btn"
            onClick={() => setIsExpanded(!isExpanded)}
            className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border text-xs font-sans font-medium transition-all cursor-pointer ${
              isExpanded
                ? 'bg-terracotta border-terracotta text-white'
                : 'bg-white border-clay-border text-earth-dark hover:border-sand-border hover:bg-sand-bg'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Filtros</span>
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Advanced Filters Panel */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="pt-4 mt-4 border-t border-clay-border grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Specialties Filters */}
              <div>
                <h4 className="text-[11px] font-bold text-[#A0522D] uppercase tracking-widest mb-2.5 font-sans">
                  Especialidades Cerâmicas
                </h4>
                <div className="flex flex-wrap gap-1.5 max-h-44 overflow-y-auto pr-1">
                  {SPECIALTIES.map((spec) => {
                    const active = selectedSpecialties.includes(spec);
                    return (
                      <button
                        key={spec}
                        id={`specialty-pill-${spec.replace(/\s+/g, '-')}`}
                        onClick={() => toggleSpecialty(spec)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-sans transition-all cursor-pointer border ${
                          active
                            ? 'bg-sand-card text-[#A0522D] border-sand-border font-bold'
                            : 'bg-sand-bg hover:bg-sand-card/60 text-earth-dark border-transparent'
                        }`}
                      >
                        {spec}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Services & Extra Features */}
              <div>
                <h4 className="text-[11px] font-bold text-[#A0522D] uppercase tracking-widest mb-2.5 font-sans">
                  Serviços Oferecidos
                </h4>
                <div className="flex flex-wrap gap-1.5 max-h-44 overflow-y-auto pr-1">
                  {COMMON_SERVICES.map((srv) => {
                    const active = selectedServices.includes(srv);
                    return (
                      <button
                        key={srv}
                        id={`service-pill-${srv.replace(/\s+/g, '-')}`}
                        onClick={() => toggleService(srv)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-sans transition-all cursor-pointer border ${
                          active
                            ? 'bg-sand-card text-[#A0522D] border-sand-border font-bold'
                            : 'bg-sand-bg hover:bg-sand-card/60 text-earth-dark border-transparent'
                        }`}
                      >
                        {srv}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Panel Footer Actions */}
            <div className="flex justify-end gap-2 mt-5 pt-3 border-t border-clay-border">
              <button
                id="reset-filters-btn"
                onClick={handleReset}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-earth-gray hover:text-terracotta font-sans transition-all font-medium cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Limpar Filtros
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Active filters count pill */}
      {(selectedSpecialties.length > 0 || selectedServices.length > 0) && (
        <div className="flex flex-wrap items-center gap-2 mt-3 pt-2.5 border-t border-clay-border text-xs">
          <span className="text-earth-gray font-sans">Filtros Ativos:</span>
          {selectedSpecialties.map((spec) => (
            <span
              key={spec}
              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-sand-card text-sienna border border-sand-border"
            >
              {spec}
              <button
                onClick={() => toggleSpecialty(spec)}
                className="font-bold hover:text-red-500 cursor-pointer ml-0.5"
              >
                ×
              </button>
            </span>
          ))}
          {selectedServices.map((srv) => (
            <span
              key={srv}
              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#E5D3B3]/40 text-sienna border border-sand-border"
            >
              {srv}
              <button
                onClick={() => toggleService(srv)}
                className="font-bold hover:text-red-500 cursor-pointer ml-0.5"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
