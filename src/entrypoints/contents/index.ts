import { init } from './contentsApp';

export default defineContentScript({
  matches: ['<all_urls>'],
  main: async () => {
    await init();
  },
});
