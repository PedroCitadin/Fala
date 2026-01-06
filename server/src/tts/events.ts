export type TtsConfigState = {
  lang?: string;
  voice?: string;
  rate?: number;
  pitch?: number;
};

export type SpeakEvent = {
  type: "SPEAK";
  text: string;
  state: TtsConfigState;
};

export type PauseEvent = {
  type: "PAUSE";
  ms: number;
};

export type BreakEvent = {
  type: "BREAK";
};

export type TtsEvent = SpeakEvent | PauseEvent | BreakEvent;
