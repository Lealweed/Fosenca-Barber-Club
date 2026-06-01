import React from 'react';
import {
  ArrowLeft,
  BarChart3,
  Bot,
  CalendarCheck,
  CheckCircle2,
  ClipboardList,
  MessageCircle,
  RefreshCw,
  ShieldCheck,
  Target,
  Users,
} from 'lucide-react';

const quickActions = [
  {
    title: 'Abrir painel de metas',
    href: '/app/meta-barbeiro',
    description: 'Acompanhar agenda, equipe, receita agendada, ranking e plano de ação.',
  },
  {
    title: 'Abrir painel administrativo',
    href: '/',
    description: 'Voltar ao site e usar o botão de engrenagem no canto inferior esquerdo.',
  },
  {
    title: 'Testar atendimento',
    href: 'https://wa.me/5594992496583',
    description: 'Enviar uma mensagem no WhatsApp oficial e validar resposta da automação.',
  },
];

const dailyRoutine = [
  'Abra o Painel de Metas antes do início dos atendimentos.',
  'Confira Agenda hoje, Receita agendada e Ranking da equipe.',
  'Veja os próximos horários e identifique buracos na agenda.',
  'Use o plano de ação para orientar cada barbeiro: clientes, serviços extras, selagens e produtos.',
  'No fim do dia, compare realizado, ticket médio e serviços mais puxados.',
];

const sections = [
  {
    icon: BarChart3,
    title: 'Central de Inteligência AppBarber',
    text: 'Mostra dados reais da API AppBarber: serviços cadastrados, profissionais, agendamentos do mês, agenda do dia, receita agendada, assinaturas na agenda e financeiro disponível.',
  },
  {
    icon: Target,
    title: 'Metas por barbeiro',
    text: 'Mostra meta mensal, realizado, gap restante e plano de ação. O objetivo é transformar número em ação prática para a equipe durante o dia.',
  },
  {
    icon: CalendarCheck,
    title: 'Agenda e próximos horários',
    text: 'Lista próximos atendimentos vindos do AppBarber. Use para conferir fluxo do dia, atrasos, encaixes e oportunidades de completar horários vazios.',
  },
  {
    icon: Users,
    title: 'Ranking da equipe',
    text: 'Agrupa atendimentos por profissional, mostrando quantidade de agendamentos e receita associada. Ajuda o Fonseca a conduzir conversa rápida com a equipe.',
  },
  {
    icon: MessageCircle,
    title: 'WhatsApp e Evolution API',
    text: 'O cliente fala no WhatsApp, a Evolution entrega a mensagem ao n8n, o agente consulta AppBarber quando precisa e responde pelo WhatsApp.',
  },
  {
    icon: Bot,
    title: 'n8n e agente IA',
    text: 'O fluxo FonsecaBarberClub está ativo e usa AppBarber como fonte operacional. Ele não deve confirmar horário sem retorno real da AppBarber.',
  },
];

const numberMeanings = [
  ['Agendamentos no mês', 'Quantidade de registros retornados pelo histórico da AppBarber no mês atual.'],
  ['Hoje na agenda', 'Atendimentos marcados para a data atual. Use para briefing rápido da equipe.'],
  ['Receita agendada', 'Soma dos valores dos serviços na agenda do mês. Alguns agendamentos de assinatura podem vir com valor zero.'],
  ['Ticket médio', 'Receita agendada dividida pela quantidade de agendamentos retornados.'],
  ['Assinaturas agenda', 'Atendimentos vinculados a assinatura/recorrência no AppBarber.'],
  ['Saldo financeiro', 'Resumo financeiro retornado pelo relatório da AppBarber para o período consultado.'],
];

