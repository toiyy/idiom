import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { checkForUpdate } from './lib/version';
import './index.css';

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('#root が見つかりません');

createRoot(rootEl).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// 起動時と、他のアプリから戻ってきたときに新しい版が出ていないか確かめる。
// 解きかけの状態は都度保存しているので、読み直しても同じ問題から再開できる。
void checkForUpdate();
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) void checkForUpdate();
});
