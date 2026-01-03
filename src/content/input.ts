export class InputProcessor {
  private inputEl: HTMLElement;
  private key: string;
  private cachedRegex: RegExp | null = null; // 正規表現のキャッシュ
  private onQueryChange: (query: string | null) => void;

  constructor(inputElement: HTMLElement, key: string, onQueryChange: (query: string | null) => void) {
    this.inputEl = inputElement;
    this.key = key;
    this.onQueryChange = onQueryChange;
  }

  //* トリガーキーを更新
  public updateKey(newKey: string) {
    if (this.key !== newKey) {
      this.key = newKey;
      this.cachedRegex = null;
    }
  }

  //* 入力状況を出力
  public getInputStatus = () => {
    const text = this.inputEl instanceof HTMLTextAreaElement ? this.inputEl.value : this.inputEl.innerText;
    const match = text.match(this.getRegex());
    try {
      console.log('No match found');
      if (!match) {
        this.onQueryChange(null);
        return;
      }
      console.log('Match found:', match[0], 'Query:', match[1]);
      this.onQueryChange(match[1] ?? '');
    } catch (error) {
      console.error('handleInputでエラーを検出:', error);
    }
  };

  //* テンプレートを挿入
  public insertPrompt = (prompt: string) => {
    console.group('Inserting Template');

    const el = this.inputEl;
    console.log('HTMLElement type:', el.tagName);

    if (el instanceof HTMLTextAreaElement) {
      this.insertIntoTextArea(el, prompt);
    } else if (el instanceof HTMLDivElement) {
      this.insertIntoDiv(el, prompt);
    } else {
      console.error('Unsupported element type', el);
      return;
    }

    console.groupEnd();
    el.focus();
  };

  //* 正規表現を取得
  private getRegex(): RegExp {
    if (this.cachedRegex) return this.cachedRegex;
    const escapedKey = this.key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    this.cachedRegex = new RegExp(`(?:^|\\s)${escapedKey}(\\S*)$`);
    return this.cachedRegex;
  }

  //* TextAreaへの挿入処理
  private insertIntoTextArea(el: HTMLTextAreaElement, prompt: string) {
    const currentText = el.value;
    const newText = currentText.replace(this.getRegex(), (match) => {
      const leadingSpace = match.startsWith(' ') ? ' ' : '';
      return leadingSpace + prompt;
    });
    el.value = newText;
    el.selectionStart = el.selectionEnd = newText.length;
    el.dispatchEvent(new Event('input', { bubbles: true }));
  }

  //* ContentEditableへの挿入処理
  private insertIntoDiv(el: HTMLDivElement, prompt: string) {
    // リッチテキストエディタの種類を判定(詳細はNotionに記載)
    const editorType: EditorType = detectEditorType(el);
    console.log('ContentEditable Editor Type:', editorType);

    if (editorType === 'ProseMirror') {
      this.handleProseMirrorInsert(el, prompt);
    } else if (editorType === 'Lexical') {
      this.removeMatchedText(el);
      this.insertViaInputEvent(el, prompt);
    } else {
      console.log('unknown editor type, using execCommand insertion');
      this.insertViaExecCommand(el, prompt) || this.fallbackInsert(el, prompt);
    }
  }

  //* ProseMirror系エディタへの挿入
  private handleProseMirrorInsert(el: HTMLDivElement, prompt: string) {
    const proseMirrorType: ProseMirrorType = detectProseMirrorType(el);
    console.log('ProseMirror Type:', proseMirrorType);

    if (proseMirrorType === 'tiptap') {
      this.insertViaExecCommand(el, prompt) || this.fallbackInsert(el, prompt);
    } else if (proseMirrorType === 'prosemirror') {
      this.insertAsPlainText(el, prompt);
    }
  }

  private removeMatchedText(el: HTMLDivElement) {
    const text = el.innerText;
    const newText = text.replace(this.getRegex(), (match) => {
      return match.startsWith(' ') ? ' ' : '';
    });
    el.innerText = newText;
    this.moveCursorToEnd(el);
  }

  //* execCommandで挿入
  private insertViaExecCommand(el: HTMLDivElement, text: string): boolean {
    if (!text) return false;
    try {
      // match部分を削除してからテキストを挿入
      this.removeMatchedText(el);
      const success = document.execCommand('insertText', false, text);
      if (success) el.dispatchEvent(new InputEvent('input', { bubbles: true }));
      return success;
    } catch (error) {
      console.log('execCommandによる挿入に失敗:', error);
      return false;
    }
  }

  //* innerTextで挿入
  private insertAsPlainText = (el: HTMLDivElement, prompt: string) => {
    try {
      const text = el.innerText;
      const newText = text.replace(this.getRegex(), (match) => {
        const leadingSpace = match.startsWith(' ') ? ' ' : '';
        return leadingSpace + prompt;
      });
      el.innerText = newText;
      this.moveCursorToEnd(el);
      el.dispatchEvent(new InputEvent('input', { bubbles: true }));
    } catch (error) {
      console.log('innerTextによる挿入に失敗:', error);
    }
  };

  //* InputEventで挿入
  private insertViaInputEvent(el: HTMLDivElement, text: string): boolean {
    el.focus();

    const selection = window.getSelection();
    if (!selection) return false;

    selection.removeAllRanges();
    const range = document.createRange();
    range.selectNodeContents(el);
    range.collapse(false);
    selection.addRange(range);

    try {
      el.dispatchEvent(
        new InputEvent('beforeinput', {
          inputType: 'insertText',
          data: text,
          bubbles: true,
          cancelable: true,
        }),
      );

      el.dispatchEvent(
        new InputEvent('input', {
          inputType: 'insertText',
          data: text,
          bubbles: true,
        }),
      );

      return true;
    } catch (error) {
      console.error('InputEventによる挿入に失敗:', error);
      return false;
    }
  }

  //* フォールバック挿入
  private fallbackInsert(el: HTMLDivElement, text: string) {
    console.log('フォールバック挿入を実行');

    try {
      el.textContent = text;
      this.moveCursorToEnd(el);
      el.dispatchEvent(new InputEvent('input', { bubbles: true }));
    } catch (error) {
      console.error('フォールバック挿入でエラーを検出:', error);
    }
  }

  //* カーソルを末尾に移動
  private moveCursorToEnd(el: HTMLDivElement) {
    const selection = this.inputEl.ownerDocument?.getSelection();
    if (!selection) return;
    const range = document.createRange();
    const textNode = el.childNodes[el.childNodes.length - 1] || el;
    const offset = textNode.textContent?.length || 0;
    try {
      range.setStart(textNode, offset);
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);
    } catch (error) {
      console.error('カーソルの移動でエラーを検出:', error);
    }
  }
}

type EditorType = 'Lexical' | 'ProseMirror' | 'unknown';
type ProseMirrorType = 'tiptap' | 'prosemirror';

//* エディタータイプを返す
const detectEditorType = (el: HTMLDivElement): EditorType => {
  if (el.closest('.ProseMirror')) return 'ProseMirror';
  if (el.closest('[data-lexical-editor]')) return 'Lexical';
  return 'unknown';
};

//* ProseMirrorの種類を判定
const detectProseMirrorType = (el: HTMLDivElement): ProseMirrorType => {
  if ((el as any).__tiptapEditor || el.closest('.tiptap') || el.closest("[data-editor='tiptap']")) return 'tiptap';
  return 'prosemirror';
};
