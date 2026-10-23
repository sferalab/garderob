# v12d: configuration changes must not move the camera. Run with repo served on :8830.
from playwright.sync_api import sync_playwright
import sys, json
fails = []
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--use-gl=swiftshader', '--enable-unsafe-swiftshader'])
    for dev, vw, vh in [('desk', 1280, 800), ('mob', 390, 844)]:
        pg = b.new_page(viewport={'width': vw, 'height': vh}, has_touch=dev == 'mob', is_mobile=dev == 'mob'); pg.on('dialog', lambda d: d.accept())
        pg.goto('http://localhost:8830/?v=qa'); pg.evaluate('localStorage.clear()'); pg.reload(); pg.wait_for_timeout(12000)
        pg.evaluate("(()=>{const o=__gs.orb;__gs.setOrb(o.az+0.9,o.h+0.8,o.R*0.8,o.T.x,o.T.y,o.T.z)})()"); pg.wait_for_timeout(800)
        cam = "JSON.stringify((o=>[o.az,o.h,o.R,o.T.x,o.T.y,o.T.z].map(v=>+v.toFixed(6)))(__gs.orb))"
        c0 = pg.evaluate(cam); print(dev, 'cam0', c0)
        steps = [('width 60', "button:has-text('60'):has-text('603')"), ('width 120', "button:has-text('1203')"), ('count 3', "button:text-is('3')"),
                 ('count 4', "button:text-is('4')"), ('rail 240', "button:text-is('240')"), ('width 45', "button:has-text('463')"), ('second wall', "text=Вторая стена")]
        for name, sel in steps:
            try: pg.locator(sel).first.click(timeout=5000)
            except Exception as e: print(' skip', name, str(e)[:60]); continue
            pg.wait_for_timeout(1500); c = pg.evaluate(cam); ok = c == c0; print(' OK ' if ok else ' FAIL', name, c)
            if not ok: fails.append(f'{dev} {name}')
        pg.screenshot(path=f'qa_v12d/{dev}_after_changes.png'); pg.close()
print('FAILS:', fails or 'none'); sys.exit(1 if fails else 0)
