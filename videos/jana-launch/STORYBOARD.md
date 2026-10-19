---
format: 1920x1080
duration: 20s
message: "Jana's work is getting a home — launching soon"
arc: Hook (serve) → Rally (the work, accelerating) → Hold (Ball on Blue) → The home (the site) → CTA
audience: "Jana's Instagram followers (@paintingsbyjanaaa) and art buyers"
mode: collaborative
music: warm upbeat feel-good indie-pop acoustic, celebratory summery instrumental, 110-125 BPM
build: single continuous take, authored inline (not per-frame workers) — one ball layer and one camera span every frame
---

# The Rally — launching-soon teaser for paintingsbyjana.vercel.app

> **Revision 2 (one take, 16:9, 18.8s).** No cuts: one camera over one sheet of drawing paper. Serve on Figure in Motion,
> then the camera falls with the ball down a column of paintings (rally, words on the right). It pushes into Ball on Blue
> and holds still. A desktop browser window of the site opens around the painting (its Fine-art card is the painting).
> The ball hops window to window (carousel, Court Club designs, Selected work) with motion-blurred whip-pans, then takes
> a long arc to the "paintingsbyjana." wordmark drawn on the same sheet. Voice: Kokoro af_heart (US English).
> Music: feel-good indie-pop. The v1 portrait cut is in tools/v1-portrait/.

One tennis ball carries the film. Paper ground (#f3f2f2), ink (#201e1d), one red accent (#ec3013), Archivo 900.
Paintings sit small on a lot of paper. The camera chases the ball down one long vertical plane, so every
painting lives at its own spot on that plane, and the ball's bounce is what makes each one appear.

**Rhythm (onetake):** shot lengths 2.0 · 1.4 · 1.0 · 0.7 · 0.5 · 3.8 (hold) · 0.3×4 (burst) · 4.6 (end). That is a spread of
more than 4×. There are two near-still stretches (the Ball on Blue hold and the end card). A hard-cut burst comes only once,
with the site screens.
**Carry:** the ball is on screen at every boundary. F1→F2 the ball comes back from the lens. F2→F3 the ball lands *in*
the blue painting. F3→F4 the camera pulls out until the painting is a card on the phone site. F4→F5 the ball drops out of
the card (as the site does), through the burst, and lands as the full stop in the wordmark.

## Frame 1 — Serve

- scene: Tight on Figure in Motion's racket. Her painted ball peels off the canvas and is served straight at the lens.
- voiceover: "Some paintings don't sit still."
- duration: 2.0s
- transition_in: cut
- status: animated
- src: index.html
- type: hook
- persuasion: Visual spectacle (the painting moves)
- beat: curiosity
- blueprint: none — a bespoke continuous take
- asset_candidates: assets/paintings/jana-painting-01.jpg — Figure in Motion, the painted ball sits left of the racket
- sfx: 0.55s racket "thwock" (wood + air)

narrativeRole: Stops the scroll in the first second. A painting that is still suddenly isn't, and the ball comes at you.
keyMessage: Jana's paintings are alive. Something is coming.

## Frame 2 — Rally

- scene: The ball drops back onto paper and bounces down the plane. Each bounce grows the next original out of the contact point (Medusa → Nefertiti → Gold Leaf → Lilac), and one heavy lowercase word slams in per bounce: "jana's" · "paintings" · "are getting" · "a home."
- voiceover: "Jana's paintings... are getting... a home."
- duration: 5.2s
- transition_in: cut (carried by the ball)
- status: animated
- src: index.html
- type: product_intro
- persuasion: Show-don't-tell proof (the real work, fast)
- beat: excitement building to anticipation
- asset_candidates: assets/paintings/jana-painting-03.jpg — Medusa; assets/paintings/jana-painting-04.jpg — Nefertiti; assets/paintings/jana-painting-05.jpg — Gold Leaf; assets/paintings/jana-painting-06.jpg — Lilac
- sfx: one bounce per contact at 2.6 / 4.0 / 5.0 / 5.7 / 6.2s (same ball and room, pitch rising slightly as the rally speeds up)

Bounce intervals shrink 1.4 → 1.0 → 0.7 → 0.5s, so the rally accelerates into the hold. A small mono counter (01/06 … 05/06)
ticks in the corner.

narrativeRole: Lands the message by beat 2. The words spell it out while the real work is the evidence.
keyMessage: "Jana's paintings are getting a home."

## Frame 3 — Ball on Blue (the hold)

- scene: The last bounce lands dead centre of a blue square. Ball on Blue grows around it, and the moving ball settles exactly on the painted ball and dissolves into its impasto. Near stillness for about 2.5s, with a small wall label beneath.
- voiceover: "Every brushstroke, up close."
- duration: 3.8s
- transition_in: cut (carried by the ball)
- status: animated
- src: index.html
- type: benefit_highlight
- persuasion: Invented — "the moving ball becomes the painted one" (the film's object turns into her work)
- beat: awe + calm
- asset_candidates: assets/paintings/jana-painting-02.jpg — Ball on Blue
- sfx: a soft landing "thud" then the music thins out (near-silence)

narrativeRole: The rest that makes the burst land. It is the film's signature image and the same hand-off the website does.
keyMessage: This is her work, up close.

## Frame 4 — The home

- scene: The camera pulls out. Ball on Blue is a card on her phone site, framed by huge "Fine art" type. The painted ball drops out of the card (the site's own move) and a burst of hard cuts follows (hero JANA, Selected work, Paintings carousel, About) as it falls.
- voiceover: "Her paintings, her designs, all in one place."
- duration: 4.0s
- transition_in: cut (carried by the ball / camera pull-out)
- status: animated
- src: index.html
- type: feature_showcase
- persuasion: Show-don't-tell proof (the real site)
- beat: excitement
- asset_candidates: mobile screenshots of the local build (hero, selected work, fine art + Ball on Blue card, paintings carousel, about); assets/hero-img.jpg — hero; assets/selected-work.jpg — selected work
- sfx: four hits on the cuts, same material, last one lighter

narrativeRole: Shows where the work will live, which is the "home" in the message.
keyMessage: A real site, made for her work.

## Frame 5 — Launching soon

- scene: Paper. The ball falls into frame, bounces once on the red stub rule, and lands as the full stop after JANA. "launching soon" sets beneath, then paintingsbyjana.vercel.app and @paintingsbyjanaaa in small mono.
- voiceover: "Paintings by Jana. Launching soon. Follow along so you don't miss it."
- duration: 4.6s
- transition_in: cut (carried by the ball)
- status: animated
- src: index.html
- type: cta
- persuasion: Scarcity/urgency (soon)
- beat: anticipation → motivation to follow
- asset_candidates: (typography-only) captured Archivo fonts
- sfx: final bounce plus a soft settle, music resolves

narrativeRole: Names her, says when (soon), and tells people where to look and who to follow.
keyMessage: JANA. Launching soon. paintingsbyjana.vercel.app