const troubleshooting = [
  {
    issue: 'Os números aparecem zerados',
    action: 'Clique em Atualizar. Se continuar zerado, valide se o workflow proxy do n8n está ativo e se o IP 72.60.31.12 segue liberado na AppBarber.',
  },
  {
    issue: 'Cliente pediu horário e o bot não confirmou',
    action: 'Isso é esperado quando falta serviço, profissional, data ou retorno claro da AppBarber. Complete os dados ou encaminhe para humano.',
  },
  {
    issue: 'Agenda do site abre, mas AppBarber bloqueia direto',
    action: 'O site usa proxy pelo n8n porque a Vercel não tem IP fixo liberado. Não remova APPBARBER_PROXY_URL da Vercel.',
  },
  {
    issue: 'Precisa mostrar os números para a equipe',
    action: 'Abra /app/meta-barbeiro em uma TV, tablet ou notebook. Use a seção Central de Inteligência e Ranking da equipe no briefing.',
  },
];

export default function SystemGuidePage() {
  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <section className="border-b border-zinc-800 bg-zinc-900">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
          <a href="/" className="inline-flex items-center gap-2 text-sm text-zinc-300 hover:text-white mb-6">
            <ArrowLeft className="w-4 h-4" />
            Voltar ao site
          </a>
          <div className="grid gap-6 lg:grid-cols-[1fr_0.8fr] lg:items-end">
            <div>
              <p className="text-sm text-gold font-semibold uppercase tracking-widest">Manual operacional</p>
              <h1 className="text-3xl md:text-5xl font-black tracking-tight mt-3">
                Como usar o sistema Fonseca Barber Club
              </h1>
              <p className="text-zinc-300 mt-4 max-w-3xl">
                Guia prático para usar painel, metas, Central de Inteligência, AppBarber, n8n e WhatsApp na rotina da barbearia.
              </p>
            </div>
            <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-5">
              <div className="flex items-center gap-3">
                <ShieldCheck className="w-6 h-6 text-emerald-300" />
                <div>
                  <p className="font-bold">Arquitetura atual</p>
                  <p className="text-sm text-emerald-100/80">Site e dashboard usam API interna; AppBarber passa pelo n8n com IP liberado.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 space-y-8">
        <section className="grid gap-4 md:grid-cols-3">
          {quickActions.map((item) => (
            <a key={item.title} href={item.href} className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 hover:border-gold/40 transition-all">
              <p className="font-bold">{item.title}</p>
              <p className="text-sm text-zinc-400 mt-2">{item.description}</p>
            </a>
          ))}
        </section>

        <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
          <div className="flex items-center gap-3 mb-5">
            <ClipboardList className="w-5 h-5 text-gold" />
            <h2 className="text-xl font-black">Rotina diária recomendada</h2>
          </div>
          <div className="grid gap-3 md:grid-cols-5">
            {dailyRoutine.map((item, index) => (
              <div key={item} className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
                <span className="text-xs text-gold font-black">0{index + 1}</span>
                <p className="text-sm text-zinc-200 mt-3">{item}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {sections.map(({ icon: Icon, title, text }) => (
            <div key={title} className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
              <div className="w-10 h-10 rounded-xl bg-gold/10 border border-gold/20 flex items-center justify-center mb-4">
                <Icon className="w-5 h-5 text-gold" />
              </div>
              <h3 className="font-bold">{title}</h3>
              <p className="text-sm text-zinc-400 mt-2 leading-relaxed">{text}</p>
            </div>
          ))}
        </section>

        <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
          <div className="flex items-center gap-3 mb-5">
            <Target className="w-5 h-5 text-cyan-300" />
            <h2 className="text-xl font-black">Como interpretar os números</h2>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {numberMeanings.map(([label, text]) => (
              <div key={label} className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
                <p className="font-semibold text-zinc-100">{label}</p>
                <p className="text-sm text-zinc-400 mt-1">{text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
          <div className="flex items-center gap-3 mb-5">
            <RefreshCw className="w-5 h-5 text-amber-300" />
            <h2 className="text-xl font-black">Quando algo não funcionar</h2>
          </div>
          <div className="space-y-3">
            {troubleshooting.map((item) => (
              <div key={item.issue} className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-300 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold">{item.issue}</p>
                    <p className="text-sm text-zinc-400 mt-1">{item.action}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
