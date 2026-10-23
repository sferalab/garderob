# v12b automated QA: every start button + Сброс must land on DEFAULT_VIEW with 0 px upright lean
import sys, math
from playwright.sync_api import sync_playwright
URL = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:8830/'
O = '/workspace/garderob/qa_v12b/'
JS = """(()=>{const o=__gs.orb,S=__gs.S,D=DEFAULT_VIEW,c=S.layout==='L'||S.layout==='Lr',sg=S.layout==='Lr'?-1:1;
return {lay:S.layout,az:o.az,el:Math.atan2(o.h-o.T.y,o.R),eaz:c?sg*D.azCorner:D.azFlat,eel:D.el,lean:Math.max(...__gs.vlean().map(Math.abs))}})()"""
fails = []
def check(pg, tag):
    pg.screenshot(path=O + tag + '.png'); r = pg.evaluate(JS)
    ok = abs(r['az'] - r['eaz']) < 0.01 and abs(r['el'] - r['eel']) < 0.01 and r['lean'] == 0
    print(('OK  ' if ok else 'FAIL'), tag, r['lay'], 'az %.1f el %.1f lean %s' % (math.degrees(r['az']), math.degrees(r['el']), r['lean']))
    if not ok: fails.append(tag)
def drag(pg):
    pg.evaluate("__gs.setOrb(2.2,3.5,4,__gs.orb.T.x,__gs.orb.T.y,__gs.orb.T.z)"); pg.wait_for_timeout(500)
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', headless=True, args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
    for vw, vh, dev in [(390, 844, 'mob'), (1280, 800, 'desk')]:
        pg = b.new_page(viewport={'width': vw, 'height': vh}); pg.set_default_timeout(120000); pg.on('dialog', lambda d: d.accept())
        pg.goto(URL + '?v=qa', wait_until='commit'); pg.evaluate('localStorage.clear()'); pg.reload(wait_until='commit'); pg.wait_for_timeout(14000)
        check(pg, dev + '_load')
        for k in ['l23', 'p3', 'zero']:
            drag(pg); pg.click(f'[data-start="{k}"]'); pg.wait_for_timeout(4000); check(pg, f'{dev}_{k}')
        drag(pg); pg.click('#resetBtn'); pg.wait_for_timeout(15000); check(pg, dev + '_reset')
        pg.close()
print('FAILS:', fails or 'none'); sys.exit(1 if fails else 0)
