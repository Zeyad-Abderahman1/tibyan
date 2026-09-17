import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './app/App.js';
import './styles/index.css';

export const DESKTOP_RENDERER_READY = true;

const rootElement = document.getElementById('root');

if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
