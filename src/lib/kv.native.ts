import { Storage } from "expo-sqlite/kv-store";

// SQLite-backed key-value store on iOS and Android. Sync reads let the app
// hydrate before the first render.
export const kv = {
  get(key: string): string | null {
    return Storage.getItemSync(key);
  },
  set(key: string, value: string): void {
    Storage.setItemSync(key, value);
  },
  remove(key: string): void {
    Storage.removeItemSync(key);
  },
};
