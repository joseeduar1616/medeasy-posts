"""Gera carrossel (1080x1350) e story (1080x1920) no estilo da Medeasy a partir de um JSON.

Uso: python3 kit/render.py caminho/do/post.json
Saída: out/<slug>/slide_1.jpg ... slide_N.jpg, story.jpg e check.json
O check.json lista slides com texto cortado ou fora da área; se não estiver vazio, corrija o JSON e rode de novo.

Campos de texto aceitam HTML simples: <b>negrito</b>, <span class="g">verde</span>, <span class="y">amarelo</span>.
"""
import asyncio, base64, json, pathlib, sys
from PIL import Image
from playwright.async_api import async_playwright

KIT = pathlib.Path(__file__).resolve().parent
A = KIT / "assets"
def b64(p): return base64.b64encode(p.read_bytes()).decode()
BG, ANTON, JAK = b64(A / "bg.png"), b64(A / "Anton-Regular.ttf"), b64(A / "PlusJakartaSans.ttf")

G, Y, GRAY = "#3EF23A", "#FFC83D", "#9EA39F"
CSS = f"""
@font-face {{ font-family:'Anton'; src:url(data:font/ttf;base64,{ANTON}); }}
@font-face {{ font-family:'Jak'; src:url(data:font/ttf;base64,{JAK}); font-weight:200 800; }}
* {{ margin:0; padding:0; box-sizing:border-box; }}
body {{ width:1600px; height:2000px; background:#050805 url(data:image/png;base64,{BG}) no-repeat; background-size:1600px 2000px;
  font-family:'Jak'; color:#fff; position:relative; overflow:hidden; -webkit-font-smoothing:antialiased; }}
.bar {{ position:absolute; left:0; right:0; height:11px; background:linear-gradient(90deg,{G},#9ED61E 55%,#F5A524); }}
.bar.top {{ top:0; }} .bar.bot {{ bottom:0; }}
.bar.rev {{ background:linear-gradient(90deg,#F5A524,#9ED61E 45%,{G}); }}
.hdr {{ position:absolute; top:46px; left:96px; right:96px; display:flex; justify-content:space-between; font-weight:700; font-size:24px; letter-spacing:4px; color:{GRAY}; }}
.hdr b {{ color:{G}; font-weight:800; }}
#content {{ position:absolute; left:96px; right:96px; top:130px; bottom:190px; display:flex; flex-direction:column; justify-content:center; }}
#content.center {{ text-align:center; align-items:center; }}
.lbl {{ display:flex; align-items:center; gap:22px; font-weight:800; font-size:30px; letter-spacing:6px; color:{G}; text-transform:uppercase; }}
.lbl i {{ width:20px; height:20px; border-radius:50%; background:{G}; display:block; flex:none; }}
.lbl s {{ width:60px; height:4px; background:{G}; display:block; text-decoration:none; flex:none; }}
.t {{ font-family:'Anton'; text-transform:uppercase; line-height:1.0; letter-spacing:-1px; }}
.y {{ color:{Y}; }} .g {{ color:{G}; }}
.glow {{ text-shadow:0 0 30px rgba(62,242,58,.35); }}
.sub {{ font-size:34px; color:{GRAY}; font-weight:400; margin-top:10px; letter-spacing:-.5px; }}
.body {{ font-size:50px; color:#A9AEAA; line-height:1.48; font-weight:400; letter-spacing:-1px; }}
.body b {{ color:#fff; font-weight:700; }}
.pill {{ display:inline-block; font-family:'Anton'; color:#0B0F0A; font-size:62px; padding:14px 40px 16px; border-radius:22px;
  background:linear-gradient(90deg,{G},#9BE02A 60%,{Y}); box-shadow:0 0 40px rgba(62,242,58,.35); }}
.row {{ display:flex; justify-content:space-between; align-items:center; gap:30px; padding:28px 0; border-bottom:1.5px solid rgba(255,255,255,.07); }}
.row:last-child {{ border-bottom:none; }}
.row .n {{ font-size:46px; font-weight:500; letter-spacing:-1px; }}
.row .s {{ font-size:32px; color:{GRAY}; margin-top:4px; }}
.row .d {{ font-family:'Anton'; font-size:62px; color:{G}; text-align:right; white-space:nowrap; }}
.row .d small {{ display:block; font-family:'Jak'; font-size:24px; color:{GRAY}; letter-spacing:3px; font-weight:700; }}
.bul {{ display:flex; gap:26px; align-items:center; padding:30px 0; border-bottom:1.5px solid rgba(255,255,255,.07); font-size:40px; }}
.bul:first-child {{ border-top:1.5px solid rgba(255,255,255,.07); }}
.bul i {{ width:16px; height:16px; border-radius:50%; background:#B8F02A; display:block; flex:none; }}
.bul b {{ font-weight:700; }}
.card {{ background:rgba(255,255,255,.035); border:1.5px solid rgba(255,255,255,.08); border-radius:34px; padding:44px 52px; }}
.card + .card {{ margin-top:28px; }}
.card h3 {{ font-size:50px; font-weight:700; letter-spacing:-1px; }}
.card h3 span {{ font-size:34px; color:{GRAY}; font-weight:500; margin-left:8px; }}
.card p {{ font-size:40px; color:#A9AEAA; line-height:1.45; margin-top:14px; letter-spacing:-.5px; }}
.card p b {{ color:{Y}; font-weight:700; }}
.num {{ width:62px; height:62px; border-radius:50%; background:{G}; color:#0B0F0A; display:flex; align-items:center; justify-content:center; font-weight:800; font-size:30px; margin-bottom:24px; }}
.grid {{ display:grid; grid-template-columns:1fr 1fr; gap:22px; }}
.cell {{ background:rgba(255,255,255,.035); border:1.5px solid rgba(255,255,255,.08); border-radius:26px; padding:26px 36px 28px; min-width:0; }}
.cell .v {{ font-family:'Anton'; font-size:76px; color:{G}; line-height:1.05; }}
.cell .k {{ font-size:34px; font-weight:600; margin-top:2px; }}
.cell .k span {{ color:{GRAY}; font-weight:400; font-size:30px; }}
.note {{ font-size:34px; color:#8E938F; line-height:1.45; }}
.note b {{ color:{Y}; font-weight:700; }}
.box {{ background:rgba(255,255,255,.035); border:1.5px solid rgba(255,255,255,.08); border-radius:26px; padding:32px 42px; }}
.box .h {{ font-size:26px; letter-spacing:5px; color:{GRAY}; font-weight:700; }}
.box .x {{ font-size:38px; margin-top:12px; font-weight:500; letter-spacing:-.5px; }}
.th {{ display:flex; justify-content:space-between; font-size:24px; letter-spacing:4px; color:{GRAY}; font-weight:700; padding-bottom:14px; border-bottom:1.5px solid rgba(255,255,255,.07); }}
.tc {{ display:flex; gap:60px; align-items:center; }}
.tc .a {{ font-family:'Anton'; font-size:56px; width:200px; text-align:right; }}
.tc .b {{ font-family:'Anton'; font-size:60px; width:280px; text-align:right; color:{G}; }}
"""

