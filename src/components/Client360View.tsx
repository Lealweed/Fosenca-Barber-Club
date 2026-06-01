import React, { useEffect, useState } from 'react';
import { ArrowLeft, CalendarClock, MessageCircle, Package, Scissors, Sparkles, UserRound } from 'lucide-react';
import {
  formatCurrency,
  formatDate,
  getFallbackClient,
  type Client360Response,
} from '../lib/opsFallback';

const signalStyles: Record<string, string> = {
  due: 'bg-amber-500/15 text-amber-200 border-amber-400/30',
  overdue: 'bg-rose-500/15 text-rose-200 border-rose-400/30',
  done: 'bg-emerald-500/15 text-emerald-200 border-emerald-400/30',
};

interface Props {
  clientId?: string;
}

export default function Client360View({ clientId = '1' }: Props) {
  const [client, setClient] = useState<Client360Response>(getFallbackClient(clientId));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await fetch(`/api/ops/clients/${clientId}`);
        if (!res.ok) throw new Error('Falha ao carregar cliente');
        const json = (await res.json()) as Client360Response;
        setClient(json);
      } catch {
        setClient(getFallbackClient(clientId));
        setError('Histórico completo indisponível. Exibindo dados seguros de contingência.');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [clientId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white px-4 py-6 md:px-8">
        <div className="max-w-4xl mx-auto rounded-3xl border border-zinc-800 bg-zinc-900 p-8 text-center">
          <p className="text-lg font-semibold">Carregando ficha do cliente...</p>
          <p className="text-sm text-zinc-400 mt-2">Preferências, histórico e recomendações estão sendo preparados.</p>
        </div>
      </div>
    );
  }

  const whatsappHref = client.phone ? `https://wa.me/${client.phone.replace(/\D/g, '')}` : undefined;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.16),transparent_0),linear-gradient(135deg,#09090b,#111827_48%,#09090b)] text-white px-4 py-6 md:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <a href="/app/meta-barbeiro" className="inline-flex items-center gap-2 text-sm text-zinc-300 hover:text-white mb-3">
              <ArrowLeft className="w-4 h-4" /> Voltar ao painel
            </a>
            <h1 className="text-3xl md:text-5xl font-black tracking-tight">CRM Cliente 360</h1>
            <p className="text-zinc-300 mt-2 max-w-2xl">
              Histórico simples, sinais de recompra e abordagem ideal para a próxima conversa.
            </p>
          </div>
          {whatsappHref ? (
            <a
              href={whatsappHref}
              target="_blank"
              rel="noreferrer"
              className="rounded-2xl border border-emerald-400/30 bg-emerald-500/15 px-4 py-3 text-sm font-semibold hover:bg-emerald-500/25"
            >
              Chamar no WhatsApp
            </a>
          ) : (
            <span className="rounded-2xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-zinc-400">
              WhatsApp indisponível
            </span>
          )}
        </div>

        {error && (
          <div className="rounded-2xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
            {error}
          </div>
        )}

        <section className="rounded-3xl border border-white/10 bg-white/5 p-5 md:p-6">
          <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="rounded-2xl bg-cyan-500/15 p-3"><UserRound className="w-5 h-5 text-cyan-200" /></div>
                <div>
                  <h2 className="text-2xl font-bold">{client.name}</h2>
                  <p className="text-zinc-400">{client.phone || 'Telefone não informado'}</p>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-zinc-950/60 p-4">
                  <p className="text-sm text-zinc-400">Última visita</p>
                  <strong>{formatDate(client.lastVisitAt)}</strong>
                </div>
                <div className="rounded-2xl border border-white/10 bg-zinc-950/60 p-4">
                  <p className="text-sm text-zinc-400">Frequência média</p>
                  <strong>{client.averageFrequencyDays} dias</strong>
                </div>
                <div className="rounded-2xl border border-white/10 bg-zinc-950/60 p-4">
                  <p className="text-sm text-zinc-400">Próxima ação</p>
                  <strong>{client.signals.length} sugestões</strong>
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-cyan-400/20 bg-cyan-500/10 p-4">
                <p className="text-sm text-cyan-100">{client.nextVisitSuggestion}</p>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-zinc-950/60 p-4">
              <h3 className="font-bold mb-3">Preferências e observações</h3>
              {client.preferences.length > 0 ? (
                <div className="flex flex-wrap gap-2 mb-4">
                  {client.preferences.map((item) => (
                    <span key={item} className="rounded-full border border-cyan-400/30 bg-cyan-500/10 px-3 py-1 text-sm text-cyan-100">
                      {item}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-zinc-400 mb-4">Nenhuma preferência registrada.</p>
              )}
              <p className="text-sm text-zinc-300 leading-relaxed">{client.notes || 'Sem observações adicionais.'}</p>
            </div>
          </div>
        </section>

        <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
          <section className="rounded-3xl border border-white/10 bg-white/5 p-5 md:p-6">
            <div className="flex items-center gap-2 mb-5">
              <Scissors className="w-5 h-5 text-cyan-200" />
              <h2 className="text-xl font-bold">Histórico de serviços</h2>
            </div>
            <div className="space-y-3">
              {client.serviceHistory.length === 0 ? (
                <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4 text-sm text-zinc-400">
                  Nenhum serviço registrado ainda.
                </div>
              ) : client.serviceHistory.map((row) => (
                <div key={row.id} className="rounded-2xl border border-white/10 bg-zinc-950/60 p-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold">{row.itemName}</p>
                    <p className="text-sm text-zinc-400">{formatDate(row.date)} • {row.barberName}</p>
                  </div>
                  <strong>{formatCurrency(row.amount)}</strong>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/5 p-5 md:p-6">
            <div className="flex items-center gap-2 mb-5">
              <Package className="w-5 h-5 text-cyan-200" />
              <h2 className="text-xl font-bold">Histórico de compras</h2>
            </div>
            <div className="space-y-3">
              {client.purchaseHistory.length === 0 ? (
                <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4 text-sm text-zinc-400">
                  Nenhuma compra de produto registrada.
                </div>
              ) : client.purchaseHistory.map((row) => (
                <div key={row.id} className="rounded-2xl border border-white/10 bg-zinc-950/60 p-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold">{row.itemName}</p>
                    <p className="text-sm text-zinc-400">{formatDate(row.date)}</p>
                  </div>
                  <strong>{formatCurrency(row.amount)}</strong>
                </div>
              ))}
            </div>
          </section>
        </div>

        <section className="rounded-3xl border border-white/10 bg-white/5 p-5 md:p-6">
          <div className="flex items-center justify-between gap-3 mb-5">
            <div>
              <h2 className="text-xl font-bold">Recompra inteligente</h2>
              <p className="text-zinc-400 text-sm">Alertas por ciclo de serviço e produto.</p>
            </div>
            <span className="text-xs text-zinc-400">{client.signals.length} sinalizações</span>
          </div>

          {client.signals.length === 0 ? (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4 text-sm text-zinc-400">
              Nenhuma recomendação de recompra no momento.
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {client.signals.map((signal) => (
                <div key={signal.id} className="rounded-2xl border border-white/10 bg-zinc-950/60 p-4">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2">
                      {signal.itemType === 'service' ? <Sparkles className="w-4 h-4 text-cyan-200" /> : <MessageCircle className="w-4 h-4 text-cyan-200" />}
                      <strong>{signal.itemName}</strong>
                    </div>
                    <span className={`rounded-full border px-3 py-1 text-xs font-bold uppercase ${signalStyles[signal.status]}`}>
                      {signal.status === 'overdue' ? 'atrasado' : signal.status === 'due' ? 'na janela' : 'ok'}
                    </span>
                  </div>
                  <p className="text-sm text-zinc-300">{signal.offerText}</p>
                  <div className="mt-3 text-sm text-zinc-400">
                    <p><CalendarClock className="w-4 h-4 inline mr-1" />Último: {formatDate(signal.lastDoneAt)}</p>
                    <p className="mt-1">Próximo recomendado: {formatDate(signal.nextRecommendedAt)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
