import { Router } from "express";
import { TtsProvider } from "../tts/providers/types";

const router = Router();

function normalizeGender(g?: string) {
  const s = (g || "").toLowerCase();
  if (s === "male" || s === "m") return "Male";
  if (s === "female" || s === "f") return "Female";
  return "Unknown";
}

export function voicesRoutes(getProvider: () => Promise<TtsProvider>) {
  router.get("/voices", async (req, res, next) => {
    try {
      const lang = typeof req.query.lang === "string" ? req.query.lang : "pt-BR";

      const provider = await getProvider();
      const voices = await provider.listVoices(lang);

      const normalized = voices.map((v) => ({
        ...v,
        gender: normalizeGender(v.gender)
      }));

      const male = normalized.filter((v) => v.gender === "Male");
      const female = normalized.filter((v) => v.gender === "Female");

      res.json({
        provider: provider.name,
        lang,
        count: normalized.length,
        recommended: {
          male: male.slice(0, 2),
          female: female.slice(0, 2)
        },
        voices: normalized
      });
    } catch (e) {
      next(e);
    }
  });

  return router;
}
