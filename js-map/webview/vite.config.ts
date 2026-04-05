import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';

const ignoreMissingPlugin = () => {
  return {
    name: 'ignore-missing',
    enforce: 'pre' as const,
    resolveId(source, importer) {
      let resolvedPath = source;
      
      if (source.startsWith('@/')) {
        resolvedPath = path.resolve(__dirname, './assets/src', source.slice(2));
      } else if (source.startsWith('.') && importer) {
        resolvedPath = path.resolve(path.dirname(importer), source);
      } else if (path.isAbsolute(source) && source.includes('/assets/src/')) {
        resolvedPath = source;
      } else {
        return null; // let vite resolve node_modules
      }
      
      const exts = ['', '.ts', '.tsx', '.js', '.jsx', '.css', '.module.css'];
      let found = false;
      for (const ext of exts) {
        const checkPath = resolvedPath + ext;
        if (fs.existsSync(checkPath) && fs.statSync(checkPath).isFile()) {
          found = true;
          break;
        }
      }
      if (!found && fs.existsSync(resolvedPath) && fs.statSync(resolvedPath).isDirectory()) {
        for (const ext of exts) {
          const indexCheckPath = path.join(resolvedPath, 'index' + ext);
          if (fs.existsSync(indexCheckPath) && fs.statSync(indexCheckPath).isFile()) {
            found = true;
            break;
          }
        }
      }
      
      if (!found) {
        console.log('Faking missing module:', source, 'resolved to', resolvedPath);
        return path.resolve(__dirname, 'dummy.js');
      }
      return null;
    }
  };
};

export default defineConfig({
  plugins: [ignoreMissingPlugin(), react()],
  resolve: {
    alias: [
      { find: '@', replacement: path.resolve(__dirname, './assets/src') },
      { find: 'protocol', replacement: path.resolve(__dirname, './protocol/src/index.ts') },
      { find: 'maitai', replacement: path.resolve(__dirname, './maitai/src/index.ts') },
      { find: /^@oai\/.*/, replacement: path.resolve(__dirname, 'dummy.js') },
      { find: /^@pierre\/.*/, replacement: path.resolve(__dirname, 'dummy.js') },
      { find: /^app-server-types.*/, replacement: path.resolve(__dirname, 'dummy.js') }
    ]
  },
  define: {
    __WINDOW_TYPE__: JSON.stringify('standard')
  },
  build: { target: "esnext",
    rollupOptions: {
      external: (id) => {
        if (id.startsWith('.') || id.startsWith('/') || id.startsWith('\0') || id.startsWith('@/')) {
          return false;
        }
        return true; // Externalize all npm packages!
      }
    }
  }
});
