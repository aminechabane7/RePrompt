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
    url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=75&fm=webp',
    description: 'Close-up studio fashion portrait with soft warm lighting and natural skin textures.',
  },
  {
    id: 'sample-cyberpunk',
    name: 'Neon Tokyo Street',
    category: 'Cinematic',
    url: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=600&q=75&fm=webp',
    description: 'Moody rainy neon-lit city street at night with reflections and cyberpunk aesthetic.',
  },
  {
    id: 'sample-interior',
    name: 'Minimalist Architecture',
    category: 'Interior',
    url: 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=600&q=75&fm=webp',
    description: 'Modern luxury living room with large glass windows, travertine marble, and natural daylight.',
  },
  {
    id: 'sample-nature',
    name: 'Misty Alpine Valley',
    category: 'Landscape',
    url: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=600&q=75&fm=webp',
    description: 'Atmospheric mountain range shrouded in morning fog with dramatic ridgeline silhouettes.',
  },
];
