import { useState, useEffect, useCallback } from 'react'
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

  return (
    <div className="lightbox" onClick={onClose} role="dialog" aria-modal="true">

      <button className="lightbox-nav lightbox-prev" onClick={(e) => { e.stopPropagation(); onPrev() }} aria-label="Previous photo">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </button>

      <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
        <img src={images[index]} alt={`Photo ${index + 1}`} />
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
          </div>
          <div className="lightbox-counter">{index + 1} / {images.length}</div>
        </div>
      </div>

      <button className="lightbox-nav lightbox-next" onClick={(e) => { e.stopPropagation(); onNext() }} aria-label="Next photo">
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
        <p>{images.length} photos</p>
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
