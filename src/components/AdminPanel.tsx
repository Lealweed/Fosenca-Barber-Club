import React, { useState, useEffect, useRef } from 'react';
import {
  Save, Plus, Trash2, X, Image as ImageIcon, Video, Scissors,
  Upload, Check, Lock, LogOut, Mail, Key, Loader2,
  LayoutDashboard, Globe, ImagePlus, Film,
  Users, MessageSquare, Eye, Images, Target, TrendingUp, BellRing,
} from 'lucide-react';
import { createClient, type User } from '@supabase/supabase-js';
import { dashboardFallback, formatCurrency, type DashboardResponse } from '../lib/opsFallback';

const ADMIN_ROLES = new Set(['admin', 'manager']);
const ADMIN_EMAILS = new Set(
  (import.meta.env.VITE_ADMIN_EMAILS || 'techmasterpa@gmail.com')
    .split(',')
    .map((value: string) => value.trim().toLowerCase())
    .filter(Boolean),
);

const isAuthorizedAdmin = (user: User | null | undefined) => {
  if (!user) return false;

  const email = String(user.email || '').trim().toLowerCase();
  const role = String(user.app_metadata?.role || user.user_metadata?.role || '')
    .trim()
    .toLowerCase();

  return ADMIN_ROLES.has(role) || ADMIN_EMAILS.has(email);
};

// ---------------------------------------------------------------------------
// Supabase helper – serverless-safe, NO fetch('/api/...') for mutations
// ---------------------------------------------------------------------------
const getSupabase = async () => {
  let supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  let supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    try {
      const res = await fetch('/api/supabase-config');
      if (res.ok) {
        const cfg = await res.json();
        supabaseUrl = cfg.url;
        supabaseKey = cfg.anonKey;
      }
    } catch (e) {
      console.error('Failed to fetch Supabase config:', e);
    }
  }

  if (!supabaseUrl || !supabaseKey || !supabaseUrl.trim() || !supabaseKey.trim()) {
    throw new Error('Configuração do Supabase ausente. Configure SUPABASE_URL e SUPABASE_ANON_KEY.');
  }
  try { new URL(supabaseUrl); } catch {
    throw new Error(`URL do Supabase inválida: "${supabaseUrl}"`);
  }
  return createClient(supabaseUrl, supabaseKey);
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface AdminProps {
  onClose: () => void;
  initialData: any;
  onUpdate: () => void;
}

type TabId = 'overview' | 'operations' | 'settings' | 'services' | 'media';

