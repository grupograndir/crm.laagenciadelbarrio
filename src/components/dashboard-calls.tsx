// Dashboard LADB v2.1 - Sorted desc, no filter count
"use client";

import React, { useState, useMemo, useEffect } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Label
} from 'recharts';
import {
    LayoutDashboard, ShoppingCart, FolderKanban, UserCircle, Bell, Search,
    Sun, History, LayoutPanelLeft, MoreHorizontal, ArrowUpRight, ArrowDownRight,
    Filter, Calendar, Users, Trophy, RefreshCw
} from 'lucide-react';
import localCallsData from '@/lib/calls-data.json';

const COLORS = ['#3B82F6', '#10B981', '#6366F1', '#F59E0B', '#EF4444'];
const PIE_COLORS = ['#1E293B', '#3B82F6']; // Oscuro para Contactado, Azul para No Contactado

const PERIODOS = [
    { id: 'hoy', label: 'Hoy', days: 0 },
    { id: '3dias', label: '3 días', days: 3 },
    { id: '1semana', label: '1 semana', days: 7 },
    { id: '2semanas', label: '2 semanas', days: 14 },
    { id: '3semanas', label: '3 semanas', days: 21 },
    { id: '1mes', label: '1 mes', days: 30 },
    { id: '3meses', label: '3 meses', days: 90 },
    { id: '6meses', label: '6 meses', days: 180 },
    { id: '1ano', label: '1 año', days: 365 },
    { id: 'historico', label: 'Histórico', days: Infinity },
];

