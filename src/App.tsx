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
  const [activeTab, setActiveTab] = useState<'mapa' | 'agenda' | 'sync' | 'user' | 'store' | 'admin' | 'cadastro' | 'auth'>('mapa');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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

  return (
    <div className="min-h-screen bg-sand-bg text-earth-dark flex flex-col antialiased font-sans">
      
      {/* HEADER SECTION (Inspired by Contemporary Art Museums & Natural Clay Tones) */}
      <header className="bg-white border-b border-clay-border sticky top-0 z-[1000] px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          
          {/* Brand Logo & Slogan */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-terracotta flex items-center justify-center shadow-sm shrink-0">
              <div className="w-4.5 h-4.5 rounded-sm border-2 border-white transform rotate-12"></div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-serif italic font-bold tracking-tight text-earth-dark">
                  Cartografia da <span className="font-light text-terracotta not-italic">Cerâmica</span>
                </h1>
                <span className="text-[8px] uppercase font-bold tracking-widest px-2 py-0.5 bg-terracotta text-white rounded-full font-sans">
                  Colaborativo
                </span>
              </div>
              <p className="text-[9px] text-earth-gray font-bold uppercase tracking-widest mt-0.5 font-sans">
                O Guia Digital da Cerâmica Brasileira
              </p>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-7 text-xs font-bold uppercase tracking-widest">
            <button
              id="nav-tab-btn-mapa"
              onClick={() => setActiveTab('mapa')}
              className={`pb-1 transition-all cursor-pointer ${
                activeTab === 'mapa' 
                  ? 'text-terracotta border-b-2 border-terracotta' 
                  : 'text-earth-dark/70 hover:text-terracotta'
              }`}
            >
              Mapa Nacional
            </button>
            
            <button
              id="nav-tab-btn-agenda"
              onClick={() => setActiveTab('agenda')}
              className={`pb-1 transition-all cursor-pointer ${
                activeTab === 'agenda' 
                  ? 'text-terracotta border-b-2 border-terracotta' 
                  : 'text-earth-dark/70 hover:text-terracotta'
              }`}
            >
              Agenda
            </button>

            {/* Restricted Tab: Sheets - Only for Administrative Team */}
            {(currentSession?.role === 'super_admin' || currentSession?.role === 'admin' || currentSession?.role === 'moderator' || currentSession?.role === 'coordinator') && (
              <button
                id="nav-tab-btn-sync"
                onClick={() => setActiveTab('sync')}
                className={`pb-1 transition-all cursor-pointer ${
                  activeTab === 'sync' 
                    ? 'text-terracotta border-b-2 border-terracotta' 
                    : 'text-earth-dark/70 hover:text-terracotta'
                }`}
              >
                Sheets
              </button>
            )}

            {/* Restricted Tab: Parceiro - Only for Owners or Administrative Team */}
            {(currentSession?.role && currentSession.role !== 'visitor') && (
              <button
                id="nav-tab-btn-user"
                onClick={() => setActiveTab('user')}
                className={`pb-1 transition-all cursor-pointer ${
                  activeTab === 'user' 
                    ? 'text-terracotta border-b-2 border-terracotta' 
                    : 'text-earth-dark/70 hover:text-terracotta'
                }`}
              >
                Parceiro
              </button>
            )}

            <button
              id="nav-tab-btn-store"
              onClick={() => setActiveTab('store')}
              className={`pb-1 transition-all cursor-pointer ${
                activeTab === 'store' 
                  ? 'text-terracotta border-b-2 border-terracotta' 
                  : 'text-earth-dark/70 hover:text-terracotta'
              }`}
            >
              Loja
            </button>

            <button
              id="nav-tab-btn-cadastro"
              onClick={() => setActiveTab('cadastro')}
              className={`pb-1 transition-all cursor-pointer ${
                activeTab === 'cadastro' 
                  ? 'text-terracotta border-b-2 border-terracotta' 
                  : 'text-earth-dark/70 hover:text-terracotta'
              }`}
            >
              Cadastrar Espaço
            </button>

            {/* Restricted Tab: Admin - Only for Administrative Team */}
            {(currentSession?.role === 'super_admin' || currentSession?.role === 'admin' || currentSession?.role === 'moderator' || currentSession?.role === 'coordinator') && (
              <button
                id="nav-tab-btn-admin"
                onClick={() => setActiveTab('admin')}
                className={`pb-1 transition-all cursor-pointer ${
                  activeTab === 'admin' 
                    ? 'text-terracotta border-b-2 border-terracotta font-extrabold' 
                    : 'text-earth-dark/70 hover:text-terracotta'
                }`}
              >
                Admin
              </button>
            )}

            {/* Dynamic Auth Tab trigger */}
            <button
              id="nav-tab-btn-auth"
              onClick={() => setActiveTab('auth')}
              className={`pb-1 transition-all cursor-pointer ${
                activeTab === 'auth' 
                  ? 'text-terracotta border-b-2 border-terracotta font-extrabold' 
                  : 'text-earth-dark/70 hover:text-terracotta'
              }`}
            >
              {currentSession ? 'Meu Perfil' : 'Acesso'}
            </button>
          </nav>

          {/* User Email Badge (Dynamic Session Manager) & Burger Button */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveTab('auth')}
              className="hidden sm:inline font-mono text-[9px] text-sienna bg-sand-bg border border-sand-border px-2.5 py-1 rounded-md font-bold hover:bg-sand-border/30 transition-all cursor-pointer"
              title="Clique para ver o Perfil e Sessão"
            >
              {currentSession ? `${currentSession.email} (${currentSession.role.toUpperCase()})` : 'VISITANTE (ENTRAR)'}
            </button>

            <button 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-xl border border-clay-border text-earth-dark hover:bg-sand-bg cursor-pointer transition-all"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>

        </div>
      </header>

      {/* MOBILE MENU OVERLAY */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="lg:hidden bg-white border-b border-clay-border p-5 space-y-2 z-[999] absolute top-[68px] left-0 w-full shadow-lg text-xs font-bold uppercase tracking-widest"
          >
            <button
              onClick={() => { setActiveTab('mapa'); setMobileMenuOpen(false); }}
              className={`w-full text-left p-3 rounded-lg block transition-all ${activeTab === 'mapa' ? 'bg-sand-bg text-terracotta' : 'hover:bg-sand-bg/55 text-earth-dark'}`}
            >
              Mapa Nacional
            </button>
            <button
              onClick={() => { setActiveTab('cadastro'); setMobileMenuOpen(false); }}
              className={`w-full text-left p-3 rounded-lg block transition-all ${activeTab === 'cadastro' ? 'bg-sand-bg text-terracotta' : 'hover:bg-sand-bg/55 text-earth-dark'}`}
            >
              Cadastrar meu Espaço
            </button>
            <button
              onClick={() => { setActiveTab('agenda'); setMobileMenuOpen(false); }}
              className={`w-full text-left p-3 rounded-lg block transition-all ${activeTab === 'agenda' ? 'bg-sand-bg text-terracotta' : 'hover:bg-sand-bg/55 text-earth-dark'}`}
            >
              Agenda & Cursos
            </button>

            {/* Mobile Sheet Sincronizer */}
            {(currentSession?.role === 'super_admin' || currentSession?.role === 'admin' || currentSession?.role === 'moderator' || currentSession?.role === 'coordinator') && (
              <button
                onClick={() => { setActiveTab('sync'); setMobileMenuOpen(false); }}
                className={`w-full text-left p-3 rounded-lg block transition-all ${activeTab === 'sync' ? 'bg-sand-bg text-terracotta' : 'hover:bg-sand-bg/55 text-earth-dark'}`}
              >
                Sincronizar Sheets
              </button>
            )}

            {/* Mobile Parceiro */}
            {(currentSession?.role && currentSession.role !== 'visitor') && (
              <button
                onClick={() => { setActiveTab('user'); setMobileMenuOpen(false); }}
                className={`w-full text-left p-3 rounded-lg block transition-all ${activeTab === 'user' ? 'bg-sand-bg text-terracotta' : 'hover:bg-sand-bg/55 text-earth-dark'}`}
              >
                Painel do Parceiro
              </button>
            )}

            <button
              onClick={() => { setActiveTab('store'); setMobileMenuOpen(false); }}
              className={`w-full text-left p-3 rounded-lg block transition-all ${activeTab === 'store' ? 'bg-sand-bg text-terracotta' : 'hover:bg-sand-bg/55 text-earth-dark'}`}
            >
              Insumos & Loja
            </button>

            {/* Mobile Admin */}
            {(currentSession?.role === 'super_admin' || currentSession?.role === 'admin' || currentSession?.role === 'moderator' || currentSession?.role === 'coordinator') && (
              <button
                onClick={() => { setActiveTab('admin'); setMobileMenuOpen(false); }}
                className={`w-full text-left p-3 rounded-lg block transition-all ${activeTab === 'admin' ? 'bg-sand-bg text-terracotta' : 'hover:bg-sand-bg/55 text-earth-dark'}`}
              >
                Admin Dashboard
              </button>
            )}

            <button
              onClick={() => { setActiveTab('auth'); setMobileMenuOpen(false); }}
              className={`w-full text-left p-3 rounded-lg block transition-all ${activeTab === 'auth' ? 'bg-sand-bg text-terracotta' : 'hover:bg-sand-bg/55 text-earth-dark'}`}
            >
              {currentSession ? 'Meu Perfil' : 'Acesso / Entrar'}
            </button>
            
            <div className="pt-3 border-t border-clay-border text-center text-sienna font-mono text-[9px] font-bold">
              {currentSession ? currentSession.email : 'VISITANTE'}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MAIN APPLICATION STAGE */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-5 flex flex-col min-h-0">
        
        {/* TAB 1: THE CORE NATIONAL MAP WORKFLOW */}
        {activeTab === 'mapa' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 flex-1 min-h-[500px] lg:h-[calc(100vh-140px)]">
            
            {/* Sidebar Results & Search: 4 cols */}
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

            {/* Interactive Leaflet Map: 5 or 8 cols depending on detail drawer status */}
            <div className={`h-[400px] lg:h-full relative overflow-hidden rounded-2xl border border-clay-border shadow-inner ${(selectedId && isProfileDrawerOpen) ? 'lg:col-span-5' : 'lg:col-span-8'}`}>
              <MapComponent 
                establishments={filteredEstablishments} 
                selectedId={selectedId}
                onSelectEstablishment={(id) => {
                  setSelectedId(id);
                  setIsProfileDrawerOpen(false); // Default to floating card when clicking a marker
                }}
                centerCoordinates={centerCoordinates}
                onMapClick={(coords) => {
                  setMapClickedCoords(coords);
                  setCenterCoordinates(coords);
                }}
              />

              {/* Floating Free/Standard Map Card Overlay */}
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

            {/* Sliding profile detail panel: 3 cols when open */}
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

        {/* OTHER FULL SCREEN NAVIGATION TABS */}
        <div className="flex-1">
          {activeTab === 'cadastro' && (
            <RegistrationForm 
              onAddFormSubmission={handleAddFormSubmission}
              onAddSuggestedSpace={handleAddSuggestedSpace}
              onSuccess={() => {
                // Background cron timer handles autoSync automatically
              }}
            />
          )}

          {activeTab === 'agenda' && (
            <EventCalendar 
              establishments={establishments} 
              onSelectEstablishment={(estId) => {
                setSelectedId(estId);
                setActiveTab('mapa');
                setIsProfileDrawerOpen(false);
              }}
            />
          )}

          {activeTab === 'sync' && (
            <CollaborativeSync 
              sheetRows={sheetRows}
              syncLogs={syncLogs}
              onAddFormSubmission={handleAddFormSubmission}
              onSyncRows={handleSyncRows}
              onMergeRow={handleMergeRow}
              onDeleteRow={handleDeleteRow}
              autoSync={autoSync}
              setAutoSync={setAutoSync}
              syncInterval={syncInterval}
              setSyncInterval={setSyncInterval}
            />
          )}

           {activeTab === 'user' && (
             currentSession && currentSession.role !== 'visitor' ? (
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
               <div className="bg-white rounded-2xl border border-clay-border p-8 text-center max-w-md mx-auto my-12 shadow-sm">
                 <h3 className="font-serif text-xl italic text-earth-dark mb-3">Painel do Parceiro Restrito</h3>
                 <p className="text-earth-gray text-xs mb-6">Esta área é dedicada exclusivamente a proprietários de ateliês, escolas e ceramistas cadastrados.</p>
                 <button
                   onClick={() => setActiveTab('auth')}
                   className="px-5 py-2.5 bg-terracotta hover:bg-terracotta/90 text-white font-bold text-xs uppercase tracking-widest rounded-lg transition-all"
                 >
                   Fazer Login ou Cadastrar-se
                 </button>
               </div>
             )
           )}

           {activeTab === 'store' && (
             <FutureMarketplace />
           )}

           {activeTab === 'auth' && (
             <div className="max-w-xl mx-auto py-8">
               <AuthModule 
                 currentSession={currentSession}
                 onLogin={(session) => {
                   setCurrentSession(session);
                   handleAddAuditLog(
                     'Autenticação Realizada', 
                     `Usuário ${session.name} entrou com sucesso com o perfil de ${session.role.toUpperCase()}.`
                   );
                   if (['super_admin', 'admin', 'moderator', 'coordinator'].includes(session.role)) {
                     setActiveTab('admin');
                   } else {
                     setActiveTab('mapa');
                   }
                 }}
                 onLogout={() => {
                   const prevEmail = currentSession?.email;
                   setCurrentSession(null);
                   handleAddAuditLog(
                     'Logout Realizado', 
                     `Sessão de usuário para ${prevEmail || 'desconhecido'} finalizada.`
                   );
                   setActiveTab('mapa');
                 }}
                 onUpdateSession={(session) => {
                   setCurrentSession(session);
                   handleAddAuditLog(
                     'Perfil Atualizado', 
                     `Informações de perfil do usuário ${session.name} foram atualizadas.`
                   );
                 }}
                 onAddAuditLog={(action, notes) => {
                   handleAddAuditLog(action, notes);
                 }}
               />
             </div>
           )}

           {activeTab === 'admin' && (
             ['super_admin', 'admin', 'moderator', 'coordinator'].includes(currentSession?.role || '') ? (
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
                 
                 // Security, RBAC & Homologation Prop integrations
                 currentSession={currentSession}
                 auditLogs={auditLogs}
                 onAddAuditLog={handleAddAuditLog}
                 teamMembers={teamMembers}
                 onUpdateTeamMembers={setTeamMembers}
               />
             ) : (
               <div className="bg-white rounded-2xl border border-clay-border p-12 text-center max-w-lg mx-auto my-12 shadow-sm">
                 <div className="w-12 h-12 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                   <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                   </svg>
                 </div>
                 <h3 className="font-serif text-2xl italic text-earth-dark mb-3">Acesso Administrativo Restrito</h3>
                 <p className="text-earth-gray text-xs mb-6 max-w-md mx-auto">
                   Esta área contém informações internas de homologação de cadastros, gerenciamento de equipe e logs de auditoria perpétuos da plataforma.
                 </p>
                 <button
                   onClick={() => setActiveTab('auth')}
                   className="px-6 py-3 bg-terracotta hover:bg-terracotta/90 text-white font-bold text-xs uppercase tracking-widest rounded-lg transition-all"
                 >
                   Identificar-se como Administrador
                 </button>
               </div>
             )
           )}
        </div>

      </main>

      {/* FOOTER CO-MADE STICKER */}
      <footer className="bg-white border-t border-clay-border py-4 px-6 text-[11px] text-earth-gray tracking-wide mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex flex-wrap gap-4 items-center justify-center md:justify-start">
            <span className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-earth-dark">
              <span className="w-2.5 h-2.5 rounded-full bg-olive animate-pulse"></span>
              {establishments.length} Registros Ativos
            </span>
            <span className="text-clay-border opacity-60">|</span>
            <span className="italic font-serif">A maior rede de cerâmica autoral do país</span>
          </div>
          
          <div className="flex gap-4 font-bold uppercase tracking-wider text-[9px] text-sienna">
            <span>Próximos Eventos:</span>
            <span className="italic font-serif normal-case text-earth-dark font-medium">Workshop Torno (PR)</span>
            <span className="text-clay-border">•</span>
            <span className="italic font-serif normal-case text-earth-dark font-medium">Encontro de Ceramistas (Cunha, SP)</span>
          </div>
        </div>
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-2 pt-3 mt-3 border-t border-clay-border/60 text-[10px] text-earth-gray">
          <p>© 2026 CeraMapa Brasil. Criado colaborativamente por ceramistas, ateliês e escolas do Brasil.</p>
          <div className="flex gap-4 font-bold uppercase tracking-widest text-[9px]">
            <span className="hover:text-terracotta transition-all cursor-pointer">Termos</span>
            <span className="hover:text-terracotta transition-all cursor-pointer">Privacidade</span>
            <span className="hover:text-terracotta transition-all cursor-pointer">Planilha Pública</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
