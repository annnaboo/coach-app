# Design Critique: Coach App
*Senior Product Designer Review — Consumer Mobile, 10+ years*

---

## Overall Impression

The app has a genuinely distinctive editorial voice — the 62px italic Epilogue headings and warm brown palette create something that feels personal, not generic SaaS. The biggest opportunity is in the gap between what the design *wants to be* (glass, liquid, layered) and what it actually *is* in code (flat borders, no depth, no motion). The bones are excellent. The flesh needs work.

---

## 1. Visual Hierarchy

**What draws the eye first:** The `ArtName` display heading (62px Epilogue italic) — and yes, that is correct. It's the right anchor.

**Reading flow:** Heading → LABEL (10px caps) → content. The jump from 62px to 10px is brutal. There's no intermediate voice at 16–20px to bridge them. The eye lands on the hero, then gets lost looking for the next step.

**Typography scale — current:**

| Level | Size | Font | Usage |
|-------|------|------|-------|
| Display | 62px | Epilogue italic | Name/page title |
| Big Number | 48px | Epilogue | Metrics |
| — | *missing* | — | *subheading gap* |
| Body | 13px | Chillax 300 | Content |
| Label | 10px | Chillax 300 | Section headers |

The gap between 48px and 13px is where hierarchy collapses. Add an 18–22px level (Epilogue regular, not italic) for section titles like "Питание", "Тренировки", "Сегодня". Right now those sections compete equally with their data — nothing guides the scan.

**The `ArtName` split algorithm is fragile.** `name.length - 2` means a 3-character name ("Яна") produces "Я" in dark + "на." in brown. Four characters ("Оля") gives "Ол" + "я." — also odd. The rule should be: last *word* gets the accent color, not last 2 characters.

---

## 2. Glass / Liquid Depth — The Biggest Miss

The variable is literally named `glass` in every page. But:

```js
const glass: React.CSSProperties = {
  borderBottom: '1px solid rgba(45,31,14,0.08)',
  padding: '28px 0',
  marginBottom: '0',
}
```

There is no glass here. It's a horizontal rule. `AnimatedBackground` renders behind everything, but the cards sit on top with zero interaction — no `backdrop-filter`, no translucent fills, no shadow to separate layers. The background animation is wasted if nothing floats above it.

**What glass should look like:**

```css
background: rgba(255, 251, 245, 0.72);
backdrop-filter: blur(18px) saturate(160%);
-webkit-backdrop-filter: blur(18px) saturate(160%);
border: 1px solid rgba(255, 255, 255, 0.35);
border-radius: 20px;
box-shadow:
  0 2px 8px rgba(45, 31, 14, 0.06),
  0 12px 40px rgba(45, 31, 14, 0.08),
  inset 0 1px 0 rgba(255, 255, 255, 0.6);
padding: 28px 24px;
```

This gives you warm frosted glass that lets the animated background breathe through. The inset shadow adds an inner light edge — the "liquid" feeling. Different content blocks can have slightly different blur/opacity levels to create depth planes.

---

## 3. Shadow Layering — Currently Zero

There is not a single `box-shadow` in the entire visible codebase. This makes every element feel like it lives on the same z-plane.

**Recommended shadow system (3 levels):**

```css
/* Level 1: subtle lift (cards at rest) */
--shadow-sm: 0 1px 3px rgba(45,31,14,0.04), 0 4px 12px rgba(45,31,14,0.05);

/* Level 2: elevated (active card, modal, compare panel) */
--shadow-md: 0 4px 16px rgba(45,31,14,0.08), 0 16px 40px rgba(45,31,14,0.10);

/* Level 3: floating (upload form overlay, bottom sheets) */
--shadow-lg: 0 8px 32px rgba(45,31,14,0.12), 0 32px 64px rgba(45,31,14,0.14);
```

Keep all shadows warm (using `#2d1f0e` base, not black) to stay in palette.

---

## 4. Spacing Rhythm — Good Bones, Bad Consistency

The 28px section padding is a solid base. The rhythm breaks in three specific places:

**A. Mixed border-radius system.** Interactive elements use two completely different radii across the app:

