import type { Template } from "../types";
import { viewSuggest, hideSuggest } from "./Suggest";
import browser from 'webextension-polyfill';

let currentTextArea: HTMLElement | null = null;
let observer: MutationObserver | null = null;
let key: string = '#';

const init = async () => {
  console.log('PromptTemplateを初期化:',window.location.href);

  key = await browser.storage.sync.get('data').then(result => {
    const data = result.data as { shortcutKey?: string } | undefined;
    return data?.shortcutKey ?? '#';
  });

  if (observer) observer.disconnect();
  tryFindAndRegister();

  observer = new MutationObserver(() => {
    // 既に入力欄を取得していて、かつまだDOMに存在している場合
    if (currentTextArea && document.body.contains(currentTextArea) && isValidInput(currentTextArea)) return;
    // 既に取得していた入力欄がDOMから削除されていた場合
    if (currentTextArea && !document.body.contains(currentTextArea)) {
      console.log('現在の入力欄がDOMから削除された');
      cleanUp();
    }
    
    tryFindAndRegister();
  });

  observer.observe(document.body, { childList: true, subtree: true });
}

const tryFindAndRegister = () => {
  const textArea = findTextAreas();
  if (textArea && textArea !== currentTextArea) {
    console.log('新しい入力欄を取得した');
    cleanUp();

    currentTextArea = textArea;
    textArea.addEventListener('input', handleInput);

    observeTextArea();
    console.log('入力欄を登録:', textArea);
  }
}

const cleanUp = () => {
  if (currentTextArea) {
    currentTextArea.removeEventListener('input', handleInput);
    currentTextArea = null;
  }
  if (observer) {
    observer.disconnect();
    observer = null;
  }
}

const observeTextArea = () => {
  observer = new MutationObserver(()=> {
    if (currentTextArea && !document.contains(currentTextArea)) {
      console.log('入力欄がDOMから削除、監視を再開');
      init();
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
}

const findTextAreas = (): HTMLElement | null => {
  const selectors = [
    '[role="textbox"]', // textboxを探索
    'textarea:not([disabled]):not([readonly])', // textareaを探索
    '[contenteditable="true"]' // contenteditableを探索
  ];

  for (const s of selectors) {
    const elements = document.querySelectorAll(s);
    for (const el of elements) {
      const htmlEl = el as HTMLElement;
      if (isValidInput(htmlEl)) return htmlEl;
    }
  }
  return null;
};

//* 入力欄が有効かチェック */
const isValidInput = (element: HTMLElement): boolean => {
  const style = window.getComputedStyle(element);
  const rect = element.getBoundingClientRect();
  return style.display !== 'none' && 
         style.visibility !== 'hidden' && 
         element.offsetParent !== null &&
         rect.width > 0 &&
         rect.height > 0
};

//* 入力欄を監視 */
const handleInput = async () => {
  if (!currentTextArea) return;
  try {
    const match = await checkFormat(currentTextArea as HTMLTextAreaElement | HTMLDivElement);
    if (match) {
      const query = match[1];
      await viewSuggest(query, currentTextArea);
    } else {
      hideSuggest();
    }
  } catch (e) {
    console.error(e);
    return;
  }
}

//* テンプレートを挿入 */
export const insertTemplate = (template: Template) => {
  if (!currentTextArea) return;
  
  const text = currentTextArea.textContent || (currentTextArea as HTMLTextAreaElement).value || '';
  const newText = text.replace(getRegex(), (match) => {
    const leadingSpace = match.startsWith(' ') ? ' ' : '';
    return leadingSpace + template.content;
  });

  if (currentTextArea instanceof HTMLTextAreaElement) {
    // テキストエリアの場合
    currentTextArea.value = newText;
    currentTextArea.dispatchEvent(new Event('input', { bubbles: true }));
  } else {
    // contenteditableの場合
    currentTextArea.innerText = newText;
    currentTextArea.dispatchEvent(new InputEvent('input', { bubbles: true }));
  }
  currentTextArea.focus();
}

const checkFormat = async ( target: HTMLTextAreaElement | HTMLDivElement ): Promise<RegExpMatchArray | null> => {
  const text = target.textContent || (target as HTMLTextAreaElement).value || '';
  return text.match(getRegex());
}

const getRegex = () => {
  return new RegExp(`(?:^|\\s)${key}([^${key}\\s]*)$`);
}

//* 禁止文字のチェック */
// const checkForbiddenChars = (input: string): boolean => {
//   const forbiddenChars = ['!', '@', '#', '$', '%', '^', '&', '*', '(', ')', '+', '=', '{', '}', '[', ']', '|', '\\', ':', ';', '"', "'", '<', '>', ',', '.', '?', '/','~','`'];
//   for (const char of forbiddenChars) {
//     if (input.includes(char)) {
//       return false;
//     }
//   }
//   return true;
// }

//* ショートカットキーの監視 */
browser.storage.onChanged.addListener(async (changes, area) => {
  if (area === 'sync' && changes.data) {
    const newData = changes.data.newValue as { shortcutKey: string } | undefined;
    const newShortcut = newData?.shortcutKey;
    if (typeof newShortcut === 'string' && newShortcut !== key) {
      key = newShortcut;
      console.log('ショートカットキーが更新されました:', key);
    }
  }
});

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}