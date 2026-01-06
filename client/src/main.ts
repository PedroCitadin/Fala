import "./style.css";

type TtsResponse = {
  id: string;
  audioUrl: string;
  format: "mp3" | "wav";
  bytes: number;
  durationSec: number | null;
  cached: boolean;
};

type VoicesResponse = {
  provider: string;
  lang: string;
  count: number;
  recommended?: {
    male?: { name: string; lang?: string; gender?: string }[];
    female?: { name: string; lang?: string; gender?: string }[];
  };
  voices?: { name: string; lang?: string; gender?: string }[];
};

const el = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

const textEl = el<HTMLTextAreaElement>("text");
const langEl = el<HTMLInputElement>("lang");

const voiceMaleEl = el<HTMLSelectElement>("voiceMale");
const voiceFemaleEl = el<HTMLSelectElement>("voiceFemale");
const voiceEl = el<HTMLInputElement>("voice"); // manual

const rateEl = el<HTMLInputElement>("rate");
const pitchEl = el<HTMLInputElement>("pitch");
const formatEl = el<HTMLSelectElement>("format");

const btn = el<HTMLButtonElement>("btn");
const statusEl = el<HTMLDivElement>("status");
const player = el<HTMLAudioElement>("player");
const download = el<HTMLAnchorElement>("download");
const meta = el<HTMLSpanElement>("meta");

const exampleBox = el<HTMLPreElement>("exampleBox");

const examples: Record<string, string> = {
  "1": `Olá! [[pause:1.5]] Eu sou um teste. [[voice:pt-BR-AntonioNeural]] Agora com voz masculina. [[voice:pt-BR-FranciscaNeural]] Agora com voz feminina. [[rate:1.2]] Mais rápido. [[pause_ms:300]] Fim.`,
  "2": `[[rate:0.9]] Texto mais lento... [[pause:1]] [[break]] Agora em outro trecho. [[pitch:5]] E com pitch mais alto.`,
  "3": `Você pode usar [[pause_ms:500]] pausas curtas, [[pause:2]] pausas longas (até 10s por comando), e [[break]] para quebrar segmentos.`
};

function setStatus(msg: string, isError = false) {
  statusEl.textContent = msg;
  statusEl.className = "status" + (isError ? " error" : "");
}

function formatBytes(bytes: number) {
  const units = ["B", "KB", "MB", "GB"];
  let i = 0;
  let v = bytes;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

function fillSelect(sel: HTMLSelectElement, items: { name: string }[], emptyLabel: string) {
  sel.innerHTML = "";
  if (!items.length) {
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = emptyLabel;
    sel.appendChild(opt);
    return;
  }
  for (const v of items) {
    const opt = document.createElement("option");
    opt.value = v.name;
    opt.textContent = v.name;
    sel.appendChild(opt);
  }
}

async function loadVoices() {
  try {
    const lang = langEl.value || "pt-BR";
    const r = await fetch(`/api/voices?lang=${encodeURIComponent(lang)}`);
    const data = (await r.json()) as VoicesResponse;

    const recMale = data?.recommended?.male ?? [];
    const recFemale = data?.recommended?.female ?? [];

    fillSelect(voiceMaleEl, recMale, "(nenhuma masculina encontrada)");
    fillSelect(voiceFemaleEl, recFemale, "(nenhuma feminina encontrada)");

    // defaults legais se existirem
    const preferMale = ["pt-BR-AntonioNeural", "pt-BR-DonatoNeural", "pt-BR-FabioNeural"];
    const preferFemale = ["pt-BR-FranciscaNeural", "pt-BR-BrendaNeural", "pt-BR-ThalitaMultilingualNeural"];

    for (const p of preferMale) {
      const found = Array.from(voiceMaleEl.options).find((o) => o.value === p);
      if (found) {
        voiceMaleEl.value = p;
        break;
      }
    }

    for (const p of preferFemale) {
      const found = Array.from(voiceFemaleEl.options).find((o) => o.value === p);
      if (found) {
        voiceFemaleEl.value = p;
        break;
      }
    }

    setStatus(`Vozes carregadas (${data.provider}).`);
  } catch {
    setStatus("Não consegui carregar vozes. (se o TTS estiver ok, ainda dá pra usar manual)", true);
  }
}

btn.addEventListener("click", async () => {
  try {
    setStatus("Gerando… (ondas sonoras não se fabricam sozinhas)");
    btn.disabled = true;

    const manual = voiceEl.value?.trim();
    const selectedVoice = manual || voiceMaleEl.value || voiceFemaleEl.value || undefined;

    const payload = {
      text: textEl.value,
      lang: langEl.value || undefined,
      voice: selectedVoice,
      rate: rateEl.value ? Number(rateEl.value) : undefined,
      pitch: pitchEl.value ? Number(pitchEl.value) : undefined,
      format: (formatEl.value as "mp3" | "wav") || "mp3"
    };

    const resp = await fetch("/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = (await resp.json()) as any;
    if (!resp.ok) {
      const msg = data?.error || "Erro ao gerar áudio.";
      const details = data?.details ? `\n\nDetalhes: ${JSON.stringify(data.details, null, 2)}` : "";
      throw new Error(msg + details);
    }

    const r = data as TtsResponse;

    player.src = r.audioUrl;
    download.href = r.audioUrl;
    download.download = `tts-${r.id}.${r.format}`;

    const dur = r.durationSec != null ? `${r.durationSec.toFixed(2)}s` : "n/d";
    meta.textContent = `Formato: ${r.format.toUpperCase()} | Tamanho: ${formatBytes(r.bytes)} | Duração: ${dur} | Cache: ${r.cached ? "sim" : "não"}`;

    setStatus("Pronto. Agora você tem um robô narrador particular.");
  } catch (e: any) {
    setStatus(e?.message || "Erro desconhecido.", true);
  } finally {
    btn.disabled = false;
  }
});

// exemplos
document.querySelectorAll<HTMLButtonElement>(".ex").forEach((b) => {
  b.addEventListener("click", () => {
    const k = b.dataset.example || "1";
    const t = examples[k] || examples["1"];
    textEl.value = t;
    exampleBox.textContent = t;
    setStatus("Exemplo carregado.");
  });
});

langEl.addEventListener("change", () => {
  void loadVoices();
});

// inicial
exampleBox.textContent = examples["1"];
textEl.value = examples["1"];
void loadVoices();
