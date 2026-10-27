import { useState, useEffect } from 'react'
import Preloader from './components/Preloader'
import Navigation from './components/Navigation'
import CustomCursor from './components/CustomCursor'
import MusicToggle from './components/MusicToggle'
import GlobalBackground from './components/GlobalBackground'
import Hero from './components/Hero'
import Works from './components/Works'
import Quote from './components/Quote'
import TechStacks from './components/TechStacks'
import About from './components/About'
import Awards from './components/Awards'
import Gallery from './components/Gallery'
import Socials from './components/Socials'
import Contact from './components/Contact'
import Footer from './components/Footer'
import { useScrollAnimations } from './hooks/useScrollAnimations'

export default function App() {
    const [loaded, setLoaded] = useState(false)
    const [theme] = useState('morning')

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme)
    }, [theme])

    useScrollAnimations(loaded)

    return (
        <>
            <Preloader onComplete={() => setLoaded(true)} />
            {/* inert while the preloader is up: nothing behind it can take focus or clicks */}
            <div className="site" inert={!loaded}>
                <a href="#works" className="skip-link">Skip to work</a>
                <GlobalBackground paused={!loaded} />
                <CustomCursor />
                <Navigation actions={<MusicToggle loaded={loaded} />} />
                <main>
                    {/* 01 */}
                    <Hero loaded={loaded} />
                    {/* 02 */}
                    <Works />
                    <Quote />
                    {/* 03 */}
                    <TechStacks />
                    {/* 04 */}
                    <About />
                    <Awards />
                    {/* 05 */}
                    <Gallery />
                    {/* 06 (contact, then socials as part of the same block) */}
                    <Contact />
                    <Socials />
                </main>
                <Footer />
            </div>
        </>
    )
}
