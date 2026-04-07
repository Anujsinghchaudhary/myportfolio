import { useEffect, useRef, useCallback } from 'react'
import gsap from 'gsap'

export default function Preloader({ onComplete }) {
    const preloaderRef = useRef(null)
    const centerRef = useRef(null)
    const loadingRef = useRef(null)
    const fillRef = useRef(null)
    const textRef = useRef(null)
    const canvasRef = useRef(null)

    const dismissPreloader = useCallback(() => {
        const canvas = canvasRef.current
        const vignette = preloaderRef.current?.querySelector('.preloader-vignette')
        const center = centerRef.current
        const root = preloaderRef.current
        const loading = loadingRef.current

        const tl = gsap.timeline({
            onComplete: () => {
                if (root) {
                    root.style.display = 'none'
                    gsap.set(root, { clearProps: 'opacity' })
                }
                document.body.style.overflow = ''
                document.body.classList.remove('scroll-disabled')
                onComplete()
            },
        })

        tl.to(center, { opacity: 1, duration: 0.35 })
            .to(loading, { opacity: 0, duration: 0.24 }, '<')
            .to({}, { duration: 0.5 })
            .to(center, {
                opacity: 0,
                y: -20,
                filter: 'blur(10px)',
                duration: 0.85,
                ease: 'power2.inOut',
            })
            .to(canvas, { opacity: 0, duration: 0.7, ease: 'power2.inOut' }, '-=0.55')
            .to(vignette, { opacity: 0, duration: 0.55, ease: 'power2.inOut' }, '-=0.6')
            .to(root, { opacity: 0, duration: 0.6, ease: 'power2.inOut' }, '-=0.45')
    }, [onComplete])

    const startLoading = useCallback(() => {
        if (loadingRef.current) loadingRef.current.style.display = 'block'
        gsap.to(loadingRef.current, { opacity: 1, duration: 0.4 })
        let progress = 0
        function tick() {
            const inc =
                progress < 40
                    ? Math.random() * 3 + 1.5
                    : progress < 80
                      ? Math.random() * 5 + 2
                      : Math.random() * 10 + 5
            progress = Math.min(progress + inc, 100)
            if (fillRef.current) fillRef.current.style.width = progress + '%'
            if (textRef.current) textRef.current.textContent = `lOaDiNg... ${Math.floor(progress)}%`
            if (progress < 100) {
                setTimeout(tick, Math.random() * 80 + 30)
            } else {
                setTimeout(dismissPreloader, 400)
            }
        }
        tick()
    }, [dismissPreloader])

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext('2d')
        const resize = () => {
            canvas.width = window.innerWidth
            canvas.height = window.innerHeight
        }
        resize()
        window.addEventListener('resize', resize)
        const cx = canvas.width / 2,
            cy = canvas.height / 2

        const embers = Array.from({ length: 65 }, () => ({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            size: Math.random() * 3.2 + 0.4,
            speedX: (Math.random() - 0.5) * 0.85,
            speedY: -(Math.random() * 1.4 + 0.35),
            opacity: Math.random() * 0.45 + 0.12,
            hue: Math.random() * 28 - 8,
            flicker: Math.random() * Math.PI * 2,
        }))

        const bloom = Array.from({ length: 18 }, (_, i) => ({
            angle: (i / 18) * Math.PI * 2 + Math.random() * 0.35,
            dist: Math.random() * 32 + 6,
            size: Math.random() * 22 + 12,
            opacity: Math.random() * 0.28 + 0.18,
            phase: Math.random() * Math.PI * 2,
        }))

        let animId,
            time = 0
        function draw() {
            time += 0.016
            ctx.clearRect(0, 0, canvas.width, canvas.height)
            bloom.forEach((bp) => {
                const pulse = Math.sin(time * 1.4 + bp.phase) * 0.12 + 1
                const x = cx + Math.cos(bp.angle + time * 0.2) * bp.dist * pulse
                const y = cy + Math.sin(bp.angle + time * 0.2) * bp.dist * pulse
                const g = ctx.createRadialGradient(x, y, 0, x, y, bp.size * pulse)
                g.addColorStop(0, `rgba(220, 60, 50, ${bp.opacity * pulse * 0.45})`)
                g.addColorStop(0.45, `rgba(180, 45, 55, ${bp.opacity * 0.25 * pulse})`)
                g.addColorStop(1, 'rgba(40, 10, 20, 0)')
                ctx.beginPath()
                ctx.arc(x, y, bp.size * pulse, 0, Math.PI * 2)
                ctx.fillStyle = g
                ctx.fill()
            })
            const gp = Math.sin(time * 1.8) * 0.08 + 0.92
            const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, 62 * gp)
            glow.addColorStop(0, `rgba(255, 200, 120, ${0.12 * gp})`)
            glow.addColorStop(0.5, `rgba(140, 40, 45, ${0.08 * gp})`)
            glow.addColorStop(1, 'rgba(20, 8, 12, 0)')
            ctx.beginPath()
            ctx.arc(cx, cy, 62 * gp, 0, Math.PI * 2)
            ctx.fillStyle = glow
            ctx.fill()

            embers.forEach((p) => {
                p.flicker += 0.08
                const flick = 0.75 + 0.25 * Math.sin(p.flicker)
                const r = Math.max(0, Math.min(255, 230 + p.hue))
                const g = Math.max(0, Math.min(255, 90 + p.hue * 0.4))
                const b = Math.max(0, Math.min(255, 70 + p.hue * 0.2))
                ctx.globalAlpha = p.opacity * flick
                ctx.shadowColor = `rgba(${r},${g},${b},0.55)`
                ctx.shadowBlur = 8
                ctx.fillStyle = `rgb(${r},${g},${b})`
                ctx.beginPath()
                ctx.arc(p.x, p.y, p.size * flick, 0, Math.PI * 2)
                ctx.fill()
                p.x += p.speedX
                p.y += p.speedY
                if (p.y < -12) {
                    p.y = canvas.height + 12
                    p.x = Math.random() * canvas.width
                }
                if (p.x < -8) p.x = canvas.width + 8
                if (p.x > canvas.width + 8) p.x = -8
            })
            ctx.globalAlpha = 1
            ctx.shadowBlur = 0
            animId = requestAnimationFrame(draw)
        }
        draw()
        const tl = gsap.timeline()
        tl.from(centerRef.current, { opacity: 0, y: 28, duration: 0.75, ease: 'power3.out', delay: 0.25 }).call(
            () => startLoading(),
            null,
            '+=0.85',
        )
        return () => {
            cancelAnimationFrame(animId)
            window.removeEventListener('resize', resize)
        }
    }, [startLoading])

    useEffect(() => {
        document.body.style.overflow = 'hidden'
        document.body.classList.add('scroll-disabled')
    }, [])

    return (
        <div className="preloader preloader--samurai" id="preloader" ref={preloaderRef}>
            <canvas ref={canvasRef} id="preloader-canvas" />
            <div className="preloader-vignette" />
            <div className="preloader-center" ref={centerRef}>
                <p className="preloader-kanji" aria-hidden="true">
                    侍
                </p>
                <h1 className="preloader-title">Anuj Singh</h1>
                <p className="preloader-sub">cReaTive dEveLoPer · 創造</p>
            </div>
            <div className="preloader-loading" ref={loadingRef} style={{ display: 'none', opacity: 0 }}>
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
