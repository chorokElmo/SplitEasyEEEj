/**
 * Play a short notification sound using Web Audio API (no external file).
 * Use for new chat messages and app notifications.
 * Browsers require user interaction before audio; we resume context on first play.
 */
let audioContext = null
let resumeOnInteractionDone = false

function getAudioContext() {
  if (typeof window === 'undefined') return null
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)()
    // Resume on first user interaction so notification sound can play (browser autoplay policy)
    if (!resumeOnInteractionDone) {
      resumeOnInteractionDone = true
      const resume = () => {
        if (audioContext?.state === 'suspended') audioContext.resume()
        document.removeEventListener('click', resume)
        document.removeEventListener('keydown', resume)
      }
      document.addEventListener('click', resume, { once: true })
      document.addEventListener('keydown', resume, { once: true })
    }
  }
  return audioContext
}

/**
 * Play a short, pleasant two-tone notification sound.
 * Resolves when done; safe to call repeatedly (each call plays once).
 * Resumes AudioContext if suspended (needed after browser autoplay policy).
 */
export function playNotificationSound() {
  const ctx = getAudioContext()
  if (!ctx) return Promise.resolve()

  const play = () => {
    return new Promise((resolve) => {
      try {
        const now = ctx.currentTime
        const freq1 = 523.25
        const freq2 = 659.25
        const duration = 0.1
        const gap = 0.07
        const gainLevel = 0.2

        const playTone = (freq, startTime) => {
          const osc = ctx.createOscillator()
          const gain = ctx.createGain()
          osc.connect(gain)
          gain.connect(ctx.destination)
          osc.frequency.value = freq
          osc.type = 'sine'
          gain.gain.setValueAtTime(gainLevel, startTime)
          gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration)
          osc.start(startTime)
          osc.stop(startTime + duration)
        }

        playTone(freq1, now)
        playTone(freq2, now + duration + gap)

        const totalTime = (duration + gap + duration) * 1000
        setTimeout(resolve, totalTime + 50)
      } catch {
        resolve()
      }
    })
  }

  // Browsers often start AudioContext in "suspended" state until user interaction
  if (ctx.state === 'suspended') {
    return ctx.resume().then(play)
  }
  return play()
}
