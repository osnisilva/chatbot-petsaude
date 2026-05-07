"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export default function CarePathwayStats({ messages }: { messages: any[] }) {
  // Filtrar apenas mensagens do Bot (que são as de trilha/prevenção)
  const botMsgs = messages.filter(m => m.sender_type === 'bot');

  const statusData = [
    { name: 'Enviadas', count: botMsgs.length, color: '#94a3b8' },
    { name: 'Entregues', count: botMsgs.filter(m => ['delivered', 'read'].includes(m.status)).length, color: '#0ea5e9' },
    { name: 'Lidas (Adesão)', count: botMsgs.filter(m => m.status === 'read').length, color: '#10b981' },
  ];

  const readRate = botMsgs.length > 0 
    ? Math.round((statusData[2].count / botMsgs.length) * 100) 
    : 0;

  return (
    <div className="bg-white p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h3 className="text-xl font-extrabold text-slate-800">📊 Eficácia das Trilhas de Cuidado</h3>
          <p className="text-slate-400 text-sm font-medium mt-1">Taxa de interação com mensagens preventivas</p>
        </div>
        <div className="bg-emerald-50 px-6 py-3 rounded-2xl border border-emerald-100 text-center">
            <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Taxa de Adesão</p>
            <p className="text-3xl font-black text-emerald-700">{readRate}%</p>
        </div>
      </div>

      <div className="h-[350px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={statusData} layout="vertical">
            <XAxis type="number" hide />
            <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontWeight: 'bold'}} width={100} />
            <Tooltip cursor={{ fill: 'transparent' }} />
            <Bar dataKey="count" radius={[0, 10, 10, 0]} barSize={40}>
              {statusData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-8 p-6 bg-slate-50 rounded-2xl border border-slate-100">
          <p className="text-xs text-slate-500 font-medium leading-relaxed">
              * A <strong>Taxa de Adesão</strong> representa a porcentagem de pacientes que não apenas receberam, mas efetivamente abriram e leram as mensagens de orientação enviadas automaticamente pelo Bot.
          </p>
      </div>
    </div>
  );
}
