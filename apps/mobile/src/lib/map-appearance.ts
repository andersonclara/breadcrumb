export type MapAppearance = 'auto' | 'day' | 'dusk' | 'night';
export type MapLight = { day: number; dusk: number; night: number };
export const mapAppearances: { id: MapAppearance; label: string }[] = [
  { id: 'auto', label: 'Automatic' }, { id: 'day', label: 'Day' },
  { id: 'dusk', label: 'Dusk' }, { id: 'night', label: 'Night' },
];
export const isMapAppearance = (value: unknown): value is MapAppearance =>
  mapAppearances.some(option => option.id === value);

// NOAA fractional-year solar equations. UTC avoids device timezone/DST jumps.
// https://gml.noaa.gov/grad/solcalc/solareqns.PDF
export function campusSunAltitude(date: Date): number {
  const year = date.getUTCFullYear();
  const start = Date.UTC(year, 0, 1);
  const days = (Date.UTC(year + 1, 0, 1) - start) / 86400000;
  const elapsed = (date.getTime() - start) / 86400000;
  const gamma = 2 * Math.PI / days * (elapsed - .5);
  const eq = 229.18 * (.000075 + .001868 * Math.cos(gamma) - .032077 * Math.sin(gamma)
    - .014615 * Math.cos(2 * gamma) - .040849 * Math.sin(2 * gamma));
  const decl = .006918 - .399912 * Math.cos(gamma) + .070257 * Math.sin(gamma)
    - .006758 * Math.cos(2 * gamma) + .000907 * Math.sin(2 * gamma)
    - .002697 * Math.cos(3 * gamma) + .00148 * Math.sin(3 * gamma);
  const minutes = date.getUTCHours() * 60 + date.getUTCMinutes() + date.getUTCSeconds() / 60;
  const solar = ((minutes + eq + 4 * -82.345) % 1440 + 1440) % 1440;
  const hour = (solar / 4 - 180) * Math.PI / 180;
  const lat = 29.648 * Math.PI / 180;
  return Math.asin(Math.max(-1, Math.min(1,
    Math.sin(lat) * Math.sin(decl) + Math.cos(lat) * Math.cos(decl) * Math.cos(hour)))) * 180 / Math.PI;
}
const smooth = (a: number, b: number, value: number) => {
  const x = Math.max(0, Math.min(1, (value - a) / (b - a)));
  return x * x * (3 - 2 * x);
};
export function lightAtAltitude(altitude: number): MapLight {
  const day = smooth(-3, 9, altitude), night = 1 - smooth(-9, -3, altitude);
  return { day, dusk: 1 - day - night, night };
}
export function mapLight(mode: MapAppearance, date = new Date()): MapLight {
  return mode === 'auto' ? lightAtAltitude(campusSunAltitude(date)) :
    { day: Number(mode === 'day'), dusk: Number(mode === 'dusk'), night: Number(mode === 'night') };
}
