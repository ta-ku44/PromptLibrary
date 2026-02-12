export class DomObserver {
  private curInputBox: HTMLElement | null = null;
  private observer: MutationObserver | null = null;
  private onFound: (inputBox: HTMLElement) => void;
  private onLost?: () => void;

  constructor(opts: { onFound: (inputBox: HTMLElement) => void; onLost?: () => void }) {
    this.onFound = opts.onFound;
    this.onLost = opts.onLost;
  }

  public start() {
    if (this.observer) this.observer.disconnect();

    this.observer = new MutationObserver(() => {
      // 既に入力欄を取得していてかつ、まだDOMに存在している場合
      if (this.curInputBox && document.body.contains(this.curInputBox) && this.isVisibleInput(this.curInputBox)) return;
      // 既に取得していた入力欄がDOMから削除されていた場合
      if (this.curInputBox && !document.body.contains(this.curInputBox)) {
        this.curInputBox = null;
        this.onLost?.();
      }
      this.assignInputBox();
    });

    this.observer.observe(document.body, { childList: true, subtree: true });
  }

  public stop() {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    this.curInputBox = null;
  }

  private assignInputBox() {
    const foundInputBox = this.findInputBox();

    if (foundInputBox && foundInputBox !== this.curInputBox) {
      this.curInputBox = foundInputBox;
      this.onFound(foundInputBox);
    } else if (!foundInputBox) {
      console.log('有効な入力欄が見つかりませんでした');
    }
  }

  //* テキストエリアまたはコンテンツエディタブル要素を探索
  private findInputBox(): HTMLElement | null {
    const selectors = ['[contenteditable="true"]', 'textarea:not([disabled]):not([readonly])'];

    for (const s of selectors) {
      const elements = document.querySelectorAll(s);
      for (const el of elements) {
        const htmlEl = el as HTMLElement;
        if (this.isVisibleInput(htmlEl)) return htmlEl;
      }
    }
    return null;
  }

  //* 要素が有効な入力欄かどうかを判定
  private isVisibleInput(el: HTMLElement): boolean {
    if (!el || !el.isConnected) return false;

    const style = window.getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    return (
      style.display !== 'none' &&
      style.visibility !== 'hidden' &&
      el.offsetParent !== null &&
      rect.width > 0 &&
      rect.height > 0
    );
  }
}
