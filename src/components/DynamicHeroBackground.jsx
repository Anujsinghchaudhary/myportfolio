import { useEffect, useRef, useState, useCallback } from 'react'
import {
    MORNING_BACKGROUNDS,
    EVENING_BACKGROUNDS,
    GRADIENTS,
    ROTATE_MS,
} from '../config/dynamicBackgrounds'

function randomIndex(len) {
    return Math.floor(Math.random() * len)
}

function nextRandomIndex(len, current) {
    if (len <= 1) return current
    let idx = current
    while (idx === current) idx = randomIndex(len)
    return idx
}

export default function DynamicHeroBackground({ theme }) {
    const urls = theme === 'morning' ? MORNING_BACKGROUNDS : EVENING_BACKGROUNDS
    const gradient = theme === 'morning' ? GRADIENTS.morning : GRADIENTS.evening

    const [active, setActive] = useState(0)
    const [indices, setIndices] = useState([0, 0])

    const themeRef = useRef(theme)
    const activeRef = useRef(0)
    const indicesRef = useRef([0, 0])

    const parallaxWrapRef = useRef(null)
    const parallaxTarget = useRef({ x: 0, y: 0 })
    const parallaxCurrent = useRef({ x: 0, y: 0 })
    const parallaxRaf = useRef(null)

    useEffect(() => {
        themeRef.current = theme
    }, [theme])

    useEffect(() => {
        activeRef.current = active
    }, [active])

    useEffect(() => {
        indicesRef.current = indices
    }, [indices])

    useEffect(() => {
        const start = randomIndex(urls.length)
        const next = [start, start]
        setIndices(next)
        indicesRef.current = next
        setActive(0)
        activeRef.current = 0
    }, [theme, urls.length])

    const advance = useCallback(() => {
        const list = themeRef.current === 'morning' ? MORNING_BACKGROUNDS : EVENING_BACKGROUNDS
        const a = activeRef.current
        const i = indicesRef.current
        const nextIdx = nextRandomIndex(list.length, i[a])
        const inactive = 1 - a
        const img = new Image()
        img.onload = () => {
            setIndices((prev) => {
                const next = [...prev]
                next[inactive] = nextIdx
                return next
            })
            setActive(inactive)
        }
        img.onerror = () => {
            const fallback = nextRandomIndex(list.length, nextIdx)
            setIndices((prev) => {
                const next = [...prev]
                next[inactive] = fallback
                return next
            })
            setActive(inactive)
        }
        img.src = list[nextIdx]
    }, [])

    useEffect(() => {
        const id = setInterval(advance, ROTATE_MS)
        return () => clearInterval(id)
    }, [advance, theme])

    useEffect(() => {
        const el = parallaxWrapRef.current
        if (!el) return

        const onMove = (e) => {
            const x = (e.clientX / window.innerWidth - 0.5) * 2
            const y = (e.clientY / window.innerHeight - 0.5) * 2
            parallaxTarget.current = { x, y }
        }

        const loop = () => {
            const t = parallaxTarget.current
            const c = parallaxCurrent.current
            c.x += (t.x - c.x) * 0.06
            c.y += (t.y - c.y) * 0.06
            el.style.setProperty('--bg-parallax-x', c.x.toFixed(4))
            el.style.setProperty('--bg-parallax-y', c.y.toFixed(4))
            parallaxRaf.current = requestAnimationFrame(loop)
        }

        window.addEventListener('mousemove', onMove, { passive: true })
        parallaxRaf.current = requestAnimationFrame(loop)
        return () => {
            window.removeEventListener('mousemove', onMove)
            if (parallaxRaf.current) cancelAnimationFrame(parallaxRaf.current)
        }
    }, [])

    const bg = (url) => ({
        backgroundImage: `${gradient}, url(${url})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
    })

    return (
        <div className="hero-bg-parallax-wrap" ref={parallaxWrapRef}>
            <div
                className={`hero-bg-dynamic-layer ${active === 0 ? 'is-active' : ''}`}
                style={bg(urls[indices[0]])}
                aria-hidden="true"
            />
            <div
                className={`hero-bg-dynamic-layer ${active === 1 ? 'is-active' : ''}`}
                style={bg(urls[indices[1]])}
                aria-hidden="true"
            />
            <div className="hero-bg-atmosphere" aria-hidden="true" />
            <div className="hero-bg-light-streak" aria-hidden="true" />
        </div>
    )
}
