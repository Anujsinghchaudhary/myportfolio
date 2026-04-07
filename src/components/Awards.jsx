const awards = [
    'bEsT dEsIgN aWaRd',
    'cReAtIvE cOdEr oF tHe yEaR',
    'UI/UX iNnOvAtIoN aWaRd',
    'fRoNtEnD nInJa cErTiFiEd',
    'oPeN sOuRcE cOnTrIbUtOr',
    'hAcKaThOn wInNeR 2025',
    'dEsIgN eXcELLeNcE aWaRd',
    'tOp wEb dEveLoPeR',
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
                <span className="corner-left">aIgHt bRo...</span>
                <span className="corner-right">tHaTs iT</span>
            </div>
        </section>
    )
}
