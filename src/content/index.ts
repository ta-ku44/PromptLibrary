import { DomObserver } from './dom.ts';
import { InputProcessor } from './input.ts';
import { showSuggest, hideSuggest, clearCachedData } from './suggest.tsx';
import browser from 'webextension-polyfill';

let inputProcessor: InputProcessor | null = null;
let key = '#';
let curInputBox: HTMLElement | null = null;

const init = async () => {
  await loadKey();

  const domObserver = new DomObserver({
    onFound: setup,
    onLost: cleanup,
  });

  domObserver.start();

  window.addEventListener('beforeunload', () => {
    domObserver.stop();
    cleanup();
  });
};

const setup = (el: HTMLElement) => {
  if (curInputBox === el) return;
  cleanup();
  curInputBox = el;
  inputProcessor = new InputProcessor(curInputBox, key, (query) => {
    if (query !== null) {
      showSuggest(curInputBox!, query, (template) => inputProcessor?.insertPrompt(template.content));
    } else {
      hideSuggest();
    }
  });
  curInputBox.addEventListener('input', inputProcessor.getInputStatus);
};

const cleanup = () => {
  if (curInputBox && inputProcessor) curInputBox.removeEventListener('input', inputProcessor.getInputStatus);
  hideSuggest();
  inputProcessor = null;
  curInputBox = null;
};

const loadKey = async () => {
  const result = await browser.storage.sync.get('data');
  key = (result.data as { shortcutKey: string }).shortcutKey || '#';

  if (inputProcessor) {
    inputProcessor.updateKey(key);
  }
};

browser.storage.onChanged.addListener((changes, area) => {
  if (area !== 'sync') return;
  if (changes.data) {
    clearCachedData();
    const newKey = (changes.data.newValue as { shortcutKey: string })?.shortcutKey;
    if (typeof newKey === 'string') {
      key = newKey;
      if (inputProcessor) {
        inputProcessor.updateKey(key);
      }
    }
  }
});

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
