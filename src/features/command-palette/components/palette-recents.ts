export type PaletteRecent = {
  href: string;
  label: string;
};

export const PALETTE_RECENTS_KEY = "medipulse:palette-recents";
const MAX_RECENTS = 5;

export function readRecents(): PaletteRecent[] {
  try {
    const raw = window.localStorage.getItem(PALETTE_RECENTS_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (item): item is PaletteRecent =>
          typeof item === "object" &&
          item !== null &&
          typeof (item as PaletteRecent).href === "string" &&
          typeof (item as PaletteRecent).label === "string",
      )
      .slice(0, MAX_RECENTS);
  } catch {
    return [];
  }
}

export function rememberRecent(item: PaletteRecent): void {
  try {
    const next = [
      item,
      ...readRecents().filter((recent) => recent.href !== item.href),
    ].slice(0, MAX_RECENTS);
    window.localStorage.setItem(PALETTE_RECENTS_KEY, JSON.stringify(next));
  } catch {}
}
