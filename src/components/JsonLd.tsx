import { copy, seo } from "@/lib/content";
import { INSTAGRAM_URL, SITE_URL } from "@/lib/site";
import { WORK } from "@/lib/works";
import portrait from "@/assets/jana-portrait-bw.jpg";

/** schema.org graph describing Jana, the site, and her authentic artworks (with Arabic names for search). */
export default function JsonLd() {
  const url = `${SITE_URL}/`;
  const person = `${SITE_URL}/#jana`;
  const website = `${SITE_URL}/#website`;
  const abs = (src: string) => (src.startsWith("http") ? src : `${SITE_URL}${src}`);

  const artworks = WORK.filter((w) => w.real).map((w) => ({
    "@type": "VisualArtwork",
    "@id": `${SITE_URL}/#${w.id}`,
    name: w.title,
    alternateName: w.titleAr,
    artform: "Painting",
    image: abs(w.img.src),
    creator: { "@id": person },
  }));

  const data = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Person",
        "@id": person,
        name: copy.name,
        alternateName: [seo.nameAr, copy.brandSub, seo.siteNameAr],
        jobTitle: ["Artist", "Graphic Designer"],
        description: seo.socialDescription,
        disambiguatingDescription: seo.descriptionAr,
        url,
        image: abs(portrait.src),
        sameAs: [INSTAGRAM_URL],
        knowsLanguage: ["en", "ar"],
        knowsAbout: ["Painting", "Fine art", "Graphic design", "Typography", "Poster design", "Editorial design", "Visual identity", "رسم", "تصميم جرافيك"],
      },
      {
        "@type": "WebSite",
        "@id": website,
        url,
        name: copy.brandSub,
        alternateName: [seo.siteNameAr, seo.nameAr],
        inLanguage: "en",
        publisher: { "@id": person },
      },
      {
        "@type": "ProfilePage",
        "@id": `${url}#page`,
        url,
        name: seo.title,
        description: seo.description,
        inLanguage: "en",
        isPartOf: { "@id": website },
        about: { "@id": person },
        mainEntity: { "@id": person },
        primaryImageOfPage: abs(portrait.src),
        hasPart: artworks.map((a) => ({ "@id": a["@id"] })),
      },
      ...artworks,
    ],
  };

  return (
    <script
      type="application/ld+json"
      // Escape "<" so the JSON can never close the script element.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}
