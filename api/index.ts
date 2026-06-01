import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config();

import express from "express";
import multer from "multer";
import { createClient } from "@supabase/supabase-js";
import {
  buildActionPlan,
  calculateGoalMetrics,
  confirmAppointmentStatus,
  getRepurchaseStatus,
} from "./opsMetrics.js";

// Supabase Client Helper
let supabaseClient: any = null;
const getSupabase = () => {
  if (supabaseClient) return supabaseClient;
  
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY;

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

const toNumber = (value: any) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const toMoney = (value: any) => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  const normalized = String(value || '0')
    .replace(/[^\d,.-]/g, '')
    .replace(/\./g, '')
    .replace(',', '.');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
};

const toDateKey = (value: any) => {
  if (!value) return '';
  return String(value).slice(0, 10);
};

const toBrDateTimeKey = (value: any) => {
  const match = String(value || '').match(/^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}:\d{2}))?/);
  if (!match) return { date: '', time: '' };
  return { date: `${match[3]}-${match[2]}-${match[1]}`, time: match[4] || '' };
};

const addDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const dateKey = (date: Date) => date.toISOString().slice(0, 10);

const isUuid = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

const normalizePhone = (value: any) => String(value || '').replace(/\D/g, '');

const getAppBarberConfig = () => {
  const apiKey = process.env.APPBARBER_API_KEY;
  const establishmentCode = toNumber(process.env.APPBARBER_ESTABLISHMENT_CODE);
  const baseUrl = (process.env.APPBARBER_API_BASE_URL || 'https://api.appbarber.com').replace(/\/+$/, '');
  const proxyUrl = (process.env.APPBARBER_PROXY_URL || '').replace(/\/+$/, '');

  if (!apiKey || !establishmentCode) {
    return null;
  }

  return { apiKey, establishmentCode, baseUrl, proxyUrl };
};

const appBarberRequest = async (
  path: string,
  {
    method = 'GET',
    query = {},
    body,
  }: { method?: string; query?: Record<string, any>; body?: any } = {},
) => {
  const config = getAppBarberConfig();
  if (!config) {
    const error: any = new Error('AppBarber nao configurado. Configure APPBARBER_API_KEY e APPBARBER_ESTABLISHMENT_CODE.');
    error.status = 500;
    throw error;
  }

  const search = new URLSearchParams();
  Object.entries({ establishment_code: config.establishmentCode, ...query }).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      search.set(key, String(value));
    }
  });

  const isProxy = !!config.proxyUrl;
  const url = isProxy ? config.proxyUrl : `${config.baseUrl}${path}${search.size > 0 ? `?${search.toString()}` : ''}`;
  const response = await fetch(url, {
    method: isProxy ? 'POST' : method,
    headers: {
      'X-API-Key': config.apiKey,
      'X-AppBarber-Target-Base-URL': config.baseUrl,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'User-Agent': 'FonsecaBarberClub/1.0 (+https://fonsecabarberclub.com)',
    },
    body: isProxy
      ? JSON.stringify({ path, method, query: { establishment_code: config.establishmentCode, ...query }, body })
      : body ? JSON.stringify(body) : undefined,
  });

  const text = await response.text();
  const cloudflareRayId = text.match(/Cloudflare Ray ID:\s*<strong[^>]*>([^<]+)/i)?.[1];
  const payload = (() => {
    try {
      return text ? JSON.parse(text) : null;
    } catch {
      if (cloudflareRayId || text.includes('Attention Required! | Cloudflare')) {
        return {
          error: 'cloudflare_blocked',
          message: 'AppBarber bloqueou a chamada via Cloudflare.',
          cloudflareRayId,
        };
      }
      return { raw: text };
    }
  })();

  if (!response.ok) {
    const error: any = new Error(payload?.message || payload?.error || `AppBarber HTTP ${response.status}`);
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  return payload;
};

const safeAppBarberRequest = async (path: string, options: { method?: string; query?: Record<string, any>; body?: any } = {}) => {
  try {
    return await appBarberRequest(path, options);
  } catch (error: any) {
    return { error: error.message, details: error.payload || null, data: [] };
  }
};

