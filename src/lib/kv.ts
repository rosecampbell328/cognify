// Web (and server render) fallback: localStorage when available, memory otherwise.
// Native platforms use kv.native.ts instead.
const memory = new Map<string, string>();

function ls(): Storage | null {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null;
  }
}

export const kv = {
  get(key: string): string | null {
    try {
      return ls()?.getItem(key) ?? memory.get(key) ?? null;
    } catch {
      return memory.get(key) ?? null;
    }
  },
  set(key: string, value: string): void {
    memory.set(key, value);
    try {
      ls()?.setItem(key, value);
    } catch {
      // storage full or blocked — memory copy still works for this session
    }
  },
  remove(key: string): void {
    memory.delete(key);
    try {
      ls()?.removeItem(key);
    } catch {}
  },
};
