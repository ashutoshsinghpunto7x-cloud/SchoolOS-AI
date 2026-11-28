// The public campus tour (/tour) is driven entirely by this list.
//
// Photos are NOT committed (the repository is public). For local preview, put
// them in apps/web/public/tour-media/ using the file names below. In production,
// host them elsewhere and set VITE_TOUR_MEDIA_URL to that folder's URL.

export interface TourHotspot {
  /** `id` of the stop this arrow leads to. */
  to: string;
  /** Position on the photo, as a percentage from its left and top edges. */
  x: number;
  y: number;
}

export interface TourStop {
  id: string;
  name: string;
  caption: string;
  image: string;
  /** Left out until placed on the real photo; the viewer then points to the next stop. */
  hotspots?: TourHotspot[];
}

const MEDIA_BASE: string = (import.meta.env.VITE_TOUR_MEDIA_URL || '/tour-media').replace(/\/$/, '');

export const tourImageUrl = (stop: TourStop) => `${MEDIA_BASE}/${stop.image}`;

export const TOUR_STOPS: TourStop[] = [
  { id: 'gate', name: 'Main Gate', caption: 'Start your visit at the school entrance.', image: 'gate.jpg' },
  { id: 'building', name: 'School Building', caption: 'A look at the school building.', image: 'building.jpg' },
  { id: 'reception', name: 'Reception', caption: 'Where visitors and parents are welcomed.', image: 'reception.jpg' },
  { id: 'classroom', name: 'Classroom', caption: 'Inside one of our classrooms.', image: 'classroom.jpg' },
  { id: 'activities', name: 'Activities', caption: 'School life beyond lessons.', image: 'activities.jpg' },
  { id: 'pool', name: 'Swimming Pool', caption: 'The school swimming pool.', image: 'pool.jpg' },
  { id: 'playground', name: 'Playground', caption: 'Space for games and sport.', image: 'playground.jpg' },
];
