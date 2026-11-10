import React, { useState, useEffect } from 'react';
import { Folder, X } from 'lucide-react';
import { folderApi } from '../api/folderApi';
import { FolderDto } from '../types/folder.types';

interface SelectSharedFolderModalProps {
  departmentId: string;
  onSelect: (folderId: string | null) => void;
  onClose: () => void;
}

export const SelectSharedFolderModal: React.FC<SelectSharedFolderModalProps> = ({
  departmentId,
  onSelect,
  onClose,
}) => {
  const [folders, setFolders] = useState<FolderDto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    folderApi
      .getDriveChildren('shared', { departmentId, folderId: null })
      .then((res) => {
        setFolders(res.folders ?? []);
      })
      .catch(() => {
        setFolders([]);
      })
      .finally(() => setLoading(false));
  }, [departmentId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm mx-4">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h2 className="text-sm font-semibold text-slate-800">Chọn thư mục trong Kho chung</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-100 rounded text-slate-500 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="py-2 max-h-72 overflow-y-auto">
          {loading ? (
            <div className="px-5 py-6 text-center text-sm text-slate-400">Đang tải...</div>
          ) : (
            <>
              <button
                onClick={() => onSelect(null)}
                className="w-full flex items-center gap-2.5 px-5 py-2.5 text-sm text-slate-700 hover:bg-blue-50 hover:text-blue-700 transition-colors cursor-pointer text-left"
              >
                <Folder className="w-4 h-4 text-blue-400 shrink-0" />
                Kho chung (thư mục gốc)
              </button>
              {folders.map((folder) => (
                <button
                  key={folder.id}
                  onClick={() => onSelect(folder.id)}
                  className="w-full flex items-center gap-2.5 px-5 py-2.5 text-sm text-slate-700 hover:bg-blue-50 hover:text-blue-700 transition-colors cursor-pointer text-left"
                >
                  <Folder className="w-4 h-4 text-amber-400 shrink-0" />
                  {folder.name}
                </button>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
