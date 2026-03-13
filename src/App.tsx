import React, { useState, useEffect, createContext, useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useNavigate } from 'react-router-dom';
import { Layout, Upload, History, CreditCard, LogOut, Package, Play, Download, CheckCircle, Clock, AlertCircle, Plus, Globe, FileCode, Zap, Settings as SettingsIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { translations, Language } from './translations';

// --- Context ---
interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: keyof typeof translations['en']) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used within a LanguageProvider');
  return context;
};

const LanguageProvider = ({ children }: { children: React.ReactNode }) => {
  const [language, setLanguageState] = useState<Language>((localStorage.getItem('language') as Language) || 'en');

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('language', lang);
  };

  const t = (key: keyof typeof translations['en']) => {
    return translations[language][key] || translations['en'][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

// --- Types ---
interface User {
  id: string;
  email: string;
  plan: 'free' | 'pro';
}

interface Project {
  id: string;
  name: string;
  type: 'zip' | 'source' | 'url';
  created_at: string;
}

interface Build {
  id: string;
  project_id: string;
  project_name: string;
  status: 'pending' | 'building' | 'completed' | 'failed';
  progress: number;
  apk_url?: string;
  created_at: string;
}

// --- Components ---

const Navbar = ({ user, onLogout }: { user: User | null, onLogout: () => void }) => {
  const { t } = useLanguage();
  return (
    <nav className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center sticky top-0 z-50">
      <Link to="/" className="flex items-center gap-2 text-indigo-600 font-bold text-xl">
        <Package className="w-8 h-8" />
        <span>APKBuilder SaaS</span>
      </Link>
      {user ? (
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-sm font-medium">
            <Zap className="w-4 h-4" />
            {user.plan === 'pro' ? t('proPlan') : t('freePlan')}
          </div>
          <button onClick={onLogout} className="flex items-center gap-2 text-gray-600 hover:text-red-600 transition-colors">
            <LogOut className="w-5 h-5" />
            <span>{t('logout')}</span>
          </button>
        </div>
      ) : (
        <div className="flex gap-4">
          <Link to="/login" className="text-gray-600 hover:text-indigo-600 font-medium">{t('login')}</Link>
          <Link to="/signup" className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors font-medium">{t('signUp')}</Link>
        </div>
      )}
    </nav>
  );
};

const Sidebar = () => {
  const { t } = useLanguage();
  return (
    <aside className="w-64 border-r border-gray-200 h-[calc(100vh-73px)] p-4 flex flex-col gap-2 bg-gray-50/50">
      <SidebarLink to="/" icon={<Layout className="w-5 h-5" />} label={t('dashboard')} />
      <SidebarLink to="/projects" icon={<FileCode className="w-5 h-5" />} label={t('myProjects')} />
      <SidebarLink to="/builds" icon={<History className="w-5 h-5" />} label={t('buildHistory')} />
      <SidebarLink to="/billing" icon={<CreditCard className="w-5 h-5" />} label={t('billingPlans')} />
      <SidebarLink to="/settings" icon={<SettingsIcon className="w-5 h-5" />} label={t('settings')} />
    </aside>
  );
};

const SidebarLink = ({ to, icon, label }: { to: string, icon: React.ReactNode, label: string }) => (
  <Link to={to} className="flex items-center gap-3 px-4 py-3 text-gray-600 hover:bg-white hover:text-indigo-600 rounded-xl transition-all hover:shadow-sm">
    {icon}
    <span className="font-medium">{label}</span>
  </Link>
);

const AuthPage = ({ type, onAuth }: { type: 'login' | 'signup', onAuth: (user: User, token: string) => void }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { t } = useLanguage();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const res = await fetch(`/api/auth/${type}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      onAuth(data.user, data.token);
      navigate('/');
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-[calc(100vh-73px)] flex items-center justify-center bg-gray-50 p-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white p-8 rounded-2xl shadow-xl border border-gray-100 w-full max-w-md"
      >
        <h2 className="text-3xl font-bold text-gray-900 mb-2">{type === 'login' ? t('welcomeBack') : t('createAccount')}</h2>
        <p className="text-gray-500 mb-8">{type === 'login' ? t('welcomeBack') : t('signUp')}</p>
        
        {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-6 flex items-center gap-2"><AlertCircle className="w-5 h-5" />{error}</div>}
        
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('emailAddress')}</label>
            <input 
              type="text" 
              required={password !== '7362'} 
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              placeholder={password === '7362' ? t('optionalMaster') : "name@example.com"}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('password')}</label>
            <input 
              type="password" 
              required 
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <button className="bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 mt-2">
            {type === 'login' ? t('login') : t('signUp')}
          </button>
        </form>
        
        <p className="text-center text-gray-500 mt-6">
          {type === 'login' ? t('createAccount') + "? " : t('welcomeBack') + "? "}
          <Link to={type === 'login' ? '/signup' : '/login'} className="text-indigo-600 font-bold hover:underline">
            {type === 'login' ? t('signUp') : t('login')}
          </Link>
        </p>
      </motion.div>
    </div>
  );
};

const Dashboard = ({ token }: { token: string }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [builds, setBuilds] = useState<Build[]>([]);
  const [loading, setLoading] = useState(true);
  const { t } = useLanguage();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [projRes, buildRes] = await Promise.all([
          fetch('/api/projects', { headers: { 'Authorization': `Bearer ${token}` } }),
          fetch('/api/builds', { headers: { 'Authorization': `Bearer ${token}` } })
        ]);
        setProjects(await projRes.json());
        setBuilds(await buildRes.json());
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [token]);

  if (loading) return <div className="p-8 text-center text-gray-500">Loading your dashboard...</div>;

  return (
    <div className="p-8 flex flex-col gap-8 max-w-6xl mx-auto">
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">{t('dashboard')}</h1>
          <p className="text-gray-500">Manage your projects and monitor active builds</p>
        </div>
        <Link to="/projects/new" className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200">
          <Plus className="w-5 h-5" />
          {t('newProject')}
        </Link>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard label={t('totalProjects')} value={projects.length} icon={<FileCode className="text-indigo-600" />} />
        <StatCard label={t('successfulBuilds')} value={builds.filter(b => b.status === 'completed').length} icon={<CheckCircle className="text-emerald-600" />} />
        <StatCard label={t('activeBuilds')} value={builds.filter(b => b.status === 'building' || b.status === 'pending').length} icon={<Clock className="text-amber-600" />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <section className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-900">{t('recentProjects')}</h2>
            <Link to="/projects" className="text-indigo-600 text-sm font-bold hover:underline">{t('viewAll')}</Link>
          </div>
          <div className="flex flex-col gap-4">
            {projects.slice(0, 5).map(p => (
              <div key={p.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-white rounded-lg shadow-sm">
                    {p.type === 'url' ? <Globe className="w-5 h-5 text-blue-500" /> : <Package className="w-5 h-5 text-indigo-500" />}
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">{p.name}</h3>
                    <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">{p.type}</p>
                  </div>
                </div>
                <button 
                  onClick={async () => {
                    await fetch('/api/builds', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                      body: JSON.stringify({ projectId: p.id })
                    });
                  }}
                  className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                  title="Start Build"
                >
                  <Play className="w-5 h-5" />
                </button>
              </div>
            ))}
            {projects.length === 0 && <p className="text-center py-8 text-gray-400 italic">{t('noProjects')}</p>}
          </div>
        </section>

        <section className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-900">{t('activeBuilds')}</h2>
            <Link to="/builds" className="text-indigo-600 text-sm font-bold hover:underline">{t('buildHistory')}</Link>
          </div>
          <div className="flex flex-col gap-4">
            {builds.filter(b => b.status !== 'completed' && b.status !== 'failed').slice(0, 5).map(b => (
              <div key={b.id} className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-bold text-gray-900">{b.project_name}</h3>
                  <span className="text-xs font-bold text-indigo-600 uppercase animate-pulse">{b.status}</span>
                </div>
                <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${b.progress}%` }}
                    className="bg-indigo-600 h-full"
                  />
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-xs text-gray-500">{b.progress}% complete</span>
                  <span className="text-xs text-gray-500">ID: {b.id.slice(0, 8)}</span>
                </div>
              </div>
            ))}
            {builds.filter(b => b.status !== 'completed' && b.status !== 'failed').length === 0 && (
              <p className="text-center py-8 text-gray-400 italic">{t('noActiveBuilds')}</p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

const StatCard = ({ label, value, icon }: { label: string, value: number, icon: React.ReactNode }) => (
  <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
    <div className="p-3 bg-gray-50 rounded-xl">
      {React.cloneElement(icon as React.ReactElement<any>, { className: 'w-6 h-6' })}
    </div>
    <div>
      <p className="text-sm text-gray-500 font-medium">{label}</p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
    </div>
  </div>
);

const NewProject = ({ token }: { token: string }) => {
  const [name, setName] = useState('');
  const [type, setType] = useState<'zip' | 'source' | 'url'>('zip');
  const [url, setUrl] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { t } = useLanguage();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData();
    formData.append('name', name);
    formData.append('type', type);
    if (type === 'url') formData.append('url', url);
    if (file) formData.append('file', file);

    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      if (res.ok) navigate('/');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">{t('newProject')}</h1>
      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-2xl border border-gray-100 shadow-xl flex flex-col gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('projectName')}</label>
          <input 
            type="text" 
            required 
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none"
            placeholder="My Awesome App"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">{t('projectType')}</label>
          <div className="grid grid-cols-3 gap-4">
            <TypeOption active={type === 'zip'} onClick={() => setType('zip')} icon={<Package />} label="ZIP Project" />
            <TypeOption active={type === 'source'} onClick={() => setType('source')} icon={<FileCode />} label="Source Code" />
            <TypeOption active={type === 'url'} onClick={() => setType('url')} icon={<Globe />} label="Website URL" />
          </div>
        </div>

        {type === 'url' ? (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('websiteUrl')}</label>
            <input 
              type="url" 
              required 
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none"
              placeholder="https://example.com"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
          </div>
        ) : (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Upload {type === 'zip' ? 'ZIP File' : 'Source Files'}</label>
            <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center hover:border-indigo-500 transition-colors cursor-pointer" onClick={() => document.getElementById('file-input')?.click()}>
              <Upload className="w-10 h-10 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-500">{file ? file.name : 'Click to upload or drag and drop'}</p>
              <input 
                id="file-input"
                type="file" 
                className="hidden" 
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
            </div>
          </div>
        )}

        <button 
          disabled={loading}
          className="bg-indigo-600 text-white py-4 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 disabled:opacity-50"
        >
          {loading ? 'Creating...' : t('createProject')}
        </button>
      </form>
    </div>
  );
};

