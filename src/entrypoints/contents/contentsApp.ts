import { DomObserver } from './utils/domObserver';

let triggerKey: string;
let curInputBox: HTMLElement | null = null;

export async function init() {
  await loadKey();

  const observer = new DomObserver({
    onFound: setup,
    onLost: cleanup,
  });

  observer.start();
}

function setup(inputBox: HTMLElement): void {
  if (inputBox === curInputBox) return;
  cleanup();
  curInputBox = inputBox;
  curInputBox.addEventListener('input', handleInput);
}

function cleanup() {
  if (curInputBox) curInputBox.removeEventListener('input', handleInput);
  curInputBox = null;
}

function handleInput(): void {
  if (!curInputBox) return;

}

async function loadKey(): Promise<void> {

}
