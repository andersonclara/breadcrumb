import { inCampus, type Coordinate } from '@breadcrumb/shared';

export type MapLocationFix = {
  timestamp: number;
  coords: Coordinate & { accuracy: number | null; speed: number | null };
};
export type MapLocationState = {
  position: Coordinate | null;
  walking: boolean;
  locating: boolean;
  error: string;
};
type Subscription = { remove: () => void };
type Driver = {
  permission: (request: boolean) => Promise<boolean>;
  watch: (update: (fix: MapLocationFix) => void, error: () => void) => Promise<Subscription>;
};
export const emptyMapLocation: MapLocationState = { position: null, walking: false, locating: false, error: '' };

// This stream only updates the map on this device. Friend presence uses its own opt-in stream.
export class LiveMapLocation {
  private generation = 0;
  private subscription: Subscription | null = null;
  private expiry: ReturnType<typeof setTimeout> | undefined;
  private idle: ReturnType<typeof setTimeout> | undefined;
  private state = emptyMapLocation;
  private previous: MapLocationFix | null = null;

  constructor(private driver: Driver, private change: (state: MapLocationState) => void) {}

  private update(patch: Partial<MapLocationState>) {
    this.state = { ...this.state, ...patch };
    this.change(this.state);
  }

  stop() {
    this.generation++;
    this.subscription?.remove();
    this.subscription = null;
    clearTimeout(this.expiry);
    clearTimeout(this.idle);
    this.previous = null;
    this.update(emptyMapLocation);
  }

  async start(request = false) {
    this.stop();
    const ticket = this.generation;
    const active = () => ticket === this.generation;
    this.update({ locating: true });
    try {
      const granted = await this.driver.permission(request);
      if (!active()) return;
      if (!granted) {
        this.update({ locating: false, error: 'Location is off. Enable it in Settings to see your avatar on the map.' });
        return;
      }
      const expire = () => {
        clearTimeout(this.expiry);
        this.expiry = setTimeout(() => {
          if (!active()) return;
          this.previous = null;
          this.update({ position: null, walking: false, locating: false, error: 'Waiting for your location. Try moving outdoors or tap the location button to retry.' });
        }, 30000);
      };
      expire();
      const subscription = await this.driver.watch(fix => {
        if (!active() || !Number.isFinite(fix.timestamp) || Date.now() - fix.timestamp > 15000 ||
          !Number.isFinite(fix.coords.latitude) || !Number.isFinite(fix.coords.longitude) ||
          (fix.coords.accuracy !== null && (!Number.isFinite(fix.coords.accuracy) || fix.coords.accuracy < 0 || fix.coords.accuracy > 100)) ||
          (this.previous && fix.timestamp <= this.previous.timestamp)) return;
        const position = { latitude: fix.coords.latitude, longitude: fix.coords.longitude };
        if (!inCampus(position)) {
          clearTimeout(this.expiry);
          clearTimeout(this.idle);
          this.previous = fix;
          this.update({ position: null, walking: false, locating: false, error: 'You are outside the UF map. You can still browse campus.' });
          return;
        }
        const old = this.previous;
        const elapsed = old ? (fix.timestamp - old.timestamp) / 1000 : 0;
        const distance = old ? Math.hypot((position.latitude - old.coords.latitude) * 111320,
          (position.longitude - old.coords.longitude) * 111320 * Math.cos(position.latitude * Math.PI / 180)) : 0;
        const speed = fix.coords.speed;
        const walking = speed !== null && speed >= 0 ? speed > 0.4 :
          elapsed > 0 && elapsed < 15 && distance > Math.max(3, (fix.coords.accuracy ?? 6) / 2) && distance / elapsed > 0.5;
        this.previous = fix;
        this.update({ position, walking, locating: false, error: '' });
        clearTimeout(this.idle);
        if (walking) this.idle = setTimeout(() => {
          if (active()) this.update({ walking: false });
        }, 3500);
        expire();
      }, () => {
        if (!active()) return;
        this.stop();
        this.update({ error: 'Could not find your location. Tap the location button to retry.' });
      });
      if (!active()) subscription.remove();
      else this.subscription = subscription;
    } catch {
      if (!active()) return;
      this.stop();
      this.update({ error: 'Could not find your location. Tap the location button to retry.' });
    }
  }
}
