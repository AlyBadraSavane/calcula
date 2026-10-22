from playwright.sync_api import sync_playwright
import sys
out='/home/claude/calcula/store/screenshots/'
with sync_playwright() as p:
    b=p.chromium.launch()
    ctx=b.new_context(viewport={'width':360,'height':720},device_scale_factor=3,has_touch=True,locale='fr-FR')
    pg=ctx.new_page()
    pg.goto('http://localhost:8791/index.html');pg.wait_for_timeout(600)
    def keys(s):
        for c in s:
            m={'×':'×','÷':'÷','+':'+','−':'−'}
            pg.locator('#pad .k',has_text=c).first.click()
    keys('1250000');keys('×');keys('18');pg.wait_for_timeout(300)
    pg.screenshot(path=out+'1-standard.png')
    pg.locator('#m-sci').click();pg.wait_for_timeout(400)
    pg.locator('#pad .k',has_text='C').first.click() if False else None
    pg.screenshot(path=out+'2-scientifique.png')
    pg.locator('#m-std').click()
    for t,f in [('Convertir','3-convertisseur'),('Devises','4-devises'),('Outils','5-outils')]:
        pg.locator('.nav button',has_text=t).click();pg.wait_for_timeout(500)
        pg.screenshot(path=out+f+'.png')
    b.close()
