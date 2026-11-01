/**
 * Thin wrapper over the official YouTube IFrame Player API.
 * Limitations (by YouTube, not fixable here): needs internet; streams can end, be removed or be
 * region-blocked (we fall through a list of alternatives); YouTube may show ads; the first play
 * must follow a user click (browser autoplay policy).
 */

interface YTPlayer {
  playVideo(): void;
  pauseVideo(): void;
  loadVideoById(id: string): void;
  setVolume(v: number): void;
  mute(): void;
  unMute(): void;
  getPlayerState(): number;
  getVideoData(): { title?: string; author?: string };
  seekTo(s: number, allowSeekAhead: boolean): void;
  destroy(): void;
}

declare global {
  interface Window {
    YT?: { Player: new (el: HTMLElement, opts: object) => YTPlayer };
    onYouTubeIframeAPIReady?: () => void;
  }
}

let apiPromise: Promise<void> | null = null;

function loadApi(): Promise<void> {
  if (apiPromise) return apiPromise;
  apiPromise = new Promise((resolve, reject) => {
    if (window.YT?.Player) return resolve();
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prev?.();
      resolve();
    };
    const s = document.createElement('script');
    s.src = 'https://www.youtube.com/iframe_api';
    s.onerror = () => {
      apiPromise = null;
      reject(new Error('offline'));
    };
    document.head.appendChild(s);
  });
  return apiPromise;
}

export type YTStatus = 'idle' | 'loading' | 'playing' | 'paused' | 'blocked' | 'error';

export class YouTubeChannel {
  private player: YTPlayer | null = null;
  private ready = false;
  private videos: string[] = [];
  private index = 0;
  private wantPlaying = false;
  private volume = 50;
  private muted = false;
  private blockTimer: ReturnType<typeof setTimeout> | null = null;
  private host: HTMLElement | null = null;

  constructor(private onChange: (status: YTStatus, title: string) => void) {}

  /** The element the visible mini player renders into. */
  attach(el: HTMLElement) {
    this.host = el;
  }

  get currentVideo() {
    return this.videos[this.index] ?? null;
  }

  async play(videos: string[], volume: number, muted: boolean) {
    this.volume = Math.round(volume * 100);
    this.muted = muted;
    this.wantPlaying = true;
    const changed = videos.join() !== this.videos.join();
    if (changed) {
      this.videos = videos;
      this.index = 0;
    }
    this.onChange('loading', '');
    try {
      await loadApi();
    } catch {
      this.onChange('error', "Can't reach YouTube. Check your connection, or pick a generated sound.");
      return;
    }
    if (!this.wantPlaying) return;
    if (!this.player) return this.create();
    if (!this.ready) return; // onReady will start playback
    if (changed) this.player.loadVideoById(this.videos[this.index]);
    else this.player.playVideo();
    this.applyVolume();
    this.watchForBlock();
  }

  pause() {
    this.wantPlaying = false;
    if (this.player && this.ready) this.player.pauseVideo();
    this.onChange('paused', this.title());
  }

  setVolume(volume: number, muted: boolean) {
    this.volume = Math.round(volume * 100);
    this.muted = muted;
    this.applyVolume();
  }

  private applyVolume() {
    if (!this.player || !this.ready) return;
    this.player.setVolume(this.volume);
    if (this.muted) this.player.mute();
    else this.player.unMute();
  }

  private title() {
    try {
      return this.player?.getVideoData()?.title ?? '';
    } catch {
      return '';
    }
  }

  private create() {
    if (!this.host || !window.YT) return;
    const mount = document.createElement('div');
    this.host.replaceChildren(mount);
    this.player = new window.YT.Player(mount, {
      videoId: this.videos[this.index],
      host: 'https://www.youtube-nocookie.com',
      width: '100%',
      height: '100%',
      playerVars: { autoplay: 1, controls: 0, disablekb: 1, playsinline: 1, rel: 0, iv_load_policy: 3, fs: 0 },
      events: {
        onReady: () => {
          this.ready = true;
          this.applyVolume();
          if (this.wantPlaying) {
            this.player?.playVideo();
            this.watchForBlock();
          } else this.player?.pauseVideo();
        },
        onStateChange: (e: { data: number }) => {
          if (e.data === 1) {
            this.clearBlock();
            if (!this.wantPlaying) this.player?.pauseVideo();
            else this.onChange('playing', this.title());
          } else if (e.data === 0) {
            // A finished (non-live) mix: loop it.
            this.player?.seekTo(0, true);
            this.player?.playVideo();
          } else if (e.data === 2 && this.wantPlaying) {
            this.onChange('paused', this.title());
          }
        },
        onError: () => this.next(),
      },
    });
  }

  /** Current stream failed: move to the next alternative. */
  private next() {
    this.index++;
    if (this.index >= this.videos.length) {
      this.index = 0;
      this.wantPlaying = false;
      this.onChange('error', "None of this category's streams would play right now. Try another one.");
      return;
    }
    this.player?.loadVideoById(this.videos[this.index]);
  }

  /** If playback hasn't started shortly after asking, the browser likely blocked autoplay. */
  private watchForBlock() {
    this.clearBlock();
    this.blockTimer = setTimeout(() => {
      if (this.wantPlaying && this.player?.getPlayerState() !== 1 && this.player?.getPlayerState() !== 3)
        this.onChange('blocked', this.title());
    }, 4000);
  }

  private clearBlock() {
    if (this.blockTimer) clearTimeout(this.blockTimer);
    this.blockTimer = null;
  }
}