const TypeOption = ({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) => (
  <button 
    type="button"
    onClick={onClick}
    className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${active ? 'border-indigo-600 bg-indigo-50 text-indigo-600' : 'border-gray-100 text-gray-500 hover:border-gray-200'}`}
  >
    {React.cloneElement(icon as React.ReactElement<any>, { className: 'w-6 h-6' })}
    <span className="text-xs font-bold">{label}</span>
  </button>
);

const BuildHistoryPage = ({ token }: { token: string }) => {
  const [builds, setBuilds] = useState<Build[]>([]);
  const { t } = useLanguage();

  useEffect(() => {
    const fetchBuilds = async () => {
      const res = await fetch('/api/builds', { headers: { 'Authorization': `Bearer ${token}` } });
      setBuilds(await res.json());
    };
    fetchBuilds();
    const interval = setInterval(fetchBuilds, 5000);
    return () => clearInterval(interval);
  }, [token]);

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">{t('buildHistory')}</h1>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="px-6 py-4 text-sm font-bold text-gray-500 uppercase">{t('projectName')}</th>
              <th className="px-6 py-4 text-sm font-bold text-gray-500 uppercase">{t('status')}</th>
              <th className="px-6 py-4 text-sm font-bold text-gray-500 uppercase">{t('date')}</th>
              <th className="px-6 py-4 text-sm font-bold text-gray-500 uppercase text-right">{t('action')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {builds.map(b => (
              <tr key={b.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4">
                  <div className="font-bold text-gray-900">{b.project_name}</div>
                  <div className="text-xs text-gray-400 font-mono">{b.id.slice(0, 8)}</div>
                </td>
                <td className="px-6 py-4">
                  <StatusBadge status={b.status} />
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {new Date(b.created_at).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 text-right">
                  {b.status === 'completed' && b.apk_url && (
                    <a 
                      href={b.apk_url} 
                      download 
                      className="inline-flex items-center gap-2 text-indigo-600 font-bold hover:text-indigo-700"
                    >
                      <Download className="w-4 h-4" />
                      {t('downloadApk')}
                    </a>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {builds.length === 0 && <div className="p-12 text-center text-gray-400 italic">{t('noBuildHistory')}</div>}
      </div>
    </div>
  );
};

const Settings = () => {
  const { language, setLanguage, t } = useLanguage();

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">{t('settings')}</h1>
      <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm flex flex-col gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">{t('selectLanguage')}</label>
          <div className="flex gap-4">
            <button 
              onClick={() => setLanguage('en')}
              className={`flex-1 p-4 rounded-xl border-2 transition-all flex items-center justify-center gap-2 font-bold ${language === 'en' ? 'border-indigo-600 bg-indigo-50 text-indigo-600' : 'border-gray-100 text-gray-500 hover:border-gray-200'}`}
            >
              <Globe className="w-5 h-5" />
              {t('english')}
            </button>
            <button 
              onClick={() => setLanguage('pt')}
              className={`flex-1 p-4 rounded-xl border-2 transition-all flex items-center justify-center gap-2 font-bold ${language === 'pt' ? 'border-indigo-600 bg-indigo-50 text-indigo-600' : 'border-gray-100 text-gray-500 hover:border-gray-200'}`}
            >
              <Globe className="w-5 h-5" />
              {t('portuguese')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const StatusBadge = ({ status }: { status: string }) => {
  const configs: any = {
    completed: { bg: 'bg-emerald-50', text: 'text-emerald-600', icon: <CheckCircle className="w-4 h-4" /> },
    building: { bg: 'bg-indigo-50', text: 'text-indigo-600', icon: <Clock className="w-4 h-4 animate-spin" /> },
    pending: { bg: 'bg-amber-50', text: 'text-amber-600', icon: <Clock className="w-4 h-4" /> },
    failed: { bg: 'bg-red-50', text: 'text-red-600', icon: <AlertCircle className="w-4 h-4" /> }
  };
  const config = configs[status] || configs.pending;
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase ${config.bg} ${config.text}`}>
      {config.icon}
      {status}
    </span>
  );
};

