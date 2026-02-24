import React, { useState, useEffect, useRef } from 'react';
import { Save, Plus, Trash2, X, Image as ImageIcon, Video, Settings, Scissors, Calendar, Upload, Check, Clock } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

const getSupabase = async () => {
  let supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  let supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    try {
      const res = await fetch('/api/supabase-config');
      if (res.ok) {
        const config = await res.json();
        supabaseUrl = config.url;
        supabaseKey = config.anonKey;
      }
    } catch (e) {
      console.error("Failed to fetch Supabase config:", e);
    }
  }

  if (!supabaseUrl || !supabaseKey || supabaseUrl.trim() === "" || supabaseKey.trim() === "") {
    throw new Error("Configuração do Supabase ausente. Verifique SUPABASE_URL e SUPABASE_ANON_KEY nas variáveis de ambiente do projeto.");
  }

  try {
    new URL(supabaseUrl);
  } catch (e) {
    throw new Error(`A URL do Supabase fornecida é inválida: "${supabaseUrl}". Certifique-se de que começa com https://`);
  }

  return createClient(supabaseUrl, supabaseKey);
};

interface AdminProps {
  onClose: () => void;
  initialData: any;
  onUpdate: () => void;
}

export default function AdminPanel({ onClose, initialData, onUpdate }: AdminProps) {
  const [activeTab, setActiveTab] = useState<'config' | 'agenda'>('config');
  const [settings, setSettings] = useState(initialData.settings);
  const [services, setServices] = useState(initialData.services);
  const [gallery, setGallery] = useState(initialData.gallery.map((g: any) => g.url));
  const [videoGallery, setVideoGallery] = useState(initialData.video_gallery?.map((v: any) => v.url) || []);
  const [appointments, setAppointments] = useState(initialData.appointments || []);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isUploadingGalleryVideo, setIsUploadingGalleryVideo] = useState(false);
  const [isUploadingGalleryImage, setIsUploadingGalleryImage] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [galleryUploadProgress, setGalleryUploadProgress] = useState(0);
  const [galleryImageUploadProgress, setGalleryImageUploadProgress] = useState(0);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const galleryVideoInputRef = useRef<HTMLInputElement>(null);
  const galleryImageInputRef = useRef<HTMLInputElement>(null);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings })
      });
      await fetch('/api/admin/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ services })
      });
      await fetch('/api/admin/gallery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gallery })
      });
      await fetch('/api/admin/video-gallery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ video_gallery: videoGallery })
      });
      onUpdate();
      alert('Informações atualizadas com sucesso!');
    } catch (error) {
      console.error(error);
      alert('Erro ao salvar.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const supabase = await getSupabase();
      const fileExt = file.name.split('.').pop();
      const fileName = `hero-${Date.now()}.${fileExt}`;
      
      const { data, error } = await supabase.storage
        .from('barber-assets')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('barber-assets')
        .getPublicUrl(fileName);

      setSettings({ ...settings, hero_video: publicUrl });
      alert('Vídeo principal enviado com sucesso!');
    } catch (error: any) {
      console.error("Upload error:", error);
      alert('Erro ao enviar vídeo: ' + (error.message || 'Erro desconhecido'));
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleGalleryVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingGalleryVideo(true);
    setGalleryUploadProgress(0);

    try {
      const supabase = await getSupabase();
      const fileExt = file.name.split('.').pop();
      const fileName = `gallery-video-${Date.now()}.${fileExt}`;
      
      const { data, error } = await supabase.storage
        .from('barber-assets')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('barber-assets')
        .getPublicUrl(fileName);

      setVideoGallery(prev => [...prev, publicUrl]);
      alert('Vídeo da galeria enviado com sucesso!');
      onUpdate();
    } catch (error: any) {
      console.error("Upload error:", error);
      alert('Erro ao enviar vídeo da galeria: ' + (error.message || 'Erro desconhecido'));
    } finally {
      setIsUploadingGalleryVideo(false);
      setGalleryUploadProgress(0);
    }
  };

  const handleGalleryImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingGalleryImage(true);
    setGalleryImageUploadProgress(0);

    try {
      const supabase = await getSupabase();
      const fileExt = file.name.split('.').pop();
      const fileName = `gallery-image-${Date.now()}.${fileExt}`;
      
      const { data, error } = await supabase.storage
        .from('barber-assets')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('barber-assets')
        .getPublicUrl(fileName);

      setGallery([...gallery, publicUrl]);
      alert('Imagem enviada com sucesso!');
    } catch (error: any) {
      console.error("Upload error:", error);
      alert('Erro ao enviar imagem: ' + (error.message || 'Erro desconhecido'));
    } finally {
      setIsUploadingGalleryImage(false);
      setGalleryImageUploadProgress(0);
    }
  };

  const updateAppointmentStatus = async (id: number, status: string) => {
    try {
      await fetch(`/api/admin/appointments/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      onUpdate();
    } catch (error) {
      console.error(error);
    }
  };

  const deleteAppointment = async (id: number) => {
    if (!confirm('Excluir este agendamento?')) return;
    try {
      await fetch(`/api/admin/appointments/${id}`, {
        method: 'DELETE'
      });
      onUpdate();
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-zinc-950 flex flex-col overflow-hidden text-zinc-100">
      {/* Header */}
      <div className="border-b border-gold/20 p-6 flex justify-between items-center bg-zinc-900">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <Settings className="text-gold w-8 h-8" />
            <h1 className="text-2xl font-serif font-bold italic text-gold">Painel Administrativo</h1>
          </div>
          <div className="flex bg-zinc-950 p-1 rounded-lg border border-zinc-800">
            <button
              onClick={() => setActiveTab('config')}
              className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${activeTab === 'config' ? 'bg-gold text-zinc-950' : 'text-zinc-400 hover:text-white'}`}
            >
              Configurações
            </button>
            <button
              onClick={() => setActiveTab('agenda')}
              className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${activeTab === 'agenda' ? 'bg-gold text-zinc-950' : 'text-zinc-400 hover:text-white'}`}
            >
              Agenda
            </button>
          </div>
        </div>
        <div className="flex gap-4">
          {activeTab === 'config' && (
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="bg-gold text-zinc-950 px-6 py-2 rounded-full font-bold flex items-center gap-2 hover:bg-gold/80 transition-all disabled:opacity-50"
            >
              <Save className="w-5 h-5" />
              {isSaving ? 'Salvando...' : 'Salvar Alterações'}
            </button>
          )}
          <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-full transition-all">
            <X className="w-8 h-8" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-8 max-w-5xl mx-auto w-full">
        {activeTab === 'config' ? (
          <div className="space-y-12">
            {/* Hero & Info */}
            <section className="space-y-6">
              <h2 className="text-xl font-bold flex items-center gap-2 border-b border-zinc-800 pb-2">
                <Video className="text-gold" /> Informações Principais
              </h2>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm text-zinc-400 uppercase tracking-widest">Título Hero</label>
                  <input
                    type="text"
                    value={settings.hero_title}
                    onChange={(e) => setSettings({ ...settings, hero_title: e.target.value })}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-3 focus:border-gold outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-zinc-400 uppercase tracking-widest">WhatsApp (com DDD)</label>
                  <input
                    type="text"
                    value={settings.whatsapp_number}
                    onChange={(e) => setSettings({ ...settings, whatsapp_number: e.target.value })}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-3 focus:border-gold outline-none"
                  />
                </div>
                <div className="md:col-span-2 space-y-2">
                  <label className="text-sm text-zinc-400 uppercase tracking-widest">Subtítulo Hero</label>
                  <textarea
                    value={settings.hero_subtitle}
                    onChange={(e) => setSettings({ ...settings, hero_subtitle: e.target.value })}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-3 focus:border-gold outline-none h-24"
                  />
                </div>
                <div className="md:col-span-2 space-y-2">
                  <label className="text-sm text-zinc-400 uppercase tracking-widest">Vídeo de Fundo</label>
                  <div className="flex gap-4 items-center">
                    <input
                      type="text"
                      value={settings.hero_video}
                      onChange={(e) => setSettings({ ...settings, hero_video: e.target.value })}
                      placeholder="URL do vídeo ou faça upload"
                      className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg p-3 focus:border-gold outline-none"
                    />
                    <input
                      type="file"
                      ref={videoInputRef}
                      onChange={handleVideoUpload}
                      accept="video/*"
                      className="hidden"
                    />
                    <button
                      onClick={() => videoInputRef.current?.click()}
                      disabled={isUploading}
                      className="bg-zinc-800 hover:bg-zinc-700 text-gold px-4 py-3 rounded-lg flex items-center gap-2 transition-all disabled:opacity-50"
                    >
                      <Upload className="w-5 h-5" />
                      {isUploading ? `Enviando ${uploadProgress}%` : 'Upload do PC'}
                    </button>
                  </div>
                  {isUploading && (
                    <div className="w-full bg-zinc-950 h-2 rounded-full overflow-hidden mt-2 border border-zinc-800">
                      <div 
                        className="bg-gold h-full transition-all duration-300" 
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* Services */}
            <section className="space-y-6">
              <div className="flex justify-between items-center border-b border-zinc-800 pb-2">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Scissors className="text-gold" /> Serviços & Preços
                </h2>
                <button
                  onClick={() => setServices([...services, { name: '', price: '', desc: '' }])}
                  className="text-gold flex items-center gap-1 hover:underline"
                >
                  <Plus className="w-4 h-4" /> Adicionar Serviço
                </button>
              </div>
              <div className="space-y-4">
                {services.map((service: any, i: number) => (
                  <div key={i} className="flex gap-4 items-start bg-zinc-900 p-4 rounded-xl border border-zinc-800">
                    <div className="flex-1 grid md:grid-cols-3 gap-4">
                      <input
                        placeholder="Nome"
                        value={service.name}
                        onChange={(e) => {
                          const newServices = [...services];
                          newServices[i].name = e.target.value;
                          setServices(newServices);
                        }}
                        className="bg-zinc-950 border border-zinc-800 rounded p-2 focus:border-gold outline-none"
                      />
                      <input
                        placeholder="Preço"
                        value={service.price}
                        onChange={(e) => {
                          const newServices = [...services];
                          newServices[i].price = e.target.value;
                          setServices(newServices);
                        }}
                        className="bg-zinc-950 border border-zinc-800 rounded p-2 focus:border-gold outline-none"
                      />
                      <input
                        placeholder="Descrição"
                        value={service.desc}
                        onChange={(e) => {
                          const newServices = [...services];
                          newServices[i].desc = e.target.value;
                          setServices(newServices);
                        }}
                        className="bg-zinc-950 border border-zinc-800 rounded p-2 focus:border-gold outline-none"
                      />
                    </div>
                    <button
                      onClick={() => setServices(services.filter((_: any, idx: number) => idx !== i))}
                      className="text-red-500 p-2 hover:bg-red-500/10 rounded"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                ))}
              </div>
            </section>

            {/* Gallery */}
            <section className="space-y-6">
              <div className="flex justify-between items-center border-b border-zinc-800 pb-2">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <ImageIcon className="text-gold" /> Galeria de Imagens
                </h2>
                <div className="flex gap-4">
                  <input
                    type="file"
                    ref={galleryImageInputRef}
                    onChange={handleGalleryImageUpload}
                    accept="image/*"
                    className="hidden"
                  />
                  <button
                    onClick={() => galleryImageInputRef.current?.click()}
                    disabled={isUploadingGalleryImage}
                    className="text-gold flex items-center gap-1 hover:underline disabled:opacity-50"
                  >
                    <Upload className="w-4 h-4" /> {isUploadingGalleryImage ? `Enviando ${galleryImageUploadProgress}%` : 'Upload do PC'}
                  </button>
                  <button
                    onClick={() => setGallery([...gallery, ''])}
                    className="text-gold flex items-center gap-1 hover:underline"
                  >
                    <Plus className="w-4 h-4" /> Adicionar URL
                  </button>
                </div>
              </div>
              {isUploadingGalleryImage && (
                <div className="w-full bg-zinc-950 h-2 rounded-full overflow-hidden mb-4 border border-zinc-800">
                  <div 
                    className="bg-gold h-full transition-all duration-300" 
                    style={{ width: `${galleryImageUploadProgress}%` }}
                  />
                </div>
              )}
              <div className="grid md:grid-cols-2 gap-4">
                {gallery.map((url: string, i: number) => (
                  <div key={i} className="flex gap-2 items-center bg-zinc-900 p-3 rounded-xl border border-zinc-800">
                    <input
                      placeholder="URL da Imagem"
                      value={url}
                      onChange={(e) => {
                        const newGallery = [...gallery];
                        newGallery[i] = e.target.value;
                        setGallery(newGallery);
                      }}
                      className="flex-1 bg-zinc-950 border border-zinc-800 rounded p-2 focus:border-gold outline-none"
                    />
                    <button
                      onClick={() => setGallery(gallery.filter((_: any, idx: number) => idx !== i))}
                      className="text-red-500 p-2 hover:bg-red-500/10 rounded"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                ))}
              </div>
            </section>

            {/* Video Gallery */}
            <section className="space-y-6">
              <div className="flex justify-between items-center border-b border-zinc-800 pb-2">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Video className="text-gold" /> Galeria de Vídeos
                </h2>
                <div className="flex gap-4">
                  <input
                    type="file"
                    ref={galleryVideoInputRef}
                    onChange={handleGalleryVideoUpload}
                    accept="video/*"
                    className="hidden"
                  />
                  <button
                    onClick={() => galleryVideoInputRef.current?.click()}
                    disabled={isUploadingGalleryVideo}
                    className="text-gold flex items-center gap-1 hover:underline disabled:opacity-50"
                  >
                    <Upload className="w-4 h-4" /> {isUploadingGalleryVideo ? `Enviando ${galleryUploadProgress}%` : 'Upload do PC'}
                  </button>
                  <button
                    onClick={() => setVideoGallery([...videoGallery, ''])}
                    className="text-gold flex items-center gap-1 hover:underline"
                  >
                    <Plus className="w-4 h-4" /> Adicionar URL
                  </button>
                </div>
              </div>
              {isUploadingGalleryVideo && (
                <div className="w-full bg-zinc-950 h-2 rounded-full overflow-hidden mb-4 border border-zinc-800">
                  <div 
                    className="bg-gold h-full transition-all duration-300" 
                    style={{ width: `${galleryUploadProgress}%` }}
                  />
                </div>
              )}
              <div className="grid md:grid-cols-2 gap-4">
                {videoGallery.map((url: string, i: number) => (
                  <div key={i} className="flex gap-2 items-center bg-zinc-900 p-3 rounded-xl border border-zinc-800">
                    <input
                      placeholder="URL do Vídeo"
                      value={url}
                      onChange={(e) => {
                        const newVideoGallery = [...videoGallery];
                        newVideoGallery[i] = e.target.value;
                        setVideoGallery(newVideoGallery);
                      }}
                      className="flex-1 bg-zinc-950 border border-zinc-800 rounded p-2 focus:border-gold outline-none"
                    />
                    <button
                      onClick={() => setVideoGallery(videoGallery.filter((_: any, idx: number) => idx !== i))}
                      className="text-red-500 p-2 hover:bg-red-500/10 rounded"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                ))}
              </div>
            </section>
          </div>
        ) : (
          <div className="space-y-6">
            <h2 className="text-xl font-bold flex items-center gap-2 border-b border-zinc-800 pb-2">
              <Calendar className="text-gold" /> Agendamentos Recebidos
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-zinc-800 text-zinc-400 text-xs uppercase tracking-widest">
                    <th className="p-4">Cliente</th>
                    <th className="p-4">Serviço</th>
                    <th className="p-4">Data/Hora</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {appointments.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-zinc-500 italic">Nenhum agendamento encontrado.</td>
                    </tr>
                  ) : (
                    appointments.map((app: any) => (
                      <tr key={app.id} className="hover:bg-zinc-900/50 transition-colors">
                        <td className="p-4 font-bold">{app.client_name}</td>
                        <td className="p-4 text-zinc-300">{app.service_name}</td>
                        <td className="p-4 text-zinc-400">
                          <div className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {app.date}</div>
                          <div className="flex items-center gap-1"><Clock className="w-3 h-3" /> {app.time}</div>
                        </td>
                        <td className="p-4">
                          <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                            app.status === 'Concluído' ? 'bg-green-500/20 text-green-500' : 
                            app.status === 'Cancelado' ? 'bg-red-500/20 text-red-500' : 
                            'bg-gold/20 text-gold'
                          }`}>
                            {app.status}
                          </span>
                        </td>
                        <td className="p-4 text-right space-x-2">
                          <button
                            onClick={() => updateAppointmentStatus(app.id, 'Concluído')}
                            className="p-2 text-green-500 hover:bg-green-500/10 rounded"
                            title="Concluir"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => deleteAppointment(app.id)}
                            className="p-2 text-red-500 hover:bg-red-500/10 rounded"
                            title="Excluir"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
