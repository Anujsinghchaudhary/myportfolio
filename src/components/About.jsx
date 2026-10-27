export default function About() {
    return (
        <section className="panel about-panel" id="about">
            <div className="section-wrapper">
                <div className="section-header">
                    <span className="section-number">04</span>
                    <h2 className="section-title">About <span className="accent-text">me</span></h2>
                </div>
                <div className="about-grid">
                    <div className="about-image-area">
                        <div className="about-image-frame" id="about-image">
                            <img
                                src="/profile.jpeg"
                                alt="Anuj Singh"
                                className="about-profile-img"
                                loading="lazy"
                            />
                            <div className="about-image-glitch"></div>
                            <div className="about-image-border-glow"></div>
                        </div>
                    </div>
                    <div className="about-text-area">
                        <p className="about-intro">
                            Hey! I'm <span className="accent-text">Anuj</span>, a <span className="accent-text">creative developer</span> who turns crazy ideas into interactive web experiences.
                        </p>
                        <p className="about-body">
                            When I'm not coding at 3 a.m., you'll find me exploring new tech,
                            breaking things (and fixing them… eventually 😅), and drinking
                            way too much coffee ☕.
                        </p>
                        <div className="about-stats">
                            <div className="about-stat">
                                <span className="stat-number">2+</span>
                                <span className="stat-label">Years coding</span>
                            </div>
                            <div className="about-stat">
                                <span className="stat-number">20+</span>
                                <span className="stat-label">Projects built</span>
                            </div>
                            <div className="about-stat">
                                <span className="stat-number">∞</span>
                                <span className="stat-label">Coffee cups</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}
