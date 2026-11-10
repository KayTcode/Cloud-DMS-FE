import React, { useEffect, useRef, useState } from 'react';
import { StorageProviderItem } from '../types';
import { storageMigrations, StorageMigrationJob } from '../api/storageMigrations';
import { formatBytes } from '../../department-admin/utils/quotaUtils';

export const StorageMigrationPanel: React.FC<{ providers: StorageProviderItem[]; onClose: () => void }> = ({ providers, onClose }) => {
  const [pairs, setPairs] = useState<{ sourceType: string; destinationType: string }[]>([]);
  const type = (value: string) => (({ '0': 'local', '1': 'googledrive', '2': 'onedrive', '3': 's3' } as Record<string, string>)[String(value)] || String(value).toLowerCase().replace(/\s/g, ''));
  const [source, setSource] = useState(''), [destination, setDestination] = useState('');
  const [jobs, setJobs] = useState<StorageMigrationJob[]>([]), [selected, setSelected] = useState('');
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const [ack, setAck] = useState(false), [cleanupName, setCleanupName] = useState('');
  const [items, setItems] = useState<any[]>([]), [page, setPage] = useState(1);
  const [historyPage, setHistoryPage] = useState(1);
  const key = useRef({ pair: '', value: '' });
  const job = jobs.find(j => j.id === selected);
  const sources = providers.filter(p => p.isActive !== false && pairs.some(pair => type(pair.sourceType) === type(p.type)));
  const sourceType = providers.find(p => p.id === source)?.type || '';
  const destinations = providers.filter(p => p.isActive !== false && !p.migrationReadOnly && p.id !== source && pairs.some(pair => type(pair.sourceType) === type(sourceType) && type(pair.destinationType) === type(p.type)));
  const name = (id: string) => providers.find(p => p.id === id)?.name || id;
  useEffect(() => {
    let alive = true, loading = false;
    const load = async () => {
      if (loading) return; loading = true;
      try { const [rows, supported] = await Promise.all([storageMigrations.list(historyPage), storageMigrations.capabilities()]); if (alive) { setPairs(supported); setJobs(rows); setSelected(id => rows.some(j => j.id === id) ? id : rows[0]?.id || ''); } }
      catch (e: any) { if (alive) setError(e?.message || 'Không thể tải tiến trình.'); }
      finally { loading = false; }
    };
    void load(); const timer = window.setInterval(load, 3000);
    return () => { alive = false; window.clearInterval(timer); };
  }, [historyPage]);
  useEffect(() => { setAck(false); setCleanupName(''); setPage(1); }, [selected]);
  useEffect(() => {
    let alive = true;
    if (selected) void storageMigrations.items(selected, page).then(rows => { if (alive) setItems(rows); }).catch(() => { if (alive) setItems([]); });
    return () => { alive = false; };
  }, [selected, page, job?.state, job?.confirmedBytes, job?.verifiedObjects]);
  const act = async (action: string) => {
    if (!job) return; setBusy(true); setError('');
    try { const updated = await storageMigrations.act(job, action); setJobs(rows => rows.map(j => j.id === updated.id ? updated : j)); }
    catch (e: any) { setError(e?.message || 'Không thể thực hiện thao tác.'); }
    finally { setBusy(false); }
  };
  const create = async () => {
    setBusy(true); setError('');
    try {
      const pair = source + ':' + destination;
      if (key.current.pair !== pair) key.current = { pair, value: crypto.randomUUID() };
      const created = await storageMigrations.create(source, destination, key.current.value);
      setJobs(rows => [created, ...rows.filter(j => j.id !== created.id)]); setSelected(created.id);
    } catch (e: any) { setError(e?.message || 'Không thể tạo kế hoạch.'); }
    finally { setBusy(false); }
  };
  const button = (action: string, label: string, disabled = false) => <button type="button" disabled={busy || disabled}
    onClick={() => void act(action)} className="rounded border px-3 py-2 text-sm disabled:opacity-40">{label}</button>;
  return <section role="dialog" aria-modal="true" aria-label="Di chuyển dữ liệu lưu trữ" className="fixed inset-0 z-50 bg-black/40 overflow-auto p-6">
    <div className="mx-auto max-w-4xl rounded-xl bg-white p-6 space-y-4">
      <div className="flex justify-between"><h2 className="text-lg font-bold">Di chuyển dữ liệu lưu trữ</h2><button onClick={onClose}>Đóng</button></div>
      <p className="text-sm text-slate-600">Hỗ trợ: {pairs.map(p => `${p.sourceType} → ${p.destinationType}`).join(', ') || 'Đang kiểm tra…'}. Di chuyển toàn bộ dữ liệu Cloud-DMS quản lý, gồm thùng rác và phiên bản được giữ lại.</p>
      <div className="flex flex-wrap gap-3">
        <select aria-label="Kho nguồn" value={source} onChange={e => { setSource(e.target.value); setDestination(''); }} className="border rounded p-2"><option value="">Chọn kho nguồn</option>{sources.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
        <select aria-label="Kho đích" value={destination} onChange={e => setDestination(e.target.value)} className="border rounded p-2"><option value="">Chọn kho đích</option>{destinations.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
        <button disabled={busy || !source || !destinations.some(p => p.id === destination)} onClick={() => void create()} className="bg-blue-600 text-white rounded px-3 disabled:opacity-40">Tạo kế hoạch</button>
      </div>
      {error && <p role="alert" className="text-red-700">{error}</p>}
      <label className="block text-sm">Lịch sử <select value={selected} onChange={e => setSelected(e.target.value)} className="border rounded p-2 ml-2"><option value="">Chọn tiến trình</option>{jobs.map(j => <option key={j.id} value={j.id}>{name(j.sourceProviderId)} → {name(j.destinationProviderId)} — {j.state}</option>)}</select></label>
      <div className="flex gap-2 text-sm"><button disabled={historyPage === 1} onClick={() => setHistoryPage(p => p - 1)}>Lịch sử trước</button><span>Trang {historyPage}</span><button disabled={jobs.length < 50} onClick={() => setHistoryPage(p => p + 1)}>Lịch sử tiếp</button></div>
      {job && <div className="space-y-3 border-t pt-4">
        <p className="font-semibold">{name(job.sourceProviderId)} → {name(job.destinationProviderId)}: {job.state}</p>
        <p className="text-sm">Đã xác minh {job.verifiedObjects}/{job.totalObjects} đối tượng · {formatBytes(job.verifiedBytes)}/{formatBytes(job.totalBytes)} · Đã chuyển {job.completedTenants}/{job.totalTenants} tổ chức</p>
        <p className="text-sm">Hạn mức cần chuyển: {formatBytes(job.grantBytes)} · Đã truyền: {formatBytes(job.confirmedBytes)}</p>
        <progress className="w-full" max={Math.max(1, job.totalBytes)} value={job.verifiedBytes} />
        {job.errorCode && <p role="alert" className="text-red-700">{job.errorCode}</p>}
        {job.maintenance && <p className="bg-amber-50 p-3 text-sm">Đang bảo trì thao tác ghi cho dữ liệu liên quan. Các tác vụ nền được tạm dừng; dữ liệu vẫn có thể đọc.</p>}
        <div className="flex flex-wrap gap-2">
          {['Draft', 'Ready'].includes(job.state) && button('validate', 'Kiểm tra điều kiện')}
          {job.state === 'Ready' && <><label className="text-sm"><input type="checkbox" checked={ack} onChange={e => setAck(e.target.checked)} /> Tôi đồng ý tạm dừng thao tác ghi của các tổ chức liên quan.</label>{button('start', 'Bắt đầu di chuyển', !ack)}</>}
          {['Validating', 'Inspecting', 'Copying', 'Cutover', 'Cleaning'].includes(job.state) && button('pause', 'Tạm dừng')}
          {['Paused', 'Blocked'].includes(job.state) && button('resume', 'Tiếp tục / thử lại')}
          {!['Completed', 'CompletedPartial', 'Cleaning', 'Migrated', 'Cancelled'].includes(job.state) && button('cancel', 'Hủy phần chưa chuyển')}
          {job.state === 'Completed' && button('retire-source', 'Ngừng sử dụng kho nguồn')}
        </div>
        {job.cleanupAfter && !job.cleanupAuthorized && <div className="bg-amber-50 p-3 space-y-2">
          <p className="text-sm">Chỉ dọn bản nguồn sau {new Date(job.cleanupAfter).toLocaleString('vi-VN')}. Chỉ xóa các đối tượng đã chuyển và xác minh; không xóa tài khoản Google Drive.</p>
          <label className="text-sm block">Nhập tên kho nguồn để xác nhận: <input value={cleanupName} onChange={e => setCleanupName(e.target.value)} className="border rounded p-1" /></label>
          {button('cleanup', 'Xóa các bản nguồn đã di chuyển', cleanupName !== name(job.sourceProviderId) || Date.parse(job.cleanupAfter) > Date.now())}
        </div>}
        <div className="text-xs space-y-1">{items.map(item => <p key={item.id}>{item.id} — {item.state} — {formatBytes(item.sizeBytes)} {item.errorCode}</p>)}</div>
        <div className="flex gap-2"><button disabled={page === 1} onClick={() => setPage(p => p - 1)}>Trước</button><span>Trang {page}</span><button disabled={items.length < 50} onClick={() => setPage(p => p + 1)}>Tiếp</button></div>
      </div>}
    </div>
  </section>;
};
