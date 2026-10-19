import type { StaticImageData } from "next/image";

import painting01 from "@/assets/jana-painting-01.jpg";
import painting02 from "@/assets/jana-painting-02.jpg";
import design01 from "@/assets/design-01-court-club.jpg";
import design02 from "@/assets/design-02-impasto.jpg";
import design03 from "@/assets/design-03-salt.jpg";
import design04 from "@/assets/design-04-blue-hour.jpg";
import preview03 from "@/assets/preview-03.jpg";
import preview04 from "@/assets/preview-04.jpg";
import preview05 from "@/assets/preview-05.jpg";
import preview06 from "@/assets/preview-06.jpg";
import preview07 from "@/assets/preview-07.jpg";
import preview08 from "@/assets/preview-08.jpg";
import heroCourt from "@/assets/hero-court.jpg";

export type Kind = "art" | "design";
export type Provenance = "original" | "standIn" | "concept";

export type Work = {
  id: string;
  kind: Kind;
  title: string;
  /** Arabic title, used only in structured data for search. */
  titleAr: string;
  label: string;
  img: StaticImageData;
  prov: Provenance;
  /** Authentic work by Jana (as opposed to a stand-in or concept). */
  real: boolean;
};

// Swap `img` for real assets as the collection grows. `real: true` marks authentic Jana work.
export const WORK: Work[] = [
  { id: "a01", kind: "art", title: "Figure in Motion", titleAr: "جسد في حركة", label: "Painting", img: painting01, prov: "original", real: true },
  { id: "a02", kind: "art", title: "Ball on Blue", titleAr: "كرة على الأزرق", label: "Painting", img: painting02, prov: "original", real: true },
  { id: "d01", kind: "design", title: "Court Club", titleAr: "نادي الملعب", label: "Poster series", img: design01, prov: "concept", real: false },
  { id: "d02", kind: "design", title: "Impasto", titleAr: "إمباستو", label: "Editorial layout", img: design02, prov: "concept", real: false },
  { id: "d03", kind: "design", title: "Salt", titleAr: "ملح", label: "Identity system", img: design03, prov: "concept", real: false },
  { id: "d04", kind: "design", title: "Blue Hour", titleAr: "الساعة الزرقاء", label: "Exhibition poster", img: design04, prov: "concept", real: false },
  { id: "a03", kind: "art", title: "Clay, Late", titleAr: "ملعب ترابي، مساءً", label: "Painting", img: preview03, prov: "standIn", real: false },
  { id: "a04", kind: "art", title: "Rally", titleAr: "تبادل", label: "Painting", img: preview04, prov: "standIn", real: false },
  { id: "a05", kind: "art", title: "Net", titleAr: "الشبكة", label: "Painting", img: preview05, prov: "standIn", real: false },
  { id: "a06", kind: "art", title: "Serve", titleAr: "الإرسال", label: "Painting", img: preview06, prov: "standIn", real: false },
  { id: "a07", kind: "art", title: "After Dark", titleAr: "بعد الغروب", label: "Painting", img: preview07, prov: "standIn", real: false },
  { id: "a08", kind: "art", title: "Half Court", titleAr: "نصف الملعب", label: "Painting", img: preview08, prov: "standIn", real: false },
];

export const BY_ID: Record<string, Work> = Object.fromEntries(WORK.map((w) => [w.id, w]));

export const SELECTED = ["a01", "d01", "a02", "d03", "d02", "d04"];
export const ART_LIST = ["a01", "a02", "a03", "a04", "a05", "a06", "a07", "a08"];
export const DESIGN_LIST = ["d01", "d02", "d03", "d04"];
/** Revealed one after another in the hero window; the last one opens to full bleed. */
export const HERO = [design03, preview07, design01, preview03, design04, heroCourt];

export const pad = (n: number) => String(n).padStart(2, "0");
