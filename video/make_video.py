import math, random, subprocess, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter

W, H, FPS = 1280, 720, 30
FB = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
FR = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
def font(s, b=True): return ImageFont.truetype(FB if b else FR, s)
random.seed(4)
STARS = [(random.randrange(W), random.randrange(H), random.random()) for _ in range(160)]

def clamp(x): return max(0.0, min(1.0, x))
def ease(x): x = clamp(x); return x*x*(3-2*x)
def lerp(a, b, t): return a+(b-a)*t

def gradient(top, bot):
    t = np.linspace(0, 1, H)[:, None, None]
    a = np.array(top)[None, None, :]; b = np.array(bot)[None, None, :]
    return Image.fromarray((np.repeat(a*(1-t)+b*t, W, axis=1)).astype('uint8'))

def stars(img, t, alpha=1.0):
    d = ImageDraw.Draw(img)
    for x, y, p in STARS:
        v = int((120 + 135*(0.5+0.5*math.sin(t*2+p*20)))*alpha)
        d.ellipse([x, y, x+2, y+2], fill=(v, v, min(255, v+20)))

def glow(img, draw_fn, radius, strength=1.0):
    layer = Image.new("RGB", (W, H), (0, 0, 0))
    draw_fn(ImageDraw.Draw(layer))
    g = layer.filter(ImageFilter.GaussianBlur(radius))
    arr = np.clip(np.asarray(img, dtype=np.float32) + np.asarray(g, dtype=np.float32)*strength, 0, 255)
    return Image.fromarray(arr.astype('uint8'))

def text_c(d, xy, s, f, fill, anchor="mm"):
    d.text(xy, s, font=f, fill=fill, anchor=anchor)

