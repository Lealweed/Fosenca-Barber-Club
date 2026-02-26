import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import multer from "multer";
import { createClient } from "@supabase/supabase-js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Supabase Client Helper
let supabaseClient: any = null;
const getSupabase = () => {
  if (supabaseClient) return supabaseClient;
  
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Configuração do Supabase ausente. Verifique SUPABASE_URL e SUPABASE_ANON_KEY nas variáveis de ambiente.");
  }

  supabaseClient = createClient(supabaseUrl, supabaseKey);
  return supabaseClient;
};

// Multer for temporary storage before Supabase upload
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: {
    fileSize: 500 * 1024 * 1024 // 500MB
  }
});

const app = express();

app.use(express.json({ limit: '500mb' }));
app.use(express.urlencoded({ limit: '500mb', extended: true }));

// Error handling for large payloads
app.use((err: any, req: any, res: any, next: any) => {
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: "Arquivo muito grande. O limite é 500MB." });
  }
  if (err) {
    console.error("Server Error:", err);
    return res.status(500).json({ error: err.message || "Erro interno no servidor" });
  }
  next();
});

// Helper for Supabase Storage Upload
const uploadToSupabase = async (file: Express.Multer.File, bucket: string) => {
  const supabase = getSupabase();
  const fileExt = path.extname(file.originalname);
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}${fileExt}`;
  const filePath = `${fileName}`;

  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(filePath, file.buffer, {
      contentType: file.mimetype,
      cacheControl: '3600',
      upsert: false
    });

  if (error) throw error;

  const { data: { publicUrl } } = supabase.storage
    .from(bucket)
    .getPublicUrl(filePath);

  return publicUrl;
};

// API Routes
app.get("/api/supabase-config", (req, res) => {
  res.json({
    url: process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "",
    anonKey: process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || ""
  });
});

app.get("/api/content", async (req, res) => {
  try {
    const supabase = getSupabase();
    
    // Fetch each table individually to handle missing tables gracefully
    const { data: settingsData, error: sErr } = await supabase.from('settings').select('*');
    const { data: servicesData, error: svErr } = await supabase.from('services').select('*');
    const { data: galleryData, error: gErr } = await supabase.from('gallery').select('*');
    const { data: videoGalleryData, error: vgErr } = await supabase.from('video_gallery').select('*');
    const { data: appointmentsData, error: aErr } = await supabase.from('appointments').select('*').order('date', { ascending: false });

    if (sErr) console.warn("Settings table might be missing:", sErr.message);

    const settings: any = {
      whatsapp_number: "5511999999999",
      address: "Rua Exemplo, 123",
      hero_video: "https://oacqvijuafuzsbyyqdtt.supabase.co/storage/v1/object/public/barber-assets/gallery-video-1771970955047.MOV"
    };
    
    settingsData?.forEach((s: any) => settings[s.key] = s.value);

    res.json({
      settings,
      services: servicesData || [],
      gallery: galleryData || [],
      video_gallery: videoGalleryData || [],
      appointments: appointmentsData || []
    });
  } catch (error: any) {
    console.error("Supabase connection error:", error);
    // Fallback data if connection fails entirely
    res.json({
      settings: {
        whatsapp_number: "5511999999999",
        address: "Configure no Painel",
        hero_video: "https://oacqvijuafuzsbyyqdtt.supabase.co/storage/v1/object/public/barber-assets/gallery-video-1771970955047.MOV"
      },
      services: [],
      gallery: [],
      video_gallery: [],
      appointments: []
    });
  }
});

app.post("/api/upload-video", upload.single("video"), async (req, res) => {
  console.log("Uploading hero video to Supabase...");
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });

  try {
    const supabase = getSupabase();
    const publicUrl = await uploadToSupabase(req.file, 'barber-assets');
    await supabase.from('settings').upsert({ key: 'hero_video', value: publicUrl });
    res.json({ url: publicUrl });
  } catch (error: any) {
    console.error("Supabase Storage Error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/admin/appointments", async (req, res) => {
  const { client_name, service_name, date, time } = req.body;
  try {
    const supabase = getSupabase();
    await supabase.from('appointments').insert({
      client_name,
      service_name,
      date,
      time,
      status: 'Pendente'
    });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.delete("/api/admin/appointments/:id", async (req, res) => {
  try {
    const supabase = getSupabase();
    await supabase.from('appointments').delete().eq('id', req.params.id);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.patch("/api/admin/appointments/:id", async (req, res) => {
  const { status } = req.body;
  try {
    const supabase = getSupabase();
    await supabase.from('appointments').update({ status }).eq('id', req.params.id);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/admin/settings", async (req, res) => {
  const { settings } = req.body;
  try {
    const supabase = getSupabase();
    for (const [key, value] of Object.entries(settings)) {
      await supabase.from('settings').upsert({ key, value });
    }
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/admin/services", async (req, res) => {
  const { services } = req.body;
  try {
    const supabase = getSupabase();
    await supabase.from('services').delete().neq('id', 0);
    await supabase.from('services').insert(services.map((s: any) => ({
      name: s.name,
      price: s.price,
      desc: s.desc
    })));
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/admin/gallery", async (req, res) => {
  const { gallery } = req.body;
  try {
    const supabase = getSupabase();
    await supabase.from('gallery').delete().neq('id', 0);
    await supabase.from('gallery').insert(gallery.map((url: string) => ({ url })));
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/admin/video-gallery", async (req, res) => {
  const { video_gallery } = req.body;
  try {
    const supabase = getSupabase();
    await supabase.from('video_gallery').delete().neq('id', 0);
    await supabase.from('video_gallery').insert(video_gallery.map((url: string) => ({ url })));
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/upload-gallery-video", upload.single("video"), async (req, res) => {
  console.log("Uploading gallery video to Supabase...");
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });

  try {
    const publicUrl = await uploadToSupabase(req.file, 'barber-assets');
    const supabase = getSupabase();
    await supabase.from('video_gallery').insert({ url: publicUrl });
    res.json({ url: publicUrl });
  } catch (error: any) {
    console.error("Supabase Storage Error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/upload-gallery-image", upload.single("image"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });

  try {
    const publicUrl = await uploadToSupabase(req.file, 'barber-assets');
    const supabase = getSupabase();
    await supabase.from('gallery').insert({ url: publicUrl });
    res.json({ url: publicUrl });
  } catch (error: any) {
    console.error("Supabase Storage Error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Vite middleware for development
if (process.env.NODE_ENV !== "production" && !process.env.VERCEL) {
  const { createServer: createViteServer } = await import("vite");
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: "spa",
  });
  app.use(vite.middlewares);
}

// For local development
if (process.env.NODE_ENV !== "production" && !process.env.VERCEL) {
  const PORT = 3000;
  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
  server.timeout = 600000;
}

export default app;
