export default function Contact() {
    return (
        <section className="panel contact-panel" id="contact">
            <div className="contact-wrapper">
                <div className="contact-big-text">
                    <span className="contact-line cl-1">LeT's</span>
                    <span className="contact-line cl-2 accent-text">tAlK</span>
                    <span className="contact-line cl-3">.</span>
                </div>
                <p className="contact-sub">gOt a pRoJeCt iN mInD? LeT's mAkE iT hApPeN</p>
                <a href="mailto:hello@anujsingh.dev" className="contact-cta" data-cursor="mail">
                    <span>hello@anujsingh.dev</span>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M7 17L17 7M17 7H7M17 7V17" />
                    </svg>
                </a>
            </div>
            <div className="section-corner-text">
                <span className="corner-left">LeT's gO</span>
                <span className="corner-right">hIt mE uP</span>
            </div>
        </section>
    )
}
