import { useEffect, useRef, useState, useCallback } from 'react'

// Japanese pentatonic ambient music generator — Web Audio API
// Miyako-bushi / In scale: calm, meditative koto-like tones + drone + reverb

function createAmbientEngine(audioCtx) {
    const baseNotes = [293.66, 311.13, 392.00, 440.00, 466.16]
    const lowNotes = baseNotes.map(f => f / 2)
    const highNotes = baseNotes.map(f => f * 2)
    const allNotes = [...lowNotes, ...baseNotes, ...highNotes]

    const masterGain = audioCtx.createGain()
    masterGain.gain.value = 0
    masterGain.connect(audioCtx.destination)

    // Reverb impulse
    let reverbDest = masterGain
    try {
        const convolver = audioCtx.createConvolver()
        const rate = audioCtx.sampleRate
        const length = rate * 3
        const impulse = audioCtx.createBuffer(2, length, rate)
        for (let ch = 0; ch < 2; ch++) {
            const data = impulse.getChannelData(ch)
            for (let i = 0; i < length; i++) {
                data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 2.5)
            }
        }
        convolver.buffer = impulse
        const reverbGain = audioCtx.createGain()
        reverbGain.gain.value = 0.4
        convolver.connect(reverbGain)
        reverbGain.connect(masterGain)
        reverbDest = convolver
    } catch (e) { /* fallback */ }

    const dryGain = audioCtx.createGain()
    dryGain.gain.value = 0.7
    dryGain.connect(masterGain)

    // Warm drone pad
    const droneOsc1 = audioCtx.createOscillator()
    const droneOsc2 = audioCtx.createOscillator()
    const droneGain = audioCtx.createGain()
    droneOsc1.type = 'sine'
    droneOsc2.type = 'sine'
    droneOsc1.frequency.value = lowNotes[0]
    droneOsc2.frequency.value = lowNotes[0] * 1.5
    droneGain.gain.value = 0.08
    droneOsc1.connect(droneGain)
    droneOsc2.connect(droneGain)
    droneGain.connect(dryGain)
    droneGain.connect(reverbDest)
    droneOsc1.start()
    droneOsc2.start()

    let droneTimer = null
    function driftDrone() {
        const note = lowNotes[Math.floor(Math.random() * 2)]
        const now = audioCtx.currentTime
        droneOsc1.frequency.exponentialRampToValueAtTime(note, now + 8)
        droneOsc2.frequency.exponentialRampToValueAtTime(note * 1.5, now + 8)
    }

    // Koto-like pluck notes
    function playNote() {
        if (audioCtx.state !== 'running') return
        const freq = allNotes[Math.floor(Math.random() * allNotes.length)]
        const osc = audioCtx.createOscillator()
        const gain = audioCtx.createGain()
        const filter = audioCtx.createBiquadFilter()
        osc.type = Math.random() > 0.3 ? 'triangle' : 'sine'
        osc.frequency.value = freq
        filter.type = 'lowpass'
        filter.frequency.value = freq * 3
        filter.Q.value = 1
        const now = audioCtx.currentTime
        const vol = 0.06 + Math.random() * 0.06
        const dur = 2 + Math.random() * 4
        gain.gain.setValueAtTime(0, now)
        gain.gain.linearRampToValueAtTime(vol, now + 0.05)
        gain.gain.exponentialRampToValueAtTime(0.001, now + dur)
        osc.connect(filter)
        filter.connect(gain)
        gain.connect(dryGain)
        gain.connect(reverbDest)
        osc.start(now)
        osc.stop(now + dur + 0.1)
    }

    // Wind noise pad
    const noiseGain = audioCtx.createGain()
    const noiseFilter = audioCtx.createBiquadFilter()
    noiseFilter.type = 'bandpass'
    noiseFilter.frequency.value = 400
    noiseFilter.Q.value = 0.5
    noiseGain.gain.value = 0.015
    noiseFilter.connect(noiseGain)
    noiseGain.connect(dryGain)
    const noiseLen = audioCtx.sampleRate * 4
    const noiseBuf = audioCtx.createBuffer(1, noiseLen, audioCtx.sampleRate)
    const nd = noiseBuf.getChannelData(0)
    for (let i = 0; i < noiseLen; i++) nd[i] = (Math.random() * 2 - 1) * 0.5
    const noiseNode = audioCtx.createBufferSource()
    noiseNode.buffer = noiseBuf
    noiseNode.loop = true
    noiseNode.connect(noiseFilter)
    noiseNode.start()

    let noteTimer = null
    let isPlaying = false

    function start() {
        if (isPlaying) return
        isPlaying = true
        const now = audioCtx.currentTime
        masterGain.gain.cancelScheduledValues(now)
        masterGain.gain.setValueAtTime(masterGain.gain.value, now)
        masterGain.gain.linearRampToValueAtTime(0.8, now + 2)
        function scheduleNext() {
            if (!isPlaying) return
            playNote()
            noteTimer = setTimeout(scheduleNext, 800 + Math.random() * 3000)
        }
        scheduleNext()
        droneTimer = setInterval(driftDrone, 10000 + Math.random() * 10000)
    }

    function stop() {
        isPlaying = false
        const now = audioCtx.currentTime
        masterGain.gain.cancelScheduledValues(now)
        masterGain.gain.setValueAtTime(masterGain.gain.value, now)
        masterGain.gain.linearRampToValueAtTime(0, now + 1.5)
        if (noteTimer) { clearTimeout(noteTimer); noteTimer = null }
        if (droneTimer) { clearInterval(droneTimer); droneTimer = null }
    }

    function destroy() {
        stop()
        try { droneOsc1.stop() } catch (e) {}
        try { droneOsc2.stop() } catch (e) {}
        try { noiseNode.stop() } catch (e) {}
    }

    return { start, stop, destroy, isPlaying: () => isPlaying }
}

