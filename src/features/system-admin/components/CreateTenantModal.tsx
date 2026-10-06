import React, { useState } from 'react';
import { X, Building2, Lock, Mail, User, Phone, ShieldCheck } from 'lucide-react';
import { CreateAdminUserPayload, PlanType } from '../types';

interface CreateTenantModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (payload: CreateAdminUserPayload, plan: PlanType) => Promise<void>;
}

export const CreateTenantModal: React.FC<CreateTenantModalProps> = ({
  isOpen,
  onClose,
  onCreate,
}) => {
  const [tenantName, setTenantName] = useState('');
  const [plan, setPlan] = useState<PlanType>('Enterprise');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !firstName.trim() || !lastName.trim() || !tenantName.trim()) return;

    setIsSubmitting(true);
    try {
      await onCreate(
        {
          tenantName: tenantName.trim(),
          plan: plan,
          email: email.trim(),
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          phoneNumber: phoneNumber.trim() || undefined,
        },
        plan
      );

      // Reset
      setTenantName('');
      setFirstName('');
      setLastName('');
      setEmail('');
      setPhoneNumber('');
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Provision New Tenant Account
              </h3>
              <p className="text-xs text-slate-500">
                Create tenant organization and lead administrator account
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Organization Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Tenant Organization Name *
            </label>
            <input
              type="text"
              required
              value={tenantName}
              onChange={(e) => setTenantName(e.target.value)}
              placeholder="e.g. Acme Corporation, FPT Software"
              className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>

          <div className="border-t border-slate-100 pt-3">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-blue-600" />
                Lead Administrator Info
              </h4>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                <ShieldCheck className="w-3 h-3 text-indigo-600" />
                Role: Tenant Admin
              </span>
            </div>

            {/* First & Last Name */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  First Name *
                </label>
                <input
                  type="text"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="John"
                  className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Last Name *
                </label>
                <input
                  type="text"
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Doe"
                  className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Email & Phone */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Admin Email *
              </label>
              <div className="relative">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@tenant.com"
                  className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Phone Number
              </label>
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="+84 987 654 321"
                className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Email Invitation Notice */}
          <div className="p-3.5 bg-blue-50/80 border border-blue-200/90 rounded-xl flex items-start gap-3">
            <div className="p-2 bg-blue-100/80 text-blue-700 rounded-lg shrink-0 mt-0.5">
              <Mail className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-blue-950">
                Gửi lời mời & Thiết lập mật khẩu qua Gmail
              </h4>
              <p className="text-[11px] text-blue-800/80 leading-relaxed mt-0.5">
                Quản trị viên không cần nhập mật khẩu ban đầu. Hệ thống sẽ tự động gửi email chứa đường dẫn kích hoạt đến <strong>{email || 'địa chỉ email trên'}</strong> để Tenant Admin tự kích hoạt và thiết lập mật khẩu bảo mật.
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs hover:shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/30 cursor-pointer disabled:opacity-50"
            >
              <Mail className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Đang tạo & Gửi email...' : 'Khởi tạo Tenant & Gửi thư mời'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
