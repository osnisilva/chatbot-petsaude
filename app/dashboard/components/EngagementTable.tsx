"use client";

interface EngagementData {
  acs_id: string;
  acs_name: string;
  ubs_name: string;
  bot_patients_count: number;
}

interface EngagementTableProps {
  data: EngagementData[];
  totalPatients: number;
}

export default function EngagementTable({ data, totalPatients }: EngagementTableProps) {
  return (
    <div className="bg-white p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h3 className="text-xl font-extrabold text-slate-800 flex items-center gap-2">
            🤝 Engajamento por Profissional
          </h3>
          <p className="text-slate-400 text-sm font-medium mt-1">Impacto da tecnologia por microárea</p>
        </div>
        <div className="bg-slate-50 px-4 py-2 rounded-xl border border-slate-100">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Total de ACS: </span>
            <span className="text-sm font-black text-slate-700">{data.length}</span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="text-slate-400 text-[10px] uppercase tracking-widest border-b border-slate-50">
              <th className="pb-4 font-black">Profissional</th>
              <th className="pb-4 font-black">Unidade</th>
              <th className="pb-4 font-black text-right">Pacientes / IA</th>
              <th className="pb-4 font-black w-1/3">Alcance</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {data.length === 0 ? (
                <tr>
                    <td colSpan={4} className="py-10 text-center text-slate-400 font-medium">
                        Nenhum atendimento registrado para esta seleção.
                    </td>
                </tr>
            ) : (
                data.map((item) => {
                    const percentage = totalPatients > 0 ? (item.bot_patients_count / totalPatients) * 100 : 0;
                    
                    return (
                        <tr key={item.acs_id} className="group hover:bg-teal-50/20 transition-colors">
                            <td className="py-5">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-teal-100 text-teal-600 flex items-center justify-center text-xs font-bold">
                                        {item.acs_name.charAt(0)}
                                    </div>
                                    <span className="font-bold text-slate-700 group-hover:text-teal-700 transition-colors">{item.acs_name}</span>
                                </div>
                            </td>
                            <td className="py-5">
                                <span className="text-sm text-slate-500 font-medium">{item.ubs_name}</span>
                            </td>
                            <td className="py-5 text-right">
                                <span className="font-black text-slate-800">{item.bot_patients_count}</span>
                                <span className="text-slate-400 text-[10px] ml-1">pacientes</span>
                            </td>
                            <td className="py-5">
                                <div className="flex items-center gap-3">
                                    <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                                        <div 
                                            className="h-full bg-gradient-to-r from-teal-400 to-emerald-500 rounded-full transition-all duration-1000"
                                            style={{ width: `${Math.min(percentage * 5, 100)}%` }} // Multiplicado para dar destaque visual
                                        ></div>
                                    </div>
                                    <span className="text-[10px] font-bold text-slate-400 w-8">{item.bot_patients_count}</span>
                                </div>
                            </td>
                        </tr>
                    );
                })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
