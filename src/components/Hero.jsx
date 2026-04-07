import { useEffect, useRef, useCallback } from 'react'
import DynamicHeroBackground from './DynamicHeroBackground'

export default function Hero({ theme, setTheme, loaded }) {
    const canvasRef = useRef(null)
    const animRef = useRef(null)

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext('2d')
        let mx = -1000, my = -1000
        const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight }
        resize(); window.addEventListener('resize', resize)
        const onMove = (e) => { mx = e.clientX; my = e.clientY }
        window.addEventListener('mousemove', onMove)

        class Particle {
            constructor() { this.reset() }
            reset() {
                this.x = Math.random() * canvas.width; this.y = Math.random() * canvas.height
                this.size = Math.random() * 3 + 1; this.vx = (Math.random() - 0.5) * 0.3
                this.vy = (Math.random() - 0.5) * 0.3; this.pulsePhase = Math.random() * Math.PI * 2
                this.pulseSpeed = Math.random() * 0.02 + 0.01; this.alpha = Math.random() * 0.4 + 0.1
            }
            update() {
                this.x += this.vx; this.y += this.vy; this.pulsePhase += this.pulseSpeed
                const dx = this.x - mx, dy = this.y - my, d = Math.sqrt(dx * dx + dy * dy)
                if (d < 120) { const f = (120 - d) / 120; this.x += (dx / d) * f * 2; this.y += (dy / d) * f * 2 }
                if (this.x < -10) this.x = canvas.width + 10; if (this.x > canvas.width + 10) this.x = -10
                if (this.y < -10) this.y = canvas.height + 10; if (this.y > canvas.height + 10) this.y = -10
            }
            draw() {
                const pulse = Math.sin(this.pulsePhase) * 0.3 + 0.7
                ctx.beginPath(); ctx.arc(this.x, this.y, this.size * pulse, 0, Math.PI * 2)
                ctx.fillStyle = `rgba(230, 190, 140, ${this.alpha * pulse})`; ctx.fill()
            }
        }
        const particles = Array.from({ length: 80 }, () => new Particle())
        function loop() {
            ctx.clearRect(0, 0, canvas.width, canvas.height)
            particles.forEach(p => { p.update(); p.draw() })
            for (let i = 0; i < particles.length; i++) {
                for (let j = i + 1; j < particles.length; j++) {
                    const dx = particles[i].x - particles[j].x, dy = particles[i].y - particles[j].y
                    const dist = Math.sqrt(dx * dx + dy * dy)
                    if (dist < 100) {
                        ctx.beginPath(); ctx.moveTo(particles[i].x, particles[i].y); ctx.lineTo(particles[j].x, particles[j].y)
                        ctx.strokeStyle = `rgba(200, 120, 130, ${0.09 * (1 - dist / 100)})`; ctx.lineWidth = 0.5; ctx.stroke()
                    }
                }
            }
            animRef.current = requestAnimationFrame(loop)
        }
        loop()
        return () => { cancelAnimationFrame(animRef.current); window.removeEventListener('resize', resize); window.removeEventListener('mousemove', onMove) }
    }, [])

    return (
        <section className={`panel hero-panel ${loaded ? 'hero-loaded' : ''}`} id="hero">
            <div className="hero-bg-layers">
                <DynamicHeroBackground theme={theme} />
            </div>
            <canvas ref={canvasRef} id="hero-canvas"></canvas>

            <div className="hero-content-immersive">
                <div className="hero-name-large">
                    <span className="hero-line" data-text="aNuJ">aNuJ</span>
                    <span className="hero-line accent-text" data-text="sInGh">sInGh</span>
                </div>
                <div className="hero-center-desc">
                    <p className="hero-jp">クリエイティブな開発者です。</p>
                    <p className="hero-desc">Hi <span className="accent-text">&lt;3</span>, I'm Anuj. I build crazy web experiences.</p>
                </div>
            </div>

            <div className="hero-bottom-bar">
                <button className={`hero-corner-btn left ${loaded ? 'visible' : ''} ${theme === 'morning' ? 'active' : ''}`}
                    onClick={() => setTheme('morning')}>
                    <span className="corner-btn-label">mOrNiNg</span>
                </button>
                <div className="scroll-indicator" id="scroll-indicator">
                    <div className="scroll-pill"><div className="scroll-dot"></div></div>
                </div>
                <button className={`hero-corner-btn right ${loaded ? 'visible' : ''} ${theme === 'evening' ? 'active' : ''}`}
                    onClick={() => setTheme('evening')}>
                    <span className="corner-btn-label">eVeNiNg</span>
                </button>
            </div>
        </section>
    )
}
