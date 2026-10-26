/**
 * Blade-swipe animation engine for the preloader. Framework-free: the React
 * component only supplies the blade element and a canvas, this module owns the
 * motion timeline and the spark particle system.
 *
 * Motion spec
 * -----------
 * Swipe      900 ms, easing cubic-bezier(0.16, 1, 0.3, 1). The blade is driven by the
 *            Web Animations API (translate3d + opacity keyframes), so it animates on
 *            the compositor: a busy main thread can stall the sparks, never the blade.
 * Path       right -> left: tip starts off-screen right, ends off-screen left
 * Opacity    in over t 0..0.08, hold, out over t 0.78..1
 * Sparks     rAF loop samples animation.currentTime (no layout reads) and emits from
 *            the leading edge while blade speed is high (t ~0.04..0.8); additive
 *            blending (globalCompositeOperation 'lighter'); gravity 340 px/s^2,
 *            drag x0.985 per 60 fps frame, life 0.4-0.9 s, alpha fades over the last
 *            40% of life; pool capped at 36 live particles
 */

export const SWIPE_MS = 900
export const SWIPE_EASE = cubicBezier(0.16, 1, 0.3, 1)

const MAX_PARTICLES = 36
const GRAVITY = 340 // px/s^2
const DRAG = 0.985 // velocity kept per 1/60 s
const TIP_Y_FRAC = 0.5 // leading tip sits at this fraction of the blade element's height

// Spark palette: white-hot core cooling through amber to ember red.
const HOT = [255, 248, 236]
const MID = [255, 200, 122]
const COLD = [255, 110, 50]

/** Same easing math CSS uses for cubic-bezier(). */
export function cubicBezier(x1, y1, x2, y2) {
    const cx = 3 * x1
    const bx = 3 * (x2 - x1) - cx
    const ax = 1 - cx - bx
    const cy = 3 * y1
    const by = 3 * (y2 - y1) - cy
    const ay = 1 - cy - by
    const sampleX = (t) => ((ax * t + bx) * t + cx) * t
    const sampleY = (t) => ((ay * t + by) * t + cy) * t
    const sampleDX = (t) => (3 * ax * t + 2 * bx) * t + cx
    return (x) => {
        if (x <= 0) return 0
        if (x >= 1) return 1
        let t = x
        for (let i = 0; i < 8; i++) {
            const err = sampleX(t) - x
            if (Math.abs(err) < 1e-6) return sampleY(t)
            const d = sampleDX(t)
            if (Math.abs(d) < 1e-6) break
            t -= err / d
        }
        let lo = 0
        let hi = 1
        t = x
        while (hi - lo > 1e-6) {
            if (sampleX(t) > x) hi = t
            else lo = t
            t = (lo + hi) / 2
        }
        return sampleY(t)
    }
}

const lerp = (a, b, t) => a + (b - a) * t
const rand = (min, max) => min + Math.random() * (max - min)

function sparkColor(heat, alpha) {
    // heat: 1 = fresh (white-hot), 0 = about to die (ember red)
    const [a, b, t] = heat > 0.5 ? [MID, HOT, (heat - 0.5) * 2] : [COLD, MID, heat * 2]
    return `rgba(${Math.round(lerp(a[0], b[0], t))},${Math.round(lerp(a[1], b[1], t))},${Math.round(lerp(a[2], b[2], t))},${alpha.toFixed(3)})`
}

