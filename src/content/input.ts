export class InputProcessor {
  private inputBox: HTMLElement;
  private key: string;
  private cachedRegex: RegExp | null = null;
  private onQueryChange: (query: string | null) => void;

  constructor(inputBox: HTMLElement, key: string, onQueryChange: (query: string | null) => void) {
    this.inputBox = inputBox;
    this.key = key;
    this.onQueryChange = onQueryChange;
  }

  public updateKey(newKey: string): void {
    if (this.key !== newKey) {
      this.key = newKey;
      this.cachedRegex = null;
    }
  }

  public getInputStatus = () => {
    const text = this.inputBox instanceof HTMLTextAreaElement ? this.inputBox.value : this.inputBox.innerText;
    const match = text.match(this.getRegex());
    try {
      if (!match) {
        this.onQueryChange(null);
        return;
      }
      this.onQueryChange(match[1] ?? '');
    } catch (error) {
      console.error('handleInputでエラーを検出:', error);
    }
  };

  //* 正規表現を取得
  private getRegex(): RegExp {
    if (this.cachedRegex) return this.cachedRegex;
    const escapedKey = this.key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    this.cachedRegex = new RegExp(`(?:^|\\s)${escapedKey}(\\S*)$`);
    return this.cachedRegex;
  }

  public insertPrompt(prompt: string): void {
    const inputBox = this.inputBox;

    if (inputBox instanceof HTMLTextAreaElement) {
      // textarea への挿入
      this.insertIntoTextArea(inputBox, prompt);
    } else if (inputBox instanceof HTMLDivElement) {
      // contenteditable への挿入
      this.insertIntoDiv(inputBox, prompt);
    } else {
      console.error('Unsupported element type:', inputBox.tagName);
      return;
    }

    inputBox.focus();
  }

  private insertIntoTextArea(el: HTMLTextAreaElement, prompt: string): void {
    const currentText = el.value;
    const newText = currentText.replace(this.getRegex(), (match) => {
      const leadingSpace = match.startsWith(' ') ? ' ' : '';
      return leadingSpace + prompt;
    });
    el.value = newText;
    el.selectionStart = el.selectionEnd = newText.length;
    el.dispatchEvent(new Event('input', { bubbles: true }));
  }

  private insertIntoDiv(inputBox: HTMLDivElement, prompt: string): void {
    const editorType = detectEditorType(inputBox);

    if (editorType === 'Lexical') {
      this.handleContentEditableInsert(inputBox, prompt);
    } else if (editorType === 'ProseMirror') {
      this.handleProseMirrorInsert(inputBox, prompt);
    } else {
      this.handleGenericInsert(inputBox, prompt);
    }
  }

  //* ProseMirror エディタへの挿入
  private handleProseMirrorInsert(inputBox: HTMLDivElement, prompt: string): void {
    const pmType = detectProseMirrorType(inputBox);

    if (pmType === 'prosemirror') {
      this.insertFromInnerText(inputBox, prompt);
    } else {
      this.handleContentEditableInsert(inputBox, prompt);
    }
  }

  //* innerTextからの挿入
  private insertFromInnerText(inputBox: HTMLDivElement, prompt: string): void {
    try {
      const newText = inputBox.innerText.replace(this.getRegex(), (match) => {
        const leadingSpace = match.startsWith(' ') ? ' ' : '';
        return leadingSpace + prompt;
      });
      inputBox.innerText = newText;
      this.moveCursorToEnd(inputBox);
      inputBox.dispatchEvent(new InputEvent('input', { bubbles: true }));
    } catch (error) {
      console.warn('ProseMirror innerText insert failed:', error);
      this.handleContentEditableInsert(inputBox, prompt);
    }
  }

  //* execCommandによる挿入を試行
  private tryExecCommandInsert(inputBox: HTMLDivElement, text: string): boolean {
    try {
      const selection = window.getSelection();
      if (!selection) return false;

      const range = document.createRange();
      range.selectNodeContents(inputBox);
      selection.removeAllRanges();
      selection.addRange(range);

      document.execCommand('delete', false, undefined);
      return document.execCommand('insertText', false, text);
    } catch (error) {
      console.warn('execCommand insert failed:', error);
      return false;
    }
  }

  //* ContentEditable共通挿入処理
  private handleContentEditableInsert(inputBox: HTMLDivElement, prompt: string): void {
    const textToInsert = prompt + '  ';

    if (!this.tryExecCommandInsert(inputBox, textToInsert)) {
      this.fallbackInsert(inputBox, textToInsert);
    }

    this.moveCursorToEnd(inputBox);
    inputBox.dispatchEvent(new Event('change', { bubbles: true }));
  }

  //* フォールバック挿入処理
  private fallbackInsert(inputBox: HTMLDivElement, text: string): void {
    try {
      inputBox.dispatchEvent(
        new InputEvent('beforeinput', {
          inputType: 'insertText',
          data: text,
          bubbles: true,
          cancelable: true,
        })
      );
      inputBox.dispatchEvent(new Event('input', { bubbles: true }));
    } catch (error) {
      inputBox.textContent = text;
      inputBox.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }

  //* 汎用的な挿入処理
  private handleGenericInsert(inputBox: HTMLDivElement, prompt: string): void {
    const textToInsert = prompt + '  ';

    if (!this.tryExecCommandInsert(inputBox, textToInsert)) {
      inputBox.textContent = textToInsert;
      this.moveCursorToEnd(inputBox);
      inputBox.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }

  //* カーソルを末尾に移動
  private moveCursorToEnd(el: HTMLDivElement): void {
    const selection = window.getSelection();
    if (!selection) return;

    try {
      const range = document.createRange();
      range.selectNodeContents(el);
      range.collapse(false);
      selection.removeAllRanges();
      selection.addRange(range);
    } catch (error) {
      console.warn('Failed to move cursor:', error);
    }
  }
}

type EditorType = 'Lexical' | 'ProseMirror' | 'unknown';

//* エディタータイプを判定
const detectEditorType = (el: HTMLDivElement): EditorType => {
  if (
    el.getAttribute('data-lexical-editor') === 'true' ||
    !!el.closest('[data-lexical-editor="true"]') ||
    el.id === 'ask-input'
  ) {
    return 'Lexical';
  }

  if (
    (el.classList && el.classList.contains('ProseMirror')) ||
    (typeof el.closest === 'function' && !!el.closest('.ProseMirror'))
  ) {
    return 'ProseMirror';
  }

  return 'unknown';
};

type ProseMirrorType = 'tiptap' | 'prosemirror';

const detectProseMirrorType = (el: HTMLDivElement): ProseMirrorType => {
  if ((el as any).__tiptapEditor || el.closest('.tiptap') || el.closest("[data-editor='tiptap']")) {
    return 'tiptap';
  }
  return 'prosemirror';
};
