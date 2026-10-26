#!/usr/bin/env node
/**
 * Preloader profiler. Drives a local Chrome over the DevTools protocol (no extra deps)
 * and reports, per cold-cache run:
 *   - doneMs:    navigation start -> preloader hidden (time until the site is usable)
 *   - framesMs:  navigation start -> last hero frame finished downloading
 *   - frame pacing while the preloader is on screen (p50 / p95 / max delta, hitches > 33 ms)
 *
 * Usage:
 *   node scripts/profile-preloader.mjs [--url http://localhost:4173/] [--runs 5]
 *        [--size 1920x1080] [--throttle none|fast4g|slow4g] [--out report.json]
 *   node scripts/profile-preloader.mjs --shots <dir> [--url http://localhost:3000/]
 *        Captures the effect at 25/50/75/100% progress at 16:9 and 21:9.
 *        Needs the Vite dev server (the ?preloaderProgress= hook is dev-only).
 */
import { spawn } from 'node:child_process'
import { existsSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const args = Object.fromEntries(
    process.argv.slice(2).reduce((acc, a, i, all) => {
        if (a.startsWith('--')) acc.push([a.slice(2), all[i + 1]?.startsWith('--') ? true : all[i + 1] ?? true])
        return acc
    }, []),
)
const URL_ = args.url || 'http://localhost:4173/'
const RUNS = Number(args.runs || 5)
const [W, H] = String(args.size || '1920x1080').split('x').map(Number)
const PORT = 9333

const THROTTLE = {
    none: null,
    // Chrome DevTools presets
    fast4g: { latency: 165, downloadThroughput: (9 * 1024 * 1024) / 8, uploadThroughput: (1.5 * 1024 * 1024) / 8 },
    slow4g: { latency: 562, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8 },
}[args.throttle || 'none']

const CHROME = [
    process.env.CHROME_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome',
].find((p) => p && existsSync(p))
if (!CHROME) throw new Error('Chrome not found; set CHROME_PATH')

// Injected before any page script. Samples rAF deltas until #preloader is hidden.
const PROBE = `(() => {
  const s = window.__pl = { deltas: [], hitchAt: [], done: false, doneMs: 0 };
  let last = 0;
  const loop = (t) => {
    if (last) { s.deltas.push(t - last); if (t - last > 33.4 && s.deltas.length > 1) s.hitchAt.push([Math.round(t), Math.round(t - last)]); }
    last = t;
    const el = document.getElementById('preloader');
    if (el && getComputedStyle(el).display === 'none') { s.done = true; s.doneMs = performance.now(); return; }
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
})();`

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function launch() {
    const profile = join(tmpdir(), `pl-profile-${Date.now()}`)
    const proc = spawn(CHROME, [
        '--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`,
        '--no-first-run', '--no-default-browser-check', '--enable-gpu', '--ignore-gpu-blocklist',
        '--autoplay-policy=no-user-gesture-required', `--window-size=${W},${H}`,
    ], { stdio: 'ignore' })
    let ws
    for (let i = 0; i < 50 && !ws; i++) {
        try {
            const v = await (await fetch(`http://127.0.0.1:${PORT}/json/version`)).json()
            ws = v.webSocketDebuggerUrl
        } catch { await sleep(200) }
    }
    if (!ws) throw new Error('Chrome did not expose a DevTools endpoint')
    const sock = new WebSocket(ws)
    await new Promise((r, j) => { sock.onopen = r; sock.onerror = j })
    let id = 0
    const pending = new Map()
    sock.onmessage = (e) => {
        const m = JSON.parse(e.data)
        if (m.id && pending.has(m.id)) {
            const { res, rej } = pending.get(m.id)
            pending.delete(m.id)
            m.error ? rej(new Error(m.error.message)) : res(m.result)
        }
    }
    const send = (method, params = {}, sessionId) =>
        new Promise((res, rej) => {
            const msg = { id: ++id, method, params }
            if (sessionId) msg.sessionId = sessionId
            pending.set(msg.id, { res, rej })
            sock.send(JSON.stringify(msg))
        })
    const close = () => {
        sock.close()
        proc.kill()
        setTimeout(() => { try { rmSync(profile, { recursive: true, force: true }) } catch {} }, 1000)
    }
    return { send, close }
}

async function openPage(cdp, w, h) {
    const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' })
    const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true })
    const s = (m, p) => cdp.send(m, p, sessionId)
    await s('Page.enable')
    await s('Network.enable')
    await s('Network.setCacheDisabled', { cacheDisabled: true })
    if (THROTTLE) await s('Network.emulateNetworkConditions', { offline: false, ...THROTTLE })
    await s('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: false })
    const evaluate = async (expr) => (await s('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true })).result.value
    return { s, evaluate, close: () => cdp.send('Target.closeTarget', { targetId }) }
}

const pct = (arr, p) => {
    const a = [...arr].sort((x, y) => x - y)
    return a.length ? a[Math.min(a.length - 1, Math.floor((p / 100) * a.length))] : 0
}

async function profile() {
    const cdp = await launch()
    const runs = []
    try {
        for (let r = 0; r < RUNS; r++) {
            const page = await openPage(cdp, W, H)
            await page.s('Page.addScriptToEvaluateOnNewDocument', { source: PROBE })
            await page.s('Page.navigate', { url: URL_ })
            const t0 = Date.now()
            while (!(await page.evaluate('!!(window.__pl && window.__pl.done)').catch(() => false))) {
                if (Date.now() - t0 > 60000) throw new Error('preloader never finished')
                await sleep(100)
            }
            const m = await page.evaluate(`(() => {
                const d = window.__pl.deltas.slice(1);
                const frames = performance.getEntriesByType('resource').filter(e => e.name.includes('/frames/'));
                const gl = document.createElement('canvas').getContext('webgl');
                const dbg = gl && gl.getExtension('WEBGL_debug_renderer_info');
                return {
                  doneMs: window.__pl.doneMs,
                  framesMs: frames.length ? Math.max(...frames.map(e => e.responseEnd)) : null,
                  frameFiles: frames.length,
                  deltas: d,
                  hitchAt: window.__pl.hitchAt,
                  renderer: dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : 'unknown',
                  marks: performance.getEntriesByType('measure').map(e => ({ name: e.name, ms: +e.duration.toFixed(1) })),
                };
            })()`)
            await page.close()
            const d = m.deltas
            runs.push({
                doneMs: Math.round(m.doneMs),
                framesMs: m.framesMs && Math.round(m.framesMs),
                frameFiles: m.frameFiles,
                p50: +pct(d, 50).toFixed(1),
                p95: +pct(d, 95).toFixed(1),
                max: +Math.max(...d).toFixed(1),
                hitches: d.filter((x) => x > 33.4).length,
                hitchAt: m.hitchAt.map(([t, ms]) => `${ms}ms@${t}`).join(' '),
                frames: d.length,
                renderer: m.renderer,
                marks: m.marks,
            })
            console.log(`run ${r + 1}:`, JSON.stringify(runs.at(-1)))
        }
    } finally {
        cdp.close()
    }
    const med = (k) => pct(runs.map((x) => x[k]), 50)
    const summary = {
        url: URL_, size: `${W}x${H}`, throttle: args.throttle || 'none', runs: runs.length,
        median: { doneMs: med('doneMs'), framesMs: med('framesMs'), p95FrameMs: med('p95'), maxFrameMs: med('max'), hitches: med('hitches') },
        renderer: runs[0]?.renderer,
    }
    console.log('\nsummary:', JSON.stringify(summary, null, 2))
    if (args.out) writeFileSync(args.out, JSON.stringify({ summary, runs }, null, 2))
}

async function shots() {
    const dir = args.shots
    mkdirSync(dir, { recursive: true })
    const cdp = await launch()
    try {
        for (const [w, h, label] of [[1920, 1080, '16x9'], [2560, 1080, '21x9']]) {
            for (const p of [0.25, 0.5, 0.75, 1]) {
                const page = await openPage(cdp, w, h)
                const u = new URL(URL_)
                u.searchParams.set('preloaderProgress', String(p))
                await page.s('Page.navigate', { url: u.href })
                await sleep(3500)
                const { data } = await page.s('Page.captureScreenshot', { format: 'png' })
                const file = join(dir, `preloader-${label}-${Math.round(p * 100)}.png`)
                writeFileSync(file, Buffer.from(data, 'base64'))
                console.log('wrote', file)
                await page.close()
            }
        }
    } finally {
        cdp.close()
    }
}

await (args.shots ? shots() : profile())
