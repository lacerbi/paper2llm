// AI Summary: Entry point for the React application.
// Renders the main App component to the DOM.

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './web/App';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
