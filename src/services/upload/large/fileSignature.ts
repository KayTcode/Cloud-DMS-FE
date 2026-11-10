function matches(head: Uint8Array, bytes: (number | null)[]): boolean {
  if (head.length < bytes.length) return false;
  for (let i = 0; i < bytes.length; i++) {
    const expected = bytes[i];
    if (expected === null) continue;
    if (head[i] !== expected) return false;
  }
  return true;
}

export function detectBlockedSignature(head: Uint8Array): string | null {
  // PE (Windows executable): MZ
  if (matches(head, [0x4d, 0x5a])) return 'PE';

  // ELF (Linux executable)
  if (matches(head, [0x7f, 0x45, 0x4c, 0x46])) return 'ELF';

  // Mach-O (macOS executable)
  if (
    matches(head, [0xfe, 0xed, 0xfa, 0xce]) ||
    matches(head, [0xfe, 0xed, 0xfa, 0xcf]) ||
    matches(head, [0xce, 0xfa, 0xed, 0xfe]) ||
    matches(head, [0xcf, 0xfa, 0xed, 0xfe])
  ) {
    return 'Mach-O';
  }

  // Shell script shebang
  if (matches(head, [0x23, 0x21])) return 'Script';

  // MSI / OLE compound file (D0 CF 11 E0 ...). Server-side layer makes the real decision for .msi.
  if (matches(head, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])) return 'MSI';

  return null;
}
