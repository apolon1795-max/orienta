import './styles.css';
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
export const mount = (element: HTMLElement) => { const root=createRoot(element);root.render(<App/>);return()=>root.unmount(); };
