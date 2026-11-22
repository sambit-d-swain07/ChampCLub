export interface CourtImageItem {
  src: string;
  alt: string;
  title: string;
}

export const COURT_IMAGES: Record<string, CourtImageItem[]> = {
  BADMINTON: [
    {
      src: "/images/court-badminton-1.webp",
      alt: "Empty indoor badminton court with competition lines and regulation net",
      title: "Badminton Court 1 (Teakwood)",
    },
    {
      src: "/images/court-badminton-2.webp",
      alt: "Modern empty indoor badminton court with synthetic floor and tournament lighting",
      title: "Badminton Court 2 (Synthetic)",
    },
    {
      src: "/images/court-badminton-3.webp",
      alt: "Championship standard empty indoor badminton court",
      title: "Badminton Court 3",
    },
  ],
  PADEL: [
    {
      src: "/images/court-padel-1.webp",
      alt: "Empty outdoor panoramic padel court with blue turf and tempered glass walls",
      title: "Padel Court 1 (Panoramic)",
    },
    {
      src: "/images/court-padel-2.webp",
      alt: "Enclosed empty padel court with regulation mesh enclosure and glass surrounds",
      title: "Padel Court 2 (Pro Court)",
    },
    {
      src: "/images/court-padel-3.webp",
      alt: "Tournament standard empty panoramic padel court",
      title: "Padel Court 3",
    },
  ],
  TENNIS: [
    {
      src: "/images/court-tennis-1.webp",
      alt: "Pristine empty clay tennis court with regulation net and boundary lines",
      title: "Tennis Court 1 (Championship)",
    },
    {
      src: "/images/court-tennis-2.webp",
      alt: "Empty red clay tennis court playing surface viewed from baseline",
      title: "Tennis Court 2 (Grandstand)",
    },
    {
      src: "/images/court-tennis-3.webp",
      alt: "Empty hard tennis court with umpire chair and net",
      title: "Tennis Court 3",
    },
  ],
};

/**
 * Returns court image mapping based on the court's sport and its index among courts of that same sport.
 * If index exceeds the available images for that sport, it wraps around in rotation.
 */
export function getCourtImageBySportIndex(sport: string, indexWithinSport: number): CourtImageItem {
  const sportKey = (sport || "").toUpperCase();
  const list = COURT_IMAGES[sportKey] || COURT_IMAGES.TENNIS;
  const safeIndex = indexWithinSport >= 0 ? indexWithinSport % list.length : 0;
  return list[safeIndex];
}
