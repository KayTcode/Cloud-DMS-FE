import React from 'react';

interface MetricCardProps {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ReactNode;
  iconBgColor: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  iconBgColor,
}) => {
  return (
    <div className="flex flex-col justify-between p-5 bg-white border border-slate-200/80 rounded-xl shadow-xs hover:border-slate-300 transition-all">
      <div className="flex items-start justify-between">
        <span className="text-xs font-semibold text-slate-500 tracking-tight">
          {title}
        </span>
        <div className={`p-2 rounded-lg ${iconBgColor}`}>
          {icon}
        </div>
      </div>

      <div className="mt-4">
        <div className="text-2xl font-bold tracking-tight text-slate-900">
          {value}
        </div>
        <p className="mt-1 text-xs text-slate-400 font-normal">
          {subtitle}
        </p>
      </div>
    </div>
  );
};
