# v12c automated QA: every start button + Сброс must land on DEFAULT_VIEW with 0 px upright lean
import sys, math
from playwright.sync_api import sync_playwright
URL = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:8830/'
O = '/workspace/garderob/qa_v12c/'
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
        pg = b.new_page(viewport={'width': vw, 'height': vh}, has_touch=(dev == 'mob'), is_mobile=(dev == 'mob')); pg.set_default_timeout(120000); pg.on('dialog', lambda d: d.accept())
        pg.goto(URL + '?v=qa', wait_until='commit'); pg.evaluate('localStorage.clear()'); pg.reload(wait_until='commit'); pg.wait_for_timeout(14000)
        check(pg, dev + '_load')
        for k in ['l23', 'p3', 'zero']:
            drag(pg); pg.click(f'[data-start="{k}"]'); pg.wait_for_timeout(4000); check(pg, f'{dev}_{k}')
        drag(pg); pg.click('#resetBtn'); pg.wait_for_timeout(15000); check(pg, dev + '_reset')
        if dev == 'mob':  # touch drag: 3 full turns of azimuth + vertical, must not stick
            cdp = pg.context.new_cdp_session(pg); bx = pg.locator('canvas').first.bounding_box(); cx, cy = bx['x'] + bx['width'] / 2, bx['y'] + bx['height'] * 0.45
            def tdrag(dx, dy, n=30):
                x, y = cx, cy; cdp.send('Input.dispatchTouchEvent', {'type': 'touchStart', 'touchPoints': [{'x': x, 'y': y}]})
                for i in range(n): x += dx / n; y += dy / n; cdp.send('Input.dispatchTouchEvent', {'type': 'touchMove', 'touchPoints': [{'x': x, 'y': y}]})
                cdp.send('Input.dispatchTouchEvent', {'type': 'touchEnd', 'touchPoints': []}); pg.wait_for_timeout(150)
            az0 = pg.evaluate('__gs.orb.az'); T0 = pg.evaluate('[__gs.orb.T.x,__gs.orb.T.z]')
            for k in range(12): tdrag(-140, 0); 
            az1 = pg.evaluate('__gs.orb.az'); print('touch azimuth turned deg', round(math.degrees(az1 - az0), 1))
            if abs(az1 - az0) < 6: fails.append('touch azimuth stuck')
            T1 = pg.evaluate('[__gs.orb.T.x,__gs.orb.T.z]'); print('pivot drift m', round(abs(T1[0]-T0[0])+abs(T1[1]-T0[1]), 5))
            if abs(T1[0]-T0[0]) + abs(T1[1]-T0[1]) > 1e-6: fails.append('pivot drift')
            tdrag(0, 120); e1 = pg.evaluate('Math.atan2(__gs.orb.h-__gs.orb.T.y,__gs.orb.R)*57.3'); tdrag(0, -260); e2 = pg.evaluate('Math.atan2(__gs.orb.h-__gs.orb.T.y,__gs.orb.R)*57.3')
            l = pg.evaluate('Math.max(...__gs.vlean().map(Math.abs))'); print('touch elev up/down', round(e1, 1), round(e2, 1), 'lean', l); pg.screenshot(path=O + 'mob_touch_after.png')
            if abs(e1 - e2) < 5 or l != 0: fails.append('touch elevation')
        if dev == 'desk':  # invariant sweep: azimuth 0..360 x elevation EL_MIN..EL_MAX, lean 0 px, stretch < 1.30
            st = pg.evaluate("({T:[__gs.orb.T.x,__gs.orb.T.y,__gs.orb.T.z],D:Math.hypot(__gs.orb.R,__gs.orb.h-__gs.orb.T.y)})"); worst = [0, 0]
            for az in range(0, 360, 30):
                for el in [-40, -20, -10, 0, 20, 37, 60, 85]:  # beyond-range values must clamp
                    e, a = math.radians(el), math.radians(az); T = st['T']; D = st['D']
                    pg.evaluate(f"__gs.setOrb({a},{T[1]+D*math.sin(e)},{D*math.cos(e)},{T[0]},{T[1]},{T[2]})"); pg.wait_for_timeout(120)
                    r = pg.evaluate("({l:Math.max(...__gs.vlean().map(Math.abs)),s:__gs.stretch(),el:Math.atan2(__gs.orb.h-__gs.orb.T.y,__gs.orb.R)*57.2958})")
                    worst = [max(worst[0], r['l']), max(worst[1], r['s'])]
                    if r['l'] != 0 or r['s'] > 1.30 or r['el'] > 36.9 or r['el'] < -20.01: fails.append(f'sweep az{az} el{el} {r}')
                    if az % 90 == 0 and el in (-20, 0, 37): pg.screenshot(path=O + f'sweep_az{az}_el{el}.png')
            print('sweep worst lean px', worst[0], 'worst stretch', round(worst[1], 3))
        pg.close()
print('FAILS:', fails or 'none'); sys.exit(1 if fails else 0)
