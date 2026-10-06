export interface SampleImage {
  id: string;
  name: string;
  category: string;
  url: string;
  description: string;
}

export const SAMPLE_IMAGES: SampleImage[] = [
  {
    id: 'sample-portrait',
    name: 'Editorial Fashion',
    category: 'Portrait',
    url: '/samples/sample-portrait.webp',
    description: 'Studio fashion portrait with soft warm lighting and natural skin textures.',
  },
  {
    id: 'sample-cyberpunk',
    name: 'Neon Tokyo Street',
    category: 'Cinematic',
    url: '/samples/sample-cyberpunk.webp',
    description: 'Moody rainy neon-lit city street at night with reflections and urban atmosphere.',
  },
  {
    id: 'sample-interior',
    name: 'Minimalist Architecture',
    category: 'Interior',
    url: '/samples/sample-interior.webp',
    description: 'Modern living space with large glass windows, travertine stone, and natural daylight.',
  },
  {
    id: 'sample-nature',
    name: 'Misty Alpine Valley',
    category: 'Landscape',
    url: '/samples/sample-nature.webp',
    description: 'Mountain range shrouded in morning fog with dramatic ridgeline contours.',
  },
];
