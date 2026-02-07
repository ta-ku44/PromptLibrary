import { DomObserver } from './domObserver.ts';
import { detectTrigger, insertPrompt, getTextContent } from './utils/inputBox.ts';
import { showSuggest, hideSuggest, clearCachedData } from './ui/suggest.tsx';
import browser from 'webextension-polyfill';

let key: string = '#';
let curInputBox: HTMLElement | null = null;

async function init() {
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
}

function setup(inputBox: HTMLElement): void {
  if (curInputBox === inputBox) return;
  cleanup();
  curInputBox = inputBox;
  curInputBox.addEventListener('input', handleInput);
}

function cleanup(): void {
  if (curInputBox) curInputBox.removeEventListener('input', handleInput);
  hideSuggest();
  curInputBox = null;
}

function handleInput(): void {
  if (!curInputBox) return;

  const text = getTextContent(curInputBox);
  const query = detectTrigger(text, key);

  if (query !== null) {
    showSuggest(curInputBox, query, (template) => {
      insertPrompt(curInputBox!, template.content, key);
    });
  } else {
    hideSuggest();
  }
}

async function loadKey(): Promise<void> {
  const result = await browser.storage.sync.get('data');
  key = (result.data as { shortcutKey: string }).shortcutKey || '#';
}

browser.storage.onChanged.addListener((changes, area) => {
  if (area !== 'sync') return;
  if (changes.data) {
    clearCachedData();
    const newKey = (changes.data.newValue as { shortcutKey: string })?.shortcutKey;
    if (typeof newKey === 'string') {
      key = newKey;
    }
  }
});

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
