# Session 3 — Coach page: expiry badge + coach feedback system

Next.js 14 App Router + TypeScript + Supabase. 
Design: bg #f5f0e8, accent #7a4a20, text #2d1f0e.
Fonts: Epilogue (italic headings) + Chillax (weight 300).
Cards: `borderBottom: '1px solid rgba(45,31,14,0.08)', padding: '28px 0'` — NO glassmorphism.

---

## Task A — Payment expiry badge on client cards in coach/page.tsx

**File:** `app/coach/page.tsx`

In the CLIENTS section, each client card shows a payment badge. 
Currently it only shows "paid" or "unpaid". 

Update the badge logic to show THREE states based on `payment.period_end` and `payment.paid`:

1. **Expiring soon** (paid but `period_end` is within 7 days from today):
   - Color: `#b8860b` (amber)
   - Border: `1px solid rgba(184,134,11,0.4)`
   - Text: `⚡ Истекает {date}` (e.g. "⚡ Истекает 18 апр")

2. **Active** (paid, period_end > 7 days away or null):
   - Color: `#1a7a3c` (green)  
   - Border: `1px solid rgba(26,122,60,0.4)`
   - Text: `✓ До {date}` (if period_end exists) or `✓ Активна`

3. **Unpaid / expired**:
   - Color: `#8a2520` (red)
   - Border: `1px solid rgba(138,37,32,0.4)`
   - Text: `⚠ Не оплачено`

Badge style (same for all three, only color changes):
```tsx
{
  fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '10px',
  padding: '3px 10px', borderRadius: '999px',
  background: 'transparent',
  letterSpacing: '1px',
  // + color and border per state above
}
```

Helper function to add near the top of the file:
```tsx
function getPaymentStatus(payment: any): { label: string; color: string; border: string } {
  if (!payment || !payment.paid) {
    return { label: '⚠ Не оплачено', color: '#8a2520', border: '1px solid rgba(138,37,32,0.4)' }
  }
  if (payment.period_end) {
    const daysLeft = Math.ceil((new Date(payment.period_end).getTime() - Date.now()) / 86400000)
    const dateStr = new Date(payment.period_end).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
    if (daysLeft <= 0) {
      return { label: `⚠ Истёк ${dateStr}`, color: '#8a2520', border: '1px solid rgba(138,37,32,0.4)' }
    }
    if (daysLeft <= 7) {
      return { label: `⚡ Истекает ${dateStr}`, color: '#b8860b', border: '1px solid rgba(184,134,11,0.4)' }
    }
    return { label: `✓ До ${dateStr}`, color: '#1a7a3c', border: '1px solid rgba(26,122,60,0.4)' }
  }
  return { label: '✓ Активна', color: '#1a7a3c', border: '1px solid rgba(26,122,60,0.4)' }
}
```

---

## Task B — Coach feedback system

Coach needs to leave text feedback/notes for each client, visible to the client on their dashboard.

### B1. SQL (Anna runs this herself — skip in code)

```sql
create table if not exists coach_feedback (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid references profiles(id) on delete cascade,
  client_id uuid references profiles(id) on delete cascade,
  message text not null,
  created_at timestamptz default now()
);
alter table coach_feedback enable row level security;
create policy "Coach manages feedback" on coach_feedback
  for all using (auth.uid() = coach_id);
create policy "Client reads own feedback" on coach_feedback
  for select using (auth.uid() = client_id);
```

### B2. Coach side — add feedback input to each client card in coach/page.tsx

In the expanded client card (or directly on the card), add:
- A textarea for the coach to type feedback
- A "Сохранить" button that upserts to `coach_feedback`
- Show the last saved feedback below the textarea (greyed out, italic)

State needed (add to existing state):
```tsx
const [feedbackInputs, setFeedbackInputs] = useState<Record<string, string>>({})
const [savedFeedbacks, setSavedFeedbacks] = useState<Record<string, string>>({})
```

