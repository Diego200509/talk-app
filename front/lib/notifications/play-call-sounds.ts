let audioContext: AudioContext | null = null;
let activeStop: (() => void) | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return null;
  if (!audioContext) audioContext = new Ctx();
  if (audioContext.state === "suspended") {
    void audioContext.resume();
  }
  return audioContext;
}

function playTone(
  ctx: AudioContext,
  frequency: number,
  startAt: number,
  duration: number,
  volume = 0.08
) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.value = frequency;
  gain.gain.setValueAtTime(0, startAt);
  gain.gain.linearRampToValueAtTime(volume, startAt + 0.02);
  gain.gain.setValueAtTime(volume, startAt + duration - 0.04);
  gain.gain.linearRampToValueAtTime(0, startAt + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(startAt);
  osc.stop(startAt + duration);
}

/** Tono de espera para quien llama (estilo ringback). */
function playOutgoingPattern(ctx: AudioContext) {
  const t = ctx.currentTime;
  playTone(ctx, 425, t, 0.9, 0.07);
  playTone(ctx, 425, t + 1.1, 0.9, 0.07);
}

/** Ringtone para quien recibe (doble tono más agudo). */
function playIncomingPattern(ctx: AudioContext) {
  const t = ctx.currentTime;
  playTone(ctx, 880, t, 0.18, 0.09);
  playTone(ctx, 660, t + 0.22, 0.18, 0.09);
  playTone(ctx, 880, t + 0.44, 0.18, 0.09);
  playTone(ctx, 660, t + 0.66, 0.18, 0.09);
}

function startLoop(playPattern: (ctx: AudioContext) => void, intervalMs: number) {
  stopCallSounds();
  const ctx = getAudioContext();
  if (!ctx) return;

  playPattern(ctx);
  const intervalId = window.setInterval(() => {
    const loopCtx = getAudioContext();
    if (loopCtx) playPattern(loopCtx);
  }, intervalMs);

  activeStop = () => {
    window.clearInterval(intervalId);
    activeStop = null;
  };
}

export function startOutgoingCallSound() {
  startLoop(playOutgoingPattern, 3000);
}

export function startIncomingCallSound() {
  startLoop(playIncomingPattern, 1800);
}

export function stopCallSounds() {
  activeStop?.();
  activeStop = null;
}
