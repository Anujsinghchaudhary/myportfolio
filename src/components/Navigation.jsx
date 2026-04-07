import { useState } from 'react'
import gsap from 'gsap'
import { ScrollToPlugin } from 'gsap/ScrollToPlugin'

gsap.registerPlugin(ScrollToPlugin)

export default function Navigation() {
    const [menuOpen, setMenuOpen] = useState(false)

    const toggleMenu = () => {
        setMenuOpen(prev => !prev)
        document.body.classList.toggle('menu-open')
    }

    const closeMenu = () => {
        setMenuOpen(false)
        document.body.classList.remove('menu-open')
    }

    const handleNavClick = (e, id) => {
        e.preventDefault()
        closeMenu()
        const el = document.getElementById(id)
        if (el) {
            gsap.to(window, { duration: 1.2, scrollTo: { y: el, offsetY: 0 }, ease: 'power3.inOut' })
        }
    }

    const links = [
        { id: 'hero', label: 'home' },
        { id: 'works', label: 'work' },
        { id: 'techstacks', label: 'tech stack' },
        { id: 'about', label: 'about' },
        { id: 'contact', label: 'contact' },
    ]

    return (
        <>
            <nav className="nav" id="nav">
                <a href="#hero" className="nav-logo" onClick={e => handleNavClick(e, 'hero')}>
                    AS<span className="accent-dot">.</span>
                </a>
                <div className="nav-links">
                    {links.map(l => (
                        <a key={l.id} href={`#${l.id}`} className="nav-link" data-section={l.id}
                            onClick={e => handleNavClick(e, l.id)}>{l.label}</a>
                    ))}
                </div>
                <button className={`nav-hamburger ${menuOpen ? 'open' : ''}`} aria-label="Menu" onClick={toggleMenu}>
                    <span></span><span></span><span></span>
                </button>
            </nav>

            <div className={`mobile-overlay ${menuOpen ? 'open' : ''}`}>
                <div className="mobile-overlay-links">
                    {links.map(l => (
                        <a key={l.id} href={`#${l.id}`} className="mobile-link"
                            onClick={e => handleNavClick(e, l.id)}>{l.label}</a>
                    ))}
                </div>
            </div>
        </>
    )
}
