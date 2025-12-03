import type { Template } from "../types";
import { showAutocomplete, hideAutocomplete } from "./TemplateAutocomplete";

let currentTextArea: HTMLElement | null = null;
let observer: MutationObserver | null = null;

const init = () => {
  console.log('PromptTemplateを初期化:',window.location.href);
  if (observer) observer.disconnect();
  tryFindAndRegister();

  observer = new MutationObserver(() => {
    // 既に入力欄を取得していて、かつまだDOMに存在している場合
    if (currentTextArea && document.body.contains(currentTextArea) && isValidInput(currentTextArea)) return;
    // 既に取得していた入力欄がDOMから削除されていた場合
    if (currentTextArea && !document.body.contains(currentTextArea)) {
      console.log('現在の入力欄がDOMから削除されました');
      cleanUp();
    }
    tryFindAndRegister();
  });
 
  observer.observe(document.body, { childList: true, subtree: true });
}

const tryFindAndRegister = () => {
  const textArea = findTextAreas();
  if (textArea && textArea !== currentTextArea) {
    console.log('新しい入力欄を取得しました');
    registerTextArea(textArea);
  } 
}

const registerTextArea = (textarea: HTMLElement) => {
  cleanUp();

  currentTextArea = textarea;
  textarea.addEventListener('input', handleInput);

  observeTextArea();
  console.log('入力欄を登録:', textarea);
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

//* 入力欄が有効かチェック */
const isValidInput = (element: HTMLElement): boolean => {
  const style = window.getComputedStyle(element);
  return style.display !== 'none' && 
         style.visibility !== 'hidden' && 
         element.offsetParent !== null &&
         element.getBoundingClientRect().width > 0 &&
         element.getBoundingClientRect().height > 0
};

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

//** 入力イベントのハンドラ */
const handleInput = async (event: Event) => {
  const target = event.target as HTMLTextAreaElement | HTMLDivElement;
  const text = target.textContent || (target as HTMLTextAreaElement).value || '';
  
  const match = text.match(/#(\w*)$/);
  if (match) {
    const query = match[1];
    await showAutocomplete(query, currentTextArea);
  } else {
    hideAutocomplete();
  }
}

const handleTemplateSelect = (template: Template) => {
  // TODO: テンプレート内容を入力欄に挿入
  console.log('テンプレート選択:', template);
  hideAutocomplete();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

export { handleTemplateSelect };
