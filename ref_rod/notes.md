# Titan-GS rod mounting (for three.js)
Parts: Штанга (round tube Ø25 mm, chrome; lengths e.g. 64 cm, cut to size; load ~25 kg) · Кронштейн для перекладины (rod hook) · Соединитель перекладин (plastic, to extend) · Заглушки (end caps, round).
Holder = flat bent sheet-steel strip, powder-coated (white RAL9016 / silver RAL9006 / black RAL9005), ~30 mm wide, ~100 mm tall, ~2 mm thick.
Shape (side profile, see kronshtejn-*.png):
- Top: flat vertical tab with a narrow downward slot (J/hook slot) that hooks onto the bottom edge/flange of the SHELF BRACKET (кронштейн для полок), hangs under the bracket, installed before the shelf. Not attached to the upright.
- Middle: strip goes straight down, then a dog-leg bend forward ~20–25 mm.
- Bottom: open U/J cradle (inner Ø≈25–26 mm) open upward-front; the rod just lies in it (snap/drop-in), rod axis parallel to wall, under the bracket ~70–80 mm below bracket bottom, roughly mid-depth or front of bracket.
- One holder per shelf bracket (i.e. at each upright), rod spans between them; rod ends overhang slightly with end caps.
Modeling: rod = CylinderGeometry r=12.5mm; holder = ExtrudeGeometry of 2D strip path (depth 30 mm) or tab box 30x40x2 + bent strip + half-torus/tube arc r=13.5 around rod bottom. Color holder = system color; rod chrome.
