import { useEffect, useRef } from 'react'
import { FRAME_COUNT, loadHeroFrames } from '../lib/criticalAssets'

const BG = '#12172B' // must match .hero-seq background and the frame edges
const EASE = 0.12 // fraction of the remaining distance covered per 60fps frame
const clamp = (v, min, max) => Math.min(max, Math.max(min, v))

export default function Hero({ loaded }) {
    const sectionRef = useRef(null)
    const canvasRef = useRef(null)
    const loaderRef = useRef(null)

    useEffect(() => {
        const section = sectionRef.current
        const canvas = canvasRef.current
        const loader = loaderRef.current
        if (!section || !canvas) return

        const ctx = canvas.getContext('2d', { alpha: false })
        const beats = Array.from(section.querySelectorAll('[data-start]')).map((el) => ({
            el, start: parseFloat(el.dataset.start), end: parseFloat(el.dataset.end),
        }))
        const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)')

        const frames = new Array(FRAME_COUNT).fill(null)
        let loadedCount = 0
        let current = 0
        let target = 0
        let dirty = true
        let rafId = 0
        let lastTime = 0
        let disposed = false

        const nearestFrame = (i) => {
            if (frames[i]) return frames[i]
            for (let d = 1; d < FRAME_COUNT; d++) {
                if (frames[i - d]) return frames[i - d]
                if (frames[i + d]) return frames[i + d]
            }
            return null
        }

        // object-fit: cover
        const paint = (img, alpha) => {
            const scale = Math.max(canvas.width / img.naturalWidth, canvas.height / img.naturalHeight)
            const w = img.naturalWidth * scale
            const h = img.naturalHeight * scale
            ctx.globalAlpha = alpha
            ctx.drawImage(img, (canvas.width - w) / 2, (canvas.height - h) / 2, w, h)
        }

        const draw = () => {
            ctx.globalAlpha = 1
            ctx.fillStyle = BG
            ctx.fillRect(0, 0, canvas.width, canvas.height)
            const base = Math.floor(current)
            const mix = current - base
            const a = nearestFrame(base)
            if (a) paint(a, 1)
            // Crossfade into the next frame so 21 frames read as continuous motion.
            const b = frames[base + 1]
            if (b && mix > 0.001) paint(b, mix)
            ctx.globalAlpha = 1
        }

        // Text beats fade in over the first quarter of their range and out over the last.
        const updateBeats = (p) => {
            for (const { el, start, end } of beats) {
                const fade = (end - start) * 0.25
                let o = 0
                if (p >= start && p <= end) {
                    o = 1
                    if (start > 0) o = Math.min(o, (p - start) / fade)
                    if (end < 1) o = Math.min(o, (end - p) / fade)
                }
                o = clamp(o, 0, 1)
                el.style.opacity = o.toFixed(3)
                el.style.transform = `translate3d(0, ${((1 - o) * 24).toFixed(1)}px, 0)`
            }
        }

        const updateTarget = () => {
            const distance = section.offsetHeight - window.innerHeight
            const progress = distance > 0 ? clamp(-section.getBoundingClientRect().top / distance, 0, 1) : 0
            target = progress * (FRAME_COUNT - 1)
        }

        const tick = (now) => {
            const dt = Math.min(now - lastTime, 64)
            lastTime = now
            const k = reduceMotion.matches ? 1 : 1 - Math.pow(1 - EASE, dt / 16.667)
            current += (target - current) * k
            if (Math.abs(target - current) < 0.001) current = target
            draw()
            updateBeats(current / (FRAME_COUNT - 1))
            dirty = false
            rafId = current !== target ? requestAnimationFrame(tick) : 0
        }

        // Run the loop only while there is something to animate.
        const kick = () => {
            if (disposed || rafId || (!dirty && current === target)) return
            lastTime = performance.now()
            rafId = requestAnimationFrame(tick)
        }

        const resize = () => {
            const dpr = Math.min(window.devicePixelRatio || 1, 2)
            canvas.width = Math.round(canvas.clientWidth * dpr)
            canvas.height = Math.round(canvas.clientHeight * dpr)
            ctx.imageSmoothingEnabled = true
            ctx.imageSmoothingQuality = 'high'
            dirty = true
            updateTarget()
            kick()
        }

        const onScroll = () => { updateTarget(); kick() }

        // Shared with the preloader: same requests, already decoded off the main thread.
        loadHeroFrames().forEach((p, i) =>
            p.then((img) => {
                if (disposed) return
                if (img) frames[i] = img
                loadedCount++
                if (loader) {
                    loader.firstChild.style.width = `${(loadedCount / FRAME_COUNT) * 100}%`
                    if (loadedCount === FRAME_COUNT) loader.classList.add('is-done')
                }
                dirty = true
                kick()
            }),
        )

        window.addEventListener('scroll', onScroll, { passive: true })
        window.addEventListener('resize', resize)
        resize()
        current = target // start on the correct frame after a reload mid-page

        return () => {
            disposed = true
            cancelAnimationFrame(rafId)
            window.removeEventListener('scroll', onScroll)
            window.removeEventListener('resize', resize)
        }
    }, [])

    return (
        <section ref={sectionRef} className={`hero-seq ${loaded ? 'hero-loaded' : ''}`} id="hero">
            <div className="hero-seq__sticky">
                <canvas ref={canvasRef} className="hero-seq__canvas" aria-hidden="true" />
                <div className="hero-seq__vignette" aria-hidden="true" />

                <div className="hero-seq__beat hero-seq__beat--intro" data-start="0" data-end="0.24">
                    <h1 className="hero-seq__name">
                        <span className="hero-line" data-text="aNuJ">aNuJ</span>
                        <span className="hero-line accent-text" data-text="sInGh">sInGh</span>
                    </h1>
                    <div className="hero-seq__intro-desc">
                        <p className="hero-desc">Hi <span className="accent-text">&lt;3</span>, I'm Anuj. I build crazy web experiences.</p>
                    </div>
                </div>

                <div className="hero-seq__beat hero-seq__beat--left" data-start="0.28" data-end="0.56">
                    <p className="hero-seq__eyebrow">01 — pIeCe bY pIeCe</p>
                    <h2 className="hero-seq__title">It all comes<br />together.</h2>
                </div>

                <div className="hero-seq__beat hero-seq__beat--right" data-start="0.58" data-end="0.84">
                    <p className="hero-seq__eyebrow">02 — tHeN tHe wOrK sTaRtS</p>
                    <h2 className="hero-seq__title">Ideas in,<br />code out.</h2>
                </div>

                <div className="hero-seq__beat hero-seq__beat--end" data-start="0.88" data-end="1">
                    <p className="hero-seq__eyebrow">03 — uP cLoSe</p>
                    <h2 className="hero-seq__title">This is where<br /><span className="accent-text">I work.</span></h2>
                </div>

                <div className="hero-seq__hint" data-start="0" data-end="0.08" aria-hidden="true">
                    <div className="scroll-pill"><div className="scroll-dot"></div></div>
                </div>

                <div ref={loaderRef} className="hero-seq__loader" aria-hidden="true"><span /></div>
            </div>
        </section>
    )
}
