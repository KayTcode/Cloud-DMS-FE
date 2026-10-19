import React, { useState } from 'react';
import { TenantInfo } from '@/features/tenants/types';

interface TenantSettingsViewProps {
  tenant: TenantInfo;
  onUpdateTenant: (updated: Partial<TenantInfo>) => void;
  onBackToOverview: () => void;
}

export const TenantSettingsView: React.FC<TenantSettingsViewProps> = ({
  tenant,
  onUpdateTenant,
  onBackToOverview,
}) => {
  const [email, setEmail] = useState(tenant.contactEmail);
  const [limit, setLimit] = useState(tenant.licenseLimit);
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateTenant({ contactEmail: email, licenseLimit: limit });
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200/80 p-5 mt-5 shadow-2xs max-w-2xl">
      <div className="flex items-center justify-between pb-4 border-b border-slate-100">
        <div>
          <h3 className="text-sm font-bold text-slate-900">Tenant Configuration</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure system parameters, administrative contacts, and seat limits.
          </p>
        </div>
        <button
          onClick={onBackToOverview}
          className="text-xs text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-lg border border-slate-200 cursor-pointer"
        >
          Back to Overview
        </button>
      </div>

      <form onSubmit={handleSave} className="space-y-4 mt-5">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Primary Contact Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            License Seats Cap
          </label>
          <input
            type="number"
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Tenant Unique Identifier (UUID)
          </label>
          <input
            type="text"
            readOnly
            value={tenant.id}
            className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-500 font-mono cursor-not-allowed"
          />
        </div>

        <div className="pt-2 flex items-center gap-3">
          <button
            type="submit"
            className="text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors shadow-2xs cursor-pointer"
          >
            Save Changes
          </button>
          {saved && (
            <span className="text-xs text-emerald-600 font-semibold">
              ✓ Settings saved successfully
            </span>
          )}
        </div>
      </form>
    </div>
  );
};
