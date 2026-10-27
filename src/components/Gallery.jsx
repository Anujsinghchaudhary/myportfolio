import { useState, useRef, useEffect } from 'react'

const categories = {
    'Goofy pics': [
        { label: 'Cozy vibes only', sub: '+100 comfy points', bg: 'linear-gradient(145deg, #1a1a2e, #16213e)', image: '/gallery-1.png' },
        { label: 'Road trip gang', sub: '+200 adventure points', bg: 'linear-gradient(145deg, #0f3460, #533483)', image: '/gallery-2.jpeg' },
        { label: 'Dev mode: on', sub: '+999 hardcore points', bg: 'linear-gradient(145deg, #e94560, #0f3460)', image: '/gallery-3.jpg' },
    ],
    'Coding vibes': [
        { label: 'Coding at 3 a.m.', sub: '+200 dedication points', bg: 'linear-gradient(145deg, #16213e, #e94560)' },
        { label: 'The goofy dev', sub: '+999 goofy points', bg: 'linear-gradient(145deg, #533483, #e94560)' },
        { label: 'Bug fixing at 4 a.m.', sub: '+150 grind points', bg: 'linear-gradient(145deg, #0f3460, #1a1a2e)' },
    ],
    'Random stuff': [
        { label: 'My setup is fire', sub: '+300 gamer points', bg: 'linear-gradient(145deg, #e94560, #533483)' },
        { label: 'Touched grass', sub: '+1 touch-grass point', bg: 'linear-gradient(145deg, #16213e, #533483)' },
        { label: 'No sleep gang', sub: '+999 insomnia', bg: 'linear-gradient(145deg, #1a1a2e, #e94560)' },
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
                <div className="section-header">
                    <span className="section-number">05</span>
                    <h2 className="section-title">Beyond <span className="accent-text">code</span></h2>
                </div>
                <div className="gallery-tabs" role="group" aria-label="Filter photos">
                    {Object.keys(categories).map(tab => (
                        <button key={tab} type="button"
                            className={`gallery-tab ${activeTab === tab ? 'active' : ''}`}
                            aria-pressed={activeTab === tab}
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
            <div className="section-corner-text" aria-hidden="true">
                <span className="corner-left">Know me</span>
                <span className="corner-right">more?</span>
            </div>
        </section>
    )
}
