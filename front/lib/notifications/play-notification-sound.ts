let audioContext: AudioContext | null = null;

import { TALKAPP_LOGO_PATH } from "@/lib/brand";

const DESKTOP_NOTIFICATIONS_KEY = "talkapp-desktop-notifications";
const recentNotificationIds = new Set<string>();

export function getNotificationIconUrl(): string {
  if (typeof window === "undefined") return TALKAPP_LOGO_PATH;
  return `${window.location.origin}${TALKAPP_LOGO_PATH}`;
}

export function areDesktopNotificationsEnabled(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(DESKTOP_NOTIFICATIONS_KEY) !== "false";
}

export function setDesktopNotificationsEnabled(enabled: boolean) {
  if (typeof window === "undefined") return;
  localStorage.setItem(DESKTOP_NOTIFICATIONS_KEY, String(enabled));
}

export function playNotificationSound() {
  try {
    if (typeof window === "undefined") return;
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;

    if (!audioContext) {
      audioContext = new Ctx();
    }
    if (audioContext.state === "suspended") {
      void audioContext.resume();
    }

    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    osc.type = "sine";
    osc.frequency.value = 880;
    gain.gain.value = 0.04;
    osc.connect(gain);
    gain.connect(audioContext.destination);
    osc.start();
    osc.stop(audioContext.currentTime + 0.12);
  } catch {
  }
}

export async function requestNotificationPermission(): Promise<
  NotificationPermission | "unsupported"
> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }
  if (Notification.permission === "granted") return "granted";
  if (Notification.permission === "denied") return "denied";
  try {
    return await Notification.requestPermission();
  } catch {
    return "denied";
  }
}

export type DesktopNotificationOptions = {
  conversationId?: string;
  messageId?: string;
};

export function showDesktopNotification(
  title: string,
  body: string,
  options?: DesktopNotificationOptions
) {
  try {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (!areDesktopNotificationsEnabled()) return;
    if (Notification.permission !== "granted") return;

    const messageId = options?.messageId;
    if (messageId) {
      if (recentNotificationIds.has(messageId)) return;
      recentNotificationIds.add(messageId);
      window.setTimeout(() => recentNotificationIds.delete(messageId), 4000);
    }

    const tag = options?.conversationId
      ? `talkapp-${options.conversationId}-${Date.now()}`
      : `talkapp-${Date.now()}`;

    const notification = new Notification(title, {
      body: body.slice(0, 240),
      tag,
      icon: getNotificationIconUrl(),
    });

    notification.onclick = () => {
      window.focus();
      notification.close();
    };
  } catch {
    /* ignorar */
  }
}
