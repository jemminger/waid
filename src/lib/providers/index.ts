import type { StorageMode, TaskProvider } from '../types';
import { SqliteProvider } from './sqlite-provider';
import { SyncedProvider } from './synced-provider';

let currentProvider: TaskProvider | null = null;
let currentMode: StorageMode = 'local';

export function getProvider(): TaskProvider {
  if (!currentProvider) {
    currentProvider = new SqliteProvider();
  }
  return currentProvider;
}

export function activateLocalProvider(): TaskProvider {
  if (currentProvider instanceof SyncedProvider) {
    currentProvider.destroy();
  }
  currentProvider = new SqliteProvider();
  currentMode = 'local';
  return currentProvider;
}

export function activateSyncedProvider(uid: string): SyncedProvider {
  if (currentProvider instanceof SyncedProvider) {
    currentProvider.destroy();
  }
  const provider = new SyncedProvider(uid);
  currentProvider = provider;
  currentMode = 'remote';
  return provider;
}

export function getCurrentMode(): StorageMode {
  return currentMode;
}
