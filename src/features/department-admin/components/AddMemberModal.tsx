import React, { useState } from 'react';
import { X, UserPlus } from 'lucide-react';
import { DepartmentInfo, DepartmentMember } from '../types';

interface AddMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  department: DepartmentInfo;
  onAdd: (newMember: Omit<DepartmentMember, 'id' | 'lastActive' | 'status' | 'fileCount' | 'usedSpaceGB'>) => void;
}

export const AddMemberModal: React.FC<AddMemberModalProps> = ({
  isOpen,
  onClose,
  department,
  onAdd,
}) => {
  if (!isOpen) return null;

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('Software Engineer');
  const [subTeam, setSubTeam] = useState('Core Services');
  const [quota, setQuota] = useState(30);

  const colors = [
    'bg-blue-600',
    'bg-emerald-600',
    'bg-purple-600',
    'bg-amber-600',
    'bg-rose-600',
    'bg-indigo-600',
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;

    const words = name.trim().split(' ');
    const initials = words.length > 1
      ? `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase()
      : name.slice(0, 2).toUpperCase();

    const randomColor = colors[Math.floor(Math.random() * colors.length)];

    onAdd({
      name: name.trim(),
      email: email.trim(),
      role,
      subTeam,
      allocatedQuotaGB: quota,
      avatarInitials: initials,
      avatarColor: randomColor,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <UserPlus className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">Thêm nhân sự vào phòng</h3>
              <p className="text-xs text-slate-500">Phòng ban: {department.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Họ và tên nhân viên *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="VD: Nguyễn Văn A"
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Email công ty (LDAP/SSO) *
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ten.nguyen@acmecorp.internal"
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Chức vụ
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full px-2.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="Software Engineer">Software Engineer</option>
                <option value="Frontend Engineer">Frontend Engineer</option>
                <option value="Backend Engineer">Backend Engineer</option>
                <option value="DevOps Specialist">DevOps Specialist</option>
                <option value="QA / QC Engineer">QA / QC Engineer</option>
                <option value="AI / ML Engineer">AI / ML Engineer</option>
                <option value="UI/UX Designer">UI/UX Designer</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Sub-team / Bộ phận
              </label>
              <select
                value={subTeam}
                onChange={(e) => setSubTeam(e.target.value)}
                className="w-full px-2.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="Core Services">Core Services</option>
                <option value="Web Applications">Web Applications</option>
                <option value="Mobile Platform">Mobile Platform</option>
                <option value="Cloud & Infrastructure">Cloud & Infra</option>
                <option value="Quality Assurance">Quality Assurance</option>
                <option value="AI & Data Intelligence">AI & Data</option>
              </select>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <label className="font-semibold text-slate-700">Hạn mức cấp ban đầu:</label>
              <span className="font-bold text-blue-600 font-mono">{quota} GB</span>
            </div>
            <input
              type="range"
              min={10}
              max={80}
              step={5}
              value={quota}
              onChange={(e) => setQuota(Number(e.target.value))}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
            <div className="flex justify-between text-[10px] text-slate-400 mt-1">
              <span>Cơ bản: 10 GB</span>
              <span>Tiêu chuẩn: 30 GB</span>
              <span>Cao: 80 GB</span>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              Huỷ
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold rounded-lg text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-colors cursor-pointer"
            >
              Thêm nhân viên
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
