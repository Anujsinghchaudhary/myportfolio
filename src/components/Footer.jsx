import gsap from 'gsap'
import { ScrollToPlugin } from 'gsap/ScrollToPlugin'

gsap.registerPlugin(ScrollToPlugin)

export default function Footer() {
    const handleTop = (e) => {
        e.preventDefault()
        const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
        if (reduced) window.scrollTo({ top: 0, behavior: 'auto' })
        else gsap.to(window, { duration: 1.2, scrollTo: { y: '#hero', offsetY: 0 }, ease: 'power3.inOut' })
        document.querySelector('.nav-logo')?.focus({ preventScroll: true })
    }

    return (
        <footer className="site-footer">
            <div className="footer-inner">
                <div className="footer-left">
                    <span className="footer-copy">© {new Date().getFullYear()} Anuj Singh</span>
                    <span className="footer-tagline">Made with love and too much coffee</span>
                </div>
                <a href="#hero" className="footer-top" data-cursor="Up" onClick={handleTop}>
                    Back to top <span aria-hidden="true">↑</span>
                </a>
            </div>
        </footer>
    )
}
