import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { ChevronDown, ChevronUp, Layers } from 'lucide-react';
import { Establishment, PrivacyLevel } from '../types';

interface MapProps {
  establishments: Establishment[];
  selectedId: string | null;
  onSelectEstablishment: (id: string) => void;
  centerCoordinates?: [number, number];
  onMapClick?: (coords: [number, number]) => void;
}

// Custom colors by category
const getCategoryColor = (category: string) => {
  if (['Ateliê', 'Ateliê Escola'].includes(category)) return '#C06C4D'; // Terracota Natural
  if (['Ceramista', 'Professor'].includes(category)) return '#A0522D'; // Sienna Clay
  if (['Fornecedor', 'Fabricante', 'Loja', 'Importador'].includes(category)) return '#6B8E23'; // Olive Green
  if (['Assistência Técnica', 'Queima'].includes(category)) return '#333333'; // Earth Dark
  if (['Museu', 'Galeria', 'Coletivo', 'Associação', 'Universidade'].includes(category)) return '#4682B4'; // Steel Blue
  if (['Evento', 'Feira'].includes(category)) return '#DCD3C0'; // Sand Border Clay
  return '#8E8E8E'; // Earth Grey
};

// Generates dynamic SVG vector markers
const getCustomIcon = (category: string, isPremium: boolean) => {
  const color = getCategoryColor(category);
  const border = isPremium ? '#F59E0B' : '#FFFFFF'; // Golden border for Premium
  const borderWidth = isPremium ? '2.5' : '1.5';

  const svgIcon = `
    <svg width="32" height="42" viewBox="0 0 32 42" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0px 3px 4px rgba(0,0,0,0.3));">
      <path d="M16 0C7.16 0 0 7.16 0 16C0 28 16 42 16 42C16 42 32 28 32 16C32 7.16 24.84 0 16 0Z" fill="${color}" stroke="${border}" stroke-width="${borderWidth}"/>
      <circle cx="16" cy="16" r="6" fill="#FFFFFF"/>
      ${isPremium ? `<circle cx="16" cy="16" r="3" fill="#F59E0B"/>` : `<circle cx="16" cy="16" r="2.5" fill="${color}"/>`}
    </svg>
  `;

  return L.divIcon({
    html: svgIcon,
    className: 'custom-ceramapa-marker',
    iconSize: [32, 42],
    iconAnchor: [16, 42],
    popupAnchor: [0, -40],
  });
};

// Slightly offset coordinate for privacy
const getCoordinatedWithPrivacy = (coords: [number, number], privacy: PrivacyLevel, id: string): { latlng: [number, number]; radius: number } => {
  const lat = coords[0];
  const lng = coords[1];

  // Seeded deterministic offset based on ID so marker doesn't jump on every render
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  const offsetLat = ((hash % 100) / 10000) * (hash % 2 === 0 ? 1 : -1);
  const offsetLng = (((hash >> 4) % 100) / 10000) * (hash % 3 === 0 ? 1 : -1);

  if (privacy === 'neighborhood') {
    return {
      latlng: [lat + offsetLat * 0.4, lng + offsetLng * 0.4],
      radius: 400 // 400m
    };
  }
  if (privacy === 'city') {
    return {
      latlng: [lat + offsetLat * 1.5, lng + offsetLng * 1.5],
      radius: 3500 // 3.5km
    };
  }
  if (privacy === 'state') {
    return {
      latlng: [lat + offsetLat * 4.0, lng + offsetLng * 4.0],
      radius: 20000 // 20km
    };
  }

  return {
    latlng: [lat, lng],
    radius: 0
  };
};

