export function folderNameCandidate(base: string, attempt: number): string {
  return attempt === 0 ? base : `${base} (${attempt})`;
}
