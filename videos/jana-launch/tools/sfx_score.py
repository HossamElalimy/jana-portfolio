"""The Rally — sound score on onetake's palette (one material set, one room).
Every event is a beat in index.html's timeline; pans follow where the ball is on screen."""
import os, sys
sys.path.insert(0, os.path.expanduser("~/.claude/skills/onetake/scripts"))
from sfx_palette import Score, air, glass, wood, sub, bubble, pan_of

DUR = 18.8
s = Score(dur=DUR, T60=1.0)
P = lambda x: pan_of(x, 1920)

def bounce(t, f=200, g=0.5, x=960):
    """A tennis-ball 'pok': a short wooden knock with a soft felt thump under it."""
    s.place(wood(f, 0.10), t, g, P(x), 0.22)
    s.place(sub(68, 0.22), t, g * 0.45, 0.0, 0.1)

def whip(t, g=0.2, pan_from=0.3, pan_to=-0.3):
    """The camera travelling: a breath of air across the stereo field."""
    s.place(air(0.45, 400, 2600, 1.3, 0.4), t, g, pan_from, 0.4, pan_to=pan_to)

# 1 · serve: the painted ball peels up, the racket hits, it comes at the lens, then falls down the sheet
s.place(air(0.55, 260, 1300, 1.3, 0.6), 1.00, 0.16, P(700), 0.45)
s.place(wood(150, 0.13), 1.55, 0.62, P(700), 0.25)
s.place(sub(62, 0.45), 1.55, 0.30, 0.0, 0.15)
s.place(air(0.45, 500, 3200, 1.2, 0.35), 1.58, 0.40, P(760), 0.4, pan_to=0.0)
s.place(air(0.75, 2600, 260, 1.3, 0.55), 2.02, 0.32, 0.0, 0.45, pan_to=-0.15)

# 2 · rally: bounces rising in pitch as it speeds up; a glass touch as each painting blooms
for t, f, gl in ((2.75, 190, 523), (3.95, 205, 587), (4.85, 220, 659), (5.50, 235, 784)):
    bounce(t, f, 0.55, 640)
    s.place(glass(gl, 0.9, 0.6), t + 0.06, 0.07, P(640), 0.55)

# 3 · Ball on Blue: a heavier landing, then near-silence while it melts in
bounce(6.00, 175, 0.62, 960)
s.place(sub(52, 1.1), 6.00, 0.32, 0.0, 0.3)
s.place(glass(1046, 1.6, 0.45), 6.55, 0.07, 0.0, 0.7)

# 4 · the site: the window opens around the painting, the ball lifts off the card, window to window
s.place(air(0.9, 2200, 280, 1.2, 0.5), 9.00, 0.20, 0.0, 0.5)
s.place(glass(659, 1.2, 0.5), 9.2, 0.06, 0.0, 0.6)
s.place(air(0.45, 300, 1500, 1.3, 0.6), 9.90, 0.16, P(1000), 0.4)
for t0, t in ((10.25, 10.75), (11.0, 11.50), (11.75, 12.25)):
    whip(t0 + 0.05, 0.18, 0.35, -0.35)
    bounce(t, 215, 0.48, 960)

# 5 · the long arc to the end card, one bounce on the red rule, a small settle into the full stop
s.place(air(1.2, 2400, 300, 1.2, 0.5), 12.40, 0.26, 0.35, 0.5, pan_to=0.0)
bounce(13.65, 200, 0.52, 960)
bounce(14.05, 245, 0.28, 1280)
s.place(bubble(560, 0.2), 14.07, 0.12, P(1280), 0.3)
s.place(glass(784, 1.4, 0.5), 15.36, 0.08, -0.05, 0.6)
s.place(glass(1175, 1.4, 0.45), 15.38, 0.06, 0.05, 0.6)
s.place(wood(260, 0.07), 16.30, 0.14, 0.0, 0.2)

s.write(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "assets", "sfx.wav"), peak_db=-8.0)
print("wrote assets/sfx.wav")
