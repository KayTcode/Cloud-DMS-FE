import React from 'react';
import { PlusSquare, Timer, Users } from 'lucide-react';

export const SystemHealthCard: React.FC = () => {
  return (
    <div className="flex flex-col justify-between h-full p-5 bg-white border border-slate-200/80 rounded-xl shadow-xs">
      <div>
        <h3 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
          System Health & Capacity
        </h3>
      </div>

      <div className="mt-5 space-y-4">
        {/* Metric 1: API Gateway Uptime */}
        <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="p-1 rounded text-emerald-600">
              <PlusSquare className="w-4 h-4 stroke-[2.2]" />
            </div>
            <span className="text-xs font-medium text-slate-600">
              API Gateway Uptime
            </span>
          </div>
          <span className="text-xs sm:text-sm font-bold text-emerald-600 tracking-tight">
            99.97%
          </span>
        </div>

        {/* Metric 2: Avg response latency */}
        <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="p-1 rounded text-blue-600">
              <Timer className="w-4 h-4 stroke-[2.2]" />
            </div>
            <span className="text-xs font-medium text-slate-600">
              Avg response latency
            </span>
          </div>
          <span className="text-xs sm:text-sm font-bold text-blue-600 tracking-tight">
            142ms
          </span>
        </div>

        {/* Metric 3: Active Sessions */}
        <div className="flex items-center justify-between pt-0.5">
          <div className="flex items-center gap-2.5">
            <div className="p-1 rounded text-blue-600">
              <Users className="w-4 h-4 stroke-[2.2]" />
            </div>
            <span className="text-xs font-medium text-slate-600">
              Active Sessions
            </span>
          </div>
          <div className="text-xs sm:text-sm tracking-tight">
            <span className="font-bold text-slate-900">312 </span>
            <span className="font-mono text-slate-900 text-xs font-medium">online</span>
          </div>
        </div>
      </div>

      <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
        <span>Global Edge: 12 nodes</span>
        <span className="flex items-center gap-1 text-emerald-600 font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
          Operational
        </span>
      </div>
    </div>
  );
};
