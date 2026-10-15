import React, { useState } from 'react';
import {
  FileText,
  Search,
  Download,
  ArrowLeft,
  UploadCloud,
  FileDown,
  UserCheck,
  ShieldCheck,
  HardDrive,
  Users,
  CheckCircle2,
  Clock,
  Filter,
} from 'lucide-react';
import { DepartmentInfo, DepartmentMember, DepartmentActivityLog } from '../types';

interface DepartmentLogsViewProps {
  department: DepartmentInfo;
  members: DepartmentMember[];
  onBackToHub: () => void;
}

export const DepartmentLogsView: React.FC<DepartmentLogsViewProps> = ({
  department,
  members,
  onBackToHub,
}) => {
  const [filterQuery, setFilterQuery] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');

  // Pre-populated realistic department activity logs
  const [logs] = useState<DepartmentActivityLog[]>([
    {
      id: 'log-1',
      timestamp: 'Hôm nay, 10:15',
      actor: department.adminName,
      actorEmail: department.adminEmail,
      action: 'quota_change',
      details: `Đã cấp phát hạn mức dung lượng cho thành viên mới trong phòng ${department.name}.`,
      ipAddress: '192.168.1.45',
      status: 'SUCCESS',
    },
    {
      id: 'log-2',
      timestamp: 'Hôm nay, 09:42',
      actor: members[0]?.name || 'Nguyễn Văn A',
      actorEmail: members[0]?.email || 'user1@company.com',
      action: 'upload',
      details: 'Đã tải lên tệp "Bao_cao_ke_hoach_Q4.pdf" (14.2 MB) - Quét ClamAV sạch.',
      ipAddress: '192.168.1.82',
      status: 'SUCCESS',
    },
    {
      id: 'log-3',
      timestamp: 'Hôm nay, 08:30',
      actor: members[1]?.name || 'Trần Thị B',
      actorEmail: members[1]?.email || 'user2@company.com',
      action: 'download',
      details: 'Đã tải xuống tài liệu "Huong_dan_su_dung_CloudDMS.docx".',
      ipAddress: '192.168.1.90',
      status: 'SUCCESS',
    },
    {
      id: 'log-4',
      timestamp: 'Hôm qua, 16:55',
      actor: department.adminName,
      actorEmail: department.adminEmail,
      action: 'member_invited',
      details: 'Đã gửi lời mời kích hoạt tài khoản thành viên mới qua email có hiệu lực 48 giờ.',
      ipAddress: '192.168.1.45',
      status: 'SUCCESS',
    },
    {
      id: 'log-5',
      timestamp: 'Hôm qua, 14:20',
      actor: members[0]?.name || 'Nguyễn Văn A',
      actorEmail: members[0]?.email || 'user1@company.com',
      action: 'upload',
      details: 'Đã tải lên tệp "Du_lieu_khach_hang_thang9.xlsx" (8.6 MB) - Mã băm SHA-256 khớp.',
      ipAddress: '192.168.1.82',
      status: 'SUCCESS',
    },
    {
      id: 'log-6',
      timestamp: 'Hôm qua, 11:10',
      actor: 'Hệ thống bảo mật',
      actorEmail: 'security@clouddms.local',
      action: 'system',
      details: 'Tự động kiểm tra tính toàn vẹn và quét virus định kỳ cho toàn bộ kho lưu trữ phòng ban.',
      ipAddress: '127.0.0.1',
      status: 'SUCCESS',
    },
    {
      id: 'log-7',
      timestamp: '12/10/2026, 15:40',
      actor: members[1]?.name || 'Trần Thị B',
      actorEmail: members[1]?.email || 'user2@company.com',
      action: 'delete',
      details: 'Đã chuyển tệp tin nháp cũ "Draft_proposal_v1.docx" vào thùng rác.',
      ipAddress: '192.168.1.90',
      status: 'SUCCESS',
    },
  ]);

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.actor.toLowerCase().includes(filterQuery.toLowerCase()) ||
      log.details.toLowerCase().includes(filterQuery.toLowerCase()) ||
      (log.actorEmail && log.actorEmail.toLowerCase().includes(filterQuery.toLowerCase()));

    if (!matchesSearch) return false;
    if (actionFilter === 'all') return true;
    return log.action === actionFilter;
  });

  const handleExportJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(logs, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `department-logs-${department.name}-${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'upload':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
            <UploadCloud className="w-3 h-3 text-blue-600" />
            <span>Tải lên file</span>
          </span>
        );
      case 'download':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <FileDown className="w-3 h-3 text-emerald-600" />
            <span>Tải xuống</span>
          </span>
        );
      case 'quota_change':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
            <HardDrive className="w-3 h-3 text-purple-600" />
            <span>Đổi Quota</span>
          </span>
        );
      case 'member_invited':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-200">
            <Users className="w-3 h-3 text-teal-600" />
            <span>Mời nhân viên</span>
          </span>
        );
      case 'delete':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
            <span>Xóa tệp tin</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
            <span>Hệ thống</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. NÚT QUAY LẠI VÀ HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <button
            onClick={onBackToHub}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 hover:text-blue-600 rounded-lg shadow-2xs transition-all cursor-pointer mb-3"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>← Quay lại Trung tâm điều khiển phòng ban</span>
          </button>

          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Nhật Ký Hoạt Động Nhân Viên Phòng {department.name}
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Theo dõi toàn bộ lịch sử thao tác của các thành viên: tải tệp, tải xuống, thay đổi hạn ngạch và tác vụ hệ thống
          </p>
        </div>

        <button
          onClick={handleExportJson}
          className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 font-semibold text-xs rounded-lg shadow-2xs hover:bg-slate-50 transition-colors cursor-pointer self-start sm:self-auto"
        >
          <Download className="w-3.5 h-3.5 text-slate-500" />
          <span>Xuất Nhật ký (JSON)</span>
        </button>
      </div>

      {/* 2. STATS CARDS ROW */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-4 border border-slate-200/90 shadow-2xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200/80 flex items-center justify-center text-blue-600 shrink-0">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Tổng số thao tác
            </div>
            <div className="text-xl font-bold text-slate-900 mt-0.5">
              {logs.length} bản ghi
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200/90 shadow-2xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200/80 flex items-center justify-center text-emerald-600 shrink-0">
            <UploadCloud className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Tải lên tài liệu
            </div>
            <div className="text-xl font-bold text-slate-900 mt-0.5">
              {logs.filter((l) => l.action === 'upload').length} lượt
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200/90 shadow-2xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-200/80 flex items-center justify-center text-purple-600 shrink-0">
            <HardDrive className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Điều chỉnh Quota & Nhân sự
            </div>
            <div className="text-xl font-bold text-slate-900 mt-0.5">
              {logs.filter((l) => l.action === 'quota_change' || l.action === 'member_invited').length} lượt
            </div>
          </div>
        </div>
      </div>

      {/* 3. BẢNG NHẬT KÝ THAO TÁC */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
        {/* Search & Action Filter Bar */}
        <div className="p-4 border-b border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/40">
          <div className="relative max-w-sm w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              placeholder="Tìm kiếm nhân viên, thao tác, chi tiết..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          {/* Action Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
            {[
              { id: 'all', label: 'Tất cả' },
              { id: 'upload', label: 'Tải lên' },
              { id: 'download', label: 'Tải xuống' },
              { id: 'quota_change', label: 'Đổi Quota' },
              { id: 'member_invited', label: 'Mời nhân sự' },
              { id: 'system', label: 'Hệ thống' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setActionFilter(f.id)}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                  actionFilter === f.id
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Logs Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200/80 text-[11px] font-semibold text-slate-500 bg-slate-50/30">
                <th className="py-3 px-3 text-center w-12">STT</th>
                <th className="py-3 px-4">Thời gian</th>
                <th className="py-3 px-4">Nhân sự thực hiện</th>
                <th className="py-3 px-4">Hành vi</th>
                <th className="py-3 px-5">Chi tiết thao tác</th>
                <th className="py-3 px-3 text-center">Trạng thái</th>
                <th className="py-3 px-4 font-mono text-[11px]">IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <FileText className="w-8 h-8 mx-auto text-slate-300 mb-2 stroke-[1.5]" />
                    <p className="font-semibold text-slate-600 text-xs">Không tìm thấy bản ghi hoạt động nào</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Thử thay đổi từ khóa tìm kiếm hoặc bỏ chọn bộ lọc hành động
                    </p>
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log, idx) => (
                  <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-3 text-center font-mono text-slate-400 text-xs">
                      {idx + 1}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-500 text-[11px] whitespace-nowrap">
                      {log.timestamp}
                    </td>
                    <td className="py-3.5 px-4">
                      <div>
                        <span className="font-semibold text-slate-900 block">{log.actor}</span>
                        {log.actorEmail && (
                          <span className="text-[11px] text-slate-400 block font-mono">{log.actorEmail}</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {getActionBadge(log.action)}
                    </td>
                    <td className="py-3.5 px-5 text-slate-700 max-w-md leading-relaxed">
                      {log.details}
                    </td>
                    <td className="py-3.5 px-3 text-center whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Thành công</span>
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-400 text-[11px] whitespace-nowrap">
                      {log.ipAddress || '127.0.0.1'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
