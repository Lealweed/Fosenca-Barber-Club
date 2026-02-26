import express from "express";
import multer from "multer";
import { createClient } from "@supabase/supabase-js";

// Supabase Client Helper
let supabaseClient: any = null;
const getSupabase = () => {
  if (supabaseClient) return supabaseClient;
  
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error("Supabase config missing!");
    return null;
  }

  supabaseClient = createClient(supabaseUrl, supabaseKey);
  return supabaseClient;
};

const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

const storage = multer.memoryStorage();
const upload = multer({ storage });

// API Routes
app.get(["/api/health", "/health"], (req, res) => res.json({ status: "ok", env: process.env.NODE_ENV }));

app.get(["/api/debug", "/debug"], async (req, res) => {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  
  const diagnostics: any = {
    hasUrl: !!url,
    hasKey: !!key,
    urlPreview: url ? `${url.substring(0, 15)}...` : "missing",
    nodeEnv: process.env.NODE_ENV,
    isVercel: !!process.env.VERCEL
  };

  try {
    const supabase = getSupabase();
    if (!supabase) throw new Error("Supabase client could not be initialized");
    
    const { data, error } = await supabase.from('settings').select('count', { count: 'exact', head: true });
    diagnostics.connectionTest = error ? `Failed: ${error.message}` : "Success";
    diagnostics.tablesFound = !error;
  } catch (e: any) {
    diagnostics.connectionTest = `Error: ${e.message}`;
  }

  res.json(diagnostics);
});

app.get(["/api/supabase-config", "/supabase-config"], (req, res) => {
  res.json({
    url: process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "",
    anonKey: process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || ""
  });
});

app.get(["/api/content", "/content"], async (req, res) => {
  console.log("Fetching content...");
  
  // Timeout de segurança para a API não travar o site
  const apiTimeout = setTimeout(() => {
    if (!res.headersSent) {
      console.warn("API Timeout: Sending fallback data");
      res.json({
        settings: {
          whatsapp_number: "5511999999999",
          address: "Rua Exemplo, 123 (Timeout)",
          hero_video: "https://oacqvijuafuzsbyyqdtt.supabase.co/storage/v1/object/public/barber-assets/gallery-video-1771970955047.MOV"
        },
        services: [], gallery: [], video_gallery: [], appointments: []
      });
    }
  }, 5000);

  try {
    const supabase = getSupabase();
    if (!supabase) throw new Error("Supabase not configured");

    // Fetch each table with individual error handling to prevent one failure from breaking everything
    const fetchTable = async (table: string) => {
      try {
        // Adiciona um timeout individual para cada consulta ao banco
        const { data, error } = await Promise.race([
          supabase.from(table).select('*'),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout na tabela ' + table)), 3000))
        ]) as any;

        if (error) {
          console.warn(`Supabase Table Note: ${table}`, error.message);
          return [];
        }
        return data || [];
      } catch (e) {
        console.error(`Error fetching ${table}:`, e);
        return [];
      }
    };

    const settingsData = await fetchTable('settings');
    const servicesData = await fetchTable('services');
    const galleryData = await fetchTable('gallery');
    const videoGalleryData = await fetchTable('video_gallery');
    
    let appointmentsData = [];
    try {
      const { data } = await supabase.from('appointments').select('*').order('date', { ascending: false }).limit(20);
      appointmentsData = data || [];
    } catch (e) {}

    const settings: any = {
      whatsapp_number: "5511999999999",
      address: "Rua Exemplo, 123",
      hero_video: "https://oacqvijuafuzsbyyqdtt.supabase.co/storage/v1/object/public/barber-assets/gallery-video-1771970955047.MOV"
    };
    
    settingsData?.forEach((s: any) => settings[s.key] = s.value);

    clearTimeout(apiTimeout);
    if (!res.headersSent) {
      res.json({
        settings,
        services: servicesData || [],
        gallery: galleryData || [],
        video_gallery: videoGalleryData || [],
        appointments: appointmentsData || []
      });
    }
  } catch (error: any) {
    clearTimeout(apiTimeout);
    console.error("API Error:", error.message);
    if (!res.headersSent) {
      res.json({
      settings: {
        whatsapp_number: "5511999999999",
        address: "Erro na conexão com Banco de Dados",
        hero_video: "https://oacqvijuafuzsbyyqdtt.supabase.co/storage/v1/object/public/barber-assets/gallery-video-1771970955047.MOV"
      },
      services: [],
      gallery: [],
      video_gallery: [],
      appointments: []
    });
  }
}
});

// Admin Routes (Simplified for Vercel)
app.post(["/api/admin/settings", "/admin/settings"], async (req, res) => {
  try {
    const supabase = getSupabase();
    if (!supabase) return res.status(500).json({ error: "No Supabase" });
    const { settings } = req.body;
    for (const [key, value] of Object.entries(settings)) {
      await supabase.from('settings').upsert({ key, value });
    }
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.post(["/api/admin/services", "/admin/services"], async (req, res) => {
  try {
    const supabase = getSupabase();
    if (!supabase) return res.status(500).json({ error: "No Supabase" });
    const { services } = req.body;
    // Delete all and re-insert for simplicity in this admin panel
    await supabase.from('services').delete().neq('id', 0);
    if (services.length > 0) {
      await supabase.from('services').insert(services.map((s: any) => ({
        name: s.name,
        price: s.price,
        description: s.desc
      })));
    }
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.post(["/api/admin/gallery", "/admin/gallery"], async (req, res) => {
  try {
    const supabase = getSupabase();
    if (!supabase) return res.status(500).json({ error: "No Supabase" });
    const { gallery } = req.body;
    await supabase.from('gallery').delete().neq('id', 0);
    if (gallery.length > 0) {
      await supabase.from('gallery').insert(gallery.map((url: string) => ({ url })));
    }
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.post(["/api/admin/video-gallery", "/admin/video-gallery"], async (req, res) => {
  try {
    const supabase = getSupabase();
    if (!supabase) return res.status(500).json({ error: "No Supabase" });
    const { video_gallery } = req.body;
    await supabase.from('video_gallery').delete().neq('id', 0);
    if (video_gallery.length > 0) {
      await supabase.from('video_gallery').insert(video_gallery.map((url: string) => ({ url })));
    }
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.post(["/api/admin/appointments", "/admin/appointments"], async (req, res) => {
  try {
    const supabase = getSupabase();
    if (!supabase) return res.status(500).json({ error: "No Supabase" });
    const { client_name, service_name, date, time } = req.body;
    await supabase.from('appointments').insert([{ client_name, service_name, date, time }]);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// Vite middleware for development - ONLY locally
if (process.env.NODE_ENV !== "production" && !process.env.VERCEL) {
  try {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } catch (e) {
    console.error("Vite middleware failed to load:", e);
  }
}

// ... other routes can be added back as needed, but let's fix the core first

// Catch-all for debugging Vercel routing
app.use((req, res) => {
  res.status(404).json({
    error: "API Route Not Found",
    path: req.path,
    originalUrl: req.originalUrl,
    url: req.url,
    method: req.method
  });
});

// For local development and AI Studio preview
const PORT = 3000;
if (process.env.NODE_ENV !== "production" && !process.env.VERCEL) {
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

export default app;
