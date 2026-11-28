import { File as NativeFile, Blob as NativeBlob, Buffer } from 'node:buffer';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { packageLargeFile, storedZipLayout } from './storageZip64';
import { crc32 } from '../storageZip';

describe('ZIP-only resumable storage source', () => {
  beforeEach(() => { vi.stubGlobal('File', NativeFile); vi.stubGlobal('Blob', NativeBlob); });
  afterEach(() => vi.unstubAllGlobals());

  it('builds a valid Store entry with bounded reads and deterministic resume bytes', async () => {
    const bytes = new Uint8Array(3 * 1024 * 1024 + 7).fill(42);
    const original = new File([bytes], 'report.bin', { lastModified: 12345 });
    const forbiddenWholeRead = vi.spyOn(original, 'arrayBuffer').mockRejectedValue(new Error('Whole-file read forbidden'));
    const slices = vi.spyOn(original, 'slice');
    const progress = vi.fn();
    const archive = await packageLargeFile(original, progress);
    expect(forbiddenWholeRead).not.toHaveBeenCalled();
    expect(slices.mock.calls.every(([from, to]) => (to ?? 0) - (from ?? 0) <= 1024 * 1024)).toBe(true);
    expect(progress).toHaveBeenLastCalledWith(bytes.length);
    const data = new Uint8Array(await archive.arrayBuffer()), view = new DataView(data.buffer);
    expect(view.getUint32(0, true)).toBe(0x04034b50);
    expect(view.getUint16(8, true)).toBe(0);
    expect(view.getUint32(14, true)).toBe(crc32(bytes));
    const start = 30 + view.getUint16(26, true);
    expect(Buffer.from(data.slice(start, start + bytes.length)).equals(Buffer.from(bytes))).toBe(true);
    expect(view.getUint32(data.length - 22, true)).toBe(0x06054b50);
    expect(Buffer.from(await (await packageLargeFile(original)).arrayBuffer()).equals(Buffer.from(data))).toBe(true);
    expect(archive.lastModified).toBe(original.lastModified);
  });

  it('uses 64-bit sizes and directory offsets for a 5 GiB original without allocating its payload', async () => {
    const size = 5 * 1024 * 1024 * 1024;
    const layout = storedZipLayout('large.bin', size, 123);
    const prefix = new DataView(await layout.prefix.arrayBuffer());
    const suffix = new DataView(await layout.suffix.arrayBuffer());
    expect(layout.prefix.size + layout.suffix.size).toBeLessThan(1024);
    expect(layout.size).toBe(size + layout.prefix.size + layout.suffix.size);
    expect(prefix.getUint16(4, true)).toBe(45);
    expect(prefix.getUint32(22, true)).toBe(0xffffffff);
    const nameSize = prefix.getUint16(26, true);
    expect(prefix.getBigUint64(30 + nameSize + 4, true)).toBe(BigInt(size));
    expect(suffix.getUint32(suffix.byteLength - 42, true)).toBe(0x07064b50);
    expect(suffix.getUint32(suffix.byteLength - 6, true)).toBe(0xffffffff);
  });

  it('rejects traversal and stops preparation when cancelled', async () => {
    expect(() => storedZipLayout('../bad.txt', 5, 0)).toThrow();
    const cancelled = new AbortController(); cancelled.abort();
    await expect(packageLargeFile(new File(['data'], 'ok.txt'), undefined, cancelled.signal)).rejects.toThrow();
    const duringRead = new AbortController();
    const file = new File([new Uint8Array(3 * 1024 * 1024)], 'cancel.txt');
    const slices = vi.spyOn(file, 'slice');
    await expect(packageLargeFile(file, () => duringRead.abort(), duringRead.signal)).rejects.toThrow();
    expect(slices).toHaveBeenCalledTimes(1);
  });
});
