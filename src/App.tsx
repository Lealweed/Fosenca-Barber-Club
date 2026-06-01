import { motion, AnimatePresence } from 'motion/react';
import {
  Scissors, MapPin, Clock, Phone,
  Instagram, Facebook, MessageCircle,
  Star, Settings, Award,
} from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import FloatingWhatsApp    from './components/FloatingWhatsApp';
import AdminPanel          from './components/AdminPanel';
import BarberGoalsDashboard from './components/BarberGoalsDashboard';
import Client360View       from './components/Client360View';
import Header              from './components/Header';
import SystemGuidePage     from './components/SystemGuidePage';

// ── Constants ──────────────────────────────────────────────────────────────
const DEFAULT_LOGO =
  'https://oacqvijuafuzsbyyqdtt.supabase.co/storage/v1/object/public/barber-assets/logo.png';

const STATS = [
  { value: '100+',  label: 'Clientes no Clube'      },
  { value: '5.0⭐', label: 'Avaliação Google'        },
  { value: 'Top 1', label: 'Barbearia da Cidade'    },
  { value: '100%',  label: 'Satisfação Garantida'   },
];

const WHY_ITEMS = [
  {
    icon: Scissors,
    title: 'Precisão e padrão em cada corte',
    desc:  'Nossa equipe segue um padrão de qualidade para garantir cortes bem executados, acabamento limpo e visual alinhado em cada atendimento.',
  },
  {
    icon: Star,
    title: 'Experiência que vai além do corte',
    desc:  'Aqui você não vem apenas cortar o cabelo. Oferecemos uma experiência completa de cuidado, conforto e atenção aos detalhes.',
  },
  {
    icon: Award,
    title: 'Clube de assinatura exclusivo',
    desc:  'Com os planos de assinatura da Fonseca Barber Club, você mantém seu visual sempre em dia com praticidade e economia todos os meses.',
  },
];

const GOOGLE_REVIEWS = [
  {
    name:     'Carlos Eduardo',
    initials: 'CE',
    rating:   5,
    text:     'Melhor barbearia de Parauapebas! Atendimento impecável, ambiente top e o corte ficou perfeito. Já sou assinante há 6 meses e não me arrependo.',
    time:     '2 semanas atrás',
  },
  {
    name:     'Rafael Mendes',
    initials: 'RM',
    rating:   5,
    text:     'Profissionalismo de verdade! Ambiente diferenciado, cerveja gelada e equipe atenciosa. O plano de assinatura vale cada centavo.',
    time:     '1 mês atrás',
  },
  {
    name:     'Bruno Alves',
    initials: 'BA',
    rating:   5,
    text:     'Lugar totalmente diferenciado, equipe atenciosa e o resultado fala por si. Recomendo muito para quem quer o visual sempre em dia.',
    time:     '3 semanas atrás',
  },
];

const PLAN_BENEFITS = ['Agendamento prioritário', 'Economia mensal garantida', 'Benefícios exclusivos do clube'];

// ── Supabase helper ────────────────────────────────────────────────────────
const getSupabaseClient = () => {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) return null;
  return createClient(supabaseUrl, supabaseKey);
};

// ── Reusable sub-components ────────────────────────────────────────────────

/** Section pre-label in gold uppercase tracking */
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] text-gold/60 tracking-[0.35em] uppercase font-bold mb-3">
      {children}
    </p>
  );
}

/** Horizontal-scroll wrapper that becomes a grid on sm+ */
function ScrollGrid({
  children,
  cols = 3,
  className = '',
}: {
  children: React.ReactNode;
  cols?: number;
  className?: string;
}) {
  const gridCols: Record<number, string> = {
    2: 'sm:grid-cols-2',
    3: 'sm:grid-cols-3',
    4: 'sm:grid-cols-4',
  };
  return (
    <div className="-mx-4 overflow-x-auto sm:mx-0 sm:overflow-visible">
      <div
        className={`flex gap-4 px-4 snap-x snap-mandatory pb-4 sm:px-0 sm:grid sm:pb-0 sm:gap-6 ${gridCols[cols] ?? 'sm:grid-cols-3'} ${className}`}
      >
        {children}
      </div>
    </div>
  );
}



