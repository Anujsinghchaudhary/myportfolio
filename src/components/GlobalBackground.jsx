import { useEffect, useRef } from 'react'

export default function GlobalBackground({ paused = false }) {
    const canvasRef = useRef(null)

    useEffect(() => {
        // Nothing to draw while an opaque overlay (the preloader) covers the page.
        if (paused) return
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext('2d')
        let animId
        let embers = []
        let streaks = []
        let pulses = []

        const setCanvasSize = () => {
            canvas.width = window.innerWidth
            canvas.height = document.documentElement.scrollHeight
        }

        const initScene = () => {
            const emberCount = Math.min(150, Math.max(90, Math.floor(window.innerWidth / 11)))
            const streakCount = Math.min(36, Math.max(16, Math.floor(window.innerWidth / 52)))
            const pulseCount = 9

            embers = Array.from({ length: emberCount }, () => ({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                size: Math.random() * 2.6 + 0.5,
                speedX: (Math.random() - 0.5) * 0.24,
                speedY: -(Math.random() * 0.36 + 0.1),
                opacity: Math.random() * 0.34 + 0.05,
                pulse: Math.random() * Math.PI * 2,
                pulseSpeed: Math.random() * 0.022 + 0.006,
                hue: 16 + Math.random() * 30,
            }))

            streaks = Array.from({ length: streakCount }, () => ({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                len: Math.random() * 26 + 16,
                width: Math.random() * 1.5 + 0.4,
                vx: Math.random() * 1.45 + 0.35,
                vy: -(Math.random() * 0.95 + 0.3),
                opacity: Math.random() * 0.28 + 0.06,
            }))

            pulses = Array.from({ length: pulseCount }, () => ({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                radius: Math.random() * 180 + 80,
                driftX: (Math.random() - 0.5) * 0.22,
                driftY: (Math.random() - 0.5) * 0.18,
                phase: Math.random() * Math.PI * 2,
                opacity: Math.random() * 0.1 + 0.04,
            }))
        }

        const resize = () => {
            setCanvasSize()
            initScene()
        }
        resize()
        window.addEventListener('resize', resize)

        const ro = new ResizeObserver(() => {
            setCanvasSize()
            initScene()
        })
        ro.observe(document.body)

        let time = 0

        function draw() {
            time += 0.016
            ctx.clearRect(0, 0, canvas.width, canvas.height)
            const scrollY = window.scrollY
            const viewTop = scrollY - 260
            const viewBottom = scrollY + window.innerHeight + 260
            const wind = Math.sin(time * 0.45) * 0.18

            pulses.forEach((p) => {
                p.phase += 0.006
                p.x += p.driftX
                p.y += p.driftY
                if (p.x < -p.radius) p.x = canvas.width + p.radius
                if (p.x > canvas.width + p.radius) p.x = -p.radius
                if (p.y < -p.radius) p.y = canvas.height + p.radius
                if (p.y > canvas.height + p.radius) p.y = -p.radius
                if (p.y < viewTop - p.radius || p.y > viewBottom + p.radius) return

                const pulse = 0.78 + Math.sin(p.phase) * 0.22
                const r = p.radius * pulse
                const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r)
                g.addColorStop(0, `rgba(255, 140, 70, ${p.opacity * 1.1})`)
                g.addColorStop(0.5, `rgba(95, 36, 26, ${p.opacity * 0.38})`)
                g.addColorStop(1, 'rgba(0, 0, 0, 0)')
                ctx.beginPath()
                ctx.arc(p.x, p.y, r, 0, Math.PI * 2)
                ctx.fillStyle = g
                ctx.fill()
            })

            streaks.forEach((s) => {
                s.x += s.vx + wind
                s.y += s.vy
                if (s.y < viewTop - 120 || s.x > canvas.width + 120) {
                    s.x = -80 - Math.random() * 180
                    s.y = viewBottom + Math.random() * 280
                }
                if (s.y < viewTop || s.y > viewBottom) return

                const tailX = s.x - s.len * 0.92
                const tailY = s.y + s.len * 0.45
                ctx.beginPath()
                ctx.moveTo(s.x, s.y)
                ctx.lineTo(tailX, tailY)
                ctx.strokeStyle = `rgba(255, 178, 126, ${s.opacity})`
                ctx.lineWidth = s.width
                ctx.lineCap = 'round'
                ctx.stroke()
            })

            embers.forEach((p) => {
                p.x += p.speedX
                p.y += p.speedY + wind * 0.15
                p.pulse += p.pulseSpeed

                if (p.y < -10) {
                    p.y = canvas.height + 10
                    p.x = Math.random() * canvas.width
                }
                if (p.x < -10) p.x = canvas.width + 10
                if (p.x > canvas.width + 10) p.x = -10

                if (p.y < viewTop || p.y > viewBottom) return

                const alpha = p.opacity * (0.72 + 0.28 * Math.sin(p.pulse))
                ctx.beginPath()
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
                ctx.fillStyle = `hsla(${p.hue}, 100%, 68%, ${alpha})`
                ctx.shadowColor = `hsla(${p.hue + 6}, 100%, 70%, ${alpha * 0.85})`
                ctx.shadowBlur = 8
                ctx.fill()
            })

            ctx.shadowBlur = 0

            animId = requestAnimationFrame(draw)
        }
        draw()

        return () => {
            cancelAnimationFrame(animId)
            window.removeEventListener('resize', resize)
            ro.disconnect()
        }
    }, [paused])

    return (
        <canvas
            ref={canvasRef}
            className="global-bg-canvas"
            aria-hidden="true"
        />
    )
}
