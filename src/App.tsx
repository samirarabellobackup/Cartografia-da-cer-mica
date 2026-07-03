import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Map, Calendar, FileSpreadsheet, User, ShoppingBag, BarChart3, 
  Flame, Sparkles, MapPin, Star, Award, ChevronRight, Menu, X, Check
} from 'lucide-react';

import { 
  Establishment, SyncRow, SyncLog, Review, Category, Specialty, PrivacyLevel, CeramicEvent, Product, PlanConfig, SuggestedSpace, PlanTier, IntegrationConfig,
  UserSession, AuditLog, TeamMember, HomologationStatus, ValidationStepStatus, HomologationChecklist, EstablishmentWithHomologation, UserRole, EstablishmentTeamMember, EstablishmentRole
} from './types';
import { 
  INITIAL_ESTABLISHMENTS, MOCK_SHEETS_DATA, INITIAL_SYNC_LOGS, DEFAULT_PLANS, INITIAL_SUGGESTED_SPACES, DEFAULT_INTEGRATION_CONFIG
} from './data';
import { fetchGoogleSheetRows } from './utils/sheetsSync';
import { performGeocodingHierarchy, validateCoordinates, calculateDistance } from './utils/geocodingHelper';

import MapComponent from './components/Map';
import SearchFilters, { FilterState } from './components/SearchFilters';
import ProfileDetails from './components/ProfileDetails';
import CollaborativeSync from './components/CollaborativeSync';
import AdminDashboard from './components/AdminDashboard';
import UserDashboard from './components/UserDashboard';
import FutureMarketplace from './components/FutureMarketplace';
import EventCalendar from './components/EventCalendar';
import RegistrationForm from './components/RegistrationForm';
import MapCard from './components/MapCard';
import SearchDiscover from './components/SearchDiscover';
import AuthModule from './components/AuthModule';

