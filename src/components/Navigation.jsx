import { useState, useEffect } from 'react'
import gsap from 'gsap'
import { ScrollToPlugin } from 'gsap/ScrollToPlugin'

gsap.registerPlugin(ScrollToPlugin)

const links = [
    { id: 'hero', label: 'Home' },
    { id: 'works', label: 'Work' },
    { id: 'techstacks', label: 'Tech stack' },
    { id: 'about', label: 'About' },
    { id: 'contact', label: 'Contact' },
]

// `actions` renders in the header's right-hand group (the music toggle lives here, so it
// never floats over page content).
export default function Navigation({ actions = null }) {
    const [menuOpen, setMenuOpen] = useState(false)
    const [scrolled, setScrolled] = useState(false)

    // Transparent at the very top, lightly blurred once the page scrolls.
    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 24)
        onScroll()
        window.addEventListener('scroll', onScroll, { passive: true })
        return () => window.removeEventListener('scroll', onScroll)
    }, [])

    useEffect(() => {
        document.body.classList.toggle('menu-open', menuOpen)
        if (!menuOpen) return undefined
        const onKey = (e) => {
            if (e.key === 'Escape') setMenuOpen(false)
        }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [menuOpen])

    const handleNavClick = (e, id) => {
        e.preventDefault()
        setMenuOpen(false)
        const el = document.getElementById(id)
        if (el) {
            gsap.to(window, { duration: 1.2, scrollTo: { y: el, offsetY: 0 }, ease: 'power3.inOut' })
        }
    }

    return (
        <>
            <nav className={`nav ${scrolled ? 'is-scrolled' : ''}`} id="nav" aria-label="Main">
                <a href="#hero" className="nav-logo" aria-label="Anuj Singh, home" onClick={(e) => handleNavClick(e, 'hero')}>
                    AS<span className="accent-dot">.</span>
                </a>
                <div className="nav-right">
                    <div className="nav-links">
                        {links.map((l) => (
                            <a key={l.id} href={`#${l.id}`} className="nav-link" data-section={l.id} onClick={(e) => handleNavClick(e, l.id)}>
                                {l.label}
                            </a>
                        ))}
                    </div>
                    {actions}
                    <button
                        type="button"
                        className={`nav-hamburger ${menuOpen ? 'open' : ''}`}
                        aria-label={menuOpen ? 'Close menu' : 'Open menu'}
                        aria-expanded={menuOpen}
                        aria-controls="mobile-menu"
                        onClick={() => setMenuOpen((v) => !v)}
                    >
                        <span></span>
                        <span></span>
                        <span></span>
                    </button>
                </div>
            </nav>

            <div id="mobile-menu" className={`mobile-overlay ${menuOpen ? 'open' : ''}`} inert={!menuOpen}>
                <div className="mobile-overlay-links">
                    {links.map((l) => (
                        <a key={l.id} href={`#${l.id}`} className="mobile-link" onClick={(e) => handleNavClick(e, l.id)}>
                            {l.label}
                        </a>
                    ))}
                </div>
            </div>
        </>
    )
}
