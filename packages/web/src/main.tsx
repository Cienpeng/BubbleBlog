import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { initializeSessionImageCache } from './lib/sessionImageCache';
import './index.css';
import 'katex/dist/katex.min.css';
import 'highlight.js/styles/atom-one-dark.css';

const root = ReactDOM.createRoot(document.getElementById('root')!);

initializeSessionImageCache().finally(() => {
  root.render(
    <React.StrictMode>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </React.StrictMode>
  );
});
