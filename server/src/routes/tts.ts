import { Router } from "express";
import { z } from "zod";
import { config } from "../config";
import { HttpError } from "../utils/errors";
import { sha256Hex } from "../utils/hash";
import { parseTextToEvents } from "../tts/parser";
import { readMeta, getAudioPathFromMeta } from "../tts/cache";
import { runTtsPipeline } from "../tts/pipeline";
import { TtsProvider } from "../tts/providers/types";
import { fileExists } from "../utils/fs";

const router = Router();

const BodySchema = z.object({
  text: z.string(),
  voice: z.string().optional(),
  lang: z.string().optional(),
  rate: z.number().optional(),
  pitch: z.number().optional(),
  format: z.enum(["mp3", "wav"]).optional()
});

export function ttsRoutes(getProvider: () => Promise<TtsProvider>) {
  router.post("/tts", async (req, res, next) => {
    try {
      const body = BodySchema.parse(req.body);

      if (!body.text || body.text.trim().length === 0) {
        throw new HttpError(400, "text é obrigatório.");
      }
      if (body.text.length > config.maxTextChars) {
        throw new HttpError(413, `Texto grande demais. Limite: ${config.maxTextChars} caracteres.`);
      }

      const preferredFormat = body.format ?? "mp3";

      // Parse com comandos
      const events = parseTextToEvents(body.text, { maxPauseMs: config.maxPauseMs });

      // Aplica defaults iniciais (body params) como "estado base" antes de comandos.
      // Para isso, a gente injeta no começo dos SPEAKs que não definiram algo.
      // Simples: ao gerar ID/caching, incluímos esses defaults também.
      // O provider recebe state por SPEAK já com o que o parser definiu.
      // Aqui, fazemos merge de defaults no state de cada SPEAK (sem sobrescrever comandos).
      const mergedEvents = events.map((e) => {
        if (e.type !== "SPEAK") return e;
        return {
          ...e,
          state: {
            lang: e.state.lang ?? body.lang,
            voice: e.state.voice ?? body.voice,
            rate: e.state.rate ?? body.rate,
            pitch: e.state.pitch ?? body.pitch
          }
        };
      });

      // Cache key (inclui provider, formato e eventos)
      const provider = await getProvider();
      const cacheKeyObj = {
        provider: provider.name,
        preferredFormat,
        sampleRateHz: config.defaultSampleRate,
        events: mergedEvents
      };
      const id = sha256Hex(JSON.stringify(cacheKeyObj));

      // Se existir no cache e arquivo presente, retorna
      const cached = await readMeta(id);
      if (cached) {
        const p = await getAudioPathFromMeta(cached);
        if (await fileExists(p)) {
          return res.json({
            id,
            audioUrl: `/audio/${id}`,
            format: cached.format,
            bytes: cached.bytes,
            durationSec: cached.durationSec,
            cached: true
          });
        }
      }

      // Rodar pipeline
      const result = await runTtsPipeline({
        id,
        provider,
        events: mergedEvents,
        preferredFormat,
        sampleRateHz: config.defaultSampleRate
      });

      return res.json({
        id,
        audioUrl: `/audio/${id}`,
        format: result.meta.format,
        bytes: result.meta.bytes,
        durationSec: result.meta.durationSec,
        cached: false
      });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
