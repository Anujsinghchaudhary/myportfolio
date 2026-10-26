// Generic full-viewport screenshot: node scripts/shot-page.mjs <url> <waitMs> <outFile> [WxH]
import { spawn } from 'node:child_process'
import { existsSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const [url, waitMs = 5000, out, size = '1920x1080'] = process.argv.slice(2)
const [W, H] = size.split('x').map(Number)
const CHROME = [
    process.env.CHROME_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
].find((p) => p && existsSync(p))
const PORT = 9335
const profile = join(tmpdir(), `shot-${Date.now()}`)
const proc = spawn(CHROME, [
    '--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`,
    '--no-first-run', '--enable-gpu', '--hide-scrollbars',
], { stdio: 'ignore' })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let ws
for (let i = 0; i < 50 && !ws; i++) {
    try { ws = (await (await fetch(`http://127.0.0.1:${PORT}/json/version`)).json()).webSocketDebuggerUrl } catch { await sleep(200) }
}
const sock = new WebSocket(ws)
await new Promise((r) => (sock.onopen = r))
let id = 0
const pending = new Map()
sock.onmessage = (e) => {
    const m = JSON.parse(e.data)
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result); pending.delete(m.id) }
}
const send = (method, params = {}, sessionId) => new Promise((res) => { const msg = { id: ++id, method, params }; if (sessionId) msg.sessionId = sessionId; pending.set(msg.id, res); sock.send(JSON.stringify(msg)) })
const { targetId } = await send('Target.createTarget', { url: 'about:blank' })
const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true })
const s = (m, p) => send(m, p, sessionId)
await s('Page.enable')
await s('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: false })
await s('Page.navigate', { url })
await sleep(Number(waitMs))
const shot = await s('Page.captureScreenshot', { format: 'png' })
writeFileSync(out, Buffer.from(shot.data, 'base64'))
console.log('wrote', out)
sock.close(); proc.kill(); setTimeout(() => rmSync(profile, { recursive: true, force: true }), 1000)
