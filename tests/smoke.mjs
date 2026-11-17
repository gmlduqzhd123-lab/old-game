// 엽쌤 앱 기본 점검: 첫 화면이 열리는지, 화면 오류가 없는지, 📲 설치·📱 QR 버튼이 있는지,
// 휴대폰(390px)에서 옆으로 넘치지 않는지 확인한다. GitHub Actions(.github/workflows/smoke.yml)에서 돌아간다.
// 사용: SMOKE_URL=http://localhost:8080/<저장소>/ node tests/smoke.mjs
import { chromium } from 'playwright';

const url = process.env.SMOKE_URL;
if (!url) throw new Error('SMOKE_URL 이 필요합니다');
const browser = await chromium.launch();
const problems = [];
for (const width of [390, 1280]) {
  const page = await browser.newPage({ viewport: { width, height: 800 } });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  const res = await page.goto(url, { waitUntil: 'load' });
  await page.waitForTimeout(1500);
  if (!res || !res.ok()) problems.push(`${width}px: 첫 화면 응답 ${res && res.status()}`);
  if (errors.length) problems.push(`${width}px: 화면 오류 ${errors.slice(0, 3).join(' | ')}`);
  const check = await page.evaluate(() => ({
    title: document.title.trim(),
    // 측정기(topcheck.cjs)와 같은 기준: 공통 속성이 없으면 버튼 글자로 찾는다
    install: !!document.querySelector('[data-ys-install],.install-btn,#installApp,.install-button')
      || [...document.querySelectorAll('button,a')].some(b => /앱\s?설치|📲/.test(b.textContent)),
    qr: !!document.querySelector('[data-qr],[data-qr-btn],#qrApp,.qr-button')
      || [...document.querySelectorAll('button,a')].some(b => /\bQR\b/i.test(b.textContent)),
    overflow: document.documentElement.scrollWidth - innerWidth,
  }));
  if (!check.title) problems.push(`${width}px: 제목(<title>)이 비어 있음`);
  if (!check.install || !check.qr) problems.push(`${width}px: 📲 설치·📱 QR 버튼이 없음`);
  if (width === 390 && check.overflow > 1) problems.push(`390px: 화면이 옆으로 ${check.overflow}px 넘침`);
  await page.close();
}
await browser.close();
if (problems.length) { console.error('점검 실패\n- ' + problems.join('\n- ')); process.exit(1); }
console.log('점검 통과: 첫 화면·오류 없음·설치/QR 버튼·휴대폰 가로 넘침 없음');
