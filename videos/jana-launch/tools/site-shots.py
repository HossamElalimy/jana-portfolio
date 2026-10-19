"""Phone-viewport (9:16) screenshots of the local Jana build, for the film's burst."""
import sys, time
from playwright.sync_api import sync_playwright

URL = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:3100/"
OUT = sys.argv[2] if len(sys.argv) > 2 else "assets/site"
W, H, DPR = 390, 693, 1080 / 390

with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page(viewport={"width": W, "height": H}, device_scale_factor=DPR, is_mobile=True, has_touch=True)
    pg.goto(URL, wait_until="networkidle")
    time.sleep(3.5)
    pg.screenshot(path=f"{OUT}/hero.png")
    total = pg.evaluate("document.documentElement.scrollHeight")
    # Walk the page so scroll-driven reveals fire, saving a frame every 0.5 viewport.
    y, i = 0, 0
    while y < total:
        pg.mouse.wheel(0, H * 0.5)
        y += H * 0.5
        time.sleep(0.9)
        i += 1
        pg.screenshot(path=f"{OUT}/scroll-{i:03d}.png")
        total = pg.evaluate("document.documentElement.scrollHeight")
    print("frames", i, "height", total)
    b.close()
