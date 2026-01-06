import { Router } from "express";
import { readMeta, getAudioPathFromMeta } from "../tts/cache";
import { HttpError } from "../utils/errors";
import { fileExists } from "../utils/fs";

const router = Router();

export function audioRoutes() {
  router.get("/audio/:id", async (req, res, next) => {
    try {
      const id = String(req.params.id || "").trim();
      if (!id || id.length < 10) throw new HttpError(400, "id inválido.");

      const meta = await readMeta(id);
      if (!meta) throw new HttpError(404, "Áudio não encontrado.");

      const p = await getAudioPathFromMeta(meta);
      if (!(await fileExists(p))) throw new HttpError(404, "Arquivo de áudio não encontrado no disco.");

      if (meta.format === "mp3") res.type("audio/mpeg");
      else res.type("audio/wav");

      res.setHeader("Content-Disposition", `inline; filename="${meta.fileName}"`);
      return res.sendFile(p);
    } catch (err) {
      next(err);
    }
  });

  return router;
}