| Context | Radius | File |
|---------|--------|------|
| Upload form inputs | `999px` (pill) | progress/page.tsx |
| Coach admin inputs | `10px` (rounded rect) | coach/page.tsx |
| Photo cards | `6px` (subtle) | progress/page.tsx |
| Upload preview image | `8px` | progress/page.tsx |
| Compare weight panel | `8px` | progress/page.tsx |

Pick one system. Given the editorial aesthetic, recommendation: `16px` for cards/panels, `999px` for all interactive inputs and buttons (the pill shape fits the warm premium feel). Never `6px`, `8px`, `10px` in the same product.

**B. The upload form collapses the rhythm.** When `showUploadForm` is true, the date/weight inputs use `margin: '0 0 12px'` while notes uses `marginBottom: '14px'` — inconsistent 2px gap. Small but noticeable when scanning the form.

**C. Label-to-content gap is inconsistent.** `LABEL` has `margin: '0 0 16px'` in progress, `margin: '0 0 20px'` in coach. Standardize at 16px.

---

## 5. Motion — Skeleton Only, Then Nothing

**What exists:** A `pulse` keyframe on skeleton loaders during data fetch. `transition: 'outline 0.15s'` on photo selection.

**What's missing:** Any entrance animation as content loads in. The page jumps from skeleton → content with zero transition. Users see a flash.

**Recommended micro-motion additions (CSS only, no library needed):**

```css
/* Fade+slide in for cards on load */
@keyframes slideUp {
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
}
.card { animation: slideUp 0.35s ease both; }
.card:nth-child(2) { animation-delay: 0.05s; }
.card:nth-child(3) { animation-delay: 0.10s; }
```

```css
/* Photo grid entrance (staggered) */
.photo-item { animation: slideUp 0.3s ease both; }
```

```css
/* Button press feedback */
button:active { transform: scale(0.97); }
button { transition: transform 0.12s, opacity 0.12s; }
```

The upload form appearing inline should also animate — currently it pops in instantly. A `max-height` transition or `opacity + translateY` would make it feel intentional rather than abrupt.

---

## 6. Affordance Issues

**A. Photo compare — hidden mechanic.** The instruction "Нажми на два фото чтобы сравнить" appears as a LABEL above the grid — but in `10px` uppercase with `30%` opacity. It reads as decorative, not instructional. A first-time user won't understand the tap-to-select model.

**Recommendation:** On first visit (or when no photos are selected), show a subtle instruction card above the grid at 13px with an icon. Retire it once the user has compared at least once (localStorage flag).

**B. Selection feedback is too subtle.** The `outline: '2px solid #7a4a20'` with `outlineOffset: '2px'` is the right idea but can be missed on warm-toned photos. Add a semi-transparent warm overlay (`rgba(122,74,32,0.15)`) on top of selected photos — stronger signal without being harsh.

**C. The ← Назад back button.** `fontSize: '12px'`, `color: rgba(45,31,14,0.35)`, no padding, no hit area declaration. On mobile this is a ~24x18px tap zone. Minimum should be 44x44px. Add `padding: '8px 12px 8px 0'` and increase size to `13px`.

**D. The "+ Фото" button label.** Good pill shape, correct size. But "+ Фото" as a label is ambiguous — add photo *of what*? Since this is a progress-tracking app, label it "+ Прогресс" or keep "+ Фото" but add microtext below: "добавить фото прогресса" at 10px.

---

## 7. Consistency — Two Sub-Systems in One App

The app has accidentally developed two design dialects:

| Element | Client-facing | Coach-facing |
|---------|--------------|-------------|
| Input border-radius | `999px` | `10px` |
| Input background | `rgba(0,0,0,0.05)` | `rgba(0,0,0,0.05)` ✓ |
| Card separation | border-bottom | border-bottom ✓ |
| Font size, labels | `10px` | `10px` ✓ |
| Semantic `glass` variable | = `card` (no glass) | = `card` (no glass) |
| `EXERCISE_NAMES` map | Duplicated 3× | — |
| `ArtName` component | Duplicated in client + coach | — |

**`ArtName` and `EXERCISE_NAMES` should live in shared files:**
- `/app/components/ArtName.tsx` — one source of truth
- `/lib/constants/exercises.ts` — one exercise name map

