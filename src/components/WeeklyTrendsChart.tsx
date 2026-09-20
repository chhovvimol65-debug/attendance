import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  AreaChart,
  Area,
  Legend
} from 'recharts';
import { 
  TrendingUp, 
  LogIn, 
  LogOut, 
  Calendar, 
  Sparkles, 
  BarChart3, 
  Activity,
  Layers
} from 'lucide-react';
import { AttendanceRecord, Language } from '../types';
import { translations } from '../i18n/translations';

interface WeeklyTrendsChartProps {
  records: AttendanceRecord[];
  language: Language;
  departmentScope?: string | null;
}

interface DayTrendData {
  dateStr: string;
  dayLabel: string;
  fullDateLabel: string;
  checkIn: number;
  checkOut: number;
  total: number;
  isToday: boolean;
}

export const WeeklyTrendsChart: React.FC<WeeklyTrendsChartProps> = ({
  records,
  language,
  departmentScope
}) => {
  const t = translations[language];
  const [chartType, setChartType] = useState<'bar' | 'area'>('bar');

  // Khmer Day Names
  const khmerDayNames = ['អាទិត្យ', 'ចន្ទ', 'អង្គារ', 'ពុធ', 'ព្រហស្បតិ៍', 'សុក្រ', 'សៅរ៍'];
  const khmerShortDays = ['អាទិត្យ', 'ចន្ទ', 'អង្គារ', 'ពុធ', 'ព្រហ', 'សុក្រ', 'សៅរ៍'];

  // Calculate the 7-day trend dataset
  const trendData: DayTrendData[] = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const days: DayTrendData[] = [];

    // Loop through last 7 days (day -6 down to day 0 / today)
    for (let i = 6; i >= 0; i--) {
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() - i);
      const dateStr = targetDate.toISOString().split('T')[0];
      const isToday = i === 0;

      // Filter records for this day
      const dayRecords = records.filter(r => r.date === dateStr);
      const checkInCount = dayRecords.filter(r => r.type === 'check_in').length;
      const checkOutCount = dayRecords.filter(r => r.type === 'check_out').length;

      // Localized Day labels
      const dayOfWeekIdx = targetDate.getDay();
      const monthNum = targetDate.getMonth() + 1;
      const dayNum = targetDate.getDate();

      let dayLabel = '';
      let fullDateLabel = '';

      if (language === 'km') {
        const shortKhmer = khmerShortDays[dayOfWeekIdx];
        dayLabel = isToday ? 'ថ្ងៃនេះ' : `${shortKhmer} ${dayNum}`;
        fullDateLabel = `ថ្ងៃ${khmerDayNames[dayOfWeekIdx]} ទី${dayNum}/${monthNum}/${targetDate.getFullYear()}`;
      } else {
        const shortEn = targetDate.toLocaleDateString('en-US', { weekday: 'short' });
        dayLabel = isToday ? 'Today' : `${shortEn} ${dayNum}`;
        fullDateLabel = targetDate.toLocaleDateString('en-US', { 
          weekday: 'long', 
          month: 'short', 
          day: 'numeric', 
          year: 'numeric' 
        });
      }

      days.push({
        dateStr,
        dayLabel,
        fullDateLabel,
        checkIn: checkInCount,
        checkOut: checkOutCount,
        total: checkInCount + checkOutCount,
        isToday
      });
    }

    return days;
  }, [records, language]);

  // Aggregate statistics
  const stats = useMemo(() => {
    const totalCheckIns = trendData.reduce((acc, d) => acc + d.checkIn, 0);
    const totalCheckOuts = trendData.reduce((acc, d) => acc + d.checkOut, 0);
    const totalScans = totalCheckIns + totalCheckOuts;
    const avgDaily = trendData.length > 0 ? (totalScans / trendData.length).toFixed(1) : '0';

    // Find peak activity day
    let peakDay = trendData[0];
    trendData.forEach(d => {
      if (d.total > (peakDay?.total || 0)) {
        peakDay = d;
      }
    });

    return {
      totalCheckIns,
      totalCheckOuts,
      totalScans,
      avgDaily,
      peakDay
    };
  }, [trendData]);

  // Custom Chart Tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data: DayTrendData = payload[0].payload;
      const checkInVal = data.checkIn;
      const checkOutVal = data.checkOut;
      const totalVal = data.total;

      return (
        <div className="bg-slate-900/95 text-white backdrop-blur-md px-4 py-3 rounded-2xl shadow-xl border border-slate-700/80 text-xs space-y-2 min-w-[200px] pointer-events-none">
          <div className="flex items-center justify-between border-b border-slate-700/60 pb-2">
            <span className="font-bold text-slate-100 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-indigo-400" />
              <span>{data.fullDateLabel}</span>
            </span>
            {data.isToday && (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-500/30 text-indigo-300 border border-indigo-500/40">
                {language === 'km' ? 'ថ្ងៃនេះ' : 'Today'}
              </span>
            )}
          </div>

          <div className="space-y-1.5 pt-0.5">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-slate-300">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-xs shadow-emerald-500/50" />
                <span>{t.checkIns}:</span>
              </span>
              <span className="font-bold font-mono text-emerald-400 text-sm">{checkInVal}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-slate-300">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 shadow-xs shadow-indigo-500/50" />
                <span>{t.checkOuts}:</span>
              </span>
              <span className="font-bold font-mono text-indigo-300 text-sm">{checkOutVal}</span>
            </div>

            <div className="pt-1.5 border-t border-slate-700/60 flex items-center justify-between text-slate-400 font-medium">
              <span>{language === 'km' ? 'សរុបសកម្មភាព:' : 'Total Scans:'}</span>
              <span className="font-bold text-white font-mono">{totalVal}</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div 
      id="weekly-attendance-trends-card"
      className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200 shadow-sm p-5 sm:p-6 space-y-5 transition-all"
    >
      
      {/* 1. Card Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center shrink-0">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                  {t.weeklyTrends}
                </h2>
                {departmentScope && (
                  <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                    {departmentScope}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500">
                {t.weeklyTrendsSubtitle}
              </p>
            </div>
          </div>
        </div>

        {/* Chart Style Toggle */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-medium border border-slate-200/80">
            <button
              id="toggle-chart-bar"
              onClick={() => setChartType('bar')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg transition-all ${
                chartType === 'bar'
                  ? 'bg-white text-indigo-700 font-bold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>{t.chartStyleBar}</span>
            </button>
            <button
              id="toggle-chart-area"
              onClick={() => setChartType('area')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg transition-all ${
                chartType === 'area'
                  ? 'bg-white text-indigo-700 font-bold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>{t.chartStyleArea}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Micro KPI Badges */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        
        {/* Total Check-Ins */}
        <div className="bg-slate-50/80 rounded-xl p-3 border border-slate-100 flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-[11px] font-medium text-slate-500 flex items-center gap-1">
              <LogIn className="w-3 h-3 text-emerald-600" />
              {t.checkIns}
            </span>
            <p className="text-lg sm:text-xl font-bold text-emerald-700 font-mono">
              {stats.totalCheckIns}
            </p>
          </div>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-emerald-100/70 text-emerald-800">
            7d
          </span>
        </div>

        {/* Total Check-Outs */}
        <div className="bg-slate-50/80 rounded-xl p-3 border border-slate-100 flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-[11px] font-medium text-slate-500 flex items-center gap-1">
              <LogOut className="w-3 h-3 text-indigo-600" />
              {t.checkOuts}
            </span>
            <p className="text-lg sm:text-xl font-bold text-indigo-700 font-mono">
              {stats.totalCheckOuts}
            </p>
          </div>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-indigo-100/70 text-indigo-800">
            7d
          </span>
        </div>

        {/* Peak Activity Day */}
        <div className="bg-slate-50/80 rounded-xl p-3 border border-slate-100 flex items-center justify-between">
          <div className="space-y-0.5 min-w-0">
            <span className="text-[11px] font-medium text-slate-500 flex items-center gap-1 truncate">
              <Sparkles className="w-3 h-3 text-amber-500" />
              {t.peakDay}
            </span>
            <p className="text-xs sm:text-sm font-bold text-slate-900 truncate">
              {stats.peakDay?.dayLabel || '-'}
            </p>
          </div>
          <span className="text-[11px] font-bold font-mono px-2 py-0.5 rounded-md bg-amber-100/70 text-amber-800 shrink-0">
            {stats.peakDay?.total || 0}
          </span>
        </div>

        {/* Average Scans / Day */}
        <div className="bg-slate-50/80 rounded-xl p-3 border border-slate-100 flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-[11px] font-medium text-slate-500 flex items-center gap-1">
              <Layers className="w-3 h-3 text-slate-500" />
              {t.avgDaily}
            </span>
            <p className="text-lg sm:text-xl font-bold text-slate-800 font-mono">
              {stats.avgDaily}
            </p>
          </div>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-200/70 text-slate-700">
            /day
          </span>
        </div>

      </div>

      {/* 3. Recharts Visual Container */}
      <div className="w-full pt-1" style={{ height: 280 }}>
        <ResponsiveContainer width="100%" height="100%">
          {chartType === 'bar' ? (
            <BarChart
              data={trendData}
              margin={{ top: 15, right: 10, left: -20, bottom: 5 }}
            >
              <defs>
                <linearGradient id="checkInBarGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={1} />
                  <stop offset="100%" stopColor="#059669" stopOpacity={0.85} />
                </linearGradient>
                <linearGradient id="checkOutBarGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6366f1" stopOpacity={1} />
                  <stop offset="100%" stopColor="#4f46e5" stopOpacity={0.85} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis 
                dataKey="dayLabel" 
                tickLine={false} 
                axisLine={{ stroke: '#e2e8f0' }}
                tick={{ fill: '#64748b', fontSize: 11, fontWeight: 500 }}
              />
              <YAxis 
                allowDecimals={false} 
                tickLine={false} 
                axisLine={false}
                tick={{ fill: '#94a3b8', fontSize: 11 }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                verticalAlign="top" 
                align="right" 
                iconType="circle"
                wrapperStyle={{ paddingBottom: '12px', fontSize: '12px', fontWeight: 600 }}
                formatter={(value) => {
                  return value === 'checkIn' ? (
                    <span className="text-emerald-700 font-semibold">{t.checkIns}</span>
                  ) : (
                    <span className="text-indigo-700 font-semibold">{t.checkOuts}</span>
                  );
                }}
              />
              <Bar 
                name="checkIn"
                dataKey="checkIn" 
                fill="url(#checkInBarGrad)" 
                radius={[5, 5, 0, 0]} 
                maxBarSize={32}
              />
              <Bar 
                name="checkOut"
                dataKey="checkOut" 
                fill="url(#checkOutBarGrad)" 
                radius={[5, 5, 0, 0]} 
                maxBarSize={32}
              />
            </BarChart>
          ) : (
            <AreaChart
              data={trendData}
              margin={{ top: 15, right: 10, left: -20, bottom: 5 }}
            >
              <defs>
                <linearGradient id="checkInAreaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="checkOutAreaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis 
                dataKey="dayLabel" 
                tickLine={false} 
                axisLine={{ stroke: '#e2e8f0' }}
                tick={{ fill: '#64748b', fontSize: 11, fontWeight: 500 }}
              />
              <YAxis 
                allowDecimals={false} 
                tickLine={false} 
                axisLine={false}
                tick={{ fill: '#94a3b8', fontSize: 11 }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                verticalAlign="top" 
                align="right" 
                iconType="circle"
                wrapperStyle={{ paddingBottom: '12px', fontSize: '12px', fontWeight: 600 }}
                formatter={(value) => {
                  return value === 'checkIn' ? (
                    <span className="text-emerald-700 font-semibold">{t.checkIns}</span>
                  ) : (
                    <span className="text-indigo-700 font-semibold">{t.checkOuts}</span>
                  );
                }}
              />
              <Area 
                type="monotone" 
                name="checkIn"
                dataKey="checkIn" 
                stroke="#10b981" 
                strokeWidth={2.5}
                fillOpacity={1} 
                fill="url(#checkInAreaGrad)" 
              />
              <Area 
                type="monotone" 
                name="checkOut"
                dataKey="checkOut" 
                stroke="#6366f1" 
                strokeWidth={2.5}
                fillOpacity={1} 
                fill="url(#checkOutAreaGrad)" 
              />
            </AreaChart>
          )}
        </ResponsiveContainer>
      </div>

    </div>
  );
};
