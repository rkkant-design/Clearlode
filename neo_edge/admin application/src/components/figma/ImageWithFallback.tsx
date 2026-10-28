import React, { useState } from 'react'

const ERROR_IMG_SRC =
  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODgiIGhlaWdodD0iODgiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgc3Ryb2tlPSIjMDAwIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBvcGFjaXR5PSIuMyIgZmlsbD0ibm9uZSIgc3Ryb2tlLXdpZHRoPSIzLjciPjxyZWN0IHg9IjE2IiB5PSIxNiIgd2lkdGg9IjU2IiBoZWlnaHQ9IjU2IiByeD0iNiIvPjxwYXRoIGQ9Im0xNiA1OCAxNi0xOCAzMiAzMiIvPjxjaXJjbGUgY3g9IjUzIiBjeT0iMzUiIHI9IjciLz48L3N2Zz4KCg=='

type ImageWithFallbackProps = React.ImgHTMLAttributes<HTMLImageElement> & {
  /** Fallback URL to try when primary src fails (e.g. YouTube thumbnail by video ID) */
  fallbackSrc?: string
}

export function ImageWithFallback(props: ImageWithFallbackProps) {
  const [didError, setDidError] = useState(false)
  const [triedFallback, setTriedFallback] = useState(false)

  const handleError = () => {
    if (props.fallbackSrc && !triedFallback) {
      setTriedFallback(true)
    } else {
      setDidError(true)
    }
  }

  const { src, alt, style, className, fallbackSrc, ...rest } = props

  const effectiveSrc = didError ? undefined : (triedFallback ? fallbackSrc : src) ?? src

  return didError ? (
    <div
      className={`flex items-center justify-center bg-zinc-800 text-zinc-500 text-center text-xs ${className ?? ''}`}
      style={style}
    >
      <span>No thumbnail</span>
    </div>
  ) : (
    <img
      src={effectiveSrc}
      alt={alt}
      className={className}
      style={style}
      {...rest}
      onError={handleError}
    />
  )
}
