import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';

const base = process.env.EH_QA_BASE ?? 'http://127.0.0.1:4323';
const out = process.env.EH_QA_DIR ?? '.qa-ernst-happel';
const slug = '/tactics/ernst-happel-three-champions-league-finals-tactics/';
const widths = [380, 768, 1440];
const expectedTitle = '다른 리그·다른 팀으로 챔스 결승 3회를 이끈 감독, 에른스트 하펠';

await mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true });

try {
  for (const width of widths) {
    const page = await browser.newPage({ viewport: { width, height: 1000 }, deviceScaleFactor: 1 });
    await page.goto(`${base}${slug}`, { waitUntil: 'networkidle' });

    const title = (await page.locator('h1').first().innerText()).trim();
    if (title !== expectedTitle) throw new Error(`${width}px H1 mismatch: ${title}`);

    for (const image of await page.locator('img').all()) await image.scrollIntoViewIfNeeded();
    await page.waitForTimeout(350);

    const metrics = await page.evaluate(() => ({
      viewport: window.innerWidth,
      documentWidth: document.documentElement.scrollWidth,
      images: [...document.images].map((img) => ({ src: img.getAttribute('src'), complete: img.complete, naturalWidth: img.naturalWidth })),
      sourceCount: document.querySelectorAll('.source-notes li').length,
      missingCitations: [...document.querySelectorAll('a.cite')].filter((a) => {
        const target = a.getAttribute('href');
        return !target?.startsWith('#') || !document.querySelector(target);
      }).length,
      customFontSizes: [...document.querySelectorAll('.eh-finals span,.eh-finals p,.eh-finals i,.eh-principles span,.eh-principles p,.eh-proof b,.eh-proof p,.eh-final-plan span,.eh-final-plan b,.eh-final-plan p')]
        .map((node) => ({ tag: node.tagName, text: node.textContent?.trim().slice(0, 50), size: Number.parseFloat(getComputedStyle(node).fontSize) })),
    }));

    if (metrics.documentWidth > metrics.viewport + 1) throw new Error(`${width}px document overflow: ${JSON.stringify(metrics)}`);
    if (metrics.images.some((img) => !img.complete || img.naturalWidth === 0)) throw new Error(`${width}px broken image: ${JSON.stringify(metrics.images)}`);
    if (metrics.sourceCount !== 11 || metrics.missingCitations !== 0) throw new Error(`${width}px source contract failed: ${JSON.stringify(metrics)}`);
    const smallText = metrics.customFontSizes.filter((node) => node.size < 11);
    if (smallText.length) throw new Error(`${width}px custom module text below 11px: ${JSON.stringify(smallText)}`);

    await page.screenshot({ path: join(out, `article-${width}.png`), fullPage: true });
    await page.locator('.eh-finals').screenshot({ path: join(out, `finals-${width}.png`) });
    await page.locator('.eh-proof').screenshot({ path: join(out, `proof-${width}.png`) });
    await page.locator('.eh-final-plan').screenshot({ path: join(out, `final-plan-${width}.png`) });

    await page.goto(`${base}/tactics/`, { waitUntil: 'networkidle' });
    const categoryMetrics = await page.evaluate((text) => ({
      viewport: window.innerWidth,
      documentWidth: document.documentElement.scrollWidth,
      hasTitle: [...document.querySelectorAll('h2,h3')].some((node) => node.textContent?.trim() === text),
    }), expectedTitle);
    if (!categoryMetrics.hasTitle || categoryMetrics.documentWidth > categoryMetrics.viewport + 1) {
      throw new Error(`${width}px tactics listing failed: ${JSON.stringify(categoryMetrics)}`);
    }
    await page.locator('.lead-story').screenshot({ path: join(out, `tactics-lead-${width}.png`) });
    await page.close();
  }
} finally {
  await browser.close();
}

console.log(`에른스트 하펠 축술 QA 통과: ${widths.join(' · ')}px, source notes 11, broken images 0, document overflow 0`);
