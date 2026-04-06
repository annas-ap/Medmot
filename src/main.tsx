import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { FilterProvider } from './contexts/FilterContext';
import { ToastProvider } from './contexts/ToastContext';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ToastProvider>
      <FilterProvider>
        <App />
      </FilterProvider>
    </ToastProvider>
  </StrictMode>,
);