export default function DashboardCalls() {
    const [periodoSel, setPeriodoSel] = useState('historico');
    const [asesorSel, setAsesorSel] = useState('todos');
    const [callsData, setCallsData] = useState<any>(localCallsData);
    const [loading, setLoading] = useState(false);

    // Cargar datos desde Webhook (n8n) si existe la URL
    useEffect(() => {
        const dataUrl = process.env.NEXT_PUBLIC_DATA_URL;
        if (dataUrl) {
            setLoading(true);
            fetch(dataUrl)
                .then(res => res.json())
                .then(data => {
                    if (data.advisors) setCallsData(data);
                    setLoading(false);
                })
                .catch(err => {
                    console.error("Error cargando datos de n8n:", err);
                    setLoading(false);
                });
        }
    }, []);

    // Procesamiento de datos filtrados
    const { filteredCalls, ranking, stats, allCallsForAdvisor } = useMemo(() => {
        const today = new Date();
        const periodObj = PERIODOS.find(p => p.id === periodoSel) || PERIODOS[9];
        const limitDate = periodObj.days === Infinity ? null : new Date(today);
        if (limitDate) limitDate.setDate(today.getDate() - periodObj.days);

        const allCalls: any[] = [];
        callsData.advisors
            .filter((adv: any) => adv.name !== 'Plantilla')
            .forEach((adv: any) => {
                adv.calls.forEach((call: any) => {
                    const callDate = new Date(call.date);
                    const isInPeriod = !limitDate || callDate >= limitDate;

                    if (isInPeriod) {
                        allCalls.push({ ...call, advisorName: adv.name });
                    }
                });
            });

        // Stats
        const contacted = allCalls.filter(c => c.contacted && (asesorSel === 'todos' || c.advisorName === asesorSel)).length;
        const totalSelected = allCalls.filter(c => (asesorSel === 'todos' || c.advisorName === asesorSel)).length;

        // Ranking de Asesores (Siempre basado en el periodo)
        const rankingMap: Record<string, { name: string; total: number; contacted: number }> = {};
        allCalls.forEach(c => {
            if (!rankingMap[c.advisorName]) rankingMap[c.advisorName] = { name: c.advisorName, total: 0, contacted: 0 };
            rankingMap[c.advisorName].total++;
            if (c.contacted) rankingMap[c.advisorName].contacted++;
        });
        const rankingList = Object.values(rankingMap).sort((a, b) => b.total - a.total);

        return {
            filteredCalls: allCalls,
            ranking: rankingList,
            stats: {
                total: totalSelected,
                contacted: contacted,
                rate: totalSelected > 0 ? Math.round((contacted / totalSelected) * 100) : 0
            },
            allCallsForAdvisor: allCalls
                .filter(c => asesorSel === 'todos' || c.advisorName === asesorSel)
                .sort((a, b) => {
                    // Ordenar por posición de fila: último registro añadido primero
                    const idxA = parseInt(a.id.split('-').pop()) || 0;
                    const idxB = parseInt(b.id.split('-').pop()) || 0;
                    return idxB - idxA;
                })
        };
    }, [periodoSel, asesorSel, callsData]);

    return (
        <div className="flex h-screen bg-[#F8FAFC] text-[#1E293B] font-sans selection:bg-blue-100 overflow-hidden">
            {/* Sidebar */}
            <aside className="w-64 border-r border-[#E2E8F0] bg-white flex flex-col p-6 pr-4 shrink-0 shadow-sm z-10">
                <div className="flex items-center gap-2 mb-10 px-2 font-semibold text-lg hover:opacity-80 transition-opacity cursor-pointer">
                    <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white border-b-2 border-blue-800 shadow-md">A</div>
                    La Agencia del Barrio
                </div>

                <nav className="space-y-1">
                    <p className="text-[10px] uppercase font-bold text-slate-400 px-3 mb-2 tracking-wider">Favoritos</p>
                    <NavItem icon={<LayoutDashboard size={18} />} label="Panel Principal" active />
                </nav>

                <div className="mt-auto pt-6 border-t border-slate-100 flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-slate-200 border border-slate-300" />
                    <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold truncate">Usuario Admin</p>
                        <p className="text-[10px] text-slate-400">Administrador</p>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col min-w-0">
                {/* Navbar */}
                <header className="h-16 border-b border-[#E2E8F0] bg-white flex items-center justify-between px-8 shrink-0">
                    <div className="flex items-center gap-4 text-xs text-slate-400">
                        <LayoutPanelLeft size={16} />
                        <span>/</span>
                        <span className="text-slate-900 font-medium">La Agencia del Barrio</span>
                        <span>/</span>
                        <span className="text-slate-900 font-medium">Seguimiento de Llamadas</span>
                    </div>

                    <div className="flex items-center gap-6">
                        <div className="relative group">
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                            <input
                                type="text"
                                placeholder="Buscar cliente, referencia..."
                                className="pl-10 pr-4 py-1.5 bg-[#F1F5F9] rounded-lg text-xs w-64 focus:outline-none focus:ring-2 focus:ring-blue-100 placeholder:text-slate-400 transition-all"
                            />
                        </div>
                        <div className="flex items-center gap-3 text-slate-500">
                            <div className="w-8 h-8 rounded-full hover:bg-slate-50 flex items-center justify-center transition-colors cursor-pointer"><Sun size={18} /></div>
                            <div className="w-8 h-8 rounded-full hover:bg-slate-50 flex items-center justify-center transition-colors cursor-pointer"><Bell size={18} /></div>
                        </div>
                    </div>
                </header>

                {/* Dashboard Content */}
                <div className="flex-1 overflow-y-auto p-8 space-y-6">
                    {/* Filters Bar */}
                    <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                        <div className="flex items-center gap-6 text-xs">
                            <div className="flex items-center gap-2">
                                <Calendar size={14} className="text-slate-400" />
                                <span className="font-bold text-slate-500">Período:</span>
                                <select
                                    className="bg-slate-50 border border-slate-200 rounded-md px-2 py-1 outline-none font-medium focus:ring-2 focus:ring-blue-100"
                                    value={periodoSel}
                                    onChange={(e) => setPeriodoSel(e.target.value)}
                                >
                                    {PERIODOS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
                                </select>
                            </div>

                            <div className="flex items-center gap-2">
                                <Users size={14} className="text-slate-400" />
                                <span className="font-bold text-slate-500">Asesor:</span>
                                <select
                                    className="bg-slate-50 border border-slate-200 rounded-md px-2 py-1 outline-none font-medium focus:ring-2 focus:ring-blue-100"
                                    value={asesorSel}
                                    onChange={(e) => setAsesorSel(e.target.value)}
                                >
                                    <option value="todos">Todos los asesores</option>
                                    {callsData.advisors.filter((a: any) => a.name !== 'Plantilla').map((a: any) => <option key={a.name} value={a.name}>{a.name}</option>)}
                                </select>
                            </div>

                            <button
                                onClick={() => {
                                    const dataUrl = process.env.NEXT_PUBLIC_DATA_URL;
                                    if (dataUrl) {
                                        setLoading(true);
                                        fetch(dataUrl)
                                            .then(res => res.json())
                                            .then(data => {
                                                if (data.advisors) setCallsData(data);
                                                setLoading(false);
                                            })
                                            .catch(() => setLoading(false));
                                    }
                                }}
                                className={`flex items-center gap-2 px-3 py-1 rounded-md text-[10px] font-bold transition-all ${loading ? 'opacity-50 cursor-not-allowed bg-slate-100' : 'bg-blue-50 text-blue-600 hover:bg-blue-100'}`}
                                disabled={loading}
                            >
                                <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
                                {loading ? 'ACTUALIZANDO...' : 'REFRESCAR'}
                            </button>
                        </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-4 gap-6">
                        <StatCard label="Llamadas Totales" value={stats.total} change="+11%" trend="up" color="bg-blue-50" />
                        <StatCard label="Contactados" value={stats.contacted} change="-2%" trend="down" color="bg-slate-50" />
                        <StatCard label="Tasa de Éxito" value={`${stats.rate}%`} change="+5%" trend="up" color="bg-blue-50/50" />
                        <StatCard label="Asesores Activos" value={ranking.length} change="Estable" trend="up" color="bg-slate-50/50" />
                    </div>

                    {/* Activity charts */}
                    <div className="grid grid-cols-3 gap-6">
                        <div className="col-span-2 bg-white rounded-3xl p-8 border border-slate-100 shadow-sm">
                            <div className="flex items-center justify-between mb-8">
                                <h3 className="text-sm font-bold">Actividad de Contacto</h3>
                                <div className="flex items-center gap-4 text-[10px] font-bold">
                                    <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-slate-900" /> Contactado</div>
                                    <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-blue-300" /> No Contactado</div>
                                </div>
                            </div>
                            <div className="h-[250px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={ranking.slice(0, 8)}>
                                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94A3B8' }} dy={10} />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94A3B8' }} />
                                        <Tooltip cursor={{ fill: '#F8FAFC' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                                        <Bar dataKey="contacted" fill="#1E293B" radius={[4, 4, 0, 0]} barSize={24} name="Contactados" />
                                        <Bar dataKey="total" fill="#93C5FD" radius={[4, 4, 0, 0]} barSize={24} name="Total Llamadas" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm flex flex-col justify-between">
                            <h3 className="text-sm font-bold mb-4">Distribución</h3>
                            <div className="h-[180px] w-full relative">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={[
                                                { name: 'Contactado', value: stats.contacted },
                                                { name: 'Sin Contacto', value: stats.total - stats.contacted }
                                            ]}
                                            cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value"
                                        >
                                            <Cell fill="#1E293B" />
                                            <Cell fill="#E2E8F0" />
                                        </Pie>
                                        <Tooltip />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="mt-4 space-y-2">
                                <div className="flex items-center justify-between text-xs font-bold">
                                    <span className="text-slate-500">Éxito en contacto</span>
                                    <span>{stats.rate}%</span>
                                </div>
                                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                    <div className="bg-blue-600 h-full transition-all duration-1000" style={{ width: `${stats.rate}%` }} />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Ranking & Detailed Monitoring */}
                    <div className="grid grid-cols-12 gap-6 pb-4">
                        {/* Advisor Ranking */}
                        <div className="col-span-4 bg-white rounded-3xl p-8 border border-slate-100 shadow-sm overflow-hidden min-h-[500px]">
                            <div className="flex items-center gap-2 mb-6 text-blue-600">
                                <Trophy size={18} />
                                <h3 className="text-sm font-bold text-slate-800">Ranking de Asesores</h3>
                            </div>
                            <div className="space-y-4">
                                {ranking.slice(0, 10).map((adv: any, idx) => (
                                    <div key={adv.name} className="flex items-center gap-4 p-3 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer group" onClick={() => setAsesorSel(adv.name)}>
                                        <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-400 group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors">#{idx + 1}</div>
                                        <div className="flex-1">
                                            <p className="text-xs font-bold">{adv.name}</p>
                                            <p className="text-[10px] text-slate-400">{adv.total} llamadas</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xs font-bold text-emerald-600">{Math.round((adv.contacted / adv.total) * 100)}%</p>
                                            <p className="text-[9px] text-slate-400 uppercase tracking-tighter font-bold">EFECTIVIDAD</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Comprehensive Detail Table */}
                        <div className="col-span-8 bg-white rounded-3xl p-8 border border-slate-100 shadow-sm flex flex-col min-h-[500px]">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-sm font-bold">Registro de Actividad Detallada</h3>
                                <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-1 rounded-md font-bold uppercase tracking-wide">
                                    {asesorSel === 'todos' ? 'Vista General' : `Seguimiento: ${asesorSel}`}
                                </span>
                            </div>
                            <div className="flex-1 overflow-x-auto min-h-0">
                                <table className="w-full text-left">
                                    <thead className="sticky top-0 bg-white z-10">
                                        <tr className="text-[10px] font-bold text-slate-400 border-b border-slate-50 uppercase tracking-wider">
                                            <th className="pb-4">Fecha</th>
                                            {asesorSel === 'todos' && <th className="pb-4">Asesora</th>}
                                            <th className="pb-4">Ref. Activo</th>
                                            <th className="pb-4">Cliente</th>
                                            <th className="pb-4">Estado</th>
                                            <th className="pb-4">Observaciones</th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-[11px]">
                                        {allCallsForAdvisor.map((call) => (
                                            <tr key={call.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                                                <td className="py-4 text-slate-500 font-medium whitespace-nowrap">{call.date}</td>
                                                {asesorSel === 'todos' && <td className="py-4 font-bold text-blue-600">{call.advisorName}</td>}
                                                <td className="py-4"><span className="font-bold text-slate-700">{call.ref}</span></td>
                                                <td className="py-4">
                                                    <p className="font-bold">{call.customer}</p>
                                                    <p className="text-[9px] text-slate-400">{call.phone}</p>
                                                </td>
                                                <td className="py-4">
                                                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold shadow-sm ${call.contacted ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                                                        {call.contacted ? 'CONTACTADO' : 'PENDIENTE'}
                                                    </span>
                                                </td>
                                                <td className="py-4 text-slate-500 italic max-w-xs truncate" title={call.obs}>{call.obs}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <div className="mt-4 text-center text-[10px] text-slate-400 bg-slate-50 py-2 rounded-lg">
                                Mostrando {allCallsForAdvisor.length} registros para el período seleccionado.
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}

function NavItem({ icon, label, active = false }: { icon: React.ReactNode, label: string, active?: boolean }) {
    return (
        <div className={`flex items-center gap-3 px-4 py-2.5 rounded-xl cursor-pointer transition-all ${active ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50 hover:pl-5'}`}>
            <div className={active ? 'text-white' : 'text-slate-400 group-hover:text-blue-500'}>{icon}</div>
            <span className="text-xs font-medium">{label}</span>
        </div>
    );
}

function StatCard({ label, value, change, trend, color }: { label: string, value: string | number, change: string, trend: 'up' | 'down', color: string }) {
    return (
        <div className={`${color} rounded-3xl p-6 border border-slate-100 shadow-sm transition-all hover:scale-[1.02] cursor-default`}>
            <p className="text-[10px] font-bold text-slate-500 mb-3 uppercase tracking-wider">{label}</p>
            <div className="flex items-end justify-between">
                <h4 className="text-3xl font-black font-sans tracking-tight text-slate-800">{value}</h4>
                <div className={`flex items-center gap-1 text-[10px] font-bold ${trend === 'up' ? 'text-emerald-500' : 'text-slate-400'}`}>
                    <span className="bg-white/60 px-2 py-0.5 rounded-md shadow-sm">{change}</span>
                </div>
            </div>
        </div>
    );
}
