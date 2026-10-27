/**
 * Critical-path assets: everything the first screen after the preloader needs.
 * Loading is non-blocking: requests run in parallel, JPEGs decode off the main
 * thread via HTMLImageElement.decode(), and the result is memoized so the
 * preloader and the hero share the same decoded images (no second fetch/decode).
 */

export const FRAME_COUNT = 21
export const framePath = (i) => `${import.meta.env.BASE_URL}frames/ezgif-frame-${String(i).padStart(3, '0')}.jpg`

// Fonts the preloader title and the hero intro render with.
const CRITICAL_FONTS = ['800 112px Syne', '600 16px "Space Grotesk"']
const FONT_TIMEOUT_MS = 3000
const TOTAL_TIMEOUT_MS = 10000 // never trap the visitor behind a stalled request

let framePromises = null

/** One promise per hero frame; resolves to the decoded image, or null if it failed. */
export function loadHeroFrames() {
    if (framePromises) return framePromises
    framePromises = Array.from({ length: FRAME_COUNT }, (_, i) => {
        const img = new Image()
        img.decoding = 'async'
        if (i === 0) img.fetchPriority = 'high'
        img.src = framePath(i + 1)
        return img.decode().then(
            () => img,
            () => (img.complete && img.naturalWidth > 0 ? img : null),
        )
    })
    return framePromises
}

const withTimeout = (p, ms) => Promise.race([p, new Promise((r) => setTimeout(r, ms))])

/**
 * Starts (or joins) every critical load and reports real progress in [0, 1].
 * Resolves once all of them have settled, failed, or timed out.
 */
export function preloadCriticalAssets(onProgress) {
    const fonts = document.fonts
        ? CRITICAL_FONTS.map((f) => withTimeout(document.fonts.load(f).catch(() => {}), FONT_TIMEOUT_MS))
        : []
    // Frames dominate the byte count, so each counts once; fonts count double.
    const tasks = [...loadHeroFrames().map((p) => [p, 1]), ...fonts.map((p) => [p, 2])]
    const total = tasks.reduce((sum, [, w]) => sum + w, 0)
    let done = 0
    const all = Promise.all(
        tasks.map(([p, w]) =>
            Promise.resolve(p).finally(() => {
                done += w
                onProgress?.(done / total)
            }),
        ),
    )
    return withTimeout(all, TOTAL_TIMEOUT_MS).then(() => onProgress?.(1))
}
