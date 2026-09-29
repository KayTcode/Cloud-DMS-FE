import React, { useState } from 'react';
import { Search, UserPlus, Filter } from 'lucide-react';
import { TenantUser } from '@/features/tenants/types';

interface TenantUsersViewProps {
  users: TenantUser[];
  onBackToOverview: () => void;
  onCreateDepartmentUser: () => void;
}

export const TenantUsersView: React.FC<TenantUsersViewProps> = ({
  users,
  onBackToOverview,
  onCreateDepartmentUser,
}) => {
  const [search, setSearch] = useState('');
  const [selectedDept, setSelectedDept] = useState('All');

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      u.role.toLowerCase().includes(search.toLowerCase());
    const matchesDept = selectedDept === 'All' || u.department === selectedDept;
    return matchesSearch && matchesDept;
  });

  return (
    <div className="bg-white rounded-xl border border-slate-200/80 p-5 mt-5 shadow-2xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <h3 className="text-sm font-bold text-slate-900">User Accounts ({users.length.toLocaleString()})</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage provisioned user accounts, access roles, and status for this Tenant.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onBackToOverview}
            className="text-xs text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-lg border border-slate-200 cursor-pointer"
          >
            Back to Overview
          </button>
          <button
            onClick={onCreateDepartmentUser}
            className="text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Tạo tài khoản Department</span>
          </button>
        </div>
      </div>

      {/* Filter toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-3">
        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter users by name, email..."
            className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-2 text-xs">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-slate-500">Department:</span>
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="text-xs border border-slate-200 rounded-lg px-2.5 py-1 bg-white text-slate-700 cursor-pointer"
          >
            <option value="All">All Departments</option>
            <option value="HR">HR</option>
            <option value="Legal">Legal</option>
            <option value="Finance">Finance</option>
            <option value="Engineering">Engineering</option>
            <option value="Operations">Operations</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-y border-slate-100 bg-slate-50/50 text-slate-500 font-semibold">
              <th className="py-2.5 px-3">Name</th>
              <th className="py-2.5 px-3">Department</th>
              <th className="py-2.5 px-3">Role</th>
              <th className="py-2.5 px-3">Status</th>
              <th className="py-2.5 px-3 text-right">Last Active</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredUsers.map((user) => (
              <tr key={user.id} className="hover:bg-slate-50/70 transition-colors">
                <td className="py-3 px-3">
                  <div className="font-semibold text-slate-900">{user.name}</div>
                  <div className="text-[11px] text-slate-400 font-mono">{user.email}</div>
                </td>
                <td className="py-3 px-3 text-slate-600">{user.department}</td>
                <td className="py-3 px-3 text-slate-600">{user.role}</td>
                <td className="py-3 px-3">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    {user.status}
                  </span>
                </td>
                <td className="py-3 px-3 text-right text-slate-400 tabular-nums">
                  {user.lastActive}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
