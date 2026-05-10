'use client'
import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import AnimatedBackground from '@/app/components/AnimatedBackground'
import BrandLogo from '@/app/components/BrandLogo'
import BottomNav from '@/app/components/BottomNav'
import { LABEL } from '@/lib/design/tokens'

const card: React.CSSProperties = {
  borderBottom: '1px solid var(--divider)',
  padding: '28px 0',
}

type Photo = {
  id: string
  photo_url: string
  taken_at: string
  weight_kg: number | null
  notes: string | null
  signedUrl: string
}

function pluralPhotos(n: number) {
  if (n % 10 === 1 && n % 100 !== 11) return 'фото'
  if ([2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100)) return 'фото'
  return 'фото'
}

export default function ProgressPage() {
  const [photos, setPhotos] = useState<Photo[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [selected, setSelected] = useState<string[]>([])
  const [userId, setUserId] = useState<string | null>(null)
  const [showUploadForm, setShowUploadForm] = useState(false)
  const [weightInput, setWeightInput] = useState('')
  const [notesInput, setNotesInput] = useState('')
  const [dateInput, setDateInput] = useState(new Date().toISOString().slice(0, 10))
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { router.push('/'); return }
      setUserId(data.user.id)
      await loadPhotos(data.user.id)
      setLoading(false)
    })
  }, [])

  async function loadPhotos(uid: string) {
    const supabase = createClient()
    const { data } = await supabase
      .from('progress_photos')
      .select('id, photo_url, taken_at, weight_kg, notes')
      .eq('user_id', uid)
      .order('taken_at', { ascending: false })

    if (!data || data.length === 0) { setPhotos([]); return }

    const paths = data.map(p => p.photo_url)
    const { data: signedData } = await supabase.storage
      .from('progress-photos')
      .createSignedUrls(paths, 3600)

    const photosWithUrls: Photo[] = data.map((p, i) => ({
      ...p,
      signedUrl: signedData?.[i]?.signedUrl || '',
    }))
    setPhotos(photosWithUrls)
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setPendingFile(file)
    // #59 — revoke the previous object URL before creating a new one to prevent memory leaks
    setPreviewUrl(prev => {
      if (prev) URL.revokeObjectURL(prev)
      return URL.createObjectURL(file)
    })
    setShowUploadForm(true)
  }

  async function handleUpload() {
    if (!pendingFile || !userId) return
    setUploading(true)

    const supabase = createClient()
    const ext = pendingFile.name.split('.').pop() || 'jpg'
    const path = `${userId}/${Date.now()}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('progress-photos')
      .upload(path, pendingFile, { contentType: pendingFile.type })

    if (!uploadError) {
      await supabase.from('progress_photos').insert({
        user_id: userId,
        photo_url: path,
        taken_at: dateInput,
        weight_kg: weightInput ? parseFloat(weightInput) : null,
        notes: notesInput || null,
      })
      await loadPhotos(userId)
    }

    setUploading(false)
    setShowUploadForm(false)
    setPendingFile(null)
    // #59 — revoke the object URL before clearing it
    setPreviewUrl(prev => { if (prev) URL.revokeObjectURL(prev); return null })
    setWeightInput('')
    setNotesInput('')
    setDateInput(new Date().toISOString().slice(0, 10))
    if (fileRef.current) fileRef.current.value = ''
  }

  function toggleSelect(id: string) {
    setSelected(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id)
      if (prev.length >= 2) return [prev[1], id]
      return [...prev, id]
    })
  }

  const comparePhotos = selected.length === 2
    ? [photos.find(p => p.id === selected[0]), photos.find(p => p.id === selected[1])].filter(Boolean) as Photo[]
    : []

  const formatDate = (dateStr: string) =>
    new Date(dateStr + 'T00:00:00').toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' })

  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: 'var(--bg-card-soft)',
    border: '1px solid var(--divider)',
    borderRadius: '999px',
    padding: '9px 14px',
    fontFamily: 'var(--font-text)',
    fontSize: '13px',
    color: 'var(--text-primary)',
    outline: 'none',
    boxSizing: 'border-box',
  }

  if (loading) return (
    <div style={{ position: 'relative', minHeight: '100vh' }}>
      <AnimatedBackground />
      <div style={{ position: 'relative', zIndex: 1, padding: '52px 28px 120px' }}>
        <div style={{ maxWidth: '460px', margin: '0 auto' }}>
          <div style={{ borderBottom: '1px solid var(--divider)', padding: '28px 0' }}>
            <div className="skeleton" style={{ height: '52px', width: '45%' }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', paddingTop: '28px' }}>
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="skeleton" style={{ aspectRatio: '3/4' }} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div style={{ position: 'relative', minHeight: '100vh' }}>
      <AnimatedBackground />
      <div style={{ position: 'relative', zIndex: 1, padding: '52px 28px 120px' }}>
        <div style={{ maxWidth: '460px', margin: '0 auto' }}>

          <BrandLogo />

          {/* HEADER */}
          <div className="card-enter" style={{ ...card }}>
            <button
              onClick={() => router.push('/client')}
              className="pressable"
              style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', fontFamily: 'var(--font-text)', fontWeight: 300, fontSize: '13px', padding: '12px 16px 20px 0', cursor: 'pointer', letterSpacing: '1px', display: 'flex', alignItems: 'center', minHeight: '44px' }}
            >
              ← Назад
            </button>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
              <div>
                <h1 style={{ fontFamily: 'var(--font-primary)', fontWeight: 400, fontStyle: 'italic', fontSize: '52px', color: 'var(--text-primary)', margin: '0 0 4px', letterSpacing: '-2px', lineHeight: 0.95 }}>
                  Прогресс
                </h1>
                <p style={{ fontFamily: 'var(--font-text)', fontWeight: 300, fontSize: '11px', color: 'var(--text-secondary)', margin: 0, letterSpacing: '2.5px', textTransform: 'uppercase' }}>
                  {photos.length} {pluralPhotos(photos.length)}
                </p>
              </div>
              <div>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                />
                <button
                  onClick={() => fileRef.current?.click()}
                  className="pressable"
                  style={{ padding: '10px 22px', borderRadius: '999px', background: 'var(--accent-primary)', border: 'none', color: '#fff', fontFamily: 'var(--font-text)', fontWeight: 300, fontSize: '13px', cursor: 'pointer', letterSpacing: '0.5px' }}
                >
                  + Фото
                </button>
              </div>
            </div>
          </div>

          {/* UPLOAD FORM */}
          {showUploadForm && (
            <div className="animate-fade-in" style={{ ...card }}>
              <p style={{ ...LABEL }}>Новое фото</p>
              {previewUrl && (
                <div style={{ marginBottom: '16px' }}>
                  <img
                    src={previewUrl}
                    alt="preview"
                    style={{ width: '100%', maxHeight: '320px', objectFit: 'cover', borderRadius: '8px' }}
                  />
                </div>
              )}
              <div style={{ display: 'flex', gap: '10px', marginBottom: '12px' }}>
                <div style={{ flex: 1 }}>
                  <p style={{ fontFamily: 'var(--font-text)', fontWeight: 600, fontSize: '11px', color: 'var(--text-secondary)', margin: '0 0 6px', letterSpacing: '0.4px', textTransform: 'uppercase' }}>Дата</p>
                  <input
                    type="date"
                    value={dateInput}
                    onChange={e => setDateInput(e.target.value)}
                    style={inputStyle}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontFamily: 'var(--font-text)', fontWeight: 600, fontSize: '11px', color: 'var(--text-secondary)', margin: '0 0 6px', letterSpacing: '0.4px', textTransform: 'uppercase' }}>Вес (кг)</p>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="65.2"
                    value={weightInput}
                    onChange={e => setWeightInput(e.target.value)}
                    style={inputStyle}
                  />
                </div>
              </div>
              <input
                type="text"
                placeholder="Заметка (необязательно)"
                value={notesInput}
                onChange={e => setNotesInput(e.target.value)}
                style={{ ...inputStyle, marginBottom: '14px' }}
              />
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={handleUpload}
                  disabled={uploading}
                  className="pressable"
                  style={{ flex: 1, padding: '11px', borderRadius: '999px', background: uploading ? 'var(--accent-soft-bg)' : 'var(--accent-primary)', border: 'none', color: uploading ? 'var(--accent-primary)' : '#fff', fontFamily: 'var(--font-text)', fontWeight: 300, fontSize: '13px', cursor: uploading ? 'default' : 'pointer' }}
                >
                  {uploading ? 'Загружаю...' : 'Сохранить'}
                </button>
                <button
                  onClick={() => { setShowUploadForm(false); setPendingFile(null); setPreviewUrl(null) }}
                  className="pressable"
                  style={{ padding: '11px 20px', borderRadius: '999px', background: 'var(--bg-card-soft)', border: '1px solid var(--divider)', color: 'var(--text-secondary)', fontFamily: 'var(--font-text)', fontSize: '13px', cursor: 'pointer' }}
                >
                  Отмена
                </button>
              </div>
            </div>
          )}

          {/* COMPARE MODE */}
          {selected.length > 0 && !showUploadForm && (
            <div style={{ borderBottom: '1px solid var(--divider)', padding: '16px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <p style={{ fontFamily: 'var(--font-text)', fontWeight: 300, fontSize: '12px', color: selected.length === 2 ? 'var(--accent-primary)' : 'var(--text-tertiary)', margin: 0, letterSpacing: '1px' }}>
                {selected.length === 1 ? 'Выбери ещё одно фото для сравнения' : '2 фото выбрано'}
              </p>
              <button
                onClick={() => setSelected([])}
                className="pressable"
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontFamily: 'var(--font-text)', fontSize: '11px', cursor: 'pointer', padding: 0 }}
              >
                Отмена
              </button>
            </div>
          )}

          {/* SIDE-BY-SIDE COMPARE */}
          {comparePhotos.length === 2 && (
            <div style={{ ...card }}>
              <p style={{ ...LABEL }}>Сравнение</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                {comparePhotos.map(photo => (
                  <div key={photo.id}>
                    <img
                      src={photo.signedUrl}
                      alt={photo.taken_at}
                      style={{ width: '100%', aspectRatio: '3/4', objectFit: 'cover', borderRadius: '6px', display: 'block' }}
                    />
                    <p style={{ fontFamily: 'var(--font-primary)', fontWeight: 400, fontSize: '13px', color: 'var(--text-primary)', margin: '8px 0 2px', letterSpacing: '-0.2px' }}>
                      {formatDate(photo.taken_at)}
                    </p>
                    {photo.weight_kg && (
                      <p style={{ fontFamily: 'var(--font-text)', fontWeight: 300, fontSize: '11px', color: 'var(--accent-primary)', margin: 0 }}>
                        {photo.weight_kg} кг
                      </p>
                    )}
                  </div>
                ))}
              </div>
              {comparePhotos[0]?.weight_kg && comparePhotos[1]?.weight_kg && (
                <div style={{ marginTop: '16px', padding: '12px 16px', background: 'var(--accent-soft-bg)', borderRadius: '8px' }}>
                  <p style={{ fontFamily: 'var(--font-text)', fontWeight: 300, fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>
                    Разница в весе:{' '}
                    <span style={{ fontFamily: 'var(--font-primary)', fontWeight: 400, color: 'var(--accent-primary)' }}>
                      {Math.abs(comparePhotos[0].weight_kg! - comparePhotos[1].weight_kg!).toFixed(1)} кг
                    </span>
                  </p>
                </div>
              )}
            </div>
          )}

          {/* PHOTO GRID */}
          {photos.length === 0 && !showUploadForm ? (
            <div style={{ ...card, textAlign: 'center', padding: '48px 0' }}>
              <p style={{ fontFamily: 'var(--font-primary)', fontWeight: 400, fontStyle: 'italic', fontSize: '22px', color: 'var(--text-tertiary)', margin: '0 0 10px' }}>
                Фото пока нет
              </p>
              <p style={{ fontFamily: 'var(--font-text)', fontWeight: 300, fontSize: '12px', color: 'var(--text-tertiary)', margin: '0 0 20px' }}>
                Добавь первое фото — и отслеживай визуальный прогресс
              </p>
              <button
                onClick={() => fileRef.current?.click()}
                className="pressable"
                style={{ padding: '10px 24px', borderRadius: '999px', background: 'var(--accent-soft-bg)', border: '1px solid rgba(139,30,63,0.2)', color: 'var(--accent-primary)', fontFamily: 'var(--font-text)', fontWeight: 300, fontSize: '12px', cursor: 'pointer' }}
              >
                Загрузить фото
              </button>
            </div>
          ) : photos.length > 0 && (
            <div style={{ paddingTop: '28px' }}>
              <p style={{ ...LABEL }}>
                {selected.length === 0 ? 'Нажми на два фото чтобы сравнить' : `Выбрано ${selected.length} из 2`}
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                {photos.map(photo => {
                  const isSelected = selected.includes(photo.id)
                  return (
                    <div
                      key={photo.id}
                      className="photo-enter pressable"
                      onClick={() => toggleSelect(photo.id)}
                      style={{ cursor: 'pointer', position: 'relative' }}
                    >
                      {isSelected && (
                        <div style={{
                          position: 'absolute', top: '8px', right: '8px', zIndex: 2,
                          width: '22px', height: '22px', borderRadius: '50%',
                          background: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          <span style={{ color: '#fff', fontSize: '11px', lineHeight: 1 }}>✓</span>
                        </div>
                      )}
                      <img
                        src={photo.signedUrl}
                        alt={`Фото прогресса от ${formatDate(photo.taken_at)}`}
                        style={{
                          width: '100%',
                          aspectRatio: '3/4',
                          objectFit: 'cover',
                          borderRadius: '12px',
                          display: 'block',
                          outline: isSelected ? '2px solid var(--accent-primary)' : '2px solid transparent',
                          outlineOffset: '2px',
                          transition: 'outline var(--duration-instant) var(--easing-standard)',
                          opacity: selected.length === 2 && !isSelected ? 0.5 : 1,
                        }}
                      />
                      <p style={{ fontFamily: 'var(--font-primary)', fontWeight: 400, fontSize: '13px', color: 'var(--text-primary)', margin: '8px 0 1px', letterSpacing: '-0.2px' }}>
                        {formatDate(photo.taken_at)}
                      </p>
                      {photo.weight_kg && (
                        <p style={{ fontFamily: 'var(--font-text)', fontWeight: 300, fontSize: '11px', color: 'var(--accent-primary)', margin: 0 }}>
                          {photo.weight_kg} кг
                        </p>
                      )}
                      {photo.notes && (
                        <p style={{ fontFamily: 'var(--font-text)', fontWeight: 300, fontSize: '10px', color: 'var(--text-tertiary)', margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {photo.notes}
                        </p>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

        </div>
      </div>
      <BottomNav />
    </div>
  )
}