const buildAppBarberSnapshot = async () => {
  const today = new Date();
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  const todayKey = dateKey(today);
  const monthStartKey = dateKey(monthStart);
  const monthEndKey = dateKey(monthEnd);

  const [servicesRes, professionalsRes, monthAppointmentsRes, financialRes] = await Promise.all([
    safeAppBarberRequest('/v1/services', { query: { type: 1 } }),
    safeAppBarberRequest('/v1/professional-list'),
    safeAppBarberRequest('/v1/appointments/history', { query: { start_date: monthStartKey, end_date: monthEndKey } }),
    safeAppBarberRequest('/v1/reports/financial', { query: { start_date: monthStartKey, end_date: monthEndKey } }),
  ]);

  const services = Array.isArray(servicesRes?.data) ? servicesRes.data : [];
  const professionals = Array.isArray(professionalsRes?.data) ? professionalsRes.data : [];
  const appointments = Array.isArray(monthAppointmentsRes?.data) ? monthAppointmentsRes.data : [];
  const financial = (Array.isArray(financialRes?.data) ? financialRes.data[0] : financialRes?.data || financialRes || {}) || {};

  const upcoming = appointments
    .map((item: any) => {
      const parsed = toBrDateTimeKey(item.scheduling_start);
      return {
        id: String(item.scheduling_code || item.invoice_code || `${item.client_name}-${item.scheduling_start}`),
        clientName: String(item.client_name || 'Cliente'),
        phone: String(item.client_phone || ''),
        service: String(item.service_description || 'Servico'),
        professional: String(item.employee_name || 'Equipe'),
        value: toMoney(item.service_value),
        status: String(item.scheduling_status || ''),
        date: parsed.date,
        time: parsed.time,
        rawStart: String(item.scheduling_start || ''),
        subscription: !!item.subscription_association,
      };
    })
    .sort((a: any, b: any) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));

  const todayAppointments = upcoming.filter((item: any) => item.date === todayKey);
  const nextAppointments = upcoming
    .filter((item: any) => item.date >= todayKey)
    .slice(0, 8);

  const byProfessionalMap = new Map<string, any>();
  professionals.forEach((professional: any) => {
    const name = String(professional.employee_nickname || professional.employee_name || 'Equipe').trim();
    byProfessionalMap.set(name.toLowerCase(), {
      name,
      fullName: String(professional.employee_name || name),
      code: professional.employee_code || null,
      image: professional.employee_image || null,
      evaluation: toMoney(professional.employee_evaluation),
      appointments: 0,
      revenue: 0,
      subscriptions: 0,
    });
  });

  appointments.forEach((appointment: any) => {
    const rawName = String(appointment.employee_name || 'Equipe').trim();
    const key = rawName.toLowerCase();
    const current = byProfessionalMap.get(key) || {
      name: rawName,
      fullName: rawName,
      code: null,
      image: null,
      evaluation: 0,
      appointments: 0,
      revenue: 0,
      subscriptions: 0,
    };
    current.appointments += 1;
    current.revenue += toMoney(appointment.service_value);
    current.subscriptions += appointment.subscription_association ? 1 : 0;
    byProfessionalMap.set(key, current);
  });

  const byProfessional = Array.from(byProfessionalMap.values())
    .map((item: any) => ({ ...item, revenue: Number(item.revenue.toFixed(2)) }))
    .sort((a: any, b: any) => b.revenue - a.revenue || b.appointments - a.appointments);

  const serviceMap = new Map<string, any>();
  appointments.forEach((appointment: any) => {
    const name = String(appointment.service_description || 'Servico').trim();
    const current = serviceMap.get(name) || { name, appointments: 0, revenue: 0 };
    current.appointments += 1;
    current.revenue += toMoney(appointment.service_value);
    serviceMap.set(name, current);
  });

  const topServices = Array.from(serviceMap.values())
    .map((item: any) => ({ ...item, revenue: Number(item.revenue.toFixed(2)) }))
    .sort((a: any, b: any) => b.appointments - a.appointments || b.revenue - a.revenue)
    .slice(0, 8);

  const scheduledRevenue = appointments.reduce((sum: number, item: any) => sum + toMoney(item.service_value), 0);
  const todayRevenue = todayAppointments.reduce((sum: number, item: any) => sum + item.value, 0);

  return {
    source: 'appbarber',
    generatedAt: new Date().toISOString(),
    period: {
      today: todayKey,
      monthStart: monthStartKey,
      monthEnd: monthEndKey,
    },
    summary: {
      servicesCount: services.length,
      professionalsCount: professionals.length,
      monthAppointments: appointments.length,
      todayAppointments: todayAppointments.length,
      monthScheduledRevenue: Number(scheduledRevenue.toFixed(2)),
      todayScheduledRevenue: Number(todayRevenue.toFixed(2)),
      averageTicket: appointments.length ? Number((scheduledRevenue / appointments.length).toFixed(2)) : 0,
      subscriptionAppointments: appointments.filter((item: any) => item.subscription_association).length,
      financialBalance: toMoney(financial.balance),
      financialInflows: toMoney(financial.inflows?.total || financial.inflows?.total_net),
      financialOutflows: toMoney(financial.outflows?.total),
    },
    professionals: byProfessional,
    topServices,
    nextAppointments,
    catalog: services.slice(0, 12).map((service: any) => ({
      code: service.service_code,
      name: service.service_description,
      duration: toNumber(service.service_interval),
      value: toMoney(service.service_value),
      image: service.service_image || null,
      hasSubscription: !!service.has_subscription,
    })),
    errors: {
      services: servicesRes?.error || null,
      professionals: professionalsRes?.error || null,
      appointments: monthAppointmentsRes?.error || null,
      financial: financialRes?.error || null,
    },
  };
};

