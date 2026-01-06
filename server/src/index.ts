import express from "express";
import cors from "cors";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import path from "path";
import fs from "fs/promises";

import { config } from "./config";
import { HttpError } from "./utils/errors";
import { initStorage, tmpDir, audioDir } from "./tts/cache";
import { ttsRoutes } from "./routes/tts";
import { audioRoutes } from "./routes/audio";
import { voicesRoutes } from "./routes/voices";

import { TtsProvider } from "./tts/providers/types";
import { StubTtsProvider } from "./tts/providers/stubProvider";

import { EdgeTtsProvider } from "./tts/providers/edgeProvider";

async function createProvider(): Promise<TtsProvider> {
  const p = config.ttsProvider;

  
  if (p === "edge") return new EdgeTtsProvider();

  return new StubTtsProvider();
}

async function cleanupOldFiles(dir: string, ttlMs: number, extensions?: string[]) {
  try {
    const now = Date.now();
    const items = await fs.readdir(dir);
    await Promise.allSettled(
      items.map(async (name) => {
        if (extensions && !extensions.some((ext) => name.endsWith(ext))) return;
        const full = path.join(dir, name);
        try {
          const st = await fs.stat(full);
          if (!st.isFile()) return;
          if (now - st.mtimeMs > ttlMs) {
            await fs.unlink(full);
          }
        } catch {}
      })
    );
  } catch {}
}

async function scheduleCleanup() {
  setInterval(() => {
    void cleanupOldFiles(tmpDir(), config.tmpTtlMs);
  }, 5 * 60_000).unref();

  setInterval(() => {
    void cleanupOldFiles(audioDir(), config.audioTtlMs, [".mp3", ".wav", ".json"]);
  }, 60 * 60_000).unref();
}

async function main() {
  await initStorage();
  await scheduleCleanup();

  const app = express();

  app.use(
    cors({
      origin: true,
      credentials: true
    })
  );

  app.use(morgan("dev"));

  app.use(
    rateLimit({
      windowMs: config.rateLimitWindowMs,
      limit: config.rateLimitMax,
      standardHeaders: "draft-7",
      legacyHeaders: false
    })
  );

  app.use(express.json({ limit: "1mb" }));

  // Provider lazy singleton
  let providerPromise: Promise<TtsProvider> | null = null;
  const getProvider = async () => {
    if (!providerPromise) providerPromise = createProvider();
    return providerPromise;
  };

  app.get("/health", async (_req, res) => {
    const provider = await getProvider();
    res.json({ ok: true, provider: provider.name });
  });

  app.use("/api", ttsRoutes(getProvider));
  app.use("/api", voicesRoutes(getProvider));
  app.use("/", audioRoutes());

  // Serve client build em produção (em dev o Vite serve no :5173)
  const clientDist = path.resolve(process.cwd(), "../client/dist");
  app.use(express.static(clientDist));
  app.get("/", (_req, res) => res.sendFile(path.join(clientDist, "index.html")));

  // Error handler
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((err: any, _req: any, res: any, _next: any) => {
    const status = err instanceof HttpError ? err.status : 500;
    const message = err instanceof HttpError ? err.message : "Erro interno.";
    const details = err instanceof HttpError ? err.details : { raw: String(err?.message || err) };

    res.status(status).json({
      error: message,
      status,
      details
    });
  });

  app.listen(config.port, () => {
    console.log(`[server] http://localhost:${config.port} (provider=${config.ttsProvider})`);
  });
}

void main().catch((e) => {
  console.error(e);
  process.exit(1);
});
