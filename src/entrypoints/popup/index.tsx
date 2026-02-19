import React from 'react';
import ReactDOM from 'react-dom/client';
import '@/assets/tailwind.css';

import PopupApp from './popupApp';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <PopupApp />
  </React.StrictMode>,
);