def title(lines, size, mt=20, glow_last=False):
    out = []
    for i, ln in enumerate(lines):
        cls = "t glow" if (glow_last and i == len(lines) - 1) else "t"
        out.append(f'<div class="{cls}" style="font-size:{size}px;margin-top:{mt if i == 0 else 12}px">{ln}</div>')
    return "".join(out)

def lbl(text, dash=False):
    return f'<div class="lbl">{"<s></s>" if dash else "<i></i>"}{text}</div>'

def sub(s):  return f'<div class="sub">{s}</div>' if s else ""
def note(s, mt=30): return f'<p class="note" style="margin-top:{mt}px">{s}</p>' if s else ""

def build(sl):
    k = sl["type"]; ts = sl.get("title_size")
    if k == "cover":
        bl = "".join(f'<div class="bul"><i></i><span>{b}</span></div>' for b in sl.get("bullets", []))
        return f"""{lbl(sl['label'], dash=True)}
<div style="margin-top:40px"><span class="pill">{sl['pill']}</span></div>
{title(sl['title'], ts or 150, 36)}
<p class="body" style="margin-top:46px;max-width:1300px">{sl.get('body','')}</p>
<div style="margin-top:48px;max-width:900px">{bl}</div>""", ""
    if k == "rows":
        def row(r):
            s_ = f'<div class="s">{r["sub"]}</div>' if r.get("sub") else ""
            sm = f'<small>{r["small"]}</small>' if r.get("small") else ""
            return f'<div class="row"><div><div class="n">{r["name"]}</div>{s_}</div><div class="d">{sm}{r["value"]}</div></div>'
        rh = "".join(row(r) for r in sl["rows"])
        return f"""{lbl(sl['label'])}{title(sl['title'], ts or 118)}{sub(sl.get('sub'))}<div style="margin-top:34px">{rh}</div>{note(sl.get('note'))}""", ""
    if k == "cards":
        def card(c):
            n_ = f'<div class="num">{c["num"]}</div>' if c.get("num") else ""
            t_ = f' <span>{c["tag"]}</span>' if c.get("tag") else ""
            return f'<div class="card">{n_}<h3>{c["h"]}{t_}</h3><p>{c["p"]}</p></div>'
        ch = "".join(card(c) for c in sl["cards"])
        return f"""{lbl(sl['label'])}{title(sl['title'], ts or 118)}{sub(sl.get('sub'))}<div style="margin-top:40px">{ch}</div>{note(sl.get('note'), 32)}""", ""
    if k == "grid":
        def cell(c):
            st_ = f"color:{Y}" if c.get("yellow") else ""
            s_ = f' <span>{c["sub"]}</span>' if c.get("sub") else ""
            return f'<div class="cell"><div class="v" style="{st_}">{c["v"]}</div><div class="k">{c["k"]}{s_}</div></div>'
        cells = "".join(cell(c) for c in sl["cells"])
        box = sl.get("box")
        bx = f'<div class="box" style="margin-top:26px"><div class="h">{box["h"]}</div><div class="x">{box["x"]}</div></div>' if box else ""
        return f"""{lbl(sl['label'])}{title(sl['title'], ts or 118)}{sub(sl.get('sub'))}<div class="grid" style="margin-top:34px">{cells}</div>{bx}""", ""
    if k == "table":
        h = sl["headers"]
        th = f'<div class="th"><span>{h[0]}</span><span class="tc" style="gap:60px"><span style="width:200px;text-align:right;white-space:nowrap">{h[1]}</span><span style="width:280px;text-align:right;white-space:nowrap">{h[2]}</span></span></div>'
        rows = "".join(f'<div class="row" style="padding:22px 0"><div class="n" style="font-size:42px">{r[0]}</div><div class="tc"><span class="a">{r[1]}</span><span class="b">{r[2]}</span></div></div>' for r in sl["rows"])
        return f"""{lbl(sl['label'])}{title(sl['title'], ts or 112)}{sub(sl.get('sub'))}<div style="margin-top:36px">{th}{rows}</div>{note(sl.get('note'), 26)}""", ""
    if k == "cta":
        return f"""{title(sl['title'], ts or 132, 0, glow_last=False)}
<div style="margin-top:44px"><span class="pill" style="font-size:78px;padding:18px 90px 20px;border-radius:999px">{sl.get('pill','SALVA')}</span></div>
<p class="body" style="margin-top:36px;font-size:48px;line-height:1.35">{sl.get('body','')}</p>
{f'<p class="note" style="margin-top:56px;max-width:1160px">{sl["note"]}</p>' if sl.get('note') else ''}
{f'<p class="note" style="margin-top:34px;max-width:1160px;font-size:28px">{sl["small"]}</p>' if sl.get('small') else ''}""", "center"
    raise ValueError(f"tipo de slide desconhecido: {k}")

