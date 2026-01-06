import { spawn } from "child_process";
import fs from "fs/promises";

function run(cmd: string, args: string[]): Promise<{ code: number; stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";

    p.stdout.on("data", (d) => (stdout += d.toString()));
    p.stderr.on("data", (d) => (stderr += d.toString()));

    p.on("error", reject);
    p.on("close", (code) => resolve({ code: code ?? 0, stdout, stderr }));
  });
}

export async function ffmpeg(args: string[]): Promise<void> {
  const res = await run("ffmpeg", ["-y", ...args]);
  if (res.code !== 0) {
    throw new Error(`ffmpeg falhou (code ${res.code}): ${res.stderr || res.stdout}`);
  }
}

export async function ffprobeDurationSec(filePath: string): Promise<number | null> {
  try {
    const res = await run("ffprobe", [
      "-v",
      "error",
      "-show_entries",
      "format=duration",
      "-of",
      "default=noprint_wrappers=1:nokey=1",
      filePath
    ]);
    if (res.code !== 0) return null;
    const v = parseFloat(res.stdout.trim());
    return Number.isFinite(v) ? v : null;
  } catch {
    return null;
  }
}

export async function writeConcatList(listPath: string, files: string[]) {
  // concat demuxer precisa de um arquivo texto com "file '...'"
  const lines = files.map((f) => `file '${f.replace(/'/g, "'\\''")}'`).join("\n");
  await fs.writeFile(listPath, lines, "utf8");
}