const logAppBarberSync = async (
  operation: string,
  status: 'success' | 'failed' | 'skipped',
  requestPayload: any,
  responsePayload: any,
) => {
  try {
    const supabase = getSupabase();
    if (!supabase) return;
    await supabase.from('appbarber_sync_log').insert({
      operation,
      status,
      request_payload: requestPayload || {},
      response_payload: responsePayload || {},
      correlation_id: responsePayload?.correlationId || responsePayload?.correlation_id || null,
    });
  } catch (error) {
    console.warn('AppBarber sync log skipped:', error);
  }
};

const buildEmptyDashboard = () => {
  const now = new Date();
  const todayKey = dateKey(now);
  const monthStartKey = `${todayKey.slice(0, 7)}-01`;
  return {
    officeId: 'office-fonseca',
    monthRef: monthStartKey,
    generatedAt: now.toISOString(),
    barbers: [],
    confirmations: [],
  };
};

const buildEmptyClient = (clientId: string) => {
  const now = new Date().toISOString();
  return {
    id: String(clientId || ''),
    officeId: 'office-fonseca',
    name: 'Cliente',
    phone: '',
    lastVisitAt: now,
    preferences: [],
    notes: '',
    averageFrequencyDays: 0,
    nextVisitSuggestion: '',
    serviceHistory: [],
    purchaseHistory: [],
    signals: [],
  };
};

