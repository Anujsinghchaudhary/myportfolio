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
    console.log('App component rendered')
    const [loaded, setLoaded] = useState(false)
    const [theme, setTheme] = useState('morning')

    useEffect(() => {
        console.log('App mounted, setting theme:', theme)
        document.documentElement.setAttribute('data-theme', theme)
    }, [theme])

    useScrollAnimations(loaded)

    return (
        <>
            <GlobalBackground />
            <CustomCursor />
            <MusicToggle loaded={loaded} />
            <Preloader onComplete={() => setLoaded(true)} />
            <Navigation />
            <Hero theme={theme} setTheme={setTheme} loaded={loaded} />
            <Works />
            <Quote />
            <TechStacks />
            <About />
            <Awards />
            <Gallery />
            <Socials />
            <Contact />
            <Footer />
        </>
    )
}
