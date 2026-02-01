import { useState } from 'react'
import { motion } from 'framer-motion'

/**
 * Professional case study image block with loading state and optional placeholder.
 * Use src for real images, or leave empty for styled placeholder with caption.
 */
export default function CaseStudyImage({
  src,
  alt,
  caption,
  aspectRatio = '16/10',
  className = '',
  placeholderText,
  fadeIn = true,
  priority = false,
}) {
  const [loaded, setLoaded] = useState(!src)
  const motionProps = fadeIn
    ? {
        initial: { opacity: 0, y: 20 },
        whileInView: { opacity: 1, y: 0 },
        viewport: { once: true, margin: '-40px' },
        transition: { duration: 0.4 },
      }
    : {}

  return (
    <motion.figure
      className={`overflow-hidden rounded-2xl border border-border/60 bg-muted/20 shadow-xl shadow-black/5 dark:shadow-black/20 ring-1 ring-black/5 dark:ring-white/5 ${className}`}
      {...motionProps}
    >
      <div className="relative" style={{ aspectRatio }}>
        {src ? (
          <>
            {!loaded && (
              <div
                className="absolute inset-0 animate-pulse bg-muted/50"
                style={{ aspectRatio }}
                aria-hidden="true"
              />
            )}
            <img
              src={src}
              alt={alt || caption || 'Case study image'}
              className={`w-full h-full object-cover transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
              style={{ aspectRatio }}
              loading={priority ? 'eager' : 'lazy'}
              decoding="async"
              onLoad={() => setLoaded(true)}
            />
          </>
        ) : (
          <div
            className="flex items-center justify-center bg-gradient-to-br from-muted to-muted/50 text-muted-foreground"
            style={{ aspectRatio }}
          >
            <span className="text-sm font-medium px-4 text-center">
              {placeholderText || 'Image placeholder'}
            </span>
          </div>
        )}
      </div>
      {caption && (
        <figcaption className="py-3 px-4 text-sm text-muted-foreground text-center bg-muted/20 border-t border-border/50">
          {caption}
        </figcaption>
      )}
    </motion.figure>
  )
}