const getOpsDashboard = async () => {
  const appbarber = await buildAppBarberSnapshot().catch((error) => ({
    source: 'appbarber',
    generatedAt: new Date().toISOString(),
    period: { today: dateKey(new Date()), monthStart: dateKey(new Date()), monthEnd: dateKey(addDays(new Date(), 7)) },
    summary: {
      servicesCount: 0,
      professionalsCount: 0,
      monthAppointments: 0,
      todayAppointments: 0,
      monthScheduledRevenue: 0,
      todayScheduledRevenue: 0,
      averageTicket: 0,
      subscriptionAppointments: 0,
      financialBalance: 0,
      financialInflows: 0,
      financialOutflows: 0,
    },
    professionals: [],
    topServices: [],
    nextAppointments: [],
    catalog: [],
    errors: { snapshot: error?.message || 'Falha ao carregar AppBarber' },
  }));
  try {
    const supabase = getSupabase();
    if (!supabase) return { ...buildEmptyDashboard(), appbarber };

    const todayKey = new Date().toISOString().slice(0, 10);
    const monthStartKey = `${todayKey.slice(0, 7)}-01`;
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 6);
    const weekStartKey = weekStart.toISOString().slice(0, 10);

    const [goalsRes, kpisRes, confirmationsRes] = await Promise.all([
      supabase.from('barber_goals').select('*').eq('month_ref', monthStartKey),
      supabase.from('barber_kpis_daily').select('*').gte('date_ref', monthStartKey),
      supabase.from('appointment_confirmations').select('*').order('sent_at', { ascending: false }).limit(20),
    ]);

    if (goalsRes.error || !goalsRes.data || goalsRes.data.length === 0) return { ...buildEmptyDashboard(), appbarber };

    const rows = kpisRes.data || [];
    const barbers = goalsRes.data.map((goal: any, index: number) => {
      const barberRows = rows.filter((row: any) => row.barber_user_id === goal.barber_user_id);
      const sumRevenue = (row: any) => toNumber(row.base_services_revenue) + toNumber(row.extra_services_revenue) + toNumber(row.products_revenue);
      const todayRow = barberRows.find((row: any) => toDateKey(row.date_ref) === todayKey) || barberRows[barberRows.length - 1] || {};
      const realizedToday = sumRevenue(todayRow);
      const realizedWeek = barberRows
        .filter((row: any) => toDateKey(row.date_ref) >= weekStartKey)
        .reduce((acc: number, row: any) => acc + sumRevenue(row), 0);
      const realizedMonth = barberRows.reduce((acc: number, row: any) => acc + sumRevenue(row), 0);
      const targetTotal = toNumber(goal.target_total);
      const guaranteedSubscription = toNumber(goal.guaranteed_subscription);
      const commissionRate = Math.max(0.01, toNumber(goal.commission_rate) || 0.4);
      const workingDays = Math.max(1, toNumber(goal.working_days) || 24);
      const ticketAvg = toNumber(todayRow.ticket_avg) || Math.max(1, realizedToday / Math.max(1, toNumber(todayRow.customers_count)));
      const metrics = calculateGoalMetrics({
        targetTotal,
        guaranteedSubscription,
        commissionRate,
        workingDays,
        realizedMonth,
      });

      return {
        id: String(goal.id || goal.barber_user_id || `barber-${index}`),
        officeId: String(goal.office_id || 'office-fonseca'),
        barberUserId: String(goal.barber_user_id || `barber-${index}`),
        barberName: String(goal.barber_name || `Barbeiro ${index + 1}`),
        monthRef: monthStartKey,
        targetTotal,
        guaranteedSubscription,
        productionTarget: metrics.productionTarget,
        dailyCommissionTarget: metrics.dailyCommissionTarget,
        dailyRevenueTarget: metrics.dailyRevenueTarget,
        commissionRate,
        workingDays,
        realizedToday: Number(realizedToday.toFixed(2)),
        realizedWeek: Number(realizedWeek.toFixed(2)),
        realizedMonth: Number(realizedMonth.toFixed(2)),
        gapRemaining: metrics.gapRemaining,
        progressPercent: metrics.progressPercent,
        tone: metrics.tone,
        kpisToday: {
          customersCount: toNumber(todayRow.customers_count),
          baseServicesRevenue: toNumber(todayRow.base_services_revenue),
          extraServicesRevenue: toNumber(todayRow.extra_services_revenue),
          productsRevenue: toNumber(todayRow.products_revenue),
          extraConversionPct: toNumber(todayRow.extra_conversion_pct),
          productsConversionPct: toNumber(todayRow.products_conversion_pct),
          ticketAvg,
        },
        actionPlan: buildActionPlan(metrics.gapRemaining, ticketAvg),
      };
    });

    const confirmations = (confirmationsRes.data || []).map((item: any, index: number) => ({
      id: String(item.id || `conf-${index}`),
      appointmentId: String(item.appointment_id || `appointment-${index}`),
      clientName: String(item.client_name || item.payload?.client_name || `Cliente ${index + 1}`),
      timeLabel: String(item.payload?.time || item.time || '--:--'),
      channel: item.channel || 'whatsapp',
      status: item.status || 'pending',
      sentAt: item.sent_at || new Date().toISOString(),
      confirmedAt: item.confirmed_at || null,
      payload: item.payload || {},
    }));

    return {
      officeId: String(goalsRes.data[0]?.office_id || 'office-fonseca'),
      monthRef: monthStartKey,
      generatedAt: new Date().toISOString(),
      barbers,
      confirmations,
      appbarber,
    };
  } catch {
    return { ...buildEmptyDashboard(), appbarber };
  }
};

