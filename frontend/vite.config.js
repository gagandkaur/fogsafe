import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import basicSsl from '@vitejs/plugin-basic-ssl';
import path from 'path';
// HTTPS is required for phone GPS. The proxy keeps the API/socket on the same https origin.
export default defineConfig({
  plugins: [react(), basicSsl()],
  resolve: { alias: { '@core': path.resolve(__dirname, '../shared/core/index.js') } },
  server: {
    host: true,
    fs: { allow: ['..'] },
    proxy: { '/api': 'http://localhost:4000', '/socket.io': { target: 'http://localhost:4000', ws: true } },
  },
});
