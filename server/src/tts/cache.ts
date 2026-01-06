import path from "path";
import fs from "fs/promises";
import { ensureDir, fileExists, safeJoin } from "../utils/fs";
import { config } from "../config";

export type CacheMeta = {
  id: string;
  format: "mp3" | "wav";
  fileName: string; // ex: <id>.mp3
  createdAt: number;
  bytes: number;
  durationSec: number | null;
};

export function audioDir() {
  return path.join(config.storageDir, config.audioDirName);
}

export function tmpDir() {
  return path.join(config.storageDir, config.tmpDirName);
}

export async function initStorage() {
  await ensureDir(audioDir());
  await ensureDir(tmpDir());
}

export async function readMeta(id: string): Promise<CacheMeta | null> {
  const metaPath = safeJoin(audioDir(), `${id}.json`);
  if (!(await fileExists(metaPath))) return null;
  const raw = await fs.readFile(metaPath, "utf8");
  return JSON.parse(raw) as CacheMeta;
}

export async function writeMeta(meta: CacheMeta) {
  const metaPath = safeJoin(audioDir(), `${meta.id}.json`);
  await fs.writeFile(metaPath, JSON.stringify(meta, null, 2), "utf8");
}

export async function getAudioPathFromMeta(meta: CacheMeta): Promise<string> {
  return safeJoin(audioDir(), meta.fileName);
}
