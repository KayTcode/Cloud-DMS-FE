// Standard, bounded ZIP32 storage. No document previews, solid compression or third-party runtime.
const limit = 100 * 1024 * 1024;
const encoder = new TextEncoder();
const decoder = new TextDecoder('utf-8', { fatal: true });
export function safeArchivePath(path: string): string {
  const value = path.normalize('NFC');
  if (!value || value.length > 512 || /[\\:\x00-\x1f\x7f]/.test(value)
    || value.split('/').some(part => !part || part === '.' || part === '..')) throw new Error('Đường dẫn lưu trữ không hợp lệ.');
  return value;
}
export function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function header(size: number, signature: number) {
  const bytes = new Uint8Array(size), view = new DataView(bytes.buffer);
  view.setUint32(0, signature, true);
  return { bytes, view };
}
export async function packageForStorage(files: File[], directories: string[] = []) {
  if (files.length > 1000 || directories.length > 2000 || (!files.length && !directories.length)
    || files.reduce((sum, file) => sum + file.size, 0) > limit) throw new Error('Giới hạn 1000 tệp và 100 MiB dữ liệu.');
  const entries = new Map<string, File | null>();
  const addDirectory = (value: string) => {
    const parts = safeArchivePath(value).split('/');
    for (let i = 1; i <= parts.length; i++) {
      const path = parts.slice(0, i).join('/');
      if (entries.get(path)) throw new Error('Đường dẫn tệp và thư mục xung đột.');
      entries.set(path, null);
    }
  };
  directories.forEach(addDirectory);
  for (const file of files) {
    const path = safeArchivePath(file.webkitRelativePath || file.name);
    const slash = path.lastIndexOf('/');
    if (slash >= 0) addDirectory(path.slice(0, slash));
    if (entries.has(path)) throw new Error('Trùng đường dẫn tệp.');
    entries.set(path, file);
  }
  if (entries.size > 10000) throw new Error('Cây thư mục quá lớn.');
  const folder = directories.length > 0 || files.some(f => !!f.webkitRelativePath);
  const archiveKind = folder ? 'folder' : files.length === 1 ? 'file' : 'batch';
  const logicalName = (folder ? (directories[0] || files[0].webkitRelativePath).split('/')[0]
    : files.length === 1 ? files[0].name : 'Uploaded files').normalize('NFC');
  const chunks: BlobPart[] = [], central: BlobPart[] = [];
  let offset = 0, centralSize = 0;
  for (const [path, file] of entries) {
    const name = encoder.encode(path + (file ? '' : '/'));
    const original = file ? new Uint8Array(await file.arrayBuffer()) : new Uint8Array();
    // Browsers expose no compression-level control. Store guarantees the approved low-CPU mode.
    const payload = original, method = 0;
    const crc = crc32(original);
    const local = header(30, 0x04034b50), record = header(46, 0x02014b50);
    local.view.setUint16(4, 20, true); local.view.setUint16(6, 0x800, true);
    local.view.setUint16(8, method, true); local.view.setUint32(14, crc, true);
    local.view.setUint32(18, payload.length, true); local.view.setUint32(22, original.length, true);
    local.view.setUint16(26, name.length, true);
    record.view.setUint16(4, 20, true); record.view.setUint16(6, 20, true);
    record.view.setUint16(8, 0x800, true); record.view.setUint16(10, method, true);
    record.view.setUint32(16, crc, true); record.view.setUint32(20, payload.length, true);
    record.view.setUint32(24, original.length, true); record.view.setUint16(28, name.length, true);
    record.view.setUint32(42, offset, true);
    chunks.push(local.bytes, name, payload); central.push(record.bytes, name);
    offset += 30 + name.length + payload.length; centralSize += 46 + name.length;
    if (offset + centralSize + 22 > limit) throw new Error('Gói lưu trữ vượt 100 MiB.');
  }
  const end = header(22, 0x06054b50);
  end.view.setUint16(8, entries.size, true); end.view.setUint16(10, entries.size, true);
  end.view.setUint32(12, centralSize, true); end.view.setUint32(16, offset, true);
  return { file: new File([...chunks, ...central, end.bytes], logicalName + '.zip', { type: 'application/zip' }),
    archiveKind, logicalName, originalSize: files.reduce((sum, f) => sum + f.size, 0) };
}

