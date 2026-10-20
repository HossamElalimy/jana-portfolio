/**
 * Site sound: a background music loop, off until the visitor asks for it.
 *
 * The choice is remembered, but browsers still need a gesture before audio can
 * play, so a returning visitor's music starts on their first tap or key press.
 */

// "Acoustic Guitar and Keys - Plains Soundtrack" by tyballer92 (freesound.org/s/449812, CC0),
// sped up to 1.2x (~120 BPM). It builds in once, then repeats a 16 s phrase cut on the
// musical repeat (14.5 s → 30.5 s), with the seam crossfaded into the file.
const MUSIC_SRC = "/audio/studio-guitar.m4a";
const LOOP_START = 14.5;
const LOOP_END = 30.5;
const MUSIC_LEVEL = 0.5;
const PREF_KEY = "jana-sound";

let on = false;
const listeners = new Set<() => void>();
const set = (next: boolean) => {
  on = next;
  listeners.forEach((l) => l());
};

export const subscribeSound = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
export const getSound = () => on;
export const getServerSound = () => false;

let ctx: AudioContext | null = null;
let gain: GainNode;
let source: AudioBufferSourceNode | null = null;
let buffer: Promise<AudioBuffer> | null = null;

const storage = () => {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
};

/** Must run inside a user gesture the first time (browser autoplay rules). */
function audio(): AudioContext {
  if (!ctx) {
    ctx = new AudioContext();
    gain = ctx.createGain();
    gain.gain.value = 0;
    gain.connect(ctx.destination);
    // iOS: let the music play even with the ring/silent switch on, since it was asked for.
    const session = (navigator as Navigator & { audioSession?: { type: string } }).audioSession;
    if (session) session.type = "playback";
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

const ramp = (to: number, seconds: number) => {
  const now = audio().currentTime;
  gain.gain.cancelScheduledValues(now);
  gain.gain.setValueAtTime(gain.gain.value, now);
  gain.gain.linearRampToValueAtTime(to, now + seconds);
};

async function start() {
  const ac = audio();
  if (!source) {
    buffer ??= fetch(MUSIC_SRC)
      .then((r) => r.arrayBuffer())
      .then((b) => ac.decodeAudioData(b));
    const buf = await buffer.catch(() => {
      buffer = null;
      return null;
    });
    if (!buf || !on || source) return;
    source = ac.createBufferSource();
    source.buffer = buf;
    source.loop = true;
    source.loopStart = LOOP_START;
    source.loopEnd = Math.min(buf.duration, LOOP_END);
    source.connect(gain);
    source.start();
  }
  ramp(MUSIC_LEVEL, 2.5);
}

function stop() {
  if (!ctx || !source) return;
  const src = source;
  source = null;
  ramp(0, 0.8);
  src.stop(ctx.currentTime + 0.85);
}

export function setSoundOn(next: boolean) {
  storage()?.setItem(PREF_KEY, next ? "on" : "off");
  set(next);
  if (next) void start();
  else stop();
}

/**
 * Wire up page-level behaviour; returns a cleanup. Restores a remembered "on" (started
 * by the first gesture) and pauses the music while the tab is hidden.
 */
export function initSound(): () => void {
  const gesture = () => {
    off();
    if (on) void start();
  };
  const off = () => {
    window.removeEventListener("pointerdown", gesture);
    window.removeEventListener("keydown", gesture);
  };
  if (storage()?.getItem(PREF_KEY) === "on") {
    set(true);
    window.addEventListener("pointerdown", gesture);
    window.addEventListener("keydown", gesture);
  }
  const visibility = () => {
    if (!ctx) return;
    if (document.hidden) void ctx.suspend();
    else if (on) void ctx.resume();
  };
  document.addEventListener("visibilitychange", visibility);
  return () => {
    off();
    document.removeEventListener("visibilitychange", visibility);
  };
}
