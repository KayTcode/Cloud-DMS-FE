import React from 'react';
import { X, ShieldCheck, ExternalLink } from 'lucide-react';
import { SystemTenant, PlanType } from '../types';

interface TenantDetailsModalProps {
  tenant: SystemTenant | null;
  onClose: () => void;
  onToggleStatus: (id: string) => void;
  onChangePlan: (id: string, newPlan: PlanType) => void;
  onOpenPortal?: (tenant: SystemTenant) => void;
}

export const TenantDetailsModal: React.FC<TenantDetailsModalProps> = ({
  tenant,
  onClose,
  onToggleStatus,
  onChangePlan,
  onOpenPortal,
}) => {
  if (!tenant) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-blue-50 text-blue-600 font-bold text-sm">
              {tenant.name.substring(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">
                  {tenant.name}
                </h3>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                    tenant.status === 'Active'
                      ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                      : 'bg-rose-50 text-rose-500 border border-rose-100'
                  }`}
                >
                  {tenant.status}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono">
                Instance ID: tenant_{tenant.id}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-5">
          {/* Key Specs Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                Plan
              </span>
              <span className="text-sm font-bold text-slate-900 mt-1 block">
                {tenant.plan}
              </span>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                Users
              </span>
              <span className="text-sm font-bold text-slate-900 mt-1 block font-mono">
                {tenant.usersAssigned.toLocaleString()}
              </span>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                Storage
              </span>
              <span className="text-sm font-bold text-slate-900 mt-1 block font-mono">
                {tenant.storageUsed}
              </span>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                Created
              </span>
              <span className="text-sm font-bold text-slate-900 mt-1 block">
                {tenant.createdDate}
              </span>
            </div>
          </div>

          {/* Storage Bar */}
          <div className="p-4 rounded-xl border border-slate-200/80 bg-white">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="font-semibold text-slate-700">Storage Consumption</span>
              <span className="font-mono text-slate-500 font-medium">
                {tenant.storageDisplay}
              </span>
            </div>
            <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600 rounded-full"
                style={{ width: '48%' }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2">
              <span>Encrypted with AES-256 GCM</span>
              <span>Daily Automated Snapshots</span>
            </div>
          </div>

          {/* Technical Info */}
          <div className="space-y-2.5 text-xs text-slate-600">
            <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-400">Admin Email:</span>
              <span className="font-medium text-slate-800">{tenant.adminEmail || 'admin@tenant.com'}</span>
            </div>
            <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-400">Database Region:</span>
              <span className="font-medium text-slate-800">{tenant.region || 'us-east-1 (N. Virginia)'}</span>
            </div>
            <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-400">Schema Isolation:</span>
              <span className="font-mono text-blue-600 font-medium">schema_v2_{tenant.id}</span>
            </div>
            <div className="flex items-center justify-between py-1.5">
              <span className="text-slate-400">Security Baseline:</span>
              <span className="flex items-center gap-1 text-emerald-600 font-medium">
                <ShieldCheck className="w-3.5 h-3.5" /> Enforced 2FA & IP Whitelist
              </span>
            </div>
          </div>

          {/* Quick Actions & Drill-down button */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-4 border-t border-slate-100">
            <div className="flex items-center gap-2">
              <button
                onClick={() => onToggleStatus(tenant.id)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                  tenant.status === 'Active'
                    ? 'bg-rose-50 text-rose-600 hover:bg-rose-100'
                    : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                }`}
              >
                {tenant.status === 'Active' ? 'Suspend Instance' : 'Reactivate Instance'}
              </button>

              {onOpenPortal && (
                <button
                  onClick={() => {
                    onOpenPortal(tenant);
                    onClose();
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Deep Portal</span>
                </button>
              )}
            </div>

            <button
              onClick={onClose}
              className="px-4 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
