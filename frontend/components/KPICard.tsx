import React from 'react';

interface KPICardProps {
  title: string;
  value: string | number;
  prefix?: string;
  color?: string; // optional color for value text
}

const KPICard: React.FC<KPICardProps> = ({ title, value, prefix = '', color = 'text-slate-900' }) => {
  return (
    <div className="rounded-xl border bg-white p-4 shadow-sm flex flex-col items-start">
      <p className="text-xs uppercase text-slate-500">{title}</p>
      <p className={`text-2xl font-bold ${color}`}>
        {prefix}{value}
      </p>
    </div>
  );
};

export default KPICard;
