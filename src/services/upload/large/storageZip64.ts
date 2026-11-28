import { safeArchivePath } from '../storageZip';

const table = Uint32Array.from({ length: 256 }, (_, i) => {
  let c = i;
  for (let n = 0; n < 8; n++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const max32 = 0xffffffff;
const encoder = new TextEncoder();
const header = (size: number, signature: number) => {
  const bytes = new Uint8Array(size), view = new DataView(bytes.buffer);
  view.setUint32(0, signature, true); return { bytes, view };
};

// Reads at most 1 MiB at a time. No whole-file ArrayBuffer, compression buffer or server relay.
// A deterministic header/CRC and original mtime make reselect/resume reproduce the same ZIP.
export async function packageLargeFile(file: File, onProgress?: (read: number) => void, signal?: AbortSignal) {
  safeArchivePath(file.name);
  let crc = 0xffffffff;
  for (let offset = 0; offset < file.size; offset += 1024 * 1024) {
    signal?.throwIfAborted();
    const part = new Uint8Array(await file.slice(offset, offset + 1024 * 1024).arrayBuffer());
    for (const byte of part) crc = table[(crc ^ byte) & 255] ^ (crc >>> 8);
    onProgress?.(Math.min(file.size, offset + part.length));
    if (offset % (16 * 1024 * 1024) === 0) await new Promise(resolve => setTimeout(resolve, 0));
  }
  signal?.throwIfAborted();
  return buildStoredZip(file, (~crc) >>> 0);
}

export function buildStoredZip(file: File, crc: number) {
  const layout = storedZipLayout(file.name, file.size, crc);
  return new File([layout.prefix, file, layout.suffix], file.name + '.zip', { type: 'application/zip', lastModified: file.lastModified });
}

export function storedZipLayout(fileName: string, fileSize: number, crc: number) {
  if (!Number.isSafeInteger(fileSize) || fileSize < 0) throw new Error('Kích thước tệp không hợp lệ.');
  const name = encoder.encode(safeArchivePath(fileName));
  const zip64 = fileSize >= max32;
  const extra = zip64 ? header(20, 0x00100001).bytes : new Uint8Array();
  if (zip64) {
    const v = new DataView(extra.buffer); v.setBigUint64(4, BigInt(fileSize), true); v.setBigUint64(12, BigInt(fileSize), true);
  }
  const local = header(30, 0x04034b50), central = header(46, 0x02014b50);
  local.view.setUint16(4, zip64 ? 45 : 20, true); local.view.setUint16(6, 0x800, true);
  local.view.setUint32(14, crc, true);
  local.view.setUint32(18, zip64 ? max32 : fileSize, true); local.view.setUint32(22, zip64 ? max32 : fileSize, true);
  local.view.setUint16(26, name.length, true); local.view.setUint16(28, extra.length, true);
  central.view.setUint16(4, 45, true); central.view.setUint16(6, zip64 ? 45 : 20, true); central.view.setUint16(8, 0x800, true);
  central.view.setUint32(16, crc, true);
  central.view.setUint32(20, zip64 ? max32 : fileSize, true); central.view.setUint32(24, zip64 ? max32 : fileSize, true);
  central.view.setUint16(28, name.length, true); central.view.setUint16(30, extra.length, true);
  const directoryOffset = 30 + name.length + extra.length + fileSize;
  const directorySize = 46 + name.length + extra.length;
  const needsZip64End = zip64 || directoryOffset >= max32;
  const trailer: BlobPart[] = [];
  if (needsZip64End) {
    const end64 = header(56, 0x06064b50), locator = header(20, 0x07064b50);
    end64.view.setBigUint64(4, 44n, true); end64.view.setUint16(12, 45, true); end64.view.setUint16(14, 45, true);
    end64.view.setBigUint64(24, 1n, true); end64.view.setBigUint64(32, 1n, true);
    end64.view.setBigUint64(40, BigInt(directorySize), true); end64.view.setBigUint64(48, BigInt(directoryOffset), true);
    locator.view.setBigUint64(8, BigInt(directoryOffset + directorySize), true); locator.view.setUint32(16, 1, true);
    trailer.push(end64.bytes, locator.bytes);
  }
  const end = header(22, 0x06054b50);
  end.view.setUint16(8, 1, true); end.view.setUint16(10, 1, true);
  end.view.setUint32(12, directorySize, true); end.view.setUint32(16, needsZip64End ? max32 : directoryOffset, true);
  // Blob concatenation retains references to the disk-backed File; only small headers are new allocations.
  const prefix = new Blob([local.bytes, name, extra]);
  const suffix = new Blob([central.bytes, name, extra, ...trailer, end.bytes]);
  return { prefix, suffix, size: prefix.size + fileSize + suffix.size };
}
