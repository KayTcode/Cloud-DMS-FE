export interface SavedSession {
  sessionId: string;
  fileName: string;
  size: number;
  lastModified: number;
  partSizeBytes: number;
  fingerprint: string;
  folderId: string | null;
  savedAt: number;
}

const MIB = 1024 * 1024;

/**
 * SHA-256 of slice(0, 1MiB) ++ slice(size - 1MiB). Files under 2MiB are hashed whole,
 * since the two 1MiB windows would otherwise overlap or exceed the file.
 */
export async function fingerprintFile(file: Blob, sha256Hex: (b: Blob) => Promise<string>): Promise<string> {
  if (file.size < 2 * MIB) {
    return sha256Hex(file);
  }
  const head = file.slice(0, MIB);
  const tail = file.slice(file.size - MIB, file.size);
  const combined = new Blob([head, tail]);
  return sha256Hex(combined);
}

export function matchesSaved(
  saved: SavedSession,
  candidate: { name: string; size: number; lastModified: number },
  candidateFingerprint: string
): boolean {
  return (
    saved.fileName === candidate.name &&
    saved.size === candidate.size &&
    saved.lastModified === candidate.lastModified &&
    saved.fingerprint === candidateFingerprint
  );
}
