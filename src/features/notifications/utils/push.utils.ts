type PlatformInfo = {
  userAgent: string
  maxTouchPoints: number
  standalone: boolean
}

// iOS (and iPadOS, which reports a Mac) delivers Web Push only to an app added to the Home Screen
export function needsHomeScreen({ userAgent, maxTouchPoints, standalone }: PlatformInfo) {
  const ios = /iPhone|iPad|iPod/.test(userAgent) || (/Macintosh/.test(userAgent) && maxTouchPoints > 1)

  return ios && !standalone
}

// applicationServerKey as the push service wants it: the VAPID public key as raw bytes
export function vapidKeyBytes(base64Url: string) {
  const base64 = base64Url
    .replace(/-/g, '+')
    .replace(/_/g, '/')
    .padEnd(Math.ceil(base64Url.length / 4) * 4, '=')

  return Uint8Array.from(atob(base64), (char) => char.charCodeAt(0))
}
