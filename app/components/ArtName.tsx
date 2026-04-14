'use client'

interface ArtNameProps {
  name: string
  fontSize?: number
  lineHeight?: number
}

export default function ArtName({ name, fontSize = 62, lineHeight = 0.95 }: ArtNameProps) {
  if (!name) return null

  const words = name.trim().split(' ')
  const lastWord = words[words.length - 1]
  const rest = words.slice(0, -1).join(' ')

  return (
    <h1
      style={{
        fontFamily: 'Epilogue, sans-serif',
        fontWeight: 400,
        fontStyle: 'italic',
        fontSize: `${fontSize}px`,
        lineHeight,
        margin: '0 0 6px',
        letterSpacing: '-2px',
      }}
    >
      {rest && <span style={{ color: '#2d1f0e' }}>{rest} </span>}
      <span style={{ color: words.length === 1 ? '#2d1f0e' : '#7a4a20' }}>
        {words.length === 1 ? name.slice(0, -2) : lastWord}
      </span>
      <span style={{ color: '#7a4a20' }}>
        {words.length === 1 ? name.slice(-2) : ''}.
      </span>
    </h1>
  )
}
