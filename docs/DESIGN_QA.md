# Проверка редизайна, 15.11.2026

Без публикации. База: публичный хаб; профиль и серверная авторизация интегрируются отдельно.

Подтверждено:
- TypeScript, production build, 60 unit tests, компонентный SSR проходят.
- Реальный Chromium через штатный Sites preview: старт, эльф, имя, все пять вопросов, свиток, Мыслитель, переход в лагерь. Результат восстановлен при повторном открытии.
- Четыре квадратика букв: разница вертикальных центров с кнопкой 0.5 CSS px (округление), desktop.
- Мобильный iframe 390 px: лагерь и гайд отображаются, ширина контента 380 px при scrollbar10, горизонтального переполнения нет.
- Проверены все 36 иллюстраций героев и две общие, три утверждённые иконки сохранены.

Осталось перед публикацией:
- Исправлено320px: причиной был глобальный body min-width320. После scoped override фактическая clientWidth310,scrollWidth310, переполнения нет.
- Возврат guide→лагерь проверен напрямую в основной вкладке: работает. FrameLocator в CUA не доставляет возврат стабильно, поэтому это ограничение мобильной UI-проверки, не воспроизведённый дефект приложения.
- Совместить с веткой профиля/защиты курса и stable answer IDs, затем повторить сквозной тест.
- 31 из36 индивидуальных иллюстраций408–412px, четыре1254×1254, одна1280×853. Общие две1536×1024. Низкие панели не являются HD; на Retina возможна мягкость. Перед финальным релизом желательно поштучное создание высокоразрешённых версий, не простой upscale.

Скриншоты output/design-qa показывают реальные экраны, а не статические макеты. Они viewport-only: длинные страницы целиком в один кадр не помещаются. Тестовые данные синтетические.

## Финальная серия иллюстраций
Все36 индивидуальных сцен теперь1254px+ (35 квадратных1254×1254, эльфийская развилка1536×1024). Новые лица человека/орка проверены целыми рядами; Commander человека/эльфа согласован с испытаниями, развилка эльфа обновлена. Тролль сохранён по дизайну. Поскольку это генеративная реставрация, микродетали и оттенки отличаются от исходника; перед публикацией требуется просмотр Даниилом. Новый полный каталог output/orienta-full-art-review-v7.pdf.

## Final artwork acceptance, 2026-11-15 (v8 + v9)

- Inspected all 36 character scenes in four nine-scene contact sheets and both general illustrations. Independent second visual review of all 36 found no substantial publication blocker.
- Applied 17 user-reviewed corrections: elf q2; human q3; all nine orc scenes; troll q3, q5 and four archetypes. Verified input SHA-256 before conversion; exported WebP quality 94 without resizing (1254 × 1254).
- Rest of imagery and three approved camp icons unchanged. Tests: 60/60 passed.
- Scene luminance differs intentionally: cave/tavern interiors and campfire are darker than outdoor scenes. Did not equalize global means, which would wash out dark scenes. Orc line remains brighter/saturated; this is visible and consistent within the reviewed v9 set, not a claim of pixel-identical palettes.
- Principal character identity, corrected goblin arm count, cave NPC scale, troll hands/stance, orc lower-lip tusks and neutral upper eyelids checked. Orc decorative marks are similar in style, not anatomically fixed tattoos.
- Non-blocking detail: troll Commander includes a separate bearded dwarf companion, not the orc from the introductory group. The scene does not require exactly the starting four; the principal troll remains consistent.
- Full release manifest with input and exported hashes: /workspace/shared/orienta-final-qa/release-manifest.json. This acceptance concerns art only; integrated browser/application acceptance belongs to integration engineer. No deploy performed here.
