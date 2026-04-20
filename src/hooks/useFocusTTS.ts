import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

/**
 * Singleton TTS controller built on top of window.speechSynthesis.
 * - Splits text into sentences for skip + progress.
 * - Auto-picks first pt-BR voice.
 * - Persists rate in localStorage[focus-tts-rate].
 * - Exposes state via subscribe pattern so multiple components stay in sync.
 */

export type FocusTTSRate = 0.85 | 1 | 1.15 | 1.3;

interface State {
  playingId: string | null;
  label: string | null;
  isPaused: boolean;
  rate: FocusTTSRate;
  // 0..1 fraction completed (sentence-level)
  progress: number;
  sentenceIdx: number;
  totalSentences: number;
}

const RATE_KEY = "focus-tts-rate";

function loadRate(): FocusTTSRate {
  try {
    const v = parseFloat(localStorage.getItem(RATE_KEY) || "1");
    if ([0.85, 1, 1.15, 1.3].includes(v)) return v as FocusTTSRate;
  } catch {}
  return 1;
}

let state: State = {
  playingId: null,
  label: null,
  isPaused: false,
  rate: typeof window !== "undefined" ? loadRate() : 1,
  progress: 0,
  sentenceIdx: 0,
  totalSentences: 0,
};

const listeners = new Set<() => void>();

function emit() {
  // Create a new reference so useSyncExternalStore detects the change
  state = { ...state };
  listeners.forEach((l) => l());
}

function setState(patch: Partial<State>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function getSnapshot(): State {
  return state;
}

function getServerSnapshot(): State {
  return state;
}

// ---- internal queue / playback ----
let queue: string[] = [];
let cursor = 0;
let voicesCache: SpeechSynthesisVoice[] = [];
let currentUtterance: SpeechSynthesisUtterance | null = null;

function pickVoice(): SpeechSynthesisVoice | undefined {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return undefined;
  if (voicesCache.length === 0) {
    voicesCache = window.speechSynthesis.getVoices();
  }
  return (
    voicesCache.find((v) => v.lang?.toLowerCase().startsWith("pt-br")) ||
    voicesCache.find((v) => v.lang?.toLowerCase().startsWith("pt")) ||
    voicesCache[0]
  );
}

if (typeof window !== "undefined" && "speechSynthesis" in window) {
  // Voices may load async
  window.speechSynthesis.onvoiceschanged = () => {
    voicesCache = window.speechSynthesis.getVoices();
  };
}

function splitSentences(text: string): string[] {
  return text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?;])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function speakNext() {
  if (typeof window === "undefined") return;
  const synth = window.speechSynthesis;
  if (cursor >= queue.length) {
    // finished
    state.playingId = null;
    state.label = null;
    state.isPaused = false;
    state.progress = 1;
    currentUtterance = null;
    emit();
    notifyDucking(false);
    return;
  }
  const sentence = queue[cursor];
  const u = new SpeechSynthesisUtterance(sentence);
  u.lang = "pt-BR";
  u.rate = state.rate;
  u.pitch = 1;
  const voice = pickVoice();
  if (voice) u.voice = voice;
  u.onend = () => {
    cursor += 1;
    state.sentenceIdx = cursor;
    state.progress = queue.length === 0 ? 0 : cursor / queue.length;
    emit();
    if (state.playingId) speakNext();
  };
  u.onerror = () => {
    cursor += 1;
    state.sentenceIdx = cursor;
    state.progress = queue.length === 0 ? 0 : cursor / queue.length;
    emit();
    if (state.playingId) speakNext();
  };
  currentUtterance = u;
  synth.speak(u);
}

function notifyDucking(active: boolean) {
  try {
    window.dispatchEvent(new CustomEvent("focus-tts-ducking", { detail: { active } }));
  } catch {}
}

export const focusTTS = {
  speak(id: string, text: string, opts?: { label?: string }) {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const synth = window.speechSynthesis;
    synth.cancel();
    queue = splitSentences(text);
    cursor = 0;
    state.playingId = id;
    state.label = opts?.label || null;
    state.isPaused = false;
    state.progress = 0;
    state.sentenceIdx = 0;
    state.totalSentences = queue.length;
    emit();
    notifyDucking(true);
    if (queue.length === 0) {
      state.playingId = null;
      emit();
      notifyDucking(false);
      return;
    }
    speakNext();
  },
  pause() {
    if (typeof window === "undefined") return;
    window.speechSynthesis.pause();
    state.isPaused = true;
    emit();
  },
  resume() {
    if (typeof window === "undefined") return;
    window.speechSynthesis.resume();
    state.isPaused = false;
    emit();
  },
  stop() {
    if (typeof window === "undefined") return;
    window.speechSynthesis.cancel();
    queue = [];
    cursor = 0;
    state.playingId = null;
    state.label = null;
    state.isPaused = false;
    state.progress = 0;
    state.sentenceIdx = 0;
    state.totalSentences = 0;
    currentUtterance = null;
    emit();
    notifyDucking(false);
  },
  skipSentence() {
    if (typeof window === "undefined") return;
    const synth = window.speechSynthesis;
    synth.cancel();
    cursor += 1;
    state.sentenceIdx = cursor;
    state.progress = queue.length === 0 ? 0 : cursor / queue.length;
    emit();
    if (state.playingId) speakNext();
  },
  setRate(r: FocusTTSRate) {
    state.rate = r;
    try {
      localStorage.setItem(RATE_KEY, String(r));
    } catch {}
    emit();
    // Apply immediately by restarting current sentence at new rate
    if (state.playingId && queue.length > 0 && cursor < queue.length) {
      window.speechSynthesis.cancel();
      speakNext();
    }
  },
  isPlaying(id: string) {
    return state.playingId === id;
  },
  getState(): State {
    return state;
  },
};

// React hook to read state
export function useFocusTTS() {
  const snap = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return {
    ...snap,
    speak: focusTTS.speak,
    pause: focusTTS.pause,
    resume: focusTTS.resume,
    stop: focusTTS.stop,
    skipSentence: focusTTS.skipSentence,
    setRate: focusTTS.setRate,
    isPlaying: (id: string) => snap.playingId === id,
  };
}

// Global stop on hard navigations
if (typeof window !== "undefined") {
  window.addEventListener("focus-tts-stop", () => focusTTS.stop());
  window.addEventListener("beforeunload", () => focusTTS.stop());
}
