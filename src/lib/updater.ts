import { check } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';

export async function checkForUpdates(silent = true): Promise<void> {
  try {
    const update = await check();
    if (update) {
      console.log(`Update available: ${update.version}`);
      await update.downloadAndInstall((event) => {
        switch (event.event) {
          case 'Started':
            console.log(`Download started, size: ${event.data.contentLength}`);
            break;
          case 'Progress':
            console.log(`Downloaded ${event.data.chunkLength} bytes`);
            break;
          case 'Finished':
            console.log('Download finished');
            break;
        }
      });
      await relaunch();
    } else if (!silent) {
      console.log('No update available');
    }
  } catch (e) {
    console.error('Update check failed:', e);
    if (!silent) throw e;
  }
}