const getClient360 = async (clientId: string) => {
  try {
    const supabase = getSupabase();
    if (!supabase) return buildEmptyClient(clientId);

    const [profileRes, signalRes] = await Promise.all([
      supabase.from('client_profiles_ext').select('*').eq('client_id', clientId).maybeSingle(),
      supabase.from('client_repurchase_signals').select('*').eq('client_id', clientId).order('next_recommended_at', { ascending: true }),
    ]);

    if (profileRes.error || !profileRes.data) return buildEmptyClient(clientId);

    return {
      id: String(profileRes.data.client_id),
      officeId: String(profileRes.data.office_id),
      name: String(profileRes.data.client_name || 'Cliente'),
      phone: String(profileRes.data.phone || ''),
      lastVisitAt: profileRes.data.last_visit_at || new Date().toISOString(),
      preferences: Array.isArray(profileRes.data.preferences) ? profileRes.data.preferences : [],
      notes: String(profileRes.data.notes || ''),
      averageFrequencyDays: toNumber(profileRes.data.average_frequency_days) || 30,
      nextVisitSuggestion: String(profileRes.data.next_visit_suggestion || 'Avaliar oferta de recompra na próxima visita.'),
      serviceHistory: [],
      purchaseHistory: [],
      signals: (signalRes.data || []).map((row: any, index: number) => ({
        id: String(row.id || `signal-${index}`),
        itemType: row.item_type || 'service',
        itemName: row.item_name || 'Item',
        cycleDays: toNumber(row.cycle_days) || 30,
        lastDoneAt: row.last_done_at || new Date().toISOString(),
        nextRecommendedAt: row.next_recommended_at || new Date().toISOString(),
        status: row.status || getRepurchaseStatus(row.last_done_at || new Date().toISOString(), toNumber(row.cycle_days) || 30),
        offerText: String(row.offer_text || `Sugerir ${row.item_name || 'o item'} ao cliente.`),
      })),
    };
  } catch {
    return buildEmptyClient(clientId);
  }
};

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

  app.get(["/api/debug/schema", "/debug/schema"], async (req, res) => {
    try {
      const supabase = getSupabase();
      if (!supabase) return res.status(500).json({ error: "No Supabase" });
      // Try to read one row from services to see columns
      const { data: rows, error: rowsErr } = await supabase.from('services').select('*').limit(1);
      const { data: settings, error: settErr } = await supabase.from('settings').select('*').limit(3);
      res.json({
        services: { rows, error: rowsErr?.message, columns: rows && rows.length > 0 ? Object.keys(rows[0]) : 'no rows - cannot infer columns' },
        settings: { rows: settings?.slice(0,3), error: settErr?.message }
      });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

app.get(["/api/supabase-config", "/supabase-config"], (req, res) => {
  res.json({
    url: process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "",
    anonKey: process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || ""
  });
});

app.get(["/api/appbarber/config", "/appbarber/config"], (req, res) => {
  const config = getAppBarberConfig();
  res.json({
    configured: !!config,
    baseUrl: config?.baseUrl || process.env.APPBARBER_API_BASE_URL || 'https://api.appbarber.com',
    establishmentCode: config?.establishmentCode || toNumber(process.env.APPBARBER_ESTABLISHMENT_CODE),
    proxyEnabled: !!config?.proxyUrl,
  });
});

app.get(["/api/appbarber/services", "/appbarber/services"], async (req, res) => {
  try {
    const data = await appBarberRequest('/v1/services', {
      query: {
        type: req.query.type || 1,
        professional_code: req.query.professional_code,
        service_code: req.query.service_code,
      },
    });
    res.json(data);
  } catch (error: any) {
    res.status(error.status || 500).json({ error: error.message, details: error.payload });
  }
});

app.get(["/api/appbarber/professionals", "/appbarber/professionals"], async (req, res) => {
  try {
    const data = await appBarberRequest('/v1/professionals', {
      query: {
        type: req.query.type || 1,
        service_code: req.query.service_code,
        combo_code: req.query.combo_code,
        professional_code: req.query.professional_code,
      },
    });
    res.json(data);
  } catch (error: any) {
    res.status(error.status || 500).json({ error: error.message, details: error.payload });
  }
});

app.get(["/api/appbarber/professional-list", "/appbarber/professional-list"], async (req, res) => {
  try {
    const data = await appBarberRequest('/v1/professional-list');
    res.json(data);
  } catch (error: any) {
    res.status(error.status || 500).json({ error: error.message, details: error.payload });
  }
});

app.get(["/api/appbarber/availability", "/appbarber/availability"], async (req, res) => {
  try {
    if (!req.query.start_date) {
      return res.status(400).json({ error: "start_date e obrigatorio no formato YYYY-MM-DD" });
    }

    const data = await appBarberRequest('/v1/availability', {
      query: {
        start_date: req.query.start_date,
        service_code: req.query.service_code,
        combo_code: req.query.combo_code,
      },
    });
    res.json(data);
  } catch (error: any) {
    res.status(error.status || 500).json({ error: error.message, details: error.payload });
  }
});

app.post(["/api/appbarber/appointments", "/appbarber/appointments"], async (req, res) => {
  const config = getAppBarberConfig();
  if (!config) {
    return res.status(500).json({ error: "AppBarber nao configurado. Configure APPBARBER_API_KEY e APPBARBER_ESTABLISHMENT_CODE." });
  }

  const body = {
    customer_phone: Number(normalizePhone(req.body?.customer_phone || req.body?.customerPhone || req.body?.phone)),
    customer_name: String(req.body?.customer_name || req.body?.customerName || req.body?.name || '').trim(),
    establishment_code: toNumber(req.body?.establishment_code || config.establishmentCode),
    observation: String(req.body?.observation || req.body?.notes || '').trim(),
    coupon: String(req.body?.coupon || '').trim(),
    start_date: String(req.body?.start_date || req.body?.startDate || '').trim(),
    professionals: Array.isArray(req.body?.professionals)
      ? req.body.professionals
      : [{ professional_code: toNumber(req.body?.professional_code || req.body?.professionalCode) }],
    services: Array.isArray(req.body?.services)
      ? req.body.services
      : [{
          service_code: toNumber(req.body?.service_code || req.body?.serviceCode),
          item_type: toNumber(req.body?.item_type || req.body?.itemType || 1),
          duration: toNumber(req.body?.duration || req.body?.duration_minutes || req.body?.durationMinutes),
        }],
    chat: toNumber(req.body?.chat || 0),
  };

  const missing = [
    !body.customer_phone && 'customer_phone',
    !body.customer_name && 'customer_name',
    !body.establishment_code && 'establishment_code',
    !body.start_date && 'start_date',
    !body.professionals?.[0]?.professional_code && 'professional_code',
    !body.services?.[0]?.service_code && 'service_code',
    !body.services?.[0]?.duration && 'duration',
  ].filter(Boolean);

  if (missing.length > 0) {
    return res.status(400).json({ error: `Campos obrigatorios ausentes: ${missing.join(', ')}` });
  }

  try {
    const data = await appBarberRequest('/v1/appointments', { method: 'POST', body });
    await logAppBarberSync('create_appointment', 'success', body, data);

    try {
      const supabase = getSupabase();
      const appointmentCode =
        data?.data?.appointment_code ||
        data?.appointment_code ||
        data?.data?.[0]?.appointment_code ||
        null;
      const [date, time] = body.start_date.split(' ');

      if (supabase) {
        await supabase.from('appointments').insert({
          client_name: body.customer_name,
          client_phone: String(body.customer_phone),
          service_code: body.services[0].service_code,
          professional_code: body.professionals[0].professional_code,
          date: date || null,
          time: time || null,
          starts_at: date && time ? new Date(`${date}T${time}:00-03:00`).toISOString() : null,
          status: appointmentCode ? 'Confirmado' : 'Pendente',
          source: 'appbarber',
          appbarber_appointment_code: appointmentCode,
          appbarber_payload: data || {},
          notes: body.observation,
        });
      }
    } catch (storeError) {
      console.warn('Local appointment storage skipped:', storeError);
    }

    res.status(201).json(data);
  } catch (error: any) {
    await logAppBarberSync('create_appointment', 'failed', body, error.payload || { message: error.message });
    res.status(error.status || 500).json({ error: error.message, details: error.payload });
  }
});

app.get(["/api/content", "/content"], async (req, res) => {
  console.log("Fetching content...");
  
  // Timeout de segurança para a API não travar o site
  const apiTimeout = setTimeout(() => {
    if (!res.headersSent) {
      console.warn("API Timeout: Sending fallback data");
      res.json({
        settings: {
          whatsapp_number: "5594992496583",
          whatsapp_message_default_template: "Ola! Vim pelo site da Fonseca Barber Club e quero agendar meu horario. Pode me mostrar os horarios disponiveis?",
          whatsapp_message_service_template: "Ola! Vim pelo site da Fonseca Barber Club e quero saber mais sobre o plano {servico}. Pode me explicar como funciona e os horarios disponiveis?",
          address: "R. Caiena, Qd 16 Lt 29 Sala D - Novo Horizonte, Parauapebas - PA",
          hero_video: "https://oacqvijuafuzsbyyqdtt.supabase.co/storage/v1/object/public/barber-assets/gallery-video-1771970955047.MOV",
          instagram_url: "https://www.instagram.com/fonsecabarbearia.pbs/",
          facebook_url: "https://facebook.com",
          google_maps_url: "https://www.google.com/maps/dir//Fonseca+Barber+Club,+R.+Caiena,+Quadra+16+Lote+29+Sala+D+-+Novo+Horizonte,+Parauapebas+-+PA,+68515-000/@-6.0612128,-49.8854506,15z/data=!4m8!4m7!1m0!1m5!1m1!1s0x92dd51a5a55a2507:0x363c577dd2197698!2m2!1d-49.8950371!2d-6.0569643?entry=ttu",
          hero_title: "A Arte do Corte Perfeito",
          hero_subtitle: "A Melhor Barbearia da Região",
          hero_description: "Mais que um corte de cabelo, uma experiência premium de cuidado masculino. Ambiente climatizado, cerveja gelada e profissionais de elite."
        },
        services: [], gallery: [], video_gallery: [], appointments: []
      });
    }
  }, 12000);

  try {
    const supabase = getSupabase();
    if (!supabase) throw new Error("Supabase not configured");

    // Fetch each table with individual error handling to prevent one failure from breaking everything
    const fetchTable = async (table: string) => {
      try {
        // Adiciona um timeout individual para cada consulta ao banco
        const { data, error } = await Promise.race([
          supabase.from(table).select('*'),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout na tabela ' + table)), 5000))
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

    const [settingsData, galleryData, videoGalleryData, appointmentsData] = await Promise.all([
      fetchTable('settings'),
      fetchTable('gallery'),
      fetchTable('video_gallery'),
      (async () => {
        try {
          const { data } = await Promise.race([
            supabase.from('appointments').select('*').order('date', { ascending: false }).limit(20),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout na tabela appointments')), 5000))
          ]) as any;
          return data || [];
        } catch (e) {
          return [];
        }
      })()
    ]);

    const settings: any = {
      whatsapp_number: "5594992496583",
      whatsapp_message_default_template: "Ola! Vim pelo site da Fonseca Barber Club e quero agendar meu horario. Pode me mostrar os horarios disponiveis?",
      whatsapp_message_service_template: "Ola! Vim pelo site da Fonseca Barber Club e quero saber mais sobre o plano {servico}. Pode me explicar como funciona e os horarios disponiveis?",
      address: "R. Caiena, Qd 16 Lt 29 Sala D - Novo Horizonte, Parauapebas - PA",
      hero_video: "https://oacqvijuafuzsbyyqdtt.supabase.co/storage/v1/object/public/barber-assets/gallery-video-1771970955047.MOV",
      instagram_url: "https://www.instagram.com/fonsecabarbearia.pbs/",
      facebook_url: "https://facebook.com",
      google_maps_url: "https://www.google.com/maps/dir//Fonseca+Barber+Club,+R.+Caiena,+Quadra+16+Lote+29+Sala+D+-+Novo+Horizonte,+Parauapebas+-+PA,+68515-000/@-6.0612128,-49.8854506,15z/data=!4m8!4m7!1m0!1m5!1m1!1s0x92dd51a5a55a2507:0x363c577dd2197698!2m2!1d-49.8950371!2d-6.0569643?entry=ttu",
      hero_title: "A Arte do Corte Perfeito",
      hero_subtitle: "A Melhor Barbearia da Região",
      hero_description: "Mais que um corte de cabelo, uma experiência premium de cuidado masculino. Ambiente climatizado, cerveja gelada e profissionais de elite."
    };
    
    settingsData?.forEach((s: any) => settings[s.key] = s.value);

    const galleryFromSettings = (() => {
      try {
        const raw = settings.marketing_gallery;
        if (!raw) return [];
        const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
        if (!Array.isArray(parsed)) return [];
        return parsed
          .map((item: any) => {
            if (typeof item === 'string') return { url: item.trim() };
            const url = item?.url || item?.image_url || item?.src || item?.value || '';
            return { url: String(url).trim() };
          })
          .filter((item: any) => item.url);
      } catch {
        return [];
      }
    })();

    clearTimeout(apiTimeout);
    if (!res.headersSent) {
      res.json({
        settings,
        services: (() => {
          try { return JSON.parse(settings.marketing_services || '[]'); } catch { return []; }
        })(),
        gallery: (galleryData && galleryData.length > 0) ? galleryData : galleryFromSettings,
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
        whatsapp_number: "5594992496583",
        whatsapp_message_default_template: "Ola! Vim pelo site da Fonseca Barber Club e quero agendar meu horario. Pode me mostrar os horarios disponiveis?",
        whatsapp_message_service_template: "Ola! Vim pelo site da Fonseca Barber Club e quero saber mais sobre o plano {servico}. Pode me explicar como funciona e os horarios disponiveis?",
        address: "R. Caiena, Qd 16 Lt 29 Sala D - Novo Horizonte, Parauapebas - PA",
        hero_video: "https://oacqvijuafuzsbyyqdtt.supabase.co/storage/v1/object/public/barber-assets/gallery-video-1771970955047.MOV",
        instagram_url: "https://www.instagram.com/fonsecabarbearia.pbs/",
        facebook_url: "https://facebook.com",
        google_maps_url: "https://www.google.com/maps/dir//Fonseca+Barber+Club,+R.+Caiena,+Quadra+16+Lote+29+Sala+D+-+Novo+Horizonte,+Parauapebas+-+PA,+68515-000/@-6.0612128,-49.8854506,15z/data=!4m8!4m7!1m0!1m5!1m1!1s0x92dd51a5a55a2507:0x363c577dd2197698!2m2!1d-49.8950371!2d-6.0569643?entry=ttu",
        hero_title: "A Arte do Corte Perfeito",
        hero_subtitle: "A Melhor Barbearia da Região",
        hero_description: "Mais que um corte de cabelo, uma experiência premium de cuidado masculino. Ambiente climatizado, cerveja gelada e profissionais de elite."
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
    const errors: string[] = [];
    for (const [key, value] of Object.entries(settings)) {
      const { error } = await supabase.from('settings').upsert({ key, value }, { onConflict: 'key' });
      if (error) errors.push(`settings[${key}]: ${error.message}`);
    }
    if (errors.length > 0) return res.status(500).json({ error: errors.join('; ') });
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.post(["/api/admin/services", "/admin/services"], async (req, res) => {
  try {
    const supabase = getSupabase();
    if (!supabase) return res.status(500).json({ error: "No Supabase" });
    const { services } = req.body;

    const jsonValue = JSON.stringify(Array.isArray(services) ? services : []);
    const { error: upsertError } = await supabase.from('settings').upsert({
      key: 'marketing_services',
      value: jsonValue,
    }, { onConflict: 'key' });
    if (upsertError) {
      return res.status(500).json({ error: `Upsert error: ${upsertError.message}`, code: upsertError.code });
    }

    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.post(["/api/admin/gallery", "/admin/gallery"], async (req, res) => {
  try {
    const supabase = getSupabase();
    if (!supabase) return res.status(500).json({ error: "No Supabase" });
    const { gallery } = req.body;
    await supabase.from('gallery').delete().not('id', 'is', null);
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
    await supabase.from('video_gallery').delete().not('id', 'is', null);
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

app.get(["/api/ops/dashboard", "/ops/dashboard"], async (req, res) => {
  const dashboard = await getOpsDashboard();
  res.json(dashboard);
});

app.get(["/api/ops/clients/:id", "/ops/clients/:id"], async (req, res) => {
  const client = await getClient360(String(req.params.id));
  res.json(client);
});

app.post(["/api/ops/confirmations/run", "/ops/confirmations/run"], async (req, res) => {
  const phase = req.body?.phase === '30min' ? '30_min' : 'inicio_do_dia';
  const dashboard = await getOpsDashboard();
  const sentAt = new Date().toISOString();
  const confirmations = dashboard.confirmations.map((item: any) => ({
    ...item,
    status: confirmAppointmentStatus(item.status, false),
    sentAt,
    payload: { ...(item.payload || {}), flow: phase },
  }));

  let mode = 'fallback';
  try {
    const supabase = getSupabase();
    if (supabase) {
      await Promise.all(
        confirmations
          .filter((item: any) => isUuid(String(item.appointmentId)))
          .map((item: any) =>
            supabase.from('appointment_confirmations').upsert({
              office_id: item.officeId || dashboard.officeId,
              appointment_id: item.appointmentId,
              channel: item.channel || 'whatsapp',
              status: item.status,
              sent_at: item.sentAt,
              client_name: item.clientName,
              payload: item.payload || {},
            }, { onConflict: 'office_id,appointment_id,channel' })
          )
      );
      mode = 'persistent';
    }
  } catch (error) {
    console.warn('Confirmation run fallback:', error);
  }

  res.json({
    success: true,
    mode,
    message: `${confirmations.length} confirmações processadas para o fluxo ${phase}.`,
    confirmations,
  });
});

app.post(["/api/ops/confirmations/:appointmentId/confirm", "/ops/confirmations/:appointmentId/confirm"], async (req, res) => {
  const appointmentId = String(req.params.appointmentId);
  const confirmedAt = new Date().toISOString();
  let mode = 'fallback';

  try {
    const supabase = getSupabase();
    if (supabase && isUuid(appointmentId)) {
      const officeId = req.body?.officeId || '11111111-1111-1111-1111-111111111111';
      await supabase.from('appointment_confirmations').upsert({
        office_id: officeId,
        appointment_id: appointmentId,
        channel: 'whatsapp',
        status: 'confirmed',
        sent_at: req.body?.sentAt || confirmedAt,
        confirmed_at: confirmedAt,
        client_name: req.body?.clientName || 'Cliente',
        payload: { ...(req.body || {}), source: 'whatsapp_webhook' },
      }, { onConflict: 'office_id,appointment_id,channel' });

      await supabase.from('appointments').update({ status: 'Confirmado' }).eq('id', appointmentId);
      mode = 'persistent';
    }
  } catch (error) {
    console.warn('Confirmation update fallback:', error);
  }

  res.json({
    success: true,
    mode,
    appointmentId,
    status: 'confirmed',
    confirmedAt,
  });
});

app.get(["/api/ops/migrations", "/ops/migrations"], async (req, res) => {
  res.json({
    success: true,
    file: 'supabase/migrations/20260416_mvp1_barber_platform.sql',
  });
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
