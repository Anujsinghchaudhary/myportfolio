import { useEffect } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { ScrollToPlugin } from 'gsap/ScrollToPlugin'

gsap.registerPlugin(ScrollTrigger, ScrollToPlugin)

export function useScrollAnimations(loaded) {
    useEffect(() => {
        if (!loaded) return

        const ctx = gsap.context(() => {

            // Page reveal (nav stays crisp — no fade/blend “loading” feel)
            const tl = gsap.timeline()
            tl.fromTo('.hero-line',
                { opacity: 0, y: '100%' },
                { opacity: 1, y: 0, duration: 1.2, stagger: 0.18, ease: 'power4.out' }
            )
            .fromTo('.hero-center-desc',
                { opacity: 0, y: 20 },
                { opacity: 1, y: 0, duration: 0.8, ease: 'power2.out' },
                '-=0.6'
            )
            .fromTo('.hero-bottom-bar',
                { opacity: 0, y: 30 },
                { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out' },
                '-=0.4'
            )

            // Works horizontal scroll
            const worksTrack = document.getElementById('works-track')
            const worksScroll = document.getElementById('works-scroll')
            if (worksTrack && worksScroll) {
                const scrollAmount = worksTrack.scrollWidth - worksScroll.offsetWidth
                if (scrollAmount > 0) {
                    gsap.to(worksTrack, {
                        x: -scrollAmount,
                        ease: 'none',
                        scrollTrigger: {
                            trigger: '.works-panel',
                            start: 'top top',
                            end: () => `+=${scrollAmount}`,
                            pin: true,
                            scrub: 1,
                            invalidateOnRefresh: true,
                        }
                    })
                }
            }

            // Section corner text reveal
            gsap.utils.toArray('.section-corner-text').forEach(ct => {
                gsap.fromTo(ct,
                    { opacity: 0, y: 30 },
                    {
                        scrollTrigger: { trigger: ct.closest('.panel') || ct.parentElement, start: 'top 60%', toggleActions: 'play none none reverse' },
                        opacity: 1, y: 0, duration: 0.8, ease: 'power2.out'
                    }
                )
            })

            // Section headers
            gsap.utils.toArray('.section-header').forEach(header => {
                gsap.fromTo(header,
                    { opacity: 0, y: 40 },
                    {
                        scrollTrigger: { trigger: header, start: 'top 85%', toggleActions: 'play none none reverse' },
                        opacity: 1, y: 0, duration: 0.8, ease: 'power2.out'
                    }
                )
            })

            // Quote
            gsap.fromTo('.quote-text',
                { opacity: 0, y: 50 },
                {
                    scrollTrigger: { trigger: '.quote-panel', start: 'top 70%', toggleActions: 'play none none reverse' },
                    opacity: 1, y: 0, duration: 1, ease: 'power3.out'
                }
            )
            gsap.fromTo('.quote-author',
                { opacity: 0, x: -20 },
                {
                    scrollTrigger: { trigger: '.quote-panel', start: 'top 60%', toggleActions: 'play none none reverse' },
                    opacity: 1, x: 0, duration: 0.6, delay: 0.3, ease: 'power2.out'
                }
            )

            // Tech items
            gsap.fromTo('.tech-item',
                { opacity: 0, y: 40 },
                {
                    scrollTrigger: { trigger: '.tech-grid', start: 'top 80%', toggleActions: 'play none none reverse' },
                    opacity: 1, y: 0, stagger: 0.15, duration: 0.7, ease: 'power2.out'
                }
            )

            // About
            gsap.fromTo('.about-image-area',
                { opacity: 0, x: -50 },
                {
                    scrollTrigger: { trigger: '.about-grid', start: 'top 80%', toggleActions: 'play none none reverse' },
                    opacity: 1, x: 0, duration: 0.8, ease: 'power2.out'
                }
            )
            gsap.fromTo('.about-text-area',
                { opacity: 0, x: 50 },
                {
                    scrollTrigger: { trigger: '.about-grid', start: 'top 80%', toggleActions: 'play none none reverse' },
                    opacity: 1, x: 0, duration: 0.8, ease: 'power2.out'
                }
            )
            gsap.fromTo('.about-stat',
                { opacity: 0, y: 20 },
                {
                    scrollTrigger: { trigger: '.about-stats', start: 'top 90%', toggleActions: 'play none none reverse' },
                    opacity: 1, y: 0, stagger: 0.15, duration: 0.5, ease: 'power2.out'
                }
            )

            // Awards: opacity only — preserves CSS 3D + marquee ticker
            gsap.utils.toArray('.award-perspective-line').forEach((line, i) => {
                gsap.fromTo(line,
                    { opacity: 0 },
                    {
                        scrollTrigger: { trigger: '.awards-panel', start: 'top 70%', toggleActions: 'play none none reverse' },
                        opacity: 1, duration: 0.55, delay: i * 0.06, ease: 'power2.out'
                    }
                )
            })

            // Gallery tabs animation
            gsap.fromTo('.gallery-tabs',
                { opacity: 0, y: 20 },
                {
                    scrollTrigger: { trigger: '.gallery-panel', start: 'top 80%', toggleActions: 'play none none reverse' },
                    opacity: 1, y: 0, duration: 0.6, ease: 'power2.out'
                }
            )

            // Social cards
            gsap.fromTo('.social-card',
                { opacity: 0, y: 30 },
                {
                    scrollTrigger: { trigger: '.socials-grid', start: 'top 85%', toggleActions: 'play none none reverse' },
                    opacity: 1, y: 0, stagger: 0.1, duration: 0.5, ease: 'power2.out'
                }
            )

            // Contact
            gsap.fromTo('.contact-line',
                { opacity: 0, y: 60 },
                {
                    scrollTrigger: { trigger: '.contact-panel', start: 'top 70%', toggleActions: 'play none none reverse' },
                    opacity: 1, y: 0, stagger: 0.15, duration: 0.8, ease: 'power3.out'
                }
            )

            // Nav active state
            const sections = ['hero', 'works', 'techstacks', 'about', 'contact']
            sections.forEach(id => {
                ScrollTrigger.create({
                    trigger: `#${id}`,
                    start: 'top center',
                    end: 'bottom center',
                    onEnter: () => setActiveNav(id),
                    onEnterBack: () => setActiveNav(id),
                })
            })

            function setActiveNav(id) {
                document.querySelectorAll('.nav-link').forEach(link => {
                    link.classList.toggle('active', link.dataset.section === id)
                })
            }
        })

        return () => ctx.revert()
    }, [loaded])
}