const NAV_ITEMS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: 'overview',     label: 'Visão Geral',           icon: LayoutDashboard },
  { id: 'operations',   label: 'Operação & CRM',        icon: Target          },
  { id: 'settings',     label: 'Configurações Globais', icon: Globe           },
  { id: 'services',     label: 'Serviços & Planos',     icon: Scissors        },
  { id: 'media',        label: 'Mídia & Galeria',       icon: ImagePlus       },
];

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs text-zinc-500 uppercase tracking-widest">{label}</label>
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export default function AdminPanel({ onClose, initialData, onUpdate }: AdminProps) {
  // Auth
  const [user, setUser]           = useState<any>(null);
  const [email, setEmail]         = useState('');
  const [password, setPassword]   = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [authError, setAuthError] = useState('');

  // Navigation
  const [activeTab, setActiveTab] = useState<TabId>('overview');

  // Data
  const [settings,     setSettings]     = useState<any>(initialData.settings       || {});
  const [services,     setServices]     = useState<any[]>(initialData.services     || []);
  const [gallery,      setGallery]      = useState<any[]>(initialData.gallery      || []);
  const [videoGallery, setVideoGallery] = useState<any[]>(initialData.video_gallery || []);
  const [opsData, setOpsData] = useState<DashboardResponse>(dashboardFallback);
  const [isLoadingOps, setIsLoadingOps] = useState(false);

  // Saving / uploading flags
  const [isSaving,              setIsSaving]              = useState(false);
  const [saveMsg,               setSaveMsg]               = useState('');
  const [isUploadingHeroVideo,  setIsUploadingHeroVideo]  = useState(false);
  const [isUploadingHeroImage,  setIsUploadingHeroImage]  = useState(false);
  const [isUploadingLogo,       setIsUploadingLogo]       = useState(false);
  const [isUploadingGalleryImg, setIsUploadingGalleryImg] = useState(false);
  const [isUploadingGalleryVid, setIsUploadingGalleryVid] = useState(false);

  // File refs
  const heroVideoRef  = useRef<HTMLInputElement>(null);
  const heroImageRef  = useRef<HTMLInputElement>(null);
  const logoRef       = useRef<HTMLInputElement>(null);
  const galleryImgRef = useRef<HTMLInputElement>(null);
  const galleryVidRef = useRef<HTMLInputElement>(null);

  const fetchOpsData = async () => {
    setIsLoadingOps(true);
    try {
      const res = await fetch('/api/ops/dashboard');
      if (!res.ok) throw new Error('Falha ao carregar operação');
      const json = await res.json();
      setOpsData(json);
    } catch (e) {
      console.error('Ops dashboard fallback:', e);
      setOpsData(dashboardFallback);
    } finally {
      setIsLoadingOps(false);
    }
  };

  // ── Auth check on mount ──────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const sb = await getSupabase();
        const { data: { session } } = await sb.auth.getSession();
        const sessionUser = session?.user ?? null;

        if (sessionUser && !isAuthorizedAdmin(sessionUser)) {
          await sb.auth.signOut();
          setAuthError('Seu usuário autenticado não tem permissão administrativa.');
          setUser(null);
          return;
        }

        setUser(sessionUser);
      } catch (e) { console.error('Auth check failed:', e); }
    })();

    fetchOpsData();
  }, []);

  // ── Login ────────────────────────────────────────────────────────────────
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setAuthError('');
    try {
      const sb = await getSupabase();
      const { data, error } = await sb.auth.signInWithPassword({ email, password });
      if (error) throw error;
      if (!isAuthorizedAdmin(data.user)) {
        await sb.auth.signOut();
        throw new Error('Acesso restrito. Cadastre este e-mail em VITE_ADMIN_EMAILS ou atribua role admin/manager ao usuário.');
      }
      setUser(data.user);
    } catch (err: any) {
      setAuthError(err.message || 'Erro ao fazer login');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    try { const sb = await getSupabase(); await sb.auth.signOut(); } catch (e) { console.error(e); }
    setUser(null);
  };

  // ── Save settings + services (direct Supabase — serverless safe) ─────────
  const flashSave = (msg: string) => {
    setSaveMsg(msg);
    setTimeout(() => setSaveMsg(''), 3500);
  };

  const saveSettingsOnly = async () => {
    const res = await fetch('/api/admin/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ settings }),
    });
    const json = await res.json();
    if (!res.ok || json.error) throw new Error(json.error || `HTTP ${res.status}`);
  };

  const saveServicesOnly = async () => {
    const res = await fetch('/api/admin/services', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ services }),
    });
    const json = await res.json();
    if (!res.ok || json.error) throw new Error(json.error || `HTTP ${res.status}`);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      if (activeTab === 'services') {
        await saveServicesOnly();
        // A aba de serviços também contém configuração de mensagem dos botões de plano.
        await saveSettingsOnly();
      } else {
        await saveSettingsOnly();
      }
      flashSave('✓ Salvo com sucesso!');
      onUpdate();
    } catch (err: any) {
      flashSave('✗ Erro: ' + (err.message || 'Falha ao salvar'));
      alert('Erro ao salvar: ' + (err.message || 'Falha ao salvar'));
    } finally {
      setIsSaving(false);
    }
  };

  // ── Generic Supabase Storage upload ──────────────────────────────────────
  const uploadToStorage = async (file: File, prefix: string): Promise<string> => {
    const sb   = await getSupabase();
    const ext  = file.name.split('.').pop();
    const path = `${prefix}-${Date.now()}.${ext}`;
    const { error } = await sb.storage.from('barber-assets').upload(path, file, {
      cacheControl: '3600',
      upsert: false,
    });
    if (error) throw error;
    const { data: { publicUrl } } = sb.storage.from('barber-assets').getPublicUrl(path);
    return publicUrl;
  };

  const saveGalleryFallback = async (nextGallery: any[]) => {
    const galleryUrls = nextGallery
      .map((item: any) => (typeof item?.url === 'string' ? item.url.trim() : item?.url))
      .filter((url: any) => typeof url === 'string' && url.trim() !== '');

    const nextSettings = {
      ...settings,
      marketing_gallery: JSON.stringify(galleryUrls),
    };

    await fetch('/api/admin/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ settings: nextSettings }),
    });

    setSettings(nextSettings);
  };

  const handleHeroVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setIsUploadingHeroVideo(true);
    try { const url = await uploadToStorage(file, 'hero'); setSettings((p: any) => ({ ...p, hero_video: url })); }
    catch (err: any) { alert('Erro: ' + err.message); }
    finally { setIsUploadingHeroVideo(false); if (heroVideoRef.current) heroVideoRef.current.value = ''; }
  };

  const handleHeroImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setIsUploadingHeroImage(true);
    try { const url = await uploadToStorage(file, 'hero-image'); setSettings((p: any) => ({ ...p, hero_image: url })); }
    catch (err: any) { alert('Erro: ' + err.message); }
    finally { setIsUploadingHeroImage(false); if (heroImageRef.current) heroImageRef.current.value = ''; }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setIsUploadingLogo(true);
    try {
      const url = await uploadToStorage(file, 'logo');
      // Save via API (bypasses Supabase client RLS)
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: { ...settings, logo_url: url } }),
      });
      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.error || `HTTP ${res.status}`);
      setSettings((p: any) => ({ ...p, logo_url: url }));
      flashSave('✓ Logomarca salva com sucesso!');
      onUpdate();
    }
    catch (err: any) { alert('Erro: ' + err.message); }
    finally { setIsUploadingLogo(false); if (logoRef.current) logoRef.current.value = ''; }
  };

  const handleGalleryImgUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setIsUploadingGalleryImg(true);
    try {
      const sb  = await getSupabase();
      const url = await uploadToStorage(file, 'gallery');
      const { data, error } = await sb.from('gallery').insert({ url }).select().single();
      if (error) throw error;
      const nextGallery = [...gallery, data];
      setGallery(nextGallery);
      await saveGalleryFallback(nextGallery);
      onUpdate();
    } catch (err: any) { alert('Erro: ' + err.message); }
    finally { setIsUploadingGalleryImg(false); if (galleryImgRef.current) galleryImgRef.current.value = ''; }
  };

  const handleGalleryVidUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setIsUploadingGalleryVid(true);
    try {
      const sb  = await getSupabase();
      const url = await uploadToStorage(file, 'gallery-video');
      const { data, error } = await sb.from('video_gallery').insert({ url }).select().single();
      if (error) throw error;
      setVideoGallery((p) => [...p, data]);
      onUpdate();
    } catch (err: any) { alert('Erro: ' + err.message); }
    finally { setIsUploadingGalleryVid(false); if (galleryVidRef.current) galleryVidRef.current.value = ''; }
  };

  const handleDeletePhoto = async (id: number) => {
    try {
      const sb = await getSupabase();
      await sb.from('gallery').delete().eq('id', id);
      const nextGallery = gallery.filter((item) => item.id !== id);
      setGallery(nextGallery);
      await saveGalleryFallback(nextGallery);
      onUpdate();
    } catch (err: any) { alert('Erro: ' + err.message); }
  };

  const handleDeleteVideo = async (id: number) => {
    try {
      const sb = await getSupabase();
      await sb.from('video_gallery').delete().eq('id', id);
      setVideoGallery((p) => p.filter((item) => item.id !== id));
      onUpdate();
    } catch (err: any) { alert('Erro: ' + err.message); }
  };

  // ==========================================================================
  // LOGIN SCREEN
  // ==========================================================================
  if (!user) {
    return (
      <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="relative bg-zinc-900 border border-gold/30 p-8 rounded-2xl shadow-2xl w-full max-w-md">
          <button onClick={onClose} className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
          <div className="flex flex-col items-center mb-8">
            <div className="bg-gold/10 p-4 rounded-full mb-4 ring-1 ring-gold/30">
              <Lock className="w-8 h-8 text-gold" />
            </div>
            <h2 className="text-2xl font-serif font-bold text-gold">Acesso Restrito</h2>
            <p className="text-zinc-400 text-sm text-center mt-2">
              Identifique-se para acessar o painel administrativo.
            </p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <Field label="E-mail">
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 w-4 h-4 text-zinc-500" />
                <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  className="admin-input pl-9" placeholder="seu@email.com" />
              </div>
            </Field>
            <Field label="Senha">
              <div className="relative">
                <Key className="absolute left-3 top-2.5 w-4 h-4 text-zinc-500" />
                <input required type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                  className="admin-input pl-9" placeholder="••••••••" />
              </div>
            </Field>
            {authError && (
              <div className="bg-red-500/10 border border-red-500/40 text-red-400 p-3 rounded-lg text-sm">{authError}</div>
            )}
            <button type="submit" disabled={isLoggingIn}
              className="w-full bg-gold text-zinc-950 py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-gold/90 transition-all shadow-lg shadow-gold/20 disabled:opacity-50">
              {isLoggingIn ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
              Entrar no Painel
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ==========================================================================
  // DASHBOARD METRICS
  // ==========================================================================
  const totalServices = services.length;
  const totalPhotos = gallery.length;
  const hasHeroVideo = typeof settings?.hero_video === 'string' && settings.hero_video.trim() !== '';
  const totalVideos = videoGallery.length + (hasHeroVideo ? 1 : 0);
  const hasLogo = settings?.logo_url ? 1 : 0;

  const METRIC_CARDS = [
    { label: 'Planos Ativos',       value: totalServices, icon: Users,         gradient: 'from-blue-500/20 to-blue-500/5',       iconColor: 'text-blue-400',    border: 'border-blue-500/20'    },
    { label: 'Fotos na Galeria',    value: totalPhotos,   icon: Images,        gradient: 'from-yellow-500/20 to-yellow-500/5',   iconColor: 'text-yellow-400',  border: 'border-yellow-500/20'  },
    { label: 'Vídeos (Galeria + Hero)', value: totalVideos, icon: Film,        gradient: 'from-emerald-500/20 to-emerald-500/5', iconColor: 'text-emerald-400', border: 'border-emerald-500/20' },
    { label: 'Branding Configurado',value: hasLogo,       icon: Eye,           gradient: 'from-gold/20 to-gold/5',               iconColor: 'text-gold',        border: 'border-gold/20'        },
  ];

  const opsSummary = {
    totalTarget: opsData.barbers.reduce((sum, item) => sum + (item.targetTotal || 0), 0),
    totalRealized: opsData.barbers.reduce((sum, item) => sum + (item.realizedMonth || 0), 0),
    totalGap: opsData.barbers.reduce((sum, item) => sum + (item.gapRemaining || 0), 0),
    pendingConfirmations: opsData.confirmations.filter((item) => item.status === 'pending').length,
  };
  const appbarber = opsData.appbarber || dashboardFallback.appbarber;
  const appbarberSummary = appbarber?.summary;

  // ==========================================================================
  // FULL-SCREEN DASHBOARD
  // ==========================================================================
  return (
    <div className="fixed inset-0 z-[100] bg-zinc-950 flex overflow-hidden text-zinc-100">

      {/* ══════════════ SIDEBAR ══════════════ */}
      <aside className="w-64 flex-shrink-0 bg-zinc-900 border-r border-zinc-800 flex flex-col h-full overflow-hidden">
        {/* Brand */}
        <div className="px-5 py-6 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="bg-gold/10 p-2.5 rounded-xl ring-1 ring-gold/20">
              <Scissors className="w-5 h-5 text-gold" />
            </div>
            <div>
              <p className="text-[10px] text-zinc-500 uppercase tracking-widest leading-none">Painel Admin</p>
              <p className="text-gold font-serif font-bold text-base italic mt-0.5 leading-none">Fonseca Barber</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setActiveTab(id)}
              className={[
                'w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all text-left',
                activeTab === id
                  ? 'bg-gold text-zinc-950 shadow-lg shadow-gold/20 font-semibold'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800',
              ].join(' ')}>
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
            </button>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-3 border-t border-zinc-800 space-y-1.5">
          <div className="px-4 py-2 rounded-xl bg-zinc-800/60">
            <p className="text-xs text-zinc-500 truncate">{user?.email}</p>
          </div>
          <button onClick={handleLogout}
            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 rounded-xl transition-all">
            <LogOut className="w-4 h-4" /> Sair da conta
          </button>
        </div>
      </aside>

      {/* ══════════════ MAIN AREA ══════════════ */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Top bar */}
        <header className="flex-shrink-0 flex items-center justify-between px-8 py-4 border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-sm">
          <h1 className="text-base font-semibold text-white">
            {NAV_ITEMS.find((n) => n.id === activeTab)?.label}
          </h1>
          <div className="flex items-center gap-3">
            {saveMsg && (
              <span className={`text-xs px-3 py-1.5 rounded-full font-medium ${saveMsg.startsWith('✗') ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                {saveMsg}
              </span>
            )}
            {(activeTab === 'settings' || activeTab === 'services') && (
              <button onClick={handleSave} disabled={isSaving}
                className="bg-gold text-zinc-950 px-5 py-2 rounded-full font-bold text-sm flex items-center gap-2 hover:bg-gold/80 transition-all disabled:opacity-50 shadow-md shadow-gold/20">
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {isSaving ? 'Salvando...' : 'Salvar'}
              </button>
            )}
            <button onClick={onClose}
              className="p-2 hover:bg-zinc-800 rounded-full transition-all text-zinc-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Scrollable content */}
        <main className="flex-1 overflow-y-auto p-8">

          {/* ──────────── TAB: VISÃO GERAL ──────────── */}
          {activeTab === 'overview' && (
            <div className="space-y-8 max-w-5xl">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
                {METRIC_CARDS.map((card, i) => (
                  <div key={i} className={`bg-gradient-to-br ${card.gradient} border ${card.border} rounded-2xl p-5 flex flex-col gap-4`}>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-zinc-500 uppercase tracking-widest leading-tight">{card.label}</span>
                      <card.icon className={`w-4 h-4 flex-shrink-0 ${card.iconColor}`} />
                    </div>
                    <p className={`text-3xl font-bold tracking-tight ${card.iconColor}`}>{card.value}</p>
                  </div>
                ))}
              </div>

              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
                <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
                  <h2 className="font-semibold text-sm">Resumo de Marketing</h2>
                  <span className="text-xs text-gold">Foco em vitrine e conteúdo</span>
                </div>
                <div className="grid md:grid-cols-3 gap-4 p-6">
                  <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
                    <p className="text-xs text-zinc-500 uppercase tracking-widest mb-2">Conteúdo Principal</p>
                    <p className="text-sm text-zinc-200">Mantenha logo, hero e links sociais sempre atualizados.</p>
                  </div>
                  <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
                    <p className="text-xs text-zinc-500 uppercase tracking-widest mb-2">Portfólio Visual</p>
                    <p className="text-sm text-zinc-200">Publique fotos e vídeos que reforcem posicionamento premium.</p>
                  </div>
                  <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
                    <p className="text-xs text-zinc-500 uppercase tracking-widest mb-2">Oferta Comercial</p>
                    <p className="text-sm text-zinc-200">Mostre planos claros com preço e benefício objetivo.</p>
                  </div>
                </div>
              </div>

              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
                <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
                  <div>
                    <h2 className="font-semibold text-sm">Resultado operacional</h2>
                    <p className="text-xs text-zinc-500 mt-1">Metas, agenda e financeiro conectados ao AppBarber</p>
                  </div>
                  <button
                    onClick={fetchOpsData}
                    className="text-xs px-3 py-1.5 rounded-full bg-zinc-800 text-zinc-200 hover:bg-zinc-700 transition-all"
                  >
                    {isLoadingOps ? 'Atualizando...' : 'Atualizar'}
                  </button>
                </div>
                <div className="grid md:grid-cols-4 gap-4 p-6">
                  <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
                    <p className="text-xs text-zinc-500 uppercase tracking-widest mb-2">Meta mensal</p>
                    <p className="text-lg font-bold text-cyan-300">{formatCurrency(opsSummary.totalTarget)}</p>
                  </div>
                  <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
                    <p className="text-xs text-zinc-500 uppercase tracking-widest mb-2">Realizado</p>
                    <p className="text-lg font-bold text-emerald-300">{formatCurrency(opsSummary.totalRealized)}</p>
                  </div>
                  <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
                    <p className="text-xs text-zinc-500 uppercase tracking-widest mb-2">Gap</p>
                    <p className="text-lg font-bold text-amber-300">{formatCurrency(opsSummary.totalGap)}</p>
                  </div>
                  <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
                    <p className="text-xs text-zinc-500 uppercase tracking-widest mb-2">Pendências WhatsApp</p>
                    <p className="text-lg font-bold text-violet-300">{opsSummary.pendingConfirmations}</p>
                  </div>
                </div>
                {appbarberSummary && (
                  <div className="grid md:grid-cols-4 gap-4 px-6 pb-6">
                    <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
                      <p className="text-xs text-zinc-500 uppercase tracking-widest mb-2">Agenda mês</p>
                      <p className="text-lg font-bold text-cyan-300">{appbarberSummary.monthAppointments}</p>
                    </div>
                    <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
                      <p className="text-xs text-zinc-500 uppercase tracking-widest mb-2">Agenda hoje</p>
                      <p className="text-lg font-bold text-emerald-300">{appbarberSummary.todayAppointments}</p>
                    </div>
                    <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
                      <p className="text-xs text-zinc-500 uppercase tracking-widest mb-2">Receita agenda</p>
                      <p className="text-lg font-bold text-amber-300">{formatCurrency(appbarberSummary.monthScheduledRevenue)}</p>
                    </div>
                    <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
                      <p className="text-xs text-zinc-500 uppercase tracking-widest mb-2">Saldo financeiro</p>
                      <p className="text-lg font-bold text-violet-300">{formatCurrency(appbarberSummary.financialBalance)}</p>
                    </div>
                  </div>
                )}
                <div className="px-6 pb-6 flex flex-wrap gap-3">
                  <a href="/app/meta-barbeiro" className="px-4 py-2 rounded-full bg-gold text-zinc-950 text-sm font-bold hover:bg-gold/80 transition-all">
                    Abrir painel completo
                  </a>
                  <a href="/app/clientes/1" className="px-4 py-2 rounded-full border border-zinc-700 text-sm font-medium hover:bg-zinc-800 transition-all">
                    Abrir CRM 360
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* ──────────── TAB: OPERAÇÃO & CRM ──────────── */}
          {activeTab === 'operations' && (
            <div className="space-y-6 max-w-6xl">
              {appbarberSummary && (
                <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-sm font-semibold">Central de Inteligência AppBarber</h3>
                      <p className="text-xs text-zinc-500 mt-1">Agenda, catálogo, equipe e financeiro vindos da API oficial</p>
                    </div>
                    <span className="text-[10px] px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-300 font-semibold uppercase">
                      AppBarber online
                    </span>
                  </div>

                  <div className="grid md:grid-cols-4 gap-4">
                    <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
                      <p className="text-xs text-zinc-500 uppercase tracking-widest mb-2">Serviços</p>
                      <p className="text-2xl font-bold text-cyan-300">{appbarberSummary.servicesCount}</p>
                    </div>
                    <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
                      <p className="text-xs text-zinc-500 uppercase tracking-widest mb-2">Profissionais</p>
                      <p className="text-2xl font-bold text-emerald-300">{appbarberSummary.professionalsCount}</p>
                    </div>
                    <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
                      <p className="text-xs text-zinc-500 uppercase tracking-widest mb-2">Ticket médio</p>
                      <p className="text-2xl font-bold text-amber-300">{formatCurrency(appbarberSummary.averageTicket)}</p>
                    </div>
                    <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
                      <p className="text-xs text-zinc-500 uppercase tracking-widest mb-2">Assinaturas agenda</p>
                      <p className="text-2xl font-bold text-violet-300">{appbarberSummary.subscriptionAppointments}</p>
                    </div>
                  </div>

                  <div className="grid xl:grid-cols-2 gap-4">
                    <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
                      <p className="text-xs text-zinc-500 uppercase tracking-widest mb-3">Equipe no mês</p>
                      <div className="space-y-2">
                        {(appbarber?.professionals || []).slice(0, 6).map((professional) => (
                          <div key={`${professional.code}-${professional.name}`} className="flex items-center justify-between gap-3 text-sm">
                            <span className="truncate text-zinc-200">{professional.name}</span>
                            <span className="text-zinc-400">{professional.appointments} ag. • {formatCurrency(professional.revenue)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
                      <p className="text-xs text-zinc-500 uppercase tracking-widest mb-3">Próximos horários</p>
                      <div className="space-y-2">
                        {(appbarber?.nextAppointments || []).slice(0, 6).map((appointment) => (
                          <div key={appointment.id} className="flex items-center justify-between gap-3 text-sm">
                            <span className="truncate text-zinc-200">{appointment.clientName}</span>
                            <span className="text-zinc-400">{appointment.date} {appointment.time}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </section>
              )}

              <div className="grid md:grid-cols-4 gap-4">
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs text-zinc-500 uppercase tracking-widest">Meta mensal</span>
                    <Target className="w-4 h-4 text-cyan-300" />
                  </div>
                  <p className="text-2xl font-bold text-cyan-300">{formatCurrency(opsSummary.totalTarget)}</p>
                </div>
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs text-zinc-500 uppercase tracking-widest">Realizado</span>
                    <TrendingUp className="w-4 h-4 text-emerald-300" />
                  </div>
                  <p className="text-2xl font-bold text-emerald-300">{formatCurrency(opsSummary.totalRealized)}</p>
                </div>
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs text-zinc-500 uppercase tracking-widest">Gap restante</span>
                    <BellRing className="w-4 h-4 text-amber-300" />
                  </div>
                  <p className="text-2xl font-bold text-amber-300">{formatCurrency(opsSummary.totalGap)}</p>
                </div>
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs text-zinc-500 uppercase tracking-widest">Confirmações pendentes</span>
                    <MessageSquare className="w-4 h-4 text-violet-300" />
                  </div>
                  <p className="text-2xl font-bold text-violet-300">{opsSummary.pendingConfirmations}</p>
                </div>
              </div>

              <div className="grid xl:grid-cols-[1.2fr_0.8fr] gap-6">
                <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-semibold">Performance por barbeiro</h3>
                      <p className="text-xs text-zinc-500 mt-1">Metas inteligentes e plano de ação</p>
                    </div>
                    <button onClick={fetchOpsData} className="text-xs px-3 py-1.5 rounded-full bg-zinc-800 hover:bg-zinc-700 transition-all">
                      {isLoadingOps ? 'Atualizando...' : 'Atualizar'}
                    </button>
                  </div>

                  <div className="space-y-3">
                    {opsData.barbers.map((barber) => (
                      <div key={barber.id} className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
                        <div className="flex items-start justify-between gap-4 mb-3">
                          <div>
                            <p className="font-semibold text-white">{barber.barberName}</p>
                            <p className="text-xs text-zinc-500">Hoje {formatCurrency(barber.realizedToday)} • Mês {formatCurrency(barber.realizedMonth)}</p>
                          </div>
                          <span className="text-xs px-3 py-1 rounded-full bg-amber-500/15 text-amber-300">
                            Gap {formatCurrency(barber.gapRemaining)}
                          </span>
                        </div>
                        <div className="grid md:grid-cols-4 gap-2 text-sm">
                          <div className="rounded-lg bg-zinc-900 p-3">Clientes: <strong>{barber.actionPlan.customersNeeded}</strong></div>
                          <div className="rounded-lg bg-zinc-900 p-3">Sobrancelhas: <strong>{barber.actionPlan.eyebrowNeeded}</strong></div>
                          <div className="rounded-lg bg-zinc-900 p-3">Selagens: <strong>{barber.actionPlan.sealingNeeded}</strong></div>
                          <div className="rounded-lg bg-zinc-900 p-3">Produtos: <strong>{barber.actionPlan.productsNeeded}</strong></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4">
                  <div>
                    <h3 className="text-sm font-semibold">Agenda e CRM</h3>
                    <p className="text-xs text-zinc-500 mt-1">Confirmações automáticas e acesso rápido</p>
                  </div>

                  <div className="space-y-3">
                    {opsData.confirmations.map((item) => (
                      <div key={item.id} className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4 flex items-center justify-between gap-3">
                        <div>
                          <p className="font-medium">{item.clientName}</p>
                          <p className="text-xs text-zinc-500">{item.timeLabel} • {item.channel}</p>
                        </div>
                        <span className={`text-[10px] px-2.5 py-1 rounded-full font-semibold uppercase ${item.status === 'confirmed' ? 'bg-violet-500/20 text-violet-300' : item.status === 'pending' ? 'bg-amber-500/20 text-amber-300' : 'bg-rose-500/20 text-rose-300'}`}>
                          {item.status === 'confirmed' ? 'confirmado' : item.status === 'pending' ? 'pendente' : 'sem resposta'}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-col gap-3 pt-2">
                    <a href="/app/meta-barbeiro" className="w-full text-center px-4 py-3 rounded-xl bg-gold text-zinc-950 font-bold hover:bg-gold/80 transition-all">
                      Abrir dashboard operacional
                    </a>
                    <a href="/app/clientes/1" className="w-full text-center px-4 py-3 rounded-xl border border-zinc-700 hover:bg-zinc-800 transition-all">
                      Abrir ficha CRM 360
                    </a>
                  </div>
                </section>
              </div>
            </div>
          )}

          {/* ──────────── TAB: CONFIGURAÇÕES GLOBAIS ──────────── */}
          {activeTab === 'settings' && (
            <div className="space-y-6 max-w-3xl">
              <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-5">
                <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">Textos do Hero</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <Field label="Título Hero">
                    <input type="text" value={settings.hero_title ?? ''}
                      onChange={(e) => setSettings({ ...settings, hero_title: e.target.value })} className="admin-input" />
                  </Field>
                  <Field label="Subtítulo Hero">
                    <input type="text" value={settings.hero_subtitle ?? ''}
                      onChange={(e) => setSettings({ ...settings, hero_subtitle: e.target.value })} className="admin-input" />
                  </Field>
                  <div className="md:col-span-2">
                    <Field label="Descrição Hero">
                      <textarea rows={3} value={settings.hero_description ?? ''}
                        onChange={(e) => setSettings({ ...settings, hero_description: e.target.value })} className="admin-textarea" />
                    </Field>
                  </div>
                </div>
              </section>

              <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-5">
                <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">Contato & Redes Sociais</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <Field label="WhatsApp (com DDI+DDD)">
                    <input type="text" value={settings.whatsapp_number ?? ''}
                      onChange={(e) => setSettings({ ...settings, whatsapp_number: e.target.value })} className="admin-input" />
                  </Field>
                  <div className="md:col-span-2">
                    <Field label="Mensagem padrão do WhatsApp (botões gerais)">
                      <textarea
                        rows={3}
                        value={settings.whatsapp_message_default_template ?? ''}
                        onChange={(e) => setSettings({ ...settings, whatsapp_message_default_template: e.target.value })}
                        placeholder="Ola! Vim pelo site da Fonseca Barber Club e quero agendar meu horario. Pode me mostrar os horarios disponiveis?"
                        className="admin-textarea"
                      />
                    </Field>
                  </div>
                  <Field label="Endereço">
                    <input type="text" value={settings.address ?? ''}
                      onChange={(e) => setSettings({ ...settings, address: e.target.value })} className="admin-input" />
                  </Field>
                  <Field label="Link Instagram">
                    <input type="text" value={settings.instagram_url ?? ''}
                      onChange={(e) => setSettings({ ...settings, instagram_url: e.target.value })} className="admin-input" />
                  </Field>
                  <Field label="Link Facebook">
                    <input type="text" value={settings.facebook_url ?? ''}
                      onChange={(e) => setSettings({ ...settings, facebook_url: e.target.value })} className="admin-input" />
                  </Field>
                  <div className="md:col-span-2">
                    <Field label="URL Google Maps">
                      <input type="text" value={settings.google_maps_url ?? ''}
                        onChange={(e) => setSettings({ ...settings, google_maps_url: e.target.value })} className="admin-input" />
                    </Field>
                  </div>
                </div>
              </section>
            </div>
          )}

          {/* ──────────── TAB: SERVIÇOS & PLANOS ──────────── */}
          {activeTab === 'services' && (
            <div className="space-y-5 max-w-3xl">
              <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4">
                <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">Mensagem WhatsApp dos Botões de Planos</h3>
                <Field label="Template da mensagem (use {servico} para inserir o nome do plano)">
                  <textarea
                    rows={4}
                    value={settings.whatsapp_message_service_template ?? ''}
                    onChange={(e) => setSettings({ ...settings, whatsapp_message_service_template: e.target.value })}
                    placeholder="Ola! Vim pelo site da Fonseca Barber Club e quero saber mais sobre o plano {servico}. Pode me explicar como funciona e os horarios disponiveis?"
                    className="admin-textarea"
                  />
                </Field>
                <p className="text-xs text-zinc-500">
                  Exemplo: se clicar no Plano Cabelo, o {'{servico}'} vira Plano Cabelo automaticamente.
                </p>
              </section>

              <div className="flex justify-end">
                <button onClick={() => setServices([...services, { name: '', price: '', desc: '' }])}
                  className="bg-gold text-zinc-950 px-5 py-2 rounded-full font-bold text-sm flex items-center gap-2 hover:bg-gold/80 transition-all shadow-md shadow-gold/20">
                  <Plus className="w-4 h-4" /> Adicionar Serviço
                </button>
              </div>

              {services.length === 0 ? (
                <div className="border-2 border-dashed border-zinc-800 rounded-2xl p-16 text-center text-zinc-500">
                  <Scissors className="w-8 h-8 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">Nenhum serviço cadastrado.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {services.map((svc: any, i: number) => (
                    <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 flex gap-4 items-center">
                      <div className="flex-1 grid md:grid-cols-3 gap-3">
                        <input placeholder="Nome do serviço" value={svc.name}
                          onChange={(e) => { const s = [...services]; s[i] = { ...s[i], name: e.target.value }; setServices(s); }}
                          className="admin-input" />
                        <input placeholder="Preço (ex: R$ 74,90)" value={svc.price}
                          onChange={(e) => { const s = [...services]; s[i] = { ...s[i], price: e.target.value }; setServices(s); }}
                          className="admin-input" />
                        <input placeholder="Descrição" value={svc.desc ?? svc.description ?? ''}
                          onChange={(e) => { const s = [...services]; s[i] = { ...s[i], desc: e.target.value }; setServices(s); }}
                          className="admin-input" />
                      </div>
                      <button onClick={() => setServices(services.filter((_: any, idx: number) => idx !== i))}
                        className="p-2 text-zinc-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all flex-shrink-0">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ──────────── TAB: MÍDIA & GALERIA ──────────── */}
          {activeTab === 'media' && (
            <div className="space-y-10 max-w-5xl">

              {/* Arquivos principais */}
              <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-6">
                <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">Arquivos Principais</h3>
                <div className="grid md:grid-cols-2 gap-6">

                  {/* Logo */}
                  <div className="space-y-3">
                    <Field label="Logomarca">
                      <div className="flex gap-2">
                        <input type="text" value={settings.logo_url ?? ''} placeholder="URL ou faça upload"
                          onChange={(e) => setSettings({ ...settings, logo_url: e.target.value })}
                          className="admin-input flex-1" />
                        <input type="file" ref={logoRef} onChange={handleLogoUpload} accept="image/*" className="hidden" />
                        <button onClick={() => logoRef.current?.click()} disabled={isUploadingLogo}
                          className="bg-zinc-800 hover:bg-zinc-700 text-gold px-3 py-2 rounded-lg flex items-center gap-1.5 transition-all disabled:opacity-50 flex-shrink-0 text-xs font-medium">
                          {isUploadingLogo ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                          Upload
                        </button>
                      </div>
                    </Field>
                    {settings.logo_url && (
                      <div className="rounded-xl bg-zinc-800 p-3 w-fit">
                        <img src={settings.logo_url} alt="Logo preview" className="h-12 object-contain" />
                      </div>
                    )}
                  </div>

                  {/* Hero Video */}
                  <div className="space-y-3">
                    <Field label="Vídeo de Fundo (Hero)">
                      <div className="flex gap-2">
                        <input type="text" value={settings.hero_video ?? ''} placeholder="URL ou faça upload"
                          onChange={(e) => setSettings({ ...settings, hero_video: e.target.value })}
                          className="admin-input flex-1" />
                        <input type="file" ref={heroVideoRef} onChange={handleHeroVideoUpload} accept="video/*" className="hidden" />
                        <button onClick={() => heroVideoRef.current?.click()} disabled={isUploadingHeroVideo}
                          className="bg-zinc-800 hover:bg-zinc-700 text-gold px-3 py-2 rounded-lg flex items-center gap-1.5 transition-all disabled:opacity-50 flex-shrink-0 text-xs font-medium">
                          {isUploadingHeroVideo ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                          Upload
                        </button>
                      </div>
                    </Field>
                  </div>

                  {/* Hero Image */}
                  <div className="space-y-3 md:col-span-2">
                    <Field label="Imagem de Fundo — opcional (substitui o vídeo)">
                      <div className="flex gap-2">
                        <input type="text" value={settings.hero_image ?? ''} placeholder="URL ou faça upload"
                          onChange={(e) => setSettings({ ...settings, hero_image: e.target.value })}
                          className="admin-input flex-1" />
                        <input type="file" ref={heroImageRef} onChange={handleHeroImageUpload} accept="image/*" className="hidden" />
                        <button onClick={() => heroImageRef.current?.click()} disabled={isUploadingHeroImage}
                          className="bg-zinc-800 hover:bg-zinc-700 text-gold px-3 py-2 rounded-lg flex items-center gap-1.5 transition-all disabled:opacity-50 flex-shrink-0 text-xs font-medium">
                          {isUploadingHeroImage ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                          Upload
                        </button>
                      </div>
                    </Field>
                  </div>
                </div>

                <div className="flex justify-end pt-2 border-t border-zinc-800">
                  <button onClick={handleSave} disabled={isSaving}
                    className="bg-gold text-zinc-950 px-5 py-2 rounded-full font-bold text-sm flex items-center gap-2 hover:bg-gold/80 transition-all disabled:opacity-50">
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Salvar URLs
                  </button>
                </div>
              </section>

              {/* Galeria de Fotos */}
              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">
                    Galeria de Fotos <span className="text-zinc-600 normal-case font-normal">({gallery.length})</span>
                  </h3>
                  <div>
                    <input type="file" ref={galleryImgRef} onChange={handleGalleryImgUpload} accept="image/*" className="hidden" />
                    <button onClick={() => galleryImgRef.current?.click()} disabled={isUploadingGalleryImg}
                      className="bg-gold text-zinc-950 px-4 py-2 rounded-full font-bold text-sm flex items-center gap-2 hover:bg-gold/80 transition-all disabled:opacity-50 shadow-md shadow-gold/20">
                      {isUploadingGalleryImg ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImagePlus className="w-4 h-4" />}
                      {isUploadingGalleryImg ? 'Enviando...' : 'Adicionar Foto'}
                    </button>
                  </div>
                </div>

                {gallery.length === 0 ? (
                  <div className="border-2 border-dashed border-zinc-800 rounded-2xl p-16 text-center text-zinc-600">
                    <ImageIcon className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">Nenhuma foto na galeria ainda.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {gallery.map((item: any, i: number) => (
                      <div key={item.id ?? i}
                        className="relative group aspect-square rounded-xl overflow-hidden bg-zinc-900 border border-zinc-800">
                        <img src={item.url} alt={`Foto ${i + 1}`}
                          className="w-full h-full object-cover transition-all duration-300 group-hover:brightness-50 group-hover:scale-105" />
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                          <button onClick={() => handleDeletePhoto(item.id)}
                            className="bg-red-500 hover:bg-red-600 text-white p-2.5 rounded-full shadow-xl transition-all transform hover:scale-110">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* Galeria de Vídeos */}
              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">
                    Galeria de Vídeos <span className="text-zinc-600 normal-case font-normal">({videoGallery.length})</span>
                  </h3>
                  <div>
                    <input type="file" ref={galleryVidRef} onChange={handleGalleryVidUpload} accept="video/*" className="hidden" />
                    <button onClick={() => galleryVidRef.current?.click()} disabled={isUploadingGalleryVid}
                      className="bg-zinc-800 hover:bg-zinc-700 border border-gold/30 text-gold px-4 py-2 rounded-full font-bold text-sm flex items-center gap-2 transition-all disabled:opacity-50">
                      {isUploadingGalleryVid ? <Loader2 className="w-4 h-4 animate-spin" /> : <Film className="w-4 h-4" />}
                      {isUploadingGalleryVid ? 'Enviando...' : 'Adicionar Vídeo'}
                    </button>
                  </div>
                </div>

                {videoGallery.length === 0 ? (
                  <div className="border-2 border-dashed border-zinc-800 rounded-2xl p-16 text-center text-zinc-600">
                    <Video className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">Nenhum vídeo na galeria ainda.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {videoGallery.map((item: any, i: number) => (
                      <div key={item.id ?? i}
                        className="relative group aspect-video rounded-xl overflow-hidden bg-zinc-900 border border-zinc-800">
                        <video src={item.url} muted playsInline
                          className="w-full h-full object-cover transition-all duration-300 group-hover:brightness-50" />
                        <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-sm rounded-full p-1.5 pointer-events-none">
                          <Video className="w-3 h-3 text-white" />
                        </div>
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                          <button onClick={() => handleDeleteVideo(item.id)}
                            className="bg-red-500 hover:bg-red-600 text-white p-2.5 rounded-full shadow-xl transition-all transform hover:scale-110">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

            </div>
          )}

        </main>
      </div>
    </div>
  );
}
