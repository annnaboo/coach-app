# Задача для Claude Code — Дизайн-обновление client/page.tsx

## Репозиторий
Найди папку `coach-app` на компьютере (~/Documents, ~/Projects, ~/Desktop и т.д.)
Репо: github.com/annnaboo/coach-app

---

## Что делаем

Обновляем дизайн **`app/client/page.tsx`** — три изменения:
1. Добавляем логотип **AnnaBoo** вверху страницы
2. Переверстываем блок питания (КБЖУ) под стиль «Рацион дня»
3. Переверстываем карточку веса под стиль «Вес & Витальность»

---

## ИЗМЕНЕНИЕ 1: Логотип AnnaBoo

Найди в `app/client/page.tsx` строку:

```tsx
      <div style={{ position: 'relative', zIndex: 1, padding: '52px 28px 80px' }}>
        <div style={{ maxWidth: '460px', margin: '0 auto' }}>

          {/* HEADER */}
```

Замени на:

```tsx
      <div style={{ position: 'relative', zIndex: 1, padding: '52px 28px 80px' }}>
        <div style={{ maxWidth: '460px', margin: '0 auto' }}>

          {/* LOGO BAR */}
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: '32px' }}>
            <span style={{
              fontFamily: 'Epilogue, sans-serif',
              fontWeight: 400,
              fontStyle: 'italic',
              fontSize: '22px',
              letterSpacing: '-0.5px',
              color: '#2d1f0e',
            }}>
              Anna<span style={{ color: '#7a4a20' }}>Boo</span>
            </span>
          </div>

          {/* HEADER */}
```

---

## ИЗМЕНЕНИЕ 2: Блок питания — «Рацион дня»

Найди блок `{/* КБЖУ */}` — он начинается так:

```tsx
          {/* КБЖУ */}
          {nutrition && (nutrition.calories || nutrition.protein || nutrition.fat || nutrition.carbs) && (
            <div style={{ ...card }}>
              <p style={{ ...LABEL }}>Твоё питание</p>
```

Замени **весь блок КБЖУ** (от `{/* КБЖУ */}` до закрывающего `)}` включительно) на:

```tsx
          {/* КБЖУ */}
          {nutrition && (nutrition.calories || nutrition.protein || nutrition.fat || nutrition.carbs) && (
            <div style={{ ...card }}>
              <p style={{ ...LABEL }}>Рацион дня</p>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                {/* Left: big calories number */}
                {nutrition.calories ? (
                  <div style={{ flex: '0 0 auto', paddingRight: '24px', borderRight: '1px solid rgba(45,31,14,0.08)', marginRight: '24px' }}>
                    <p style={{ fontFamily: 'Epilogue, sans-serif', fontWeight: 400, fontSize: '56px', lineHeight: 1, color: '#2d1f0e', margin: 0, letterSpacing: '-2px' }}>
                      {nutrition.calories.toLocaleString('ru-RU')}
                    </p>
                    <p style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '10px', color: 'rgba(45,31,14,0.35)', margin: '8px 0 0', letterSpacing: '2.5px', textTransform: 'uppercase' }}>Калории</p>
                  </div>
                ) : null}
                {/* Right: macros vertical list */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '11px' }}>
                  {[
                    { value: nutrition.protein, label: 'Белки' },
                    { value: nutrition.fat, label: 'Жиры' },
                    { value: nutrition.carbs, label: 'Углеводы' },
                  ].filter(({ value }) => value != null).map(({ value, label }) => (
                    <div key={label} style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                      <p style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '11px', color: 'rgba(45,31,14,0.4)', margin: 0, letterSpacing: '1.5px', textTransform: 'uppercase' }}>{label}</p>
                      <p style={{ fontFamily: 'Epilogue, sans-serif', fontWeight: 400, fontSize: '20px', color: '#2d1f0e', margin: 0, letterSpacing: '-0.3px' }}>
                        {value}<span style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '12px', color: 'rgba(45,31,14,0.4)', marginLeft: '2px' }}>г</span>
                      </p>
                    </div>
                  ))}
                </div>
              </div>
              {nutrition.notes && (
                <p style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '12px', color: 'rgba(45,31,14,0.4)', fontStyle: 'italic', margin: '16px 0 0' }}>{nutrition.notes}</p>
              )}
            </div>
          )}
```

