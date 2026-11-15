import { requireOptionalNativeModule } from "expo";

/**
 * Key-value storage for iOS and Android.
 *
 * Native modules are only loaded once we know the running app includes them.
 * A plain `import` of a missing module crashes at startup, which broke every
 * screen when an Expo Go build shipped without expo-sqlite. Order of preference:
 *   1. expo-sqlite's kv-store
 *   2. a JSON file in the app's document folder (expo-file-system)
 *   3. memory only, for this session
 */
type KV = {
  get(key: string): string | null;
  set(key: string, value: string): void;
  remove(key: string): void;
};

function sqliteStore(): KV | null {
  if (!requireOptionalNativeModule("ExpoSQLite")) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Storage } = require("expo-sqlite/kv-store") as typeof import("expo-sqlite/kv-store");
    return {
      get: (key) => Storage.getItemSync(key),
      set: (key, value) => Storage.setItemSync(key, value),
      remove: (key) => {
        Storage.removeItemSync(key);
      },
    };
  } catch {
    return null;
  }
}

function fileStore(): KV | null {
  if (!requireOptionalNativeModule("FileSystem")) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { File, Paths } = require("expo-file-system") as typeof import("expo-file-system");
    const file = new File(Paths.document, "cognify-storage.json");

    let data: Record<string, string> = {};
    if (file.exists) {
      try {
        data = JSON.parse(file.textSync()) as Record<string, string>;
      } catch {
        data = {};
      }
    }

    const flush = () => {
      try {
        file.writeSync(JSON.stringify(data));
      } catch {
        // keep the in-memory copy; the next write will try again
      }
    };

    return {
      get: (key) => data[key] ?? null,
      set: (key, value) => {
        data[key] = value;
        flush();
      },
      remove: (key) => {
        delete data[key];
        flush();
      },
    };
  } catch {
    return null;
  }
}

function memoryStore(): KV {
  const data = new Map<string, string>();
  return {
    get: (key) => data.get(key) ?? null,
    set: (key, value) => {
      data.set(key, value);
    },
    remove: (key) => {
      data.delete(key);
    },
  };
}

export const kv: KV = sqliteStore() ?? fileStore() ?? memoryStore();
