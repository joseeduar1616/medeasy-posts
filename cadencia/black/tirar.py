from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b=p.chromium.launch(args=['--allow-file-access-from-files'])
    for f,h in (('feed',1350),('story',1920)):
        pg=b.new_page(viewport={'width':1080,'height':h})
        pg.goto(f'file:///tmp/claude-0/black/black.html?{f}'); pg.evaluate('document.fonts.ready'); pg.wait_for_timeout(400)
        pg.screenshot(path=f'/tmp/claude-0/black/{f}.jpg',type='jpeg',quality=92)
    b.close()