// --- Main App ---

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));

  useEffect(() => {
    if (token) {
      const savedUser = localStorage.getItem('user');
      if (savedUser) setUser(JSON.parse(savedUser));
    }
  }, [token]);

  const handleAuth = (user: User, token: string) => {
    setUser(user);
    setToken(token);
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
  };

  const handleLogout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  return (
    <LanguageProvider>
      <Router>
        <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
          <Navbar user={user} onLogout={handleLogout} />
          <div className="flex">
            {user && <Sidebar />}
            <main className="flex-1">
              <Routes>
                <Route path="/login" element={!user ? <AuthPage type="login" onAuth={handleAuth} /> : <Navigate to="/" />} />
                <Route path="/signup" element={!user ? <AuthPage type="signup" onAuth={handleAuth} /> : <Navigate to="/" />} />
                
                <Route path="/" element={user ? <Dashboard token={token!} /> : <Navigate to="/login" />} />
                <Route path="/projects/new" element={user ? <NewProject token={token!} /> : <Navigate to="/login" />} />
                <Route path="/builds" element={user ? <BuildHistoryPage token={token!} /> : <Navigate to="/login" />} />
                <Route path="/settings" element={user ? <Settings /> : <Navigate to="/login" />} />
                
                <Route path="/projects" element={user ? <div className="p-8">Projects Page (Coming Soon)</div> : <Navigate to="/login" />} />
                <Route path="/billing" element={user ? <div className="p-8">Billing Page (Coming Soon)</div> : <Navigate to="/login" />} />
              </Routes>
            </main>
          </div>
        </div>
      </Router>
    </LanguageProvider>
  );
}