---

## ИЗМЕНЕНИЕ 3: Карточка веса — «Вес & Витальность»

Найди блок `{/* WEIGHT LOSS + BMI BLOCK */}` — он начинается так:

```tsx
          {/* WEIGHT LOSS + BMI BLOCK */}
          {(totalWeightLoss !== null || bmi !== null || latestWeight !== null) && (
            <div style={{ ...card }}>
              <p style={{ ...LABEL }}>Динамика тела</p>
```

Замени **весь блок** (от `{/* WEIGHT LOSS + BMI BLOCK */}` до закрывающего `)}` включительно) на:

```tsx
          {/* WEIGHT LOSS + BMI BLOCK */}
          {(totalWeightLoss !== null || bmi !== null || latestWeight !== null) && (
            <div style={{ ...card }}>
              <p style={{ ...LABEL }}>Вес &amp; Витальность</p>
              {/* Current weight — large hero number */}
              {latestWeight !== null && (
                <div style={{ marginBottom: totalWeightLoss !== null || bmi !== null ? '20px' : '0' }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                    <p style={{ fontFamily: 'Epilogue, sans-serif', fontWeight: 400, fontStyle: 'italic', fontSize: '72px', lineHeight: 1, color: '#2d1f0e', letterSpacing: '-3px', margin: 0 }}>
                      {latestWeight}
                    </p>
                    <span style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '18px', color: 'rgba(45,31,14,0.35)', letterSpacing: '1px' }}>кг</span>
                  </div>
                  {totalWeightLoss !== null && (
                    <p style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '12px', color: totalWeightLoss >= 0 ? '#1a7a3c' : '#8a2520', margin: '8px 0 0', letterSpacing: '0.3px' }}>
                      {totalWeightLoss > 0 ? '−' : totalWeightLoss < 0 ? '+' : ''}{Math.abs(totalWeightLoss)} кг за всё время
                      {avgWeeklyLoss !== null && (
                        <span style={{ color: 'rgba(45,31,14,0.35)', marginLeft: '10px' }}>
                          ≈ {avgWeeklyLoss > 0 ? '−' : ''}{Math.abs(avgWeeklyLoss)} кг/нед
                        </span>
                      )}
                    </p>
                  )}
                </div>
              )}
              {/* BMI row */}
              {bmi !== null && bmiInfo && (
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', padding: '10px 16px', background: 'rgba(45,31,14,0.04)', borderRadius: '10px' }}>
                  <p style={{ fontFamily: 'Epilogue, sans-serif', fontWeight: 400, fontSize: '24px', lineHeight: 1, color: '#2d1f0e', margin: 0 }}>{bmi}</p>
                  <p style={{ fontFamily: 'Chillax, sans-serif', fontWeight: 300, fontSize: '10px', letterSpacing: '2px', textTransform: 'uppercase', color: bmiInfo.color, margin: 0 }}>ИМТ · {bmiInfo.label}</p>
                </div>
              )}
            </div>
          )}
```

---

## После изменений

```bash
npx tsc --noEmit --skipLibCheck
git add app/client/page.tsx
git commit -m "design: AnnaBoo logo, рацион дня layout, вес & витальность card"
git push origin main
```

Подожди деплой Vercel (1-2 мин) и сообщи.

---

## Проверить после деплоя

1. Открыть coach-app-gray.vercel.app/client
2. Вверху страницы — логотип *Anna***Boo** (курсив, коричневый акцент) ✓
3. Блок питания — большое число калорий слева, Белки/Жиры/Углеводы справа вертикально ✓
4. Блок веса — большое курсивное число вес (72px) с подписью «кг», ИМТ в pill-элементе ✓
