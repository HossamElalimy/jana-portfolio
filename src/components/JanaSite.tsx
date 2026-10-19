"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type CSSProperties, type MouseEvent } from "react";
import { flushSync } from "react-dom";
import Image, { getImageProps, type StaticImageData } from "next/image";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";

import { copy } from "@/lib/content";
import { INSTAGRAM_HANDLE, INSTAGRAM_URL } from "@/lib/site";
import { ART_LIST, BY_ID, DESIGN_LIST, HERO, SELECTED, WORK, pad, type Kind } from "@/lib/works";
import studioWide from "@/assets/studio-wide.jpg";
import portrait from "@/assets/jana-portrait-bw.jpg";
import painting02 from "@/assets/jana-painting-02.jpg";
import heroVeil from "@/assets/jana-hero-veil.jpg";
import DitherVeil from "@/components/reactbits/DitherVeil";
import FlexCarousel, { type FlexCarouselItem } from "@/components/reactbits/FlexCarousel";

declare global {
  interface Window {
    __janaMotion?: boolean;
  }
}

type Filter = "all" | Kind;
type Inset = { top: string; right: string; bottom: string; left: string };

const NAV = ["work", "art", "design", "about", "contact"] as const;
const FILTERS: Filter[] = ["all", "art", "design"];
const ALL_IDS = WORK.map((w) => w.id);
const SLICES = Array.from({ length: 7 }, (_, i) => `${(i / 6) * 100}% 0%`);

// Hero window: closed → resting frame → full bleed. The images inside always
// fill the window with object-fit: cover, so they are shown whole, never zoomed.
const WIN_CLOSED: Inset = { top: "50%", right: "50%", bottom: "50%", left: "50%" };
const WIN_DESK: Inset = { top: "22%", right: "32%", bottom: "22%", left: "32%" };
const WIN_MOB: Inset = { top: "27%", right: "20%", bottom: "29%", left: "20%" };
const WIN_OPEN: Inset = { top: "0%", right: "0%", bottom: "0%", left: "0%" };

// Final state of the ball lifting out of the painting (see the cut timeline).
const LIFT = { scale: 1.38, yPercent: -34 };
const SLICES_END_SCALE = 0.9;

// Carousel layout (must match the FlexCarousel props below) and where the ball sits inside
// "Ball on Blue" (fractions of the painting), so the lifted ball can land exactly on it.
const CAROUSEL_CARD_HEIGHT = 0.56;
const CAROUSEL_CARD_HEIGHT_PHONE = 0.42; // smaller cards on narrow screens

const PHONE_QUERY = "(max-width: 899px)";
const subscribePhone = (onChange: () => void) => {
  const mq = window.matchMedia(PHONE_QUERY);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
};
const isPhone = () => window.matchMedia(PHONE_QUERY).matches;
const CAROUSEL_GAP = 12;
const CAROUSEL_IMAGE_ZOOM = 1.08; // the carousel shows each image slightly zoomed in its card
const BALL_IN_PAINTING = { x: 0.504, y: 0.479, d: 0.44 };

const canHover = () => window.matchMedia("(min-width: 900px) and (hover: hover)").matches;

/** A Next-optimised URL for a static image (the WebGL components load their own textures). */
const optimised = (img: StaticImageData, width: number) => `/_next/image?url=${encodeURIComponent(img.src)}&w=${width}&q=75`;

const CAROUSEL: FlexCarouselItem[] = ART_LIST.map((id) => {
  const w = BY_ID[id];
  return {
    src: optimised(w.img, 1080),
    alt: w.title,
    title: w.title,
    subtitle: w.real ? copy.art.original : copy.art.standIn,
  };
});

const VEIL_SRC = optimised(heroVeil, 1920);

/* ── Viewer images ───────────────────────────────────────────────────────
   The viewer shows an optimised, screen-sized copy (not the original file),
   downloaded ahead of time on hover/focus/press so opening feels instant. */
const VIEWER_SIZES = "(min-width: 900px) 84vw, 100vw";
type ViewerImage = { srcSet: string; src: string; sizes?: string; ready?: Promise<void> };
const viewerCache = new Map<string, ViewerImage>();

function viewerImage(id: string): ViewerImage {
  let v = viewerCache.get(id);
  if (!v) {
    const { props } = getImageProps({ src: BY_ID[id].img, alt: "", sizes: VIEWER_SIZES, quality: 85 });
    v = { srcSet: props.srcSet ?? "", src: props.src };
    viewerCache.set(id, v);
  }
  return v;
}

/** Width the work will occupy in the viewer, so the browser picks a file of that size. */
function viewerSlot(id: string): string {
  const stage = document.querySelector<HTMLElement>(".lb-stage");
  const { width, height } = BY_ID[id].img;
  if (!stage || !stage.clientWidth) return VIEWER_SIZES;
  return `${Math.round(Math.min(stage.clientWidth, stage.clientHeight * (width / height)))}px`;
}

/** Starts downloading and decoding a work's viewer image; resolves when it is ready. */
function warm(id: string): Promise<void> {
  const v = viewerImage(id);
  if (!v.ready) {
    // The same `sizes` is reused when the image is shown, so it hits this download.
    v.sizes = viewerSlot(id);
    const pre = new window.Image();
    pre.decoding = "async";
    pre.sizes = v.sizes;
    pre.srcset = v.srcSet;
    pre.src = v.src;
    v.ready = pre.decode().catch(() => undefined);
  }
  return v.ready;
}

function applyViewerImage(im: HTMLImageElement, id: string) {
  const v = viewerImage(id);
  im.sizes = v.sizes ?? viewerSlot(id);
  im.srcset = v.srcSet;
  im.src = v.src;
}

/** Sizes the viewer image to the largest box of the work's ratio that fits the stage. */
function fitViewerImage(im: HTMLImageElement, id: string) {
  const stage = im.parentElement;
  if (!stage) return;
  const { width, height } = BY_ID[id].img;
  const r = width / height;
  const w = Math.min(stage.clientWidth, stage.clientHeight * r);
  im.style.width = `${Math.round(w)}px`;
  im.style.height = `${Math.round(w / r)}px`;
}

/** Event handlers that pre-load a work's viewer image before it is opened. */
const primeProps = (id: string) => ({
  onPointerEnter: () => void warm(id),
  onPointerDown: () => void warm(id),
  onFocus: () => void warm(id),
});

