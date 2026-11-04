export interface KinescopeEvent { data?: { currentTime?: number; duration?: number }; }
export interface KinescopePlayer {
  Events: Record<string, string>;
  on(event: string, listener: (event: KinescopeEvent) => void): unknown;
  off(event: string, listener: (event: KinescopeEvent) => void): unknown;
  getCurrentTime(): Promise<number>;
  getDuration(): Promise<number>;
  seekTo(seconds: number): Promise<void>;
  destroy(): Promise<void>;
}
export interface KinescopeFactory {
  create(id: string, options: { url: string; size: { width: string; height: string }; behavior: { localStorage: boolean; autoPlay: boolean; playsInline: boolean } }): Promise<KinescopePlayer>;
}
declare global { interface Window { onKinescopeIframeAPIReady?: (factory: KinescopeFactory) => void; } }
let factoryPromise: Promise<KinescopeFactory> | null = null;
export const loadKinescope = (): Promise<KinescopeFactory> => {
  if (factoryPromise) return factoryPromise;
  factoryPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://player.kinescope.io/latest/iframe.player.js'; script.async = true;
    const timeout = window.setTimeout(() => fail(), 15000);
    const fail = () => { clearTimeout(timeout); script.remove(); factoryPromise = null; reject(new Error('Не удалось загрузить видеоплеер.')); };
    window.onKinescopeIframeAPIReady = factory => { clearTimeout(timeout); resolve(factory); };
    script.onerror = fail; document.head.appendChild(script);
  });
  return factoryPromise;
};
