import { MOBILE_ARTWORK } from './mobileArtworkManifest.ts';

/** Keep the chosen asset tier for the page lifetime, including device rotation. */
let mobileTier: boolean | undefined;
export function useMobileArtwork() {
  mobileTier ??= typeof window !== 'undefined' && window.matchMedia('(max-width: 767px), (pointer: coarse)').matches;
  return mobileTier;
}
export function mobileArtworkUrl(url: string, mobile: boolean): string {
  if (!mobile) return url;
  for (const [original, replacement] of Object.entries(MOBILE_ARTWORK)) {
    if (url.endsWith('/' + original)) return url.slice(0, -original.length) + replacement.image;
  }
  return url;
}
