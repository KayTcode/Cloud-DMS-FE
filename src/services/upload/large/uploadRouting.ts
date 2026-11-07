export const LARGE_FILE_THRESHOLD_BYTES = 104857600;

export interface SelectedEntry {
  size: number;
  relativePath: string;
}

export type UploadPlan =
  | { mode: 'zip-single' }
  | { mode: 'large-single' }
  | { mode: 'zip-package' }
  | {
      mode: 'tree';
      root: string | null;
      folders: string[];
      items: { index: number; relativePath: string; route: 'zip-file' | 'large' }[];
    };

const TREE_ITEM_COUNT_THRESHOLD = 1000;

function parentFolders(relativePath: string): string[] {
  const segments = relativePath.split('/');
  segments.pop();
  const folders: string[] = [];
  let current = '';
  for (const segment of segments) {
    current = current ? `${current}/${segment}` : segment;
    folders.push(current);
  }
  return folders;
}

function buildTreePlan(entries: SelectedEntry[], directories: string[]): UploadPlan {
  const folderSet = new Set<string>();

  for (const entry of entries) {
    for (const folder of parentFolders(entry.relativePath)) {
      folderSet.add(folder);
    }
  }
  for (const dir of directories) {
    folderSet.add(dir);
  }

  const folders = Array.from(folderSet).sort((a, b) => {
    const depthA = a.split('/').length;
    const depthB = b.split('/').length;
    if (depthA !== depthB) return depthA - depthB;
    return a.localeCompare(b);
  });

  let root: string | null = null;
  const topLevelRoots = new Set<string>();
  for (const entry of entries) {
    const top = entry.relativePath.split('/')[0];
    topLevelRoots.add(top);
  }
  for (const dir of directories) {
    const top = dir.split('/')[0];
    topLevelRoots.add(top);
  }
  if (topLevelRoots.size === 1) {
    const [only] = Array.from(topLevelRoots);
    if (folders.includes(only)) {
      root = only;
    }
  }

  const items = entries.map((entry, index) => ({
    index,
    relativePath: entry.relativePath,
    route: (entry.size > LARGE_FILE_THRESHOLD_BYTES ? 'large' : 'zip-file') as 'zip-file' | 'large',
  }));

  return { mode: 'tree', root, folders, items };
}

export function planUpload(entries: SelectedEntry[], directories: string[] = []): UploadPlan {
  const hasFolderStructure =
    directories.length > 0 || entries.some((entry) => entry.relativePath.includes('/'));

  if (hasFolderStructure) {
    return buildTreePlan(entries, directories);
  }

  if (entries.length > TREE_ITEM_COUNT_THRESHOLD) {
    return buildTreePlan(entries, directories);
  }

  const totalSize = entries.reduce((sum, entry) => sum + entry.size, 0);
  if (entries.length > 1 && totalSize > LARGE_FILE_THRESHOLD_BYTES) {
    return buildTreePlan(entries, directories);
  }

  if (entries.length === 1) {
    const [only] = entries;
    return only.size > LARGE_FILE_THRESHOLD_BYTES ? { mode: 'large-single' } : { mode: 'zip-single' };
  }

  return { mode: 'zip-package' };
}
