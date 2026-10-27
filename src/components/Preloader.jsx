import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { preloadCriticalAssets } from '../lib/criticalAssets'
import { createBladeSwipe } from '../lib/bladeSwipe'

// Timing budget. The preloader is gone (display: none, site interactive) no later than
// MAX_MS after it mounts, whatever the network is doing. Assets that are still loading
// keep loading in the background; the hero shows its own thin progress bar for them.
const MAX_MS = 1500
const FADE_MS = 350
const MIN_MS = 700 // with a warm cache, still show the blade for a beat instead of flashing
const FILL_MS = 600 // the bar never fills faster than this
const SKIP_FADE_MS = 160
const SWIPE_DELAY_MS = 60

// Dev-only: ?preloaderProgress=0.6 freezes the loader at that progress (no time cap),
// ?bladeT=0.45 additionally holds the blade at that eased position with sparks flowing.
const debugParam = (name) => {
    if (!import.meta.env.DEV || typeof location === 'undefined') return null
    const v = new URLSearchParams(location.search).get(name)
    return v === null || Number.isNaN(Number(v)) ? null : Math.min(1, Math.max(0, Number(v)))
}
const DEBUG_PROGRESS = debugParam('preloaderProgress')
const DEBUG_BLADE_T = debugParam('bladeT')

export default function Preloader({ onComplete }) {
    const rootRef = useRef(null)
    const bladeRef = useRef(null)
    const sparksRef = useRef(null)
    const centerRef = useRef(null)
    const loadingRef = useRef(null)
    const fillRef = useRef(null)
    const skipRef = useRef(null)
    const onCompleteRef = useRef(onComplete)

    useEffect(() => {
        onCompleteRef.current = onComplete
    }, [onComplete])

    useEffect(() => {
        const root = rootRef.current
        const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
        const frozen = DEBUG_PROGRESS !== null
        let disposed = false
        let done = false
        let exiting = false
        let raf = 0
        let exitTween = null
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
        const t0 = performance.now()
        performance.mark('preloader:start')

        const fx =
            reducedMotion || !sparksRef.current || !bladeRef.current
                ? null
                : createBladeSwipe({ blade: bladeRef.current, canvas: sparksRef.current })
        root.classList.toggle('preloader--still', !fx)

        gsap.fromTo(centerRef.current, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.35, ease: 'power3.out' })
        gsap.fromTo(loadingRef.current, { opacity: 0 }, { opacity: 1, duration: 0.25, delay: 0.1 })

        // ---- real loading progress (hero frames + fonts, decoded off the main thread)
        let real = 0
        preloadCriticalAssets((p) => {
            real = Math.max(real, p)
        }).then(() => {
            if (!disposed) performance.measure('preloader:assets', 'preloader:start')
        })

        const onKey = (e) => {
            if (e.key === 'Escape') skip()
        }

        const finish = () => {
            if (done) return
            done = true
            cancelAnimationFrame(raf)
            timers.forEach(clearTimeout)
            timers.clear()
            exitTween?.kill()
            fx?.dispose()
            window.removeEventListener('keydown', onKey)
            if (root.contains(document.activeElement)) document.activeElement.blur()
            root.style.display = 'none'
            document.body.style.overflow = ''
            document.body.classList.remove('scroll-disabled')
            performance.measure('preloader:total', 'preloader:start')
            onCompleteRef.current?.()
        }

        const exit = (fadeMs) => {
            if (exiting) return
            exiting = true
            exitTween = gsap.to(root, { opacity: 0, duration: fadeMs / 1000, ease: 'power2.inOut', onComplete: finish })
        }

        // Skip: a short fade if nothing is running yet, otherwise end the fade now.
        const skip = () => {
            if (done) return
            if (exiting) finish()
            else exit(SKIP_FADE_MS)
        }
        skipRef.current = skip
        window.addEventListener('keydown', onKey)

        // Absolute cap: runs even if rAF or the GSAP ticker stall.
        if (!frozen) later(MAX_MS, finish)

        // ---- one blade swipe; the exit fade overlaps its second half
        if (fx && DEBUG_BLADE_T !== null) {
            fx.freeze({ at: DEBUG_BLADE_T, y: window.innerHeight * 0.56 })
        } else if (fx) {
            later(SWIPE_DELAY_MS, () => fx.swipe({ y: window.innerHeight * 0.56, angle: -8 }))
        }

        // ---- progress bar + exit scheduling
        const frame = (now) => {
            const elapsed = now - t0
            const shown = frozen ? DEBUG_PROGRESS : Math.min(real, elapsed / FILL_MS)
            if (fillRef.current) fillRef.current.style.transform = `scaleX(${shown.toFixed(3)})`
            if (!frozen && !exiting) {
                const assetsReady = real >= 1 && elapsed >= MIN_MS
                const outOfTime = elapsed >= MAX_MS - FADE_MS
                if (assetsReady || outOfTime) exit(FADE_MS)
            }
            if (!done) raf = requestAnimationFrame(frame)
        }
        raf = requestAnimationFrame(frame)

        return () => {
            disposed = true
            cancelAnimationFrame(raf)
            exitTween?.kill()
            timers.forEach(clearTimeout)
            fx?.dispose()
            window.removeEventListener('keydown', onKey)
            skipRef.current = null
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
                <p className="preloader-sub">Creative developer</p>
            </div>
            <div className="preloader-loading" ref={loadingRef} role="status">
                <div className="loading-bar" aria-hidden="true">
                    <div className="loading-fill" ref={fillRef}></div>
                </div>
                <span className="loading-text">Loading</span>
            </div>
            <button type="button" className="preloader-skip" onClick={() => skipRef.current?.()}>
                Skip intro
            </button>
        </div>
    )
}
