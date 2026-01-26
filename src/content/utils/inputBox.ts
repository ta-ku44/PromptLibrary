import { insertIntoInputBox, replaceVariables } from './editor';
import { showModal } from '../ui/model.tsx';

export function detectTrigger(text: string, key: string): string | null {
  const regex = buildTriggerRegex(key);
  const match = text.match(regex);
  return match ? match[1] ?? '' : null;
}

export function insertPrompt(inputBox: HTMLElement, prompt: string, triggerKey: string): void {
  insertIntoInputBox(inputBox, buildTriggerRegex(triggerKey), prompt);

  requestAnimationFrame(() => {
    processVariables(inputBox, prompt);
  });

  inputBox.focus();
}

export function getTextContent(el: HTMLElement): string {
  return el instanceof HTMLTextAreaElement ? el.value : el.innerText;
}

function buildTriggerRegex(key: string): RegExp {
  const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(?:^|\\s)${escapedKey}(\\S*)$`);
}

function processVariables(inputBox: HTMLElement, prompt: string): void {
  const matches = [...prompt.matchAll(/\{\{([^}]+)\}\}/g)];
  if (matches.length === 0) return;

  const variables = matches.map((m) => m[1]);

  showModal(variables, (replacements: Record<string, string>) => {
    replaceVariables(replacements, inputBox);
  });
}