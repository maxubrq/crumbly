import { defineManifest } from '@crxjs/vite-plugin'
import { version } from '../package.json'

export default defineManifest({
  manifest_version: 3,
  name: 'Crumbly',
  description:
    'Secure, zero-trust cookie sync via your own GitHub Gist.',
  version,
  action: {
    default_popup: 'index.html',
    default_icon: {
      '16': 'icons/icon16.png',
      '48': 'icons/icon48.png',
      '128': 'icons/icon128.png'
    }
  },
  background: {
    service_worker: 'src/background/index.ts',
    type: 'module'
  },
  permissions: [
    "cookies",
    "storage",
    "identity",
    "alarms"
  ],
  host_permissions: [
    'https://gist.github.com/*',
    'https://api.github.com/*',
    "https://localhost:5173/*",
    "http://localhost:5173/*",
  ],
  icons: {
    '16': 'icons/icon16.png',
    '48': 'icons/icon48.png',
    '128': 'icons/icon128.png'
  },
  // content_security_policy: {
  //   extension_pages:
  //     "default-src 'self'; connect-src https://api.github.com wss://*.app.github.dev"
  // }
})
