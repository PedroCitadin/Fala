import fs from "fs/promises";
import path from "path";

export async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true });
}

export async function fileExists(p: string): Promise<boolean> {
  try {
    await fs.stat(p);
    return true;
  } catch {
    return false;
  }
}

export function safeJoin(base: string, ...parts: string[]) {
  const resolved = path.resolve(base, ...parts);
  const baseResolved = path.resolve(base);
  if (!resolved.startsWith(baseResolved)) {
    throw new Error("Path traversal detected");
  }
  return resolved;
}
