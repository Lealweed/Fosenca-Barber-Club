import { motion, AnimatePresence } from 'motion/react';
import { Scissors, MapPin, Clock, Phone, Instagram, Facebook, MessageCircle, Star, Beer, Music, Gamepad2, Settings, Loader2, X, Calendar as CalendarIcon, User, ChevronRight, Zap, Trophy, Users, Award, Check } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import FloatingWhatsApp from './components/FloatingWhatsApp';
import ChatBot from './components/ChatBot';
import AdminPanel from './components/AdminPanel';

export default function App() {
  const [content, setContent] = useState<any>({
    settings: {
      whatsapp_number: "5511999999999",
      address: "Rua Exemplo, 123",
      hero_video: "https://oacqvijuafuzsbyyqdtt.supabase.co/storage/v1/object/public/barber-assets/gallery-video-1771970955047.MOV"
    },
    services: [
      { name: "Corte Social", price: "R$ 35", desc: "Corte clássico e acabamento impecável" },
      { name: "Barba Completa", price: "R$ 30", desc: "Toalha quente e barbear tradicional" },
      { name: "Combo Premium", price: "R$ 60", desc: "Cabelo + Barba + Lavagem" }
    ],
    gallery: [
      { url: "https://picsum.photos/seed/barber1/800/800" },
      { url: "https://picsum.photos/seed/barber2/800/800" },
      { url: "https://picsum.photos/seed/barber3/800/800" }
    ],
    video_gallery: [],
    appointments: []
  });
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<string>('');
  const [bookingForm, setBookingForm] = useState({ name: '', date: '', time: '' });
  const [errorInfo, setErrorInfo] = useState<string>('');

  const fetchContent = async () => {
    try {
      const res = await fetch('/api/content');
      if (!res.ok) throw new Error(`Erro: ${res.status}`);
      const data = await res.json();
      
      // Only update if we actually got something useful
      setContent((prev: any) => ({
        settings: { ...prev.settings, ...(data.settings || {}) },
        services: data.services && data.services.length > 0 ? data.services : prev.services,
        gallery: data.gallery && data.gallery.length > 0 ? data.gallery : prev.gallery,
        video_gallery: data.video_gallery && data.video_gallery.length > 0 ? data.video_gallery : prev.video_gallery,
        appointments: data.appointments || prev.appointments
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

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetch('/api/admin/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_name: bookingForm.name,
          service_name: selectedService || 'Geral',
          date: bookingForm.date,
          time: bookingForm.time
        })
      });
      
      const message = encodeURIComponent(`Olá! Meu nome é ${bookingForm.name}. Gostaria de agendar ${selectedService} para o dia ${bookingForm.date} às ${bookingForm.time}.`);
      window.open(`https://wa.me/${content.settings.whatsapp_number}?text=${message}`, '_blank');
      setIsBookingOpen(false);
      fetchContent();
    } catch (error) {
      console.error(error);
    }
  };

  const settings = content?.settings || {
    whatsapp_number: "5511999999999",
    address: "Rua Exemplo, 123",
    hero_video: "https://oacqvijuafuzsbyyqdtt.supabase.co/storage/v1/object/public/barber-assets/gallery-video-1771970955047.MOV"
  };
  const services = content?.services || [];
  const gallery = content?.gallery || [];
  
  const WHATSAPP_URL = `https://wa.me/${settings?.whatsapp_number || "5511999999999"}`;

  const displayServices = services;
  const displayGallery = gallery;
  const displayVideoGallery = content?.video_gallery || [];

  return (
    <div className="min-h-screen font-sans selection:bg-gold selection:text-zinc-950 text-white overflow-x-hidden bg-zinc-950">
      {/* Fixed Background Video */}
      <div className="fixed inset-0 z-0 pointer-events-none bg-black">
        <video 
          key={settings?.hero_video}
          autoPlay 
          muted 
          loop 
          playsInline
          className="w-full h-full object-cover opacity-100"
          style={{ filter: 'brightness(0.6) contrast(1.1)' }}
        >
          <source src={settings?.hero_video} />
        </video>
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/80" />
      </div>

      {/* Content Overlay */}
      <div className="relative z-10">
        {/* Header */}
        <header className="fixed w-full top-0 z-50 bg-black/50 backdrop-blur-md border-b border-white/5">
          <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gold rounded-full flex items-center justify-center">
                <Scissors className="w-6 h-6 text-zinc-950" />
              </div>
              <span className="text-xl font-bold tracking-widest uppercase">Fonseca</span>
            </div>
            <nav className="hidden md:flex items-center gap-8 text-sm font-medium tracking-widest uppercase">
              <a href="#services" className="hover:text-gold transition-colors">Serviços</a>
              <a href="#experience" className="hover:text-gold transition-colors">Experiência</a>
              <a href="#gallery" className="hover:text-gold transition-colors">Galeria</a>
              <a href="#contact" className="hover:text-gold transition-colors">Contato</a>
            </nav>
            <button 
              onClick={() => setIsBookingOpen(true)}
              className="bg-gold text-zinc-950 px-6 py-2.5 rounded-full font-bold text-sm uppercase tracking-widest hover:bg-white transition-colors"
            >
              Agendar
            </button>
          </div>
        </header>

        {/* Hero Section */}
        <section className="min-h-screen flex items-center justify-center pt-20 px-6">
          <div className="max-w-4xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-gold/30 bg-black/50 backdrop-blur-sm mb-8">
                <Star className="w-4 h-4 text-gold" />
                <span className="text-xs font-bold tracking-widest uppercase text-gold">A Melhor Barbearia da Região</span>
              </div>
              <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold mb-6 leading-tight">
                A Arte do <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-gold via-yellow-200 to-gold">
                  Corte Perfeito
                </span>
              </h1>
              <p className="text-lg md:text-xl text-white/70 mb-10 max-w-2xl mx-auto font-light">
                Mais que um corte de cabelo, uma experiência premium de cuidado masculino. 
                Ambiente climatizado, cerveja gelada e profissionais de elite.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <button 
                  onClick={() => setIsBookingOpen(true)}
                  className="w-full sm:w-auto bg-gold text-zinc-950 px-8 py-4 rounded-full font-bold uppercase tracking-widest hover:bg-white transition-all transform hover:scale-105"
                >
                  Agendar Horário
                </button>
                <a 
                  href="#services"
                  className="w-full sm:w-auto px-8 py-4 rounded-full font-bold uppercase tracking-widest border border-white/20 hover:bg-white/10 transition-all"
                >
                  Ver Serviços
                </a>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-24 bg-zinc-950/95 relative">
          <div className="max-w-7xl mx-auto px-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                { icon: Trophy, title: "Profissionais de Elite", desc: "Equipe premiada e em constante atualização" },
                { icon: Beer, title: "Bar Premium", desc: "Cerveja artesanal, whisky e café espresso" },
                { icon: Zap, title: "Ambiente Climatizado", desc: "Conforto total durante seu atendimento" }
              ].map((feature, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.2 }}
                  className="p-8 rounded-2xl bg-white/5 border border-white/10 hover:border-gold/50 transition-colors group"
                >
                  <div className="w-14 h-14 bg-gold/10 rounded-xl flex items-center justify-center mb-6 group-hover:bg-gold/20 transition-colors">
                    <feature.icon className="w-7 h-7 text-gold" />
                  </div>
                  <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                  <p className="text-white/50 leading-relaxed">{feature.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Services Section */}
        <section id="services" className="py-32 bg-zinc-950 relative">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-20">
              <h2 className="text-4xl md:text-5xl font-bold mb-6">Nossos Serviços</h2>
              <p className="text-white/50 max-w-2xl mx-auto">
                Técnicas tradicionais combinadas com as últimas tendências do mercado.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-x-16 gap-y-8">
              {displayServices.map((service: any, index: number) => (
                <motion.div 
                  key={index}
                  initial={{ opacity: 0, x: index % 2 === 0 ? -20 : 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  className="group cursor-pointer"
                  onClick={() => {
                    setSelectedService(service.name);
                    setIsBookingOpen(true);
                  }}
                >
                  <div className="flex items-center justify-between border-b border-white/10 pb-6 group-hover:border-gold transition-colors">
                    <div>
                      <h3 className="text-2xl font-bold mb-2 group-hover:text-gold transition-colors">{service.name}</h3>
                      <p className="text-white/50 text-sm">{service.desc || service.description}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-2xl font-bold text-gold">{service.price}</span>
                      <button className="block mt-2 text-[10px] uppercase tracking-widest text-white/30 group-hover:text-gold transition-colors">
                        Agendar
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Experience Section */}
        <section id="experience" className="py-32 bg-zinc-900 relative overflow-hidden">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute inset-0 bg-[url('https://picsum.photos/seed/pattern/1920/1080')] bg-repeat opacity-20 mix-blend-overlay" />
          </div>
          <div className="max-w-7xl mx-auto px-6 relative z-10">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <div>
                <h2 className="text-4xl md:text-5xl font-bold mb-8">Muito além de um corte de cabelo</h2>
                <div className="space-y-8">
                  {[
                    { icon: Music, title: "Som Ambiente", desc: "Playlist selecionada para criar o clima perfeito" },
                    { icon: Gamepad2, title: "Área de Espera", desc: "Videogame e revistas atualizadas" },
                    { icon: Users, title: "Networking", desc: "Conecte-se com outros clientes em nosso bar" }
                  ].map((item, i) => (
                    <div key={i} className="flex gap-6">
                      <div className="w-12 h-12 rounded-full bg-gold/10 flex items-center justify-center shrink-0">
                        <item.icon className="w-6 h-6 text-gold" />
                      </div>
                      <div>
                        <h4 className="text-xl font-bold mb-2">{item.title}</h4>
                        <p className="text-white/50">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="relative">
                <div className="aspect-square rounded-3xl overflow-hidden">
                  <img 
                    src="https://picsum.photos/seed/barber-experience/800/800" 
                    alt="Barber Experience" 
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div className="absolute -bottom-8 -left-8 bg-zinc-950 p-8 rounded-3xl border border-white/10">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="flex -space-x-4">
                      {[1,2,3,4].map(i => (
                        <img key={i} src={`https://picsum.photos/seed/user${i}/100/100`} className="w-12 h-12 rounded-full border-2 border-zinc-950" alt="Client" />
                      ))}
                    </div>
                    <div className="text-sm">
                      <div className="flex text-gold">
                        {[1,2,3,4,5].map(i => <Star key={i} className="w-4 h-4 fill-current" />)}
                      </div>
                      <span className="font-bold">+500 avaliações</span>
                    </div>
                  </div>
                  <p className="text-white/70 italic">"A melhor experiência que já tive em uma barbearia."</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Gallery Section */}
        <section id="gallery" className="py-32 bg-zinc-950">
          <div className="max-w-7xl mx-auto px-6">
            <div className="flex justify-between items-end mb-16">
              <div>
                <h2 className="text-4xl md:text-5xl font-bold mb-4">Nossos Trabalhos</h2>
                <p className="text-white/50">Confira o resultado do nosso padrão de excelência.</p>
              </div>
              <a href={WHATSAPP_URL} className="hidden md:flex items-center gap-2 text-gold hover:text-white transition-colors uppercase tracking-widest text-sm font-bold">
                Ver mais no Instagram <ChevronRight className="w-4 h-4" />
              </a>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {displayGallery.map((img: any, i: number) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="aspect-[4/5] rounded-2xl overflow-hidden group relative"
                >
                  <img 
                    src={img.url} 
                    alt={`Gallery ${i}`} 
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-8">
                    <div className="translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                      <p className="text-gold font-bold mb-2">Corte & Barba</p>
                      <p className="text-white/70 text-sm">Por Fonseca Barber Club</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Video Gallery Section */}
        {displayVideoGallery.length > 0 && (
          <section className="py-32 bg-zinc-900">
            <div className="max-w-7xl mx-auto px-6">
              <div className="text-center mb-16">
                <h2 className="text-4xl md:text-5xl font-bold mb-4">Vídeos</h2>
                <p className="text-white/50">Acompanhe nosso dia a dia</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {displayVideoGallery.map((video: any, i: number) => (
                  <div key={i} className="aspect-[9/16] rounded-2xl overflow-hidden bg-black relative group">
                    <video 
                      src={video.url} 
                      controls 
                      className="w-full h-full object-cover"
                      preload="metadata"
                    />
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Contact Section */}
        <section id="contact" className="py-32 bg-zinc-950 border-t border-white/5">
          <div className="max-w-7xl mx-auto px-6">
            <div className="grid lg:grid-cols-2 gap-16">
              <div>
                <h2 className="text-4xl md:text-5xl font-bold mb-8">Visite o Clube</h2>
                <p className="text-white/50 mb-12 text-lg">
                  Estamos prontos para receber você. Agende seu horário ou venha nos fazer uma visita.
                </p>
                
                <div className="space-y-8">
                  <div className="flex items-start gap-6">
                    <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center shrink-0">
                      <MapPin className="w-6 h-6 text-gold" />
                    </div>
                    <div>
                      <h4 className="text-xl font-bold mb-2">Localização</h4>
                      <p className="text-white/50">{settings?.address || "Rua Exemplo, 123"}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-6">
                    <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center shrink-0">
                      <Clock className="w-6 h-6 text-gold" />
                    </div>
                    <div>
                      <h4 className="text-xl font-bold mb-2">Horário de Funcionamento</h4>
                      <p className="text-white/50">Terça a Sábado: 09:00 às 20:00</p>
                      <p className="text-white/50">Domingo e Segunda: Fechado</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-6">
                    <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center shrink-0">
                      <Phone className="w-6 h-6 text-gold" />
                    </div>
                    <div>
                      <h4 className="text-xl font-bold mb-2">Contato</h4>
                      <p className="text-white/50">{settings?.whatsapp_number || "5511999999999"}</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="bg-white/5 p-8 md:p-12 rounded-3xl border border-white/10">
                <h3 className="text-2xl font-bold mb-8">Agende seu horário</h3>
                <form onSubmit={handleBookingSubmit} className="space-y-6">
                  <div>
                    <label className="block text-sm font-bold uppercase tracking-widest text-white/50 mb-2">Seu Nome</label>
                    <input 
                      type="text" 
                      required
                      value={bookingForm.name}
                      onChange={e => setBookingForm({...bookingForm, name: e.target.value})}
                      className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-4 text-white focus:outline-none focus:border-gold transition-colors"
                      placeholder="Como prefere ser chamado?"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold uppercase tracking-widest text-white/50 mb-2">Data</label>
                      <input 
                        type="date" 
                        required
                        value={bookingForm.date}
                        onChange={e => setBookingForm({...bookingForm, date: e.target.value})}
                        className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-4 text-white focus:outline-none focus:border-gold transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold uppercase tracking-widest text-white/50 mb-2">Horário</label>
                      <input 
                        type="time" 
                        required
                        value={bookingForm.time}
                        onChange={e => setBookingForm({...bookingForm, time: e.target.value})}
                        className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-4 text-white focus:outline-none focus:border-gold transition-colors"
                      />
                    </div>
                  </div>
                  <button 
                    type="submit"
                    className="w-full bg-gold text-zinc-950 font-bold uppercase tracking-widest py-4 rounded-xl hover:bg-white transition-colors"
                  >
                    Confirmar Agendamento
                  </button>
                </form>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="bg-black py-12 border-t border-white/5 text-center">
          <div className="w-12 h-12 bg-gold/10 rounded-full flex items-center justify-center mx-auto mb-8">
            <Scissors className="w-6 h-6 text-gold" />
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
        </footer>
      </div>

      {/* Floating Elements */}
      <FloatingWhatsApp phoneNumber={settings?.whatsapp_number || "5511999999999"} />
      <ChatBot />

      {/* Booking Modal */}
      <AnimatePresence>
        {isBookingOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-zinc-900 p-8 rounded-3xl w-full max-w-md border border-white/10 relative"
            >
              <button 
                onClick={() => setIsBookingOpen(false)}
                className="absolute top-6 right-6 text-white/50 hover:text-white"
              >
                <X className="w-6 h-6" />
              </button>
              
              <div className="mb-8">
                <h3 className="text-2xl font-bold mb-2">Agendar Horário</h3>
                <p className="text-white/50">Preencha seus dados para confirmar</p>
              </div>

              <form onSubmit={handleBookingSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-bold uppercase tracking-widest text-white/50 mb-2">Serviço</label>
                  <select 
                    value={selectedService}
                    onChange={e => setSelectedService(e.target.value)}
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-4 text-white focus:outline-none focus:border-gold transition-colors appearance-none"
                  >
                    <option value="">Selecione um serviço</option>
                    {displayServices.map((s: any, i: number) => (
                      <option key={i} value={s.name}>{s.name} - {s.price}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold uppercase tracking-widest text-white/50 mb-2">Seu Nome</label>
                  <input 
                    type="text" 
                    required
                    value={bookingForm.name}
                    onChange={e => setBookingForm({...bookingForm, name: e.target.value})}
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-4 text-white focus:outline-none focus:border-gold transition-colors"
                    placeholder="Como prefere ser chamado?"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold uppercase tracking-widest text-white/50 mb-2">Data</label>
                    <input 
                      type="date" 
                      required
                      value={bookingForm.date}
                      onChange={e => setBookingForm({...bookingForm, date: e.target.value})}
                      className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-4 text-white focus:outline-none focus:border-gold transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold uppercase tracking-widest text-white/50 mb-2">Horário</label>
                    <input 
                      type="time" 
                      required
                      value={bookingForm.time}
                      onChange={e => setBookingForm({...bookingForm, time: e.target.value})}
                      className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-4 text-white focus:outline-none focus:border-gold transition-colors"
                    />
                  </div>
                </div>
                <button 
                  type="submit"
                  className="w-full bg-gold text-zinc-950 font-bold uppercase tracking-widest py-4 rounded-xl hover:bg-white transition-colors"
                >
                  Confirmar via WhatsApp
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AdminPanel isOpen={isAdminOpen} onClose={() => setIsAdminOpen(false)} />
    </div>
  );
}
