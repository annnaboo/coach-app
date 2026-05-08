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

  // #79 — for single-word names shorter than 3 chars, slice(0, -2) produces empty string
  // Guard: only split if there are enough characters to split meaningfully
  const isSingleWord = words.length === 1
  const canSplit = isSingleWord && name.length >= 3

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
      <span style={{ color: isSingleWord && !canSplit ? 'var(--text-primary)' : (!isSingleWord ? 'var(--accent-primary)' : 'var(--text-primary)') }}>
        {isSingleWord ? (canSplit ? name.slice(0, -2) : name) : lastWord}
      </span>
      {canSplit && (
        <span style={{ color: 'var(--accent-primary)' }}>
          {name.slice(-2)}
        </span>
      )}
      <span style={{ color: 'var(--accent-primary)' }}>.</span>
    </h1>
  )
}