export default function JanaSite() {
  const [filter, setFilter] = useState<Filter>("all");
  const [cur, setCur] = useState<string | null>(null);
  const [list, setList] = useState<string[]>([]);
  const [menuOpen, setMenuOpen] = useState(false);

  const menuRef = useRef<HTMLDivElement>(null);
  const menuBtnRef = useRef<HTMLButtonElement>(null);
  const menuCloseRef = useRef<HTMLButtonElement>(null);
  const pvRef = useRef<HTMLDivElement>(null);
  const ovRef = useRef<HTMLDivElement>(null);
  const ovBgRef = useRef<HTMLDivElement>(null);
  const ovImgRef = useRef<HTMLImageElement>(null);
  const ovCloseRef = useRef<HTMLButtonElement>(null);

  const lenisRef = useRef<Lenis | null>(null);
  const reduceRef = useRef(false);
  const curRef = useRef<string | null>(null);
  const listRef = useRef<string[]>([]);
  const menuOnRef = useRef(false);
  const closingRef = useRef(false);
  const steppingRef = useRef(false);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const pvShownRef = useRef(false);
  const zRef = useRef(1);
  const quickRef = useRef<{ x: gsap.QuickToFunc; y: gsap.QuickToFunc } | null>(null);
  const prevFilterRef = useRef<Filter>("all");
  const galRef = useRef<HTMLDivElement>(null);
  /** 0 → 1 as the hero portrait blows away on scroll (read by the veil every frame). */
  const veilDissolve = useRef(0);
  /** The carousel's active card, so the falling ball can find "Ball on Blue". */
  const carouselActive = useRef(0);
  const phone = useSyncExternalStore(subscribePhone, isPhone, () => false);
  const cardHeight = phone ? CAROUSEL_CARD_HEIGHT_PHONE : CAROUSEL_CARD_HEIGHT;
  /** Current card height, read by the falling ball's landing maths. */
  const cardHeightRef = useRef(cardHeight);
  useEffect(() => {
    cardHeightRef.current = cardHeight;
  }, [cardHeight]);

  /** Steps the carousel by sending it the arrow key it already understands. */
  const nudgeCarousel = (dir: 1 | -1) => {
    const el = galRef.current?.querySelector<HTMLElement>(".flex-carousel");
    el?.dispatchEvent(new KeyboardEvent("keydown", { key: dir > 0 ? "ArrowRight" : "ArrowLeft", bubbles: true }));
  };

  const lockScroll = useCallback((on: boolean) => {
    document.documentElement.style.overflow = on ? "hidden" : "";
    if (on) lenisRef.current?.stop();
    else lenisRef.current?.start();
  }, []);

  /* ── Hero: keep the name's paper-outline twin clipped to the window, whatever it is doing ── */
  const ghostRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const ghost = ghostRef.current;
    const win = document.querySelector<HTMLElement>("[data-hwin]");
    if (!ghost || !win) return;
    let id = 0;
    const sync = () => {
      const g = ghost.getBoundingClientRect();
      if (g.bottom > 0 && g.top < window.innerHeight) {
        const w = win.getBoundingClientRect();
        ghost.style.clipPath = `inset(${w.top - g.top}px ${g.right - w.right}px ${g.bottom - w.bottom}px ${w.left - g.left}px)`;
      }
      id = requestAnimationFrame(sync);
    };
    id = requestAnimationFrame(sync);
    return () => cancelAnimationFrame(id);
  }, []);

  /* ── Scroll choreography ─────────────────────────────────────────────── */
  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    window.__janaMotion = true;
    const root = document.documentElement;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    reduceRef.current = reduce;
    const touch = "ontouchstart" in window || window.matchMedia("(pointer: coarse)").matches;

    let lenis: Lenis | null = null;
    const raf = (time: number) => lenis?.raf(time * 1000);
    if (!reduce && !touch) {
      lenis = new Lenis({ lerp: 0.09 });
      lenisRef.current = lenis;
      lenis.on("scroll", ScrollTrigger.update);
      gsap.ticker.add(raf);
      gsap.ticker.lagSmoothing(0);
    }

    const mm = gsap.matchMedia();
    mm.add(
      { d: "(min-width: 900px)", m: "(max-width: 899px)", ok: "(prefers-reduced-motion: no-preference)" },
      (ctx) => {
        const { d, ok } = ctx.conditions as { d: boolean; ok: boolean };
        if (!ok) {
          root.classList.remove("js-motion");
          veilDissolve.current = 0;
          return;
        }
        const E = "expo.out";
        const $ = (sel: string) => gsap.utils.toArray<HTMLElement>(sel);
        const imgs = $("[data-hi]");
        const WIN = d ? WIN_DESK : WIN_MOB;

        // Hero intro
        const tl = gsap.timeline({ delay: 0.15 });
        tl.fromTo("[data-hwin]", WIN_CLOSED, { ...WIN, duration: 1.3, ease: "expo.inOut" }, 0).fromTo(
          "[data-hl]",
          { yPercent: 112 },
          { yPercent: 0, duration: 1.5, ease: E, stagger: 0.07 },
          0.35,
        );
        imgs.forEach((im, i) => {
          if (i)
            tl.fromTo(
              im,
              { clipPath: "inset(100% 0% 0% 0%)" },
              { clipPath: "inset(0% 0% 0% 0%)", duration: 0.8, ease: "expo.inOut" },
              0.7 + i * 0.42,
            );
        });
        // Once the portrait is in, hide the frames beneath it: as it slides to centre the face,
        // the gap above it shows the window's ink ground instead of the previous picture.
        tl.set(imgs.slice(0, -1), { autoAlpha: 0 }, 0.7 + (imgs.length - 1) * 0.42 + 0.8);
        tl.fromTo("[data-hsub]", { yPercent: 110 }, { yPercent: 0, duration: 1.1, ease: E, stagger: 0.08 }, "-=.7");
        // The hero is hidden by CSS until its intro has set its starting state.
        gsap.set("[data-hero-pre]", { opacity: 1 });

        // Hero: the window opens to full bleed as the name splits apart; the portrait slides
        // from "face centred in the window" to its full framing (hair, neck, shoulders, chest).
        // Where the face sits in the portrait image (fraction from the top) and its aspect ratio:
        const FACE_Y = 0.32, PORTRAIT_RATIO = 1.6;
        const faceOffset = () => {
          const vw = window.innerWidth, vh = window.innerHeight;
          const shown = Math.max(vh, vw / PORTRAIT_RATIO); // height of the image under "cover"
          return (0.5 - FACE_Y) * shown;
        };
        gsap
          .timeline({ scrollTrigger: { trigger: "[data-hero]", start: "top top", end: "+=110%", scrub: 0.8, pin: true, invalidateOnRefresh: true } })
          .fromTo("[data-hwin]", WIN, { ...WIN_OPEN, ease: "power2.inOut", immediateRender: false, duration: 1 }, 0)
          .fromTo(".hero-veil", { y: faceOffset }, { y: 0, ease: "power2.inOut", duration: 1 }, 0)
          // Over the dark portrait the name turns into a red outline with no fill
          .fromTo(".hero-title", { "--hl-fill": 1, "--hl-stroke": 0 }, { "--hl-fill": 0, "--hl-stroke": 1, ease: "power1.inOut", immediateRender: false, duration: 1 }, 0)
          .to('[data-hside="l"]', { xPercent: -80, ease: "power2.in", duration: 1 }, 0)
          .to('[data-hside="r"]', { xPercent: 80, ease: "power2.in", duration: 1 }, 0)
          .to("[data-hsubw]", { opacity: 0, y: -40, ease: "none", duration: 1 }, 0);

        // Then, as "Selected work" rises in, the portrait blows away like sand in the wind
        // (no pin here, so the next section arrives straight away — no empty screen).
        const veil = { v: 0 };
        gsap
          .timeline({ scrollTrigger: { trigger: "#work", start: "top bottom", end: "top 20%", scrub: 0.6 } })
          .to(veil, { v: 1, ease: "power1.in", duration: 1, onUpdate: () => void (veilDissolve.current = veil.v) }, 0)
          .to(".hero-title", { opacity: 0, ease: "none", duration: 0.5 }, 0.15);

        $("[data-rise]").forEach((el) =>
          gsap.from(el, { yPercent: 100, duration: 1.2, ease: E, scrollTrigger: { trigger: el.parentElement, start: "top 88%" } }),
        );

        gsap.set("[data-row] [data-rt]", { yPercent: 105 });
        ScrollTrigger.batch("[data-row]", {
          start: "top 94%",
          once: true,
          onEnter: (batch) =>
            gsap.to(
              batch.map((r) => r.querySelector("[data-rt]")),
              { yPercent: 0, duration: 1.1, ease: E, stagger: 0.07 },
            ),
        });

        // Featured painting: slices assemble, then the ball lifts off the canvas…
        const cut = document.querySelector<HTMLElement>("[data-cut]");
        const slices = document.querySelector<HTMLElement>("[data-slices]");
        const ballWrap = document.querySelector<HTMLElement>("[data-ballwrap]");
        const head = document.querySelector<HTMLElement>("[data-arthead]");
        if (cut && slices && ballWrap && head) {
          const off = [-62, 44, -30, 72, -48, 30, -70];
          gsap
            .timeline({ scrollTrigger: { trigger: cut, start: "top top", end: "+=170%", scrub: 0.8, pin: true } })
            .from("[data-sl]", { yPercent: (i: number) => off[i % 7], ease: "power3.out", duration: 1 }, 0)
            .from(slices, { scale: 0.8, rotate: -5, duration: 1, ease: "power2.out" }, 0)
            .fromTo("[data-arttype]", { xPercent: 4 }, { xPercent: -38, ease: "none", duration: 2.2 }, 0)
            .to("[data-ball]", { opacity: 1, duration: 0.02 }, 1.02)
            .to("[data-ball]", { ...LIFT, xPercent: 26, rotate: 14, duration: 1, ease: "power2.inOut" }, 1.05)
            .to(slices, { scale: SLICES_END_SCALE, xPercent: -6, duration: 1, ease: "power2.inOut" }, 1.05)
            .from("[data-cutcap]", { opacity: 0, y: 24, duration: 0.4 }, 1.5);

          // …then drops out of the painting, bounces on the "Paintings" rule, and keeps falling
          // with the scroll until it settles into "Ball on Blue" in the carousel below.
          // Positions come from layout (not transforms), so they stay right after any resize.
          const gal = document.querySelector<HTMLElement>("[data-gal]");
          const bounce = gsap.parseEase("bounce.out");
          const glide = gsap.parseEase("power2.inOut");
          const pageTop = (el: HTMLElement) => el.getBoundingClientRect().top + window.scrollY;

          /** Page position and diameter of the lifted ball while its wrapper has no offset. */
          const ballHome = () => {
            const cutTop = pageTop(head) - cut.offsetHeight; // the cut sits right above the heading once unpinned
            const cutLeft = cut.getBoundingClientRect().left + window.scrollX;
            const S = slices.offsetWidth;
            const h = ballWrap.offsetHeight;
            const lx = ballWrap.offsetLeft + h / 2 + 0.26 * h;
            const ly = ballWrap.offsetTop + h / 2 + (LIFT.yPercent / 100) * h;
            return {
              x: cutLeft + slices.offsetLeft + S / 2 - 0.06 * S + (lx - S / 2) * SLICES_END_SCALE,
              y: cutTop + slices.offsetTop + S / 2 + (ly - S / 2) * SLICES_END_SCALE,
              d: h * LIFT.scale * SLICES_END_SCALE,
            };
          };

          /** Page position and diameter of the painted ball in the "Ball on Blue" card. */
          const cardBall = () => {
            if (!gal) return null;
            const r = gal.getBoundingClientRect();
            const cardH = r.height * cardHeightRef.current;
            const widths = ART_LIST.map((id) => (BY_ID[id].img.width / BY_ID[id].img.height) * cardH);
            const centers: number[] = [];
            let run = 0;
            for (const w of widths) {
              centers.push(run + w / 2);
              run += w + CAROUSEL_GAP;
            }
            const target = ART_LIST.indexOf("a02");
            const rel = ((((centers[target] - centers[carouselActive.current] + run / 2) % run) + run) % run) - run / 2;
            const cw = widths[target];
            return {
              x: r.left + window.scrollX + r.width / 2 + rel + (BALL_IN_PAINTING.x - 0.5) * cw * CAROUSEL_IMAGE_ZOOM,
              y: pageTop(gal) + r.height / 2 + (BALL_IN_PAINTING.y - 0.5) * cardH * CAROUSEL_IMAGE_ZOOM,
              d: BALL_IN_PAINTING.d * cw * CAROUSEL_IMAGE_ZOOM,
            };
          };

          const flight = { p: 0 };
          const LAND = 0.42; // share of the scroll spent dropping and bouncing on the rule
          const place = () => {
            const p = flight.p;
            const home = ballHome();
            const landY = pageTop(head) + head.offsetHeight - 2 - home.d / 2;
            let px = home.x;
            let py: number;
            let scale = 1;
            let alpha = 1;
            if (p <= LAND) {
              py = home.y + (landY - home.y) * bounce(p / LAND);
            } else {
              const q = (p - LAND) / (1 - LAND);
              const e = glide(q);
              const to = cardBall();
              if (!to) {
                py = landY;
                alpha = 1 - q;
              } else {
                px = home.x + (to.x - home.x) * e;
                py = landY + (to.y - landY) * e - Math.sin(Math.PI * e) * 70; // a small hop on the way
                scale = 1 + (to.d / home.d - 1) * e;
                alpha = q < 0.84 ? 1 : 1 - (q - 0.84) / 0.16; // melt into the painted ball
              }
            }
            // The wrapper lives inside the scaled painting, so undo that scale; it scales around
            // the lifted ball's centre (76% / 16% of the wrapper).
            gsap.set(ballWrap, {
              x: (px - home.x) / SLICES_END_SCALE,
              y: (py - home.y) / SLICES_END_SCALE,
              scale,
              autoAlpha: alpha,
              transformOrigin: "76% 16%",
            });
          };
          gsap.to(flight, {
            p: 1,
            ease: "none",
            onUpdate: place,
            scrollTrigger: {
              trigger: head,
              start: "top bottom",
              endTrigger: gal ?? head,
              end: gal ? "center 55%" : "bottom 40%",
              scrub: 0.6,
              invalidateOnRefresh: true,
              onRefresh: place,
            },
          });
        }

        $("[data-dimg]").forEach((el) => {
          const im = el.querySelector("img");
          const t = gsap
            .timeline({ scrollTrigger: { trigger: el, start: "top 92%", end: "top 22%", scrub: 0.7 } })
            .fromTo(el, { clipPath: "inset(16% 14% 16% 14%)" }, { clipPath: "inset(0% 0% 0% 0%)", ease: "none" }, 0);
          if (im) t.fromTo(im, { scale: 1.2 }, { scale: 1, ease: "none" }, 0);
        });

        $("[data-dt]").forEach((el) =>
          gsap.fromTo(
            el,
            { yPercent: 105 },
            { yPercent: 0, duration: 1.2, ease: E, scrollTrigger: { trigger: el.parentElement, start: "top 92%" } },
          ),
        );

        // Looping lines (About, Contact): they keep moving on their own instead of
        // following the scroll, so the end of the page never freezes mid-sentence.
        // Speed is relative to the viewport, so it feels the same on every screen,
        // and each loop only runs while it is on screen.
        const speed = window.innerWidth * 0.045; // px per second
        $("[data-marquee]").forEach((el) => {
          const reverse = el.dataset.marquee === "r";
          const duration = el.scrollWidth / 2 / speed;
          gsap.fromTo(
            el,
            { xPercent: reverse ? -50 : 0 },
            {
              xPercent: reverse ? 0 : -50,
              ease: "none",
              duration,
              repeat: -1,
              scrollTrigger: { trigger: el, start: "top bottom", end: "bottom top", toggleActions: "play pause resume pause" },
            },
          );
        });

        $("[data-kin]").forEach((el) => {
          const r = el.dataset.kin === "r";
          gsap.fromTo(
            el,
            { xPercent: r ? -30 : 5 },
            {
              xPercent: r ? 5 : -30,
              ease: "none",
              scrollTrigger: { trigger: el.parentElement, start: "top bottom", end: "bottom top", scrub: 0.8 },
            },
          );
        });

        if (document.querySelector("[data-portrait]")) {
          gsap.fromTo(
            "[data-portrait]",
            { clipPath: "inset(32% 22% 32% 22%)" },
            {
              clipPath: "inset(0% 0% 0% 0%)",
              ease: "none",
              scrollTrigger: { trigger: "[data-portrait]", start: "top 95%", end: "center 55%", scrub: 0.8 },
            },
          );
          gsap.fromTo(
            "[data-portrait] img",
            { scale: 1.2 },
            { scale: 1, ease: "none", scrollTrigger: { trigger: "[data-portrait]", start: "top 95%", end: "bottom 30%", scrub: 0.8 } },
          );
          gsap.fromTo(
            "[data-abball]",
            { yPercent: 70, rotate: -24 },
            { yPercent: -90, rotate: 22, ease: "none", scrollTrigger: { trigger: "[data-about]", start: "top bottom", end: "bottom top", scrub: 0.8 } },
          );
        }
      },
    );

    // Pins change the page height, so honour a #hash only once layout is final.
    let jumped = false;
    const settle = () => {
      ScrollTrigger.refresh();
      if (jumped || location.hash.length < 2) return;
      jumped = true;
      const target = document.getElementById(decodeURIComponent(location.hash.slice(1)));
      if (!target) return;
      const y = target.getBoundingClientRect().top + window.scrollY;
      if (lenis) lenis.scrollTo(y, { immediate: true });
      else window.scrollTo(0, y);
    };
    if (document.readyState === "complete") requestAnimationFrame(settle);
    else window.addEventListener("load", settle, { once: true });
    const late = window.setTimeout(() => ScrollTrigger.refresh(), 1500);
    document.fonts?.ready.then(() => ScrollTrigger.refresh());

    return () => {
      window.removeEventListener("load", settle);
      window.clearTimeout(late);
      mm.revert();
      gsap.ticker.remove(raf);
      lenis?.destroy();
      lenisRef.current = null;
    };
  }, []);

  /* ── Filter: re-reveal the rows and re-measure the pins below ─────────── */
  useEffect(() => {
    if (prevFilterRef.current === filter) return;
    prevFilterRef.current = filter;
    if (!reduceRef.current)
      gsap.fromTo("[data-rt]", { yPercent: 105 }, { yPercent: 0, duration: 0.9, ease: "expo.out", stagger: 0.05 });
    ScrollTrigger.refresh();
  }, [filter]);

  /* ── Menu ─────────────────────────────────────────────────────────────── */
  const menu = useCallback(
    (on: boolean, restoreFocus = true) => {
      const el = menuRef.current;
      if (!el || on === menuOnRef.current) return;
      menuOnRef.current = on;
      flushSync(() => setMenuOpen(on));
      lockScroll(on);
      if (on) {
        el.style.visibility = "visible";
        menuCloseRef.current?.focus({ preventScroll: true });
      } else if (restoreFocus) {
        menuBtnRef.current?.focus({ preventScroll: true });
      }
      if (reduceRef.current) {
        if (!on) el.style.visibility = "hidden";
        return;
      }
      gsap.killTweensOf(el);
      if (on) {
        gsap.fromTo(el, { clipPath: "inset(0% 0% 100% 0%)" }, { clipPath: "inset(0% 0% 0% 0%)", duration: 0.8, ease: "expo.inOut" });
        gsap.fromTo(
          el.querySelectorAll("[data-mli]"),
          { yPercent: 110 },
          { yPercent: 0, duration: 0.9, ease: "expo.out", stagger: 0.06, delay: 0.35 },
        );
      } else {
        gsap.to(el, {
          clipPath: "inset(100% 0% 0% 0%)",
          duration: 0.7,
          ease: "expo.inOut",
          onComplete: () => gsap.set(el, { visibility: "hidden" }),
        });
      }
    },
    [lockScroll],
  );

  const go = useCallback(
    (href: string, e?: MouseEvent) => {
      e?.preventDefault();
      if (menuOnRef.current) menu(false, false);
      const target = document.querySelector<HTMLElement>(href);
      if (!target) return;
      const y = target.getBoundingClientRect().top + window.scrollY;
      if (lenisRef.current) lenisRef.current.scrollTo(y, { duration: 1.6 });
      else window.scrollTo({ top: y, behavior: reduceRef.current ? "auto" : "smooth" });
      history.replaceState(null, "", href === "#top" ? location.pathname : href);
      target.focus({ preventScroll: true });
    },
    [menu],
  );

  /* ── Lightbox ─────────────────────────────────────────────────────────── */
  const open = useCallback(
    (id: string, trigger: HTMLElement | null, ids: string[]) => {
      if (curRef.current) return;
      const ov = ovRef.current;
      const im = ovImgRef.current;
      if (!ov || !im) return;
      returnFocusRef.current = trigger;

      // Measure where the image is now, so it can fly into the viewer.
      let from: DOMRect | null = null;
      const src = trigger?.querySelector("img");
      if (src && getComputedStyle(src).visibility !== "hidden") {
        const b = src.getBoundingClientRect();
        if (b.width > 2 && b.bottom > 0 && b.top < window.innerHeight) from = b;
      }
      if (!from && pvShownRef.current && pvRef.current) from = pvRef.current.getBoundingClientRect();

      // Open instantly on the copy the browser already has (the thumbnail that was
      // clicked, or the hover preview), then swap in the sharp copy once it is ready.
      const thumbs = [src, pvRef.current?.querySelector<HTMLImageElement>(`[data-id="${id}"]`)];
      const cached = thumbs.find((t) => t && t.complete && t.naturalWidth > 0)?.currentSrc;
      const ready = warm(id);
      const i = ids.indexOf(id);
      void warm(ids[(i + 1) % ids.length]);
      void warm(ids[(i - 1 + ids.length) % ids.length]);

      curRef.current = id;
      listRef.current = ids;
      flushSync(() => {
        setList(ids);
        setCur(id);
      });
      lockScroll(true);
      fitViewerImage(im, id);
      if (cached) {
        im.removeAttribute("srcset");
        im.removeAttribute("sizes");
        im.src = cached;
        ready.then(() => {
          if (curRef.current === id) applyViewerImage(im, id);
        });
      } else {
        applyViewerImage(im, id);
      }

      const show = () => {
        if (curRef.current !== id) return;
        ov.style.visibility = "visible";
        ovCloseRef.current?.focus({ preventScroll: true });
        if (reduceRef.current) return;
        gsap.fromTo(ovBgRef.current, { clipPath: "inset(100% 0% 0% 0%)" }, { clipPath: "inset(0% 0% 0% 0%)", duration: 0.75, ease: "expo.inOut" });
        const to = im.getBoundingClientRect();
        if (from && to.width)
          gsap.fromTo(
            im,
            { x: from.left - to.left, y: from.top - to.top, scale: from.width / to.width, transformOrigin: "0 0" },
            { x: 0, y: 0, scale: 1, duration: 0.95, ease: "expo.inOut" },
          );
        else
          gsap.fromTo(im, { clipPath: "inset(100% 0% 0% 0%)" }, { clipPath: "inset(0% 0% 0% 0%)", duration: 0.85, ease: "expo.inOut", delay: 0.1 });
        gsap.fromTo("[data-om]", { yPercent: 110 }, { yPercent: 0, duration: 0.9, ease: "expo.out", stagger: 0.06, delay: 0.4 });
      };
      im.decode().then(show, show);
    },
    [lockScroll],
  );

  const close = useCallback(() => {
    const ov = ovRef.current;
    if (!curRef.current || closingRef.current || !ov) return;
    closingRef.current = true;
    const done = () => {
      ov.style.visibility = "hidden";
      curRef.current = null;
      closingRef.current = false;
      steppingRef.current = false;
      flushSync(() => setCur(null));
      lockScroll(false);
      returnFocusRef.current?.focus({ preventScroll: true });
    };
    if (reduceRef.current) return done();
    gsap.killTweensOf([ovImgRef.current, ovBgRef.current, "[data-om]"]);
    gsap.to(ov.children, {
      clipPath: "inset(0% 0% 100% 0%)",
      duration: 0.65,
      ease: "expo.inOut",
      onComplete: () => {
        gsap.set(ov.children, { clearProps: "clipPath" });
        gsap.set(ovImgRef.current, { clearProps: "transform,clipPath" });
        done();
      },
    });
  }, [lockScroll]);

  const step = useCallback((dir: 1 | -1) => {
    const now = curRef.current;
    const im = ovImgRef.current;
    if (!now || !im || steppingRef.current || closingRef.current) return;
    const ids = listRef.current.length ? listRef.current : ALL_IDS;
    const id = ids[(ids.indexOf(now) + dir + ids.length) % ids.length];
    steppingRef.current = true;
    const at = ids.indexOf(id);
    void warm(ids[(at + dir + ids.length) % ids.length]);
    // The next image was pre-loaded when the viewer opened, so this rarely waits.
    const swap = () =>
      warm(id).then(() => {
        if (curRef.current !== now) return;
        fitViewerImage(im, id);
        applyViewerImage(im, id);
        curRef.current = id;
        setCur(id);
        const reveal = () => {
          steppingRef.current = false;
          if (reduceRef.current) return;
          gsap.fromTo(
            im,
            { clipPath: dir > 0 ? "inset(0% 0% 0% 100%)" : "inset(0% 100% 0% 0%)" },
            { clipPath: "inset(0% 0% 0% 0%)", duration: 0.8, ease: "expo.out" },
          );
          gsap.fromTo("[data-om]", { yPercent: 110 }, { yPercent: 0, duration: 0.8, ease: "expo.out", stagger: 0.05 });
        };
        im.decode().then(reveal, reveal);
      });
    if (reduceRef.current) return void swap();
    gsap.to(im, { clipPath: dir > 0 ? "inset(0% 100% 0% 0%)" : "inset(0% 0% 0% 100%)", duration: 0.45, ease: "expo.in", onComplete: swap });
  }, []);

  /* ── Keep the viewer image fitted when the window changes size ────────── */
  useEffect(() => {
    const onResize = () => {
      const id = curRef.current;
      const im = ovImgRef.current;
      if (id && im) fitViewerImage(im, id);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  /* ── Keyboard: Escape, arrows in the viewer, and a focus trap for dialogs */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (curRef.current) close();
        else if (menuOnRef.current) menu(false);
        return;
      }
      if (curRef.current && (e.key === "ArrowRight" || e.key === "ArrowLeft")) {
        step(e.key === "ArrowRight" ? 1 : -1);
        return;
      }
      if (e.key !== "Tab") return;
      const box = curRef.current ? ovRef.current : menuOnRef.current ? menuRef.current : null;
      if (!box) return;
      const items = Array.from(box.querySelectorAll<HTMLElement>("a[href], button:not([disabled])"));
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (!box.contains(active)) {
        e.preventDefault();
        first.focus();
      } else if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close, menu, step]);

  /* ── Cursor-follow preview on the work list (desktop with a mouse) ────── */
  const pvEnter = (id: string) => {
    const pv = pvRef.current;
    if (!pv || !canHover()) return;
    const im = pv.querySelector<HTMLElement>(`[data-id="${id}"]`);
    if (!im) return;
    // The preview takes the shape of the hovered image, so it is never cropped.
    const { width, height } = BY_ID[id].img;
    const h = pv.offsetWidth * (height / width);
    zRef.current += 1;
    im.style.zIndex = String(zRef.current);
    gsap.fromTo(im, { clipPath: "inset(100% 0% 0% 0%)" }, { clipPath: "inset(0% 0% 0% 0%)", duration: 0.7, ease: "expo.out" });
    if (!pvShownRef.current) {
      pvShownRef.current = true;
      gsap.set(pv, { height: h });
      gsap.to(pv, { autoAlpha: 1, duration: 0.3 });
    } else {
      gsap.to(pv, { height: h, duration: 0.6, ease: "expo.out" });
    }
    gsap.to("[data-rt]", {
      opacity: (_: number, el: HTMLElement) => (el.dataset.id === id ? 1 : 0.2),
      x: (_: number, el: HTMLElement) => (el.dataset.id === id ? 18 : 0),
      duration: 0.5,
      ease: "power3.out",
    });
  };

  const pvMove = (e: MouseEvent) => {
    const pv = pvRef.current;
    if (!pv || !canHover()) return;
    if (!quickRef.current)
      quickRef.current = {
        x: gsap.quickTo(pv, "x", { duration: 0.7, ease: "power3" }),
        y: gsap.quickTo(pv, "y", { duration: 0.7, ease: "power3" }),
      };
    quickRef.current.x(e.clientX - pv.offsetWidth * 0.5);
    quickRef.current.y(e.clientY - pv.offsetHeight * 0.5);
  };

  const pvLeave = () => {
    if (!pvShownRef.current) return;
    pvShownRef.current = false;
    gsap.to(pvRef.current, { autoAlpha: 0, duration: 0.3 });
    gsap.to("[data-rt]", { opacity: 1, x: 0, duration: 0.5 });
  };

  const selected = SELECTED.filter((id) => filter === "all" || BY_ID[id].kind === filter);
  const cw = cur ? BY_ID[cur] : null;
  const paintingVar = { "--painting": `url(${painting02.src})` } as CSSProperties;

  return (
    <>
      <a href="#main" className="skip-link">
        {copy.skip}
      </a>

      <div id="page" inert={!!cur || menuOpen} style={paintingVar}>
        <header className="site-header">
          <a href="#top" onClick={(e) => go("#top", e)} className="brand" aria-label={`${copy.brand} — ${copy.brandSub}`}>
            <span className="brand-name">{copy.brand}</span>
            <span className="brand-sub">{copy.brandSub}</span>
          </a>
          <nav aria-label={copy.navLabel} className="nav-desktop">
            {NAV.map((k) => (
              <a key={k} href={`#${k}`} onClick={(e) => go(`#${k}`, e)}>
                {copy.nav[k]}
              </a>
            ))}
          </nav>
          <button
            ref={menuBtnRef}
            type="button"
            className="menu-btn"
            aria-expanded={menuOpen}
            aria-controls="site-menu"
            onClick={() => menu(true)}
          >
            {copy.menu}
          </button>
        </header>

        <main id="main" tabIndex={-1}>
          {/* ── Hero ── */}
          <section id="top" data-hero="" className="hero" aria-label={copy.hero.label} tabIndex={-1}>
            <div data-hwin="" data-hero-pre="" className="hero-win">
              {HERO.map((img, i) => (
                <Image
                  key={img.src}
                  data-hi=""
                  src={img}
                  alt=""
                  fill
                  // Only ever seen inside the small window; the portrait covers them at full bleed.
                  sizes="(min-width: 900px) 40vw, 64vw"
                  quality={85}
                  // Frames start inside a closed window and are revealed in sequence, so none is preloaded.
                  fetchPriority={i === 0 ? "high" : "auto"}
                  placeholder="blur"
                  className="hero-img"
                />
              ))}
              {/* Jana, dithered in ink on paper; the cursor (or a slow wander on touch) reveals the photo. */}
              <div data-hi="" className="hero-veil">
                <DitherVeil
                  src={VEIL_SRC}
                  fit="cover"
                  pattern="floyd"
                  pixelSize={2}
                  levels={2}
                  palette="duotone"
                  inkColor="#201e1d"
                  paperColor="#f3f2f2"
                  contrast={1.2}
                  brightness={0.02}
                  revealRadius={170}
                  softness={0.6}
                  linger={1.1}
                  rimColor="#ec3013"
                  rim={0.22}
                  wander
                  clickBurst
                  twinkle
                  dissolve={veilDissolve}
                />
              </div>
            </div>
            <h1 className="hero-title" data-hero-pre="">
              <span className="sr-only">{copy.hero.h1}</span>
              <span data-hside="l" aria-hidden="true" className="hero-side">
                <HeroLetter>J</HeroLetter>
                <HeroLetter>A</HeroLetter>
              </span>
              <span data-hside="r" aria-hidden="true" className="hero-side">
                <HeroLetter>N</HeroLetter>
                <HeroLetter>A</HeroLetter>
              </span>
            </h1>
            {/* Where the name crosses the dark window its ink letters vanish, so a twin of the name,
                clipped to the window, redraws them there as a fine paper outline. It shares the
                letters' data hooks, so it rises, splits and fades with them. */}
            <div ref={ghostRef} data-hero-pre="" aria-hidden="true" className="hero-title hero-ghost">
              <span data-hside="l" className="hero-side">
                <HeroLetter>J</HeroLetter>
                <HeroLetter>A</HeroLetter>
              </span>
              <span data-hside="r" className="hero-side">
                <HeroLetter>N</HeroLetter>
                <HeroLetter>A</HeroLetter>
              </span>
            </div>
            <div data-hsubw="" data-hero-pre="" className="hero-sub" aria-hidden="true">
              <span className="mask">
                <span data-hsub="" className="hero-sub-text">
                  {copy.hero.sub1}
                </span>
              </span>
              <span className="mask">
                <span data-hsub="" className="hero-sub-text">
                  {copy.hero.sub2}
                </span>
              </span>
            </div>
          </section>

          {/* ── Selected work ── */}
          <section id="work" className="work" aria-labelledby="work-title" tabIndex={-1}>
            <div className="section-head">
              <div className="mask">
                <h2 id="work-title" data-rise="" className="h2 display">
                  {copy.work.title}
                </h2>
              </div>
              <div role="group" aria-label={copy.work.filterLabel} className="filters">
                {FILTERS.map((f) => (
                  <button key={f} type="button" aria-pressed={filter === f} className="filter" onClick={() => setFilter(f)}>
                    {copy.work.filters[f]}
                  </button>
                ))}
              </div>
            </div>
            <div className="rows" onMouseMove={pvMove} onMouseLeave={pvLeave}>
              {selected.map((id, i) => {
                const w = BY_ID[id];
                return (
                  <button
                    key={id}
                    type="button"
                    data-row=""
                    className="row"
                    aria-haspopup="dialog"
                    aria-label={`${copy.work.open} ${w.title}`}
                    onClick={(e) => open(id, e.currentTarget, selected)}
                    onMouseEnter={() => pvEnter(id)}
                    {...primeProps(id)}
                  >
                    <span className="row-main">
                      <span className="row-num">{pad(i + 1)}</span>
                      <span className="row-body">
                        <span className="mask row-mask">
                          <span data-rt="" data-id={id} className="row-title display">
                            {w.title}
                          </span>
                        </span>
                        <span className="row-sub" aria-hidden="true">
                          <span className="b">{copy.kinds[w.kind]}</span> · {w.label}
                        </span>
                      </span>
                    </span>
                    <span className="row-meta">
                      <span className="row-meta-text">
                        <span className="b">{copy.kinds[w.kind]}</span>
                        <span>{w.label}</span>
                      </span>
                      <Image src={w.img} alt="" width={64} height={64} sizes="64px" className="row-thumb" />
                    </span>
                  </button>
                );
              })}
              <div ref={pvRef} aria-hidden="true" className="preview">
                {SELECTED.map((id) => (
                  <Image key={id} data-id={id} src={BY_ID[id].img} alt="" fill sizes="440px" className="preview-img" />
                ))}
              </div>
            </div>
            <p className="note">{copy.work.note}</p>
          </section>

          {/* ── Art ── */}
          <section id="art" className="art" aria-labelledby="art-title" tabIndex={-1}>
            <div data-cut="" className="cut">
              <div data-arttype="" aria-hidden="true" className="cut-type display">
                {copy.art.marquee}
              </div>
              <div data-slices="" role="img" aria-label={copy.art.featuredAria} className="slices">
                {SLICES.map((pos) => (
                  <span key={pos} data-sl="" className="slice" style={{ backgroundPosition: pos }} />
                ))}
                <span data-ballwrap="" aria-hidden="true" className="ball-wrap">
                  <span data-ball="" className="ball" />
                </span>
              </div>
              <div data-cutcap="" className="cut-cap">
                <span className="b">{copy.art.featuredTitle}</span>
                <span>{copy.art.featuredCaption}</span>
              </div>
            </div>

            <div data-arthead="" className="section-head art-head">
              <div className="mask">
                <h2 id="art-title" data-rise="" className="h2 display">
                  {copy.art.title}
                </h2>
              </div>
              <p className="intro">{copy.art.intro}</p>
            </div>
            <div className="gal-block">
            <div className="gal-controls">
              <span className="gal-hint" aria-hidden="true">
                <span className="gal-hint-arrow gal-hint-arrow-l">←</span>
                <span className="gal-hint-long">{copy.art.browseHint}</span>
                <span className="gal-hint-short">{copy.art.browseHintShort}</span>
                <span className="gal-hint-arrow gal-hint-arrow-r">→</span>
              </span>
              <div className="gal-nav">
                <button type="button" aria-label={copy.art.prevPainting} onClick={() => nudgeCarousel(-1)}>
                  ←
                </button>
                <button type="button" aria-label={copy.art.nextPainting} onClick={() => nudgeCarousel(1)}>
                  →
                </button>
              </div>
            </div>
            <div ref={galRef} data-gal="" className="gal-carousel">
              <FlexCarousel
                items={CAROUSEL}
                preset="liquid"
                intro="rise"
                cardHeight={cardHeight}
                gap={CAROUSEL_GAP}
                onChange={(index) => {
                  carouselActive.current = index;
                }}
                squeeze={0.2}
                fit="natural"
                radius={0}
                focusOnClick
                captions
                // Vertical wheel keeps scrolling the page; drag, swipe, arrows and sideways wheel move the carousel.
                captureWheel={false}
              />
            </div>
            </div>

            <figure className="studio">
              <div data-dimg="" className="studio-img">
                <Image
                  src={studioWide}
                  alt={copy.art.studioAlt}
                  fill
                  sizes="100vw"
                  placeholder="blur"
                  className="cover"
                />
              </div>
              <figcaption className="studio-cap">
                <span className="b">{copy.art.studioTitle}</span>
                <span>{copy.art.studioCaption}</span>
              </figcaption>
            </figure>
          </section>

          {/* ── Graphic design ── */}
          <section id="design" className="design" aria-labelledby="design-title" tabIndex={-1}>
            <h2 id="design-title" className="sr-only">
              {copy.design.label}
            </h2>
            <div className="mask kin-pad">
              <div data-kin="l" aria-hidden="true" className="kin kin-design display">
                {copy.design.marquee}
              </div>
            </div>
            <div className="section-head design-head">
              <p className="lead">{copy.design.intro}</p>
              <span className="muted-light">{copy.design.disclaimer}</span>
            </div>

            <DesignCard id="d01" n={1} className="d-1" sizes="100vw" onOpen={open} />
            <DesignCard id="d02" n={2} className="d-2" sizes="(min-width: 1180px) 1100px, 100vw" onOpen={open} />
            <div className="d-pair">
              <DesignCard id="d03" n={3} className="d-3" sizes="(min-width: 760px) 50vw, 100vw" onOpen={open} />
              <DesignCard id="d04" n={4} className="d-4" sizes="(min-width: 760px) 520px, 100vw" onOpen={open} />
            </div>
          </section>

          {/* ── About ── */}
          <section id="about" data-about="" className="about" aria-labelledby="about-title" tabIndex={-1}>
            <div className="about-stage">
              <div aria-hidden="true" className="about-kin about-kin-top">
                <Marquee text={copy.about.marquee1} repeat={4} className="kin kin-about display" />
              </div>
              <figure data-portrait="" className="portrait">
                <Image src={portrait} alt={copy.about.portraitAlt} fill sizes="(min-width: 900px) 46vh, 64vw" className="cover portrait-img" />
              </figure>
              <span data-abball="" aria-hidden="true" className="about-ball" />
              <div aria-hidden="true" className="about-kin about-kin-bottom">
                <Marquee text={copy.about.marquee2} repeat={4} reverse className="kin kin-about kin-red display" />
              </div>
            </div>
            <div className="about-text">
              <h2 id="about-title" className="about-title display">
                {copy.about.title}
              </h2>
              <p className="lead about-body">{copy.about.body}</p>
            </div>
          </section>

          {/* ── Contact ── */}
          <section id="contact" data-contact="" className="contact" aria-labelledby="contact-title" tabIndex={-1}>
            <h2 id="contact-title" className="sr-only">
              {copy.contact.label}
            </h2>
            <div className="mask">
              <Marquee text={copy.contact.marquee} repeat={3} className="kin kin-contact display" />
            </div>
            <div className="contact-grid">
              <div className="contact-main">
                <span className="kicker">{copy.contact.kicker}</span>
                <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer me" className="ig">
                  {INSTAGRAM_HANDLE}&nbsp;↗
                </a>
              </div>
              <p className="lead">{copy.contact.cta}</p>
            </div>
            <footer className="footer">
              <span>{copy.contact.copyright}</span>
              <span>{copy.contact.previewNote}</span>
              <a href="#top" onClick={(e) => go("#top", e)}>
                {copy.contact.backToTop}
              </a>
            </footer>
          </section>
        </main>
      </div>

      {/* ── Menu (mobile) ── */}
      <div id="site-menu" ref={menuRef} role="dialog" aria-modal="true" aria-label={copy.menu} className="menu">
        <div className="menu-top">
          <span className="brand-name">{copy.brand}</span>
          <button ref={menuCloseRef} type="button" className="menu-close" onClick={() => menu(false)}>
            {copy.close}
          </button>
        </div>
        <nav aria-label={copy.menu} className="menu-nav">
          {NAV.map((k) => (
            <a key={k} href={`#${k}`} onClick={(e) => go(`#${k}`, e)} className="menu-link display">
              <span data-mli="" className="menu-link-text">
                {copy.nav[k]}
              </span>
            </a>
          ))}
        </nav>
        <div className="menu-foot">
          <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer">
            {copy.instagram}
          </a>
        </div>
      </div>

      {/* ── Viewer ── */}
      <div ref={ovRef} role="dialog" aria-modal="true" aria-label={cw ? cw.title : undefined} className="lightbox">
        <div ref={ovBgRef} className="lb-bg" />
        <div className="lb-grid">
          <div className="lb-top">
            <span>{cur ? `${pad(list.indexOf(cur) + 1)} / ${pad(list.length)}` : ""}</span>
            <button ref={ovCloseRef} type="button" className="lb-close" onClick={close}>
              {copy.lightbox.close}
            </button>
          </div>
          <div className="lb-stage">
            {/* The viewer swaps its source imperatively to keep the transition seamless. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img ref={ovImgRef} alt={cw ? cw.title : ""} className="lb-img" />
          </div>
          <div className="lb-foot">
            <div className="lb-info">
              <span className="mask">
                <span data-om="" className="lb-title display">
                  {cw ? cw.title : ""}
                </span>
              </span>
              <span className="mask">
                <span data-om="" className="lb-sub">
                  <span className="b">{cw ? `${copy.kinds[cw.kind]} — ${cw.label}` : ""}</span>
                  <span className={cw?.real ? "lb-prov-real" : "lb-prov"}>{cw ? copy.provenance[cw.prov] : ""}</span>
                </span>
              </span>
            </div>
            <div className="lb-nav">
              <button type="button" aria-label={copy.lightbox.prev} onClick={() => step(-1)}>
                ←
              </button>
              <button type="button" aria-label={copy.lightbox.next} onClick={() => step(1)}>
                →
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

/** A line of type that loops endlessly; two identical halves make the -50% wrap seamless. */
function Marquee({ text, repeat, reverse = false, className }: { text: string; repeat: number; reverse?: boolean; className: string }) {
  return (
    <div data-marquee={reverse ? "r" : "l"} aria-hidden="true" className={`marquee-track ${className}`}>
      {[0, 1].map((half) => (
        <span key={half} className="marquee-half">
          {Array.from({ length: repeat }, (_, i) => (
            <span key={i} className="marquee-unit">
              {text}
            </span>
          ))}
        </span>
      ))}
    </div>
  );
}

function HeroLetter({ children }: { children: string }) {
  return (
    <span className="hero-letter-mask">
      <span data-hl="" className="hero-letter">
        {children}
      </span>
    </span>
  );
}

type DesignCardProps = {
  id: string;
  n: number;
  className: string;
  sizes: string;
  onOpen: (id: string, trigger: HTMLElement | null, ids: string[]) => void;
};

function DesignCard({ id, n, className, sizes, onOpen }: DesignCardProps) {
  const w = BY_ID[id];
  return (
    <article className={`d-card ${className}`}>
      <button
        type="button"
        data-dimg=""
        className="d-img"
        aria-haspopup="dialog"
        aria-label={`${copy.work.open} ${w.title}`}
        onClick={(e) => onOpen(id, e.currentTarget, DESIGN_LIST)}
        {...primeProps(id)}
      >
        <Image src={w.img} alt={`${w.title} — ${w.label}`} fill sizes={sizes} placeholder="blur" className="cover" />
      </button>
      <div className="d-meta">
        <h3 className="mask">
          <span data-dt="" className="d-title display">
            {w.title}
          </span>
        </h3>
        <span className="d-meta-text">
          {pad(n)} · {w.label} · {copy.design.concept}
        </span>
      </div>
    </article>
  );
}