def page(spec, sl, idx):
    inner, cls = build(sl)
    h = spec["header"]
    rev = " rev" if idx == 0 else ""
    return (f"<html><head><meta charset='utf-8'><style>{CSS}</style></head><body>"
            f"<div class='bar top{rev}'></div><div class='hdr'><span>{h[0]} <b>{h[1]}</b></span><span>@MED_EASYY</span></div>"
            f"<div id='content' class='{cls}'><div id='inner'>{inner}</div></div><div class='bar bot{rev}'></div></body></html>")

STORY = """<html><head><meta charset='utf-8'><style>
@font-face {{ font-family:'Anton'; src:url(data:font/ttf;base64,{anton}); }}
@font-face {{ font-family:'Jak'; src:url(data:font/ttf;base64,{jak}); font-weight:200 800; }}
* {{ margin:0; padding:0; box-sizing:border-box; }}
body {{ width:1080px; height:1920px; background:radial-gradient(ellipse at 70% 40%, #0d2a0c 0%, #050805 60%); font-family:'Jak'; color:#fff;
  display:flex; flex-direction:column; align-items:center; justify-content:center; gap:46px; overflow:hidden; }}
.bar {{ position:fixed; left:0; right:0; height:10px; background:linear-gradient(90deg,{g},#9ED61E 55%,#F5A524); }}
.pill {{ font-family:'Anton'; color:#0B0F0A; font-size:64px; padding:12px 46px 14px; border-radius:999px; background:linear-gradient(90deg,{g},#9BE02A 60%,{y}); box-shadow:0 0 40px rgba(62,242,58,.35); }}
img {{ width:900px; border-radius:28px; box-shadow:0 0 0 2px rgba(255,255,255,.08), 0 30px 80px rgba(0,0,0,.6), 0 0 60px rgba(62,242,58,.18); }}
p {{ font-size:46px; font-weight:600; text-align:center; line-height:1.3; max-width:900px; }}
p span {{ color:{g}; }}
</style></head><body><div class='bar' style='top:0'></div>
<div class='pill'>{kicker}</div><img src='data:image/jpeg;base64,{cover}'><p>{cta}</p>
<div class='bar' style='bottom:0'></div></body></html>"""

