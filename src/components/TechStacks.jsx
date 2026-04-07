const techs = [
    { icon: 'canvas', shape: 'cube', name: 'WebGL & Three.js', desc: 'mInD-bEnDiNg 3D eXpErieNces rIgHt iN yOuR bRoWsEr. sHaDeR pRoGrAmmiNg fOr tHaT eXtRa ✨' },
    { icon: 'gsap', name: 'GSAP', desc: 'bUtTeR sMoOtH aNimaTioNs tHaT mAke eVeRyThiNg fEeL aLiVe. sCroLl-dRivEn mAgIc ✨' },
    { icon: 'code', name: 'React & Next.js', desc: 'mOdErN fRaMeWoRks fOr bUiLdiNg sCaLaBLe, pErFoRmAnT wEb aPpS wItH sErVeR-siDe pOwEr 🚀' },
    { icon: 'style', name: 'SCSS & Tailwind', desc: 'pIxeL-pErFeCt sTyLiNg wItH uTiLiTy-fIrSt aPpRoAcH. rEsPoNsIvE dEsIgN tHaT jUsT wOrKs 🎨' },
]

const marqueeItems = ['JavaScript', 'TypeScript', 'React', 'Next.js', 'Node.js', 'Three.js', 'GSAP', 'Python', 'WebGL', 'MongoDB', 'PostgreSQL', 'Figma']

export default function TechStacks() {
    return (
        <section className="panel techstacks-panel" id="techstacks">
            <div className="section-wrapper">
                <div className="section-header">
                    <span className="section-number">03</span>
                    <h2 className="section-title">tEcH <span className="accent-text">sTaCks</span></h2>
                </div>

                <div className="tech-intro">
                    <p className="tech-intro-text">
                        wHy do I uSe <span className="accent-text">tHeSe tOoLs</span>?
                        bEcAuSe tHeY lEt mE bUiLd mInD-bEnDiNg eXpErieNces
                        tHaT pLaiN JS cAn't hAnDLe. hArdWaRe aCceLerAtiOn
                        + hIgH pErFoRmaNce = 🔥
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
