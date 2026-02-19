import { defineConfig } from 'wxt';
import tailwindcss from '@tailwindcss/vite';

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-react', '@wxt-dev/auto-icons'],
  vite: () => ({
    plugins: [tailwindcss()],
  }),
  manifest: {
    name: 'Prompt Library',
    description: 'Prompt management tool — save, organize, and quickly insert your frequently used prompts.',
    version: '0.0.1',
    permissions: ['storage', 'tabs'],
  },
  srcDir: 'src',
});
