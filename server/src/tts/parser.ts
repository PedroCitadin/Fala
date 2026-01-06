import { HttpError } from "../utils/errors";
import { TtsEvent, TtsConfigState } from "./events";

type ParseOptions = {
  maxPauseMs: number;
};

function clampOrThrowRate(v: number) {
  if (!Number.isFinite(v) || v < 0.5 || v > 2.0) {
    throw new HttpError(400, `rate inválido: ${v}. Faixa permitida: 0.5 a 2.0`);
  }
}

function clampOrThrowPitch(v: number) {
  if (!Number.isFinite(v) || v < -20 || v > 20) {
    throw new HttpError(400, `pitch inválido: ${v}. Faixa típica permitida: -20 a +20`);
  }
}

function parsePauseMs(raw: string, maxPauseMs: number): number {
  const ms = Number(raw);
  if (!Number.isFinite(ms) || ms <= 0) {
    throw new HttpError(400, `pause_ms inválido: ${raw}`);
  }
  if (ms > maxPauseMs) {
    throw new HttpError(400, `pause_ms excede o limite de ${maxPauseMs}ms: ${ms}ms`);
  }
  return Math.round(ms);
}

function parsePauseSec(raw: string, maxPauseMs: number): number {
  const sec = Number(raw);
  if (!Number.isFinite(sec) || sec <= 0) {
    throw new HttpError(400, `pause inválido: ${raw}`);
  }
  const ms = Math.round(sec * 1000);
  if (ms > maxPauseMs) {
    throw new HttpError(400, `pause excede o limite de ${(maxPauseMs / 1000).toFixed(2)}s: ${sec}s`);
  }
  return ms;
}

function isOnlyWhitespace(s: string) {
  return s.trim().length === 0;
}

/**
 * Faz parse de texto e comandos [[...]].
 * Regras:
 * - Comandos alteram o estado para SPEAK subsequentes
 * - [[break]] força flush do buffer atual em um SPEAK
 */
export function parseTextToEvents(input: string, opts: ParseOptions): TtsEvent[] {
  const events: TtsEvent[] = [];
  let state: TtsConfigState = {};
  let buffer = "";

  const flushSpeak = () => {
    const text = buffer;
    buffer = "";
    if (!isOnlyWhitespace(text)) {
      events.push({ type: "SPEAK", text: text.trim(), state: { ...state } });
    }
  };

  // Match [[...]]
  const re = /\[\[([\s\S]*?)\]\]/g;
  let lastIndex = 0;
  let m: RegExpExecArray | null;

  while ((m = re.exec(input)) !== null) {
    const before = input.slice(lastIndex, m.index);
    buffer += before;

    const inside = (m[1] ?? "").trim();
    lastIndex = re.lastIndex;

    // process command
    const lower = inside.toLowerCase();

    if (lower === "break") {
      flushSpeak();
      events.push({ type: "BREAK" });
      continue;
    }

    const colonIdx = inside.indexOf(":");
    if (colonIdx === -1) {
      throw new HttpError(400, `Comando inválido: [[${inside}]]. Esperado "cmd:valor" ou "break".`);
    }

    const cmd = inside.slice(0, colonIdx).trim().toLowerCase();
    const val = inside.slice(colonIdx + 1).trim();

    switch (cmd) {
      case "pause": {
        flushSpeak();
        events.push({ type: "PAUSE", ms: parsePauseSec(val, opts.maxPauseMs) });
        break;
      }
      case "pause_ms": {
        flushSpeak();
        events.push({ type: "PAUSE", ms: parsePauseMs(val, opts.maxPauseMs) });
        break;
      }
      case "voice": {
        flushSpeak();
        if (!val) throw new HttpError(400, `voice vazio em [[voice:...]]`);
        state = { ...state, voice: val };
        break;
      }
      case "rate": {
        flushSpeak();
        const n = Number(val);
        clampOrThrowRate(n);
        state = { ...state, rate: n };
        break;
      }
      case "pitch": {
        flushSpeak();
        const n = Number(val);
        clampOrThrowPitch(n);
        state = { ...state, pitch: n };
        break;
      }
      default:
        throw new HttpError(400, `Comando desconhecido: [[${inside}]]`);
    }
  }

  buffer += input.slice(lastIndex);
  flushSpeak();

  return events;
}
