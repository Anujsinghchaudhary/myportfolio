#!/usr/bin/env node
/**
 * Screenshots each section of the page at one viewport size.
 *   node scripts/shoot-sections.mjs --out <dir> [--url http://localhost:3000/] [--size 1440x900]
 *        [--prefix before] [--targets hero,works,contact,bottom] [--touch]
 */
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { launchChrome, preloaderGone, scrollToExpr, sleep } from './lib/cdp.mjs'

const args = Object.fromEntries(
    process.argv.slice(2).reduce((acc, a, i, all) => {
        if (a.startsWith('--')) acc.push([a.slice(2), all[i + 1]?.startsWith('--') ? true : all[i + 1] ?? true])
        return acc
    }, []),
)
const url = args.url || 'http://localhost:3000/'
const [width, height] = String(args.size || '1440x900').split('x').map(Number)
const prefix = args.prefix || 'shot'
const out = args.out
if (!out) throw new Error('--out <dir> is required')
mkdirSync(out, { recursive: true })

const chrome = await launchChrome()
try {
    const mobile = width < 768
    const page = await chrome.newPage({ width, height, mobile, touch: Boolean(args.touch) || mobile })
    await page.navigate(url)
    await page.waitFor(preloaderGone, 20000)
    await sleep(1200)
    const targets = args.targets
        ? String(args.targets).split(',')
        : await page.evaluate(`[...document.querySelectorAll('section[id], footer')].map((el) => el.id || 'bottom')`)
    for (const t of targets) {
        await page.evaluate(scrollToExpr(t))
        await sleep(1400)
        const file = await page.screenshot(join(out, `${prefix}-${width}x${height}-${t}.png`))
        console.log('wrote', file)
    }
    if (page.errors.length) console.log('page errors:\n  ' + page.errors.join('\n  '))
} finally {
    chrome.close()
}
