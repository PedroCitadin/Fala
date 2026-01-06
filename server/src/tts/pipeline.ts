import path from "path";
import fs from "fs/promises";
import { TtsEvent } from "./events";
import { TtsProvider } from "./providers/types";
import { tmpDir, audioDir, writeMeta, CacheMeta } from "./cache";
import { ensureDir, safeJoin } from "../utils/fs";
import { ffmpeg, ffprobeDurationSec, writeConcatList } from "../utils/ffmpeg";
import { HttpError } from "../utils/errors";

type PipelineInput = {
  id: string;
  provider: TtsProvider;
  events: TtsEvent[];
  preferredFormat: "mp3" | "wav";
  sampleRateHz: number;
};

async function normalizeToWav(inputPath: string, outPath: string, sampleRateHz: number) {
  await ffmpeg([
    "-i",
    inputPath,
    "-ac",
    "1",
    "-ar",
    String(sampleRateHz),
    "-c:a",
    "pcm_s16le",
    outPath
  ]);
}

async function makeSilenceWav(outPath: string, ms: number, sampleRateHz: number) {
  const sec = (ms / 1000).toFixed(3);
  await ffmpeg([
    "-f",
    "lavfi",
    "-i",
    `anullsrc=r=${sampleRateHz}:cl=mono`,
    "-t",
    sec,
    "-ac",
    "1",
    "-ar",
    String(sampleRateHz),
    "-c:a",
    "pcm_s16le",
    outPath
  ]);
}

export async function runTtsPipeline(input: PipelineInput): Promise<{ meta: CacheMeta; audioPath: string }> {
  if (input.events.length === 0) {
    throw new HttpError(400, "Texto vazio (ou só espaços/comandos). Nada para sintetizar.");
  }

  await ensureDir(tmpDir());
  await ensureDir(audioDir());

  // 1) Valida vozes usadas (se provider quiser ser chato)
  // Pegamos todas as vozes mencionadas nos states e conferimos se existem.
  const voicesUsed = Array.from(
    new Set(
      input.events
        .filter((e) => e.type === "SPEAK")
        .map((e) => (e.type === "SPEAK" ? e.state.voice : undefined))
        .filter((v): v is string => !!v)
    )
  );

  if (voicesUsed.length > 0) {
    const listed = await input.provider.listVoices().catch(() => []);
    if (listed.length > 0) {
      const names = new Set(listed.map((v) => v.name));
      const missing = voicesUsed.filter((v) => !names.has(v));
      if (missing.length > 0) {
        throw new HttpError(400, `Voz(es) não encontrada(s) no provider "${input.provider.name}": ${missing.join(", ")}`, {
          availableVoicesSample: listed.slice(0, 50)
        });
      }
    }
  }

  // 2) Para cada evento, gerar WAV padronizado (pcm_s16le, mono, sampleRateHz)
  const wavParts: string[] = [];
  const createdTmpFiles: string[] = [];

  try {
    let idx = 0;

    for (const ev of input.events) {
      idx++;

      if (ev.type === "SPEAK") {
        const synth = await input.provider.synthesizeToFile({
          text: ev.text,
          state: ev.state,
          preferredFormat: input.preferredFormat,
          sampleRateHz: input.sampleRateHz
        });

        createdTmpFiles.push(synth.filePath);

        const wavPath = safeJoin(tmpDir(), `${input.id}-part-${idx}.wav`);
        await normalizeToWav(synth.filePath, wavPath, input.sampleRateHz);
        wavParts.push(wavPath);
        createdTmpFiles.push(wavPath);
      }

      if (ev.type === "PAUSE") {
        const wavPath = safeJoin(tmpDir(), `${input.id}-pause-${idx}.wav`);
        await makeSilenceWav(wavPath, ev.ms, input.sampleRateHz);
        wavParts.push(wavPath);
        createdTmpFiles.push(wavPath);
      }

      if (ev.type === "BREAK") {
        // BREAK em si não gera áudio: ele serve para chunking.
        // Nosso parser já "flushou" SPEAK antes do BREAK.
        continue;
      }
    }

    if (wavParts.length === 0) {
      throw new HttpError(400, "Nada gerado após processar eventos.");
    }

    // 3) Concatenar WAVs com concat demuxer (todos com mesmo codec)
    const listPath = safeJoin(tmpDir(), `${input.id}-concat.txt`);
    await writeConcatList(listPath, wavParts);
    createdTmpFiles.push(listPath);

    const combinedWav = safeJoin(tmpDir(), `${input.id}-combined.wav`);
    await ffmpeg(["-f", "concat", "-safe", "0", "-i", listPath, "-c", "copy", combinedWav]);
    createdTmpFiles.push(combinedWav);

    // 4) Gerar output final (mp3 ou wav)
    const finalFormat = input.preferredFormat;
    const finalFileName = `${input.id}.${finalFormat}`;
    const finalPath = safeJoin(audioDir(), finalFileName);

    if (finalFormat === "wav") {
      await fs.copyFile(combinedWav, finalPath);
    } else {
      // MP3
      await ffmpeg(["-i", combinedWav, "-codec:a", "libmp3lame", "-b:a", "192k", finalPath]);
    }

    const stat = await fs.stat(finalPath);
    const durationSec = await ffprobeDurationSec(finalPath);

    const meta: CacheMeta = {
      id: input.id,
      format: finalFormat,
      fileName: finalFileName,
      createdAt: Date.now(),
      bytes: stat.size,
      durationSec
    };

    await writeMeta(meta);

    return { meta, audioPath: finalPath };
  } finally {
    // limpeza de tmp do job (mantém o final no cache)
    // se der erro no meio, ainda assim remove o máximo que conseguir.
    await Promise.allSettled(
      createdTmpFiles.map(async (p) => {
        try {
          await fs.unlink(p);
        } catch {}
      })
    );
  }
}
