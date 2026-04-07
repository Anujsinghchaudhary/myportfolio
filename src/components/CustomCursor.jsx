import { useEffect, useRef } from 'react'

export default function CustomCursor() {
    const cursorRef = useRef(null)
    const textRef = useRef(null)

    useEffect(() => {
        const cursor = cursorRef.current
        let mx = 0, my = 0, cx = 0, cy = 0

        const onMove = (e) => { mx = e.clientX; my = e.clientY }
        window.addEventListener('mousemove', onMove)

        function tick() {
            cx += (mx - cx) * 0.15
            cy += (my - cy) * 0.15
            if (cursor) cursor.style.transform = `translate(${cx - 40}px, ${cy - 40}px)`
            requestAnimationFrame(tick)
        }
        tick()

        // Hover effects for [data-cursor]
        const handleOver = (e) => {
            const t = e.target.closest('[data-cursor]')
            if (t && textRef.current && cursor) {
                textRef.current.textContent = t.dataset.cursor
                cursor.classList.add('has-text')
            }
        }
        const handleOut = () => {
            if (textRef.current) textRef.current.textContent = ''
            cursor?.classList.remove('has-text')
        }

        document.addEventListener('mouseover', handleOver)
        document.addEventListener('mouseout', handleOut)

        return () => {
            window.removeEventListener('mousemove', onMove)
            document.removeEventListener('mouseover', handleOver)
            document.removeEventListener('mouseout', handleOut)
        }
    }, [])

    return (
        <div className="custom-cursor" id="custom-cursor" ref={cursorRef}>
            <svg className="cursor-svg" viewBox="0 0 80 80" width="80" height="80">
                <circle cx="40" cy="40" r="38" fill="none" stroke="#f0c6d5" strokeWidth="1.5" opacity="0.5" />
            </svg>
            <span className="cursor-text" ref={textRef}></span>
        </div>
    )
}
