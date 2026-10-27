// Lists fixed elements that overlap footer/contact/social targets at the bottom of the page.
//   node scripts/find-overlap.mjs [--size 390x844]
import { launchChrome, preloaderGone, scrollToExpr, sleep } from './lib/cdp.mjs'

const sizeArg = process.argv.indexOf('--size')
const [width, height] = (sizeArg > -1 ? process.argv[sizeArg + 1] : '390x844').split('x').map(Number)

const chrome = await launchChrome()
try {
    const page = await chrome.newPage({ width, height, mobile: width < 768, touch: width < 768 })
    await page.navigate('http://localhost:3000/')
    await page.waitFor(`!!document.getElementById('preloader')`, 15000, 10)
    await page.waitFor(preloaderGone, 15000)
    await sleep(1200)
    await page.evaluate(scrollToExpr('bottom'))
    await sleep(900)
    const out = await page.evaluate(`(() => {
      const desc = (e) => e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') +
        (typeof e.className === 'string' && e.className.trim() ? '.' + e.className.trim().split(/\\s+/).join('.') : '');
      const fixed = [...document.querySelectorAll('body *')].filter(e => {
        const cs = getComputedStyle(e);
        return cs.position === 'fixed' && cs.display !== 'none' && +cs.opacity > 0.05
          && !e.closest('#preloader') && !e.classList.contains('custom-cursor') && !e.closest('.mobile-overlay') && e.id !== 'nav';
      });
      const targets = [...document.querySelectorAll('.footer-top, .contact-cta, .social-card')];
      const hit = (a, b) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom && a.width > 0 && b.width > 0;
      const res = [];
      for (const f of fixed) for (const t of targets) {
        const a = f.getBoundingClientRect(), b = t.getBoundingClientRect();
        if (hit(a, b)) res.push({
          fixed: desc(f), fixedRect: [a.left, a.top, a.width, a.height].map(Math.round),
          opacity: getComputedStyle(f).opacity, pointerEvents: getComputedStyle(f).pointerEvents, zIndex: getComputedStyle(f).zIndex,
          target: desc(t), targetRect: [b.left, b.top, b.width, b.height].map(Math.round),
        });
      }
      return res;
    })()`)
    console.log(JSON.stringify(out, null, 2))
} finally {
    chrome.close()
}
