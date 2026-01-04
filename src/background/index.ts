/// <reference types="chrome"/>

// Background Service Worker
console.log('Prompt Library: Background service worker loaded');

chrome.runtime.onInstalled.addListener(() => {
  console.log('Prompt Library: Extension installed');
});

chrome.action.onClicked.addListener(() => {
  chrome.runtime.openOptionsPage();
});
