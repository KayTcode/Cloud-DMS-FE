import React, { useState, useEffect } from 'react';
import { X, Folder, RefreshCw, AlertTriangle } from 'lucide-react';
import { FolderDto, BreadcrumbItem } from '../types/folder.types';
import { folderApi } from '../api/folderApi';
import { FolderBreadcrumb } from './FolderBreadcrumb';

interface MoveFolderModalProps {
  isOpen: boolean;
  item: { id: string; name: string; type: 'folder' | 'file' } | null;
  driveKind: 'Personal' | 'DepartmentShared';
  driveOwnerId: string;
  onClose: () => void;
  onMove: (targetFolderId: string | null) => void;
}

export const MoveFolderModal: React.FC<MoveFolderModalProps> = ({
  isOpen,
  item,
  driveKind,
  driveOwnerId,
  onClose,
  onMove,
}) => {
  const [folders, setFolders] = useState<FolderDto[]>([]);
  const [breadcrumb, setBreadcrumb] = useState<BreadcrumbItem[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadFolders = async (folderId: string | null) => {
    setIsLoading(true);
    setError(null);
    try {
      let res;
      if (folderId === null) {
        res = await folderApi.getRoot(driveKind, driveOwnerId);
        setBreadcrumb([]);
      } else {
        res = await folderApi.getChildren(folderId);
        setBreadcrumb(res.breadcrumb);
      }
      setFolders(res.folders);
      setCurrentFolderId(folderId);
    } catch {
      setError('Không thể tải danh sách thư mục. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setCurrentFolderId(null);
      setBreadcrumb([]);
      setFolders([]);
      loadFolders(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  if (!isOpen || !item) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 shrink-0">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Di chuyển "{item.name}"</h3>
            <p className="text-xs text-slate-500 mt-0.5">Chọn thư mục đích</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Breadcrumb */}
        <div className="px-5 py-2 border-b border-slate-100 shrink-0">
          <FolderBreadcrumb breadcrumb={breadcrumb} onNavigate={loadFolders} />
        </div>

        {/* Folder List */}
        <div className="flex-1 overflow-y-auto px-5 py-3 min-h-[200px]">
          {isLoading ? (
            <div className="flex items-center justify-center py-10">
              <RefreshCw className="w-6 h-6 text-blue-600 animate-spin" />
            </div>
          ) : error ? (
            <div className="flex items-center gap-2 bg-rose-50 border border-rose-200 rounded-lg p-3 text-xs text-rose-700">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          ) : folders.length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-8">Không có thư mục con nào</p>
          ) : (
            <div className="space-y-1">
              {folders.map((folder) => {
                const isDisabled = item.type === 'folder' && folder.id === item.id;
                return (
                  <button
                    key={folder.id}
                    disabled={isDisabled}
                    onClick={() => loadFolders(folder.id)}
                    title={isDisabled ? 'Không thể di chuyển vào chính nó' : folder.name}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors text-xs ${
                      isDisabled
                        ? 'opacity-40 cursor-not-allowed bg-slate-50'
                        : 'hover:bg-blue-50 hover:text-blue-700 cursor-pointer'
                    }`}
                  >
                    <Folder className="w-4 h-4 text-amber-500 fill-amber-400 shrink-0" />
                    <span className="font-medium text-slate-800 truncate">{folder.name}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-slate-100 flex items-center justify-between shrink-0">
          <span className="text-xs text-slate-500">
            Đích: <span className="font-semibold text-slate-700">{breadcrumb.length > 0 ? breadcrumb[breadcrumb.length - 1].name : 'Drive của tôi'}</span>
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              Hủy bỏ
            </button>
            <button
              onClick={() => onMove(currentFolderId)}
              className="px-4 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              Di chuyển đến đây
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
