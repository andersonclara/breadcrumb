export type CachedTile<T> = { key: string; value: T };

// Owns decoded assets, not React views. Superseded queued requests are dropped;
// only two loads may run together. Eviction releases JS references rather than
// disposing an image that a previous native canvas commit could still draw.
export class TileCache<T> {
  private entries = new Map<string, T>();
  private wanted = new Set<string>();
  private queue: string[] = [];
  private loading = new Set<string>();
  private failures = new Map<string, number>();
  private listeners = new Set<() => void>();
  private snapshot: CachedTile<T>[] = [];
  constructor(private load: (key: string) => Promise<T>, readonly limit = 40, readonly concurrency = 2) {}
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  };
  getSnapshot = () => this.snapshot;
  values(): CachedTile<T>[] { return [...this.entries].map(([key, value]) => ({ key, value })); }
  get pending() { return this.loading.size; }
  get size() { return this.entries.size; }
  failed(key: string) { return this.failures.has(key); }
  request(keys: string[]) {
    this.wanted = new Set(keys.slice(0, this.limit));
    for (const key of this.wanted) {
      const value = this.entries.get(key);
      if (value !== undefined) { this.entries.delete(key); this.entries.set(key, value); }
    }
    this.queue = [...this.wanted].filter(key => !this.entries.has(key) && !this.loading.has(key) &&
      Date.now() - (this.failures.get(key) ?? 0) > 5000);
    this.trim();
    this.pump();
  }
  retry() { this.failures.clear(); this.request([...this.wanted]); this.emit(); }
  suspend() { this.queue = []; this.wanted = new Set(['0/0/0']); this.trim(); }
  private trim() {
    for (const key of this.entries.keys()) {
      if (this.entries.size <= this.limit) break;
      if (!this.wanted.has(key)) this.entries.delete(key);
    }
  }
  private emit() { this.snapshot = this.values(); this.listeners.forEach(listener => listener()); }
  private pump() {
    while (this.loading.size < this.concurrency && this.queue.length) {
      const key = this.queue.shift()!;
      this.loading.add(key);
      // The loader may throw before returning a promise (e.g. an invalid asset).
      void Promise.resolve().then(() => this.load(key)).then(value => {
        this.failures.delete(key);
        this.entries.set(key, value);
        this.trim();
      }).catch(() => { this.failures.set(key, Date.now()); }).finally(() => {
        this.loading.delete(key);
        this.emit();
        this.pump();
      });
    }
  }
}
