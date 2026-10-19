/** Absolute origin used for canonical URLs, sitemap and social cards. */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "https://paintingsbyjana.vercel.app")
).replace(/\/$/, "");

export const INSTAGRAM_URL = "https://www.instagram.com/paintingsbyjanaaa/";
export const INSTAGRAM_HANDLE = "@paintingsbyjanaaa";

export const BRAND = {
  ink: "#201e1d",
  paper: "#f3f2f2",
  red: "#ec3013",
};
