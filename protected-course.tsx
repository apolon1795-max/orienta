import './styles.css';
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import type { CourseEntry } from './services/courseEntry';
export const mount = (element: HTMLElement, entry?: CourseEntry) => {
 const root = createRoot(element);
 root.render(<App entry={entry} />);
 return () => root.unmount();
};
