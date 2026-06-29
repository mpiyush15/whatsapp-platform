import React from 'react';

interface KPICardProps {
  title: string;
  value: string | number;
  trend?: 'up' | 'down';
  subtitle?: string;
}

export const KPICard: React.FC<KPICardProps> = ({ title, value, trend, subtitle }) => {
  const trendIcon = trend === 'up' ? '▲' : trend === 'down' ? '▼' : '';
  const trendColor = trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : '';

  return (
    <div className="rounded-xl border bg-white p-4 shadow-sm flex flex-col items-start">
      <p className="text-xs uppercase text-slate-500">{title}</p>
      <p className="text-2xl font-bold flex items-center gap-1">
        {value}
        {trend && <span className={`${trendColor} text-sm`}>{trendIcon}</span>}
      </p>
      {subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}
    </div>
  );
};
