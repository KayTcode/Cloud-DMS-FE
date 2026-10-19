import React from 'react';
import { SystemActivityItem } from '../types';

interface RecentActivitiesCardProps {
  activities: SystemActivityItem[];
  onViewAllLogs?: () => void;
}

export const RecentActivitiesCard: React.FC<RecentActivitiesCardProps> = ({
  activities,
  onViewAllLogs,
}) => {
  return (
    <div className="p-5 bg-white border border-slate-200/80 rounded-xl shadow-xs">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
          Recent System Activities
        </h3>
        {onViewAllLogs && (
          <button
            onClick={onViewAllLogs}
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors cursor-pointer"
          >
            Audit log
          </button>
        )}
      </div>

      <div className="divide-y divide-slate-100">
        {activities.map((item) => (
          <div key={item.id} className="py-3 first:pt-1 last:pb-1">
            <p className="text-xs font-semibold text-slate-900 leading-snug">
              {item.title}
            </p>
            <div className="flex items-center gap-1.5 mt-1 text-[11px] text-slate-400">
              <span>{item.timeAgo}</span>
              <span>•</span>
              <span className="font-mono text-blue-600 font-medium">
                {item.actor}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
