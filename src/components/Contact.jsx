// 06 — Contact. Socials and the footer follow as part of the same closing block.
// The email address below is the one already on the site; it has not been verified.
const EMAIL = 'hello@anujsingh.dev'

export default function Contact() {
    return (
        <section className="panel contact-panel" id="contact">
            <div className="contact-wrapper">
                <div className="section-header section-header--center">
                    <span className="section-number">06</span>
                    <span className="section-kicker">Contact</span>
                </div>
                <h2 className="contact-big-text">
                    <span className="contact-line cl-1">Let's</span>
                    <span className="contact-line cl-2 accent-text">talk</span>
                    <span className="contact-line cl-3">.</span>
                </h2>
                <p className="contact-sub">Got a project in mind? Let's make it happen.</p>
                <a href={`mailto:${EMAIL}`} className="contact-cta" data-cursor="Mail">
                    <span>{EMAIL}</span>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                        <path d="M7 17L17 7M17 7H7M17 7V17" />
                    </svg>
                </a>
            </div>
            <div className="section-corner-text" aria-hidden="true">
                <span className="corner-left">Let's go</span>
                <span className="corner-right">Hit me up</span>
            </div>
        </section>
    )
}
