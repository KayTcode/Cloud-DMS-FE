// The modern directory picker includes empty directories; webkitdirectory is a fallback.
export async function pickDirectory(
  fallback: () => void,
  selected: (files: FileList, directories: string[]) => void,
  failed: (message: string) => void,
): Promise<void> {
  const picker = (window as any).showDirectoryPicker;
  if (!picker) { fallback(); return; }
  try {
    const root = await picker.call(window, { mode: 'read' });
    const transfer = new DataTransfer();
    const directories: string[] = [];
    let total = 0;
    const visit = async (directory: any, path: string): Promise<void> => {
      directories.push(path);
      if (directories.length > 2000 || path.length > 512) throw new Error('Cấu trúc thư mục vượt giới hạn gói ZIP.');
      for await (const [name, handle] of directory.entries()) {
        const relative = `${path}/${name}`;
        if (handle.kind === 'directory') await visit(handle, relative);
        else {
          const file: File = await handle.getFile();
          total += file.size;
          if (transfer.files.length >= 1000 || total > 100 * 1024 * 1024) throw new Error('Gói ZIP giới hạn 1000 tệp và 100 MiB dữ liệu.');
          const withPath = new File([file], file.name, { type: file.type, lastModified: file.lastModified });
          Object.defineProperty(withPath, 'webkitRelativePath', { value: relative });
          transfer.items.add(withPath);
        }
      }
    };
    await visit(root, root.name);
    selected(transfer.files, directories);
  } catch (error) {
    if ((error as any)?.name !== 'AbortError') failed(error instanceof Error ? error.message : 'Không thể đọc thư mục.');
  }
}