export function createBladeSwipe({ blade, canvas }) {
    const ctx = canvas.getContext('2d')
    const particles = Array.from({ length: MAX_PARTICLES }, () => ({ alive: false }))
    let raf = 0
    let disposed = false
    let swipe = null // { anim, y, angle, power, resolve, prevEase }
    let frozen = null // eased t at which the blade is held (debug/screenshot mode)
    let emitAcc = 0

    const geom = { w: 0, h: 0, bladeW: 0, bladeH: 0, x0: 0, x1: 0, dpr: 1 }
    const measure = () => {
        const dpr = Math.min(window.devicePixelRatio || 1, 2)
        geom.dpr = dpr
        geom.w = canvas.clientWidth || window.innerWidth
        geom.h = canvas.clientHeight || window.innerHeight
        canvas.width = Math.round(geom.w * dpr)
        canvas.height = Math.round(geom.h * dpr)
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
        geom.bladeW = blade.offsetWidth
        geom.bladeH = blade.offsetHeight
        geom.x0 = geom.w * 1.02 // tip starts just off the right edge
        geom.x1 = -geom.bladeW * 1.05 // ... and ends fully off the left edge
    }
    measure()
    const onResize = () => measure()
    window.addEventListener('resize', onResize)

    // Places the blade at eased position e of a swipe anchored at (y, angle).
    // Used by freeze() only; live swipes are driven by WAAPI on the compositor.
    const place = (e, y, angle) => {
        const x = lerp(geom.x0, geom.x1, e)
        blade.style.transform = `translate3d(${x.toFixed(1)}px, ${(y - geom.bladeH * TIP_Y_FRAC).toFixed(1)}px, 0) rotate(${angle}deg)`
        return x
    }

    const spawn = (x, y, angle, speed) => {
        const p = particles.find((q) => !q.alive)
        if (!p) return
        // Emit along the leading edge, slightly behind the tip.
        const back = Math.random() * geom.bladeW * 0.3
        const a = (angle * Math.PI) / 180
        p.x = x + Math.cos(a) * back + rand(-3, 3)
        p.y = y + Math.sin(a) * back + rand(-6, 6)
        p.vx = -speed * rand(0.25, 0.55) + rand(-150, 30)
        p.vy = rand(-140, 90) - 50
        p.size = rand(0.8, 2.3)
        p.life = 0
        p.maxLife = rand(0.4, 0.9)
        p.alive = true
    }

    const stepParticles = (dt) => {
        let alive = 0
        ctx.clearRect(0, 0, geom.w, geom.h)
        ctx.globalCompositeOperation = 'lighter'
        const dragF = Math.pow(DRAG, dt * 60)
        for (const p of particles) {
            if (!p.alive) continue
            p.life += dt
            if (p.life >= p.maxLife || p.y > geom.h + 20) {
                p.alive = false
                continue
            }
            alive++
            p.vy += GRAVITY * dt
            p.vx *= dragF
            p.vy *= dragF
            p.x += p.vx * dt
            p.y += p.vy * dt
            const k = p.life / p.maxLife
            const alpha = k < 0.6 ? 1 : 1 - (k - 0.6) / 0.4
            const heat = 1 - k
            // halo
            ctx.fillStyle = sparkColor(heat * 0.6, alpha * 0.18)
            ctx.beginPath()
            ctx.arc(p.x, p.y, p.size * 3.2, 0, Math.PI * 2)
            ctx.fill()
            // core
            ctx.fillStyle = sparkColor(heat, alpha * 0.9)
            ctx.beginPath()
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
            ctx.fill()
        }
        ctx.globalCompositeOperation = 'source-over'
        return alive
    }

    const frame = (now) => {
        raf = 0
        if (disposed) return
        const dt = Math.min(0.05, (now - (frame.last || now)) / 1000)
        frame.last = now

        if (swipe) {
            // The blade's transform is animated by WAAPI on the compositor; we only
            // sample its clock to keep spark emission in sync. Same easing math as
            // the CSS cubic-bezier the compositor applies, so positions match.
            const t = Math.min(swipe.anim.currentTime / SWIPE_MS, 1)
            const e = SWIPE_EASE(t)
            const x = lerp(geom.x0, geom.x1, e)
            // Blade speed (px/s) from the eased curve drives the emission rate.
            const speed = (Math.abs(e - swipe.prevEase) / Math.max(dt, 1e-3)) * (geom.x0 - geom.x1) * swipe.power
            swipe.prevEase = e
            if (t > 0.04 && t < 0.8) {
                emitAcc += Math.min(70, speed * 0.045) * swipe.power * dt
                while (emitAcc >= 1) {
                    emitAcc -= 1
                    spawn(x, swipe.y, swipe.angle, speed)
                }
            }
        }

        if (frozen !== null) {
            emitAcc += 45 * dt
            while (emitAcc >= 1) {
                emitAcc -= 1
                const x = lerp(geom.x0, geom.x1, frozen.at)
                spawn(x, frozen.y, frozen.angle, 900)
            }
        }

        const alive = stepParticles(dt)
        if (swipe || frozen !== null || alive > 0) raf = requestAnimationFrame(frame)
        else frame.last = 0
    }
    const kick = () => {
        if (!disposed && !raf) {
            frame.last = 0
            raf = requestAnimationFrame(frame)
        }
    }

    return {
        /** One swipe. y = tip height in px, angle in deg (negative tilts the tip down). */
        swipe({ y = geom.h * 0.5, angle = -8, power = 1 } = {}) {
            if (swipe) return Promise.resolve()
            frozen = null
            blade.style.transform = '' // clear any freeze() placement so WAAPI owns it
            blade.style.opacity = ''
            const ty = y - geom.bladeH * TIP_Y_FRAC
            const x0 = geom.x0.toFixed(1)
            const x1 = geom.x1.toFixed(1)
            const anim = blade.animate(
                [
                    { transform: `translate3d(${x0}px, ${ty}px, 0) rotate(${angle}deg)`, opacity: 0, offset: 0 },
                    { opacity: 1, offset: 0.08 },
                    { opacity: 1, offset: 0.78 },
                    { transform: `translate3d(${x1}px, ${ty}px, 0) rotate(${angle}deg)`, opacity: 0, offset: 1 },
                ],
                { duration: SWIPE_MS, easing: 'cubic-bezier(0.16, 1, 0.3, 1)', fill: 'both' },
            )
            return new Promise((resolve) => {
                swipe = { anim, y, angle, power, resolve, prevEase: 0 }
                anim.onfinish = () => {
                    if (swipe && swipe.anim === anim) {
                        const done = swipe
                        swipe = null
                        done.resolve()
                    }
                }
                kick()
            })
        },
        /** Holds the blade at eased position `at` (0..1 across its path) with sparks flowing. */
        freeze({ at = 0.45, y = geom.h * 0.5, angle = -8 } = {}) {
            frozen = { at, y, angle }
            place(at, y, angle)
            blade.style.opacity = '1'
            kick()
        },
        stop() {
            if (swipe) {
                const done = swipe
                swipe = null
                done.anim.cancel()
                blade.style.opacity = '0'
                done.resolve()
            }
            frozen = null
        },
        dispose() {
            disposed = true
            cancelAnimationFrame(raf)
            raf = 0
            if (swipe) {
                swipe.anim.cancel()
                swipe = null
            }
            window.removeEventListener('resize', onResize)
            blade.style.opacity = '0'
        },
    }
}
