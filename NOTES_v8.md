# v8 list (from user)
1. White RAL 9016 snow-white, slight cool tint and glow; default wall a bit darker/warmer for contrast.
2. 📷 at right of bottom strip: one-tap 3:4 snapshot 1800x2400 of current view, no highlights/flash. iOS: navigator.share files; Android/desktop: direct download. Wide formats stay in «Готово».
3. Bottom strip order in one line: 🗑 (far left, only when selected), ↶, ↷ (bigger round, 🗑 same size), «✨ Ракурс», «Размеры ▾», «Стены ▾», «Сброс», 📷.
4. Top rail: same profile and height on all walls, clean corner meeting. Check L, Lr, mirrored, U.
5. Thicker metal visually x1.5 (uprights, rails, brackets, shelf rims, rods), catalog numbers unchanged; stronger bevels/edges.
6. Photoreal powder coat: fine grain, roughness variation, edge highlights, crisp perforation. Not plastic.
7. Trouser rack: real Titan-GS look; bars wall->front on pull-out frame. Report findings.
8. Construction width: add 60 (603). All catalog widths present in section widths.
9. Each filling element: «Длина» and «Глубина» button rows with only catalog sizes for that element, apply immediately.
10. While dragging: LEFT live distances to neighbours above/below; RIGHT «от пола N см». Only while dragging.
11. Corner-shift sliders also at top of Наполнение (synced). Каркас order: corner shift, raise from floor (default 20), upright height, ceiling. BUG: after Зеркально one wall shift resets / slider dead / one slider moves whole L. Fix per-wall in all layouts.
12. Оформление: system color = 3 round swatches (Белый/Серебро/Черный) + rod swatches (Белый/Хром). No dropdowns.
13. Shadows: presets «Мягкая рядом» (default), «Четкая слева», «Четкая справа», «Сверху», «Без тени». Always attached, short. Studio: soft contact shadow under/behind only. Fix frustum and bias.
14. «Свет из окна»: Выкл / На стену / На пол / Оба - soft window patch with mullions.
15. Wall finishes with swatch tiles per type. Paint: матовая, сатин, валик. Plaster: короед, венецианка, бетон, шелк, травертин. Wallpaper: лен, геометрия, ботаника, мягкая полоска, дамаск. Tinted by wall color.
16. Floors: keep parquet + carpet, add light/dark laminate, concrete porcelain, marble porcelain. Rug: круглый/прямоугольный × пушистый/плоский + «Убрать ковер».
17. More air in Оформление.
18. Block «Свет и тени» at start of Оформление: shadow presets, window light, metal highlights «Мягкие / Яркие / Выкл».
19. «Раскрыть угол стен» slider at very top of Оформление, duplicated in Каркас, synced.
20. Window and door openings: reveals, sill, casings, glass. Floor plants 2-3 (фикус лировидный, монстера, олива) in ceramic pots, draggable on floor, size control.
21. Ceiling solid, no gaps; correct corner geometry.
22. Room walls wide by default; slider narrows.
23. U layout: both sides open with angle slider, camera centered/farther, per-wall corner shift.
24. «Стены ▾» dropdown: per-wall «Очистить» (removes all construction from wall; room stays) and «Вернуть конструкцию»; undo works.
25. BUG: dims show nothing in «Только наполнение». Must work in all views, studio, mirrored, cleared wall.
26. WebAudio click sounds (soft tick, brighter on size/color, muted on 🗑 ↶↷), haptics; outline SVG speaker toggle in top bar next to ⋯, persisted.
Keep: parquet, icons, dragging, alignment tick, corner red dot, Студия/Комната.
