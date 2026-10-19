import React from 'react';
import { X, CheckCircle2, AlertCircle, Info } from 'lucide-react';

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onClear: () => void;
}

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({
  isOpen,
  onClose,
  onClear,
}) => {
  if (!isOpen) return null;

  const notifications = [
    {
      id: 'notif-1',
      title: 'Database Backup Completed',
      desc: 'Automated nightly snapshot for Acme Corporation finished in 42s.',
      time: '12m ago',
      type: 'success',
    },
    {
      id: 'notif-2',
      title: 'License Threshold Alert',
      desc: 'Acme Corporation reached 80% of seat capacity (1,200/1,500).',
      time: '1h ago',
      type: 'warning',
    },
    {
      id: 'notif-3',
      title: 'Cluster Health Nominal',
      desc: 'All 8 storage nodes in us-east-1 passed latency diagnostics.',
      time: '3h ago',
      type: 'info',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div
        className="absolute inset-0 bg-slate-900/20 backdrop-blur-2xs"
        onClick={onClose}
      />
      <div className="absolute inset-y-0 right-0 max-w-sm w-full bg-white shadow-2xl border-l border-slate-200 flex flex-col">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-slate-900 text-sm">System Notifications</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={onClear}
              className="text-xs text-blue-600 hover:underline font-medium cursor-pointer"
            >
              Mark all read
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {notifications.map((n) => (
            <div
              key={n.id}
              className="p-3 rounded-xl border border-slate-100 bg-slate-50/60 hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-start gap-2.5">
                {n.type === 'success' && (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                )}
                {n.type === 'warning' && (
                  <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                )}
                {n.type === 'info' && (
                  <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-slate-900">{n.title}</div>
                  <div className="text-[11px] text-slate-600 mt-0.5">{n.desc}</div>
                  <div className="text-[10px] text-slate-400 mt-1.5 tabular-nums font-mono">
                    {n.time}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
