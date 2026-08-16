import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Belt-and-braces alongside the CSS user-select rules: some Android WebViews
// still show a text-selection/copy popup on long-press unless the native
// context menu and selection events are also stopped in JS.
document.addEventListener('contextmenu', e => e.preventDefault());
document.addEventListener('selectstart', e => e.preventDefault());

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
