import React, { useState } from 'react';
import { Search, UserPlus, Filter, Users, Loader2 } from 'lucide-react';
import { TenantUser } from '@/features/tenants/types';
import { useTenantContext } from '@/context/TenantContext';

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
  const { departments, isLoadingData } = useTenantContext();
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
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-slate-900">User Accounts ({users.length.toLocaleString()})</h3>
            {isLoadingData && (
              <span className="inline-flex items-center gap-1 text-[11px] text-blue-600 font-medium">
                <Loader2 className="w-3 h-3 animate-spin" />
                <span>Đang tải...</span>
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Danh sách tài khoản nhân sự và quản trị viên phòng ban được cấp quyền trong Tenant.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onBackToOverview}
            className="text-xs text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-50 transition-colors"
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
          <span className="text-slate-500">Phòng ban:</span>
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="text-xs border border-slate-200 rounded-lg px-2.5 py-1 bg-white text-slate-700 cursor-pointer"
          >
            <option value="All">Tất cả phòng ban ({users.length})</option>
            {departments.map((d) => {
              const count = users.filter((u) => u.department === d.name).length;
              return (
                <option key={d.id} value={d.name}>
                  {d.name} ({count})
                </option>
              );
            })}
          </select>
        </div>
      </div>

      {/* Table or Empty State */}
      {filteredUsers.length === 0 ? (
        <div className="text-center py-12 px-4 rounded-xl bg-slate-50/50 border border-dashed border-slate-200 my-2">
          <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400 mb-2">
            <Users className="w-5 h-5" />
          </div>
          <div className="text-xs font-bold text-slate-700">
            {search || selectedDept !== 'All' ? 'Không tìm thấy người dùng phù hợp' : 'Chưa có tài khoản người dùng nào'}
          </div>
          <p className="text-[11px] text-slate-400 max-w-sm mx-auto mt-1 mb-3">
            {search || selectedDept !== 'All'
              ? 'Hãy thử thay đổi điều kiện lọc hoặc từ khóa tìm kiếm.'
              : 'Hãy nhấn nút "Tạo tài khoản Department" ở góc phải để thêm nhân sự hoặc Department Admin đầu tiên cho tổ chức.'}
          </p>
          <button
            onClick={onCreateDepartmentUser}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Tạo tài khoản ngay</span>
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-y border-slate-100 bg-slate-50/50 text-slate-500 font-semibold">
                <th className="py-2.5 px-3 text-center w-14">STT</th>
                <th className="py-2.5 px-3">Họ và Tên</th>
                <th className="py-2.5 px-3">Phòng ban</th>
                <th className="py-2.5 px-3">Vai trò (Role)</th>
                <th className="py-2.5 px-3">Trạng thái</th>
                <th className="py-2.5 px-3 text-right">Ngày tạo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.map((user, index) => (
                <tr key={user.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3 px-3 text-center font-mono text-slate-500 font-medium text-xs">
                    {index + 1}
                  </td>
                  <td className="py-3 px-3">
                    <span className="font-semibold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer inline-block" title="Thông tin nhân sự">
                      {user.name}
                    </span>
                    <div className="text-[11px] text-slate-400 font-mono">{user.email}</div>
                  </td>
                  <td className="py-3 px-3">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                      {user.department}
                    </span>
                  </td>
                  <td className="py-3 px-3 font-mono text-[11px] text-slate-600">{user.role}</td>
                  <td className="py-3 px-3">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border ${
                        user.status === 'Active'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-rose-50 text-rose-700 border-rose-200'
                      }`}
                    >
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
      )}
    </div>
  );
};