export default function Map({ establishments, selectedId, onSelectEstablishment, centerCoordinates, onMapClick }: MapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<{ [key: string]: L.Marker }>({});
  const circlesRef = useRef<{ [key: string]: L.Circle }>({});
  const clusterMarkersRef = useRef<L.Marker[]>([]);
  const [currentZoom, setCurrentZoom] = useState(4);
  const [isLegendExpanded, setIsLegendExpanded] = useState(() => {
    try {
      return window.innerWidth > 768;
    } catch {
      return true;
    }
  });

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    // Center in Brazil [approximate center: -14.235, -51.9253]
    const defaultCenter: [number, number] = [-15.7938, -47.8828]; // Brasília
    const defaultZoom = 4;

    const map = L.map(mapContainerRef.current, {
      zoomControl: false,
      attributionControl: false,
    }).setView(defaultCenter, defaultZoom);

    // CartoDB Positron - elegant, minimalist, light grey map that matches art museums
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
    }).addTo(map);

    // Add clean zoom control on the bottom-right
    L.control.zoom({
      position: 'bottomright',
    }).addTo(map);

    // Add minimal attribution
    L.control.attribution({
      position: 'bottomleft',
      prefix: 'CeraMapa Brasil'
    }).addTo(map);

    mapRef.current = map;
    setCurrentZoom(map.getZoom());

    map.on('zoomend', () => {
      setCurrentZoom(map.getZoom());
    });

    map.on('click', (e: L.LeafletMouseEvent) => {
      onMapClick?.([e.latlng.lat, e.latlng.lng]);
    });

    // Handle container resizing
    const resizeObserver = new ResizeObserver(() => {
      map.invalidateSize();
    });
    resizeObserver.observe(mapContainerRef.current);

    return () => {
      resizeObserver.disconnect();
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Update Markers when establishments change
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear old markers, circles, and clusters
    (Object.values(markersRef.current) as L.Marker[]).forEach((marker) => marker.remove());
    (Object.values(circlesRef.current) as L.Circle[]).forEach((circle) => circle.remove());
    clusterMarkersRef.current.forEach((cMarker) => cMarker.remove());
    markersRef.current = {};
    circlesRef.current = {};
    clusterMarkersRef.current = [];

    // Determine whether to cluster based on Zoom level
    const shouldCluster = currentZoom < 7;

    if (shouldCluster) {
      // Perform simple grid-based clustering
      const gridSize = currentZoom <= 5 ? 1.5 : 0.8;
      const groups: { [key: string]: Establishment[] } = {};

      establishments.forEach((est) => {
        const { latlng } = getCoordinatedWithPrivacy(est.coordinates, est.privacy, est.id);
        const gridLat = Math.round(latlng[0] / gridSize) * gridSize;
        const gridLng = Math.round(latlng[1] / gridSize) * gridSize;
        const key = `${gridLat.toFixed(3)}_${gridLng.toFixed(3)}`;
        
        if (!groups[key]) groups[key] = [];
        groups[key].push(est);
      });

      // Render clusters or single elements
      Object.entries(groups).forEach(([key, groupEsts]) => {
        const [gridLat, gridLng] = key.split('_').map(Number);

        if (groupEsts.length === 1) {
          // Only 1 establishment in this cluster grid cell: render standard marker
          const est = groupEsts[0];
          const { latlng, radius } = getCoordinatedWithPrivacy(est.coordinates, est.privacy, est.id);

          const marker = L.marker(latlng, {
            icon: getCustomIcon(est.category, est.isPremium),
            zIndexOffset: est.isPremium ? 100 : 0
          }).addTo(map);

          marker.bindTooltip(`
            <div class="p-1.5 font-sans font-medium text-[#333333]">
              <div class="flex items-center gap-1">
                <span class="text-[10px] text-[#C06C4D] font-bold tracking-widest uppercase">[${est.category}]</span>
                ${est.isPremium ? '⭐' : ''}
              </div>
              <p class="text-sm font-semibold italic font-serif">${est.name}</p>
              <p class="text-[11px] text-gray-500 font-normal">${est.city} - ${est.state}</p>
            </div>
          `, { direction: 'top', offset: [0, -10], opacity: 0.95 });

          marker.on('click', (e) => {
            L.DomEvent.stopPropagation(e);
            onSelectEstablishment(est.id);
          });

          markersRef.current[est.id] = marker;
        } else {
          // Multiple establishments: render a beautiful, responsive custom cluster marker
          const clusterIcon = L.divIcon({
            html: `
              <div class="flex items-center justify-center bg-[#C06C4D] border-[2.5px] border-white text-white font-extrabold rounded-full shadow-lg hover:scale-105 transition-all duration-200" style="width: 42px; height: 42px; font-size: 13px; font-family: 'Inter', sans-serif;">
                ${groupEsts.length}
              </div>
            `,
            className: 'custom-leaflet-cluster',
            iconSize: [42, 42],
            iconAnchor: [21, 21]
          });

          const clusterMarker = L.marker([gridLat, gridLng], { icon: clusterIcon }).addTo(map);
          
          // Tooltip showing spaces in this cluster
          const tooltipContent = `
            <div class="p-2 font-sans text-[#333333] space-y-1 max-w-[200px]">
              <p class="font-bold text-[10px] uppercase text-[#C06C4D] border-b border-gray-100 pb-1">Agrupamento (${groupEsts.length} espaços):</p>
              <ul class="list-disc pl-3 text-[11px] font-semibold space-y-0.5 max-h-24 overflow-y-auto">
                ${groupEsts.map(e => `<li class="truncate italic">${e.name}</li>`).join('')}
              </ul>
              <p class="text-[9px] text-gray-400 mt-1 font-medium">Clique para aproximar</p>
            </div>
          `;
          
          clusterMarker.bindTooltip(tooltipContent, { direction: 'top', opacity: 0.96 });

          clusterMarker.on('click', (e) => {
            L.DomEvent.stopPropagation(e);
            map.setView([gridLat, gridLng], currentZoom + 2, { animate: true, duration: 0.8 });
          });

          clusterMarkersRef.current.push(clusterMarker);
        }
      });
    } else {
      // Standard individual rendering when zoom level is high enough (>= 7)
      establishments.forEach((est) => {
        const { latlng, radius } = getCoordinatedWithPrivacy(est.coordinates, est.privacy, est.id);
 
        // Create marker
        const marker = L.marker(latlng, {
          icon: getCustomIcon(est.category, est.isPremium),
          zIndexOffset: est.isPremium ? 100 : 0
        });
 
        marker.addTo(map);
 
        // Simple tooltip on hover
        marker.bindTooltip(`
          <div class="p-1.5 font-sans font-medium text-[#333333]">
            <div class="flex items-center gap-1">
              <span class="text-[10px] text-[#C06C4D] font-bold tracking-widest uppercase">[${est.category}]</span>
              ${est.isPremium ? '⭐' : ''}
            </div>
            <p class="text-sm font-semibold italic font-serif">${est.name}</p>
            <p class="text-[11px] text-gray-500 font-normal">${est.city} - ${est.state}</p>
          </div>
        `, {
          direction: 'top',
          offset: [0, -10],
          opacity: 0.95
        });
 
        marker.on('click', (e) => {
          L.DomEvent.stopPropagation(e);
          onSelectEstablishment(est.id);
        });
 
        markersRef.current[est.id] = marker;
 
        // Draw translucent privacy circle if needed
        if (radius > 0) {
          const color = getCategoryColor(est.category);
          const circle = L.circle(latlng, {
            radius: radius,
            color: color,
            fillColor: color,
            fillOpacity: 0.12,
            weight: 1.5,
            dashArray: '4, 4'
          }).addTo(map);
 
          circlesRef.current[est.id] = circle;
        }
      });
    }
  }, [establishments, onSelectEstablishment, currentZoom]);

  // Center map on selected establishment or custom center coordinates
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (centerCoordinates) {
      map.setView(centerCoordinates, 13, { animate: true, duration: 1 });
    } else if (selectedId) {
      const selectedEst = establishments.find((e) => e.id === selectedId);
      if (selectedEst) {
        const { latlng } = getCoordinatedWithPrivacy(selectedEst.coordinates, selectedEst.privacy, selectedEst.id);
        const zoomLevel = selectedEst.privacy === 'full' ? 14 : selectedEst.privacy === 'neighborhood' ? 14 : 11;
        map.setView(latlng, zoomLevel, { animate: true, duration: 1 });
      }
    }
  }, [selectedId, establishments, centerCoordinates]);

  return (
    <div className="relative w-full h-full bg-[#FAF9F5] rounded-2xl overflow-hidden shadow-sm border border-clay-border">
      <div ref={mapContainerRef} className="w-full h-full" id="ceramapa-main-map" />
      
      {/* Collapsible map legend overlay */}
      <div 
        className={`absolute top-3 left-3 z-[1000] bg-white/95 backdrop-blur-md rounded-xl shadow-md border border-clay-border transition-all duration-300 ${
          isLegendExpanded ? 'p-3 w-60 md:w-64' : 'p-1.5 w-auto'
        }`}
      >
        {isLegendExpanded ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-4 pb-1.5 border-b border-clay-border/30">
              <h4 className="text-[9px] font-bold uppercase tracking-wider text-sienna font-sans flex items-center gap-1">
                <Layers className="w-3.5 h-3.5 text-sienna shrink-0" />
                Legenda do Mapa
              </h4>
              <button
                type="button"
                onClick={() => setIsLegendExpanded(false)}
                className="text-earth-gray hover:text-terracotta p-1 rounded-md transition-all hover:bg-sand-bg/40 cursor-pointer flex items-center justify-center shrink-0"
                title="Minimizar Legenda"
              >
                <ChevronUp className="w-3.5 h-3.5" />
              </button>
            </div>
            
            <div className="space-y-1.5 text-[10px] text-earth-dark font-semibold leading-normal">
              <div className="flex items-center gap-2 py-0.5">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: '#C06C4D' }} />
                <span>Ateliê / Escola</span>
              </div>
              <div className="flex items-center gap-2 py-0.5">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: '#A0522D' }} />
                <span>Ceramista / Professor</span>
              </div>
              <div className="flex items-center gap-2 py-0.5">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: '#6B8E23' }} />
                <span>Fornecedor / Insumos</span>
              </div>
              <div className="flex items-center gap-2 py-0.5">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: '#4682B4' }} />
                <span>Espaço Cultural / Galeria / Museu</span>
              </div>
              <div className="flex items-center gap-2 py-0.5">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: '#333333' }} />
                <span>Serviço de Queima / Assistência</span>
              </div>
              <div className="flex items-center gap-2 py-0.5">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: '#DCD3C0' }} />
                <span>Eventos / Feiras</span>
              </div>
              
              <div className="border-t border-clay-border/30 pt-1.5 mt-1.5 space-y-1">
                <div className="flex items-center gap-2 text-[9px] text-earth-gray font-bold uppercase tracking-wider">
                  <span className="text-[11px] leading-none">⭐</span>
                  <span>Destaque Premium</span>
                </div>
                <div className="flex items-center gap-2 text-[9px] text-earth-gray font-bold uppercase tracking-wider">
                  <span className="w-3 h-1.5 border border-dashed border-sand-border rounded-sm bg-sand-bg block shrink-0" />
                  <span>Zona de Privacidade</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setIsLegendExpanded(true)}
            className="flex items-center gap-1 px-2 py-1 text-[10px] font-bold text-sienna hover:text-terracotta transition-all rounded-lg hover:bg-sand-bg/40 cursor-pointer"
            title="Expandir Legenda"
          >
            <Layers className="w-3.5 h-3.5 text-sienna shrink-0 animate-pulse" />
            <span>Legenda</span>
            <ChevronDown className="w-3.5 h-3.5 text-earth-gray shrink-0" />
          </button>
        )}
      </div>
    </div>
  );
}
