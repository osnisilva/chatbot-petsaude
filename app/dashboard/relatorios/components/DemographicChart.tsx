"use client";

import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export default function DemographicChart({ patients }: { patients: any[] }) {
  // 1. Gênero
  const genderData = [
    { name: 'Masculino', value: patients.filter(p => p.gender === 'M').length },
    { name: 'Feminino', value: patients.filter(p => p.gender === 'F').length },
    { name: 'Não Informado', value: patients.filter(p => !p.gender).length },
  ].filter(d => d.value > 0);

  const COLORS = ['#0ea5e9', '#ec4899', '#94a3b8'];

  // 2. Faixa Etária
  const getAge = (birth: string) => {
    if (!birth) return null;
    const today = new Date();
    const birthDate = new Date(birth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
    return age;
  };

  const ageGroups = [
    { name: '0-12', range: [0, 12], count: 0 },
    { name: '13-18', range: [13, 18], count: 0 },
    { name: '19-35', range: [19, 35], count: 0 },
    { name: '36-60', range: [36, 60], count: 0 },
    { name: '60+', range: [61, 200], count: 0 },
  ];

  patients.forEach(p => {
    const age = getAge(p.birth_date);
    if (age === null) return;
    const group = ageGroups.find(g => age >= g.range[0] && age <= g.range[1]);
    if (group) group.count++;
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div className="bg-white p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100">
        <h3 className="text-xl font-extrabold text-slate-800 mb-6">Distribuição por Gênero</h3>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={genderData}
                innerRadius={60}
                outerRadius={100}
                paddingAngle={5}
                dataKey="value"
              >
                {genderData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100">
        <h3 className="text-xl font-extrabold text-slate-800 mb-6">Pirâmide Etária (Simplificada)</h3>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={ageGroups}>
              <XAxis dataKey="name" axisLine={false} tickLine={false} />
              <YAxis axisLine={false} tickLine={false} />
              <Tooltip cursor={{ fill: '#f8fafc' }} />
              <Bar dataKey="count" fill="#10b981" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