export default function MusicToggle({ loaded }) {
    const [playing, setPlaying] = useState(false)
    const engineRef = useRef(null)
    const ctxRef = useRef(null)

    const initEngine = useCallback(() => {
        if (engineRef.current) return engineRef.current
        try {
            const AC = window.AudioContext || window.webkitAudioContext
            if (!AC) return null
            ctxRef.current = new AC()
            engineRef.current = createAmbientEngine(ctxRef.current)
            return engineRef.current
        } catch (e) {
            console.error('Web Audio init error:', e)
            return null
        }
    }, [])

    const toggle = useCallback(() => {
        const engine = initEngine()
        if (!engine) return
        if (ctxRef.current.state === 'suspended') ctxRef.current.resume()
        if (playing) { engine.stop() } else { engine.start() }
        setPlaying(p => !p)
    }, [playing, initEngine])

    // Auto-play after preloader
    useEffect(() => {
        if (loaded && !playing) {
            const engine = initEngine()
            if (engine && ctxRef.current) {
                const tryPlay = () => {
                    if (ctxRef.current.state === 'suspended') {
                        ctxRef.current.resume().then(() => {
                            engine.start()
                            setPlaying(true)
                        }).catch(() => {
                            const unlock = () => {
                                ctxRef.current.resume().then(() => {
                                    engine.start()
                                    setPlaying(true)
                                })
                                document.removeEventListener('click', unlock)
                                document.removeEventListener('touchstart', unlock)
                            }
                            document.addEventListener('click', unlock, { once: true })
                            document.addEventListener('touchstart', unlock, { once: true })
                        })
                    } else {
                        engine.start()
                        setPlaying(true)
                    }
                }
                tryPlay()
            }
        }
    }, [loaded])

    useEffect(() => {
        if (loaded) {
            const el = document.getElementById('music-toggle')
            if (el) setTimeout(() => el.classList.add('visible'), 500)
        }
    }, [loaded])

    useEffect(() => {
        return () => {
            if (engineRef.current) engineRef.current.destroy()
            if (ctxRef.current) ctxRef.current.close().catch(() => {})
        }
    }, [])

    return (
        <button type="button" className="music-toggle" id="music-toggle"
            aria-label={playing ? 'Pause background music' : 'Play background music'}
            aria-pressed={playing}
            data-cursor={'\u266A'} onClick={toggle}>
            <div className={'music-bars' + (playing ? ' playing' : '')} aria-hidden="true">
                <span className="bar bar-1"></span>
                <span className="bar bar-2"></span>
                <span className="bar bar-3"></span>
                <span className="bar bar-4"></span>
            </div>
            <span className="music-label" aria-hidden="true">{playing ? 'Pause' : 'Play'}</span>
        </button>
    )
}
