import React, { useState } from 'react';
import { Shield, Database, Save, Check } from 'lucide-react';

interface SettingsViewProps {
  onAddToast?: (type: 'success' | 'warning' | 'info' | 'error', message: string) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ onAddToast }) => {
  const [enforce2FA, setEnforce2FA] = useState(true);
  const [autoBackup, setAutoBackup] = useState(true);
  const [retentionDays, setRetentionDays] = useState(90);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    if (onAddToast) {
      onAddToast('success', 'System Admin settings saved successfully!');
    }
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-5 max-w-4xl">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">
          SysAdmin Portal Settings
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Configure security baseline policies, global storage quotas, and platform triggers
        </p>
      </div>

      <div className="p-6 bg-white border border-slate-200/80 rounded-xl shadow-xs space-y-6">
        {/* Security Baseline */}
        <div>
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Shield className="w-4 h-4 text-blue-600" />
            Security & Authentication Baseline
          </h3>
          <div className="mt-3 space-y-3">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={enforce2FA}
                onChange={(e) => setEnforce2FA(e.target.checked)}
                className="mt-1 rounded border-slate-300 text-blue-600 focus:ring-blue-500/20 cursor-pointer"
              />
              <div>
                <span className="text-xs font-semibold text-slate-800 block">
                  Mandatory Multi-Factor Authentication (MFA/2FA)
                </span>
                <span className="text-xs text-slate-400">
                  Require hardware keys or TOTP authenticators for all tenant administrators
                </span>
              </div>
            </label>
          </div>
        </div>

        <div className="border-t border-slate-100" />

        {/* Backup & Snapshot Cadence */}
        <div>
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Database className="w-4 h-4 text-amber-600" />
            Cold Vault & Backup Policies
          </h3>
          <div className="mt-3 space-y-4">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={autoBackup}
                onChange={(e) => setAutoBackup(e.target.checked)}
                className="mt-1 rounded border-slate-300 text-blue-600 focus:ring-blue-500/20 cursor-pointer"
              />
              <div>
                <span className="text-xs font-semibold text-slate-800 block">
                  Automated Daily Geographic Snapshots
                </span>
                <span className="text-xs text-slate-400">
                  Replicate encrypted tenant state to off-site AWS Glacier & S3 vaults
                </span>
              </div>
            </label>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Audit Log Retention Window (Days)
              </label>
              <input
                type="number"
                value={retentionDays}
                onChange={(e) => setRetentionDays(Number(e.target.value))}
                className="w-48 px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-mono"
              />
            </div>
          </div>
        </div>

        <div className="border-t border-slate-100 pt-3 flex items-center justify-between">
          <span className="text-xs text-slate-400">
            Current build: CloudDMS-SysAdmin v4.8.2-prod
          </span>
          <button
            onClick={handleSave}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-lg shadow-xs transition-colors cursor-pointer"
          >
            {saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            <span>{saved ? 'Changes Saved' : 'Save Configurations'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
