import path from "path";
import { TtsProvider, ProviderVoice, SynthesizeInput, SynthesizeOutput } from "./types";
import { ffmpeg } from "../../utils/ffmpeg";
import { ensureDir } from "../../utils/fs";

/**
 * Provider stub: NÃO faz TTS real.
 * Gera WAV silencioso com duração aproximada (baseada no texto),
 * só para testar pipeline end-to-end (parse, concat, download etc).
 */
export class StubTtsProvider implements TtsProvider {
  name = "stub";

  async listVoices(_langHint?: string): Promise<ProviderVoice[]> {
    return [
      { name: "stub-pt-1", lang: "pt-BR" },
      { name: "stub-en-1", lang: "en-US" },
      { name: "stub-es-1", lang: "es-ES" }
    ];
  }

  private estimateDurationSec(text: string, rate: number | undefined) {
    // Aproximação grosseira: 150 wpm ~ 2.5 wps
    // Ajusta por rate (maior rate => menor duração)
    const words = text.trim().split(/\s+/).filter(Boolean).length;
    const baseWps = 2.5;
    const r = rate && rate > 0 ? rate : 1.0;
    const sec = Math.max(0.2, words / (baseWps * r));
    return sec;
  }

  async synthesizeToFile(input: SynthesizeInput): Promise<SynthesizeOutput> {
    const outDir = path.dirname(input.text); // (não usado)
    void outDir;

    const duration = this.estimateDurationSec(input.text, input.state.rate);
    const outPath = path.resolve(process.cwd(), "storage", "tmp", `stub-${Date.now()}-${Math.random().toString(16).slice(2)}.wav`);
    await ensureDir(path.dirname(outPath));

    // Silêncio WAV mono PCM 16-bit
    await ffmpeg([
      "-f",
      "lavfi",
      "-i",
      `anullsrc=r=${input.sampleRateHz}:cl=mono`,
      "-t",
      duration.toFixed(3),
      "-ac",
      "1",
      "-ar",
      String(input.sampleRateHz),
      "-c:a",
      "pcm_s16le",
      outPath
    ]);

    return { filePath: outPath, format: "wav" };
  }
}
