export class DomObserver {
  private curTextArea: HTMLElement | null = null;
  private observer: MutationObserver | null = null;
  private onFound: (el: HTMLElement) => void;
  private onLost?: () => void;

  constructor(opts: { onFound: (el: HTMLElement) => void; onLost?: () => void; }) {
    this.onFound = opts.onFound;
    this.onLost = opts.onLost;
  }

  //* 監視を開始
  public start = () => {
    if (this.observer) this.observer.disconnect();

    this.observer = new MutationObserver(() => {
      // 既に入力欄を取得していてかつ、まだDOMに存在している場合
      if (this.curTextArea && document.body.contains(this.curTextArea) && this.isValidInput(this.curTextArea)) return;
      // 既に取得していた入力欄がDOMから削除されていた場合
      if (this.curTextArea && !document.body.contains(this.curTextArea)) {
        console.log('現在の入力欄がDOMから削除された');
        this.curTextArea = null;
        this.onLost?.();
      }
      this.assignTextArea();
    });
    this.observer.observe(document.body, { childList: true, subtree: true });
  };

  //* 監視を停止
  public stop = () => {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    this.curTextArea = null;
  };

  //* 入力欄を割り当て
  private assignTextArea = async (): Promise<void> => {
    const textArea = this.findTextAreas();
    
    if (textArea && textArea !== this.curTextArea) {
      this.curTextArea = textArea;
      this.onFound(textArea);
    } else if (!textArea) {
      console.log('有効な入力欄が見つかりませんでした');
    }
  };

  //* テキストエリアまたはコンテンツエディタブル要素を検索
  private findTextAreas = (): HTMLElement | null => {
    const selectors = [
      '[contenteditable="true"]',
      'textarea:not([disabled]):not([readonly])',
    ];

    for (const s of selectors) {
      const elements = document.querySelectorAll(s);
      for (const el of elements) {
        const htmlEl = el as HTMLElement;
        if (this.isValidInput(htmlEl)) return htmlEl;
      }
    }
    return null;
  };

  //* 要素が有効な入力欄かどうかを判定
  private isValidInput = (element: HTMLElement): boolean => {
    if (!element || !element.isConnected) return false;
    
    const style = window.getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    return style.display !== 'none' && 
          style.visibility !== 'hidden' &&
          element.offsetParent !== null &&
          rect.width > 0 &&
          rect.height > 0;
  };
}