import React from 'react';
import { ChevronRight } from 'lucide-react';
import { BreadcrumbItem } from '../types/folder.types';

interface FolderBreadcrumbProps {
  breadcrumb: BreadcrumbItem[];
  onNavigate: (id: string | null) => void;
}

export const FolderBreadcrumb: React.FC<FolderBreadcrumbProps> = ({ breadcrumb, onNavigate }) => {
  return (
    <div className="flex items-center gap-1 text-xs overflow-x-auto whitespace-nowrap py-1">
      <button
        onClick={() => onNavigate(null)}
        className={`font-semibold transition-colors cursor-pointer shrink-0 ${
          breadcrumb.length === 0
            ? 'text-slate-900'
            : 'text-blue-600 hover:text-blue-800 hover:underline'
        }`}
      >
        Drive của tôi
      </button>
      {breadcrumb.map((item, index) => {
        const isLast = index === breadcrumb.length - 1;
        return (
          <React.Fragment key={item.id}>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            {isLast ? (
              <span className="font-semibold text-slate-900 shrink-0">{item.name}</span>
            ) : (
              <button
                onClick={() => onNavigate(item.id)}
                className="font-semibold text-blue-600 hover:text-blue-800 hover:underline transition-colors cursor-pointer shrink-0"
              >
                {item.name}
              </button>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};
