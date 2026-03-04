/**
 * index.js - React App Entry Point
 * --------------------------------
 * This is the first JavaScript file that runs when the app loads. It:
 * 1. Imports global styles (index.css) and i18n so translations work everywhere
 * 2. Finds the HTML element with id="root" (in public/index.html)
 * 3. Renders the App component inside it, wrapped in StrictMode (helps find bugs in development)
 * 4. Optionally reports web vitals (performance metrics) if you pass a function to reportWebVitals
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import './i18n/config';
import App from './App';
import reportWebVitals from './reportWebVitals';

// createRoot is the modern way to render a React app (React 18+)
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
