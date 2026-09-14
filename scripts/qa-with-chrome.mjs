// Playwright 전용 브라우저가 없는 PC에서 설치된 Chrome으로 기존 qa-*.mjs를 실행한다.
// 사용: QA_BASE=http://localhost:4323 node scripts/qa-with-chrome.mjs ./qa-ballon-dor.mjs (먼저 npm run build 뒤 bbinge-fc-preview 서버)
import { chromium } from 'playwright';
const orig = chromium.launch.bind(chromium);
chromium.launch = (opts = {}) => orig({ ...opts, executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
await import(new URL(process.argv[2], import.meta.url));
