const works = [
    {
        name: 'WallCraft',
        type: 'TypeScript app',
        gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        image: 'https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?w=800&q=80&auto=format',
        url: 'https://github.com/Anujsinghchaudhary/wallcraft',
        tech: 'TypeScript · Razorpay · Vercel',
        live: 'wallcraft-delta.vercel.app',
    },
    {
        name: 'AI ATS System',
        type: 'AI-powered tool',
        gradient: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
        image: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800&q=80&auto=format',
        url: 'https://github.com/Anujsinghchaudhary/ai-ats-system',
        tech: 'React · Vite · Puter.js · Tailwind',
        live: null,
    },
    {
        name: 'Churn Predictor',
        type: 'Full-stack ML',
        gradient: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
        image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&q=80&auto=format',
        url: 'https://github.com/Anujsinghchaudhary/churn-prediction-dashboard',
        tech: 'JavaScript · Python · ML Engine',
        live: null,
    },
    {
        name: 'Stock Predictor',
        type: 'ML + Streamlit',
        gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
        image: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800&q=80&auto=format',
        url: 'https://github.com/Anujsinghchaudhary/Stock-prediction-model',
        tech: 'Python · Keras · Streamlit · yfinance',
        live: 'stock-prediction-model-nine.vercel.app',
    },
    {
        name: 'Portfolio React',
        type: 'Animated site',
        gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
        image: 'https://images.unsplash.com/photo-1547658719-da2b51169166?w=800&q=80&auto=format',
        url: 'https://github.com/Anujsinghchaudhary/portfolio-react',
        tech: 'React · Framer Motion · Tailwind · Vite',
        live: 'anujsingh-portfolio.vercel.app',
    },
    {
        name: 'Code → Flowchart',
        type: 'Dev tool',
        gradient: 'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)',
        image: 'https://images.unsplash.com/photo-1555949963-aa79dcee981c?w=800&q=80&auto=format',
        url: 'https://github.com/Anujsinghchaudhary/code-to-flowchart-',
        tech: 'Code Visualization Tool',
        live: null,
    },
]

export default function Works() {
    return (
        <section className="panel works-panel" id="works">
            <div className="works-head">
                <div className="section-header">
                    <span className="section-number">02</span>
                    <h2 className="section-title">
                        Selected <span className="accent-text">work</span>
                    </h2>
                </div>
            </div>
            <div className="works-horizontal" id="works-scroll">
                <div className="works-track" id="works-track">
                    {works.map((w, i) => (
                        <a key={i} href={w.url} target="_blank" rel="noopener noreferrer" className="work-card" data-cursor="View">
                            <div className="work-card-bg" style={{ backgroundImage: `${w.gradient}, url(${w.image})`, backgroundSize: 'cover', backgroundPosition: 'center' }}></div>
                            <div className="work-card-overlay"></div>
                            <div className="work-card-content">
                                <span className="work-card-type">{w.type}</span>
                                <h3 className="work-card-name" data-text={w.name}>{w.name}</h3>
                                <span className="work-card-tech">{w.tech}</span>
                                {w.live && <span className="work-card-live">🔗 {w.live}</span>}
                            </div>
                        </a>
                    ))}
                </div>
            </div>
            <div className="section-corner-text">
                <span className="corner-left">I built it</span>
                <span className="corner-right">No cap</span>
            </div>
        </section>
    )
}
