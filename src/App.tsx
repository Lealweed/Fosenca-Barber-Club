import { motion, AnimatePresence } from 'motion/react';
import { Scissors, MapPin, Clock, Phone, Instagram, Facebook, MessageCircle, Star, Beer, Music, Settings, Loader2, X, Calendar as CalendarIcon, ChevronRight, Zap, Users, Award, Check } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import FloatingWhatsApp from './components/FloatingWhatsApp';
import AdminPanel from './components/AdminPanel';

const getSupabaseClient = () => {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) return null;
  return createClient(supabaseUrl, supabaseKey);
};

export default function App() {
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

  const [content, setContent] = useState<any>({
    settings: {
      whatsapp_number: "5594992496583",
      whatsapp_message_default_template: "Ola! Vim pelo site da Fonseca Barber Club e quero agendar meu horario. Pode me mostrar os horarios disponiveis?",
      whatsapp_message_service_template: "Ola! Vim pelo site da Fonseca Barber Club e quero saber mais sobre o plano {servico}. Pode me explicar como funciona e os horarios disponiveis?",
      address: "R. Caiena, Qd 16 Lt 29 Sala D - Novo Horizonte, Parauapebas - PA",
      hero_video: "https://oacqvijuafuzsbyyqdtt.supabase.co/storage/v1/object/public/barber-assets/gallery-video-1771970955047.MOV",
      logo_url: "https://oacqvijuafuzsbyyqdtt.supabase.co/storage/v1/object/public/barber-assets/logo.png"
    },
    services: [
      { name: "Plano Cabelo", price: "R$ 74,90", desc: "Corte e acabamento" },
      { name: "Plano Barba", price: "R$ 74,90", desc: "Barba desenhada e finalização" },
      { name: "Plano Cabelo e Barba", price: "R$ 154,90", desc: "Corte completo + barba" }
    ],
    gallery: [
      { url: "https://picsum.photos/seed/barber1/800/800" },
      { url: "https://picsum.photos/seed/barber2/800/800" },
      { url: "https://picsum.photos/seed/barber3/800/800" }
    ],
    video_gallery: []
  });
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorInfo, setErrorInfo] = useState<string>('');
  const [logoFailed, setLogoFailed] = useState(false);
  const [footerLogoFailed, setFooterLogoFailed] = useState(false);

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
    (settingsRes.data || []).forEach((row: any) => {
      settingsObj[row.key] = row.value;
    });

    return {
      settings: settingsObj,
        services: (() => {
          try { return JSON.parse(settingsObj.marketing_services || '[]'); } catch { return []; }
        })(),
      gallery: galleryRes.data || [],
      video_gallery: videoRes.data || [],
    };
  };

  const fetchContent = async () => {
    try {
      const res = await fetch('/api/content');
      if (!res.ok) throw new Error(`Erro: ${res.status}`);
      let data = await res.json();

        const apiLooksEmpty =
          (!data?.services || data.services.length === 0);
          // Note: only checking services here so fallback runs even when gallery has images

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
      
      // Only update if we actually got something useful
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

          const settingsGallery = parseGalleryFromSettings(data.settings || {});
          if (settingsGallery.length > 0) return settingsGallery;

          const prevGallery = normalizeGallery(prev.gallery || []);
          return prevGallery;
        })(),
        video_gallery: data.video_gallery && data.video_gallery.length > 0 ? data.video_gallery : prev.video_gallery
      }));
    } catch (error: any) {
      console.error("Background fetch error:", error);
      setErrorInfo(error.message);
    }
  };

  useEffect(() => {
    window.onerror = (msg) => {
      setErrorInfo(`Erro de Sistema: ${msg}`);
    };
    fetchContent();
  }, []);

  useEffect(() => {
    setLogoFailed(false);
    setFooterLogoFailed(false);
  }, [content?.settings?.logo_url]);

  const buildWhatsAppMessage = (serviceName?: string) => {
    const defaultTemplate = settings?.whatsapp_message_default_template
      || 'Ola! Vim pelo site da Fonseca Barber Club e quero agendar meu horario. Pode me mostrar os horarios disponiveis?';

    const serviceTemplate = settings?.whatsapp_message_service_template
      || 'Ola! Vim pelo site da Fonseca Barber Club e quero saber mais sobre o plano {servico}. Pode me explicar como funciona e os horarios disponiveis?';

    if (serviceName) {
      return serviceTemplate.includes('{servico}')
        ? serviceTemplate.replaceAll('{servico}', serviceName)
        : `${serviceTemplate} (${serviceName})`;
    }

    return defaultTemplate;
  };

  const buildWhatsAppUrl = (serviceName?: string) => {
    const rawNumber = settings?.whatsapp_number || '5594992496583';
    const number = String(rawNumber).replace(/\D/g, '');
    const message = encodeURIComponent(buildWhatsAppMessage(serviceName));
    return `https://wa.me/${number}?text=${message}`;
  };

  const handleWhatsAppContact = (serviceName?: string) => {
    window.open(buildWhatsAppUrl(serviceName), '_blank');
  };

  const settings = content?.settings || {
    whatsapp_number: "5594992496583",
    whatsapp_message_default_template: "Ola! Vim pelo site da Fonseca Barber Club e quero agendar meu horario. Pode me mostrar os horarios disponiveis?",
    whatsapp_message_service_template: "Ola! Vim pelo site da Fonseca Barber Club e quero saber mais sobre o plano {servico}. Pode me explicar como funciona e os horarios disponiveis?",
    address: "R. Caiena, Qd 16 Lt 29 Sala D - Novo Horizonte, Parauapebas - PA",
    hero_video: "https://oacqvijuafuzsbyyqdtt.supabase.co/storage/v1/object/public/barber-assets/gallery-video-1771970955047.MOV",
    instagram_url: "https://www.instagram.com/fonsecabarbearia.pbs/",
    facebook_url: "https://facebook.com",
    google_maps_url: "https://www.google.com/maps/dir//Fonseca+Barber+Club,+R.+Caiena,+Quadra+16+Lote+29+Sala+D+-+Novo+Horizonte,+Parauapebas+-+PA,+68515-000/@-6.0612128,-49.8854506,15z/data=!4m8!4m7!1m0!1m5!1m1!1s0x92dd51a5a55a2507:0x363c577dd2197698!2m2!1d-49.8950371!2d-6.0569643?entry=ttu",
    hero_title: "ELEVE O SEU PADRÃO",
    hero_subtitle: "A melhor barbearia de Parauapebas",
    hero_description: "Bem-vindo à Fonseca Barber Club. Mais que uma barbearia — uma experiência completa de cuidado, estilo e confiança. Conheça nossos planos de assinatura e mantenha seu visual impecável o mês inteiro.",
    logo_url: "https://oacqvijuafuzsbyyqdtt.supabase.co/storage/v1/object/public/barber-assets/logo.png"
  };
  const services = content?.services || [];
  
  const WHATSAPP_URL = buildWhatsAppUrl();

  const displayServices = services;
  const displayGallery = normalizeGallery(content?.gallery || []).slice(0, 4);

  return (
    <div className="min-h-screen font-sans selection:bg-gold selection:text-zinc-950 text-white overflow-x-hidden bg-zinc-950">
      {/* Fixed Background Video/Image */}
      <div className="fixed inset-0 z-0 pointer-events-none bg-black">
        {settings?.hero_image ? (
          <img 
            key={settings?.hero_image}
            src={settings?.hero_image}
            alt="Background"
            className="w-full h-full object-cover opacity-100"
            style={{ filter: 'brightness(0.8) contrast(1.1)' }}
          />
        ) : (
          <video 
            key={settings?.hero_video}
            autoPlay 
            muted 
            loop 
            playsInline
            className="w-full h-full object-cover opacity-100"
            style={{ filter: 'brightness(0.8) contrast(1.1)' }}
          >
            <source src={settings?.hero_video} />
          </video>
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/80" />
      </div>

      {/* Admin Panel Trigger */}
      <button 
        onClick={() => setIsAdminOpen(true)}
        className="fixed bottom-6 left-6 z-50 bg-zinc-900/80 backdrop-blur-md p-4 rounded-full border border-gold/30 text-gold hover:scale-110 transition-all shadow-2xl"
        title="Painel Administrativo"
      >
        <Settings className="w-6 h-6" />
      </button>

      {/* Admin Panel */}
      {isAdminOpen && (
        <AdminPanel 
          initialData={content} 
          onClose={() => setIsAdminOpen(false)} 
          onUpdate={fetchContent}
        />
      )}

      {/* Navigation */}
      <header className="fixed w-full top-0 z-50 bg-black/85 backdrop-blur-md border-b border-gold/20 shadow-[0_10px_40px_rgba(0,0,0,0.55)]">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3 flex-shrink-0 bg-black/95 border border-gold/30 rounded-2xl px-4 py-2 shadow-[0_0_30px_rgba(0,0,0,0.65)]">
            {!logoFailed && (
              <img 
                src={settings.logo_url || "https://oacqvijuafuzsbyyqdtt.supabase.co/storage/v1/object/public/barber-assets/logo.png"} 
                alt="Fonseca Barber Club" 
                className="h-14 w-auto brightness-125 contrast-125 drop-shadow-[0_0_18px_rgba(0,0,0,0.9)]"
                onError={() => setLogoFailed(true)}
              />
            )}
            <div className={`flex flex-col ${logoFailed ? '' : 'hidden'}`}>
              <span className="text-lg font-bold tracking-widest uppercase text-white">Fonseca</span>
              <span className="text-xs text-gold tracking-widest">Barber Club</span>
            </div>
          </div>
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium tracking-widest uppercase">
            <a href="#planos" className="hover:text-gold transition-colors">Planos</a>
            <a href="#contato" className="hover:text-gold transition-colors">Contato</a>
          </nav>
          <button 
            onClick={() => handleWhatsAppContact()}
            className="bg-gold text-zinc-950 px-6 py-2.5 rounded-full font-bold text-sm uppercase tracking-widest hover:bg-white transition-colors"
          >
            Contato
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="min-h-screen flex items-center justify-center pt-20 px-6 relative overflow-hidden">
        {/* Background Overlay for better readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-zinc-950 z-0" />
        
        <div className="max-w-5xl mx-auto text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: "easeOut" }}
          >
            <div className="inline-flex items-center gap-3 px-6 py-2.5 rounded-full border border-gold/30 bg-black/40 backdrop-blur-md mb-10">
              <div className="w-2 h-2 rounded-full bg-gold animate-pulse" />
              <span className="text-xs font-bold tracking-[0.2em] uppercase text-gold/90">{settings.hero_subtitle || "A Melhor Barbearia da Região"}</span>
            </div>
            
            <h1 className="font-serif text-6xl md:text-8xl lg:text-9xl font-bold mb-8 leading-[0.9] tracking-tighter" dangerouslySetInnerHTML={{ __html: settings.hero_title || "A Arte do <br /><span class='text-transparent bg-clip-text bg-gradient-to-r from-gold via-yellow-200 to-gold'>Corte Perfeito</span>" }}>
            </h1>
            
            <p className="text-xl md:text-2xl text-white/60 mb-12 max-w-3xl mx-auto font-light leading-relaxed">
              {settings.hero_description || "Mais que um corte de cabelo, uma experiência premium de cuidado masculino. Ambiente climatizado, cerveja gelada e profissionais de elite."}
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
              <button 
                onClick={() => handleWhatsAppContact()}
                className="w-full sm:w-auto bg-gold text-zinc-950 px-10 py-5 rounded-full font-black uppercase tracking-widest hover:bg-white transition-all transform hover:scale-105 shadow-2xl shadow-gold/20"
              >
                Conhecer planos
              </button>
              <a 
                href="#planos"
                className="w-full sm:w-auto px-10 py-5 rounded-full font-bold uppercase tracking-widest border border-white/10 bg-white/5 backdrop-blur-sm hover:bg-white/10 transition-all"
              >
                Agendar horário
              </a>
            </div>
          </motion.div>
        </div>

        {/* Decorative elements */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 animate-bounce opacity-30">
          <div className="w-px h-12 bg-gradient-to-b from-gold to-transparent" />
        </div>
      </section>

      {/* Conquistou a Cidade Section */}
      <section className="py-32 relative z-10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="font-serif text-6xl md:text-7xl font-bold text-white mb-8 tracking-tighter">Uma barbearia que já conquistou a cidade</h2>
              <p className="text-white/60 text-lg leading-relaxed mb-8">
                A Fonseca Barber Club se tornou referência em estilo, atendimento e experiência em Parauapebas. Centenas de clientes já confiaram no nosso trabalho e mais de 100 clientes fazem parte do Clube Fonseca.
              </p>
            </div>
            <div className="bg-gradient-to-br from-gold/20 to-transparent p-12 rounded-[40px] border border-gold/30 flex items-center justify-center min-h-[400px]">
              <div className="text-center">
                <div className="text-6xl font-bold text-gold mb-4">100+</div>
                <p className="text-white/60">Clientes no Clube Fonseca</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Planos Section */}
      <section id="planos" className="py-32 relative z-10 bg-zinc-950/40 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-20 gap-8">
            <div className="max-w-2xl">
              <h2 className="font-serif text-6xl md:text-8xl font-bold text-white mb-6 tracking-tighter italic">Nossos <span className="text-gold">Planos</span></h2>
              <p className="text-white/40 uppercase tracking-[0.4em] text-sm font-bold">Cortes de elite para homens de bom gosto</p>
            </div>
            <div className="hidden md:block w-32 h-px bg-gold/30 mb-4" />
          </div>
          
          <div className="grid md:grid-cols-3 gap-12">
            {displayServices.map((service: any, i: number) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="group relative"
              >
                <div className="absolute -inset-2 bg-gradient-to-b from-gold/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity blur-xl rounded-[40px]" />
                <div className="relative bg-zinc-900/40 backdrop-blur-md border border-white/5 p-10 rounded-[32px] hover:border-gold/30 transition-all h-full flex flex-col">
                  <div className="flex justify-between items-start mb-10">
                    <div className="text-gold font-mono text-3xl font-bold tracking-tighter">{service.price}</div>
                    <div className="bg-white/5 p-3 rounded-xl">
                      <Scissors className="w-6 h-6 text-gold/50" />
                    </div>
                  </div>
                  <h3 className="text-3xl font-bold text-white mb-4 tracking-tight">{service.name}</h3>
                  <p className="text-white/40 mb-10 leading-relaxed font-light flex-grow">{service.description || service.desc}</p>
                  <button 
                    onClick={() => handleWhatsAppContact(service.name)}
                    className="w-full py-5 rounded-2xl bg-white/5 border border-white/10 text-white font-bold hover:bg-gold hover:text-zinc-950 transition-all uppercase tracking-widest text-xs"
                  >
                    Saiba Mais
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Conecte-se Conosco Section */}
      <section className="py-24 relative z-10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-5xl md:text-6xl font-bold text-white mb-4">Conecte-se <span className="text-gold">Conosco</span></h2>
            <p className="text-white/60 text-xl">Fale com a gente pelos nossos canais</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {/* Instagram Card */}
            <motion.div 
              whileHover={{ y: -10 }}
              className="bg-gradient-to-br from-purple-600 to-pink-500 p-12 rounded-[40px] text-center flex flex-col items-center gap-6"
            >
              <div className="bg-white/20 p-6 rounded-full">
                <Instagram className="w-12 h-12 text-white" />
              </div>
              <h3 className="text-3xl font-bold text-white">Instagram</h3>
              <p className="text-white/80">Siga nosso trabalho</p>
              <a href={settings.instagram_url || "#"} target="_blank" rel="noopener noreferrer" className="w-full bg-white/20 hover:bg-white/30 text-white py-4 rounded-xl font-bold transition-colors">Seguir Agora</a>
            </motion.div>

            {/* WhatsApp Card */}
            <motion.div 
              whileHover={{ y: -10 }}
              className="bg-[#25D366] p-12 rounded-[40px] text-center flex flex-col items-center gap-6"
            >
              <div className="bg-white/20 p-6 rounded-full">
                <MessageCircle className="w-12 h-12 text-white" />
              </div>
              <h3 className="text-3xl font-bold text-white">WhatsApp</h3>
              <p className="text-white/80">Resposta rápida</p>
              <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="w-full bg-white/20 hover:bg-white/30 text-white py-4 rounded-xl font-bold transition-colors">Chamar Agora</a>
            </motion.div>

            {/* Localização Card */}
            <motion.div 
              whileHover={{ y: -10 }}
              className="bg-gold p-12 rounded-[40px] text-center flex flex-col items-center gap-6"
            >
              <div className="bg-black/10 p-6 rounded-full">
                <MapPin className="w-12 h-12 text-black" />
              </div>
              <h3 className="text-3xl font-bold text-black">Localização</h3>
              <p className="text-black/60">{settings.address || "Como chegar"}</p>
              <a href={settings.google_maps_url || "#"} target="_blank" rel="noopener noreferrer" className="w-full bg-black/10 hover:bg-black/20 text-black py-4 rounded-xl font-bold transition-colors">Ver no Mapa</a>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Por que Escolher Section */}
      <section className="py-24 relative z-10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-5xl md:text-6xl font-bold text-white">Por que escolher a <span className="text-gold">Fonseca Barber Club</span></h2>
          </div>
          
          <div className="grid md:grid-cols-3 gap-12">
            {[
              { 
                icon: Scissors, 
                title: "Precisão e padrão em cada corte",
                desc: "Nossa equipe segue um padrão de qualidade para garantir cortes bem executados, acabamento limpo e um visual alinhado em cada atendimento."
              },
              { 
                icon: Star, 
                title: "Experiência que vai além do corte",
                desc: "Aqui você não vem apenas cortar o cabelo. Oferecemos uma experiência completa de cuidado, conforto e atenção aos detalhes."
              },
              { 
                icon: Award, 
                title: "Clube de assinatura exclusivo",
                desc: "Com os planos de assinatura da Fonseca Barber Club, você mantém seu visual sempre em dia com praticidade e economia todos os meses."
              }
            ].map((item, i) => (
              <div key={i} className="group">
                <div className="bg-white/5 backdrop-blur-md border border-white/10 p-10 rounded-[32px] text-center flex flex-col items-center gap-6 group-hover:border-gold/50 transition-all h-full">
                  <div className="bg-gold/10 p-4 rounded-full group-hover:scale-110 transition-transform">
                    <item.icon className="w-10 h-10 text-gold" />
                  </div>
                  <h3 className="text-2xl font-bold text-white">{item.title}</h3>
                  <p className="text-white/60 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Assinaturas Section */}
      <section id="assinaturas" className="py-32 relative z-10 bg-zinc-950/40 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6">
          <div className="bg-zinc-900/30 border border-white/5 rounded-[60px] p-12 md:p-24 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-96 h-96 bg-gold/10 blur-[120px] -mr-48 -mt-48" />
            
            <div className="relative z-10 text-center mb-20">
              <div className="inline-flex items-center gap-3 bg-gold/10 border border-gold/20 px-8 py-3 rounded-full mb-10">
                <Zap className="w-4 h-4 text-gold fill-gold" />
                <span className="text-gold text-xs font-black uppercase tracking-[0.3em]">Clube Fonseca</span>
              </div>
              <h2 className="font-serif text-6xl md:text-9xl font-bold text-white mb-10 tracking-tighter italic leading-none">Seu visual <span className="text-gold">sempre em dia</span></h2>
              <p className="text-white/40 text-xl max-w-2xl mx-auto font-light leading-relaxed">
                Com os planos de assinatura da Fonseca Barber Club, você pode cuidar do seu visual todos os meses com praticidade e economia.
              </p>
              <div className="mt-10 space-y-2 text-white/60">
                <p>✂️ Corte sempre alinhado</p>
                <p>✂️ Barba sempre bem feita</p>
                <p>✂️ Estilo sempre no mais alto nível</p>
              </div>
            </div>
            
            <div className="grid lg:grid-cols-3 gap-10 relative z-10">
              {displayServices.slice(0, 3).map((plano: any, i: number) => (
                <motion.div 
                  key={i}
                  whileHover={{ y: -10 }}
                  className={`p-10 rounded-[40px] border transition-all flex flex-col ${i === 2 ? 'bg-gold border-gold text-zinc-950' : 'bg-white/5 border-white/10 text-white hover:border-gold/50'}`}
                >
                  {i === 2 && (
                    <div className="bg-zinc-950 text-gold text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full self-start mb-8">
                      Mais Escolhido
                    </div>
                  )}
                  <h3 className="text-3xl font-bold mb-4 tracking-tight">{plano.name}</h3>
                  <p className={`mb-10 text-sm font-medium ${i === 2 ? 'text-zinc-950/60' : 'text-white/40'}`}>{plano.desc ?? plano.description}</p>
                  
                  <div className="mb-10 mt-auto">
                    <div className="flex items-baseline gap-2">
                      <span className="text-5xl font-black tracking-tighter">{plano.price}</span>
                      <span className={`text-sm font-bold ${i === 2 ? 'text-zinc-950/40' : 'text-white/20'}`}>/MÊS</span>
                    </div>
                  </div>

                  <button className={`w-full py-5 rounded-2xl font-black uppercase tracking-widest text-xs transition-all ${i === 2 ? 'bg-zinc-950 text-white hover:bg-zinc-800' : 'bg-gold text-zinc-950 hover:bg-white'}`}>
                    Assinar Agora
                  </button>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-24 relative z-10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[60px] p-16 grid md:grid-cols-3 gap-12">
            <div className="text-center space-y-6">
              <div className="bg-gold/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto">
                <Star className="w-10 h-10 text-gold" />
              </div>
              <h3 className="text-2xl font-bold">Economia Garantida</h3>
              <p className="text-white/50">Pague menos por corte com nossos planos mensais</p>
            </div>
            <div className="text-center space-y-6">
              <div className="bg-gold/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto">
                <CalendarIcon className="w-10 h-10 text-gold" />
              </div>
              <h3 className="text-2xl font-bold">Prioridade no Agendamento</h3>
              <p className="text-white/50">Assinantes têm preferência nos horários</p>
            </div>
            <div className="text-center space-y-6">
              <div className="bg-gold/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto">
                <Award className="w-10 h-10 text-gold" />
              </div>
              <h3 className="text-2xl font-bold">Benefícios Exclusivos</h3>
              <p className="text-white/50">Descontos em produtos e serviços extras</p>
            </div>
          </div>
        </div>
      </section>

      {/* Experiência do Cliente Section */}
      <section className="py-32 relative z-10 bg-zinc-950/40 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-5xl md:text-6xl font-bold text-white mb-6">Cada cliente vive uma <span className="text-gold">Experiência</span></h2>
            <p className="text-white/60 text-lg max-w-2xl mx-auto">Na Fonseca Barber Club cada atendimento é único. Cuidamos de cada detalhe para que você saia daqui com confiança e estilo.</p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8 mb-12">
            {displayGallery.map((item: any, i: number) => (
              <motion.div
                key={item.id ?? item.url ?? i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="group relative rounded-[32px] overflow-hidden"
              >
                <div className="aspect-video bg-zinc-900 rounded-[32px] overflow-hidden">
                  <img
                    src={item.url}
                    alt={`Experiência ${i + 1}`}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    onError={(e) => {
                      e.currentTarget.src = 'https://via.placeholder.com/600x400/1a1a1a/ffffff?text=Foto+Galeria';
                    }}
                  />
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              </motion.div>
            ))}
          </div>

          {displayGallery.length === 0 && (
            <div className="text-center text-white/50 mb-12">Adicione fotos na galeria pelo painel para exibir aqui na Home.</div>
          )}

          <div className="text-center">
            <button
              onClick={() => handleWhatsAppContact()}
              className="bg-gold text-zinc-950 px-10 py-5 rounded-full font-bold uppercase tracking-widest hover:bg-white transition-all"
            >
              Agende Sua Experiência
            </button>
          </div>
        </div>
      </section>

      {/* Seu Próximo Corte Começa Aqui Section */}
      <section className="py-24 relative z-10">
        <div className="max-w-5xl mx-auto px-6">
          <div className="bg-gradient-to-r from-gold/20 to-gold/10 border border-gold/30 rounded-[40px] p-16 text-center">
            <h2 className="font-serif text-5xl md:text-6xl font-bold mb-8">Seu próximo corte <span className="text-gold">começa aqui</span></h2>
            <p className="text-white/70 text-lg mb-12 max-w-2xl mx-auto font-light">
              Agende agora seu horário ou conheça os planos de assinatura da Fonseca Barber Club.
            </p>
            <div className="flex flex-wrap justify-center gap-6">
              <a 
                href={WHATSAPP_URL}
                className="bg-gold text-black px-12 py-5 rounded-full font-bold text-lg flex items-center gap-3 hover:bg-gold/90 transition-all shadow-2xl shadow-gold/20"
              >
                <MessageCircle className="w-6 h-6" />
                Agendar horário
              </a>
              <a 
                href="#planos"
                className="border-2 border-gold text-gold px-12 py-5 rounded-full font-bold text-lg flex items-center gap-3 hover:bg-gold/10 transition-all"
              >
                <Scissors className="w-6 h-6" />
                Conhecer planos
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Garanta Seu Horário Section */}
      <section className="py-24 relative z-10">
        <div className="max-w-5xl mx-auto px-6">
          <div className="bg-gold rounded-[40px] p-16 text-center text-black relative overflow-hidden">
            <div className="relative z-10">
              <h2 className="text-5xl md:text-6xl font-bold mb-8 flex items-center justify-center gap-4">
                <Zap className="w-12 h-12 fill-black" />
                Garanta Seu Horário Agora!
              </h2>
              <p className="text-black/70 text-xl mb-12 max-w-2xl mx-auto font-medium">
                Não perca tempo! Agende seu corte hoje mesmo e transforme seu visual com os melhores profissionais.
              </p>
              <div className="flex flex-wrap justify-center gap-6">
                <button 
                  onClick={() => handleWhatsAppContact()}
                  className="bg-zinc-900 text-gold px-12 py-5 rounded-2xl font-bold text-lg flex items-center gap-3 hover:bg-black transition-all"
                >
                  <MessageCircle className="w-6 h-6" />
                  Falar no WhatsApp
                </button>
                <a 
                  href={WHATSAPP_URL}
                  className="bg-white/20 border border-black/10 px-12 py-5 rounded-2xl font-bold text-lg flex items-center gap-3 hover:bg-white/30 transition-all"
                >
                  <MessageCircle className="w-6 h-6" />
                  Chamar no WhatsApp
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Visite-nos Section */}
      <section id="contato" className="py-24 relative z-10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[60px] p-16">
            <div className="text-center mb-16">
              <h2 className="text-5xl md:text-6xl font-bold mb-4">Visite-nos ou <span className="text-gold">Entre em Contato</span></h2>
              <p className="text-white/60 text-xl">Estamos prontos para atendê-lo</p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-12">
              <div className="text-center space-y-6">
                <div className="bg-gold/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto">
                  <MapPin className="w-10 h-10 text-gold" />
                </div>
                <h3 className="text-2xl font-bold">Localização</h3>
                <p className="text-white/50">{settings?.address || "R. Caiena, Qd 16 Lt 29 Sala D - Novo Horizonte, Parauapebas - PA"}</p>
                <button className="border border-gold text-gold px-8 py-3 rounded-xl font-bold hover:bg-gold/10 transition-all">Ver Mapa</button>
              </div>
              
              <div className="text-center space-y-6">
                <div className="bg-gold/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto">
                  <Phone className="w-10 h-10 text-gold" />
                </div>
                <h3 className="text-2xl font-bold">Telefone</h3>
                <p className="text-white/50">{settings?.whatsapp_number || "5594992496583"}</p>
                <a href={`tel:${settings?.whatsapp_number || "5594992496583"}`} className="border border-gold text-gold px-8 py-3 rounded-xl font-bold hover:bg-gold/10 transition-all inline-block">Ligar Agora</a>
              </div>
              
              <div className="text-center space-y-6">
                <div className="bg-gold/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto">
                  <Clock className="w-10 h-10 text-gold" />
                </div>
                <h3 className="text-2xl font-bold">Horário</h3>
                <p className="text-white/50">Seg-Sáb: 9h-20h</p>
                <button 
                  onClick={() => handleWhatsAppContact()}
                  className="border border-gold text-gold px-8 py-3 rounded-xl font-bold hover:bg-gold/10 transition-all"
                >
                  Falar Conosco
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-24 relative z-10">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <h2 className="font-serif text-6xl md:text-8xl font-bold mb-12 italic">Pronto para Transformar Seu <span className="text-gold">Visual?</span></h2>
          <p className="text-white/60 text-xl mb-16 max-w-3xl mx-auto">
            Não espere mais! Agende agora e experimente o melhor da barbearia tradicional com um toque moderno
          </p>
          <div className="flex flex-wrap justify-center gap-6">
            <button 
              onClick={() => handleWhatsAppContact()}
              className="bg-gold text-black px-12 py-5 rounded-2xl font-bold text-lg flex items-center gap-3 hover:bg-gold/90 transition-all shadow-2xl shadow-gold/20"
            >
              <MessageCircle className="w-6 h-6" />
              Falar com Especialista
            </button>
            <button className="border-2 border-gold text-gold px-12 py-5 rounded-2xl font-bold text-lg flex items-center gap-3 hover:bg-gold/10 transition-all">
              <Star className="w-6 h-6" />
              Ver Planos
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-16 relative z-10 bg-black/95 border-t border-gold/20 text-center">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-center mb-10">
            <div className="bg-black border border-gold/30 rounded-3xl px-6 py-4 shadow-[0_0_40px_rgba(0,0,0,0.8)]">
              {!footerLogoFailed && (
                <img 
                  src={settings.logo_url || "https://oacqvijuafuzsbyyqdtt.supabase.co/storage/v1/object/public/barber-assets/logo.png"} 
                  alt="Fonseca Barber Club" 
                  className="h-24 w-auto brightness-125 contrast-125"
                  onError={() => setFooterLogoFailed(true)}
                />
              )}
              <div className={`flex flex-col items-center ${footerLogoFailed ? '' : 'hidden'}`}>
                <span className="font-serif text-4xl font-bold tracking-tighter text-white italic leading-none">Fonseca</span>
                <span className="text-xs text-gold tracking-[0.4em] font-bold uppercase mt-1">BARBER CLUB</span>
              </div>
            </div>
          </div>
          <p className="text-white/40 text-sm mb-6">
            © 2024 Fonseca Barber Club. Todos os direitos reservados. <br />
            Excelência em cada detalhe.
            <span className="block text-[8px] mt-2 opacity-20">v1.1.3 | Premium Experience</span>
          </p>
          <div className="flex justify-center gap-6 text-white/40 mb-8">
            <a href="#" className="hover:text-gold transition-colors"><Instagram /></a>
            <a href="#" className="hover:text-gold transition-colors"><Facebook /></a>
          </div>
          <button 
            onClick={() => {
              setErrorInfo('');
              fetchContent();
            }}
            className="text-white/10 hover:text-gold text-[10px] uppercase tracking-widest transition-colors mr-4"
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
      </footer>

      <FloatingWhatsApp
        number={settings?.whatsapp_number || "5594992496583"}
        message={buildWhatsAppMessage()}
      />
    </div>
  );
}
