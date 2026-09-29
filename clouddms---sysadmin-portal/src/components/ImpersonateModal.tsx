import React, { useState } from 'react';
import { X, UserCheck, AlertTriangle } from 'lucide-react';
import { TenantInfo } from '../types';

interface ImpersonateModalProps {
  isOpen: boolean;
  onClose: () => void;
  tenant: TenantInfo;
  onConfirm: () => void;
}

export const ImpersonateModal: React.FC<ImpersonateModalProps> = ({
  isOpen,
  onClose,
  tenant,
  onConfirm,
}) => {
  const [reason, setReason] = useState('Resolving reported ticket #INC-8941');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-blue-600" />
            <h3 className="font-bold text-slate-900 text-sm">
              Impersonate Tenant Owner
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="flex items-start gap-3 p-3.5 rounded-xl bg-amber-50 border border-amber-200/80 text-amber-900 text-xs">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold">Security & Audit Notice</div>
              <div className="mt-0.5 text-amber-800">
                You will access the tenant console as <span className="font-mono font-semibold">{tenant.contactEmail}</span>. All actions will be logged in the immutable sysadmin audit trail.
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Impersonation Justification / Ticket ID
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Enter support ticket number or reason..."
              className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs"
          >
            Start Impersonation Session
          </button>
        </div>
      </div>
    </div>
  );
};
