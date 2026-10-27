const techs = [
    { icon: 'canvas', shape: 'cube', name: 'WebGL & Three.js', desc: 'Mind-bending 3D experiences right in your browser. Shader programming for that extra ✨' },
    { icon: 'gsap', name: 'GSAP', desc: 'Butter-smooth animations that make everything feel alive. Scroll-driven magic ✨' },
    { icon: 'code', name: 'React & Next.js', desc: 'Modern frameworks for building scalable, performant web apps with server-side power 🚀' },
    { icon: 'style', name: 'SCSS & Tailwind', desc: 'Pixel-perfect styling with a utility-first approach. Responsive design that just works 🎨' },
]

const marqueeItems = ['JavaScript', 'TypeScript', 'React', 'Next.js', 'Node.js', 'Three.js', 'GSAP', 'Python', 'WebGL', 'MongoDB', 'PostgreSQL', 'Figma']

export default function TechStacks() {
    return (
        <section className="panel techstacks-panel" id="techstacks">
            <div className="section-wrapper">
                <div className="section-header">
                    <span className="section-number">03</span>
                    <h2 className="section-title">Tech <span className="accent-text">stack</span></h2>
                </div>

                <div className="tech-intro">
                    <p className="tech-intro-text">
                        Why do I use <span className="accent-text">these tools</span>? Because they let me build
                        mind-bending experiences that plain JS can't handle. Hardware acceleration + high
                        performance = 🔥
                    </p>
                </div>

                <div className="tech-grid">
                    {techs.map((t, i) => (
                        <div key={i} className="tech-item" data-cursor="✦">
                            <div className="tech-icon-area">
                                {t.icon === 'canvas' && <canvas className="tech-mini-canvas" data-shape={t.shape}></canvas>}
                                {t.icon === 'gsap' && <div className="tech-icon-gsap"><span>G</span><span>S</span><span>A</span><span>P</span></div>}
                                {t.icon === 'code' && <div className="tech-icon-code"><span>&lt;/&gt;</span></div>}
                                {t.icon === 'style' && <div className="tech-icon-style"><span>CSS</span></div>}
                            </div>
                            <h3 className="tech-name">{t.name}</h3>
                            <p className="tech-desc">{t.desc}</p>
                        </div>
                    ))}
                </div>

                <div className="tech-marquee-wrap">
                    <div className="tech-marquee">
                        <div className="tech-marquee-track" id="marquee-track">
                            {[...marqueeItems, ...marqueeItems].map((item, i) => (
                                <span key={i}>{i > 0 && <span className="sep">✦</span>}{item}</span>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}
