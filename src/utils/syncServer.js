import { Capacitor } from '@capacitor/core'

const SYNC_SERVER_PORT = 3001

// Resolve the sync server's host for whichever environment the app
// is running in:
// - Android emulator: the WebView loads from http://localhost/, but
//   "localhost" there means the emulator itself, not the dev
//   machine. 10.0.2.2 is the emulator's fixed alias back to the host.
// - Browser (dev/testing): use the page's own host, so it works
//   regardless of which machine/IP is serving it.
export function getSyncServerUrl() {
  if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android') {
    return `http://10.0.2.2:${SYNC_SERVER_PORT}/session`
  }

  if (typeof window !== 'undefined' && window.location && window.location.hostname) {
    return `http://${window.location.hostname}:${SYNC_SERVER_PORT}/session`
  }

  return `http://localhost:${SYNC_SERVER_PORT}/session`
}
