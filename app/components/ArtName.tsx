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
        fontFamily: "'Playfair Display', 'Bodoni 72', 'Didot', serif",
        fontWeight: 600,
        fontStyle: 'italic',
        fontSize: `${fontSize}px`,
        lineHeight,
        margin: '0 0 6px',
        letterSpacing: '-1px',
      }}
    >
      {rest && <span style={{ color: 'var(--text-primary)' }}>{rest} </span>}
      <span style={{ color: words.length === 1 ? 'var(--text-primary)' : 'var(--accent-primary)' }}>
        {words.length === 1 ? name.slice(0, -2) : lastWord}
      </span>
      <span style={{ color: 'var(--accent-primary)' }}>
        {words.length === 1 ? name.slice(-2) : ''}.
      </span>
    </h1>
  )
}
