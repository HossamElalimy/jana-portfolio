"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties, type MouseEvent } from "react";
import { flushSync } from "react-dom";
import Image from "next/image";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";

import { copy } from "@/lib/content";
import { INSTAGRAM_HANDLE, INSTAGRAM_URL } from "@/lib/site";
import { ART_LIST, BY_ID, DESIGN_LIST, HERO, SELECTED, WORK, pad, type Kind } from "@/lib/works";
import studioEasels from "@/assets/studio-easels.jpg";
import portrait from "@/assets/jana-portrait-bw.jpg";
import painting02 from "@/assets/jana-painting-02.jpg";

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

const canHover = () => window.matchMedia("(min-width: 900px) and (hover: hover)").matches;

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

  const lockScroll = useCallback((on: boolean) => {
    document.documentElement.style.overflow = on ? "hidden" : "";
    if (on) lenisRef.current?.stop();
    else lenisRef.current?.start();
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
        tl.fromTo("[data-hsub]", { yPercent: 110 }, { yPercent: 0, duration: 1.1, ease: E, stagger: 0.08 }, "-=.7");
        // The hero is hidden by CSS until its intro has set its starting state.
        gsap.set("[data-hero-pre]", { opacity: 1 });

        // Hero: the window opens to full bleed as the name splits apart
        gsap
          .timeline({ scrollTrigger: { trigger: "[data-hero]", start: "top top", end: "+=110%", scrub: 0.8, pin: true } })
          .fromTo("[data-hwin]", WIN, { ...WIN_OPEN, ease: "power2.inOut", immediateRender: false }, 0)
          .to('[data-hside="l"]', { xPercent: -80, ease: "power2.in" }, 0)
          .to('[data-hside="r"]', { xPercent: 80, ease: "power2.in" }, 0)
          .to("[data-hsubw]", { opacity: 0, y: -40, ease: "none" }, 0);

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

          // …then drops out of the painting, bounces on the "Paintings" rule below and fades.
          // Distances come from layout (not transforms), so they stay right after any resize.
          const dropDistance = () => {
            const headTop = head.getBoundingClientRect().top + window.scrollY;
            const cutTop = headTop - cut.offsetHeight; // the cut sits directly above the heading once unpinned
            const S = slices.offsetHeight;
            const h = ballWrap.offsetHeight;
            const liftedBottom = ballWrap.offsetTop + h / 2 + (LIFT.yPercent / 100) * h + (LIFT.scale * h) / 2;
            const ballBottom = cutTop + slices.offsetTop + S / 2 + (liftedBottom - S / 2) * SLICES_END_SCALE;
            const floor = headTop + head.offsetHeight - 2;
            // The wrapper lives inside the scaled painting, so undo that scale.
            return (floor - ballBottom) / SLICES_END_SCALE;
          };
          gsap
            .timeline({
              scrollTrigger: { trigger: head, start: "top bottom", end: "bottom 40%", scrub: 0.6, invalidateOnRefresh: true },
            })
            .fromTo(ballWrap, { y: 0 }, { y: dropDistance, ease: "bounce.out", duration: 1, immediateRender: false })
            .to(ballWrap, { autoAlpha: 0, scale: 0.85, duration: 0.3, ease: "power1.in" }, ">-0.02");
        }

        // Paintings: horizontal pinned track on desktop, native swipe on mobile
        const track = document.querySelector<HTMLElement>("[data-track]");
        if (d && track) {
          const dist = () => Math.max(0, track.scrollWidth - window.innerWidth);
          gsap.to(track, {
            x: () => -dist(),
            ease: "none",
            scrollTrigger: {
              trigger: "[data-gal]",
              start: "top top",
              end: () => "+=" + dist(),
              scrub: 0.6,
              pin: true,
              invalidateOnRefresh: true,
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

      curRef.current = id;
      listRef.current = ids;
      flushSync(() => {
        setList(ids);
        setCur(id);
      });
      lockScroll(true);
      im.src = BY_ID[id].img.src;

      const show = () => {
        if (curRef.current !== id) return;
        ov.style.visibility = "visible";
        ovCloseRef.current?.focus({ preventScroll: true });
        if (reduceRef.current) return;
        gsap.fromTo(ovBgRef.current, { clipPath: "inset(100% 0% 0% 0%)" }, { clipPath: "inset(0% 0% 0% 0%)", duration: 0.9, ease: "expo.inOut" });
        const to = im.getBoundingClientRect();
        if (from && to.width)
          gsap.fromTo(
            im,
            { x: from.left - to.left, y: from.top - to.top, scale: from.width / to.width, transformOrigin: "0 0" },
            { x: 0, y: 0, scale: 1, duration: 1.15, ease: "expo.inOut" },
          );
        else
          gsap.fromTo(im, { clipPath: "inset(100% 0% 0% 0%)" }, { clipPath: "inset(0% 0% 0% 0%)", duration: 1, ease: "expo.inOut", delay: 0.2 });
        gsap.fromTo("[data-om]", { yPercent: 110 }, { yPercent: 0, duration: 1, ease: "expo.out", stagger: 0.06, delay: 0.55 });
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
      duration: 0.8,
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
    const swap = () => {
      im.src = BY_ID[id].img.src;
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
    };
    if (reduceRef.current) return swap();
    gsap.to(im, { clipPath: dir > 0 ? "inset(0% 100% 0% 0%)" : "inset(0% 0% 0% 100%)", duration: 0.45, ease: "expo.in", onComplete: swap });
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
                  sizes="100vw"
                  quality={85}
                  // Frames start inside a closed window and are revealed in sequence, so none is preloaded.
                  fetchPriority={i === 0 ? "high" : "auto"}
                  placeholder="blur"
                  className="hero-img"
                />
              ))}
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
            <div data-gal="" className="gal">
              <div data-track="" className="track">
                {ART_LIST.map((id, i) => {
                  const w = BY_ID[id];
                  return (
                    <button
                      key={id}
                      type="button"
                      className="gal-item"
                      aria-haspopup="dialog"
                      aria-label={`${copy.work.open} ${w.title}`}
                      onClick={(e) => open(id, e.currentTarget, ART_LIST)}
                    >
                      <span className="gal-frame">
                        <Image src={w.img} alt={w.title} fill sizes="(min-width: 900px) 62vh, 76vw" placeholder="blur" className="cover" />
                      </span>
                      <span className="gal-cap">
                        <span className="b">
                          {pad(i + 1)} {w.title}
                        </span>
                        <span className={w.real ? "tag-real" : "tag-stand"}>{w.real ? copy.art.original : copy.art.standIn}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <figure className="studio">
              <div data-dimg="" className="studio-img">
                <Image
                  src={studioEasels}
                  alt={copy.art.studioAlt}
                  fill
                  sizes="(min-width: 1180px) 1100px, 100vw"
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
                <div data-kin="l" className="kin kin-about display">
                  {copy.about.marquee1}
                </div>
              </div>
              <figure data-portrait="" className="portrait">
                <Image src={portrait} alt={copy.about.portraitAlt} fill sizes="(min-width: 900px) 46vh, 64vw" className="cover portrait-img" />
              </figure>
              <span data-abball="" aria-hidden="true" className="about-ball" />
              <div aria-hidden="true" className="about-kin about-kin-bottom">
                <div data-kin="r" className="kin kin-about kin-red display">
                  {copy.about.marquee2}
                </div>
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
              <div data-kin="l" aria-hidden="true" className="kin kin-contact display">
                {copy.contact.marquee}
              </div>
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
