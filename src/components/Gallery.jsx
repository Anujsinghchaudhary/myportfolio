import { useState, useRef, useEffect } from 'react'

const categories = {
    'gOoFy pIcS': [
        { label: 'cOzY vIbEs oNlY', sub: '+100 cOmFy pOiNts', bg: 'linear-gradient(145deg, #1a1a2e, #16213e)', image: '/gallery-1.png' },
        { label: 'rOaD tRiP gAnG', sub: '+200 aDvEnTuRe pOiNts', bg: 'linear-gradient(145deg, #0f3460, #533483)', image: '/gallery-2.jpeg' },
        { label: 'dEv mOdE: oN', sub: '+999 hArDcOrE pOiNts', bg: 'linear-gradient(145deg, #e94560, #0f3460)', image: '/gallery-3.jpg' },
    ],
    'cOdInG vIbEs': [
        { label: 'cOdiNg aT 3 aM', sub: '+200 dEdIcAtIoN pOiNts', bg: 'linear-gradient(145deg, #16213e, #e94560)' },
        { label: 'tHe gOOfY dEv', sub: '+999 gOoFy pOiNts', bg: 'linear-gradient(145deg, #533483, #e94560)' },
        { label: 'bUg fIxInG aT 4 aM', sub: '+150 gRiNd pOiNts', bg: 'linear-gradient(145deg, #0f3460, #1a1a2e)' },
    ],
    'rAnDoM sTuFf': [
        { label: 'mY sEtUp iS fIrE', sub: '+300 gAmEr pOiNts', bg: 'linear-gradient(145deg, #e94560, #533483)' },
        { label: 'tOuChEd gRaSs', sub: '+1 tOuCh gRaSs pOiNts', bg: 'linear-gradient(145deg, #16213e, #533483)' },
        { label: 'nO sLeEp gAnG', sub: '+999 iNsOmNiA', bg: 'linear-gradient(145deg, #1a1a2e, #e94560)' },
    ],
}

export default function Gallery() {
    const [activeTab, setActiveTab] = useState(Object.keys(categories)[0])
    const trackRef = useRef(null)
    const containerRef = useRef(null)
    const isPausedRef = useRef(false)

    // Repeat cards 6 times to ensure seamless infinite looping
    const baseCards = categories[activeTab]
    const displayCards = [...baseCards, ...baseCards, ...baseCards, ...baseCards, ...baseCards, ...baseCards]

    useEffect(() => {
        let reqId;
        let position = 0;
        const speed = 1.0; 

        const track = trackRef.current;
        const container = containerRef.current;
        if (!track || !container) return;

        track.style.transform = `translateX(0px)`;

        const loop = () => {
            if (!isPausedRef.current) {
                position += speed;
            }
            
            const totalCards = track.children.length;
            const singleSetCount = totalCards / 6;
            
            const firstCard = track.children[0];
            if (firstCard) {
                const cardWidth = firstCard.offsetWidth + 32; // includes gap handling
                const setWidth = cardWidth * singleSetCount;
               
                if(position >= setWidth) {
                    position -= setWidth;
                }
            }

            track.style.transform = `translateX(${-position}px)`;

            const containerRect = container.getBoundingClientRect();
            const containerCenter = containerRect.left + containerRect.width / 2;

            Array.from(track.children).forEach(card => {
                const cardRect = card.getBoundingClientRect();
                const cardCenter = cardRect.left + cardRect.width / 2;
                const distance = Math.abs(containerCenter - cardCenter);
                const maxDist = containerRect.width / 1.2; 
                
                let scale = 0.85;
                let rotateY = 0;
                let rotateZ = 0;
                let zIndex = 0;
                let yOffset = 0;
                let filterBrightness = 0.5;
                
                if (distance < maxDist) {
                    const ratio = 1 - (distance / maxDist);
                    const easeRatio = ratio * ratio * (3 - 2 * ratio); 
                    
                    scale = 0.85 + (0.25 * easeRatio); 
                    zIndex = Math.round(easeRatio * 10);
                    filterBrightness = 0.5 + (0.5 * easeRatio);

                    const sign = cardCenter < containerCenter ? 1 : -1;
                    rotateY = sign * (1 - easeRatio) * 15; 
                    rotateZ = sign * (1 - easeRatio) * 2; 
                    yOffset = easeRatio * -15; 
                } else {
                    const sign = cardCenter < containerCenter ? 1 : -1;
                    rotateY = sign * 15;
                    rotateZ = sign * 2;
                }

                // Smooth additional scaled state for hover interactions without breaking calculation wrapper
                const hoverScale = card.matches(':hover') ? 1.05 : 1;
                
                card.style.transform = `perspective(1000px) translateY(${yOffset}px) scale(${scale * hoverScale}) rotateY(${rotateY}deg) rotateZ(${rotateZ}deg)`;
                card.style.zIndex = zIndex;
                card.style.filter = `brightness(${filterBrightness * 1.05})`;
            });

            reqId = requestAnimationFrame(loop);
        }
        loop();
        
        return () => cancelAnimationFrame(reqId);
    }, [activeTab]);

    return (
        <section className="panel gallery-panel" id="gallery">
            <div className="section-wrapper gallery-wrapper">
                <div className="gallery-tabs">
                    {Object.keys(categories).map(tab => (
                        <button key={tab}
                            className={`gallery-tab ${activeTab === tab ? 'active' : ''}`}
                            onClick={() => setActiveTab(tab)}>{tab}</button>
                    ))}
                </div>
                <div className="gallery-horizontal" id="gallery-scroll" ref={containerRef}>
                    <div className="gallery-track" id="gallery-track" ref={trackRef}
                         onMouseEnter={() => isPausedRef.current = true}
                         onMouseLeave={() => isPausedRef.current = false}>
                        {displayCards.map((c, i) => (
                            <div key={`${activeTab}-${i}`} className={`gallery-card ${c.image ? 'has-image' : ''}`} data-cursor="look">
                                {c.image && <img src={c.image} alt={c.label} className="gallery-card-img" loading="lazy" />}
                                <div className="gallery-card-glitch"></div>
                                <div className="gallery-card-label">
                                    <span>{c.label}</span>
                                    <small>{c.sub}</small>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
            <div className="section-corner-text">
                <span className="corner-left">kNoW mE</span>
                <span className="corner-right">mOrE?</span>
            </div>
        </section>
    )
}