async def main(spec_path):
    spec = json.loads(pathlib.Path(spec_path).read_text())
    out = pathlib.Path(spec.get("out_dir", "out")) / spec["slug"]
    out.mkdir(parents=True, exist_ok=True)
    problems = []
    async with async_playwright() as p:
        b = await p.chromium.launch()
        pg = await b.new_page(viewport={"width": 1600, "height": 2000})
        for i, sl in enumerate(spec["slides"]):
            await pg.set_content(page(spec, sl, i), wait_until="load")
            await pg.wait_for_timeout(250)
            m = await pg.evaluate("""() => {
              const c = document.getElementById('content'), n = document.getElementById('inner');
              const cr = c.getBoundingClientRect(), nr = n.getBoundingClientRect();
              let wide = 0; document.querySelectorAll('#inner *').forEach(e => { const r = e.getBoundingClientRect(); if (r.right > 1506) wide++; });
              return {overflowY: Math.round(nr.height - cr.height), wide};
            }""")
            if m["overflowY"] > 0 or m["wide"] > 0:
                problems.append({"slide": i + 1, **m})
            png = out / f"_s{i+1}.png"
            await pg.screenshot(path=str(png))
            Image.open(png).convert("RGB").resize((1080, 1350), Image.LANCZOS).save(out / f"slide_{i+1}.jpg", quality=92)
            png.unlink()
        st = spec.get("story", {})
        html = STORY.format(anton=ANTON, jak=JAK, g=G, y=Y, kicker=st.get("kicker", "POST NOVO"),
                            cta=st.get("cta", "Já está no feed da <span>@med_easyy</span>.<br>Salva e manda pra quem vai prestar!"),
                            cover=b64(out / "slide_1.jpg"))
        await pg.set_viewport_size({"width": 1080, "height": 1920})
        await pg.set_content(html, wait_until="load")
        await pg.wait_for_timeout(250)
        await pg.screenshot(path=str(out / "_story.png"))
        Image.open(out / "_story.png").convert("RGB").save(out / "story.jpg", quality=92)
        (out / "_story.png").unlink()
        await b.close()
    (out / "check.json").write_text(json.dumps(problems, ensure_ascii=False, indent=1))
    print(json.dumps({"out": str(out), "slides": len(spec["slides"]), "problems": problems}, ensure_ascii=False))

if __name__ == "__main__":
    asyncio.run(main(sys.argv[1]))
