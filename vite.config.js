// src/vite.config.js (CÓDIGO LIMPIO)

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
// Eliminamos: import { Buffer } from 'buffer'; 
import * as path from 'path'; // Se mantiene si se usa, sino se puede borrar

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  
  // ELIMINAMOS COMPLETAMENTE LA SECCIÓN define:
  /*
  define: {
    global: 'globalThis',
    'Buffer': Buffer,
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV),
    //...
  },
  */
  
  // ELIMINAMOS COMPLETAMENTE LA SECCIÓN resolve:
  /*
  resolve: {
    alias: {
      'buffer': 'buffer',
      'process': 'process', 
    },
  },
  */

  // ELIMINAMOS COMPLETAMENTE LA SECCIÓN optimizeDeps:
  /*
  optimizeDeps: {
    include: ['js-stellar-sdk', 'buffer'], 
    commonjsOptions: {
      include: [/node_modules/],
    },
  }
  */
});