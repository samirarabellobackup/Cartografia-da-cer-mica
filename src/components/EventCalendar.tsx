import { useState } from 'react';
import { Calendar as CalendarIcon, MapPin, DollarSign, User, Link, Sparkles, Filter } from 'lucide-react';
import { CeramicEvent, Establishment } from '../types';

interface EventCalendarProps {
  establishments: Establishment[];
  onSelectEstablishment: (id: string) => void;
}

export default function EventCalendar({ establishments, onSelectEstablishment }: EventCalendarProps) {
  const [selectedType, setSelectedType] = useState<string>('todos');

  // Gather all events from establishments
  const allEvents: CeramicEvent[] = establishments.reduce((acc, est) => {
    if (est.events) {
      const formatted = est.events.map(ev => ({
        ...ev,
        establishmentId: est.id,
        location: est.name // use establishment name as hosting location
      }));
      return [...acc, ...formatted];
    }
    return acc;
  }, [] as CeramicEvent[]);

  const filteredEvents = selectedType === 'todos'
    ? allEvents
    : allEvents.filter(ev => ev.type === selectedType);

  const getTypeLabel = (type: string) => {
    const labels: { [key: string]: string } = {
      curso: 'Curso Regular',
      workshop: 'Workshop',
      feira: 'Feira / Bazar',
      exposicao: 'Exposição / Galeria',
      encontro: 'Encontro de Ceramistas',
      residencia: 'Residência Artística'
    };
    return labels[type] || type;
  };

  const getTypeBadgeClass = (type: string) => {
    const classes: { [key: string]: string } = {
      curso: 'bg-blue-50 text-blue-700 border-blue-100',
      workshop: 'bg-emerald-50 text-emerald-700 border-emerald-100',
      feira: 'bg-amber-50 text-amber-700 border-amber-200',
      exposicao: 'bg-purple-50 text-purple-700 border-purple-100',
      encontro: 'bg-rose-50 text-rose-700 border-rose-100',
      residencia: 'bg-teal-50 text-teal-700 border-teal-100'
    };
    return classes[type] || 'bg-gray-100 text-gray-700 border-gray-200';
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-6 font-sans">
      
      {/* 1. Header with Concept Description */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-sand-card border border-clay-border text-terracotta">
              <CalendarIcon className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-lg font-bold text-gray-900 tracking-tight">Agenda Nacional de Eventos</h2>
              <p className="text-xs text-gray-400">Cursos, Oficinas, Feiras de Cerâmica e Aberturas de Fornos no Brasil</p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 border border-dashed border-gray-200 px-3 py-1.5 rounded-xl text-xs text-gray-500 max-w-sm">
          <Sparkles className="w-4 h-4 text-terracotta shrink-0" />
          <span>Agenda comunitária: encontre queimas e exposições com queimas de lenha Noborigama e Raku ao vivo.</span>
        </div>
      </div>

      {/* 2. Categorical filters */}
      <div className="flex flex-wrap items-center gap-1.5 border-b border-gray-100 pb-4 text-xs">
        <span className="text-gray-400 font-medium mr-1.5 flex items-center gap-1">
          <Filter className="w-3.5 h-3.5" /> Filtrar Tipo:
        </span>
        <button
          onClick={() => setSelectedType('todos')}
          className={`px-3 py-1 rounded-lg font-medium transition-all cursor-pointer ${
            selectedType === 'todos' ? 'bg-terracotta text-white hover:bg-sienna' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Ver Todos ({allEvents.length})
        </button>
        <button
          onClick={() => setSelectedType('workshop')}
          className={`px-3 py-1 rounded-lg font-medium transition-all cursor-pointer ${
            selectedType === 'workshop' ? 'bg-terracotta text-white hover:bg-sienna' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Workshops
        </button>
        <button
          onClick={() => setSelectedType('curso')}
          className={`px-3 py-1 rounded-lg font-medium transition-all cursor-pointer ${
            selectedType === 'curso' ? 'bg-terracotta text-white hover:bg-sienna' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Cursos Regulares
        </button>
        <button
          onClick={() => setSelectedType('encontro')}
          className={`px-3 py-1 rounded-lg font-medium transition-all cursor-pointer ${
            selectedType === 'encontro' ? 'bg-terracotta text-white hover:bg-sienna' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Encontros / Fornadas
        </button>
      </div>

      {/* 3. Events Calendar Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredEvents.length > 0 ? (
          filteredEvents.map((ev) => (
            <div key={ev.id} className="p-4 border border-clay-border rounded-2xl bg-sand-card/30 hover:bg-white hover:shadow-md transition-all flex flex-col justify-between space-y-3.5 border-l-4 border-l-terracotta">
              
              <div className="space-y-2">
                <div className="flex justify-between items-start gap-2">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wide ${getTypeBadgeClass(ev.type)}`}>
                    {getTypeLabel(ev.type)}
                  </span>
                  
                  {ev.price && (
                    <span className="text-xs font-bold text-gray-800 bg-white px-2 py-0.5 rounded-lg shadow-sm border border-gray-100">
                      {ev.price}
                    </span>
                  )}
                </div>

                <h3 className="text-sm font-bold text-gray-900 leading-snug">{ev.title}</h3>
                <p className="text-xs text-gray-500 leading-relaxed font-sans">{ev.description}</p>
              </div>

              <div className="pt-3 border-t border-gray-100/60 grid grid-cols-2 gap-2 text-[11px] text-gray-500">
                <div className="flex items-center gap-1">
                  <CalendarIcon className="w-3.5 h-3.5 text-terracotta shrink-0" />
                  <span>{ev.date} {ev.time && `| ${ev.time}`}</span>
                </div>
                <div className="flex items-center gap-1 text-gray-700 font-semibold truncate">
                  <MapPin className="w-3.5 h-3.5 text-terracotta shrink-0" />
                  <span className="truncate">{ev.location}</span>
                </div>
              </div>

              <div className="flex gap-2 pt-1 text-xs">
                <button
                  id={`event-go-map-${ev.id}`}
                  onClick={() => onSelectEstablishment(ev.establishmentId)}
                  className="flex-1 py-1.5 rounded-xl border border-clay-border hover:border-terracotta hover:text-terracotta text-earth-dark font-semibold text-center bg-white transition-all cursor-pointer flex items-center justify-center gap-1 hover:shadow-sm"
                >
                  <MapPin className="w-3 h-3" /> Ver no Mapa
                </button>
              </div>

            </div>
          ))
        ) : (
          <div className="col-span-2 text-center py-12 text-gray-400 text-xs font-sans border border-dashed border-gray-100 rounded-2xl bg-gray-50">
            Nenhum evento desta categoria cadastrado no momento.
          </div>
        )}
      </div>

    </div>
  );
}
