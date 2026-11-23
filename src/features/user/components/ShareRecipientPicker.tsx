import React, { useEffect, useId, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { driveApi, ShareCandidate } from '../api/driveApi';

export const normalizeRecipientEmail = (email: string) => email.trim().toLowerCase();
export function recipientInputError(email: string, selected: string[], existing: string[]): string {
  const normalized = normalizeRecipientEmail(email);
  const input = document.createElement('input');
  input.type = 'email'; input.value = normalized;
  if (!normalized || normalized.length > 254 || !input.validity.valid)
    return 'Vui lòng nhập địa chỉ email hợp lệ.';
  if (selected.some(value => normalizeRecipientEmail(value) === normalized))
    return 'Email này đã được chọn.';
  if (existing.some(value => normalizeRecipientEmail(value) === normalized))
    return 'Tài khoản này đã được chia sẻ. Hãy sửa quyền trong danh sách bên dưới.';
  return '';
}

function HighlightEmail({ email, query }: { email: string; query: string }) {
  const needle = query.trim().toLowerCase();
  if (!needle) return <>{email}</>;
  const parts: React.ReactNode[] = [];
  let start = 0, match = email.toLowerCase().indexOf(needle);
  while (match !== -1) {
    parts.push(email.slice(start, match), <mark key={match} className="bg-amber-100 font-semibold">{email.slice(match, match + needle.length)}</mark>);
    start = match + needle.length;
    match = email.toLowerCase().indexOf(needle, start);
  }
  parts.push(email.slice(start));
  return <>{parts}</>;
}

interface Props {
  fileId: string;
  value: string;
  onValueChange: (value: string) => void;
  selected: string[];
  onSelectedChange: (emails: string[]) => void;
  existing: string[];
  disabled: boolean;
  recipientErrors: Record<string, string>;
}

export const ShareRecipientPicker: React.FC<Props> = ({
  fileId, value, onValueChange, selected, onSelectedChange, existing, disabled, recipientErrors,
}) => {
  const input = useRef<HTMLInputElement>(null);
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [error, setError] = useState('');
  const [lookup, setLookup] = useState<{ query: string; fileId: string; items: ShareCandidate[]; loading: boolean; failed: boolean }>(
    { query: '', fileId, items: [], loading: false, failed: false });

  useEffect(() => {
    const query = value.trim();
    if (!query || disabled) return;
    let current = true;
    const controller = new AbortController();
    setActive(-1);
    setLookup({ query, fileId, items: [], loading: true, failed: false });
    const timer = window.setTimeout(() => {
      driveApi.getShareCandidates(fileId, query, controller.signal).then(items => {
        if (current) setLookup({ query, fileId, items, loading: false, failed: false });
      }).catch(() => {
        if (current) setLookup({ query, fileId, items: [], loading: false, failed: true });
      });
    }, 250);
    return () => { current = false; window.clearTimeout(timer); controller.abort(); };
  }, [fileId, value, disabled]);

  const currentLookup = lookup.query === value.trim() && lookup.fileId === fileId;
  const suggestions = currentLookup ? lookup.items.filter(item =>
    !selected.some(email => normalizeRecipientEmail(email) === normalizeRecipientEmail(item.email))
    && !existing.some(email => normalizeRecipientEmail(email) === normalizeRecipientEmail(item.email))) : [];
  const expanded = open && !!value.trim() && !disabled;
  const add = (email: string) => {
    const message = recipientInputError(email, selected, existing);
    setError(message);
    if (message) return;
    onSelectedChange([...selected, normalizeRecipientEmail(email)]);
    onValueChange(''); setActive(-1); setOpen(false);
    input.current?.focus();
  };

  return <div onBlur={event => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false);
  }}>
    <label htmlFor="share-email" className="block text-xs font-semibold mb-2">Email người nhận</label>
    <div className="relative">
      <div className="flex flex-wrap gap-2 border rounded-lg p-2 focus-within:ring-2 focus-within:ring-blue-500">
        {selected.map(email => <span key={email} className="inline-flex max-w-full items-center gap-1 rounded-full bg-blue-50 border border-blue-200 px-2 py-1 text-xs">
          <span className="break-all">{email}</span>
          <button type="button" disabled={disabled} aria-label={`Xóa người nhận ${email}`}
            onClick={() => { onSelectedChange(selected.filter(value => value !== email)); setError(''); input.current?.focus(); }}
            className="rounded-full p-1 hover:bg-blue-100 disabled:opacity-50"><X size={12} /></button>
        </span>)}
        <input ref={input} id="share-email" type="text" inputMode="email" autoComplete="off" maxLength={254}
          role="combobox" aria-autocomplete="list" aria-expanded={expanded} aria-controls={expanded ? listId : undefined}
          aria-describedby={`${listId}-help`} aria-activedescendant={expanded && suggestions[active] ? `${listId}-${active}` : undefined}
          disabled={disabled} value={value} placeholder="Nhập email để thêm người nhận"
          onFocus={() => setOpen(true)}
          onChange={event => { onValueChange(event.target.value); setOpen(true); setActive(-1); setError(''); }}
          onKeyDown={event => {
            if (event.nativeEvent.isComposing) return;
            if (event.key === 'Escape' && expanded) {
              event.preventDefault(); event.stopPropagation(); setOpen(false); setActive(-1);
            } else if ((event.key === 'ArrowDown' || event.key === 'ArrowUp') && suggestions.length) {
              event.preventDefault(); setOpen(true);
              setActive(index => event.key === 'ArrowDown' ? (index + 1) % suggestions.length : (index <= 0 ? suggestions.length - 1 : index - 1));
            } else if (event.key === 'Enter') {
              event.preventDefault();
              if (expanded && suggestions[active]) add(suggestions[active].email);
              else if (value.trim()) add(value);
            }
          }} className="flex-1 min-w-40 outline-none p-1 text-sm bg-transparent" />
      </div>
      {expanded && <div className="absolute z-10 mt-1 w-full rounded-lg border bg-white shadow-lg max-h-56 overflow-auto">
        {!currentLookup || lookup.loading ? <p role="status" className="p-3 text-xs text-slate-500">Đang tìm email…</p>
          : lookup.failed ? <p role="status" className="p-3 text-xs text-slate-500">Không thể tải gợi ý. Bạn vẫn có thể nhập email đầy đủ và nhấn Enter.</p>
            : <>
              {!suggestions.length && <p role="status" className="p-3 text-xs text-slate-500">Không có email phù hợp.</p>}
            </>}
        <ul id={listId} role="listbox" aria-label="Email được gợi ý">
          {suggestions.map((item, index) => <li key={item.id} role="option" id={`${listId}-${index}`} aria-selected={active === index}
            aria-label={`${item.email} ${item.name}`}
            onMouseDown={event => event.preventDefault()} onClick={() => add(item.email)}
            className={`px-3 py-2 cursor-pointer hover:bg-blue-50 ${active === index ? 'bg-blue-50' : ''}`}>
            <span className="block text-sm break-all"><HighlightEmail email={item.email} query={value} /></span>
            <span className="block text-xs text-slate-500">{item.name}</span>
          </li>)}
        </ul>
      </div>}
    </div>
    <p id={`${listId}-help`} className="mt-2 text-xs text-slate-500">Chọn email gợi ý hoặc nhập email đầy đủ và nhấn Enter. Nhấn × để bỏ người nhận.</p>
    {error && <p role="alert" className="mt-2 text-xs text-red-600">{error}</p>}
    {selected.filter(email => recipientErrors[email]).map(email => <p key={email} role="alert" className="mt-2 text-xs text-red-600">
      {email}: {recipientErrors[email]}
    </p>)}
  </div>;
};
