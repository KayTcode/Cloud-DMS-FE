import React from 'react';
import { initialEvents } from '../data/mockData';

interface ActivityViewProps {
  onBackToOverview: () => void;
}

export const ActivityView: React.FC<ActivityViewProps> = ({ onBackToOverview }) => {
  return (
    <div className="bg-white rounded-xl border border-slate-200/80 p-5 mt-5 shadow-2xs">
      <div className="flex items-center justify-between pb-4 border-b border-slate-100">
        <div>
          <h3 className="text-sm font-bold text-slate-900">Audit & Security Activity</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Immutable system logs recorded across all tenant nodes.
          </p>
        </div>
        <button
          onClick={onBackToOverview}
          className="text-xs text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-lg border border-slate-200"
        >
          Back to Overview
        </button>
      </div>

      <div className="divide-y divide-slate-100 mt-3">
        {initialEvents.map((evt) => (
          <div key={evt.id} className="py-3 flex items-center justify-between text-xs">
            <div>
              <div className="font-medium text-slate-900">{evt.text}</div>
              <div className="text-[11px] text-slate-400 mt-0.5">{evt.timestamp}</div>
            </div>
            <span className="text-slate-500 text-[11px] tabular-nums font-mono">{evt.timeAgo}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
