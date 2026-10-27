#!/usr/bin/env node
/**
 * Phase 1 acceptance checks, run against a live build.
 *   node scripts/audit-phase1.mjs [--url http://localhost:3000/]
 * Exits non-zero if any check fails.
 */
import { launchChrome, preloaderGone, scrollToExpr, sleep } from './lib/cdp.mjs'

const urlArg = process.argv.indexOf('--url')
const URL_ = urlArg > -1 ? process.argv[urlArg + 1] : 'http://localhost:3000/'
const results = []
const check = (name, pass, detail = '') => {
    results.push({ name, pass, detail })
    console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? `  — ${detail}` : ''}`)
}

// Alternating case: a word with a lower->upper switch after the first letter, e.g. "aNuJ", "tHe".
const ALT_CASE_EXPR = `(() => {
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const hits = [];
  const allow = /^(JavaScript|TypeScript|WebGL|GitHub|LinkedIn|MongoDB|PostgreSQL|WallCraft|iPhone|yfinance|Next\\.js|Three\\.js|Node\\.js|Puter\\.js)$/;
  while (walker.nextNode()) {
    const n = walker.currentNode;
    const el = n.parentElement;
    if (!el || el.closest('script,style,svg,[aria-hidden="true"]')) continue;
    if (getComputedStyle(el).display === 'none') continue;
    for (const w of n.textContent.split(/[\\s·—–\\-/,.!?:;()"]+/)) {
      if (w.length < 3 || allow.test(w)) continue;
      if (/[a-z][A-Z]/.test(w.slice(1)) || /^[a-z][A-Z]/.test(w)) hits.push(w);
    }
  }
  return [...new Set(hits)];
})()`

const chrome = await launchChrome()
try {
    // ---------- preloader: duration cap, cold cache
    {
        const page = await chrome.newPage({ width: 1440, height: 900 })
        await page.send('Network.enable')
        await page.send('Network.setCacheDisabled', { cacheDisabled: true })
        await page.navigate(URL_)
        await page.waitFor(`!!document.getElementById('preloader')`, 15000)
        const t0 = Date.now()
        await page.waitFor(preloaderGone, 15000, 20)
        const wall = Date.now() - t0
        const measured = await page.evaluate(
            `(performance.getEntriesByName('preloader:total')[0] || {}).duration || -1`,
        )
        check('Preloader is gone within 1.5 s (cold cache)', measured > 0 && measured <= 1550, `preloader:total = ${Math.round(measured)} ms, wall ≈ ${wall} ms`)
        const skipBtn = await page.evaluate(`!!document.querySelector('.preloader-skip')`)
        check('Preloader has a skip control', skipBtn)
        if (page.errors.length) console.log('  page errors:', page.errors)
        await page.close()
    }

    // ---------- preloader: skip button and Escape
    for (const mode of ['button', 'escape']) {
        const page = await chrome.newPage({ width: 1440, height: 900 })
        await page.send('Network.enable')
        await page.send('Network.setCacheDisabled', { cacheDisabled: true })
        await page.navigate(URL_)
        await page.waitFor(`!!document.querySelector('.preloader-skip')`, 15000, 10)
        await sleep(150)
        const t0 = Date.now()
        if (mode === 'button') await page.evaluate(`document.querySelector('.preloader-skip').click()`)
        else await page.key('Escape', 'Escape', 27)
        await page.waitFor(preloaderGone, 5000, 10)
        const ms = Date.now() - t0
        const interactive = await page.evaluate(`!document.querySelector('.site').hasAttribute('inert')`)
        check(`Skip via ${mode} closes the preloader fast`, ms < 500 && interactive, `${ms} ms, site interactive: ${interactive}`)
        await page.close()
    }

    // ---------- desktop content checks
    {
        const page = await chrome.newPage({ width: 1440, height: 900 })
        await page.navigate(URL_)
        await page.waitFor(`!!document.getElementById('preloader')`, 15000, 10)
        await page.waitFor(preloaderGone, 15000)
        await sleep(1500)

        const alt = await page.evaluate(ALT_CASE_EXPR)
        check('No alternating-case words in visible text', alt.length === 0, alt.length ? alt.slice(0, 20).join(', ') : '')

        const fonts = await page.evaluate(`[...new Set([...document.querySelectorAll('body *')].map(e => getComputedStyle(e).fontFamily))].filter(f => /Londrina/i.test(f))`)
        check('No sketch/outline font in use', fonts.length === 0, fonts.join(' | '))

        const stroke = await page.evaluate(`[...document.querySelectorAll('body *')].filter(e => parseFloat(getComputedStyle(e).webkitTextStrokeWidth) > 0 && e.textContent.trim()).map(e => e.className).slice(0, 10)`)
        check('No text-stroke (hollow) text', stroke.length === 0, stroke.join(', '))

        const nums = await page.evaluate(`[...document.querySelectorAll('main .section-number')].map(e => e.textContent.trim())`)
        check('Section numbers are 01–06 in order, no gaps', JSON.stringify(nums) === JSON.stringify(['01', '02', '03', '04', '05', '06']), nums.join(' → '))

        // GSAP pinning wraps some sections in a spacer div, so don't require direct children.
        const order = await page.evaluate(`[...document.querySelectorAll('main section[id]')].map(s => s.id)`)
        const idx = (id) => order.indexOf(id)
        check('Gallery comes after About/Proof and before Contact', idx('gallery') > idx('about') && idx('gallery') > idx('awards') && idx('gallery') < idx('contact'), order.join(' → '))

        // music toggle must not be a floating element over content
        const musicPos = await page.evaluate(`(() => { const m = document.getElementById('music-toggle'); return { inHeader: !!m.closest('#nav'), pos: getComputedStyle(m).position } })()`)
        check('Music toggle lives in the header, not floating over content', musicPos.inHeader && musicPos.pos !== 'fixed', JSON.stringify(musicPos))

        // fixed elements vs footer/contact actions at the bottom of the page
        await page.evaluate(scrollToExpr('bottom'))
        await sleep(900)
        const overlap = await page.evaluate(`(() => {
          const fixed = [...document.querySelectorAll('body *')].filter(e => {
            const cs = getComputedStyle(e);
            return cs.position === 'fixed' && cs.display !== 'none' && cs.visibility !== 'hidden' && +cs.opacity > 0.05
              && !e.closest('#preloader') && !e.classList.contains('custom-cursor') && !e.closest('.mobile-overlay') && e.id !== 'nav';
          }).map(e => e.getBoundingClientRect());
          const targets = [...document.querySelectorAll('.footer-top, .contact-cta, .social-card')].map(e => e.getBoundingClientRect());
          const hit = (a, b) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom && a.width > 0 && b.width > 0;
          return fixed.some(f => targets.some(t => hit(f, t)));
        })()`)
        check('No fixed element covers back-to-top, email or social links (desktop)', !overlap)

        // contact side text not clipped
        await page.evaluate(scrollToExpr('contact'))
        await sleep(900)
        const clip = await page.evaluate(`(() => {
          return [...document.querySelectorAll('#contact .corner-left, #contact .corner-right, #contact .contact-line, #contact .contact-sub, #contact .contact-cta')]
            .filter(e => getComputedStyle(e).display !== 'none')
            .map(e => { const r = e.getBoundingClientRect(); return { cls: e.className, l: Math.round(r.left), r: Math.round(r.right), h: Math.round(r.height), sw: e.scrollWidth, cw: e.clientWidth } })
            .filter(r => r.l < 0 || r.r > innerWidth || (r.sw > r.cw + 1 && r.cw > 0));
        })()`)
        check('Contact text is not clipped at 1440 px', clip.length === 0, JSON.stringify(clip))

        // custom cursor: hidden over text, visible over a non-text area
        await page.evaluate(scrollToExpr('techstacks'))
        await sleep(900)
        const pt = await page.evaluate(`(() => { const r = document.querySelector('.tech-intro-text').getBoundingClientRect(); return { x: r.left + 40, y: r.top + 12 } })()`)
        await page.mouseMove(pt.x, pt.y)
        await sleep(400)
        const overText = await page.evaluate(`(() => { const c = document.querySelector('.custom-cursor'); return { hidden: c.classList.contains('is-hidden'), opacity: getComputedStyle(c).opacity } })()`)
        check('Custom cursor hides over text', overText.hidden && +overText.opacity < 0.05, JSON.stringify(overText))
        const empty = await page.evaluate(`(() => { const r = document.querySelector('.tech-grid').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top - 30 } })()`)
        await page.mouseMove(empty.x, empty.y)
        await sleep(500)
        const overEmpty = await page.evaluate(`getComputedStyle(document.querySelector('.custom-cursor')).opacity`)
        check('Custom cursor shows over non-text areas', +overEmpty > 0.5, `opacity ${overEmpty}`)

        if (page.errors.length) console.log('  page errors:', page.errors)
        await page.close()
    }

    // ---------- touch / phone checks
    {
        const page = await chrome.newPage({ width: 390, height: 844, mobile: true, touch: true })
        await page.navigate(URL_)
        await page.waitFor(`!!document.getElementById('preloader')`, 15000, 10)
        await page.waitFor(preloaderGone, 15000)
        await sleep(1200)
        const cursorDisplay = await page.evaluate(`getComputedStyle(document.querySelector('.custom-cursor')).display`)
        check('Custom cursor is off on touch devices', cursorDisplay === 'none', `display: ${cursorDisplay}`)

        const overflowX = await page.evaluate(`document.documentElement.scrollWidth - innerWidth`)
        check('No horizontal page overflow at 390 px', overflowX <= 0, `${overflowX}px`)

        await page.evaluate(scrollToExpr('bottom'))
        await sleep(900)
        const overlap = await page.evaluate(`(() => {
          const fixed = [...document.querySelectorAll('body *')].filter(e => {
            const cs = getComputedStyle(e);
            return cs.position === 'fixed' && cs.display !== 'none' && +cs.opacity > 0.05
              && !e.closest('#preloader') && !e.classList.contains('custom-cursor') && !e.closest('.mobile-overlay') && e.id !== 'nav';
          }).map(e => e.getBoundingClientRect());
          const targets = [...document.querySelectorAll('.footer-top, .contact-cta, .social-card')].map(e => e.getBoundingClientRect());
          const hit = (a, b) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom && a.width > 0 && b.width > 0;
          return fixed.some(f => targets.some(t => hit(f, t)));
        })()`)
        check('No fixed element covers back-to-top, email or social links (phone)', !overlap)

        const small = await page.evaluate(`[...document.querySelectorAll('.nav-hamburger, .music-toggle, .gallery-tab, .footer-top, .contact-cta, .preloader-skip')]
          .filter(e => getComputedStyle(e).display !== 'none' && e.offsetParent !== null)
          .map(e => { const r = e.getBoundingClientRect(); return { c: e.className.split(' ')[0], w: Math.round(r.width), h: Math.round(r.height) } })
          .filter(r => r.h < 40 || r.w < 40)`)
        check('Key tap targets are at least ~40 px', small.length === 0, JSON.stringify(small))

        await page.evaluate(scrollToExpr('contact'))
        await sleep(900)
        const clip = await page.evaluate(`[...document.querySelectorAll('#contact .corner-left, #contact .corner-right, #contact .contact-line, #contact .contact-cta')]
          .filter(e => getComputedStyle(e).display !== 'none')
          .map(e => { const r = e.getBoundingClientRect(); return { c: e.className, l: Math.round(r.left), r: Math.round(r.right) } })
          .filter(r => r.l < 0 || r.r > innerWidth)`)
        check('Contact text is not clipped at 390 px', clip.length === 0, JSON.stringify(clip))

        if (page.errors.length) console.log('  page errors:', page.errors)
        await page.close()
    }

    // ---------- reduced motion
    {
        const page = await chrome.newPage({ width: 1440, height: 900, reducedMotion: true })
        await page.navigate(URL_)
        await page.waitFor(`!!document.getElementById('preloader')`, 15000, 10)
        await page.waitFor(preloaderGone, 15000)
        const still = await page.evaluate(`document.getElementById('preloader').classList.contains('preloader--still')`)
        const cursor = await page.evaluate(`getComputedStyle(document.querySelector('.custom-cursor')).display`)
        check('Reduced motion: no blade animation, no follower cursor', still && cursor === 'none', `still: ${still}, cursor: ${cursor}`)
        await page.close()
    }
} finally {
    chrome.close()
}

const failed = results.filter((r) => !r.pass)
console.log(`\n${results.length - failed.length}/${results.length} checks passed`)
process.exit(failed.length ? 1 : 0)