export default function App() {
  const [activePortal, setActivePortal] = useState<'public' | 'partner' | 'admin'>('public');
  const [activeTab, setActiveTab] = useState<string>('mapa');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [ateliesSearch, setAteliesSearch] = useState('');
  const [fornecedoresSearch, setFornecedoresSearch] = useState('');

  const [showAdminControlBar, setShowAdminControlBar] = useState(false);

  // Support URL hash routing for isolated environments!
  useEffect(() => {
    const handleRouteCheck = () => {
      const hash = window.location.hash;
      const path = window.location.pathname;
      const search = window.location.search;

      const isMentor = 
        path === '/mentordaconta' || 
        path.endsWith('/mentordaconta') || 
        hash === '#mentordaconta' || 
        hash.includes('mentordaconta') || 
        search.includes('mentordaconta');

      setShowAdminControlBar(isMentor);

      if (hash === '#atelies') {
        setActiveTab('atelies');
        setActivePortal('public');
      } else if (hash === '#fornecedores') {
        setActiveTab('fornecedores');
        setActivePortal('public');
      } else if (hash === '#sobre') {
        setActiveTab('sobre');
        setActivePortal('public');
      } else if (isMentor) {
        setActivePortal('admin');
        setActiveTab('admin');
      } else {
        setActiveTab('mapa');
        setActivePortal('public');
      }
    };

    window.addEventListener('hashchange', handleRouteCheck);
    window.addEventListener('popstate', handleRouteCheck);
    handleRouteCheck();

    return () => {
      window.removeEventListener('hashchange', handleRouteCheck);
      window.removeEventListener('popstate', handleRouteCheck);
    };
  }, []);

  const changePortal = (portal: 'public' | 'partner' | 'admin') => {
    if (!showAdminControlBar) return;
    setActivePortal(portal);
    if (portal === 'admin') {
      setActiveTab('admin');
    } else if (portal === 'partner') {
      setActiveTab('user');
    } else {
      setActiveTab('mapa');
    }
  };

  // Security, Session & RBAC states
  const [currentSession, setCurrentSession] = useState<UserSession | null>(() => {
    const saved = localStorage.getItem('ceramapa_session');
    return saved ? JSON.parse(saved) : null;
  });

  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => {
    const saved = localStorage.getItem('ceramapa_audit_logs');
    return saved ? JSON.parse(saved) : [
      {
        id: 'aud_init',
        operatorEmail: 'samirarabello.backup@gmail.com',
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
        action: 'Inicialização da Plataforma de Homologação Segura',
        notes: 'Módulo de auditoria perpétuo configurado.',
        ip: '127.0.0.1'
      }
    ];
  });

  const [teamMembers, setTeamMembers] = useState<TeamMember[]>(() => {
    const saved = localStorage.getItem('ceramapa_team_members');
    return saved ? JSON.parse(saved) : [
      {
        id: 'tm_samira',
        email: 'samirarabello.backup@gmail.com',
        name: 'Samira Rabello',
        role: 'super_admin',
        permissions: ['all'],
        status: 'active',
        history: ['Fundadora do CeraMapa.']
      },
      {
        id: 'tm_mod1',
        email: 'moderador.mapa@gmail.com',
        name: 'Clara Nunes',
        role: 'moderator',
        permissions: ['review_claims', 'review_geocoding'],
        status: 'active',
        history: ['Convidada por Samira Rabello.']
      }
    ];
  });

  useEffect(() => {
    localStorage.setItem('ceramapa_session', JSON.stringify(currentSession));
  }, [currentSession]);

  useEffect(() => {
    localStorage.setItem('ceramapa_audit_logs', JSON.stringify(auditLogs));
  }, [auditLogs]);

  useEffect(() => {
    localStorage.setItem('ceramapa_team_members', JSON.stringify(teamMembers));
  }, [teamMembers]);

  const handleAddAuditLog = (action: string, notes?: string, targetId?: string, targetName?: string, previousValue?: string, newValue?: string) => {
    const newLog: AuditLog = {
      id: 'aud_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      operatorEmail: currentSession?.email || 'Visitante Anônimo',
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      action,
      targetId,
      targetName,
      previousValue,
      newValue,
      notes,
      ip: '189.120.45.102'
    };
    setAuditLogs(prev => [newLog, ...prev]);
  };

  // Core database states
  const [establishments, setEstablishments] = useState<Establishment[]>(() => {
    const saved = localStorage.getItem('ceramapa_establishments');
    return saved ? JSON.parse(saved) : INITIAL_ESTABLISHMENTS;
  });

  const [plans, setPlans] = useState<PlanConfig[]>(() => {
    const saved = localStorage.getItem('ceramapa_plans');
    return saved ? JSON.parse(saved) : DEFAULT_PLANS;
  });

  const [suggestedSpaces, setSuggestedSpaces] = useState<SuggestedSpace[]>(() => {
    const saved = localStorage.getItem('ceramapa_suggested_spaces');
    return saved ? JSON.parse(saved) : INITIAL_SUGGESTED_SPACES;
  });

  const [sheetRows, setSheetRows] = useState<SyncRow[]>(() => {
    const saved = localStorage.getItem('ceramapa_sheet_rows');
    return saved ? JSON.parse(saved) : MOCK_SHEETS_DATA;
  });

  const [syncLogs, setSyncLogs] = useState<SyncLog[]>(() => {
    const saved = localStorage.getItem('ceramapa_sync_logs');
    return saved ? JSON.parse(saved) : INITIAL_SYNC_LOGS;
  });

  // UI state managers
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isProfileDrawerOpen, setIsProfileDrawerOpen] = useState(false);
  const [userCoords, setUserCoords] = useState<[number, number] | null>(null);

  const handleToggleUserCoords = () => {
    if (userCoords) {
      setUserCoords(null);
    } else {
      // São Paulo, Brazil coordinates for simulated GPS
      setUserCoords([-23.55052, -46.633308]);
    }
  };
  const [autoSync, setAutoSync] = useState(() => {
    const saved = localStorage.getItem('ceramapa_autosync_enabled');
    return saved ? JSON.parse(saved) : true;
  });
  const [syncInterval, setSyncInterval] = useState(() => {
    const saved = localStorage.getItem('ceramapa_sync_interval');
    return saved ? JSON.parse(saved) : 10;
  });

  const [integrationConfig, setIntegrationConfig] = useState<IntegrationConfig>(() => {
    const saved = localStorage.getItem('ceramapa_integration_config');
    return saved ? JSON.parse(saved) : DEFAULT_INTEGRATION_CONFIG;
  });

  useEffect(() => {
    localStorage.setItem('ceramapa_integration_config', JSON.stringify(integrationConfig));
  }, [integrationConfig]);

  const [centerCoordinates, setCenterCoordinates] = useState<[number, number] | undefined>(undefined);
  const [mapClickedCoords, setMapClickedCoords] = useState<[number, number] | null>(null);
  const [filters, setFilters] = useState<FilterState>({
    query: '',
    category: '',
    state: '',
    specialties: [],
    services: []
  });

  // Save database states on changes
  useEffect(() => {
    localStorage.setItem('ceramapa_establishments', JSON.stringify(establishments));
  }, [establishments]);

  useEffect(() => {
    localStorage.setItem('ceramapa_plans', JSON.stringify(plans));
  }, [plans]);

  useEffect(() => {
    localStorage.setItem('ceramapa_suggested_spaces', JSON.stringify(suggestedSpaces));
  }, [suggestedSpaces]);

  useEffect(() => {
    localStorage.setItem('ceramapa_sheet_rows', JSON.stringify(sheetRows));
  }, [sheetRows]);

  useEffect(() => {
    localStorage.setItem('ceramapa_sync_logs', JSON.stringify(syncLogs));
  }, [syncLogs]);

  useEffect(() => {
    localStorage.setItem('ceramapa_autosync_enabled', JSON.stringify(autoSync));
  }, [autoSync]);

  useEffect(() => {
    localStorage.setItem('ceramapa_sync_interval', JSON.stringify(syncInterval));
  }, [syncInterval]);

  // One-time automatic geocoding and correction of all existing establishments on load
  useEffect(() => {
    const isProcessed = localStorage.getItem('ceramapa_geocoding_v2_migrated');
    if (!isProcessed) {
      setEstablishments(prev => {
        const updated = prev.map(est => {
          const res = performGeocodingHierarchy({
            address: est.address,
            neighborhood: est.neighborhood,
            city: est.city,
            state: est.state,
            cep: est.originalAddress?.match(/\d{5}-\d{3}/)?.[0] || '',
            privacy: est.privacy
          });

          const val = validateCoordinates(res.coords[0], res.coords[1], res.normalized.state);
          const geocodingStatus = (res.success && val.isValid) ? 'valid' : 'pending_review';

          return {
            ...est,
            address: res.normalized.address,
            neighborhood: res.normalized.neighborhood,
            city: res.normalized.city,
            state: res.normalized.state,
            coordinates: res.coords,
            geocodingStatus: est.geocodingStatus || geocodingStatus,
            originalAddress: est.originalAddress || est.address
          };
        });
        localStorage.setItem('ceramapa_geocoding_v2_migrated', 'true');
        return updated;
      });
    }
  }, []);

  // Google Sheets Live Synchronizer Core
  const syncWithGoogleSheets = async (config: IntegrationConfig, isBackground: boolean = false) => {
    if (config.status !== 'active') return;

    try {
      const fetchedRows = await fetchGoogleSheetRows(config.spreadsheetId, config.sheetName);
      if (fetchedRows.length === 0) return;

      const newEstablishments: Establishment[] = [];
      const updatedSheetRows = [...sheetRows];
      let newlyImportedCount = 0;
      let duplicatesCount = 0;

      setEstablishments((currentEsts) => {
        const estsToKeep = [...currentEsts];
        
        for (const row of fetchedRows) {
          const existsInEst = estsToKeep.some(
            e => e.name.toLowerCase().trim() === row.name.toLowerCase().trim() ||
                 (e.city.toLowerCase().trim() === row.city.toLowerCase().trim() && 
                  e.instagram?.toLowerCase().trim() === row.contact.toLowerCase().trim())
          );

          const existingSheetRowIndex = updatedSheetRows.findIndex(
            sr => sr.name.toLowerCase().trim() === row.name.toLowerCase().trim() &&
                  sr.city.toLowerCase().trim() === row.city.toLowerCase().trim()
          );

          if (existsInEst) {
            duplicatesCount++;
            if (existingSheetRowIndex >= 0) {
              updatedSheetRows[existingSheetRowIndex].status = 'duplicate';
            } else {
              updatedSheetRows.push({
                ...row,
                status: 'duplicate'
              });
            }
            continue;
          }

          const geoRes = performGeocodingHierarchy({
            address: row.address || '',
            neighborhood: row.neighborhood || '',
            city: row.city || '',
            state: row.state || '',
            cep: '',
            privacy: row.privacy || 'full'
          });

          const validation = validateCoordinates(geoRes.coords[0], geoRes.coords[1], geoRes.normalized.state);
          const geocodingStatus = (geoRes.success && validation.isValid) ? 'valid' : 'pending_review';

          const nextEst: Establishment = {
            id: `est_imported_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
            name: row.name,
            category: row.category,
            specialties: row.specialties.split(', ').map(s => s.trim()).filter(Boolean) as Specialty[],
            services: [],
            privacy: row.privacy || 'neighborhood',
            address: geoRes.normalized.address,
            neighborhood: geoRes.normalized.neighborhood,
            city: geoRes.normalized.city,
            state: geoRes.normalized.state,
            coordinates: geoRes.coords,
            geocodingStatus,
            originalAddress: row.address || 'Consulte as redes sociais',
            description: row.description || `Perfil importado do Guia Colaborativo da Cerâmica. Localizado em ${geoRes.normalized.city} - ${geoRes.normalized.state}.`,
            instagram: row.contact.startsWith('@') ? row.contact : `@${row.contact}`,
            whatsapp: row.contact.replace(/\D/g, '') || '',
            photo: row.photo || 'https://images.unsplash.com/photo-1565192647048-f997ded879f9?auto=format&fit=crop&w=800&q=80',
            isPremium: false,
            claimed: false,
            rating: 4.8,
            reviewsCount: 0
          };

          newEstablishments.push(nextEst);
          estsToKeep.unshift(nextEst);
          newlyImportedCount++;

          if (existingSheetRowIndex >= 0) {
            updatedSheetRows[existingSheetRowIndex].status = 'synced';
          } else {
            updatedSheetRows.push({
              ...row,
              status: 'synced'
            });
          }
        }

        return estsToKeep;
      });

      setSheetRows(updatedSheetRows);

      const logMsg = isBackground
        ? `Sincronização Automática (Sheets): ${newlyImportedCount} novos perfis importados, ${duplicatesCount} duplicatas ignoradas.`
        : `Sincronização Manual (Sheets): ${newlyImportedCount} novos perfis importados, ${duplicatesCount} duplicatas ignoradas.`;

      const nextLog: SyncLog = {
        id: `log_${Date.now()}`,
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
        action: logMsg,
        recordsSynced: newlyImportedCount,
        recordsIgnored: duplicatesCount,
        operator: isBackground ? 'Frequência de Sincronia' : (currentSession?.email || 'samirarabello.backup@gmail.com')
      };

      setSyncLogs(prev => [nextLog, ...prev]);

    } catch (error: any) {
      console.error("Sheets sync error:", error);
      const nextLog: SyncLog = {
        id: `log_${Date.now()}`,
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
        action: `Erro ao sincronizar com Google Sheets: ${error.message || error}`,
        recordsSynced: 0,
        recordsIgnored: 0,
        operator: isBackground ? 'Frequência de Sincronia' : (currentSession?.email || 'samirarabello.backup@gmail.com')
      };
      setSyncLogs(prev => [nextLog, ...prev]);
    }
  };

  // Background Auto-Sync Timer
  useEffect(() => {
    if (!autoSync) return;

    const intervalId = setInterval(() => {
      // Find all rows that are status === 'pending'
      const pendingRows = sheetRows.filter(r => r.status === 'pending');
      if (pendingRows.length === 0) return;

      // Integrate all of them!
      const nextEsts: Establishment[] = [];
      const updatedRowIds = new Set<string>();

      pendingRows.forEach((row, index) => {
        const geoRes = performGeocodingHierarchy({
          address: row.address || '',
          neighborhood: row.neighborhood || '',
          city: row.city || '',
          state: row.state || '',
          cep: '',
          privacy: row.privacy || 'full'
        });

        const validation = validateCoordinates(geoRes.coords[0], geoRes.coords[1], geoRes.normalized.state);
        const geocodingStatus = (geoRes.success && validation.isValid) ? 'valid' : 'pending_review';

        const nextEst: Establishment = {
          id: `est_${Date.now()}_${index}_${Math.floor(Math.random() * 1000)}`,
          name: row.name,
          category: row.category,
          specialties: row.specialties.split(', ').map(s => s.trim()) as Specialty[],
          services: [],
          privacy: row.privacy || 'full',
          address: geoRes.normalized.address,
          neighborhood: geoRes.normalized.neighborhood,
          city: geoRes.normalized.city,
          state: geoRes.normalized.state,
          coordinates: geoRes.coords,
          geocodingStatus,
          originalAddress: row.address || 'Rua Principal',
          description: row.description || `Integrado via Sincronizador Colaborativo. ${row.name} localizado em ${geoRes.normalized.city}.`,
          instagram: row.contact.startsWith('@') ? row.contact : `@${row.contact}`,
          whatsapp: row.contact.replace(/\D/g, '') || '11999998888',
          photo: row.photo || 'https://images.unsplash.com/photo-1565192647048-f997ded879f9?auto=format&fit=crop&w=800&q=80',
          isPremium: false,
          claimed: false,
          rating: 5.0,
          reviewsCount: 0
        };
        nextEsts.push(nextEst);
        updatedRowIds.add(row.id);
      });

      if (nextEsts.length > 0) {
        setEstablishments(prev => [...nextEsts, ...prev]);
        setSheetRows(prev => prev.map(r => updatedRowIds.has(r.id) ? { ...r, status: 'synced' as const } : r));

        const namesJoined = pendingRows.map(r => r.name).join(', ');
        const nextLog: SyncLog = {
          id: `log_${Date.now()}`,
          timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
          action: `Sincronização Automática: [${namesJoined}] integrados ao mapa em tempo real`,
          recordsSynced: pendingRows.length,
          recordsIgnored: 0,
          operator: 'Cron de Background'
        };
        setSyncLogs(prev => [nextLog, ...prev]);
      }
    }, syncInterval * 1000);

    return () => clearInterval(intervalId);
  }, [autoSync, syncInterval, sheetRows]);

  // Google Sheets Auto-Sync Background Job
  useEffect(() => {
    if (integrationConfig.status !== 'active' || integrationConfig.syncMethod !== 'automatic') return;

    const intervalId = setInterval(() => {
      syncWithGoogleSheets(integrationConfig, true);
    }, integrationConfig.syncInterval * 1000);

    return () => clearInterval(intervalId);
  }, [integrationConfig]);

  // Derived filters
  const filteredEstablishments = establishments.filter((est) => {
    // Do not show locations pending review or failed on public map
    if (est.geocodingStatus === 'pending_review' || est.geocodingStatus === 'failed') {
      return false;
    }

    // Proximity Center and Radius check
    if (filters.proximityCenter && filters.proximityRadius) {
      const dist = calculateDistance(
        filters.proximityCenter[0],
        filters.proximityCenter[1],
        est.coordinates[0],
        est.coordinates[1]
      );
      if (dist > filters.proximityRadius) {
        return false;
      }
    }

    // 1. Text Query matches name, city, neighborhood or specialties
    const query = filters.query.toLowerCase();
    const nameMatch = est.name.toLowerCase().includes(query);
    const cityMatch = est.city.toLowerCase().includes(query);
    const neighMatch = est.neighborhood.toLowerCase().includes(query);
    const specMatch = est.specialties.some(s => s.toLowerCase().includes(query));
    
    const matchesQuery = !query || nameMatch || cityMatch || neighMatch || specMatch;

    // 2. Category Match
    const matchesCategory = !filters.category || est.category === filters.category;

    // 3. State Match
    const matchesState = !filters.state || est.state === filters.state;

    // 4. Specialties matches all selected specialties
    const matchesSpecialties = filters.specialties.length === 0 || 
      filters.specialties.every(spec => est.specialties.includes(spec));

    // 5. Services matches all selected services
    const matchesServices = filters.services.length === 0 || 
      filters.services.every(srv => est.services && est.services.includes(srv));

    return matchesQuery && matchesCategory && matchesState && matchesSpecialties && matchesServices;
  });

  // Derived filtered lists for the dedicated MVP tabs
  const filteredAteliesList = establishments.filter(est => {
    // Include only standard Ateliê/Artisan categories
    const isAtelieCategory = est.category === 'Ateliê' || est.category === 'Ateliê Escola' || est.category === 'Ceramista' || est.category === 'Professor' || est.category === 'Escola';
    if (!isAtelieCategory) return false;
    if (!ateliesSearch.trim()) return true;
    const query = ateliesSearch.toLowerCase();
    return (
      est.name.toLowerCase().includes(query) ||
      est.city.toLowerCase().includes(query) ||
      est.state.toLowerCase().includes(query) ||
      est.specialties.some(s => s.toLowerCase().includes(query)) ||
      (est.neighborhood && est.neighborhood.toLowerCase().includes(query))
    );
  });

  const filteredFornecedoresList = establishments.filter(est => {
    // Include only standard Supply/Supplier categories
    const isSupplierCategory = est.category === 'Fornecedor' || est.category === 'Fabricante' || est.category === 'Importador' || est.category === 'Loja' || est.category === 'Assistência Técnica' || est.category === 'Queima';
    if (!isSupplierCategory) return false;
    if (!fornecedoresSearch.trim()) return true;
    const query = fornecedoresSearch.toLowerCase();
    return (
      est.name.toLowerCase().includes(query) ||
      est.city.toLowerCase().includes(query) ||
      est.state.toLowerCase().includes(query) ||
      est.specialties.some(s => s.toLowerCase().includes(query)) ||
      (est.neighborhood && est.neighborhood.toLowerCase().includes(query))
    );
  });

  // Fills client-side state with freshly processed, treated and normalized backend database records on load
  useEffect(() => {
    const fetchLatestData = async () => {
      try {
        const res = await fetch('/api/establishments');
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) {
            setEstablishments(data);
          }
        }
      } catch (err) {
        console.error('[App] Failed to load establishments from treatment engine:', err);
      }
    };
    fetchLatestData();
  }, []);

  // Available States for Filter Dropdown
  const availableStates = Array.from(new Set(establishments.map(e => e.state))).sort() as string[];

  // 1. Review submission handler
  const handleAddReview = (establishmentId: string, reviewData: Omit<Review, 'id' | 'date' | 'establishmentId'>) => {
    const nextReview: Review = {
      ...reviewData,
      id: `rev_${Date.now()}`,
      establishmentId,
      date: new Date().toISOString().split('T')[0]
    };

    // Load active reviews from local storage for that establishment
    const storedReviewsKey = `reviews_${establishmentId}`;
    const stored = localStorage.getItem(storedReviewsKey);
    const list: Review[] = stored ? JSON.parse(stored) : [];
    const updatedList = [nextReview, ...list];
    localStorage.setItem(storedReviewsKey, JSON.stringify(updatedList));

    // Recalculate average rating & review count for establishment
    setEstablishments((prev) =>
      prev.map((est) => {
        if (est.id === establishmentId) {
          const totalScore = updatedList.reduce((sum, r) => sum + r.rating, 0);
          const newAvg = totalScore / updatedList.length;
          return {
            ...est,
            rating: Number(newAvg.toFixed(1)),
            reviewsCount: updatedList.length
          };
        }
        return est;
      })
    );
  };

  // 2. Claim Profile handler with secure claimant details
  const handleClaimProfile = async (
    id: string, 
    claimantDetails: {
      name: string;
      email: string;
      document: string;
      phone: string;
      justification: string;
    }
  ) => {
    try {
      const res = await fetch(`/api/establishments/${id}/claim`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-session': JSON.stringify(currentSession)
        },
        body: JSON.stringify(claimantDetails)
      });
      if (!res.ok) {
        const errData = await res.json();
        alert(`Erro: ${errData.error}`);
        return;
      }
      const data = await res.json();
      if (data.success) {
        setEstablishments(prev => prev.map(e => e.id === id ? data.establishment : e));
        handleAddAuditLog(
          'Reivindicação Iniciada',
          `O usuário ${claimantDetails.name} (${claimantDetails.email}) iniciou o processo de reivindicação para o estabelecimento. Documento: ${claimantDetails.document}.`,
          id
        );
      }
    } catch (err) {
      console.error('Error claiming profile:', err);
    }
  };

  // 3. Update profile details handler
  const handleUpdateEstablishment = async (id: string, updates: Partial<EstablishmentWithHomologation>) => {
    try {
      const res = await fetch(`/api/establishments/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-session': JSON.stringify(currentSession)
        },
        body: JSON.stringify(updates)
      });
      if (!res.ok) {
        const errData = await res.json();
        alert(`❌ Falha de Segurança (Backend): ${errData.error || 'Acesso Negado (403)'}`);
        // Fetch fresh db to revert any UI mismatch
        const dbRes = await fetch('/api/db');
        const dbData = await dbRes.json();
        if (dbData.establishments) setEstablishments(dbData.establishments);
        return;
      }
      const data = await res.json();
      if (data.success) {
        setEstablishments(prev => prev.map(e => e.id === id ? data.establishment : e));
      }
    } catch (err) {
      console.error('Error updating establishment:', err);
      alert('Erro ao conectar com o servidor para salvar alterações.');
    }
  };

  // 3.5 Geocoding and coordinates update handler
  const handleUpdateEstablishmentCoords = (id: string, coords: [number, number], addressDetails?: Partial<Establishment>) => {
    setEstablishments((prev) =>
      prev.map((est) => {
        if (est.id === id) {
          return { ...est, coordinates: coords, ...(addressDetails || {}) };
        }
        return est;
      })
    );
  };

  // 4. Upgrade Premium profile handler
  const handleUpgradeToPremium = (id: string) => {
    setEstablishments((prev) =>
      prev.map((est) => {
        if (est.id === id) {
          return { 
            ...est, 
            isPremium: true,
            cover: 'https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?auto=format&fit=crop&w=1200&q=80',
            logo: 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=150&q=80',
            gallery: [
              'https://images.unsplash.com/photo-1565192647048-f997ded879f9?auto=format&fit=crop&w=800&q=80',
              'https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?auto=format&fit=crop&w=800&q=80',
              'https://images.unsplash.com/photo-1502086223501-7ea6ecd79368?auto=format&fit=crop&w=800&q=80',
              'https://images.unsplash.com/photo-1610905045094-ab6c18f50685?auto=format&fit=crop&w=800&q=80'
            ]
          };
        }
        return est;
      })
    );
  };

  // 5. Add custom courses/events
  const handleAddEventToEstablishment = async (estId: string, eventData: Omit<CeramicEvent, 'id' | 'establishmentId'>) => {
    try {
      const res = await fetch(`/api/establishments/${estId}/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-session': JSON.stringify(currentSession)
        },
        body: JSON.stringify(eventData)
      });
      if (!res.ok) {
        const errData = await res.json();
        alert(`❌ Falha de Segurança (Backend): ${errData.error || 'Acesso Negado'}`);
        return;
      }
      const data = await res.json();
      if (data.success) {
        setEstablishments(prev => prev.map(e => e.id === estId ? data.establishment : e));
      }
    } catch (err) {
      console.error('Error adding event:', err);
    }
  };

  // 6. Add custom products to showcase
  const handleAddProductToEstablishment = async (estId: string, productData: Omit<Product, 'id'>) => {
    try {
      const res = await fetch(`/api/establishments/${estId}/products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-session': JSON.stringify(currentSession)
        },
        body: JSON.stringify(productData)
      });
      if (!res.ok) {
        const errData = await res.json();
        alert(`❌ Falha de Segurança (Backend): ${errData.error || 'Acesso Negado'}`);
        return;
      }
      const data = await res.json();
      if (data.success) {
        setEstablishments(prev => prev.map(e => e.id === estId ? data.establishment : e));
      }
    } catch (err) {
      console.error('Error adding product:', err);
    }
  };

  // 7. SPREADSHEET: Append row from Google Forms
  const handleAddFormSubmission = (submission: Omit<SyncRow, 'id' | 'timestamp' | 'status'> & { privacy?: PrivacyLevel; description?: string; photo?: string }) => {
    // Simple duplicate checker before inserting
    const isDuplicate = establishments.some(
      e => e.name.toLowerCase() === submission.name.toLowerCase() || 
           (e.city.toLowerCase() === submission.city.toLowerCase() && e.address.toLowerCase() === submission.address.toLowerCase())
    );

    const nextRow: SyncRow = {
      ...submission,
      id: `row_${Date.now()}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      status: isDuplicate ? 'duplicate' : 'pending',
      privacy: submission.privacy,
      description: submission.description,
      photo: submission.photo
    };

    setSheetRows(prev => [nextRow, ...prev]);
  };

  // 8. SPREADSHEET: Pull spreadsheet data
  const handleSyncRows = () => {
    // Set duplicates check of all rows against current database
    setSheetRows((prev) =>
      prev.map((row) => {
        if (row.status === 'synced') return row;
        const exists = establishments.some(
          e => e.name.toLowerCase() === row.name.toLowerCase() || 
               (e.city.toLowerCase() === row.city.toLowerCase() && e.address.toLowerCase() === row.address.toLowerCase())
        );
        return {
          ...row,
          status: exists ? 'duplicate' : 'pending'
        };
      })
    );

    // Append standard log
    const nextLog: SyncLog = {
      id: `log_${Date.now()}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      action: 'Sincronização manual acionada pelo operador',
      recordsSynced: sheetRows.filter(r => r.status === 'pending').length,
      recordsIgnored: sheetRows.filter(r => r.status === 'duplicate').length,
      operator: currentSession?.email || 'samirarabello.backup@gmail.com'
    };
    setSyncLogs(prev => [nextLog, ...prev]);
  };

  // 9. SPREADSHEET: Approve / Merge point to the active map database
  const handleMergeRow = (rowId: string) => {
    const row = sheetRows.find(r => r.id === rowId);
    if (!row) return;

    const geoRes = performGeocodingHierarchy({
      address: row.address || '',
      neighborhood: row.neighborhood || '',
      city: row.city || '',
      state: row.state || '',
      cep: '',
      privacy: row.privacy || 'full'
    });

    const validation = validateCoordinates(geoRes.coords[0], geoRes.coords[1], geoRes.normalized.state);
    const geocodingStatus = (geoRes.success && validation.isValid) ? 'valid' : 'pending_review';

    // Extend establishment with homologation parameters as required by the flowchart
    const nextEstablishment: EstablishmentWithHomologation = {
      id: `est_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      name: row.name,
      category: row.category,
      specialties: row.specialties.split(', ').map(s => s.trim()) as Specialty[],
      services: [],
      privacy: row.privacy || 'full',
      address: geoRes.normalized.address,
      neighborhood: geoRes.normalized.neighborhood,
      city: geoRes.normalized.city,
      state: geoRes.normalized.state,
      coordinates: geoRes.coords,
      geocodingStatus,
      originalAddress: row.address || 'Rua Principal',
      description: row.description || `Integrado via Sincronizador Colaborativo. ${row.name} localizado em ${geoRes.normalized.city}.`,
      instagram: row.contact.startsWith('@') ? row.contact : `@${row.contact}`,
      whatsapp: row.contact.replace(/\D/g, '') || '11999998888',
      photo: row.photo || 'https://images.unsplash.com/photo-1565192647048-f997ded879f9?auto=format&fit=crop&w=800&q=80',
      isPremium: false,
      claimed: false,
      rating: 5.0,
      reviewsCount: 0,
      
      // Homologation System Core Integration
      homologationStatus: 'Cadastro em Análise',
      responsibleName: 'Responsável Importado',
      origin: 'Google Forms',
      homologationChecklist: {
        emailConfirmed: 'pending',
        phoneConfirmed: 'pending',
        documentValid: 'pending',
        instagramCoherence: 'pending',
        geolocValid: geocodingStatus === 'valid' ? 'valid' : 'failed',
        noDuplicity: 'valid'
      }
    };

    // Update establishments and sheetRow status
    setEstablishments(prev => [nextEstablishment, ...prev]);
    setSheetRows(prev => prev.map(r => r.id === rowId ? { ...r, status: 'synced' } : r));

    // Append standard log
    const mergeLog: SyncLog = {
      id: `log_${Date.now()}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      action: `Aprovação de linha: ${row.name} integrado ao mapa em análise`,
      recordsSynced: 1,
      recordsIgnored: 0,
      operator: currentSession?.email || 'samirarabello.backup@gmail.com'
    };
    setSyncLogs(prev => [mergeLog, ...prev]);
  };

  // 10. SPREADSHEET: Discard row
  const handleDeleteRow = (rowId: string) => {
    setSheetRows(prev => prev.filter(r => r.id !== rowId));
  };

  // 11. ADMIN BACK-OFFICE: Claims audit & upgrades
  const handleApproveClaim = async (estId: string) => {
    try {
      const res = await fetch(`/api/establishments/${estId}/approve-claim`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-session': JSON.stringify(currentSession)
        }
      });
      if (!res.ok) {
        const errData = await res.json();
        alert(`Erro ao aprovar reivindicação: ${errData.error}`);
        return;
      }
      const data = await res.json();
      if (data.success) {
        setEstablishments(prev => prev.map(e => e.id === estId ? data.establishment : e));
        handleAddAuditLog(
          'Propriedade Digital Homologada',
          `Reivindicação homologada com sucesso. Proprietário: ${data.establishment.claimantName} (${data.establishment.claimantEmail}). Owner ID: ${data.establishment.ownerId} vinculado de forma permanente.`,
          estId,
          data.establishment.name
        );
      }
    } catch (err) {
      console.error('Error approving claim:', err);
    }
  };

  const handleRejectClaim = async (estId: string) => {
    try {
      const res = await fetch(`/api/establishments/${estId}/reject-claim`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-session': JSON.stringify(currentSession)
        }
      });
      if (!res.ok) {
        const errData = await res.json();
        alert(`Erro ao rejeitar reivindicação: ${errData.error}`);
        return;
      }
      const data = await res.json();
      if (data.success) {
        setEstablishments(prev => prev.map(e => e.id === estId ? data.establishment : e));
        handleAddAuditLog(
          'Reivindicação Rejeitada',
          `A solicitação de propriedade digital para o estabelecimento foi recusada pela moderação por inconsistência cadastral.`,
          estId,
          data.establishment.name
        );
      }
    } catch (err) {
      console.error('Error rejecting claim:', err);
    }
  };

  const handleTogglePremium = (estId: string) => {
    setEstablishments(prev => prev.map(e => {
      if (e.id === estId) {
        const currentlyPremium = e.isPremium;
        return {
          ...e,
          isPremium: !currentlyPremium,
          planTier: !currentlyPremium ? 'atelie' : 'gratuito'
        };
      }
      return e;
    }));
  };

  const handleUpdatePlans = (newPlans: PlanConfig[]) => {
    setPlans(newPlans);
  };

  const handleInviteSpace = (id: string) => {
    setSuggestedSpaces(prev => prev.map(s => s.id === id ? { ...s, invitedStatus: 'invited' as const } : s));
  };

  const handleRemoveSuggestedSpace = (id: string) => {
    setSuggestedSpaces(prev => prev.filter(s => s.id !== id));
  };

  const handleUpdateEstablishmentPlan = (estId: string, plan: PlanTier) => {
    setEstablishments(prev => prev.map(e => e.id === estId ? { ...e, planTier: plan, isPremium: plan !== 'gratuito' } : e));
  };

  const handleAddSuggestedSpace = (space: Omit<SuggestedSpace, 'id' | 'date' | 'invitedStatus'>) => {
    const newSpace: SuggestedSpace = {
      ...space,
      id: `sug_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      date: new Date().toISOString().replace('T', ' ').substring(0, 16),
      invitedStatus: 'pending'
    };
    setSuggestedSpaces(prev => [newSpace, ...prev]);
  };

  // 12. EXPORT CSV: Generates and triggers browser file save
  const handleExportCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "ID,Nome,Categoria,Cidade,Estado,Especialidades,Verificado,Premium\n";

    establishments.forEach((est) => {
      const row = [
        est.id,
        `"${est.name.replace(/"/g, '""')}"`,
        est.category,
        est.city,
        est.state,
        `"${est.specialties.join(', ')}"`,
        est.claimed ? "Sim" : "Não",
        est.isPremium ? "Sim" : "Não"
      ].join(",");
      csvContent += row + "\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `ceramapa_brasil_base_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleTriggerRoute = (coords: [number, number]) => {
    setCenterCoordinates(coords);
    setActiveTab('mapa');
    // Clear centering after zoom animation
    setTimeout(() => setCenterCoordinates(undefined), 1500);
  };

  const selectedEstablishment = establishments.find(e => e.id === selectedId);
  const isAdmin = currentSession && currentSession.email.toLowerCase() === 'samirarabello.backup@gmail.com';

  return (
    <div className="min-h-screen bg-[#FAF9F5] text-earth-dark flex flex-col antialiased font-sans">
      
      {/* 🟢 TOP MULTI-ENVIRONMENT CONTROL BAR - PLATFORM SEPARATION ARCHITECTURE */}
      {showAdminControlBar && (
        <div className="bg-earth-dark text-white text-[10px] font-bold uppercase tracking-wider px-6 py-2.5 flex flex-wrap justify-between items-center gap-3 border-b border-clay-border/30">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Arquitetura de Segurança Segregada</span>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-earth-gray mr-1">Ambiente Ativo:</span>
            
            <button 
              onClick={() => changePortal('public')}
              className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                activePortal === 'public' 
                  ? 'bg-terracotta text-white shadow-sm' 
                  : 'bg-white/10 text-white/80 hover:bg-white/20'
              }`}
            >
              1. Portal Público
            </button>
            
            <button 
              onClick={() => changePortal('partner')}
              className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                activePortal === 'partner' 
                  ? 'bg-[#E07A5F] text-white shadow-sm' 
                  : 'bg-white/10 text-white/80 hover:bg-white/20'
              }`}
            >
              2. Portal do Parceiro
            </button>
            
            <button 
              onClick={() => changePortal('admin')}
              className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                activePortal === 'admin' 
                  ? 'bg-red-700 text-white shadow-sm' 
                  : 'bg-white/10 text-white/80 hover:bg-white/20'
              }`}
            >
              3. Painel Administrativo 🔐
            </button>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 1. ENVIRONMENT: PORTAL PÚBLICO                             */}
      {/* ========================================================= */}
      {activePortal === 'public' && (
        <>
          {/* HEADER SECTION (Public Visitor Navigation Only - No administrative tools leaked) */}
          <header className="bg-white border-b border-clay-border sticky top-0 z-[1000] px-6 py-4">
            <div className="max-w-7xl mx-auto flex items-center justify-between">
              
              {/* Brand Logo */}
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-terracotta flex items-center justify-center shadow-sm shrink-0">
                  <div className="w-4.5 h-4.5 rounded-sm border-2 border-white transform rotate-12"></div>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-xl font-serif italic font-bold tracking-tight text-earth-dark">
                      Cartografia da <span className="font-light text-terracotta not-italic">Cerâmica</span>
                    </h1>
                    <span className="text-[8px] uppercase font-bold tracking-widest px-2 py-0.5 bg-olive text-white rounded-full font-sans">
                      Público
                    </span>
                  </div>
                  <p className="text-[9px] text-earth-gray font-bold uppercase tracking-widest mt-0.5 font-sans">
                    O Guia Nacional Digital da Cerâmica Autoral
                  </p>
                </div>
              </div>

              {/* Desktop Navigation */}
              <nav className="hidden lg:flex items-center gap-8 text-xs font-bold uppercase tracking-widest">
                <button
                  id="nav-tab-btn-mapa"
                  onClick={() => setActiveTab('mapa')}
                  className={`pb-1 transition-all cursor-pointer ${
                    activeTab === 'mapa' 
                      ? 'text-terracotta border-b-2 border-terracotta' 
                      : 'text-earth-dark/70 hover:text-terracotta'
                  }`}
                >
                  Mapa
                </button>

                <button
                  id="nav-tab-btn-atelies"
                  onClick={() => setActiveTab('atelies')}
                  className={`pb-1 transition-all cursor-pointer ${
                    activeTab === 'atelies' 
                      ? 'text-terracotta border-b-2 border-terracotta' 
                      : 'text-earth-dark/70 hover:text-terracotta'
                  }`}
                >
                  Ateliês
                </button>

                <button
                  id="nav-tab-btn-fornecedores"
                  onClick={() => setActiveTab('fornecedores')}
                  className={`pb-1 transition-all cursor-pointer ${
                    activeTab === 'fornecedores' 
                      ? 'text-terracotta border-b-2 border-terracotta' 
                      : 'text-earth-dark/70 hover:text-terracotta'
                  }`}
                >
                  Fornecedores
                </button>

                <button
                  id="nav-tab-btn-sobre"
                  onClick={() => setActiveTab('sobre')}
                  className={`pb-1 transition-all cursor-pointer ${
                    activeTab === 'sobre' 
                      ? 'text-terracotta border-b-2 border-terracotta' 
                      : 'text-earth-dark/70 hover:text-terracotta'
                  }`}
                >
                  Sobre
                </button>
              </nav>

              {/* Mobile Menu Trigger */}
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="lg:hidden p-2 rounded-xl border border-clay-border text-earth-dark hover:bg-sand-bg cursor-pointer transition-all"
                >
                  {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </button>
              </div>

            </div>
          </header>

          {/* MOBILE NAVIGATION OVERLAY (Public-Only) */}
          <AnimatePresence>
            {mobileMenuOpen && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="lg:hidden bg-white border-b border-clay-border p-5 space-y-2 z-[999] absolute top-[100px] left-0 w-full shadow-lg text-xs font-bold uppercase tracking-widest"
              >
                <button
                  onClick={() => { setActiveTab('mapa'); setMobileMenuOpen(false); }}
                  className={`w-full text-left p-3 rounded-lg block transition-all ${activeTab === 'mapa' ? 'bg-sand-bg text-terracotta' : 'hover:bg-sand-bg/55 text-earth-dark'}`}
                >
                  Mapa
                </button>
                <button
                  onClick={() => { setActiveTab('atelies'); setMobileMenuOpen(false); }}
                  className={`w-full text-left p-3 rounded-lg block transition-all ${activeTab === 'atelies' ? 'bg-sand-bg text-terracotta' : 'hover:bg-sand-bg/55 text-earth-dark'}`}
                >
                  Ateliês
                </button>
                <button
                  onClick={() => { setActiveTab('fornecedores'); setMobileMenuOpen(false); }}
                  className={`w-full text-left p-3 rounded-lg block transition-all ${activeTab === 'fornecedores' ? 'bg-sand-bg text-terracotta' : 'hover:bg-sand-bg/55 text-earth-dark'}`}
                >
                  Fornecedores
                </button>
                <button
                  onClick={() => { setActiveTab('sobre'); setMobileMenuOpen(false); }}
                  className={`w-full text-left p-3 rounded-lg block transition-all ${activeTab === 'sobre' ? 'bg-sand-bg text-terracotta' : 'hover:bg-sand-bg/55 text-earth-dark'}`}
                >
                  Sobre
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* MAIN PUBLIC STAGE */}
          <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-5 flex flex-col min-h-0">
            {activeTab === 'mapa' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 flex-1 min-h-[500px] lg:h-[calc(100vh-180px)]">
                
                {/* Search & Filter bar: 4 cols */}
                <div className="lg:col-span-4 flex flex-col gap-4 min-h-[400px] lg:h-full overflow-hidden pr-0 lg:pr-1">
                  <SearchDiscover
                    establishments={establishments}
                    onSelectEstablishment={(id) => { setSelectedId(id); setIsProfileDrawerOpen(false); }}
                    selectedId={selectedId}
                    filters={filters}
                    onFilterChange={setFilters}
                    userCoords={userCoords}
                    onToggleUserCoords={handleToggleUserCoords}
                    onCenterMap={(coords) => setCenterCoordinates(coords)}
                    mapClickedCoords={mapClickedCoords}
                    onClearMapClick={() => setMapClickedCoords(null)}
                  />
                </div>

                {/* Leaflet Map: 5 or 8 cols */}
                <div className={`h-[400px] lg:h-full relative overflow-hidden rounded-2xl border border-clay-border shadow-inner ${(selectedId && isProfileDrawerOpen) ? 'lg:col-span-5' : 'lg:col-span-8'}`}>
                  <MapComponent 
                    establishments={filteredEstablishments} 
                    selectedId={selectedId}
                    onSelectEstablishment={(id) => {
                      setSelectedId(id);
                      setIsProfileDrawerOpen(false);
                    }}
                    centerCoordinates={centerCoordinates}
                    onMapClick={(coords) => {
                      setMapClickedCoords(coords);
                      setCenterCoordinates(coords);
                    }}
                  />

                  {/* Floating Map Card Overlay */}
                  {selectedId && selectedEstablishment && !isProfileDrawerOpen && (
                    <MapCard 
                      establishment={selectedEstablishment}
                      onClose={() => setSelectedId(null)}
                      onOpenProfile={() => {
                        const activeTier = selectedEstablishment.planTier || (selectedEstablishment.isPremium ? 'atelie' : 'gratuito');
                        if (activeTier !== 'gratuito') {
                          setIsProfileDrawerOpen(true);
                        }
                      }}
                      onClaimProfile={() => {
                        setIsProfileDrawerOpen(true);
                      }}
                      plans={plans}
                    />
                  )}
                </div>

                {/* Sliding Profile Drawer */}
                {selectedId && selectedEstablishment && isProfileDrawerOpen && (
                  <div className="lg:col-span-3 h-[500px] lg:h-full overflow-hidden animate-slideLeft">
                    <ProfileDetails 
                      establishment={selectedEstablishment} 
                      onClose={() => {
                        setIsProfileDrawerOpen(false);
                        setSelectedId(null);
                      }}
                      onAddReview={handleAddReview}
                      onClaimProfile={handleClaimProfile}
                      onTriggerRoute={handleTriggerRoute}
                      plans={plans}
                      currentSession={currentSession}
                    />
                  </div>
                )}
              </div>
            )}

            {activeTab === 'atelies' && (
              <div className="space-y-6 py-4 animate-fadeIn">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-clay-border pb-5">
                  <div>
                    <h2 className="text-2xl font-serif italic font-bold text-earth-dark">Ateliês de Cerâmica</h2>
                    <p className="text-xs text-earth-gray">Explore os ateliês de cerâmica autoral, escolas e artistas catalogados.</p>
                  </div>
                  <div className="relative">
                    <input 
                      type="text"
                      placeholder="Buscar por nome, cidade ou especialidade..."
                      value={ateliesSearch}
                      onChange={(e) => setAteliesSearch(e.target.value)}
                      className="w-full md:w-80 px-4 py-2.5 bg-white border-2 border-clay-border rounded-xl text-xs focus:border-terracotta focus:outline-none"
                    />
                  </div>
                </div>

                {filteredAteliesList.length === 0 ? (
                  <div className="text-center py-12 bg-white rounded-2xl border border-clay-border p-8">
                    <p className="text-sm text-earth-gray">Nenhum ateliê encontrado para a busca realizada.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredAteliesList.map(est => (
                      <div key={est.id} className="bg-white rounded-2xl border-2 border-clay-border hover:border-terracotta p-5 flex flex-col justify-between shadow-sm transition-all">
                        <div className="space-y-3">
                          <div className="aspect-video w-full rounded-xl overflow-hidden bg-sand-bg border border-clay-border">
                            <img src={est.photo} alt={est.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          </div>
                          <div>
                            <span className="text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-sand-card text-terracotta">
                              {est.category}
                            </span>
                            <h3 className="text-lg font-serif italic font-bold text-earth-dark mt-1 leading-tight">{est.name}</h3>
                            <p className="text-xs text-earth-gray flex items-center gap-1 mt-1">
                              <MapPin className="w-3.5 h-3.5 text-terracotta" />
                              {est.city} - {est.state} {est.neighborhood ? `(${est.neighborhood})` : ''}
                            </p>
                          </div>
                          <p className="text-xs text-gray-600 line-clamp-3 leading-relaxed">{est.description}</p>
                          <div className="flex flex-wrap gap-1">
                            {est.specialties.slice(0, 3).map(s => (
                              <span key={s} className="px-2 py-0.5 rounded bg-gray-50 border border-gray-100 text-[10px] text-gray-600">
                                {s}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div className="mt-5 pt-4 border-t border-clay-border/40 flex items-center justify-between gap-3">
                          <span className="text-[10px] font-mono text-earth-gray font-bold uppercase tracking-wider">
                            Cadastro Colaborativo
                          </span>
                          <button 
                            onClick={() => {
                              setSelectedId(est.id);
                              setCenterCoordinates(est.coordinates);
                              setActiveTab('mapa');
                              setIsProfileDrawerOpen(true);
                            }}
                            className="px-4 py-2 bg-terracotta hover:bg-sienna text-white text-xs font-bold rounded-xl transition-all shadow-sm uppercase tracking-wider cursor-pointer"
                          >
                            Ver no Mapa
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'fornecedores' && (
              <div className="space-y-6 py-4 animate-fadeIn">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-clay-border pb-5">
                  <div>
                    <h2 className="text-2xl font-serif italic font-bold text-earth-dark">Fornecedores de Insumos</h2>
                    <p className="text-xs text-earth-gray">Encontre lojas de argilas, esmaltes, ferramentas, fornos e serviços cerâmicos.</p>
                  </div>
                  <div className="relative">
                    <input 
                      type="text"
                      placeholder="Buscar por nome, cidade ou especialidade..."
                      value={fornecedoresSearch}
                      onChange={(e) => setFornecedoresSearch(e.target.value)}
                      className="w-full md:w-80 px-4 py-2.5 bg-white border-2 border-clay-border rounded-xl text-xs focus:border-terracotta focus:outline-none"
                    />
                  </div>
                </div>

                {filteredFornecedoresList.length === 0 ? (
                  <div className="text-center py-12 bg-white rounded-2xl border border-clay-border p-8">
                    <p className="text-sm text-earth-gray">Nenhum fornecedor encontrado para a busca realizada.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredFornecedoresList.map(est => (
                      <div key={est.id} className="bg-white rounded-2xl border-2 border-clay-border hover:border-terracotta p-5 flex flex-col justify-between shadow-sm transition-all">
                        <div className="space-y-3">
                          <div className="aspect-video w-full rounded-xl overflow-hidden bg-sand-bg border border-clay-border">
                            <img src={est.photo} alt={est.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          </div>
                          <div>
                            <span className="text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-sand-card text-terracotta">
                              {est.category}
                            </span>
                            <h3 className="text-lg font-serif italic font-bold text-earth-dark mt-1 leading-tight">{est.name}</h3>
                            <p className="text-xs text-earth-gray flex items-center gap-1 mt-1">
                              <MapPin className="w-3.5 h-3.5 text-terracotta" />
                              {est.city} - {est.state} {est.neighborhood ? `(${est.neighborhood})` : ''}
                            </p>
                          </div>
                          <p className="text-xs text-gray-600 line-clamp-3 leading-relaxed">{est.description}</p>
                          <div className="flex flex-wrap gap-1">
                            {est.specialties.slice(0, 3).map(s => (
                              <span key={s} className="px-2 py-0.5 rounded bg-gray-50 border border-gray-100 text-[10px] text-gray-600">
                                {s}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div className="mt-5 pt-4 border-t border-clay-border/40 flex items-center justify-between gap-3">
                          <span className="text-[10px] font-mono text-earth-gray font-bold uppercase tracking-wider">
                            Fornecedor Homologado
                          </span>
                          <button 
                            onClick={() => {
                              setSelectedId(est.id);
                              setCenterCoordinates(est.coordinates);
                              setActiveTab('mapa');
                              setIsProfileDrawerOpen(true);
                            }}
                            className="px-4 py-2 bg-terracotta hover:bg-sienna text-white text-xs font-bold rounded-xl transition-all shadow-sm uppercase tracking-wider cursor-pointer"
                          >
                            Ver no Mapa
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'sobre' && (
              <div className="max-w-3xl mx-auto py-8 px-4 space-y-8 animate-fadeIn text-earth-dark font-sans">
                <div className="text-center space-y-3">
                  <div className="w-16 h-16 rounded-full bg-terracotta flex items-center justify-center shadow-md mx-auto">
                    <Flame className="w-8 h-8 text-white" />
                  </div>
                  <h2 className="text-3xl font-serif italic font-bold">Cartografia da Cerâmica</h2>
                  <p className="text-sm font-medium text-terracotta tracking-wider uppercase">O Grande Mapa Colaborativo da Cerâmica Brasileira</p>
                </div>

                <div className="bg-white rounded-2xl border-2 border-clay-border p-6 md:p-8 space-y-6 shadow-sm leading-relaxed text-sm">
                  <div className="space-y-4">
                    <h3 className="text-lg font-serif italic font-bold border-b border-clay-border pb-2">Sobre o Projeto</h3>
                    <p>
                      A <strong>Cartografia da Cerâmica</strong> nasceu com o propósito de mapear, integrar e dar visibilidade aos espaços dedicados à cerâmica autoral em todo o Brasil. Somos um guia vivo e colaborativo focado na simplificação do acesso a ateliês, ceramistas, professores e fornecedores de insumos.
                    </p>
                    <p>
                      Neste modelo MVP, focamos na máxima estabilidade e transparência: todo o conteúdo exibido no mapa é atualizado e sincronizado automaticamente a partir do formulário de cadastro do Google Forms, sem barreiras de login, moderações lentas ou complexidades operacionais.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-lg font-serif italic font-bold border-b border-clay-border pb-2">Sincronização e Tratamento de Dados</h3>
                    <p>
                      Nosso sistema possui uma <strong>Camada Dedicada de Tratamento de Dados</strong> que limpa, normaliza e geocodifica os registros inseridos:
                    </p>
                    <ul className="list-disc pl-5 space-y-2 text-gray-700">
                      <li><strong>Validação de Entrada:</strong> Importamos exclusivamente cadastros de quem optou por divulgar seu espaço.</li>
                      <li><strong>Segurança e Privacidade:</strong> Endereços residenciais exatos nunca são expostos no mapa. Os marcadores de localização são posicionados nos bairros correspondentes ou nos centros das cidades para preservar a privacidade de cada ceramista.</li>
                      <li><strong>Padronização Geográfica:</strong> Tratamos inconsistências em nomes de cidades e estados para garantir que todos os marcadores apareçam com precisão matemática.</li>
                      <li><strong>Regra Distrito Federal:</strong> Possuímos uma lógica geográfica exclusiva para o Distrito Federal que interpreta as Regiões Administrativas (RAs) diretamente da planilha, garantindo que nenhum espaço do DF fique invisível ou fora do mapa.</li>
                      <li><strong>Deduplicação Inteligente:</strong> Eliminamos automaticamente registros duplicados, mantendo as informações atualizadas e coesas.</li>
                    </ul>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-lg font-serif italic font-bold border-b border-clay-border pb-2">Como participo?</h3>
                    <p>
                      Para cadastrar o seu espaço, basta preencher o formulário oficial da Cartografia da Cerâmica. Assim que o registro for inserido, nosso sincronizador em segundo plano processará e ativará seu marcador no mapa nacional em instantes!
                    </p>
                    <div className="pt-2 flex flex-col sm:flex-row gap-3">
                      <button 
                        onClick={() => {
                          window.open('https://docs.google.com/spreadsheets/d/1mUr3cwLDMe5DIufp2n5zH8S3955Z58A6lJqq1o0ULYs/edit', '_blank');
                        }}
                        className="px-6 py-3 bg-terracotta hover:bg-sienna text-white text-xs font-bold rounded-xl transition-all shadow-md uppercase tracking-wider cursor-pointer"
                      >
                        Acessar Planilha de Registro
                      </button>
                      <button 
                        onClick={() => {
                          setActiveTab('mapa');
                        }}
                        className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-bold rounded-xl transition-all uppercase tracking-wider cursor-pointer border border-gray-200"
                      >
                        Voltar para o Mapa
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </main>
        </>
      )}

      {/* ========================================================= */}
      {/* 2. ENVIRONMENT: PORTAL DO PARCEIRO                         */}
      {/* ========================================================= */}
      {activePortal === 'partner' && (
        <div className="flex-1 flex flex-col min-h-0 bg-[#F4F1EA]">
          {/* Partner Portal Header */}
          <header className="bg-[#FAF9F5] border-b border-clay-border/50 px-6 py-4 shadow-sm">
            <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-[#E07A5F] flex items-center justify-center shadow-sm shrink-0">
                  <span className="text-white text-xs font-serif font-bold">P</span>
                </div>
                <div>
                  <h1 className="text-lg font-serif font-bold text-earth-dark flex items-center gap-2">
                    Portal do Parceiro
                    <span className="text-[9px] uppercase font-bold bg-[#E07A5F]/15 text-[#E07A5F] border border-[#E07A5F]/30 px-2.5 py-0.5 rounded-full">
                      Área Exclusiva
                    </span>
                  </h1>
                  <p className="text-[10px] text-earth-gray font-mono mt-0.5">
                    {currentSession ? `VINCULADO COM: ${currentSession.email}` : 'AUTENTICAÇÃO EXIGIDA'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                <button
                  onClick={() => changePortal('public')}
                  className="px-4 py-1.5 border border-clay-border text-earth-dark rounded-xl text-xs font-bold hover:bg-white transition-all cursor-pointer"
                >
                  ⬅ Retornar ao Mapa Público
                </button>
                {currentSession && (
                  <button
                    onClick={() => {
                      setCurrentSession(null);
                      changePortal('public');
                    }}
                    className="px-4 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    Desconectar
                  </button>
                )}
              </div>
            </div>
          </header>

          <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 flex flex-col min-h-0">
            {currentSession ? (
              <UserDashboard 
                establishments={establishments}
                onUpdateEstablishment={handleUpdateEstablishment}
                onUpgradeToPremium={handleUpgradeToPremium}
                onAddEventToEstablishment={handleAddEventToEstablishment}
                onAddProductToEstablishment={handleAddProductToEstablishment}
                currentSession={currentSession}
                onAddAuditLog={handleAddAuditLog}
              />
            ) : (
              <div className="max-w-md mx-auto my-12 bg-white rounded-3xl border border-clay-border/40 p-8 text-center shadow-lg animate-fadeIn">
                <div className="w-14 h-14 bg-amber-50 text-[#E07A5F] rounded-full flex items-center justify-center mx-auto mb-5 border border-amber-100">
                  <User className="w-6 h-6" />
                </div>
                <h3 className="font-serif text-xl font-bold text-earth-dark mb-2">Acesso Restrito ao Proprietário</h3>
                <p className="text-earth-gray text-xs mb-6 leading-relaxed">
                  Para gerenciar seu ateliê, sua equipe, vitrine de produtos, eventos e estatísticas, faça login com a conta cadastrada ou reivindique seu perfil no mapa público.
                </p>
                <button
                  onClick={() => { changePortal('public'); setActiveTab('auth'); }}
                  className="w-full py-3 bg-[#E07A5F] hover:bg-[#E07A5F]/95 text-white font-bold text-xs uppercase tracking-widest rounded-xl transition-all shadow-md cursor-pointer"
                >
                  Entrar ou Registrar-se
                </button>
              </div>
            )}
          </main>
        </div>
      )}

      {/* ========================================================= */}
      {/* 3. ENVIRONMENT: PAINEL ADMINISTRATIVO                    */}
      {/* ========================================================= */}
      {activePortal === 'admin' && (
        <div className="flex-1 flex flex-col min-h-0 bg-slate-900 text-slate-100">
          
          {/* Admin Header */}
          <header className="bg-slate-950 border-b border-slate-800 px-6 py-4 shadow-xl">
            <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-red-700 flex items-center justify-center shadow-md shrink-0">
                  <span className="text-white text-xs font-serif font-bold">A</span>
                </div>
                <div>
                  <h1 className="text-lg font-serif font-bold text-white flex items-center gap-2">
                    Painel Executivo Cartografia
                    <span className="text-[9px] uppercase font-bold bg-red-600/20 text-red-400 border border-red-500/30 px-2.5 py-0.5 rounded-full">
                      Admin Corporativo
                    </span>
                  </h1>
                  <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                    {currentSession ? `CONECTADO: ${currentSession.email} (${currentSession.role.toUpperCase()})` : 'MÓDULO DE SEGURANÇA ATIVO'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                <button
                  onClick={() => changePortal('public')}
                  className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer border border-slate-700"
                >
                  ⬅ Retornar ao Mapa Público
                </button>
              </div>
            </div>
          </header>

          <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 flex flex-col min-h-0">
            {/* Strict role validation on client (corresponds with backend 403 rule) */}
            {isAdmin ? (
              <AdminDashboard 
                establishments={establishments}
                onApproveClaim={handleApproveClaim}
                onRejectClaim={handleRejectClaim}
                onTogglePremium={handleTogglePremium}
                onExportCSV={handleExportCSV}
                plans={plans}
                onUpdatePlans={handleUpdatePlans}
                suggestedSpaces={suggestedSpaces}
                onInviteSpace={handleInviteSpace}
                onRemoveSuggestedSpace={handleRemoveSuggestedSpace}
                onUpdateEstablishmentPlan={handleUpdateEstablishmentPlan}
                integrationConfig={integrationConfig}
                onUpdateIntegrationConfig={setIntegrationConfig}
                onManualSyncGoogleSheets={() => syncWithGoogleSheets(integrationConfig, false)}
                syncLogs={syncLogs}
                onUpdateEstablishmentCoords={handleUpdateEstablishmentCoords}
                onUpdateEstablishment={handleUpdateEstablishment}
                currentSession={currentSession}
                auditLogs={auditLogs}
                onAddAuditLog={handleAddAuditLog}
                teamMembers={teamMembers}
                onUpdateTeamMembers={setTeamMembers}
              />
            ) : (
              // HTTP 403 FORBIDDEN PAGE (Security compliant, registers violation automatically)
              <div className="max-w-lg mx-auto my-12 bg-slate-950 rounded-3xl border border-red-900/40 p-8 text-center shadow-2xl animate-fadeIn">
                <div className="w-16 h-16 bg-red-950 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6 border border-red-900/50">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m0-6v2m0-6H9.412a2 2 0 00-1.414.586L4.586 9.412A2 2 0 004 10.828V18a2 2 0 002 2h12a2 2 0 002-2V10.828a2 2 0 00-.586-1.414l-3.414-3.414A2 2 0 0014.586 5H12z"/>
                  </svg>
                </div>
                <h2 className="text-red-500 font-mono text-xs uppercase tracking-widest font-bold mb-1">Erro de Autorização</h2>
                <h3 className="font-serif text-2xl font-bold text-white mb-3">HTTP 403 — Forbidden</h3>
                <p className="text-slate-400 text-xs leading-relaxed mb-6">
                  Seu perfil atual de acesso ({currentSession ? `Papel: ${currentSession.role}` : 'Visitante Anônimo'}) não possui as permissões necessárias para auditar, homologar ou visualizar dados confidenciais do CeraMapa.
                </p>
                
                <div className="bg-red-950/20 rounded-2xl border border-red-900/30 p-4 mb-6 text-left text-[11px] font-mono text-red-400 space-y-1.5">
                  <p>● EVENTO_SEGURANÇA: Tentativa de Invasão de URL Protegida</p>
                  <p>● CONTA: {currentSession ? currentSession.email : 'Anônimo'}</p>
                  <p>● IP: 189.120.45.102 (Log Registrado na Auditoria Perpétua)</p>
                  <p>● DECISÃO: Bloqueado pelo servidor central de autenticação.</p>
                </div>

                <div className="space-y-2">
                  <button
                    onClick={() => { changePortal('public'); setActiveTab('auth'); }}
                    className="w-full py-2.5 bg-red-700 hover:bg-red-800 text-white font-bold text-xs uppercase tracking-widest rounded-xl transition-all shadow-md cursor-pointer"
                  >
                    Identificar-se como Administrador
                  </button>
                  <button
                    onClick={() => changePortal('public')}
                    className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs uppercase tracking-widest rounded-xl transition-all cursor-pointer border border-slate-700"
                  >
                    Retornar ao Portal Público
                  </button>
                </div>
              </div>
            )}
          </main>
        </div>
      )}

      {/* ========================================================= */}
      {/* FOOTER CO-MADE STICKER (Consistent design across environments) */}
      {/* ========================================================= */}
      <footer className="bg-white border-t border-clay-border py-4 px-6 text-[11px] text-earth-gray tracking-wide mt-auto shadow-inner">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex flex-wrap gap-4 items-center justify-center md:justify-start">
            <span className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-earth-dark">
              <span className="w-2.5 h-2.5 rounded-full bg-olive animate-pulse"></span>
              {establishments.length} Registros Ativos
            </span>
            <span className="text-clay-border opacity-60">|</span>
            <span className="italic font-serif">A maior rede de cerâmica autoral do país</span>
          </div>
          
          <div className="flex gap-4 font-bold uppercase tracking-wider text-[9px] text-[#E07A5F]">
            <span>Próximos Eventos:</span>
            <span className="italic font-serif normal-case text-earth-dark font-medium">Workshop Torno (PR)</span>
            <span className="text-clay-border">•</span>
            <span className="italic font-serif normal-case text-earth-dark font-medium">Encontro de Ceramistas (Cunha, SP)</span>
          </div>
        </div>
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-2 pt-3 mt-3 border-t border-clay-border/60 text-[10px] text-earth-gray">
          <p>© 2026 CeraMapa Brasil. Criado colaborativamente por ceramistas, ateliês e escolas do Brasil.</p>
          <div className="flex gap-4 font-bold uppercase tracking-widest text-[9px]">
            <span className="hover:text-[#E07A5F] transition-all cursor-pointer">Termos</span>
            <span className="hover:text-[#E07A5F] transition-all cursor-pointer font-bold">Ambientes Segregados V3.0</span>
            <span className="hover:text-[#E07A5F] transition-all cursor-pointer">Planilha Pública</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
