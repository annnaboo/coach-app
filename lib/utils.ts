// ─── Payment status ─────────────────────────────────────────────────────────

export function getPaymentStatus(payment: any): {
  label: string
  color: string
  border: string
} {
  if (!payment || !payment.paid) {
    return { label: '⚠ Не оплачено', color: '#8a2520', border: '1px solid rgba(138,37,32,0.4)' }
  }
  if (payment.period_end) {
    const daysLeft = Math.ceil(
      (new Date(payment.period_end).getTime() - Date.now()) / 86400000,
    )
    const dateStr = new Date(payment.period_end).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'short',
    })
    if (daysLeft <= 0)
      return { label: `⚠ Истёк ${dateStr}`, color: '#8a2520', border: '1px solid rgba(138,37,32,0.4)' }
    if (daysLeft <= 7)
      return { label: `⚡ Истекает ${dateStr}`, color: '#b8860b', border: '1px solid rgba(184,134,11,0.4)' }
    return { label: `✓ До ${dateStr}`, color: '#1a7a3c', border: '1px solid rgba(26,122,60,0.4)' }
  }
  return { label: '✓ Активна', color: '#1a7a3c', border: '1px solid rgba(26,122,60,0.4)' }
}

// ─── Date helpers ────────────────────────────────────────────────────────────

/**
 * Formats a local Date to YYYY-MM-DD using the device's local timezone.
 * Unlike toISOString() which always returns UTC, this preserves the local date.
 */
export function localDateStr(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
}

export function fmtPeriod(start: string, end: string): string {
  return `${fmtDate(start)} — ${fmtDate(end)}`
}

export function daysSince(iso: string | null): number | null {
  if (!iso) return null
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
}

/** Returns Monday and Sunday of the current ISO week as YYYY-MM-DD strings (local timezone). */
export function getMondaySunday(): { mondayStr: string; sundayStr: string } {
  const now = new Date()
  const day = now.getDay()
  const diff = day === 0 ? -6 : 1 - day
  const monday = new Date(now)
  monday.setDate(now.getDate() + diff)
  monday.setHours(0, 0, 0, 0)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  return { mondayStr: localDateStr(monday), sundayStr: localDateStr(sunday) }
}

/** Returns YYYY-MM-DD for 6 days ago in local timezone (so today is the 7th in a 7-day window). */
export function sevenDaysAgo(): string {
  const d = new Date()
  d.setDate(d.getDate() - 6)
  d.setHours(0, 0, 0, 0)
  return localDateStr(d)
}

/** Generates an array of 7 date strings (YYYY-MM-DD) starting from `fromDate`, in local timezone. */
export function buildWeek(fromDate: string): string[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(fromDate)
    d.setDate(d.getDate() + i)
    return localDateStr(d)
  })
}

// ─── Number / string helpers ─────────────────────────────────────────────────

/** "8 тренировок" / "1 тренировка" etc. */
export function pluralSessions(n: number): string {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod100 >= 11 && mod100 <= 19) return `${n} тренировок`
  if (mod10 === 1) return `${n} тренировка`
  if (mod10 >= 2 && mod10 <= 4) return `${n} тренировки`
  return `${n} тренировок`
}

/** Initials from a name — up to two capital letters. */
export function initials(name: string): string {
  const parts = name.trim().split(' ')
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return (parts[0]?.[0] ?? '?').toUpperCase()
}

/** "+2.5" / "-1.0" / "" */
export function delta(current: number | null | undefined, first: number | null | undefined): string {
  if (current == null || first == null) return ''
  const d = current - first
  if (d === 0) return '0'
  return (d > 0 ? '+' : '') + d.toFixed(1)
}

export function deltaColor(d: string): string {
  if (!d || d === '0') return 'rgba(45,31,14,0.3)'
  return d.startsWith('-') ? '#1a7a3c' : '#8a2520'
}
