import type { Template } from "../types";

export class InputHandler {
  private cachedRegex: RegExp | null = null;

  inputElement: HTMLTextAreaElement | HTMLDivElement;
  key: string;
  onQueryChange: (query: string | null) => void;

  constructor(inputElement: HTMLTextAreaElement | HTMLDivElement, key: string, onQueryChange: (query: string | null) => void) {
    this.inputElement = inputElement;
    this.key = key;
    this.onQueryChange = onQueryChange;
  }

  //* 入力イベントを処理
  public handleInput = () => {
    const text = this.getTextContent();
    const match = text.match(this.getRegex());
    try {
      if (!match) {
        this.onQueryChange(null);
        return;
      }
      this.onQueryChange(match[1] ?? "");
    } catch (error) {
      console.error('handleInputでエラーを検出:', error);
    }
  };

  //* テンプレートを挿入
  public insertPrompt = (template: Template) => {
    const el = this.inputElement;

    if (el instanceof HTMLTextAreaElement) {
      this.insertIntoTextArea(el, template.content);
    } else if (el instanceof HTMLDivElement) {
      this.insertIntoContentEditable(el, template.content);
    } else {
      console.error('サポートされていない入力要素:', el);
      return;
    }

    el.focus();
  };

  //* トリガーキーを更新
  public updateKey(newKey: string) {
    if (this.key !== newKey) {
      this.key = newKey;
      this.cachedRegex = null;
    }
  }

  //* TextAreaへの挿入処理
  private insertIntoTextArea(el: HTMLTextAreaElement, content: string) {
    const regex = this.getRegex();
    const newText = el.value.replace(regex, (match) => {
      const leadingSpace = match.startsWith(" ") ? " " : "";
      return leadingSpace + content;
    });

    el.value = newText;
    el.selectionStart = el.selectionEnd = newText.length;
    el.dispatchEvent(new Event("input", { bubbles: true }));
  }

  //* ContentEditableへの挿入処理
  private insertIntoContentEditable(el: HTMLDivElement, content: string) {
    const editorType = this.detectEditorType(el);

    if (editorType === "prosemirror") {
      this.handleProseMirrorInsert(el, content);
    } else if (editorType === "lexical") {
      // TODO: Lexical用の処理
    } else {
      this.insertViaExecCommand(el, content) || this.fallbackInsert(el, content);
    }
  }

  //* ProseMirror系エディタへの挿入
  private handleProseMirrorInsert(el: HTMLDivElement, content: string) {
    const type = this.detectProseMirrorType(el);

    if (type === "tiptap") {
      this.insertViaExecCommand(el, content) || this.fallbackInsert(el, content);
    } else if (type === "prosemirror") {
      this.insertViaInnerText(el, content);
    } else {
      this.fallbackInsert(el, content);
    }
  }

  //* テキスト内容を取得
  private getTextContent(): string {
    return this.inputElement instanceof HTMLTextAreaElement
      ? this.inputElement.value
      : this.inputElement.innerText;
  }

  //* 正規表現を取得
  private getRegex(): RegExp {
    if (this.cachedRegex) return this.cachedRegex;
    const escapedKey = this.key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    this.cachedRegex = new RegExp(`(?:^|\\s)${escapedKey}(\\S*)$`);
    return this.cachedRegex;
  }

  //* エディタータイプを返す
  private detectEditorType(el: HTMLDivElement): "lexical" | "prosemirror" | "standard" {
    if (el.closest('[data-lexical-editor="true"]')) return "lexical";
    if (el.closest(".ProseMirror")) return "prosemirror";
    return "standard";
  };

  //* ProseMirrorの種類を判定
  private detectProseMirrorType(el: HTMLDivElement): "tiptap" | "prosemirror" | "unknown" {
    if (!el.isContentEditable) return "unknown";
    if (!el.classList.contains("ProseMirror")) return "unknown";

    // tiptap判定
    if ((el as any).__tiptapEditor || el.closest(".tiptap") || el.closest("[data-editor='tiptap']")) {
      return "tiptap";
    }
    // 要素内になければProseMirrorと判定
    return "prosemirror";
  }

  //* innerTextで挿入
  private insertViaInnerText = (el: HTMLDivElement, text: string) => {
    try {
      el.innerText = text;
      this.moveCursorToEnd(el);
      el.dispatchEvent(new InputEvent("input", { bubbles: true }));
    } catch (error) {
      console.log('innerTextによる挿入に失敗:', error);
    }
  }

  //* execCommandで挿入
  private insertViaExecCommand(el: HTMLDivElement, text: string): boolean {
    try {
      this.moveCursorToEnd(el);
      const success = document.execCommand("insertText", false, text);
      if (success) el.dispatchEvent(new InputEvent("input", { bubbles: true }));
      return success;
    } catch (error) {
      console.log('execCommandによる挿入に失敗:', error);
      return false;
    }
  }

  //* フォールバック挿入
  private fallbackInsert(el: HTMLDivElement, text: string) {
    console.log('フォールバック挿入を実行');

    el.textContent = text;
    this.moveCursorToEnd(el);
    el.dispatchEvent(new InputEvent("input", { bubbles: true }));
  }

  //* カーソルを末尾に移動
  private moveCursorToEnd(el: HTMLDivElement) {
    const selection = this.inputElement.ownerDocument?.getSelection();
    if (!selection) return;
    const range = document.createRange();
    const textNode = el.childNodes[el.childNodes.length - 1] || el;
    const offset = textNode.textContent?.length || 0;
    try {
      range.setStart(textNode, offset);
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);
    } catch(error) {
      console.error('カーソルの移動でエラーを検出:', error);
    }
  }
}