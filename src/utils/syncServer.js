import { Capacitor } from '@capacitor/core'

const SYNC_SERVER_PORT = 3001

export function getSyncServerUrl() {
  if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android') {
    return `http://10.0.2.2:${SYNC_SERVER_PORT}/session`
  }

  if (typeof window !== 'undefined' && window.location && window.location.hostname) {
    return `http://${window.location.hostname}:${SYNC_SERVER_PORT}/session`
  }

  return `http://localhost:${SYNC_SERVER_PORT}/session`
}