# Команда для деплоя — вставь в Claude Code

Скопируй это и вставь в Claude Code (в терминале):

```
Найди папку coach-app на этом компьютере (~/Documents, ~/Projects, ~/Desktop, ~/dev и т.д.).
Потом выполни следующие шаги:

1. Скопируй файлы из папки "main documentation/coach-app-updates" (которая лежит рядом с этим файлом) в репозиторий coach-app:
   - coach-app-updates/app/client/page.tsx → coach-app/app/client/page.tsx
   - coach-app-updates/app/coach/page.tsx → coach-app/app/coach/page.tsx

2. Запусти TypeScript проверку: node_modules/.bin/tsc --noEmit --skipLibCheck

3. Если ошибок нет — сделай git add + commit + push:
   git add app/client/page.tsx app/coach/page.tsx
   git commit -m "design: editorial redesign — minimal sections, big typography"
   git push origin main

4. Скажи когда готово.
```
