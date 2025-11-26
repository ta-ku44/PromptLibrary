console.log('PromptTemplate Content Script loaded');

const init = () => {
  console.log('PromptTemplate initialized on:', window.location.href);
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}