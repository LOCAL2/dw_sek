import { useState, useEffect, useCallback, useRef } from 'react'
import './App.css'
import ChatPanel from './ChatPanel'
import { useImageSummary } from './useImageSummary'

const imageModules = import.meta.glob('/public/image/*.{jpg,jpeg,png,webp,gif}', { eager: true, query: '?url', import: 'default' })
const images = Object.keys(imageModules)
  .sort()
  .map((path) => path.replace('/public', ''))

function Lightbox({ images, index, onClose, onPrev, onNext }: {
  images: string[]
  index: number
  onClose: () => void
  onPrev: () => void
  onNext: () => void
}) {
  const filename = images[index].split('/').pop() ?? null
  const { summary, loading } = useImageSummary(filename)

  const touchStartX = useRef(0)
  const touchStartY = useRef(0)
  const [dragX, setDragX] = useState(0)
  const [dragging, setDragging] = useState(false)
  const [slideDir, setSlideDir] = useState<'left' | 'right' | null>(null)

  // reset slide animation after index changes
  useEffect(() => {
    const t = setTimeout(() => setSlideDir(null), 300)
    return () => clearTimeout(t)
  }, [index])

  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
    setDragging(true)
    setDragX(0)
  }

  function handleTouchMove(e: React.TouchEvent) {
    if (!dragging) return
    const dx = e.touches[0].clientX - touchStartX.current
    const dy = Math.abs(e.touches[0].clientY - touchStartY.current)
    if (dy > 40) { setDragging(false); setDragX(0); return }
    // resistance: feels heavier the further you drag
    const resistance = 1 - Math.min(Math.abs(dx) / 600, 0.4)
    setDragX(dx * resistance)
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (!dragging) return
    setDragging(false)
    const dx = e.changedTouches[0].clientX - touchStartX.current
    const dy = Math.abs(e.changedTouches[0].clientY - touchStartY.current)
    if (Math.abs(dx) > 60 && dy < 80) {
      if (dx < 0) { setSlideDir('left'); onNext() }
      else { setSlideDir('right'); onPrev() }
    }
    // smooth snap back
    setDragX(0)
  }

  return (
    <div className="lightbox" onClick={onClose} role="dialog" aria-modal="true"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >

      <button className="lightbox-close" onClick={(e) => { e.stopPropagation(); onClose() }} aria-label="Close">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>

      <button className="lightbox-nav lightbox-prev" onClick={(e) => { e.stopPropagation(); setSlideDir('right'); onPrev() }} aria-label="Previous photo">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </button>

      <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
        <img
          src={images[index]}
          alt={`Photo ${index + 1}`}
          className={slideDir ? `slide-${slideDir}` : ''}
          onClick={(e) => e.stopPropagation()}
          style={{
            transform: dragX !== 0 ? `translateX(${dragX}px)` : undefined,
            transition: dragX !== 0 ? 'none' : 'transform 0.35s cubic-bezier(0.22, 1, 0.36, 1)',
          }}
        />
        <div className="lightbox-sidebar">
          <div className="lightbox-summary">
            <div className="lightbox-summary-label">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              AI สรุป
            </div>
            {loading ? (
              <span className="lightbox-summary-loading"><span /><span /><span /></span>
            ) : (
              <span className="lightbox-summary-text">{summary}</span>
            )}
            <div className="lightbox-summary-disclaimer">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
              การสรุปอาจไม่ครบถ้วน ข้อมูลอาจผิดหรือเพี้ยน ควรอ่านแชทจริงควบคู่ด้วย
            </div>
          </div>
          <div className="lightbox-counter">{index + 1} / {images.length}</div>
        </div>
      </div>

      <button className="lightbox-nav lightbox-next" onClick={(e) => { e.stopPropagation(); setSlideDir('left'); onNext() }} aria-label="Next photo">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </button>
    </div>
  )
}

function App() {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  const openLightbox = (index: number) => setLightboxIndex(index)
  const closeLightbox = () => setLightboxIndex(null)

  const prev = useCallback(() => {
    setLightboxIndex((i) => (i !== null ? (i - 1 + images.length) % images.length : null))
  }, [])

  const next = useCallback(() => {
    setLightboxIndex((i) => (i !== null ? (i + 1) % images.length : null))
  }, [])

  useEffect(() => {
    if (lightboxIndex === null) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeLightbox()
      if (e.key === 'ArrowLeft') prev()
      if (e.key === 'ArrowRight') next()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [lightboxIndex, prev, next])

  return (
    <div className="gallery-root">
      <header className="gallery-header">
        <h1>Dw Sek</h1>
        <p>{images.length} หลักฐาน</p>
      </header>

      <main className="gallery-grid">
        {images.map((src, i) => (
          <button
            key={src}
            className="gallery-item"
            onClick={() => openLightbox(i)}
            aria-label={`View photo ${i + 1}`}
          >
            <img src={src} alt={`Photo ${i + 1}`} loading="lazy" />
            <div className="gallery-overlay">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
                <line x1="11" y1="8" x2="11" y2="14" />
                <line x1="8" y1="11" x2="14" y2="11" />
              </svg>
            </div>
          </button>
        ))}
      </main>

      {lightboxIndex !== null && (
        <Lightbox
          images={images}
          index={lightboxIndex}
          onClose={closeLightbox}
          onPrev={prev}
          onNext={next}
        />
      )}

      <ChatPanel />
    </div>
  )
}

export default App
