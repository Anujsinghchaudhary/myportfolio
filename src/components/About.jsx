export default function About() {
    return (
        <section className="panel about-panel" id="about">
            <div className="section-wrapper">
                <div className="section-header">
                    <span className="section-number">04</span>
                    <h2 className="section-title">aBouT <span className="accent-text">mE</span></h2>
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
                            hEy! i'm <span className="accent-text">aNuJ</span>, a <span className="accent-text">cReAtIvE dEvEloPeR</span> wHo tUrNs cRaZy iDeAs iNtO iNtErAcTiVe wEb eXpErIeNcEs.
                        </p>
                        <p className="about-body">
                            wHeN i'm nOt cOdInG aT 3 aM, yOu'lL fInD mE eXpLoRiNg nEw tEcH,
                            bReAkInG tHiNgS (aNd fIxInG tHeM… eVeNtUaLLy 😅), aNd dRiNkInG
                            wAy tOo mUcH cOfFeE ☕.
                        </p>
                        <div className="about-stats">
                            <div className="about-stat">
                                <span className="stat-number">2+</span>
                                <span className="stat-label">yEaRs cOdInG</span>
                            </div>
                            <div className="about-stat">
                                <span className="stat-number">20+</span>
                                <span className="stat-label">pRoJeCts bUiLt</span>
                            </div>
                            <div className="about-stat">
                                <span className="stat-number">∞</span>
                                <span className="stat-label">cOfFeE cUpS</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}
