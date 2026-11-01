import { lightsOffStore } from '../../ui';

/** Dims everything but the timer. Fullscreen is best-effort and must be called from a click. */
export async function enterLightsOff(fullscreen: boolean) {
  lightsOffStore.set(true);
  if (fullscreen && !document.fullscreenElement) {
    try {
      await document.documentElement.requestFullscreen();
    } catch {
      /* fullscreen refused (e.g. iOS Safari): lights-off still works without it */
    }
  }
}

export function exitLightsOff() {
  lightsOffStore.set(false);
  if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
}
