import path from "path";
import { ensureDir } from "../../utils/fs";
import { HttpError } from "../../utils/errors";
import { TtsProvider, ProviderVoice, SynthesizeInput, SynthesizeOutput } from "./types";

import { EdgeTTS, Constants } from "@andresaya/edge-tts";

export class EdgeTtsProvider implements TtsProvider {
  name = "edge";

  async listVoices(langHint?: string): Promise<ProviderVoice[]> {
    const tts = new EdgeTTS();
    const voices = await tts.getVoices();

    return voices
      .filter((v: any) => !langHint || String(v.Locale || "").startsWith(langHint))
      .map((v: any) => ({
        name: v.ShortName,
        lang: v.Locale,
        gender: v.Gender
      }));
  }

  async synthesizeToFile(input: SynthesizeInput): Promise<SynthesizeOutput> {
    const tts = new EdgeTTS();

    const voice = input.state.voice || "pt-BR-AntonioNeural";
    const rate = input.state.rate ?? 1.0;
    const pitch = input.state.pitch ?? 0;

    const wantWav = input.preferredFormat === "wav";

    const outBase = path.resolve(
      process.cwd(),
      "storage",
      "tmp",
      `edge-${Date.now()}-${Math.random().toString(16).slice(2)}`
    );
    await ensureDir(path.dirname(outBase));

    // EdgeTTS aceita rate tipo "-10%" / "+50%" e pitch tipo "+10Hz"
    const ratePct = Math.round((rate - 1) * 100);
    const rateStr = `${ratePct >= 0 ? "+" : ""}${ratePct}%`;
    const pitchStr = `${pitch >= 0 ? "+" : ""}${pitch}Hz`;

    try {
      await tts.synthesize(input.text, voice, {
        rate: rateStr,
        pitch: pitchStr,
        outputFormat: wantWav
          ? Constants.OUTPUT_FORMAT.RIFF_24KHZ_16BIT_MONO_PCM
          : Constants.OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3
      });

      // toFile adiciona extensão automaticamente (mp3/wav) :contentReference[oaicite:2]{index=2}
      const filePath: string = await tts.toFile(outBase);

      const info = tts.getAudioInfo?.(); // size/format/duração estimada :contentReference[oaicite:3]{index=3}
      const format = wantWav ? "wav" : "mp3";

      return {
        filePath,
        format,
        bytes: info?.size
      } as any;
    } catch (e: any) {
      const sample = await this.listVoices("pt-BR").catch(() => []);
      throw new HttpError(400, `Falha ao sintetizar com Edge TTS: ${e?.message || String(e)}`, {
        voicesSample: sample.slice(0, 25),
        usedVoice: voice,
        usedRate: rateStr,
        usedPitch: pitchStr
      });
    }
  }
}