// Validate every entry before writing anything. A new destination folder is required; never overwrite.
export async function extractStorageZip(blob: Blob, destination: any): Promise<void> {
  if (blob.size > limit || blob.size < 22) throw new Error('Kích thước gói không hợp lệ.');
  const buffer = await blob.arrayBuffer(), bytes = new Uint8Array(buffer), v = new DataView(buffer);
  const u16 = (at: number) => v.getUint16(at, true), u32 = (at: number) => v.getUint32(at, true);
  const end = bytes.length - 22;
  if (u32(end) !== 0x06054b50 || u16(end + 20) !== 0 || u16(end + 4) || u16(end + 6)
    || u16(end + 8) !== u16(end + 10)) throw new Error('Định dạng gói không được hỗ trợ.');
  const count = u16(end + 10), size = u32(end + 12), start = u32(end + 16);
  if (!count || count > 10000 || start + size !== end) throw new Error('Mục lục gói không hợp lệ.');
  const entries: { path: string; directory: boolean; method: number; crc: number; size: number; from: number; compressed: number }[] = [];
  const seen = new Set<string>(); let position = start, total = 0;
  for (let i = 0; i < count; i++) {
    if (position + 46 > end || u32(position) !== 0x02014b50) throw new Error('Mục lục bị hỏng.');
    const flags = u16(position + 8), method = u16(position + 10), compressed = u32(position + 20);
    const size = u32(position + 24), nameLength = u16(position + 28), extra = u16(position + 30), comment = u16(position + 32);
    if ((flags & 0x2041) || ![0, 8].includes(method) || u16(position + 34)
      || ((u32(position + 38) >>> 16) & 0xf000) === 0xa000 || position + 46 + nameLength + extra + comment > end)
      throw new Error('Thành phần gói không an toàn.');
    const nameBytes = bytes.subarray(position + 46, position + 46 + nameLength);
    const name = decoder.decode(nameBytes), directory = name.endsWith('/');
    const path = safeArchivePath(directory ? name.slice(0, -1) : name);
    const filesystemPath = path.toLowerCase();
    if (seen.has(filesystemPath)) throw new Error('Trùng đường dẫn gói.'); seen.add(filesystemPath);
    total += size; if (total > limit) throw new Error('Dữ liệu giải nén vượt giới hạn.');
    const local = u32(position + 42);
    if (local + 30 > start || u32(local) !== 0x04034b50 || u16(local + 8) !== method || u16(local + 6) !== flags
      || u16(local + 26) !== nameLength || decoder.decode(bytes.subarray(local + 30, local + 30 + nameLength)) !== name)
      throw new Error('Thông tin tệp không khớp.');
    const from = local + 30 + u16(local + 26) + u16(local + 28);
    if (from + compressed > start || (directory && (size || compressed))) throw new Error('Khoảng dữ liệu không hợp lệ.');
    entries.push({ path, directory, method, crc: u32(position + 16), size, from, compressed });
    position += 46 + nameLength + extra + comment;
  }
  if (position !== end) throw new Error('Mục lục không hợp lệ.');
  const byPath = new Map(entries.map(entry => [entry.path.toLowerCase(), entry]));
  for (const entry of entries) {
    const parts = entry.path.split('/');
    for (let i = 1; i < parts.length; i++) {
      const parent = byPath.get(parts.slice(0, i).join('/').toLowerCase());
      if (!parent?.directory) throw new Error('Cây thư mục không hợp lệ.');
    }
  }
  const roots = new Set(entries.map(e => e.path.split('/')[0]));
  for (const root of roots) {
    try { await destination.getDirectoryHandle(root); throw new Error(`Thư mục ${root} đã tồn tại. Chọn thư mục đích khác.`); }
    catch (error: any) { if (error.name !== 'NotFoundError') throw error; }
    try { await destination.getFileHandle(root); throw new Error(`Tệp ${root} đã tồn tại. Chọn thư mục đích khác.`); }
    catch (error: any) { if (error.name !== 'NotFoundError') throw error; }
  }
  for (const entry of entries) {
    let handle = destination;
    const parts = entry.path.split('/');
    for (const part of parts.slice(0, entry.directory ? undefined : -1)) handle = await handle.getDirectoryHandle(part, { create: true });
    if (entry.directory) continue;
    const payload = new Blob([bytes.slice(entry.from, entry.from + entry.compressed)]);
    const input: ReadableStream<BufferSource> = payload.stream();
    const stream = entry.method === 8 ? input.pipeThrough(new DecompressionStream('deflate-raw' as CompressionFormat)) : payload.stream();
    // Consume with a bound rather than arrayBuffer(), so forged expanded sizes cannot exhaust RAM.
    const reader = stream.getReader(), chunks: Uint8Array[] = []; let length = 0;
    try { for (;;) { const result = await reader.read(); if (result.done) break;
      length += result.value.length; if (length > entry.size) throw new Error('Kích thước giải nén không khớp.'); chunks.push(result.value); }
    } catch (error) { await reader.cancel(); throw error; } finally { reader.releaseLock(); }
    const output = new Uint8Array(length); let offset = 0; for (const chunk of chunks) { output.set(chunk, offset); offset += chunk.length; }
    if (length !== entry.size || crc32(output) !== entry.crc) throw new Error('Kiểm tra toàn vẹn tệp thất bại.');
    const file = await handle.getFileHandle(parts.at(-1), { create: true });
    const writer = await file.createWritable(); try { await writer.write(output); await writer.close(); } catch (error) { await writer.abort(); throw error; }
  }
}
