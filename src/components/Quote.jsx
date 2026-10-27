// Un-numbered interlude between Selected work (02) and Tech stack (03).
export default function Quote() {
    return (
        <section className="panel quote-panel" id="quote" aria-label="Quote">
            <figure className="quote-wrapper">
                <blockquote className="quote-text">
                    <span className="quote-line" data-glitch="The best way to">The best way to</span>
                    <span className="quote-line accent-text" data-glitch="predict the future">predict the future</span>
                    <span className="quote-line" data-glitch="is to create it.">is to create it.</span>
                </blockquote>
                <figcaption>
                    <cite className="quote-author">— Alan Kay</cite>
                </figcaption>
            </figure>
        </section>
    )
}
