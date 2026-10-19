# Lavanda frontend

Next.js static export, TypeScript, MUI, CSS Modules. Mobile first, лавандовая палитра MUI и светлые страницы. Подробные инструкции обоих сервисов находятся в `../README.md`.

Node.js 24 LTS:

```text
npm install
npm run dev
npm run typecheck
npm run build
```

Dev: http://localhost:3000, `/api` проксируется на http://127.0.0.1:8080.
Production: содержимое `out/` отдаёт Nginx; Node.js на сервере не требуется.

В `src/components/Providers.tsx` через `createTheme()` настроена лавандовая палитра без переопределений стилей компонентов. CSS Modules задают оформление и компоновку страниц. Сброс `reset-css` импортируется в корневом layout через `src/app/reset.css`, в CSS-слой перед MUI. Базовые правила в `globals.css` также помещены в слой `reset`, чтобы не перекрывать стили компонентов MUI.