def caption(img, lines, t, dur):
    a = ease(t/0.6)*ease((dur-t)/0.5)
    if a <= 0: return img
    ov = Image.new("RGBA", (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(ov)
    f = font(30, False); h = 46*len(lines)+30
    d.rounded_rectangle([90, H-h-36, W-90, H-36], 18, fill=(5, 8, 20, int(190*a)))
    for i, l in enumerate(lines):
        d.text((W/2, H-h-36+15+23+i*46), l, font=f, fill=(255, 255, 255, int(255*a)), anchor="mm")
    return Image.alpha_composite(img.convert("RGBA"), ov).convert("RGB")

def heading(img, s, t, color=(255, 210, 90)):
    a = ease(t/0.5)
    ov = Image.new("RGBA", (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(ov)
    d.text((60, 52), s, font=font(40), fill=color+(int(255*a),), anchor="lm")
    return Image.alpha_composite(img.convert("RGBA"), ov).convert("RGB")

def earth_arc(img, cy=1500, r=1000, col=(20, 60, 110), rim=(90, 170, 255)):
    d = ImageDraw.Draw(img)
    d.ellipse([W/2-r, cy-r, W/2+r, cy+r], fill=col)
    img = glow(img, lambda g: g.ellipse([W/2-r, cy-r, W/2+r, cy+r], outline=rim, width=6), 14, 1.2)
    return img

def house(d, x, y, s, lit, t=0):
    wall = (60, 50, 45) if not lit else (140, 110, 80)
    d.rectangle([x, y-40*s, x+60*s, y], fill=wall)
    d.polygon([(x-6*s, y-40*s), (x+30*s, y-72*s), (x+66*s, y-40*s)], fill=(40, 30, 28) if not lit else (110, 55, 40))
    d.rectangle([x+22*s, y-24*s, x+38*s, y-4*s], fill=(255, 215, 110) if lit else (25, 25, 30))
    return

# ---------- scenes ----------
def s_title(t, dur):
    img = gradient((3, 6, 20), (12, 28, 64)); stars(img, t)
    img = earth_arc(img, cy=1260, r=900)
    # satellite icon
    x, y = W/2, 250+math.sin(t*2)*6
    def sat(d, c=(255, 200, 70)):
        d.rectangle([x-20, y-14, x+20, y+14], fill=c)
        for sgn in (-1, 1):
            d.polygon([(x+sgn*24, y-30), (x+sgn*140, y-40), (x+sgn*140, y+40), (x+sgn*24, y+30)], fill=c)
    img = glow(img, lambda g: sat(g), 18, 1.0)
    sat(ImageDraw.Draw(img), (255, 205, 80))
    d = ImageDraw.Draw(img); a = ease(t/1.0)
    c = int(255*a)
    text_c(d, (W/2, 410), "ORBITAL SUN MIRRORS", font(64), (c, c, c))
    text_c(d, (W/2, 480), "Свет из космоса — по запросу", font(34, False), (int(255*a), int(210*a), int(90*a)))
    text_c(d, (W/2, 660), "NASA Space Apps Challenge", font(24, False), (int(150*a), int(180*a), int(230*a)))
    return img

def s_problem(t, dur):
    img = gradient((2, 3, 10), (10, 14, 28)); stars(img, t, 0.7)
    d = ImageDraw.Draw(img)
    # ground
    d.rectangle([0, 520, W, H], fill=(18, 14, 12))
    d.polygon([(0, 520), (300, 470), (700, 510), (1000, 460), (W, 500), (W, 520)], fill=(14, 12, 12))
    # dark houses
    for x, s in [(180, 1.6), (360, 1.3), (560, 1.8), (800, 1.4)]:
        house(d, x, 560+ (s*8), s, False)
    # diesel generator + smoke
    gx = 1000
    d.rectangle([gx, 520, gx+90, 575], fill=(70, 60, 50)); d.rectangle([gx+60, 490, gx+72, 520], fill=(50, 45, 40))
    sm = Image.new("RGBA", (W, H), (0, 0, 0, 0)); sd = ImageDraw.Draw(sm)
    for i in range(26):
        p = ((t*0.5+i/26) % 1.0)
        px = gx+66+p*160+math.sin(p*9+i)*12; py = 485-p*330
        r = 14+p*70; al = int(110*(1-p))
        sd.ellipse([px-r, py-r, px+r, py+r], fill=(95, 95, 100, al))
    sm = sm.filter(ImageFilter.GaussianBlur(8))
    img = Image.alpha_composite(img.convert("RGBA"), sm).convert("RGB")
    # one dim flickering bulb
    fl = 0.4+0.6*abs(math.sin(t*7)*math.sin(t*3.1))
    img = glow(img, lambda g: g.ellipse([205, 520, 225, 540], fill=(int(200*fl), int(140*fl), 40)), 25, 1.0)
    img = heading(img, "1 · Проблема", t, (255, 120, 100))
    return caption(img, ["Миллионы людей живут без стабильного электричества.", "Дизельные генераторы и уголь загрязняют воздух."], t, dur)

def s_solution(t, dur):
    img = gradient((2, 4, 16), (8, 20, 50)); stars(img, t)
    img = earth_arc(img, cy=1330, r=980)
    # sun glow at left
    sx, sy = 120, 150
    img = glow(img, lambda g: g.ellipse([sx-40, sy-40, sx+40, sy+40], fill=(255, 220, 120)), 40, 2.0)
    d = ImageDraw.Draw(img); d.ellipse([sx-40, sy-40, sx+40, sy+40], fill=(255, 235, 160))
    cx, cy = 640, 300
    k = ease(t/2.5)  # mirror panels unfold
    # incoming sun rays
    ov = Image.new("RGBA", (W, H), (0, 0, 0, 0)); od = ImageDraw.Draw(ov)
    for off in (-30, -10, 10, 30):
        od.line([(sx+30, sy+off*0.6), (cx-110*k, cy-20+off*0.5)], fill=(255, 225, 130, 150), width=4)
    img = Image.alpha_composite(img.convert("RGBA"), ov).convert("RGB")
    def sat(d, col, ext):
        d.rectangle([cx-24, cy-18, cx+24, cy+18], fill=col)
        for sgn in (-1, 1):
            for j in range(3):
                x0 = cx+sgn*(30+ j*ext*0.33)
                d.polygon([(x0, cy-34), (x0+sgn*ext*0.3, cy-40), (x0+sgn*ext*0.3, cy+40), (x0, cy+34)], fill=col)
    ext = 40+160*k
    img = glow(img, lambda g: sat(g, (255, 200, 70), ext), 16, 1.0)
    sat(ImageDraw.Draw(img), (255, 205, 80), ext)
    # reflected beam toward earth after unfold
    b = ease((t-2.5)/1.5)
    if b > 0:
        ex, ey = cx+60, cy+(560-cy)*b
        def beam(g): g.polygon([(cx-6, cy+30), (cx+6, cy+30), (ex+34*b, ey), (ex-34*b, ey)], fill=(255, 215, 110))
        img = glow(img, beam, 14, 0.8)
        ImageDraw.Draw(img).polygon([(cx-6, cy+30), (cx+6, cy+30), (ex+20*b, ey), (ex-20*b, ey)], fill=(255, 238, 180))
    img = heading(img, "2 · Решение", t)
    return caption(img, ["Спутники-отражатели на орбите ловят солнечный свет", "и направляют его на Землю — без выбросов."], t, dur)

def phone(img, t, dur):
    px, py, pw, ph = 440, 20, 340, 540
    ov = Image.new("RGBA", (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(ov)
    d.rounded_rectangle([px, py, px+pw, py+ph], 38, fill=(20, 22, 30, 255), outline=(120, 130, 160, 255), width=4)
    sx0, sy0, sx1, sy1 = px+16, py+16, px+pw-16, py+ph-16
    d.rounded_rectangle([sx0, sy0, sx1, sy1], 26, fill=(14, 40, 70, 255))
    # map grid
    for i in range(1, 8):
        d.line([(sx0, sy0+60+i*34), (sx1, sy0+60+i*34)], fill=(30, 70, 110, 255), width=1)
        d.line([(sx0+i*40, sy0+60), (sx0+i*40, sy0+330)], fill=(30, 70, 110, 255), width=1)
    d.text((sx0+20, sy0+30), "Выберите участок", font=font(20), fill=(255, 255, 255, 255), anchor="lm")
    # pin drops
    pk = ease((t-1.0)/0.8); pyp = sy0+190-(1-pk)*80
    if pk > 0:
        d.ellipse([sx0+150, pyp-14, sx0+178, pyp+14], fill=(255, 190, 60, 255)); d.polygon([(sx0+150, pyp+6), (sx0+178, pyp+6), (sx0+164, pyp+34)], fill=(255, 190, 60, 255))
    # time picker
    d.rounded_rectangle([sx0+16, sy0+350, sx1-16, sy0+410], 14, fill=(30, 60, 100, 255))
    tp = ease((t-2.2)/0.6)
    d.text((sx0+34, sy0+380), "Время:", font=font(18, False), fill=(190, 210, 240, 255), anchor="lm")
    d.text((sx1-34, sy0+380), "19:00 – 22:00" if tp > 0.5 else "— : —", font=font(20), fill=(255, 215, 110, 255), anchor="rm")
    # pay button
    pb = ease((t-3.4)/0.6); paid = t > 4.6
    col = (60, 190, 110, 255) if paid else (255, 190, 60, 255)
    d.rounded_rectangle([sx0+16, sy0+430, sx1-16, sy0+500], 18, fill=col if pb > 0 else (60, 70, 90, 255))
    d.text(((sx0+sx1)/2, sy0+465), "✓ Оплачено" if paid else "Оплатить", font=font(26), fill=(10, 20, 20, 255), anchor="mm")
    return Image.alpha_composite(img.convert("RGBA"), ov).convert("RGB")

def s_app(t, dur):
    img = gradient((8, 14, 34), (16, 30, 62)); stars(img, t, 0.5)
    img = phone(img, t, dur)
    d = ImageDraw.Draw(img)
    steps = [("1", "Выбираете место на карте", 1.0), ("2", "Выбираете время", 2.2), ("3", "Оплачиваете заказ", 3.4)]
    for i, (n, s, ts) in enumerate(steps):
        a = ease((t-ts)/0.6); c = lambda v: int(v*a)
        y = 200+i*100
        d.ellipse([830, y-24, 878, y+24], outline=(c(255), c(200), c(80)), width=4)
        d.text((854, y), n, font=font(28), fill=(c(255), c(200), c(80)), anchor="mm")
        d.text((895, y), s, font=font(22, False), fill=(c(255), c(255), c(255)), anchor="lm")
    d.text((60, 300), "Всё — в", font=font(34), fill=(255, 255, 255), anchor="lm")
    d.text((60, 345), "одном", font=font(34), fill=(255, 255, 255), anchor="lm")
    d.text((60, 390), "приложении", font=font(34), fill=(255, 210, 90), anchor="lm")
    img = heading(img, "3 · Принцип", t)
    return caption(img, ["Выбираете точку, время, оплачиваете — и спутник", "поворачивает зеркала на ваш дом."], t, dur)

def s_effect(t, dur):
    img = gradient((2, 3, 10), (10, 16, 32)); stars(img, t, 0.5)
    k = ease(t/2.2)  # beam from top
    d = ImageDraw.Draw(img)
    d.rectangle([0, 480, W, H], fill=(18, 14, 12))
    bx = 640
    def beam(g):
        g.polygon([(bx-10, 0), (bx+10, 0), (bx+150*k, 500), (bx-150*k, 500)], fill=(255, 215, 110))
    if k > 0:
        img = glow(img, beam, 28, 0.9)
        ov = Image.new("RGBA", (W, H), (0, 0, 0, 0)); od = ImageDraw.Draw(ov)
        od.polygon([(bx-6, 0), (bx+6, 0), (bx+130*k, 500), (bx-130*k, 500)], fill=(255, 232, 170, 120))
        img = Image.alpha_composite(img.convert("RGBA"), ov).convert("RGB")
    d = ImageDraw.Draw(img)
    for x, s in [(300, 1.5), (480, 1.8), (700, 1.7), (900, 1.4)]:
        house(d, x, 520, s, k > 0.9)
    if k > 0.9:
        img = glow(img, lambda g: [g.rectangle([x+22*s, 520-24*s, x+38*s, 520-4*s], fill=(255, 200, 90)) for x, s in [(300, 1.5), (480, 1.8), (700, 1.7), (900, 1.4)]], 20, 1.2)
    # CO2 badge
    a = ease((t-2.4)/0.7)
    ov = Image.new("RGBA", (W, H), (0, 0, 0, 0)); od = ImageDraw.Draw(ov)
    od.rounded_rectangle([880, 90, 1220, 220], 22, fill=(10, 40, 30, int(220*a)), outline=(80, 220, 140, int(255*a)), width=3)
    od.text((1050, 140), "0 г CO₂", font=font(40), fill=(120, 240, 170, int(255*a)), anchor="mm")
    od.text((1050, 190), "нулевой углеродный след", font=font(17, False), fill=(200, 240, 220, int(255*a)), anchor="mm")
    img = Image.alpha_composite(img.convert("RGBA"), ov).convert("RGB")
    img = heading(img, "4 · Эффект", t, (120, 240, 170))
    return caption(img, ["Чистый, безопасный и доступный свет по требованию —", "энергия Солнца прямо из космоса."], t, dur)

def s_outro(t, dur):
    img = gradient((3, 6, 20), (14, 30, 66)); stars(img, t)
    img = glow(img, lambda g: g.ellipse([W/2-90, 150, W/2+90, 330], fill=(255, 210, 90)), 60, 1.6)
    d = ImageDraw.Draw(img); d.ellipse([W/2-70, 170, W/2+70, 310], fill=(255, 232, 160))
    a = ease(t/0.8); c = lambda v: int(v*a)
    text_c(d, (W/2, 420), "Свет для каждого дома.", font(52), (c(255), c(255), c(255)))
    text_c(d, (W/2, 490), "Чистая энергия Солнца — по запросу.", font(30, False), (c(255), c(210), c(90)))
    text_c(d, (W/2, 640), "NASA Space Apps Challenge", font(24, False), (c(150), c(180), c(230)))
    return img

SCENES = [(s_title, 5), (s_problem, 12), (s_solution, 15), (s_app, 15), (s_effect, 12), (s_outro, 4)]

def main(out):
    p = subprocess.Popen(["ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24",
                          "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-", "-c:v", "libx264", "-pix_fmt", "yuv420p",
                          "-crf", "18", "-preset", "medium", out], stdin=subprocess.PIPE)
    prev = None
    for fn, dur in SCENES:
        for i in range(dur*FPS):
            t = i/FPS
            img = fn(t, dur)
            # fade in/out between scenes
            f = min(ease(t/0.5), ease((dur-t)/0.5))
            if f < 1:
                img = Image.fromarray((np.asarray(img, dtype=np.float32)*f).astype('uint8'))
            p.stdin.write(img.tobytes())
    p.stdin.close(); p.wait()

if __name__ == "__main__":
    main(sys.argv[1])
