import { VERTEX_SHADER, FRAGMENT_SHADER } from './katanaShader.glsl.js'

const MAX_DPR = 1.5
const MAX_PIXELS = 2.6e6 // cap the full-screen pass (~1920x1350 physical px)
const MIN_SCALE = 0.5

/**
 * WebGL2 renderer for the preloader. Returns null when WebGL2 is unavailable so the
 * caller can fall back to the DOM loading screen.
 *
 * Shader compilation is asynchronous where KHR_parallel_shader_compile exists:
 * `ready` resolves once the driver finishes, and nothing draws before that, so
 * compiling never blocks a frame.
 */
export function createKatanaRenderer(canvas, { onContextLost } = {}) {
    const gl = canvas.getContext('webgl2', {
        alpha: false, antialias: false, depth: false, stencil: false,
        premultipliedAlpha: false, preserveDrawingBuffer: false, powerPreference: 'high-performance',
    })
    if (!gl) return null

    const t0 = performance.now()
    const parallel = gl.getExtension('KHR_parallel_shader_compile')
    const compile = (type, src) => {
        const sh = gl.createShader(type)
        gl.shaderSource(sh, src)
        gl.compileShader(sh)
        return sh
    }
    const vs = compile(gl.VERTEX_SHADER, VERTEX_SHADER)
    const fs = compile(gl.FRAGMENT_SHADER, FRAGMENT_SHADER)
    const prog = gl.createProgram()
    gl.attachShader(prog, vs)
    gl.attachShader(prog, fs)
    gl.bindAttribLocation(prog, 0, 'aPos')
    gl.linkProgram(prog)

    let disposed = false
    let uniforms = null

    const finishLink = () => {
        if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
            const log = gl.getShaderInfoLog(fs) || gl.getShaderInfoLog(vs) || gl.getProgramInfoLog(prog)
            throw new Error(`Katana shader failed to compile: ${log}`)
        }
        gl.useProgram(prog)
        uniforms = Object.fromEntries(
            ['uRes', 'uTime', 'uProgress', 'uImpactAge', 'uTextAlpha', 'uText'].map((n) => [n, gl.getUniformLocation(prog, n)]),
        )
        gl.uniform1i(uniforms.uText, 0)
        performance.measure('preloader:shader-compile', { start: t0, end: performance.now() })
    }

    const ready = new Promise((resolve, reject) => {
        const poll = () => {
            if (disposed) return
            if (parallel && !gl.getProgramParameter(prog, parallel.COMPLETION_STATUS_KHR)) {
                requestAnimationFrame(poll)
                return
            }
            try { finishLink(); resolve() } catch (e) { reject(e) }
        }
        poll()
    })

    // Full-screen triangle.
    const vao = gl.createVertexArray()
    gl.bindVertexArray(vao)
    const vbo = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
    gl.enableVertexAttribArray(0)
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)

    const textTex = gl.createTexture()
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, textTex)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4))

    const lost = (e) => { e.preventDefault(); onContextLost?.() }
    canvas.addEventListener('webglcontextlost', lost)

    // Resolution management: device pixels capped by MAX_DPR / MAX_PIXELS, then
    // scaled down further at runtime if the GPU can't hold the frame budget.
    let scale = 1
    let cssW = 0
    let cssH = 0
    const resize = () => {
        cssW = canvas.clientWidth || window.innerWidth
        cssH = canvas.clientHeight || window.innerHeight
        let k = Math.min(window.devicePixelRatio || 1, MAX_DPR)
        k = Math.min(k, Math.sqrt(MAX_PIXELS / (cssW * cssH))) * scale
        const w = Math.max(1, Math.round(cssW * k))
        const h = Math.max(1, Math.round(cssH * k))
        const changed = w !== canvas.width || h !== canvas.height
        canvas.width = w
        canvas.height = h
        gl.viewport(0, 0, w, h)
        return changed
    }

    const uploadText = (source) => {
        gl.bindTexture(gl.TEXTURE_2D, textTex)
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true)
        gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true)
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source)
    }

    // Frame-time governor: average the last 40 frame intervals.
    let acc = 0
    let n = 0
    const govern = (dtMs) => {
        acc += dtMs
        if (++n < 40) return false
        const avg = acc / n
        acc = 0
        n = 0
        if (avg > 21 && scale > MIN_SCALE) {
            scale = Math.max(MIN_SCALE, scale * 0.8)
            return true
        }
        return false
    }

    const render = ({ time, progress, impactAge, textAlpha }) => {
        if (!uniforms || gl.isContextLost()) return
        gl.uniform2f(uniforms.uRes, canvas.width, canvas.height)
        gl.uniform1f(uniforms.uTime, time)
        gl.uniform1f(uniforms.uProgress, progress)
        gl.uniform1f(uniforms.uImpactAge, impactAge)
        gl.uniform1f(uniforms.uTextAlpha, textAlpha)
        gl.drawArrays(gl.TRIANGLES, 0, 3)
    }

    const dispose = () => {
        disposed = true
        canvas.removeEventListener('webglcontextlost', lost)
        gl.deleteTexture(textTex)
        gl.deleteBuffer(vbo)
        gl.deleteVertexArray(vao)
        gl.deleteProgram(prog)
        gl.deleteShader(vs)
        gl.deleteShader(fs)
    }

    // Final teardown once the preloader is gone: also hands the context back to the browser.
    const release = () => {
        dispose()
        gl.getExtension('WEBGL_lose_context')?.loseContext()
        canvas.width = 1
        canvas.height = 1
    }

    return { ready, resize, uploadText, render, govern, dispose, release, size: () => [canvas.width, canvas.height, cssW, cssH] }
}

/**
 * Draws the preloader title exactly as the DOM version lays it out (same fonts,
 * clamp() sizes, spacing and text-shadows) into a canvas the size of the GL buffer.
 */
export function drawTitle(target, w, h, cssW) {
    const k = w / cssW // device px per CSS px
    const ctx = target.getContext('2d')
    target.width = w
    target.height = h
    ctx.clearRect(0, 0, w, h)
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'

    const rem = 16
    const titlePx = Math.min(Math.max(3 * rem, cssW * 0.1), 7 * rem)
    const subPx = Math.min(Math.max(1 * rem, cssW * 0.03), 1.75 * rem)
    const gap = 0.35 * rem
    const subBox = subPx * 1.6
    const stack = titlePx + gap + 0.35 * rem + subBox
    const top = (h / k - stack) / 2
    const titleY = (top + titlePx / 2) * k
    const subY = (top + titlePx + gap + 0.35 * rem + subBox / 2) * k

    const spacing = (px) => { if ('letterSpacing' in ctx) ctx.letterSpacing = `${px}px` }

    ctx.font = `800 ${titlePx * k}px Syne, sans-serif`
    spacing(-0.02 * titlePx * k)
    for (const [blur, color] of [[80, 'rgba(0,0,0,0.6)'], [50, 'rgba(200,120,100,0.35)']]) {
        ctx.shadowColor = color
        ctx.shadowBlur = blur * k
        ctx.fillStyle = '#ffffff'
        ctx.fillText('Anuj Singh', w / 2, titleY)
    }
    ctx.shadowBlur = 0
    ctx.shadowColor = 'transparent'

    ctx.font = `${subPx * k}px "Londrina Sketch", cursive`
    spacing(0.12 * subPx * k)
    ctx.fillStyle = 'rgba(230,190,160,0.95)'
    ctx.fillText('cReaTive dEveLoPer', w / 2, subY)
    return target
}
