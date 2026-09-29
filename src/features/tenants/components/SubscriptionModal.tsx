import React from 'react';
import { X, Check, Shield } from 'lucide-react';
import { TenantInfo } from '@/features/tenants/types';

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  tenant: TenantInfo;
}

export const SubscriptionModal: React.FC<SubscriptionModalProps> = ({
  isOpen,
  onClose,
  tenant,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-600" />
            <h3 className="font-bold text-slate-900 text-sm">
              Manage Tenant Subscription
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-100">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider bg-white px-2 py-0.5 rounded border border-blue-200">
                  {tenant.plan}
                </span>
                <div className="text-xl font-bold text-slate-900 mt-2">$4,200 / month</div>
                <div className="text-xs text-slate-500">Renews on Jan 12, 2027 • Billed annually</div>
              </div>
              <div className="text-right text-xs">
                <span className="inline-block px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                  Active
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-2 text-xs">
            <div className="font-semibold text-slate-900">Entitlements Included:</div>
            <div className="flex items-center gap-2 text-slate-600">
              <Check className="w-4 h-4 text-emerald-600" />
              <span>Up to 1,500 active user seats (Currently using 1,200)</span>
            </div>
            <div className="flex items-center gap-2 text-slate-600">
              <Check className="w-4 h-4 text-emerald-600" />
              <span>5.0 TB high-performance NVMe storage pool</span>
            </div>
            <div className="flex items-center gap-2 text-slate-600">
              <Check className="w-4 h-4 text-emerald-600" />
              <span>99.99% uptime SLA with 24/7 dedicated support engineer</span>
            </div>
            <div className="flex items-center gap-2 text-slate-600">
              <Check className="w-4 h-4 text-emerald-600" />
              <span>Custom KMS encryption keys & HIPAA / SOC2 compliance</span>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 cursor-pointer"
          >
            Close
          </button>
          <button
            onClick={() => {
              alert('Redirecting to stripe / invoice portal...');
              onClose();
            }}
            className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs cursor-pointer"
          >
            Upgrade Plan / Add Seats
          </button>
        </div>
      </div>
    </div>
  );
};
