import React, { useState } from 'react';
import { X, Share2, Copy, Check } from 'lucide-react';
import { DriveItem } from '../types';

interface ShareModalProps {
  item: DriveItem | null;
  onClose: () => void;
  onShareSuccess: (message: string) => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({ item, onClose, onShareSuccess }) => {
  const [copied, setCopied] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [permission, setPermission] = useState('viewer');

  if (!item) return null;

  const shareUrl = `https://clouddms.acme.corp/drive/share/${item.id}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    onShareSuccess('Đã sao chép liên kết chia sẻ vào bộ nhớ tạm!');
  };

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail) return;
    onShareSuccess(`Đã gửi lời mời cộng tác tới ${inviteEmail}!`);
    setInviteEmail('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl p-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Share2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Chia sẻ tài liệu</h3>
              <p className="text-xs text-slate-500 truncate max-w-xs">{item.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleInvite} className="mt-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Thêm người hoặc nhóm nội bộ
            </label>
            <div className="flex gap-2">
              <input
                type="email"
                placeholder="nhan-vien@acmecorp.com..."
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="flex-1 px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <select
                value={permission}
                onChange={(e) => setPermission(e.target.value)}
                className="bg-slate-50 border border-slate-200 text-xs rounded-lg px-2 text-slate-700"
              >
                <option value="viewer">Xem</option>
                <option value="commenter">Nhận xét</option>
                <option value="editor">Chỉnh sửa</option>
              </select>
              <button
                type="submit"
                className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
              >
                Gửi
              </button>
            </div>
          </div>

          <div className="pt-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Liên kết chia sẻ nội bộ
            </label>
            <div className="flex items-center gap-2 p-2 bg-slate-50 border border-slate-200 rounded-lg">
              <input
                type="text"
                readOnly
                value={shareUrl}
                className="flex-1 bg-transparent text-xs text-slate-600 outline-none font-mono"
              />
              <button
                type="button"
                onClick={handleCopy}
                className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-md flex items-center gap-1.5 shadow-xs transition-colors shrink-0 cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Đã chép' : 'Sao chép'}</span>
              </button>
            </div>
          </div>

          {item.sharedWith && item.sharedWith.length > 0 && (
            <div className="pt-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Đang được chia sẻ với
              </label>
              <div className="space-y-1.5 max-h-32 overflow-y-auto">
                {item.sharedWith.map((email) => (
                  <div
                    key={email}
                    className="flex items-center justify-between text-xs py-1 px-2.5 bg-slate-50 rounded-lg"
                  >
                    <span className="text-slate-700 font-mono text-[11px]">{email}</span>
                    <span className="text-[10px] text-slate-400 font-semibold uppercase">Được cấp quyền</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              Đóng
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
