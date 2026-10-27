import { useEffect, useRef } from 'react'

// Decorative follower ring. The native cursor stays visible and does the real work.
// - Only for fine pointers that can hover (mouse/trackpad). Never on touch devices.
// - Off under prefers-reduced-motion (the ring is a lagging, moving element).
// - Hidden whenever the pointer is over readable text, so it never sits on top of it.
// - The rAF loop only runs while the ring is catching up to the pointer.

const FINE_POINTER = '(hover: hover) and (pointer: fine)'
const REDUCED_MOTION = '(prefers-reduced-motion: reduce)'
const TEXT_SELECTOR =
    'p, h1, h2, h3, h4, h5, h6, li, dt, dd, blockquote, cite, figcaption, label, small, code, pre, input, textarea, select, [data-cursor-hide]'
const FOLLOW = 0.2 // fraction of the remaining distance covered per 60 fps frame

const hasOwnText = (el) => {
    for (const n of el.childNodes) if (n.nodeType === 3 && n.textContent.trim()) return true
    return false
}
const isTextTarget = (el) => !!el.closest(TEXT_SELECTOR) || hasOwnText(el)

function attach(cursor, label) {
    let mx = 0
    let my = 0
    let cx = 0
    let cy = 0
    let raf = 0
    let last = 0
    let seen = false

    const render = () => {
        cursor.style.transform = `translate3d(${cx.toFixed(1)}px, ${cy.toFixed(1)}px, 0)`
    }
    const tick = (now) => {
        const k = 1 - Math.pow(1 - FOLLOW, Math.min(now - last, 64) / 16.667)
        last = now
        cx += (mx - cx) * k
        cy += (my - cy) * k
        if (Math.abs(mx - cx) < 0.1 && Math.abs(my - cy) < 0.1) {
            cx = mx
            cy = my
            raf = 0
        } else {
            raf = requestAnimationFrame(tick)
        }
        render()
    }
    const onMove = (e) => {
        mx = e.clientX
        my = e.clientY
        if (!seen) {
            seen = true
            cx = mx
            cy = my
            render()
            cursor.classList.add('is-active')
        }
        if (!raf) {
            last = performance.now()
            raf = requestAnimationFrame(tick)
        }
    }
    const onOver = (e) => {
        const t = e.target instanceof Element ? e.target : null
        if (!t) return
        if (isTextTarget(t)) {
            cursor.classList.add('is-hidden')
            cursor.classList.remove('has-label')
            return
        }
        cursor.classList.remove('is-hidden')
        const host = t.closest('[data-cursor]')
        if (host) {
            label.textContent = host.dataset.cursor
            cursor.classList.add('has-label')
        } else {
            cursor.classList.remove('has-label')
        }
    }
    const onLeaveWindow = (e) => {
        if (!e.relatedTarget) cursor.classList.remove('is-active')
        seen = !!e.relatedTarget && seen
    }

    window.addEventListener('mousemove', onMove, { passive: true })
    document.addEventListener('mouseover', onOver, { passive: true })
    document.addEventListener('mouseout', onLeaveWindow, { passive: true })
    return () => {
        cancelAnimationFrame(raf)
        window.removeEventListener('mousemove', onMove)
        document.removeEventListener('mouseover', onOver)
        document.removeEventListener('mouseout', onLeaveWindow)
        cursor.classList.remove('is-active', 'is-hidden', 'has-label')
    }
}

export default function CustomCursor() {
    const cursorRef = useRef(null)
    const labelRef = useRef(null)

    useEffect(() => {
        const fine = window.matchMedia(FINE_POINTER)
        const reduced = window.matchMedia(REDUCED_MOTION)
        let detach = null
        const sync = () => {
            detach?.()
            detach = null
            if (fine.matches && !reduced.matches && cursorRef.current) {
                detach = attach(cursorRef.current, labelRef.current)
            }
        }
        sync()
        fine.addEventListener('change', sync)
        reduced.addEventListener('change', sync)
        return () => {
            fine.removeEventListener('change', sync)
            reduced.removeEventListener('change', sync)
            detach?.()
        }
    }, [])

    return (
        <div className="custom-cursor" ref={cursorRef} aria-hidden="true">
            <span className="cursor-ring" />
            <span className="cursor-label" ref={labelRef} />
        </div>
    )
}
