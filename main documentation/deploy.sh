#!/bin/bash
# ============================================================
# Coach App — deploy script
# Копирует обновлённые файлы в репозиторий и пушит на GitHub
# Запуск: bash deploy.sh
# ============================================================

set -e  # остановиться при любой ошибке

echo ""
echo "🚀 Coach App Deploy Script"
echo "=========================="

# ---- 1. Найти репозиторий ----
REPO=""

# Искать в стандартных местах
for path in \
  "$HOME/coach-app" \
  "$HOME/Documents/coach-app" \
  "$HOME/Projects/coach-app" \
  "$HOME/Desktop/coach-app" \
  "$HOME/dev/coach-app" \
  "$HOME/code/coach-app"
do
  if [ -d "$path/.git" ]; then
    REPO="$path"
    break
  fi
done

# Если не нашли — попросить вручную
if [ -z "$REPO" ]; then
  echo ""
  echo "❓ Не нашёл репозиторий автоматически."
  echo "   Введи полный путь к папке coach-app (например: /Users/anna/Documents/coach-app):"
  read -r REPO_INPUT
  REPO="${REPO_INPUT/#\~/$HOME}"  # раскрыть ~ если есть

  if [ ! -d "$REPO/.git" ]; then
    echo "❌ Ошибка: в папке '$REPO' нет .git репозитория"
    exit 1
  fi
fi

echo "✅ Репозиторий найден: $REPO"

# ---- 2. Найти папку с новыми файлами ----
UPDATES_DIR="$(cd "$(dirname "$0")" && pwd)/coach-app-updates"

if [ ! -d "$UPDATES_DIR" ]; then
  echo "❌ Ошибка: папка с обновлениями не найдена: $UPDATES_DIR"
  echo "   Убедись что папка coach-app-updates лежит рядом с этим скриптом"
  exit 1
fi

echo "✅ Папка с обновлениями: $UPDATES_DIR"

# ---- 3. Проверить git status ----
cd "$REPO"
GIT_STATUS=$(git status --porcelain)
if [ -n "$GIT_STATUS" ]; then
  echo ""
  echo "⚠️  В репозитории есть незафиксированные изменения:"
  git status --short
  echo ""
  echo "   Продолжить? Новые файлы заменят текущие. (y/n)"
  read -r CONFIRM
  if [ "$CONFIRM" != "y" ] && [ "$CONFIRM" != "Y" ]; then
    echo "Отменено."
    exit 0
  fi
fi

# ---- 4. Копировать файлы ----
echo ""
echo "📁 Копируем файлы..."

FILES=(
  "app/client/page.tsx"
  "app/coach/page.tsx"
  "app/coach/programs/page.tsx"
  "app/coach/programs/edit/[id]/page.tsx"
)

for file in "${FILES[@]}"; do
  src="$UPDATES_DIR/$file"
  dst="$REPO/$file"
  dst_dir=$(dirname "$dst")

  if [ ! -f "$src" ]; then
    echo "  ⚠️  Файл не найден: $src — пропускаем"
    continue
  fi

  mkdir -p "$dst_dir"
  cp "$src" "$dst"
  echo "  ✓ $file"
done

# ---- 5. TypeScript проверка ----
echo ""
echo "🔍 Проверяем TypeScript..."

if [ -f "$REPO/node_modules/.bin/tsc" ]; then
  cd "$REPO"
  TS_RESULT=$(node_modules/.bin/tsc --noEmit --skipLibCheck 2>&1)
  TS_EXIT=$?

  if [ $TS_EXIT -eq 0 ]; then
    echo "  ✅ TypeScript: ошибок нет"
  else
    echo "  ❌ TypeScript нашёл ошибки:"
    echo "$TS_RESULT"
    echo ""
    echo "   Всё равно продолжить пуш? (y/n)"
    read -r PUSH_ANYWAY
    if [ "$PUSH_ANYWAY" != "y" ] && [ "$PUSH_ANYWAY" != "Y" ]; then
      echo "Отменено. Почини ошибки и запусти скрипт снова."
      exit 1
    fi
  fi
else
  echo "  ⚠️  node_modules не найдены — пропускаем TypeScript проверку"
  echo "     Запусти 'npm install' в папке репозитория если нужна проверка"
fi

# ---- 6. Git commit & push ----
echo ""
echo "📤 Делаем git commit..."

cd "$REPO"
git add \
  "app/client/page.tsx" \
  "app/coach/page.tsx" \
  "app/coach/programs/page.tsx" \
  "app/coach/programs/edit/[id]/page.tsx" \
  2>/dev/null || true

# Проверить есть ли что коммитить
if git diff --cached --quiet; then
  echo "  ℹ️  Нет изменений для коммита (файлы уже актуальны)"
else
  git commit -m "feat: dashboard overhaul + 8 feature fixes

1. Programs — edit page with client reassignment + end_date
2. Client — program name + validity period displayed
3. Client — unpaid badge now prominent
4. Client — weight loss avg block + BMI calculator
5. Trainer — completion %, active status, missing reports, overdue
6. Trainer — earnings dashboard (received vs expected)
7. Programs list — edit buttons
8. Payment toggle in both directions"
  echo "  ✅ Commit создан"
fi

echo ""
echo "📡 Пушим на GitHub..."
git push origin main

echo ""
echo "✅ Готово! Vercel задеплоит за 1-2 минуты."
echo "   Проверить: https://coach-app-gray.vercel.app"
echo ""
