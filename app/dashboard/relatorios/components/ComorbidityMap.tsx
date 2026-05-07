"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function ComorbidityMap({ patients }: { patients: any[] }) {
  // Agrupar dados: Microarea -> Comorbidade -> Count
  const aggregation: Record<string, any> = {};

  patients.forEach(p => {
    const micro = p.microarea || 'Sede/Outros';
    if (!aggregation[micro]) aggregation[micro] = { name: micro };
    
    (p.comorbidities || []).forEach((c: string) => {
      aggregation[micro][c] = (aggregation[micro][c] || 0) + 1;
    });
  });

  const chartData = Object.values(aggregation).sort((a, b) => a.name.localeCompare(b.name));
  
  // Pegar lista única de comorbidades para as barras
  const comorbs = [...new Set(patients.flatMap(p => p.comorbidities || []))];
  const colors = ['#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  return (
    <div className="bg-white p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100">
      <h3 className="text-xl font-extrabold text-slate-800 mb-6 flex items-center gap-2">
          🗺️ Prevalência de Comorbidades por Microárea
      </h3>
      <div className="h-[400px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12, fontWeight: 'bold'}} />
            <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
            <Tooltip 
                contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}
                cursor={{ fill: '#f8fafc' }}
            />
            <Legend iconType="circle" />
            {comorbs.map((c, i) => (
              <Bar key={c} dataKey={c} fill={colors[i % colors.length]} radius={[4, 4, 0, 0]} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
