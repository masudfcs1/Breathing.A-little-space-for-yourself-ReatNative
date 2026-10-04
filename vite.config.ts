import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { createHash } from 'node:crypto';
import type { Plugin } from 'vite';

function offlineBundle(): Plugin {
  return {
    name: 'breathing-offline',
    apply: 'build',
    generateBundle(_options, bundle) {
      const files = [...Object.keys(bundle).map(file => '/' + file), '/', '/favicon.svg', '/manifest.webmanifest'];
      const version = createHash('sha256').update(JSON.stringify(files)).digest('hex').slice(0, 12);
      const source = [
        'const CACHE = ' + JSON.stringify('breathing-' + version) + ';',
        'const FILES = ' + JSON.stringify(files) + ';',
        "self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(FILES)));});",
        "self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('breathing-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));});",
        "self.addEventListener('fetch',event=>{if(event.request.method!=='GET'||new URL(event.request.url).origin!==self.location.origin)return;if(event.request.mode==='navigate'){event.respondWith(fetch(event.request).catch(()=>caches.open(CACHE).then(cache=>cache.match('/index.html').then(response=>response||cache.match('/')))));return;}event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request)));});",
      ].join('\n');
      this.emitFile({ type: 'asset', fileName: 'sw.js', source });
    },
  };
}

export default defineConfig({
  plugins: [react(), offlineBundle()],
  resolve: {
    alias: [
      { find: /^react-native$/, replacement: 'react-native-web' },
      { find: /^react-native-svg$/, replacement: 'react-native-svg/lib/module/ReactNativeSVG.web.js' },
    ],
    extensions: ['.web.tsx', '.tsx', '.web.ts', '.ts', '.web.jsx', '.jsx', '.web.js', '.js'],
  },
  define: { global: 'globalThis', __DEV__: JSON.stringify(process.env.NODE_ENV !== 'production'), 'process.env.EXPO_OS': '"web"' },
  optimizeDeps: {
    include: ['react-native-web', 'react-native-svg', 'lucide-react-native'],
    esbuildOptions: { resolveExtensions: ['.web.tsx', '.tsx', '.web.ts', '.ts', '.web.jsx', '.jsx', '.web.js', '.js', '.json'] },
  },
  assetsInclude: ['**/*.ttf'],
  server: { port: 5173, strictPort: false },
});
