import React, { useState, useEffect } from 'react';
import { 
  User, Lock, Mail, Phone, Shield, FileText, CheckCircle2, 
  AlertCircle, Key, RefreshCw, LogOut, Edit3, Save, UserCheck, Smartphone, Eye, EyeOff
} from 'lucide-react';
import { UserSession, UserRole } from '../types';

interface AuthModuleProps {
  currentSession: UserSession | null;
  onLogin: (session: UserSession) => void;
  onLogout: () => void;
  onUpdateSession: (session: UserSession) => void;
  onAddAuditLog: (action: string, notes?: string) => void;
}

export default function AuthModule({ 
  currentSession, 
  onLogin, 
  onLogout, 
  onUpdateSession,
  onAddAuditLog
}: AuthModuleProps) {
  const [mode, setMode] = useState<'login' | 'register' | 'recovery' | 'profile'>('login');
  
  // Form fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [document, setDocument] = useState('');
  const [instagram, setInstagram] = useState('');
  const [requestedRole, setRequestedRole] = useState<UserRole>('owner');
  
  // Dynamic feedback states
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Verification simulations
  const [smsCode, setSmsCode] = useState('');
  const [isSmsSent, setIsSmsSent] = useState(false);

  // Sync mode with session presence
  useEffect(() => {
    if (currentSession) {
      setMode('profile');
    } else if (mode === 'profile') {
      setMode('login');
    }
  }, [currentSession]);

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    if (!email || !password) {
      setError('Por favor, preencha todos os campos.');
      return;
    }

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      
      // Determine role dynamically. If it's the founder's email, automatically make them Super Admin!
      let resolvedRole: UserRole = 'visitor';
      let resolvedName = name || 'Usuário Cerâmico';
      
      if (email.toLowerCase() === 'samirarabello.backup@gmail.com') {
        resolvedRole = 'super_admin';
        resolvedName = 'Samira Rabello (Super Admin)';
      } else if (email.includes('admin')) {
        resolvedRole = 'admin';
        resolvedName = 'Administrador da Equipe';
      } else if (email.includes('moderador')) {
        resolvedRole = 'moderator';
        resolvedName = 'Moderador do Mapa';
      } else if (email.includes('coordenador')) {
        resolvedRole = 'coordinator';
        resolvedName = 'Coordenador Regional';
      } else if (email.includes('proprietario') || email.includes('ateli') || email.includes('studio')) {
        resolvedRole = 'owner';
        resolvedName = 'Proprietário de Ateliê';
      }

      const newSession: UserSession = {
        id: 'usr_' + Math.random().toString(36).substr(2, 9),
        email: email,
        name: resolvedName,
        role: resolvedRole,
        confirmedEmail: email.toLowerCase() === 'samirarabello.backup@gmail.com', // pre-confirm for admin
        confirmedPhone: email.toLowerCase() === 'samirarabello.backup@gmail.com',
        document: document || '123.456.789-00',
        instagram: instagram || '@ceramica_plataforma'
      };

      onLogin(newSession);
      onAddAuditLog('Login de Usuário', `Acesso bem-sucedido. Perfil: ${resolvedRole.toUpperCase()}`);
      setSuccess('Acesso realizado com sucesso!');
    }, 800);
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!email || !name || !password) {
      setError('Por favor, preencha os campos obrigatórios (Nome, E-mail, Senha).');
      return;
    }

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      
      // Automatic detection for founders if they register again
      const resolvedRole: UserRole = email.toLowerCase() === 'samirarabello.backup@gmail.com' ? 'super_admin' : requestedRole;
      
      const newSession: UserSession = {
        id: 'usr_' + Math.random().toString(36).substr(2, 9),
        email,
        name,
        role: resolvedRole,
        confirmedEmail: false, // will require verification in profile tab
        confirmedPhone: false,
        document: document || 'Não informado',
        instagram: instagram || 'Não informado'
      };

      onLogin(newSession);
      onAddAuditLog('Cadastro de Usuário', `Novo usuário registrado como ${resolvedRole.toUpperCase()}`);
      setSuccess('Cadastro realizado com sucesso! Bem-vindo(a) à comunidade.');
    }, 1000);
  };

  const handleRecoverySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!email) {
      setError('Por favor, insira o e-mail cadastrado.');
      return;
    }

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setSuccess('Um link seguro de recuperação foi enviado para o seu e-mail.');
      onAddAuditLog('Recuperação de Senha', `Solicitação de link para o e-mail: ${email}`);
    }, 800);
  };

  const handleUpdateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentSession) return;

    setError('');
    setSuccess('');
    
    const updatedSession: UserSession = {
      ...currentSession,
      name,
      document,
      instagram
    };

    onUpdateSession(updatedSession);
    onAddAuditLog('Atualização de Perfil', `Dados cadastrais atualizados pelo usuário.`);
    setSuccess('Perfil atualizado com sucesso!');
  };

  const simulateEmailConfirmation = () => {
    if (!currentSession) return;
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      const updated: UserSession = {
        ...currentSession,
        confirmedEmail: true
      };
      onUpdateSession(updated);
      onAddAuditLog('Verificação de E-mail', 'E-mail confirmado pelo usuário com sucesso.');
      setSuccess('Seu endereço de e-mail foi verificado com sucesso!');
    }, 600);
  };

  const sendSmsVerification = () => {
    if (!phone) {
      setError('Insira um número de telefone válido.');
      return;
    }
    setIsSmsSent(true);
    setSuccess('Código SMS enviado para o telefone informado! (Simulado: use o código 2026)');
  };

  const verifySmsCode = () => {
    if (smsCode === '2026' && currentSession) {
      const updated: UserSession = {
        ...currentSession,
        confirmedPhone: true
      };
      onUpdateSession(updated);
      onAddAuditLog('Verificação de Telefone', 'Telefone celular validado via token SMS.');
      setSuccess('Telefone confirmado com sucesso!');
      setIsSmsSent(false);
      setSmsCode('');
    } else {
      setError('Código inválido. Digite 2026 para simular.');
    }
  };

  // Pre-load current session parameters when entering profile mode
  useEffect(() => {
    if (currentSession) {
      setName(currentSession.name);
      setDocument(currentSession.document || '');
      setInstagram(currentSession.instagram || '');
    }
  }, [currentSession, mode]);

  // Quick Test Login Assist
  const quickLogin = (role: UserRole, testEmail: string, testName: string) => {
    setError('');
    setSuccess('');
    const newSession: UserSession = {
      id: 'usr_quick_' + role,
      email: testEmail,
      name: testName,
      role: role,
      confirmedEmail: true,
      confirmedPhone: true,
      document: '44.555.666/0001-99',
      instagram: '@ceramica_plataforma'
    };
    onLogin(newSession);
    onAddAuditLog('Acesso Rápido de Testes', `Entrou com perfil simulado de ${role.toUpperCase()}`);
    setSuccess(`Logado dinamicamente como ${testName}!`);
  };

  return (
    <div className="w-full max-w-md mx-auto bg-white border border-clay-border rounded-2xl shadow-xl overflow-hidden animate-fadeIn" id="auth-panel-container">
      
      {/* Visual Identity Header */}
      <div className="p-6 bg-sand-bg border-b border-clay-border/50 text-center relative">
        <div className="absolute top-4 right-4 bg-terracotta/10 text-terracotta text-[9px] font-black uppercase px-2 py-0.5 rounded-full tracking-wider">
          {currentSession ? currentSession.role.replace('_', ' ') : 'PÚBLICO'}
        </div>
        <h2 className="font-serif italic font-bold text-2xl text-earth-dark">Portal CeraMapa</h2>
        <p className="text-xs text-earth-gray mt-1">Conectando ateliês, artesãos e apaixonados por cerâmica</p>
      </div>

      <div className="p-6">
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-xs text-red-800">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <p>{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-2.5 text-xs text-emerald-800">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <p>{success}</p>
          </div>
        )}

        {/* MODE: LOGIN */}
        {mode === 'login' && (
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <h3 className="font-serif font-bold text-base text-earth-dark mb-1">Acessar Conta</h3>
            
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-earth-gray uppercase tracking-wider block">E-mail</label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 w-4 h-4 text-earth-gray/60" />
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu-email@dominio.com"
                  className="w-full pl-9 pr-3 py-2 text-xs bg-sand-bg/20 border border-clay-border rounded-xl focus:outline-none focus:border-terracotta transition-all text-earth-dark"
                />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-bold text-earth-gray uppercase tracking-wider">Senha</label>
                <button 
                  type="button" 
                  onClick={() => setMode('recovery')}
                  className="text-[10px] font-bold text-terracotta hover:underline cursor-pointer"
                >
                  Esqueceu a senha?
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 w-4 h-4 text-earth-gray/60" />
                <input 
                  type={showPassword ? 'text' : 'password'} 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Sua senha secreta"
                  className="w-full pl-9 pr-10 py-2 text-xs bg-sand-bg/20 border border-clay-border rounded-xl focus:outline-none focus:border-terracotta transition-all text-earth-dark"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-earth-gray hover:text-earth-dark"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-terracotta hover:bg-sienna text-white font-bold rounded-xl text-xs transition-all tracking-wider uppercase cursor-pointer flex items-center justify-center gap-2"
            >
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <UserCheck className="w-4 h-4" />}
              <span>Entrar</span>
            </button>

            <div className="text-center pt-2">
              <span className="text-[11px] text-earth-gray">Não possui uma conta? </span>
              <button
                type="button"
                onClick={() => setMode('register')}
                className="text-[11px] font-bold text-terracotta hover:underline cursor-pointer"
              >
                Cadastre-se grátis
              </button>
            </div>
          </form>
        )}

        {/* MODE: REGISTER */}
        {mode === 'register' && (
          <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
            <h3 className="font-serif font-bold text-base text-earth-dark mb-1">Criar Conta na Comunidade</h3>
            
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-earth-gray uppercase tracking-wider block">Nome Completo / Razão Social</label>
              <div className="relative">
                <User className="absolute left-3 top-2.5 w-4 h-4 text-earth-gray/60" />
                <input 
                  type="text" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nome do artista ou do ateliê"
                  className="w-full pl-9 pr-3 py-2 text-xs bg-sand-bg/20 border border-clay-border rounded-xl focus:outline-none focus:border-terracotta transition-all text-earth-dark"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-earth-gray uppercase tracking-wider block">E-mail Principal</label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 w-4 h-4 text-earth-gray/60" />
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ateliê@email.com"
                  className="w-full pl-9 pr-3 py-2 text-xs bg-sand-bg/20 border border-clay-border rounded-xl focus:outline-none focus:border-terracotta transition-all text-earth-dark"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-earth-gray uppercase tracking-wider block">CPF ou CNPJ</label>
                <div className="relative">
                  <FileText className="absolute left-3 top-2.5 w-4 h-4 text-earth-gray/60" />
                  <input 
                    type="text" 
                    value={document}
                    onChange={(e) => setDocument(e.target.value)}
                    placeholder="Documento oficial"
                    className="w-full pl-9 pr-3 py-2 text-xs bg-sand-bg/20 border border-clay-border rounded-xl focus:outline-none focus:border-terracotta transition-all text-earth-dark"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-earth-gray uppercase tracking-wider block">Instagram</label>
                <div className="relative">
                  <Edit3 className="absolute left-3 top-2.5 w-4 h-4 text-earth-gray/60" />
                  <input 
                    type="text" 
                    value={instagram}
                    onChange={(e) => setInstagram(e.target.value)}
                    placeholder="@seu_instagram"
                    className="w-full pl-9 pr-3 py-2 text-xs bg-sand-bg/20 border border-clay-border rounded-xl focus:outline-none focus:border-terracotta transition-all text-earth-dark"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-earth-gray uppercase tracking-wider block">Tipo de Perfil Desejado</label>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <button
                  type="button"
                  onClick={() => setRequestedRole('owner')}
                  className={`p-2 border rounded-xl text-center font-bold transition-all cursor-pointer ${
                    requestedRole === 'owner' ? 'bg-terracotta/10 border-terracotta text-terracotta' : 'bg-white border-clay-border text-earth-dark hover:bg-sand-bg/30'
                  }`}
                >
                  🏡 Ateliê / Artista
                </button>
                <button
                  type="button"
                  onClick={() => setRequestedRole('visitor')}
                  className={`p-2 border rounded-xl text-center font-bold transition-all cursor-pointer ${
                    requestedRole === 'visitor' ? 'bg-terracotta/10 border-terracotta text-terracotta' : 'bg-white border-clay-border text-earth-dark hover:bg-sand-bg/30'
                  }`}
                >
                  👀 Visitante / Aluno
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-earth-gray uppercase tracking-wider block">Senha de Acesso</label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 w-4 h-4 text-earth-gray/60" />
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full pl-9 pr-3 py-2 text-xs bg-sand-bg/20 border border-clay-border rounded-xl focus:outline-none focus:border-terracotta transition-all text-earth-dark"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-sienna hover:bg-earth-dark text-white font-bold rounded-xl text-xs transition-all tracking-wider uppercase cursor-pointer"
            >
              {loading ? 'Processando Cadastro...' : 'Finalizar Cadastro'}
            </button>

            <div className="text-center pt-1">
              <span className="text-[11px] text-earth-gray">Já tem uma conta? </span>
              <button
                type="button"
                onClick={() => setMode('login')}
                className="text-[11px] font-bold text-terracotta hover:underline cursor-pointer"
              >
                Entrar
              </button>
            </div>
          </form>
        )}

        {/* MODE: PASSWORD RECOVERY */}
        {mode === 'recovery' && (
          <form onSubmit={handleRecoverySubmit} className="space-y-4">
            <h3 className="font-serif font-bold text-base text-earth-dark mb-1 flex items-center gap-2">
              <Key className="w-5 h-5 text-terracotta" />
              Recuperar Senha
            </h3>
            <p className="text-[11px] text-earth-gray leading-relaxed">
              Insira o e-mail cadastrado abaixo. Enviaremos um link seguro para alteração imediata da senha de forma segura.
            </p>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-earth-gray uppercase tracking-wider block">E-mail</label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 w-4 h-4 text-earth-gray/60" />
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ateliê@email.com"
                  className="w-full pl-9 pr-3 py-2 text-xs bg-sand-bg/20 border border-clay-border rounded-xl focus:outline-none focus:border-terracotta transition-all text-earth-dark"
                  required
                />
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setMode('login')}
                className="w-1/3 py-2 border border-clay-border hover:bg-sand-bg/30 text-earth-dark font-bold rounded-xl text-xs transition-all cursor-pointer"
              >
                Voltar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="w-2/3 py-2 bg-terracotta hover:bg-sienna text-white font-bold rounded-xl text-xs transition-all cursor-pointer"
              >
                {loading ? 'Enviando...' : 'Enviar Link'}
              </button>
            </div>
          </form>
        )}

        {/* MODE: LOGGED IN USER PROFILE PANEL */}
        {mode === 'profile' && currentSession && (
          <div className="space-y-5">
            <div className="p-4 bg-sand-bg/40 border border-clay-border/50 rounded-2xl flex items-center gap-3">
              <div className="w-10 h-10 bg-terracotta/20 rounded-full flex items-center justify-center text-terracotta font-serif text-lg font-black shrink-0">
                {currentSession.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <h4 className="font-bold text-xs text-earth-dark truncate">{currentSession.name}</h4>
                <p className="text-[10px] text-earth-gray truncate">{currentSession.email}</p>
                <div className="inline-flex items-center gap-1.5 mt-1 bg-sienna/10 text-sienna px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider">
                  <Shield className="w-2.5 h-2.5" />
                  <span>Cargo: {currentSession.role.replace('_', ' ')}</span>
                </div>
              </div>
            </div>

            {/* Verification Status list */}
            <div className="p-4 border border-clay-border rounded-2xl space-y-3">
              <h4 className="text-[10px] font-black uppercase tracking-wider text-earth-gray border-b border-clay-border/30 pb-1 flex items-center justify-between">
                <span>Verificações de Segurança</span>
                <span className="text-[9px] lowercase font-normal italic">fluxo de homologação</span>
              </h4>

              {/* Email confirmation block */}
              <div className="flex justify-between items-center text-xs">
                <div className="flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-earth-gray" />
                  <span className="text-earth-dark font-medium">E-mail Confirmado</span>
                </div>
                {currentSession.confirmedEmail ? (
                  <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100 flex items-center gap-1">
                    🟢 Validado
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={simulateEmailConfirmation}
                    className="text-[9px] font-black uppercase tracking-wider px-2 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition-all cursor-pointer"
                  >
                    Confirmar Agora
                  </button>
                )}
              </div>

              {/* Phone confirmation block */}
              <div className="flex justify-between items-start gap-2 text-xs pt-1 border-t border-sand-bg">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Smartphone className="w-3.5 h-3.5 text-earth-gray" />
                    <span className="text-earth-dark font-medium">Telefone Validado</span>
                  </div>
                  {isSmsSent && (
                    <div className="flex gap-1.5 items-center mt-1.5">
                      <input 
                        type="text" 
                        value={smsCode}
                        onChange={(e) => setSmsCode(e.target.value)}
                        placeholder="Cód: 2026"
                        className="w-16 px-1.5 py-1 text-[10px] bg-white border border-clay-border rounded-lg text-center"
                      />
                      <button
                        type="button"
                        onClick={verifySmsCode}
                        className="p-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold"
                      >
                        OK
                      </button>
                    </div>
                  )}
                </div>
                {currentSession.confirmedPhone ? (
                  <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100 flex items-center gap-1">
                    🟢 Validado
                  </span>
                ) : (
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    {!isSmsSent ? (
                      <div className="flex gap-1">
                        <input
                          type="text"
                          placeholder="Celular"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          className="w-24 px-1.5 py-1 text-[10px] border border-clay-border bg-white rounded-md"
                        />
                        <button
                          type="button"
                          onClick={sendSmsVerification}
                          className="text-[9px] font-black uppercase tracking-wider bg-terracotta hover:bg-sienna text-white px-2 py-1 rounded-lg"
                        >
                          SMS
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setIsSmsSent(false)}
                        className="text-[8px] text-earth-gray underline"
                      >
                        Cancelar
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Editable Profile settings */}
            <form onSubmit={handleUpdateProfile} className="space-y-3">
              <h4 className="text-[10px] font-black uppercase tracking-wider text-earth-gray border-b border-clay-border/30 pb-1">
                Atualizar Cadastro
              </h4>

              <div className="space-y-1">
                <label className="text-[9px] font-bold text-earth-gray uppercase tracking-wider block">Nome do Artista / Ateliê</label>
                <input 
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-clay-border rounded-lg text-earth-dark"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-earth-gray uppercase tracking-wider block">CPF / CNPJ</label>
                  <input 
                    type="text"
                    value={document}
                    onChange={(e) => setDocument(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-clay-border rounded-lg text-earth-dark"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-earth-gray uppercase tracking-wider block">Instagram</label>
                  <input 
                    type="text"
                    value={instagram}
                    onChange={(e) => setInstagram(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-clay-border rounded-lg text-earth-dark"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2 border-t border-clay-border/20">
                <button
                  type="button"
                  onClick={() => {
                    onLogout();
                    onAddAuditLog('Logout de Usuário', 'Sessão encerrada de forma voluntária.');
                  }}
                  className="w-1/3 py-2 border border-red-200 hover:bg-red-50 text-red-600 font-bold rounded-xl text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sair</span>
                </button>
                <button
                  type="submit"
                  className="w-2/3 py-2 bg-sienna hover:bg-earth-dark text-white font-bold rounded-xl text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Salvar Dados</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* QUICK TEST ROLES ASSIST PANEL (ONLY FOR CONVENIENCE) */}
        {!currentSession && (
          <div className="mt-5 pt-4 border-t border-dashed border-clay-border/40">
            <p className="text-[9px] font-bold text-center uppercase tracking-wider text-earth-gray mb-2.5">
              Simulador de Acesso Rápido (Auditoria & Homologação)
            </p>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => quickLogin('super_admin', 'samirarabello.backup@gmail.com', 'Samira Rabello')}
                className="py-1.5 px-2 bg-sienna/5 hover:bg-sienna/10 border border-sienna/20 text-sienna rounded-lg text-[9px] font-black uppercase text-left truncate cursor-pointer"
                title="Acessar como Super Administradora fundadora"
              >
                👑 Super Admin (Samira)
              </button>
              <button
                type="button"
                onClick={() => quickLogin('owner', 'proprietario.ceramica@gmail.com', 'Ateliê Barro Vivo')}
                className="py-1.5 px-2 bg-amber-600/5 hover:bg-amber-600/10 border border-amber-600/20 text-amber-700 rounded-lg text-[9px] font-black uppercase text-left truncate cursor-pointer"
              >
                🏡 Proprietário (Ateliê)
              </button>
              <button
                type="button"
                onClick={() => quickLogin('moderator', 'moderador.mapa@gmail.com', 'Clara Nunes')}
                className="py-1.5 px-2 bg-blue-600/5 hover:bg-blue-600/10 border border-blue-600/20 text-blue-700 rounded-lg text-[9px] font-black uppercase text-left truncate cursor-pointer"
              >
                🔬 Moderador (Clara)
              </button>
              <button
                type="button"
                onClick={() => quickLogin('coordinator', 'coordenador.df@gmail.com', 'Jorge Amado')}
                className="py-1.5 px-2 bg-emerald-600/5 hover:bg-emerald-600/10 border border-emerald-600/20 text-emerald-700 rounded-lg text-[9px] font-black uppercase text-left truncate cursor-pointer"
              >
                🌍 Coordenador (Jorge)
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
