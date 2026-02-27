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
  const [isLoading, setIsLoading] = useState(false); // Começa como falso para abrir direto
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

      {/* Booking Modal */}
      <AnimatePresence>
        {isBookingOpen && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsBookingOpen(false)}
              className="absolute inset-0 bg-zinc-950/90 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative bg-zinc-900 border border-gold/30 p-8 rounded-2xl shadow-2xl w-full max-w-md"
            >
              <button onClick={() => setIsBookingOpen(false)} className="absolute top-4 right-4 text-zinc-500 hover:text-white">
                <X className="w-6 h-6" />
              </button>
              <h2 className="text-2xl font-serif font-bold text-gold mb-2">Agendar Horário</h2>
              <p className="text-zinc-400 text-sm mb-6">Preencha os dados e finalize no WhatsApp.</p>
              
              <form onSubmit={handleBookingSubmit} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs text-zinc-500 uppercase tracking-widest flex items-center gap-2"><User className="w-3 h-3" /> Seu Nome</label>
                  <input 
                    required
                    type="text" 
                    value={bookingForm.name}
                    onChange={e => setBookingForm({...bookingForm, name: e.target.value})}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 focus:border-gold outline-none text-white"
                    placeholder="Ex: João Silva"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs text-zinc-500 uppercase tracking-widest flex items-center gap-2"><CalendarIcon className="w-3 h-3" /> Data</label>
                    <input 
                      required
                      type="date" 
                      value={bookingForm.date}
                      onChange={e => setBookingForm({...bookingForm, date: e.target.value})}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 focus:border-gold outline-none text-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-zinc-500 uppercase tracking-widest flex items-center gap-2"><Clock className="w-3 h-3" /> Hora</label>
                    <input 
                      required
                      type="time" 
                      value={bookingForm.time}
                      onChange={e => setBookingForm({...bookingForm, time: e.target.value})}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 focus:border-gold outline-none text-white"
                    />
                  </div>
                </div>
                <button 
                  type="submit"
                  className="w-full bg-whatsapp text-white py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 hover:bg-whatsapp/90 transition-all shadow-xl shadow-whatsapp/20"
                >
                  <MessageCircle className="w-6 h-6" />
                  Finalizar no WhatsApp
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Navigation */}
      <nav className="fixed top-0 w-full z-40 bg-black/40 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-24 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img 
              src="https://oacqvijuafuzsbyyqdtt.supabase.co/storage/v1/object/public/barber-assets/logo.png" 
              alt="Fonseca Barber Club" 
              className="h-16 w-auto brightness-110"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
            <div className="flex flex-col logo-fallback hidden">
              <span className="font-serif text-3xl font-bold tracking-tighter text-white italic leading-none">Fonseca</span>
              <span className="text-[10px] text-gold tracking-[0.3em] font-bold uppercase">BARBER CLUB</span>
            </div>
          </div>
          
          <div className="hidden lg:flex items-center gap-8 text-sm font-medium text-white/80">
            <a href="#" className="hover:text-gold transition-colors">Início</a>
            <a href="#servicos" className="hover:text-gold transition-colors">Serviços</a>
            <a href="#planos" className="hover:text-gold transition-colors">Planos</a>
            <a href="#galeria" className="hover:text-gold transition-colors">Galeria</a>
            <a href="#contato" className="hover:text-gold transition-colors">Contato</a>
            <button onClick={() => setIsAdminOpen(true)} className="hover:text-gold transition-colors">Admin</button>
          </div>

          <div className="flex items-center gap-6">
            <button 
              onClick={() => { setSelectedService('Geral'); setIsBookingOpen(true); }}
              className="bg-gold hover:bg-gold/90 text-black px-8 py-3 rounded-xl text-sm font-bold transition-all shadow-lg shadow-gold/20"
            >
              Agendar Agora
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center pt-24">
        <div className="max-w-7xl mx-auto px-6 w-full">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="max-w-3xl"
          >
            <div className="inline-flex items-center gap-2 bg-gold/10 border border-gold/30 px-4 py-2 rounded-full mb-8">
              <Scissors className="w-4 h-4 text-gold" />
              <span className="text-gold text-xs font-bold uppercase tracking-widest">Desde 2014</span>
            </div>
            
            <h1 className="font-serif text-7xl md:text-9xl font-bold text-white mb-8 leading-[0.85] tracking-tighter">
              Estilo, Qualidade <br />
              <span className="text-gold italic font-normal">e Tradição</span>
            </h1>
            
            <p className="text-white/70 text-lg md:text-xl mb-12 max-w-2xl leading-relaxed">
              A Fonseca Barbearia combina anos de experiência com as técnicas mais modernas para entregar o melhor resultado para você.
            </p>
            
            <div className="flex flex-wrap gap-4">
              <motion.button
                onClick={() => { setSelectedService('Geral'); setIsBookingOpen(true); }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="inline-flex items-center gap-3 bg-gold text-black px-10 py-5 rounded-xl text-lg font-bold shadow-2xl shadow-gold/20"
              >
                Agendar Agora
                <CalendarIcon className="w-5 h-5" />
              </motion.button>
              
              <motion.a
                href="#planos"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="inline-flex items-center gap-3 border-2 border-gold text-gold px-10 py-5 rounded-xl text-lg font-bold hover:bg-gold/10 transition-colors"
              >
                Ver Planos de Assinatura
                <ChevronRight className="w-5 h-5" />
              </motion.a>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Serviços Section */}
      <section id="servicos" className="py-24 relative z-10 bg-zinc-950/50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-5xl md:text-6xl font-bold text-white mb-4 italic">Nossos <span className="text-gold">Serviços</span></h2>
            <p className="text-white/50 uppercase tracking-widest text-sm">Excelência em cada detalhe</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {displayServices.map((service: any, i: number) => (
              <motion.div 
                key={i}
                whileHover={{ y: -10 }}
                className="bg-zinc-900/50 backdrop-blur-md border border-white/10 p-8 rounded-[32px] hover:border-gold/50 transition-all group"
              >
                <div className="flex justify-between items-start mb-6">
                  <div className="bg-gold/10 p-4 rounded-2xl group-hover:scale-110 transition-transform">
                    <Scissors className="w-8 h-8 text-gold" />
                  </div>
                  <span className="text-2xl font-bold text-gold">{service.price}</span>
                </div>
                <h3 className="text-2xl font-bold text-white mb-3">{service.name}</h3>
                <p className="text-white/50 mb-8 leading-relaxed">{service.description || service.desc}</p>
                <button 
                  onClick={() => { setSelectedService(service.name); setIsBookingOpen(true); }}
                  className="w-full py-4 rounded-xl border border-gold/30 text-gold font-bold hover:bg-gold hover:text-black transition-all"
                >
                  Agendar Este
                </button>
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
              <p className="text-white/80">@fonsecabarbearia.pbs</p>
              <a href="#" className="w-full bg-white/20 hover:bg-white/30 text-white py-4 rounded-xl font-bold transition-colors">Seguir Agora</a>
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
              <a href={WHATSAPP_URL} className="w-full bg-white/20 hover:bg-white/30 text-white py-4 rounded-xl font-bold transition-colors">Chamar Agora</a>
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
              <p className="text-black/60">Como chegar</p>
              <a href="#contato" className="w-full bg-black/10 hover:bg-black/20 text-black py-4 rounded-xl font-bold transition-colors">Ver no Mapa</a>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Trust/Stats Section */}
      <section className="py-24 relative z-10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-5xl md:text-6xl font-bold text-white">Por Que Escolher o <span className="text-gold">Fonseca Barber Club?</span></h2>
          </div>
          
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: Award, label: "5+", sub: "Anos de Tradição" },
              { icon: Users, label: "5000+", sub: "Clientes Satisfeitos" },
              { icon: Star, label: "5.0/5", sub: "Avaliação Média" },
              { icon: Scissors, label: "Premium", sub: "Atendimento Exclusivo" }
            ].map((stat, i) => (
              <div key={i} className="bg-white/5 backdrop-blur-md border border-white/10 p-10 rounded-[32px] text-center flex flex-col items-center gap-4 group hover:bg-white/10 transition-all">
                <div className="bg-gold/10 p-4 rounded-full group-hover:scale-110 transition-transform">
                  <stat.icon className="w-10 h-10 text-gold" />
                </div>
                <div className="text-4xl font-bold text-gold">{stat.label}</div>
                <div className="text-white/60 font-medium">{stat.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Galeria Section */}
      <section id="galeria" className="py-24 relative z-10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-5xl md:text-6xl font-bold text-white mb-4 italic">Nossos <span className="text-gold">Resultados</span></h2>
            <p className="text-white/50 uppercase tracking-widest text-sm">Cortes reais de clientes reais</p>
          </div>
          
          {/* Image Gallery */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6 mb-24">
            {displayGallery.map((item: any, i: number) => (
              <motion.div 
                key={i}
                whileHover={{ scale: 1.02 }}
                className="aspect-square overflow-hidden rounded-[40px] border border-white/10 group relative"
              >
                <img 
                  src={item.url} 
                  alt={`Trabalho ${i + 1}`} 
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Scissors className="w-10 h-10 text-gold" />
                </div>
              </motion.div>
            ))}
          </div>

          {/* Video Gallery */}
          {displayVideoGallery.length > 0 && (
            <div className="space-y-12">
              <div className="text-center">
                <h3 className="text-3xl font-bold text-white mb-2 italic">Vídeos do <span className="text-gold">Clube</span></h3>
                <p className="text-white/40">Confira a atmosfera do nosso espaço</p>
              </div>
              <div className="grid md:grid-cols-2 gap-8">
                {displayVideoGallery.map((item: any, i: number) => (
                  <motion.div 
                    key={i}
                    whileHover={{ scale: 1.02 }}
                    className="aspect-video overflow-hidden rounded-[40px] border border-white/10 bg-zinc-900 relative group shadow-2xl"
                  >
                    <video 
                      src={item.url} 
                      controls
                      playsInline
                      preload="metadata"
                      className="w-full h-full object-cover"
                    />
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Planos Section */}
      <section id="planos" className="py-24 relative z-10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 bg-gold/10 border border-gold/30 px-6 py-2 rounded-full mb-8">
              <Star className="w-4 h-4 text-gold" />
              <span className="text-gold text-sm font-bold uppercase tracking-widest">Planos Exclusivos</span>
            </div>
            <h2 className="text-6xl md:text-8xl font-bold text-white mb-8">Assine e <span className="text-gold">Economize Muito</span></h2>
            <p className="text-white/60 text-xl max-w-3xl mx-auto">
              Escolha o plano ideal para você e garanta sempre o melhor visual com benefícios exclusivos e economia garantida
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 mb-16">
            {[
              { name: "Barba Ilimitada", price: "135", save: "22%", cuts: "Ilimitado" },
              { name: "Corte Ilimitado", price: "75", save: null, cuts: "Ilimitado" },
              { name: "Cabelo e Barba Ilimitado", price: "135", save: "15%", cuts: "Ilimitado" }
            ].map((plano, i) => (
              <motion.div 
                key={i}
                whileHover={{ scale: 1.02 }}
                className="bg-black/40 backdrop-blur-xl border-2 border-gold/30 rounded-[40px] p-10 relative overflow-hidden group"
              >
                <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-gold/20 border border-gold/40 px-4 py-1 rounded-full flex items-center gap-2">
                  <Zap className="w-3 h-3 text-gold fill-gold" />
                  <span className="text-gold text-[10px] font-bold uppercase tracking-widest">Mais Popular</span>
                </div>
                
                <div className="mt-12 mb-8 flex flex-col items-center text-center">
                  <div className="bg-gold/10 p-6 rounded-full mb-8">
                    <Scissors className="w-12 h-12 text-gold" />
                  </div>
                  <h3 className="text-3xl font-bold text-white mb-6">{plano.name}</h3>
                  <div className="flex items-baseline gap-2 mb-2">
                    <span className="text-5xl font-bold text-gold">R$ {plano.price}</span>
                    <span className="text-white/40">/mês</span>
                  </div>
                  {plano.save && (
                    <div className="text-green-400 text-sm font-bold flex items-center gap-1">
                      💰 Economize {plano.save}
                    </div>
                  )}
                </div>
                
                <div className="bg-gold/5 border border-gold/20 rounded-2xl p-6 text-center mb-8">
                  <div className="text-3xl font-bold text-white">{plano.cuts} <span className="text-sm font-normal text-white/60">cortes/mês</span></div>
                </div>
                
                <ul className="space-y-4 mb-10 text-white/70">
                  <li className="flex items-center gap-3"><Check className="w-5 h-5 text-gold" /> Cabelo</li>
                  <li className="flex items-center gap-3"><Check className="w-5 h-5 text-gold" /> Barba</li>
                  <li className="flex items-center gap-3"><Check className="w-5 h-5 text-gold" /> Prioridade</li>
                </ul>
              </motion.div>
            ))}
          </div>
          
          <div className="text-center">
            <button className="bg-gold text-black px-12 py-5 rounded-xl font-bold text-lg inline-flex items-center gap-3 hover:bg-gold/90 transition-all">
              Ver Todos os Detalhes dos Planos
              <ChevronRight className="w-5 h-5" />
            </button>
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
                  onClick={() => { setSelectedService('Geral'); setIsBookingOpen(true); }}
                  className="bg-zinc-900 text-gold px-12 py-5 rounded-2xl font-bold text-lg flex items-center gap-3 hover:bg-black transition-all"
                >
                  <CalendarIcon className="w-6 h-6" />
                  Agendar Meu Horário
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
                <p className="text-white/50">{settings?.address || "Rua Exemplo, 123"}</p>
                <button className="border border-gold text-gold px-8 py-3 rounded-xl font-bold hover:bg-gold/10 transition-all">Ver Mapa</button>
              </div>
              
              <div className="text-center space-y-6">
                <div className="bg-gold/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto">
                  <Phone className="w-10 h-10 text-gold" />
                </div>
                <h3 className="text-2xl font-bold">Telefone</h3>
                <p className="text-white/50">{settings?.whatsapp_number || "5511999999999"}</p>
                <a href={`tel:${settings?.whatsapp_number || "5511999999999"}`} className="border border-gold text-gold px-8 py-3 rounded-xl font-bold hover:bg-gold/10 transition-all inline-block">Ligar Agora</a>
              </div>
              
              <div className="text-center space-y-6">
                <div className="bg-gold/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto">
                  <Clock className="w-10 h-10 text-gold" />
                </div>
                <h3 className="text-2xl font-bold">Horário</h3>
                <p className="text-white/50">Seg-Sáb: 9h-20h</p>
                <button 
                  onClick={() => { setSelectedService('Geral'); setIsBookingOpen(true); }}
                  className="border border-gold text-gold px-8 py-3 rounded-xl font-bold hover:bg-gold/10 transition-all"
                >
                  Agendar Agora
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-24 relative z-10">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <h2 className="text-6xl md:text-8xl font-bold mb-12">Pronto para Transformar Seu <span className="text-gold">Visual?</span></h2>
          <p className="text-white/60 text-xl mb-16 max-w-3xl mx-auto">
            Não espere mais! Agende agora e experimente o melhor da barbearia tradicional com um toque moderno
          </p>
          <div className="flex flex-wrap justify-center gap-6">
            <button 
              onClick={() => { setSelectedService('Geral'); setIsBookingOpen(true); }}
              className="bg-gold text-black px-12 py-5 rounded-2xl font-bold text-lg flex items-center gap-3 hover:bg-gold/90 transition-all shadow-2xl shadow-gold/20"
            >
              <CalendarIcon className="w-6 h-6" />
              Agendar Agora
            </button>
            <button className="border-2 border-gold text-gold px-12 py-5 rounded-2xl font-bold text-lg flex items-center gap-3 hover:bg-gold/10 transition-all">
              <Star className="w-6 h-6" />
              Ver Planos
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-16 relative z-10 bg-black/90 border-t border-white/10 text-center">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-center mb-10">
            <img 
              src="https://oacqvijuafuzsbyyqdtt.supabase.co/storage/v1/object/public/barber-assets/logo.png" 
              alt="Fonseca Barber Club" 
              className="h-24 w-auto brightness-110"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
            <div className="flex flex-col items-center footer-logo-fallback hidden">
              <span className="font-serif text-4xl font-bold tracking-tighter text-white italic leading-none">Fonseca</span>
              <span className="text-xs text-gold tracking-[0.4em] font-bold uppercase mt-1">BARBER CLUB</span>
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

      <FloatingWhatsApp number={settings.whatsapp_number} />
      <ChatBot />
    </div>
  );
}
