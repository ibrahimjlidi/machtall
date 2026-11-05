import React from 'react';
import {
  Area, AreaChart, Bar, CartesianGrid, Cell, ComposedChart, Line,
  Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { ChevronDown, Leaf } from 'lucide-react';

const chartTooltip = { contentStyle: { borderRadius: 12, border: '1px solid #e8eee8', fontFamily: 'Cairo', fontSize: 12 } };

function Empty({ text }) {
  return <div className="flex flex-col items-center justify-center py-14 text-center text-slate-400"><Leaf size={30} className="mb-2 text-green-300" /><p className="text-sm">{text}</p></div>;
}

export default function DashboardCharts({
  flowData,
  catData,
  salesData,
  colors,
  t,
  currency,
  showStockFlow,
  showCategoryValue,
  showSalesTrend,
}) {
  return <>
    {showStockFlow && <div className="grid gap-4 xl:grid-cols-5">
      <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-card dark:border-slate-700 dark:bg-slate-800 xl:col-span-3">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2"><div><h2 className="font-extrabold text-slate-800 dark:text-white">{t('stockFlow')}</h2><p className="text-xs text-slate-400">{t('overviewPeriod')}</p></div><div className="flex gap-4 text-xs"><span className="flex items-center gap-2 text-slate-500"><i className="h-2 w-2 rounded-full bg-forest" />{t('stockIn')}</span><span className="flex items-center gap-2 text-slate-500"><i className="h-2 w-2 rounded-full bg-amber-400" />{t('stockOut')}</span></div></div>
        <ResponsiveContainer width="100%" height={235}><AreaChart data={flowData} margin={{ left: -18, right: 6, top: 8 }}><defs><linearGradient id="inGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#2E7D32" stopOpacity={0.2} /><stop offset="95%" stopColor="#2E7D32" stopOpacity={0} /></linearGradient><linearGradient id="outGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#F9A825" stopOpacity={0.2} /><stop offset="95%" stopColor="#F9A825" stopOpacity={0} /></linearGradient></defs><CartesianGrid stroke="#eef2ed" strokeDasharray="4 4" vertical={false} /><XAxis dataKey="day" axisLine={false} tickLine={false} /><YAxis axisLine={false} tickLine={false} /><Tooltip {...chartTooltip} /><Area type="monotone" dataKey="inbound" name={t('stockIn')} stroke="#2E7D32" fill="url(#inGrad)" strokeWidth={2.5} /><Area type="monotone" dataKey="outbound" name={t('stockOut')} stroke="#F9A825" fill="url(#outGrad)" strokeWidth={2.5} /></AreaChart></ResponsiveContainer>
      </section>
    </div>}
    {showCategoryValue && <div className="grid gap-4 xl:grid-cols-5">
      <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-card dark:border-slate-700 dark:bg-slate-800 xl:col-span-2">
        <div className="mb-4"><h2 className="font-extrabold text-slate-800 dark:text-white">{t('categoryValue')}</h2><p className="text-xs text-slate-400">{t('tnd')}</p></div>
        {catData.length ? <div className="flex items-center gap-1"><ResponsiveContainer width="55%" height={220}><PieChart><Pie data={catData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={83} paddingAngle={3} stroke="none">{catData.map((item, index) => <Cell key={item.name} fill={colors[index % colors.length]} />)}</Pie><Tooltip formatter={(value) => currency(value)} {...chartTooltip} /></PieChart></ResponsiveContainer><div className="min-w-0 flex-1 space-y-2">{catData.slice(0, 5).map((item, index) => <div key={item.name} className="flex items-center justify-between gap-2 text-[11px]"><span className="flex min-w-0 items-center gap-2 text-slate-500"><i className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: colors[index] }} /><span className="truncate">{item.name}</span></span><b className="text-slate-700 dark:text-slate-200">{Math.round(item.value).toLocaleString('fr-TN')}</b></div>)}</div></div> : <Empty text={t('noResults')} />}
      </section>
    </div>}
    {showSalesTrend && <div className="grid gap-4 xl:grid-cols-5">
      <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-card dark:border-slate-700 dark:bg-slate-800 xl:col-span-3">
        <div className="mb-3 flex items-center justify-between"><div><h2 className="font-extrabold text-slate-800 dark:text-white">{t('salesTrend')}</h2><p className="text-xs text-slate-400">TND · 2026</p></div><button className="rounded-lg bg-leaf px-3 py-1.5 text-xs font-bold text-forest">{t('overviewPeriod')} <ChevronDown size={13} className="inline" /></button></div>
        <ResponsiveContainer width="100%" height={190}><ComposedChart data={salesData} margin={{ left: -18, right: 6, top: 8 }}><CartesianGrid stroke="#eef2ed" strokeDasharray="4 4" vertical={false} /><XAxis dataKey="month" axisLine={false} tickLine={false} /><YAxis axisLine={false} tickLine={false} /><Tooltip {...chartTooltip} formatter={(value) => currency(value)} /><Bar dataKey="sales" name={t('monthlyRevenue')} fill="#dceddc" radius={[5, 5, 0, 0]} /><Line type="monotone" dataKey="sales" stroke="#2E7D32" strokeWidth={2.5} dot={false} /></ComposedChart></ResponsiveContainer>
      </section>
    </div>}
  </>;
}