Fetch existing feedback for all clients in the main `useEffect`:
```tsx
const { data: feedbacks } = await supabase
  .from('coach_feedback')
  .select('client_id, message, created_at')
  .eq('coach_id', userId)
  .order('created_at', { ascending: false })

const fbMap: Record<string, string> = {}
;(feedbacks || []).forEach((f: any) => {
  if (!fbMap[f.client_id]) fbMap[f.client_id] = f.message
})
setSavedFeedbacks(fbMap)
```

Save function:
```tsx
async function saveFeedback(clientId: string) {
  const supabase = createClient()
  const msg = feedbackInputs[clientId]?.trim()
  if (!msg || !userId) return
  await supabase.from('coach_feedback').insert({
    coach_id: userId,
    client_id: clientId,
    message: msg,
  })
  setSavedFeedbacks(prev => ({ ...prev, [clientId]: msg }))
  setFeedbackInputs(prev => ({ ...prev, [clientId]: '' }))
}
```

UI to add inside each client card (after the payment badge row):
```tsx
<div style={{ marginTop: '12px' }}>
  {savedFeedbacks[client.id] && (
    <p style={{ fontFamily: 'Epilogue, sans-serif', fontStyle: 'italic', fontSize: '12px', color: 'rgba(45,31,14,0.4)', margin: '0 0 8px', borderLeft: '2px solid rgba(122,74,32,0.2)', paddingLeft: '10px' }}>
      {savedFeedbacks[client.id]}
    </p>
  )}
  <div style={{ display: 'flex', gap: '8px' }}>
    <input
      type="text"
      placeholder="Написать клиенту..."
      value={feedbackInputs[client.id] || ''}
      onChange={e => setFeedbackInputs(prev => ({ ...prev, [client.id]: e.target.value }))}
      onKeyDown={e => e.key === 'Enter' && saveFeedback(client.id)}
      style={{ flex: 1, background: 'rgba(0,0,0,0.05)', border: 'none', borderRadius: '999px', padding: '8px 14px', fontFamily: 'Chillax, sans-serif', fontSize: '13px', color: '#2d1f0e', outline: 'none' }}
    />
    <button
      onClick={() => saveFeedback(client.id)}
      style={{ padding: '8px 16px', borderRadius: '999px', background: '#7a4a20', border: 'none', color: '#fff', fontFamily: 'Chillax, sans-serif', fontSize: '12px', cursor: 'pointer' }}
    >
      →
    </button>
  </div>
</div>
```

### B3. Client side — show latest coach feedback in client/page.tsx

Add a new section to the client dashboard that shows the latest feedback from their coach.

Add state:
```tsx
const [coachFeedback, setCoachFeedback] = useState<{ message: string; created_at: string } | null>(null)
```

Add to the main Promise.all fetch:
```tsx
supabase.from('coach_feedback')
  .select('message, created_at')
  .eq('client_id', data.user.id)
  .order('created_at', { ascending: false })
  .limit(1)
  .single(),
```

Set state after Promise.all resolves:
```tsx
if (feedbackRes.data) setCoachFeedback(feedbackRes.data)
```

Add a section in the JSX, after the КБЖУ block and before MOOD TRACKER:
```tsx
{coachFeedback && (
  <div style={{ borderBottom: '1px solid rgba(45,31,14,0.08)', padding: '28px 0' }}>
    <p style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '10px', letterSpacing: '3px', textTransform: 'uppercase', color: 'rgba(45,31,14,0.3)', margin: '0 0 12px' }}>
      От тренера
    </p>
    <p style={{ fontFamily: 'Epilogue, sans-serif', fontWeight: 400, fontStyle: 'italic', fontSize: '18px', color: '#2d1f0e', margin: '0 0 8px', lineHeight: 1.4, letterSpacing: '-0.3px' }}>
      "{coachFeedback.message}"
    </p>
    <p style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '10px', color: 'rgba(45,31,14,0.25)', margin: 0, letterSpacing: '1px' }}>
      {new Date(coachFeedback.created_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}
    </p>
  </div>
)}
```

---

## After fixes

```bash
npx tsc --noEmit --skipLibCheck
git add app/coach/page.tsx app/client/page.tsx
git commit -m "feat: payment expiry badge + coach feedback system"
git push
```
