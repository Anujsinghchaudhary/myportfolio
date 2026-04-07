import gsap from 'gsap'
import { ScrollToPlugin } from 'gsap/ScrollToPlugin'

gsap.registerPlugin(ScrollToPlugin)

export default function Footer() {
    const handleTop = (e) => {
        e.preventDefault()
        gsap.to(window, { duration: 1.2, scrollTo: { y: '#hero', offsetY: 0 }, ease: 'power3.inOut' })
    }

    return (
        <footer className="site-footer">
            <div className="footer-inner">
                <div className="footer-left">
                    <span className="footer-copy">\u00A9 2026 aNuJ sInGh</span>
                    <span className="footer-tagline">mAdE wItH luv aNd tOo mUcH cOfFeE</span>
                </div>
                <a href="#hero" className="footer-top" data-cursor="up" onClick={handleTop}>bAcK tO tOp \u2191</a>
            </div>
        </footer>
    )
}
