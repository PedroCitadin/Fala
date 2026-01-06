import { TtsConfigState } from "../events";

export type ProviderVoice = {
  name: string;
  lang?: string;
  gender?: string;
};

export type SynthesizeInput = {
  text: string;
  state: TtsConfigState;
  // O pipeline vai normalizar para WAV PCM, então aqui tanto faz,
  // mas deixamos para provider que já gera WAV direto.
  preferredFormat: "mp3" | "wav";
  sampleRateHz: number;
};

export type SynthesizeOutput = {
  filePath: string;
  format: "mp3" | "wav";
};

export interface TtsProvider {
  name: string;

  listVoices(langHint?: string): Promise<ProviderVoice[]>;

  synthesizeToFile(input: SynthesizeInput): Promise<SynthesizeOutput>;
}
