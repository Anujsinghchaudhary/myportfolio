// Minimal Chrome DevTools Protocol driver shared by the audit/screenshot scripts.
// No dependencies: spawns a local Chrome/Edge and talks to it over WebSocket.
import { spawn } from 'node:child_process'
import { existsSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const CHROME = [
    process.env.CHROME_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome',
].find((p) => p && existsSync(p))

export async function launchChrome() {
    if (!CHROME) throw new Error('Chrome not found; set CHROME_PATH')
    const port = 9400 + Math.floor(Math.random() * 400)
    const profile = join(tmpdir(), `cdp-${Date.now()}-${port}`)
    const proc = spawn(CHROME, [
        '--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`,
        '--no-first-run', '--no-default-browser-check', '--hide-scrollbars', '--enable-gpu',
        '--autoplay-policy=no-user-gesture-required',
    ], { stdio: 'ignore' })

    let ws
    for (let i = 0; i < 60 && !ws; i++) {
        try {
            ws = (await (await fetch(`http://127.0.0.1:${port}/json/version`)).json()).webSocketDebuggerUrl
        } catch {
            await sleep(200)
        }
    }
    if (!ws) throw new Error('Chrome did not expose a DevTools endpoint')
    const sock = new WebSocket(ws)
    await new Promise((res, rej) => { sock.onopen = res; sock.onerror = rej })

    let id = 0
    const pending = new Map()
    const listeners = new Set()
    sock.onmessage = (e) => {
        const m = JSON.parse(e.data)
        if (m.id && pending.has(m.id)) {
            const { res, rej } = pending.get(m.id)
            pending.delete(m.id)
            m.error ? rej(new Error(`${m.error.message} (${m.error.data || ''})`)) : res(m.result)
        } else if (m.method) {
            for (const fn of listeners) fn(m)
        }
    }
    const send = (method, params = {}, sessionId) =>
        new Promise((res, rej) => {
            const msg = { id: ++id, method, params }
            if (sessionId) msg.sessionId = sessionId
            pending.set(msg.id, { res, rej })
            sock.send(JSON.stringify(msg))
        })

    async function newPage({ width = 1440, height = 900, mobile = false, touch = false, reducedMotion = false } = {}) {
        const { targetId } = await send('Target.createTarget', { url: 'about:blank' })
        const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true })
        const s = (m, p) => send(m, p, sessionId)
        const errors = []
        const onEvent = (m) => {
            if (m.sessionId !== sessionId) return
            if (m.method === 'Runtime.exceptionThrown') {
                errors.push(m.params.exceptionDetails?.exception?.description || m.params.exceptionDetails?.text)
            } else if (m.method === 'Runtime.consoleAPICalled' && (m.params.type === 'error' || m.params.type === 'warning')) {
                errors.push(`[console.${m.params.type}] ` + m.params.args.map((a) => a.value ?? a.description).join(' '))
            }
        }
        listeners.add(onEvent)
        await s('Page.enable')
        await s('Runtime.enable')
        await s('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile })
        if (touch) await s('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 })
        if (reducedMotion) {
            await s('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] })
        }
        const evaluate = async (expression) => {
            const r = await s('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
            if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text)
            return r.result.value
        }
        return {
            send: s,
            evaluate,
            errors,
            navigate: (url) => s('Page.navigate', { url }),
            async screenshot(file) {
                const { data } = await s('Page.captureScreenshot', { format: 'png' })
                writeFileSync(file, Buffer.from(data, 'base64'))
                return file
            },
            mouseMove: (x, y) => s('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y }),
            click: async (x, y) => {
                await s('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y })
                await s('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 })
                await s('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 })
            },
            key: async (key, code = key, keyCode = 0) => {
                await s('Input.dispatchKeyEvent', { type: 'keyDown', key, code, windowsVirtualKeyCode: keyCode })
                await s('Input.dispatchKeyEvent', { type: 'keyUp', key, code, windowsVirtualKeyCode: keyCode })
            },
            async waitFor(expression, timeout = 15000, interval = 50) {
                const t0 = Date.now()
                while (Date.now() - t0 < timeout) {
                    if (await evaluate(expression).catch(() => false)) return Date.now() - t0
                    await sleep(interval)
                }
                throw new Error(`timed out waiting for: ${expression}`)
            },
            close: async () => {
                listeners.delete(onEvent)
                await send('Target.closeTarget', { targetId })
            },
        }
    }

    const close = () => {
        try { sock.close() } catch {}
        proc.kill()
        setTimeout(() => { try { rmSync(profile, { recursive: true, force: true }) } catch {} }, 1500)
    }
    return { newPage, close }
}

// Scrolls a section into view without smooth scrolling, accounting for pinned layouts.
export const scrollToExpr = (target) =>
    target === 'bottom'
        ? `window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' })`
        : `(() => { const el = document.getElementById(${JSON.stringify(target)}); if (!el) return false;
            window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY, behavior: 'instant' }); return true })()`

// True once the React app has mounted and the preloader has finished (display: none).
export const preloaderGone = `(() => { const p = document.getElementById('preloader'); return !!p && getComputedStyle(p).display === 'none' })()`
