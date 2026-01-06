import path from "path";

export const config = {
  port: Number(process.env.PORT || 3000),

  // Provider: "stub" (default) | "google"
  ttsProvider: (process.env.TTS_PROVIDER || "stub").toLowerCase(),

  // Limits
  maxTextChars: Number(process.env.TTS_MAX_TEXT_CHARS || 20000),
  maxPauseMs: Number(process.env.TTS_MAX_PAUSE_MS || 10_000), // 10s por comando
  defaultSampleRate: Number(process.env.TTS_SAMPLE_RATE || 24000),

  // Storage
  storageDir: process.env.TTS_STORAGE_DIR || path.resolve(process.cwd(), "storage"),
  audioDirName: "audio",
  tmpDirName: "tmp",

  // TTL cleanup
  tmpTtlMs: Number(process.env.TTS_TMP_TTL_MS || 30 * 60_000), // 30 min
  audioTtlMs: Number(process.env.TTS_AUDIO_TTL_MS || 7 * 24 * 60 * 60_000), // 7 dias

  // Rate limit
  rateLimitWindowMs: Number(process.env.RL_WINDOW_MS || 60_000), // 1 min
  rateLimitMax: Number(process.env.RL_MAX || 20) // 20 req/min por IP
};
