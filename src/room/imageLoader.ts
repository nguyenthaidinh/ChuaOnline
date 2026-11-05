/** A bounded, deduplicated download/decode queue shared by scene and character art. */
export class ImageQueue {
  private pending = new Map<string, Promise<void>>();
  private jobs: Array<() => void> = [];
  private active = 0;
  private load: (url: string) => Promise<void>;
  private concurrency: number;
  constructor(load: (url: string) => Promise<void>, concurrency = 3) {
    this.load = load; this.concurrency = concurrency;
  }
  request(url: string): Promise<void> {
    const cached = this.pending.get(url);
    if (cached) return cached;
    const promise = new Promise<void>((resolve, reject) => {
      this.jobs.push(() => {
        this.active++;
        void this.load(url).then(resolve, error => {
          this.pending.delete(url);
          reject(error);
        }).finally(() => { this.active--; this.drain(); });
      });
    });
    this.pending.set(url, promise);
    this.drain();
    return promise;
  }
  private drain() {
    while (this.active < this.concurrency && this.jobs.length) this.jobs.shift()!();
  }
}

function loadImage(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    let settled = false;
    const finish = (error?: Error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      image.onload = image.onerror = null;
      if (error) { image.src = ''; reject(error); } else resolve();
    };
    const timer = setTimeout(() => finish(new Error(`Image timeout: ${url}`)), 20000);
    image.onload = () => { void image.decode().then(() => finish(), () => finish(new Error(`Image decode: ${url}`))); };
    image.onerror = () => finish(new Error(`Image unavailable: ${url}`));
    image.src = url;
  });
}
const images = new ImageQueue(loadImage);
export const decodeImage = (url: string) => images.request(url);
