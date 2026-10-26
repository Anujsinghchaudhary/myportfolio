import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { preloadCriticalAssets } from '../lib/criticalAssets'
import { createKatanaRenderer, drawTitle } from '../lib/katanaRenderer'

// Progress shown on screen follows real asset progress, but never moves faster than
// one full sweep per MIN_SWEEP_S so the blade animation reads even from a warm cache.
const MIN_SWEEP_S = 1.2
const HOLD_S = 0.3 // beat with the blade fully through before the screen clears
const FADE_S = 0.55
const IMPACT_AT = 0.1 / 0.95 // progress where the tip breaks the glass: -S_MIN / (S_MAX - S_MIN) in the shader
const FONT_WAIT_MS = 1500

// Dev-only: ?preloaderProgress=0.5 freezes the effect at that progress for inspection.
const DEBUG_PROGRESS = (() => {
    if (!import.meta.env.DEV || typeof location === 'undefined') return null
    const v = new URLSearchParams(location.search).get('preloaderProgress')
    return v === null || Number.isNaN(Number(v)) ? null : Math.min(1, Math.max(0, Number(v)))
})()

const wantsWebGL = () =>
    typeof window !== 'undefined' &&
    !!window.WebGL2RenderingContext &&
    !window.matchMedia('(prefers-reduced-motion: reduce)').matches

const wait = (ms) => new Promise((r) => setTimeout(r, ms))

export default function Preloader({ onComplete }) {
    const rootRef = useRef(null)
    const canvasRef = useRef(null)
    const centerRef = useRef(null)
    const loadingRef = useRef(null)
    const fillRef = useRef(null)
    const textRef = useRef(null)
    const onCompleteRef = useRef(onComplete)
    const [webgl, setWebgl] = useState(wantsWebGL)

    useEffect(() => {
        onCompleteRef.current = onComplete
    }, [onComplete])

    useEffect(() => {
        const root = rootRef.current
        const canvas = canvasRef.current
        const loading = loadingRef.current
        let disposed = false
        let raf = 0
        let exitTl = null

        document.body.style.overflow = 'hidden'
        document.body.classList.add('scroll-disabled')
        performance.mark('preloader:start')

        // ---- renderer (WebGL2 katana effect) or DOM fallback
        let renderer = null
        if (webgl) {
            try {
                renderer = createKatanaRenderer(canvas, { onContextLost: () => setWebgl(false) })
            } catch {
                renderer = null
            }
            if (!renderer) {
                setWebgl(false)
                return undefined
            }
        }

        let live = false
        let fontsReady = false
        let textShownAt = -1
        const textCanvas = document.createElement('canvas')
        const refreshText = () => {
            if (!renderer || !fontsReady) return
            const [w, h, cssW] = renderer.size()
            renderer.uploadText(drawTitle(textCanvas, w, h, cssW))
        }

        if (renderer) {
            renderer.resize()
            renderer.ready.then(
                () => {
                    if (disposed) return
                    live = true
                    canvas.classList.add('is-live')
                },
                (err) => {
                    console.error(err)
                    if (!disposed) setWebgl(false)
                },
            )
            const fonts = document.fonts
                ? Promise.all([document.fonts.load('800 112px Syne'), document.fonts.load('28px "Londrina Sketch"')])
                : Promise.resolve()
            Promise.race([fonts.catch(() => {}), wait(FONT_WAIT_MS)]).then(() => {
                if (disposed) return
                fontsReady = true
                refreshText()
                textShownAt = performance.now()
            })
        } else {
            gsap.fromTo(centerRef.current, { opacity: 0, y: 28 }, { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out' })
        }
        gsap.to(loading, { opacity: 1, duration: 0.3, delay: 0.1 })

        let resizeTimer = 0
        const onResize = () => {
            clearTimeout(resizeTimer)
            resizeTimer = setTimeout(() => {
                if (renderer?.resize()) refreshText()
            }, 120)
        }
        window.addEventListener('resize', onResize)

        // ---- real loading progress
        let real = 0
        preloadCriticalAssets((p) => {
            real = Math.max(real, p)
        }).then(() => {
            if (!disposed) performance.measure('preloader:assets', 'preloader:start')
        })

        const finish = () => {
            cancelAnimationFrame(raf)
            raf = 0
            root.style.display = 'none'
            document.body.style.overflow = ''
            document.body.classList.remove('scroll-disabled')
            performance.measure('preloader:total', 'preloader:start')
            renderer?.release()
            renderer = null
            onCompleteRef.current?.()
        }

        const exit = () => {
            exitTl = gsap
                .timeline({ delay: HOLD_S, onComplete: finish })
                .to(loading, { opacity: 0, duration: 0.25 })
                .to(root, { opacity: 0, duration: FADE_S, ease: 'power2.inOut' }, '<0.05')
        }

        // ---- frame loop
        const start = performance.now()
        let last = start
        let shown = 0
        let impactAt = -1
        let exiting = false
        let lastPct = -1
        const frame = (now) => {
            const dt = Math.min(now - last, 100)
            last = now
            shown = DEBUG_PROGRESS ?? Math.min(real, shown + dt / 1000 / MIN_SWEEP_S)
            if (impactAt < 0 && shown >= IMPACT_AT) impactAt = now

            const pct = Math.floor(shown * 100)
            if (pct !== lastPct) {
                lastPct = pct
                if (fillRef.current) fillRef.current.style.transform = `scaleX(${shown.toFixed(3)})`
                if (textRef.current) textRef.current.textContent = `lOaDiNg... ${pct}%`
            }

            if (renderer && live) {
                if (renderer.govern(dt)) {
                    renderer.resize()
                    refreshText()
                }
                renderer.render({
                    time: (now - start) / 1000,
                    progress: shown,
                    impactAge: impactAt < 0 ? -1 : (now - impactAt) / 1000,
                    textAlpha: textShownAt < 0 ? 0 : Math.min(1, (now - textShownAt) / 600),
                })
            }

            if (shown >= 1 && DEBUG_PROGRESS === null && !exiting) {
                exiting = true
                exit()
            }
            raf = requestAnimationFrame(frame)
        }
        raf = requestAnimationFrame(frame)

        return () => {
            disposed = true
            cancelAnimationFrame(raf)
            clearTimeout(resizeTimer)
            window.removeEventListener('resize', onResize)
            exitTl?.kill()
            renderer?.dispose()
            canvas.classList.remove('is-live')
            document.body.style.overflow = ''
            document.body.classList.remove('scroll-disabled')
        }
    }, [webgl])

    return (
        <div className={`preloader preloader--samurai${webgl ? ' preloader--gl' : ''}`} id="preloader" ref={rootRef}>
            <canvas ref={canvasRef} id="preloader-canvas" aria-hidden="true" />
            <div className="preloader-vignette" />
            <div className="preloader-center" ref={centerRef}>
                <h1 className="preloader-title">Anuj Singh</h1>
                <p className="preloader-sub">cReaTive dEveLoPer</p>
            </div>
            <div className="preloader-loading" ref={loadingRef}>
                <div className="loading-bar">
                    <div className="loading-fill" ref={fillRef}></div>
                </div>
                <span className="loading-text" ref={textRef}>
                    lOaDiNg... 0%
                </span>
            </div>
        </div>
    )
}