// ── Main App ───────────────────────────────────────────────────────────────
export default function App() {
  // ── Helpers ──────────────────────────────────────────────────────────────
  const normalizeGallery = (items: any): { url: string }[] => {
    if (!Array.isArray(items)) return [];
    return items
      .map((item: any) => {
        if (typeof item === 'string') return { url: item };
        const url = item?.url || item?.image_url || item?.src || item?.value || '';
        return { url: String(url).trim() };
      })
      .filter((item: any) => item.url && item.url.trim() !== '');
  };

  const parseGalleryFromSettings = (settingsObj: any): { url: string }[] => {
    const raw = settingsObj?.marketing_gallery;
    if (!raw) return [];
    try {
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
      return normalizeGallery(parsed);
    } catch {
      return [];
    }
  };

  // ── State ─────────────────────────────────────────────────────────────────
  const [content, setContent] = useState<any>({
    settings: {
      whatsapp_number:                    '5594992496583',
      whatsapp_message_default_template:  'Ola! Vim pelo site da Fonseca Barber Club e quero agendar meu horario. Pode me mostrar os horarios disponiveis?',
      whatsapp_message_service_template:  'Ola! Vim pelo site da Fonseca Barber Club e quero saber mais sobre o plano {servico}. Pode me explicar como funciona e os horarios disponiveis?',
      address:   'R. Caiena, Qd 16 Lt 29 Sala D - Novo Horizonte, Parauapebas - PA',
      hero_video: 'https://oacqvijuafuzsbyyqdtt.supabase.co/storage/v1/object/public/barber-assets/gallery-video-1771970955047.MOV',
      logo_url:  DEFAULT_LOGO,
    },
    services: [
      { name: 'Plano Cabelo',         price: 'R$ 74,90',  desc: 'Corte e acabamento'          },
      { name: 'Plano Barba',          price: 'R$ 74,90',  desc: 'Barba desenhada e finalização' },
      { name: 'Plano Cabelo e Barba', price: 'R$ 154,90', desc: 'Corte completo + barba'       },
    ],
    gallery:       [],
    video_gallery: [],
  });

  const [isAdminOpen,      setIsAdminOpen]      = useState(false);
  const [errorInfo,        setErrorInfo]         = useState<string>('');
  const [logoFailed,       setLogoFailed]        = useState(false);
  const [footerLogoFailed, setFooterLogoFailed]  = useState(false);
  const [currentPath,      setCurrentPath]       = useState<string>(() => window.location.pathname);

  // ── Route tracking ────────────────────────────────────────────────────────
  useEffect(() => {
    const handleRouteChange = () => setCurrentPath(window.location.pathname);
    window.addEventListener('popstate', handleRouteChange);
    return () => window.removeEventListener('popstate', handleRouteChange);
  }, []);

  // ── Data fetching ─────────────────────────────────────────────────────────
  const fetchContentDirectFromSupabase = async () => {
    const sb = getSupabaseClient();
    if (!sb) return null;

    const [settingsRes, servicesRes, galleryRes, videoRes] = await Promise.all([
      sb.from('settings').select('*'),
      sb.from('services').select('*'),
      sb.from('gallery').select('*'),
      sb.from('video_gallery').select('*'),
    ]);

    const settingsObj: Record<string, any> = {};
    (settingsRes.data || []).forEach((row: any) => { settingsObj[row.key] = row.value; });

    return {
      settings: settingsObj,
      services: (() => {
        try { return JSON.parse(settingsObj.marketing_services || '[]'); } catch { return []; }
      })(),
      gallery:       galleryRes.data || [],
      video_gallery: videoRes.data   || [],
    };
  };

  const fetchContent = async () => {
    try {
      const res = await fetch('/api/content');
      if (!res.ok) throw new Error(`Erro: ${res.status}`);
      let data = await res.json();

      if (!data?.services || data.services.length === 0) {
        const directData = await fetchContentDirectFromSupabase();
        if (directData) {
          data = {
            ...data,
            ...directData,
            settings: { ...(data.settings || {}), ...(directData.settings || {}) },
          };
        }
      }

      setContent((prev: any) => ({
        ...prev,
        settings: {
          ...prev.settings,
          ...(data.settings || {}),
          logo_url:
            data?.settings?.logo_url && String(data.settings.logo_url).trim() !== ''
              ? data.settings.logo_url
              : prev.settings.logo_url,
        },
        services: data.services && data.services.length > 0 ? data.services : prev.services,
        gallery: (() => {
          const apiGallery = normalizeGallery(data.gallery || []);
          if (apiGallery.length > 0) return apiGallery;
          const sg = parseGalleryFromSettings(data.settings || {});
          if (sg.length > 0) return sg;
          return normalizeGallery(prev.gallery || []);
        })(),
        video_gallery:
          data.video_gallery && data.video_gallery.length > 0 ? data.video_gallery : prev.video_gallery,
      }));
    } catch (error: any) {
      console.error('Background fetch error:', error);
      setErrorInfo(error.message);
    }
  };

  useEffect(() => {
    window.onerror = (msg) => setErrorInfo(`Erro de Sistema: ${msg}`);
    if (currentPath.startsWith('/app/')) return;
    fetchContent();
  }, [currentPath]);

  useEffect(() => {
    setLogoFailed(false);
    setFooterLogoFailed(false);
  }, [content?.settings?.logo_url]);

  // ── WhatsApp helpers ──────────────────────────────────────────────────────
  const buildWhatsAppMessage = (serviceName?: string) => {
    const defaultTemplate =
      settings?.whatsapp_message_default_template ||
      'Ola! Vim pelo site da Fonseca Barber Club e quero agendar meu horario. Pode me mostrar os horarios disponiveis?';
    const serviceTemplate =
      settings?.whatsapp_message_service_template ||
      'Ola! Vim pelo site da Fonseca Barber Club e quero saber mais sobre o plano {servico}. Pode me explicar como funciona e os horarios disponiveis?';
    if (serviceName) {
      return serviceTemplate.includes('{servico}')
        ? serviceTemplate.replaceAll('{servico}', serviceName)
        : `${serviceTemplate} (${serviceName})`;
    }
    return defaultTemplate;
  };

  const buildWhatsAppUrl = (serviceName?: string) => {
    const rawNumber = settings?.whatsapp_number || '5594992496583';
    const number    = String(rawNumber).replace(/\D/g, '');
    const message   = encodeURIComponent(buildWhatsAppMessage(serviceName));
    return `https://wa.me/${number}?text=${message}`;
  };

  const handleWhatsAppContact = (serviceName?: string) =>
    window.open(buildWhatsAppUrl(serviceName), '_blank');

  // ── Derived data ──────────────────────────────────────────────────────────
  const settings = content?.settings || {
    whatsapp_number:                   '5594992496583',
    address:   'R. Caiena, Qd 16 Lt 29 Sala D - Novo Horizonte, Parauapebas - PA',
    hero_video: 'https://oacqvijuafuzsbyyqdtt.supabase.co/storage/v1/object/public/barber-assets/gallery-video-1771970955047.MOV',
    instagram_url:   'https://www.instagram.com/fonsecabarbearia.pbs/',
    facebook_url:    'https://facebook.com',
    google_maps_url: 'https://www.google.com/maps/dir//Fonseca+Barber+Club,+R.+Caiena,+Quadra+16+Lote+29+Sala+D+-+Novo+Horizonte,+Parauapebas+-+PA,+68515-000/@-6.0612128,-49.8854506,15z',
    hero_title:       'ELEVE O SEU PADRÃO',
    hero_subtitle:    'A melhor barbearia de Parauapebas',
    hero_description: 'Bem-vindo à Fonseca Barber Club. Mais que uma barbearia — uma experiência completa de cuidado, estilo e confiança. Conheça nossos planos de assinatura e mantenha seu visual impecável o mês inteiro.',
    logo_url: DEFAULT_LOGO,
  };

  const services        = content?.services || [];
  const WHATSAPP_URL    = buildWhatsAppUrl();
  const displayServices = services;
  const displayGallery  = normalizeGallery(content?.gallery || []).slice(0, 4);

  const clientRouteMatch = currentPath.match(/^\/app\/clientes\/([^/]+)/);

  // ── Sub-routes ────────────────────────────────────────────────────────────
  if (currentPath.startsWith('/app/manual')) return <SystemGuidePage />;
  if (currentPath.startsWith('/app/meta-barbeiro')) return <BarberGoalsDashboard />;
  if (clientRouteMatch) return <Client360View clientId={decodeURIComponent(clientRouteMatch[1])} />;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen font-sans selection:bg-gold selection:text-zinc-950 text-white overflow-x-hidden bg-zinc-950">

      {/* ── Fixed background video/image ── */}
      <div className="fixed inset-0 z-0 pointer-events-none bg-black">
        {settings?.hero_image ? (
          <img
            src={settings.hero_image}
            alt="Background"
            className="w-full h-full object-cover"
            style={{ filter: 'brightness(0.55) contrast(1.1)' }}
          />
        ) : (
          <video
            key={settings?.hero_video}
            autoPlay muted loop playsInline
            className="w-full h-full object-cover"
            style={{ filter: 'brightness(0.55) contrast(1.1)' }}
          >
            <source src={settings?.hero_video} />
          </video>
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-zinc-950" />
      </div>

      {/* ── Admin gear button ── */}
      <button
        onClick={() => setIsAdminOpen(true)}
        className="fixed bottom-6 left-6 z-50 bg-zinc-900/80 backdrop-blur-md p-4 rounded-full border border-gold/30 text-gold hover:scale-110 transition-all shadow-2xl"
        title="Painel Administrativo"
      >
        <Settings className="w-6 h-6" />
      </button>

      {/* ── Admin panel ── */}
      {isAdminOpen && (
        <AdminPanel
          initialData={content}
          onClose={() => setIsAdminOpen(false)}
          onUpdate={fetchContent}
        />
      )}

      {/* ── Header ── */}
      <Header
        logoUrl={settings.logo_url || DEFAULT_LOGO}
        logoFailed={logoFailed}
        onLogoError={() => setLogoFailed(true)}
        onContactClick={() => handleWhatsAppContact()}
      />

      {/* ════════════════════════ HERO ════════════════════════ */}
      <section className="min-h-screen flex items-end sm:items-center justify-center pb-16 pt-20 sm:pt-24 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/20 to-zinc-950 z-0" />

        <div className="max-w-4xl mx-auto text-center relative z-10 w-full">
          <motion.div
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease: 'easeOut' }}
          >
            {/* Pill badge */}
            <div className="inline-flex items-center gap-2.5 px-5 py-2 rounded-full border border-gold/30 bg-black/40 backdrop-blur-sm mb-7">
              <div className="w-1.5 h-1.5 rounded-full bg-gold animate-pulse" />
              <span className="text-[10px] sm:text-xs font-bold tracking-[0.22em] uppercase text-gold/90">
                {settings.hero_subtitle || 'A Melhor Barbearia de Parauapebas'}
              </span>
            </div>

            {/* Headline */}
            <h1
              className="font-serif text-5xl sm:text-6xl md:text-8xl lg:text-9xl font-bold mb-6 leading-[0.9] tracking-tighter"
              dangerouslySetInnerHTML={{
                __html: settings.hero_title || "ELEVE O SEU <br/><span style='color:#c5a059'>PADRÃO</span>",
              }}
            />

            {/* Description */}
            <p className="text-sm sm:text-lg md:text-xl text-white/60 mb-9 max-w-2xl mx-auto font-light leading-relaxed px-2">
              {settings.hero_description ||
                'Bem-vindo à Fonseca Barber Club. Mais que uma barbearia — uma experiência completa de cuidado, estilo e confiança. Conheça nossos planos de assinatura.'}
            </p>

            {/* CTA buttons */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3">
              <button
                onClick={() => handleWhatsAppContact()}
                className="bg-gold text-zinc-950 px-9 py-4 rounded-full font-black uppercase tracking-widest text-sm hover:bg-white transition-all shadow-2xl shadow-gold/20 transform hover:scale-105"
              >
                Conhecer Planos
              </button>
              <a
                href="#planos"
                className="px-9 py-4 rounded-full font-bold uppercase tracking-widest text-sm border border-white/20 bg-white/5 backdrop-blur-sm hover:bg-white/10 transition-all text-center"
              >
                Ver Assinaturas
              </a>
            </div>
          </motion.div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-7 left-1/2 -translate-x-1/2 opacity-30 hidden sm:block">
          <div className="w-px h-10 bg-gradient-to-b from-gold to-transparent" />
        </div>
      </section>

      {/* ════════════════════════ STATS STRIP ════════════════════════ */}
      <section className="relative z-10 border-y border-white/5 bg-zinc-950/70 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 sm:gap-8 text-center">
            {STATS.map((stat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
              >
                <div className="text-2xl sm:text-3xl md:text-4xl font-black text-gold tracking-tighter mb-1.5">
                  {stat.value}
                </div>
                <div className="text-[10px] sm:text-xs text-white/40 uppercase tracking-widest font-semibold">
                  {stat.label}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════ POR QUE ESCOLHER ════════════════════════ */}
      <section className="py-16 sm:py-24 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10 sm:mb-14">
            <SectionLabel>Diferenciais</SectionLabel>
            <h2 className="font-serif text-3xl sm:text-5xl md:text-6xl font-bold tracking-tighter">
              Por que escolher a{' '}
              <span className="text-gold italic">Fonseca Barber?</span>
            </h2>
          </div>

          <ScrollGrid>
            {WHY_ITEMS.map((item, i) => (
              <div key={i} className="snap-start flex-shrink-0 w-[76vw] sm:w-auto">
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="bg-zinc-900/50 border border-white/5 hover:border-gold/20 rounded-3xl p-7 flex flex-col gap-5 transition-all group h-full cursor-default"
                >
                  <div className="bg-gold/10 w-12 h-12 rounded-2xl flex items-center justify-center group-hover:bg-gold/20 transition-colors flex-shrink-0">
                    <item.icon className="w-6 h-6 text-gold" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white mb-2 leading-snug">{item.title}</h3>
                    <p className="text-sm text-white/50 leading-relaxed">{item.desc}</p>
                  </div>
                </motion.div>
              </div>
            ))}
          </ScrollGrid>
        </div>
      </section>

      {/* ════════════════════════ PLANOS ════════════════════════ */}
      <section id="planos" className="py-16 sm:py-24 relative z-10 bg-zinc-950/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10 sm:mb-14">
            <SectionLabel>Clube Fonseca</SectionLabel>
            <h2 className="font-serif text-3xl sm:text-5xl md:text-7xl font-bold tracking-tighter italic mb-3">
              Nossos <span className="text-gold">Planos</span>
            </h2>
            <p className="text-white/30 text-[10px] uppercase tracking-[0.25em] font-bold">
              Cortes de elite para homens de bom gosto
            </p>
          </div>

          <ScrollGrid>
            {displayServices.slice(0, 3).map((plan: any, i: number) => {
              const isFeatured = i === Math.min(displayServices.slice(0, 3).length - 1, 2);
              return (
                <div key={i} className="snap-start flex-shrink-0 w-[80vw] sm:w-auto">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                    className={`rounded-3xl p-7 flex flex-col transition-all h-full ${
                      isFeatured
                        ? 'bg-gold border-2 border-gold shadow-2xl shadow-gold/30'
                        : 'bg-zinc-900/60 border border-white/10 hover:border-gold/30'
                    }`}
                  >
                    {isFeatured && (
                      <span className="inline-block bg-zinc-950 text-gold text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full self-start mb-5">
                        Mais Escolhido
                      </span>
                    )}

                    <div className={`text-4xl font-black tracking-tighter mb-0.5 ${isFeatured ? 'text-zinc-950' : 'text-gold'}`}>
                      {plan.price}
                    </div>
                    <div className={`text-[10px] font-bold uppercase tracking-widest mb-5 ${isFeatured ? 'text-zinc-950/50' : 'text-white/30'}`}>
                      /mês
                    </div>

                    <h3 className={`text-lg font-bold mb-2 ${isFeatured ? 'text-zinc-950' : 'text-white'}`}>
                      {plan.name}
                    </h3>
                    <p className={`text-sm mb-6 leading-relaxed flex-1 ${isFeatured ? 'text-zinc-950/60' : 'text-white/40'}`}>
                      {plan.description || plan.desc}
                    </p>

                    {/* Benefits checklist */}
                    <ul className={`space-y-2 mb-6 text-xs ${isFeatured ? 'text-zinc-950/70' : 'text-white/50'}`}>
                      {PLAN_BENEFITS.map((benefit) => (
                        <li key={benefit} className="flex items-center gap-2">
                          <span
                            className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 text-[9px] font-bold ${
                              isFeatured ? 'bg-zinc-950/20 text-zinc-950' : 'bg-gold/20 text-gold'
                            }`}
                          >
                            ✓
                          </span>
                          {benefit}
                        </li>
                      ))}
                    </ul>

                    <button
                      onClick={() => handleWhatsAppContact(plan.name)}
                      className={`w-full py-3.5 rounded-2xl font-black uppercase tracking-widest text-xs transition-all ${
                        isFeatured
                          ? 'bg-zinc-950 text-white hover:bg-zinc-800'
                          : 'bg-gold text-zinc-950 hover:bg-white'
                      }`}
                    >
                      Assinar Agora
                    </button>
                  </motion.div>
                </div>
               );
            })}
          </ScrollGrid>
        </div>
      </section>

      {/* ════════════════════════ GALERIA ════════════════════════ */}
      <section id="galeria" className="py-16 sm:py-24 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10 sm:mb-14">
            <SectionLabel>Nosso Trabalho</SectionLabel>
            <h2 className="font-serif text-3xl sm:text-5xl font-bold tracking-tighter">
              Cada cliente vive uma{' '}
              <span className="text-gold italic">Experiência</span>
            </h2>
            <p className="text-white/50 text-sm mt-3 max-w-xl mx-auto">
              Na Fonseca Barber Club cada atendimento é único. Cuidamos de cada detalhe para que você saia daqui com confiança e estilo.
            </p>
          </div>

          {displayGallery.length > 0 ? (
            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              {displayGallery.map((item: any, i: number) => (
                <motion.div
                  key={item.id ?? item.url ?? i}
                  initial={{ opacity: 0, scale: 0.96 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08 }}
                  className="relative aspect-square rounded-2xl sm:rounded-3xl overflow-hidden bg-zinc-900"
                >
                  <img
                    src={item.url}
                    alt={`Trabalho ${i + 1}`}
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                    onError={(e) => {
                      (e.currentTarget.parentElement as HTMLElement).style.display = 'none';
                    }}
                  />
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className="aspect-square rounded-2xl sm:rounded-3xl bg-zinc-900/60 border border-white/5 flex items-center justify-center"
                >
                  <p className="text-white/20 text-xs uppercase tracking-widest">Em breve</p>
                </div>
              ))}
            </div>
          )}

          <div className="text-center mt-8">
            <button
              onClick={() => handleWhatsAppContact()}
              className="bg-gold/10 border border-gold/30 text-gold px-7 py-3 rounded-full font-bold text-xs uppercase tracking-widest hover:bg-gold/20 transition-all"
            >
              Agende Sua Experiência
            </button>
          </div>
        </div>
      </section>

      {/* ════════════════════════ AVALIAÇÕES GOOGLE ════════════════════════ */}
      <section className="py-16 sm:py-24 relative z-10 bg-zinc-950/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10 sm:mb-14">
            <div className="inline-flex items-center gap-1.5 mb-5">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-4 h-4 sm:w-5 sm:h-5 text-gold fill-gold" />
              ))}
              <span className="text-gold font-black text-lg sm:text-xl ml-2">5.0</span>
            </div>
            <SectionLabel>Avaliações Google</SectionLabel>
            <h2 className="font-serif text-3xl sm:text-5xl font-bold tracking-tighter">
              O que nossos{' '}
              <span className="text-gold italic">clientes dizem</span>
            </h2>
          </div>

          <ScrollGrid>
            {GOOGLE_REVIEWS.map((review, i) => (
              <div key={i} className="snap-start flex-shrink-0 w-[82vw] sm:w-auto">
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="bg-zinc-900/60 border border-white/5 hover:border-gold/10 rounded-3xl p-6 flex flex-col gap-4 transition-all h-full"
                >
                  <div className="flex gap-0.5">
                    {[...Array(5)].map((_, s) => (
                      <Star key={s} className="w-3.5 h-3.5 text-gold fill-gold" />
                    ))}
                  </div>
                  <p className="text-sm text-white/60 leading-relaxed flex-1">"{review.text}"</p>
                  <div className="flex items-center gap-3 pt-3 border-t border-white/5">
                    <div className="w-8 h-8 rounded-full bg-gold/15 flex items-center justify-center text-xs font-bold text-gold flex-shrink-0">
                      {review.initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-white truncate">{review.name}</div>
                      <div className="text-[10px] text-white/30">{review.time}</div>
                    </div>
                    <span className="text-[10px] font-black text-white/20 ml-auto flex-shrink-0">Google</span>
                  </div>
                </motion.div>
              </div>
            ))}
          </ScrollGrid>
        </div>
      </section>

      {/* ════════════════════════ CONECTE-SE ════════════════════════ */}
      <section className="py-16 sm:py-24 relative z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10 sm:mb-14">
            <h2 className="font-serif text-3xl sm:text-5xl font-bold tracking-tighter">
              Conecte-se <span className="text-gold italic">Conosco</span>
            </h2>
            <p className="text-white/40 text-sm mt-3">Fale com a gente pelos nossos canais</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Instagram */}
            <motion.a
              whileHover={{ y: -6 }}
              href={settings.instagram_url || '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-gradient-to-br from-purple-600/80 to-pink-500/80 rounded-3xl p-8 flex flex-col items-center gap-4 text-center border border-white/10 hover:border-white/20 transition-all"
            >
              <div className="bg-white/20 p-4 rounded-2xl">
                <Instagram className="w-8 h-8 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white mb-1">Instagram</h3>
                <p className="text-white/70 text-xs">Siga nosso trabalho</p>
              </div>
              <span className="w-full bg-white/20 hover:bg-white/30 text-white py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest transition-colors text-center block">
                Seguir Agora
              </span>
            </motion.a>

            {/* WhatsApp */}
            <motion.a
              whileHover={{ y: -6 }}
              href={WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-[#25D366]/80 rounded-3xl p-8 flex flex-col items-center gap-4 text-center border border-white/10 hover:border-white/20 transition-all"
            >
              <div className="bg-white/20 p-4 rounded-2xl">
                <MessageCircle className="w-8 h-8 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white mb-1">WhatsApp</h3>
                <p className="text-white/70 text-xs">Resposta rápida</p>
              </div>
              <span className="w-full bg-white/20 hover:bg-white/30 text-white py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest transition-colors text-center block">
                Chamar Agora
              </span>
            </motion.a>

            {/* Localização */}
            <motion.a
              whileHover={{ y: -6 }}
              href={settings.google_maps_url || '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-gold rounded-3xl p-8 flex flex-col items-center gap-4 text-center border border-gold hover:brightness-110 transition-all"
            >
              <div className="bg-black/15 p-4 rounded-2xl">
                <MapPin className="w-8 h-8 text-zinc-950" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-zinc-950 mb-1">Localização</h3>
                <p className="text-zinc-950/60 text-xs leading-snug max-w-[180px] mx-auto">
                  {settings.address || 'Parauapebas - PA'}
                </p>
              </div>
              <span className="w-full bg-black/10 hover:bg-black/20 text-zinc-950 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest transition-colors text-center block">
                Ver no Mapa
              </span>
            </motion.a>
          </div>
        </div>
      </section>

      {/* ════════════════════════ CONTATO INFO ════════════════════════ */}
      <section id="contato" className="relative z-10 border-y border-white/5 bg-zinc-950/70 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-10 text-center">

            <div className="space-y-2">
              <div className="flex items-center justify-center gap-2 mb-3">
                <MapPin className="w-4 h-4 text-gold" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-gold">Endereço</span>
              </div>
              <p className="text-sm text-white/50 leading-relaxed">
                {settings?.address || 'R. Caiena, Qd 16 Lt 29 Sala D\nNovo Horizonte, Parauapebas - PA'}
              </p>
              <a
                href={settings.google_maps_url || '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block mt-2 text-xs text-gold font-bold hover:underline"
              >
                Abrir no Maps →
              </a>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-center gap-2 mb-3">
                <Clock className="w-4 h-4 text-gold" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-gold">Horário</span>
              </div>
              <p className="text-sm text-white/50">Segunda a Sábado</p>
              <p className="text-2xl font-black text-white">9h — 20h</p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-center gap-2 mb-3">
                <Phone className="w-4 h-4 text-gold" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-gold">Contato</span>
              </div>
              <p className="text-sm text-white/50">
                {settings?.whatsapp_number || '(94) 99249-6583'}
              </p>
              <button
                onClick={() => handleWhatsAppContact()}
                className="mt-1 bg-gold text-zinc-950 px-5 py-2 rounded-full font-bold text-xs uppercase tracking-widest hover:bg-white transition-colors"
              >
                Falar Conosco
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════ FINAL CTA ════════════════════════ */}
      <section className="py-20 sm:py-32 relative z-10">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
          >
            <div className="w-12 h-px bg-gold/40 mx-auto mb-8" />
            <h2 className="font-serif text-4xl sm:text-6xl md:text-7xl font-bold tracking-tighter italic mb-6">
              Pronto para transformar{' '}
              <br className="hidden sm:block" />
              seu <span className="text-gold">visual?</span>
            </h2>
            <p className="text-white/40 text-sm sm:text-base mb-10 leading-relaxed max-w-lg mx-auto">
              Agende agora seu horário ou conheça os planos de assinatura da Fonseca Barber Club. Seu próximo corte começa aqui.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={() => handleWhatsAppContact()}
                className="w-full sm:w-auto bg-gold text-zinc-950 px-9 py-4 rounded-full font-black uppercase tracking-widest text-sm hover:bg-white transition-all shadow-2xl shadow-gold/20 flex items-center justify-center gap-3 transform hover:scale-105"
              >
                <MessageCircle className="w-5 h-5" />
                Falar no WhatsApp
              </button>
              <a
                href="#planos"
                className="w-full sm:w-auto border-2 border-gold/40 text-gold px-9 py-4 rounded-full font-bold uppercase tracking-widest text-sm hover:bg-gold/10 transition-all text-center flex items-center justify-center gap-3"
              >
                <Scissors className="w-5 h-5" />
                Ver Planos
              </a>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ════════════════════════ FOOTER ════════════════════════ */}
      <footer className="relative z-10 bg-black/95 border-t border-gold/10 py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col items-center gap-6">

            {/* Logo */}
            <div className="border border-gold/20 rounded-2xl px-5 py-3 bg-black">
              {!footerLogoFailed ? (
                <img
                  src={settings.logo_url || DEFAULT_LOGO}
                  alt="Fonseca Barber Club"
                  className="h-14 w-auto brightness-125 contrast-125"
                  onError={() => setFooterLogoFailed(true)}
                />
              ) : (
                <div className="text-center py-1">
                  <span className="font-serif text-2xl font-bold text-white italic tracking-tight">Fonseca</span>
                  <span className="block text-[10px] text-gold tracking-[0.3em] uppercase mt-0.5">Barber Club</span>
                </div>
              )}
            </div>

            {/* Social icons */}
            <div className="flex items-center gap-2 text-white/30">
              <a
                href={settings.instagram_url || '#'}
                target="_blank" rel="noopener noreferrer"
                className="p-2.5 hover:text-gold hover:bg-white/5 rounded-xl transition-all"
              >
                <Instagram className="w-5 h-5" />
              </a>
              <a
                href={settings.facebook_url || '#'}
                target="_blank" rel="noopener noreferrer"
                className="p-2.5 hover:text-gold hover:bg-white/5 rounded-xl transition-all"
              >
                <Facebook className="w-5 h-5" />
              </a>
              <a
                href={WHATSAPP_URL}
                target="_blank" rel="noopener noreferrer"
                className="p-2.5 hover:text-gold hover:bg-white/5 rounded-xl transition-all"
              >
                <MessageCircle className="w-5 h-5" />
              </a>
            </div>

            {/* Copyright */}
            <div className="text-center space-y-1">
              <p className="text-white/20 text-xs">
                © {new Date().getFullYear()} Fonseca Barber Club. Todos os direitos reservados.
              </p>
              <p className="text-white/10 text-xs">Excelência em cada detalhe.</p>
              <p className="text-[8px] text-white/10">v1.2.0 | Premium Experience</p>
            </div>

            {/* Hidden admin triggers */}
            <div className="flex items-center gap-4">
              <button
                onClick={() => { setErrorInfo(''); fetchContent(); }}
                className="text-white/10 hover:text-gold text-[10px] uppercase tracking-widest transition-colors"
              >
                Atualizar Dados
              </button>
              <button
                onClick={() => setIsAdminOpen(true)}
                className="text-white/10 hover:text-gold text-[10px] uppercase tracking-widest transition-colors"
              >
                Área Administrativa
              </button>
            </div>
          </div>
        </div>
      </footer>

      <FloatingWhatsApp
        number={settings?.whatsapp_number || '5594992496583'}
        message={buildWhatsAppMessage()}
      />
    </div>
  );
}