This isn't just a consistency issue — it's a maintenance trap. Any exercise name change now requires touching three files.

---

## 8. Accessibility

| Issue | Severity | Detail |
|-------|----------|--------|
| Label contrast | 🔴 Critical | `rgba(45,31,14,0.3)` ≈ 2.0:1 contrast ratio. WCAG AA requires 4.5:1 for text under 18px. All section labels fail. |
| Back button touch target | 🔴 Critical | ~24×18px tap zone. Minimum 44×44px per Apple HIG / WCAG 2.5.5. |
| Image alt text | 🟡 Moderate | `alt={photo.taken_at}` gives "2024-11-15" — screen reader says a date, not what the image is. Use: `alt={`Фото прогресса от ${formatDate(photo.taken_at)}`}` |
| `10px` label text | 🟡 Moderate | Below minimum 12px recommendation for mobile. Raise to 11–12px minimum. |
| Selection indicator ✓ | 🟢 Minor | Text character `✓` rather than SVG — inconsistent rendering across platforms. |

**Label contrast fix** — easiest path: change label opacity from `0.3` → `0.5`. This brings contrast to ~3.3:1, still soft, but readable and much closer to AA compliance for UI components.

---

## 9. Fluid Layouts

The fixed `maxWidth: '460px'` is correct for a mobile-first app. But the outer padding is hardcoded at `padding: '52px 28px 80px'` on all pages with no media query.

On tablet or desktop (if a coach opens this in a browser), the content is centered in a 460px column with 28px side padding — acceptable. But the `80px` bottom padding assumes a floating mobile nav bar. On desktop this creates unnecessary whitespace.

The 2-column photo grid (`1fr 1fr`) is the one responsive-aware layout — good. The rest of the content is single-column, which is fine.

**No critical fluid layout issues for the intended mobile use case.** The concern becomes real if/when you add a desktop coach dashboard.

---

## 10. What Works Really Well

- **The typographic system is genuinely distinctive.** Epilogue italic at 62px for names is a bold, correct choice. Most fitness apps look the same. This doesn't.
- **The color palette is cohesive and warm.** `#2d1f0e` / `#7a4a20` is a restrained, premium combination. Never a harsh black. Never corporate blue.
- **Photo compare feature concept is excellent.** Tap two, see side-by-side, get weight delta. Executed simply, works intuitively (once discovered).
- **Skeleton loading states are thoughtful.** The proportions match the actual content layout — not generic gray bars.
- **Empty state in progress page is right.** Italic faded "Фото пока нет" with a ghost CTA. Honest, not annoying.
- **The `ArtName` color-split idea is clever.** The execution needs adjustment (see above) but the concept — making the client's name feel like a logo — is the right instinct for a personal coaching product.

---

## Priority Recommendations

**1. Implement actual glass cards (highest visual impact)**
Replace the `border-bottom`-only card style with translucent frosted panels with `backdrop-filter: blur()`, warm fill, and shadow. The `AnimatedBackground` is invisible behind opaque-feeling flat cards. Unlocking this one change transforms the entire visual register.

**2. Fix label contrast (critical accessibility)**
Change `rgba(45,31,14,0.3)` → `rgba(45,31,14,0.5)` across all `LABEL` styles. One line change, major accessibility improvement.

**3. Add content entrance animations**
When data loads, stagger cards in with a 12px slide-up + fade (0.3s, ease). Makes the transition from skeleton feel intentional. No library needed — pure CSS keyframes.

**4. Fix `ArtName` split logic**
Replace `name.length - 2` with splitting on the last word. Ensures the accent color lands correctly for any name length.

**5. Unify border-radius system**
Standardize: `999px` for all inputs and buttons, `20px` for card panels, `12px` for image thumbnails. Remove `6px`, `8px`, `10px` from the system entirely.

**6. Extract shared components and constants**
Move `ArtName`, `EXERCISE_NAMES`, `LABEL`, and shadow variables to shared files. This is a maintenance issue that becomes a design consistency issue over time.

---

*Audit based on: `/app/client/page.tsx`, `/app/coach/page.tsx`, `/app/progress/page.tsx`, `/app/history/page.tsx`*
