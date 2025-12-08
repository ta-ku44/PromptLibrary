import type { Template } from "../types";

export class InputHandler {
  inputElement: HTMLTextAreaElement | HTMLDivElement;
  key: string;
  onQueryChange: (query: string | null) => void;

  constructor(inputElement: HTMLTextAreaElement | HTMLDivElement, key: string, onQueryChange: (query: string | null) => void) {
    this.inputElement = inputElement;
    this.key = key;
    this.onQueryChange = onQueryChange;
  }

  public updateKey(newKey: string) {
    this.key = newKey;
    console.log('InputHandlerのkey更新:', newKey);
  }

  public handleInput = async () => {
    const match = await this.checkFormat(this.inputElement);
    if (match) {
      const query = match[1] ?? '';
      console.log('トリガー検知:', this.key, query);
      this.onQueryChange(query);
    } else {
      this.onQueryChange(null);
    }
  };

  public insertTemplate = (template: Template) => {
    const el = this.inputElement;
    const regex = this.getRegex();

    const oldText = el instanceof HTMLTextAreaElement ? el.value : el.innerText;

    const newText = oldText.replace(regex, (match) => {
      const leadingSpace = match.startsWith(' ') ? ' ' : '';
      return leadingSpace + template.content;
    });

    if (el instanceof HTMLTextAreaElement) {
      // テキストを置換
      el.value = newText;

      // カーソルを末尾に移動
      el.selectionStart = el.selectionEnd = newText.length;

      // 入力イベントを発火
      el.dispatchEvent(new Event('input', { bubbles: true }));
    } else {
      // テキストを置換
      el.innerText = newText;
      
      // カーソルを末尾に移動
      const range = document.createRange();
      const sel = window.getSelection();

      range.selectNodeContents(el);
      range.collapse(false);

      sel?.removeAllRanges();
      sel?.addRange(range);

      // 入力イベントを発火
      el.dispatchEvent(new InputEvent('input', { bubbles: true }));
    }

    el.focus();
  };

  private checkFormat = async (target: HTMLTextAreaElement | HTMLDivElement) => {
    const text = target instanceof HTMLTextAreaElement
      ? target.value
      : target.innerText;

    return text.match(this.getRegex());
  };

  private getRegex = () => {
    const escapedKey = this.escapeRegex(this.key);
    return new RegExp(`(?:^|\\s)${escapedKey}([^${escapedKey}\\s]*)$`);
  };

  private escapeRegex = (text: string) => {
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  };
}
