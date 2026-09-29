import React, { useState } from 'react';
import { Cloud, CheckCircle2, RefreshCw, Plus } from 'lucide-react';
import { StorageProviderItem } from '../types';

interface StorageProvidersViewProps {
  providers: StorageProviderItem[];
  onAddToast?: (type: 'success' | 'warning' | 'info' | 'error', message: string) => void;
}

export const StorageProvidersView: React.FC<StorageProvidersViewProps> = ({
  providers: initialProviders,
  onAddToast,
}) => {
  const [providers] = useState<StorageProviderItem[]>(initialProviders);
  const [testingId, setTestingId] = useState<string | null>(null);

  const handleTestConnection = (id: string, name: string) => {
    setTestingId(id);
    setTimeout(() => {
      setTestingId(null);
      if (onAddToast) {
        onAddToast('success', `Connection to ${name} tested successfully (Latency: 32ms)`);
      }
    }, 1000);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">
            Connected Storage Providers
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Manage multi-cloud object stores, cold vaults, and client synced backends
          </p>
        </div>

        <button
          onClick={() => {
            if (onAddToast) {
              onAddToast('info', 'Storage Provider provisioning modal will open.');
            }
          }}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs sm:text-sm rounded-lg shadow-xs transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Connect Provider</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {providers.map((p) => (
          <div
            key={p.id}
            className="flex flex-col justify-between p-5 bg-white border border-slate-200/80 rounded-xl shadow-xs hover:border-slate-300 transition-all"
          >
            <div>
              <div className="flex items-start justify-between">
                <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                  <Cloud className="w-5 h-5" />
                </div>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-600 border border-emerald-100">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  {p.status}
                </span>
              </div>

              <h3 className="text-base font-bold text-slate-900 mt-4">
                {p.name}
              </h3>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                {p.type} • {p.region}
              </p>

              <div className="mt-5 space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Storage Used:</span>
                  <span className="font-mono font-bold text-slate-800">{p.storageUsed}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Tier Capacity:</span>
                  <span className="text-slate-700">{p.capacity}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500">Avg Roundtrip Latency:</span>
                  <span className="font-mono text-blue-600 font-semibold">{p.latency}</span>
                </div>
              </div>
            </div>

            <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between">
              <button
                onClick={() => handleTestConnection(p.id, p.name)}
                disabled={testingId === p.id}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-blue-600 transition-colors cursor-pointer disabled:opacity-50"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${
                    testingId === p.id ? 'animate-spin text-blue-600' : ''
                  }`}
                />
                <span>{testingId === p.id ? 'Pinging...' : 'Test Connection'}</span>
              </button>

              <span className="text-[11px] text-emerald-600 font-medium flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Synced
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
