// Phase 2 replaces this marquee with a Proof block of verified items only.
const awards = [
    'Best design award',
    'Creative coder of the year',
    'UI/UX innovation award',
    'Frontend ninja certified',
    'Open source contributor',
    'Hackathon winner 2025',
    'Design excellence award',
    'Top web developer',
]

export default function Awards() {
    return (
        <section className="panel awards-panel" id="awards">
            <div className="awards-perspective-container">
                <div className="awards-perspective-track">
                    {awards.map((text, i) => {
                        const display = text.toUpperCase()
                        const dur = `${18 + i * 1.75}s`
                        return (
                            <div key={i} className="award-perspective-line" style={{ '--line-index': i }}>
                                <div
                                    className={`award-marquee ${i % 2 === 1 ? 'award-marquee--reverse' : ''}`}
                                    style={{ '--marquee-duration': dur }}
                                >
                                    <div className="award-marquee-track">
                                        <span className="award-marquee-chunk">
                                            <span className="award-perspective-text" data-text={display}>{display}</span>
                                            <span className="award-marquee-sep" aria-hidden>◆</span>
                                        </span>
                                        <span className="award-marquee-chunk" aria-hidden>
                                            <span className="award-perspective-text" data-text={display}>{display}</span>
                                            <span className="award-marquee-sep" aria-hidden>◆</span>
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
            <div className="section-corner-text">
                <span className="corner-left">Aight bro...</span>
                <span className="corner-right">That's it</span>
            </div>
        </section>
    )
}
