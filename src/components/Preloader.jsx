import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { preloadCriticalAssets } from '../lib/criticalAssets'
import { createBladeSwipe, SWIPE_MS } from '../lib/bladeSwipe'

// Progress shown on screen follows real asset progress, but never moves faster than
// one full sweep per MIN_SWEEP_S so the blade reads even from a warm cache.
const MIN_SWEEP_S = 1.2
const FADE_S = 0.55
const EXIT_AT = 0.55 // fraction of the final swipe where the screen starts to clear

// Dev-only: ?preloaderProgress=0.6 freezes the loader at that progress,
// ?bladeT=0.45 additionally holds the blade at that eased position with sparks flowing.
const debugParam = (name) => {
    if (!import.meta.env.DEV || typeof location === 'undefined') return null
    const v = new URLSearchParams(location.search).get(name)
    return v === null || Number.isNaN(Number(v)) ? null : Math.min(1, Math.max(0, Number(v)))
}
const DEBUG_PROGRESS = debugParam('preloaderProgress')
const DEBUG_BLADE_T = debugParam('bladeT')

const wait = (ms) => new Promise((r) => setTimeout(r, ms))

// Swipe loop choreography: vertical positions cycle around the title.
const LOOP_YS = [0.56, 0.4, 0.66, 0.48]
const LOOP_ANGLES = [-8, -5, -10, -7]
const LOOP_GAP_MS = 900

export default function Preloader({ onComplete }) {
    const rootRef = useRef(null)
    const bladeRef = useRef(null)
    const sparksRef = useRef(null)
    const centerRef = useRef(null)
    const loadingRef = useRef(null)
    const fillRef = useRef(null)
    const textRef = useRef(null)
    const onCompleteRef = useRef(onComplete)

    useEffect(() => {
        onCompleteRef.current = onComplete
    }, [onComplete])

    useEffect(() => {
        const root = rootRef.current
        const loading = loadingRef.current
        const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
        let disposed = false
        let raf = 0
        let exitTl = null
        const timers = new Set()
        const later = (ms, fn) => {
            const id = setTimeout(() => {
                timers.delete(id)
                if (!disposed) fn()
            }, ms)
            timers.add(id)
        }

        document.body.style.overflow = 'hidden'
        document.body.classList.add('scroll-disabled')
        performance.mark('preloader:start')

        const fx =
            reducedMotion || !sparksRef.current || !bladeRef.current
                ? null
                : createBladeSwipe({ blade: bladeRef.current, canvas: sparksRef.current })
        root.classList.toggle('preloader--still', !fx)

        gsap.fromTo(centerRef.current, { opacity: 0, y: 28 }, { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out' })
        gsap.to(loading, { opacity: 1, duration: 0.3, delay: 0.1 })

        // ---- real loading progress (hero frames + fonts, decoded off the main thread)
        let real = 0
        preloadCriticalAssets((p) => {
            real = Math.max(real, p)
        }).then(() => {
            if (!disposed) performance.measure('preloader:assets', 'preloader:start')
        })

        const finish = () => {
            cancelAnimationFrame(raf)
            raf = 0
            fx?.dispose()
            root.style.display = 'none'
            document.body.style.overflow = ''
            document.body.classList.remove('scroll-disabled')
            performance.measure('preloader:total', 'preloader:start')
            onCompleteRef.current?.()
        }

        let exiting = false
        const exit = () => {
            if (exiting) return
            exiting = true
            const fade = () => {
                exitTl = gsap
                    .timeline({ onComplete: finish })
                    .to(loading, { opacity: 0, duration: 0.25 })
                    .to(root, { opacity: 0, duration: FADE_S, ease: 'power2.inOut' }, '<0.05')
            }
            if (!fx) {
                later(300, fade) // reduced motion / no canvas: plain fade
                return
            }
            fx.stop()
            fx.swipe({ y: window.innerHeight * 0.5, angle: -8, power: 1.25 })
            later(SWIPE_MS * EXIT_AT, fade) // the blade leads, the screen follows it out
        }

        // ---- swipe loop while loading
        if (fx && DEBUG_BLADE_T !== null) {
            fx.freeze({ at: DEBUG_BLADE_T, y: window.innerHeight * LOOP_YS[0] })
        } else if (fx) {
            let pass = 0
            const loop = () => {
                if (exiting || disposed) return
                const y = window.innerHeight * LOOP_YS[pass % LOOP_YS.length]
                const angle = LOOP_ANGLES[pass % LOOP_ANGLES.length]
                pass++
                fx.swipe({ y, angle }).then(() => later(LOOP_GAP_MS, loop))
            }
            later(350, loop)
        }

        // ---- progress ticker
        const start = performance.now()
        let shown = 0
        let lastPct = -1
        let lastTextAt = 0
        const frame = (now) => {
            shown = DEBUG_PROGRESS ?? Math.min(real, shown + Math.min(now - (frame.last || now), 100) / 1000 / MIN_SWEEP_S)
            frame.last = now
            const pct = Math.floor(shown * 100)
            if (pct !== lastPct) {
                lastPct = pct
                if (fillRef.current) fillRef.current.style.transform = `scaleX(${shown.toFixed(3)})`
                // Text changes force a tiny layout; keep them rare so playback stays layout-free.
                if (now - lastTextAt > 110 || pct === 100) {
                    lastTextAt = now
                    if (textRef.current) textRef.current.textContent = `lOaDiNg... ${pct}%`
                }
            }
            if (shown >= 1 && DEBUG_PROGRESS === null) exit()
            if (!exiting || fx) raf = requestAnimationFrame(frame)
        }
        raf = requestAnimationFrame(frame)

        return () => {
            disposed = true
            cancelAnimationFrame(raf)
            exitTl?.kill()
            timers.forEach(clearTimeout)
            fx?.dispose()
            document.body.style.overflow = ''
            document.body.classList.remove('scroll-disabled')
        }
    }, [])

    return (
        <div className="preloader preloader--samurai preloader--blade" id="preloader" ref={rootRef}>
            <div className="preloader-vignette" />
            <div className="blade-layer" aria-hidden="true">
                <div className="blade" ref={bladeRef}>
                    <svg viewBox="0 0 640 110" preserveAspectRatio="none" focusable="false">
                        <defs>
                            <linearGradient id="bladeBody" x1="0" y1="0" x2="1" y2="0">
                                <stop offset="0" stopColor="#ffffff" />
                                <stop offset="0.1" stopColor="#fff3dd" />
                                <stop offset="0.35" stopColor="#ffc87a" stopOpacity="0.85" />
                                <stop offset="0.7" stopColor="#ff8a3c" stopOpacity="0.35" />
                                <stop offset="1" stopColor="#ff5f2d" stopOpacity="0" />
                            </linearGradient>
                            <linearGradient id="bladeEdge" x1="0" y1="0" x2="1" y2="0">
                                <stop offset="0" stopColor="#ffffff" />
                                <stop offset="0.45" stopColor="#ffd9a8" stopOpacity="0.8" />
                                <stop offset="1" stopColor="#ffd9a8" stopOpacity="0" />
                            </linearGradient>
                        </defs>
                        {/* Tapered light-stroke: leading tip at the left, fading tail to the right */}
                        <path d="M0,55 L640,14 L640,44 L4,62 Z" fill="url(#bladeBody)" />
                        <path d="M0,55 L640,16" stroke="url(#bladeEdge)" strokeWidth="2.5" strokeLinecap="round" fill="none" />
                    </svg>
                </div>
            </div>
            <canvas className="preloader-sparks" ref={sparksRef} aria-hidden="true" />
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
