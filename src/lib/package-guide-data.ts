// Package guide data extracted from PaxBespoke Marketing Guide PDF.
// Images mapped by PDF page order and cross-referenced with text descriptions.
// Package hierarchy (ascending): Budget < PaxBespoke < Select
//   Budget: affordable pre-designed storage install, standard doors, basic finishing
//   PaxBespoke: IKEA-based fitted wardrobes with custom finishes, bespoke hinged doors, rubbish removal
//   Select: everything in PaxBespoke + full bespoke integration, sliding doors, advanced carpentry

export interface ProjectType {
  id: string;
  title: string;
  description: string;
  benefit: string;
  images: string[];
  packages: ('budget' | 'paxbespoke' | 'select')[];
}

export interface ProcessStep {
  step: number;
  title: string;
  description: string;
  who: 'customer' | 'paxbespoke' | 'both';
  details: string[];
}

export interface PackageFAQ {
  question: string;
  answer: string;
}

// ─── Project Types ───
// Numbered to match PDF sections. Images verified against PDF page order.

export const projectTypes: ProjectType[] = [
  // ── Budget (PDF pages 6–10) ──
  {
    id: 'budget-large-filler',
    title: 'Standard Fitted Wardrobe',
    description: 'A standard IKEA Pax wardrobe boxed in with filler panels. No custom doors or height adjustments — just a clean, built-in look at the lowest price. Filler panels are flush with the frame (not the doors) and colour-matched to the frame.',
    benefit: 'Built-in storage without the built-in price.',
    images: ['/images/guide/budget-large-filler.jpg'],
    packages: ['budget'],
  },
  {
    id: 'budget-gap-above',
    title: 'Budget – Gap Above',
    description: 'When Pax does not reach the ceiling, or the ceiling shape prevents a standard closure. A practical solution for very tall or sloping ceilings using standard Pax heights.',
    benefit: 'Practical storage even with tricky ceiling heights.',
    images: ['/images/guide/budget-gaps-above.jpg', '/images/guide/budget-gap-above-2.jpg'],
    packages: ['budget'],
  },

  // ── PaxBespoke Standard (PDF pages 11–49, projects 1–19) ──

  // Project 1: Filler panel flush with doors (PDF page 15)
  {
    id: 'pb-filler-flush',
    title: 'Flush Filler Surround',
    description: 'Precision-cut filler panels that sit flush with the doors (not just the frame). The filler can be 5cm, wider, or narrower depending on your walls — tailored to your space.',
    benefit: 'Seamless finish that looks fully built-in.',
    images: ['/images/guide/pb-filler-flush-1.jpg', '/images/guide/pb-filler-flush-2.jpg'],
    packages: ['paxbespoke', 'select'],
  },

  // Project 2: Skirting Board Finish (PDF page 16)
  {
    id: 'pb-skirting',
    title: 'Skirting Board Finish',
    description: 'Wardrobes raised on a timber platform and finished with a new skirting board matched to the room. Looks like a true built-in, makes the top filler look smaller.',
    benefit: 'No gaps at the bottom — looks like it was always there.',
    images: ['/images/guide/pb-skirting-1.jpg'],
    packages: ['paxbespoke', 'select'],
  },

  // Project 3: Cornice finish with gap above (PDF page 17)
  {
    id: 'pb-cornice',
    title: 'Cornice Finish',
    description: 'Cornice across the top of the wardrobe while keeping the space above free. Preserves ceiling features and gives a traditional look.',
    benefit: 'Finished top edge that meets the ceiling properly.',
    images: ['/images/guide/pb-cornice-1.jpg'],
    packages: ['paxbespoke', 'select'],
  },

  // Project 4: Coving over the filler panel (PDF page 18)
  {
    id: 'pb-coving',
    title: 'Coving Over Filler Panel',
    description: 'When a filler panel would be too wide, cornice or coving visually wraps it. Hides large fillers and makes the finish look intentional.',
    benefit: 'Turns a problem filler into a design feature.',
    images: ['/images/guide/pb-coving-1.jpg'],
    packages: ['paxbespoke', 'select'],
  },

  // Project 5: Skirting + cornice combined (PDF pages 19–21)
  {
    id: 'pb-skirting-cornice',
    title: 'Skirting + Cornice Combined',
    description: 'Skirting at the base and cornice at the top, with a gap above. Best for Victorian or period features where you want a traditional finish without interfering with ceiling details.',
    benefit: 'Traditional finish that keeps existing ceiling features.',
    images: ['/images/guide/pb-skirting-cornice-1.jpg', '/images/guide/pb-skirting-cornice-2.jpg'],
    packages: ['paxbespoke', 'select'],
  },

  // Project 6: Skirting + coving over filler (PDF pages 22–23)
  {
    id: 'pb-skirting-coving',
    title: 'Skirting + Coving Over Filler',
    description: 'For homes where the top filler would be very tall (20–30cm). Coving on the filler panels turns a problem into a strong traditional feature.',
    benefit: 'Turns tall fillers into a premium design detail.',
    images: ['/images/guide/pb-skirting-coving-1.jpg', '/images/guide/pb-skirting-coving-2.jpg', '/images/guide/pb-skirting-coving-3.jpg'],
    packages: ['paxbespoke', 'select'],
  },

  // Project 7: Sloping back cut / loft (PDF page 24)
  {
    id: 'pb-loft-angle',
    title: 'Loft & Sloping Back Cut',
    description: 'Wardrobes cut to follow sloping ceilings at the back. Ideal for loft rooms — improves the perceived shape of the space.',
    benefit: 'Makes awkward loft spaces usable and beautiful.',
    images: ['/images/guide/pb-loft-angle-1.jpg'],
    packages: ['paxbespoke', 'select'],
  },

  // Project 8: Angle cut wardrobes (PDF pages 25–26)
  {
    id: 'pb-angle-cut',
    title: 'Angle Cut Wardrobes',
    description: 'Wardrobes cut on an angle, following the ceiling line. High-impact transformation for sloped ceilings.',
    benefit: 'Follows the ceiling line for a seamless look.',
    images: ['/images/guide/pb-angle-cut-1.jpg', '/images/guide/pb-angle-cut-2.jpg'],
    packages: ['paxbespoke', 'select'],
  },

  // Project 9: Tall ceiling with 2nd cupboard above (PDF pages 27–31)
  {
    id: 'pb-tall-ceiling',
    title: 'Tall Ceiling Solutions',
    description: 'For rooms with high ceilings, a second cupboard is added above to use the full height. Maximises storage and looks fully built-in.',
    benefit: 'No wasted space above — storage all the way up.',
    images: ['/images/guide/pb-tall-ceiling-1.jpg', '/images/guide/pb-tall-ceiling-2.jpg', '/images/guide/pb-tall-ceiling-3.jpg', '/images/guide/pb-tall-ceiling-4.jpg'],
    packages: ['paxbespoke', 'select'],
  },

  // Project 10: Dressing room (PDF pages 32–33)
  {
    id: 'pb-dressing-room',
    title: 'Dressing Room',
    description: 'Full room fit-outs using multiple Pax units configured as a dressing room. Options include dressing table and drawer island.',
    benefit: 'A complete dressing room at a fraction of bespoke joinery cost.',
    images: ['/images/guide/pb-dressing-room-1.jpg', '/images/guide/pb-dressing-room-2.jpg'],
    packages: ['paxbespoke', 'select'],
  },

  // Project 11: Alcoves (PDF pages 34–36)
  {
    id: 'pb-alcove',
    title: 'Alcove Wardrobe',
    description: 'Wardrobes designed for the alcoves either side of a chimney breast. Custom fillers and scribing ensure a tight fit against uneven walls.',
    benefit: 'Turns dead alcove space into proper storage.',
    images: ['/images/guide/pb-alcove-1.jpg', '/images/guide/pb-alcove-2.jpg', '/images/guide/pb-alcove-3.jpg', '/images/guide/pb-alcove-4.jpg'],
    packages: ['paxbespoke', 'select'],
  },

  // Project 12: Across the chimney breast (PDF page 37)
  {
    id: 'pb-chimney-breast',
    title: 'Chimney Breast Integration',
    description: 'Wardrobes built to cover the chimney breast, creating an apparent flat wall. Very strong visual transformation.',
    benefit: 'Symmetrical storage without removing the chimney.',
    images: ['/images/guide/pb-chimney-breast-1.jpg'],
    packages: ['paxbespoke', 'select'],
  },

  // Project 13: TV space (PDF pages 38–39)
  {
    id: 'pb-tv-space',
    title: 'TV & Media Space',
    description: 'Dedicated open TV space with cupboards above, below, or drawers. Combines storage with entertainment in one wall.',
    benefit: 'Storage and entertainment in one clean wall unit.',
    images: ['/images/guide/pb-tv-space-1.jpg', '/images/guide/pb-tv-space-2.jpg'],
    packages: ['paxbespoke', 'select'],
  },

  // Project 14: Bridge cupboards (PDF page 40)
  {
    id: 'pb-bridge-cupboard',
    title: 'Over-Bed Bridge Cupboard',
    description: 'Wardrobes either side with bridging cupboards across the top. Maximises storage in bedrooms without taking up floor space.',
    benefit: 'Extra storage above the bed without losing floor space.',
    images: ['/images/guide/pb-bridge-cupboard-1.jpg'],
    packages: ['paxbespoke', 'select'],
  },

  // Project 15: SKYTTA sliding (PDF pages 41–42)
  {
    id: 'pb-skytta-sliding',
    title: 'SKYTTA Sliding Doors',
    description: 'IKEA SKYTTA sliding door system fitted to Pax frames. Ideal for rooms where hinged doors would block space. Smooth, quiet operation.',
    benefit: 'Space-saving sliding doors with a premium feel.',
    images: ['/images/guide/pb-skytta-sliding-1.jpg', '/images/guide/pb-skytta-sliding-2.jpg'],
    packages: ['paxbespoke', 'select'],
  },

  // Project 16: Stairs bulkhead (PDF page 43)
  {
    id: 'pb-bulkhead',
    title: 'Built Around Bulkheads',
    description: 'Wardrobes built around an awkward stairs bulkhead. Storage where it normally feels impossible.',
    benefit: 'Hides structural elements and maximises storage.',
    images: ['/images/guide/pb-bulkhead-1.jpg'],
    packages: ['paxbespoke', 'select'],
  },

  // Project 17: Custom door/frame widths (PDF pages 44–45)
  {
    id: 'pb-custom-frames',
    title: 'Custom Frame Widths',
    description: 'Non-standard frame widths to fill your exact wall space. We adjust Pax frames or add custom panels so the wardrobe fits wall-to-wall.',
    benefit: 'Wall-to-wall fit with no awkward gaps.',
    images: ['/images/guide/pb-custom-frames-1.jpg', '/images/guide/pb-custom-frames-2.jpg'],
    packages: ['paxbespoke', 'select'],
  },

  // Project 18: Office (PDF pages 46–47)
  {
    id: 'pb-office',
    title: 'Office & Desk Storage',
    description: 'Wardrobes combined with a bespoke desk (deeper tops, cable holes/caps). Combines storage with a work surface in one cohesive unit.',
    benefit: 'Work-from-home setup that looks built-in.',
    images: ['/images/guide/pb-office-1.jpg', '/images/guide/pb-office-2.jpg'],
    packages: ['paxbespoke', 'select'],
  },

  // Project 19: Custom frames + custom-cut doors (PDF pages 48–49)
  {
    id: 'pb-custom-cut-doors',
    title: 'Custom Cut Doors',
    description: 'For spaces where standard Pax dimensions do not fit cleanly. We customise frames and cut doors to non-standard sizes for a perfect fit.',
    benefit: 'Every door fits perfectly, no matter the space.',
    images: ['/images/guide/pb-custom-cut-doors-1.jpg', '/images/guide/pb-custom-cut-doors-2.jpg'],
    packages: ['paxbespoke', 'select'],
  },

  // ── Select-specific (PDF pages 50–57) ──

  // Select project 1: 5cm filler surround (PDF pages 50, 53–54)
  {
    id: 'select-filler',
    title: 'Select Flush Filler Integration',
    description: 'Premium look with perfect front and curated door choices. Bespoke-looking result with spray-painted or vinyl doors, refined filler finishes, and design details. Can include skirting/cornice on request.',
    benefit: 'Fully integrated into the wall itself.',
    images: ['/images/guide/select-filler-1.jpg', '/images/guide/select-filler-2.jpg', '/images/guide/select-filler-3.jpg'],
    packages: ['select'],
  },

  // Select project 2: Angle cut wardrobes (PDF pages 55–57)
  {
    id: 'select-angle-cut',
    title: 'Select Angle Cut & Wall Integration',
    description: 'For loft and angled spaces where customers want shaker doors and a premium finish. Advanced angle cuts with full wall integration and the highest level of customisation.',
    benefit: 'No restrictions — the most complex spaces handled.',
    images: ['/images/guide/select-angle-cut-1.jpg', '/images/guide/select-angle-cut-2.jpg'],
    packages: ['select'],
  },
];

// ─── Process Steps (per package) ───
// All packages include supply & installation
// Budget: basic install, PaxBespoke: custom finishes, Select: full bespoke integration

export const processSteps: Record<string, ProcessStep[]> = {
  budget: [
    {
      step: 1,
      title: 'Submit Your Booking',
      description: 'Fill in the booking form with your details and room information.',
      who: 'customer',
      details: [
        'Choose the Budget package',
        'Tell us about your space and what you need',
        'Select a consultation time',
      ],
    },
    {
      step: 2,
      title: 'Design Call',
      description: 'We discuss your space, confirm measurements, and agree on the configuration.',
      who: 'both',
      details: [
        'We review your room measurements and photos',
        'We recommend the right Pax configuration',
        'You receive a clear, fixed quote',
      ],
    },
    {
      step: 3,
      title: 'We Prepare Your Order',
      description: 'We prepare the full IKEA setup and any required materials.',
      who: 'paxbespoke',
      details: [
        'IKEA items and materials ordered',
        'Fitting date confirmed',
        'You pay the 50% deposit to secure the slot',
      ],
    },
    {
      step: 4,
      title: 'Fitting Day',
      description: 'Our team arrives, assembles everything, and boxes it in with filler panels.',
      who: 'paxbespoke',
      details: [
        'Assembly, securing to wall, and filler panels fitted',
        'Typically completed in half a day to one day',
        'Post-installation support included',
      ],
    },
  ],
  paxbespoke: [
    {
      step: 1,
      title: 'Submit Your Booking',
      description: 'Fill in the booking form with your details and room information.',
      who: 'customer',
      details: [
        'Choose the PaxBespoke package',
        'Tell us about your space and style preferences',
        'Select a consultation time',
      ],
    },
    {
      step: 2,
      title: 'Design Consultation',
      description: 'A video call where we design your wardrobe together — layout, doors, colours, and finishes.',
      who: 'both',
      details: [
        'We discuss your vision and recommend options',
        'Door styles, colours, and trim choices confirmed',
        'You receive a detailed quote with no surprises',
      ],
    },
    {
      step: 3,
      title: 'We Prepare Everything',
      description: 'We order all IKEA items, bespoke doors, trims, and materials.',
      who: 'paxbespoke',
      details: [
        'IKEA items and external materials ordered',
        'Bespoke doors manufactured',
        'Fitting date confirmed once everything is ready',
      ],
    },
    {
      step: 4,
      title: 'Fitting Day',
      description: 'Our team installs everything — assembly, bespoke doors, flush fillers, skirting, and finishing.',
      who: 'paxbespoke',
      details: [
        'Full assembly, fitting, and finishing in 1–2 days',
        'Bespoke doors, trims, and fillers installed',
        'Rubbish removal and cleanup included',
        'Post-installation support if anything needs adjusting',
      ],
    },
  ],
  select: [
    {
      step: 1,
      title: 'Submit Your Booking',
      description: 'Fill in the booking form with your details and room information.',
      who: 'customer',
      details: [
        'Choose the Select package',
        'Tell us about your space and what you want to achieve',
        'Select a consultation time',
      ],
    },
    {
      step: 2,
      title: 'In-Depth Design Consultation',
      description: 'A detailed design session covering layout, sliding systems, wall integration, and every finish detail.',
      who: 'both',
      details: [
        'We assess your space for complex requirements',
        'Sliding doors, floor-to-ceiling, and wall integration discussed',
        'Samples available if you want to see finishes in person',
      ],
    },
    {
      step: 3,
      title: 'We Design & Prepare Everything',
      description: 'Full project planning — we handle every detail from ordering to manufacturing to scheduling.',
      who: 'paxbespoke',
      details: [
        'All IKEA items, custom components, and materials ordered',
        'Custom doors manufactured to your specification',
        'Fitting date confirmed with a detailed project plan',
      ],
    },
    {
      step: 4,
      title: 'Fitting Day',
      description: 'Our most experienced team handles the full installation — including wall integration and advanced carpentry.',
      who: 'paxbespoke',
      details: [
        'Full bespoke installation over 1–2 days',
        'Wall integration, sliding systems, and advanced finishes',
        'Complete cleanup, rubbish removal, and post-installation support',
      ],
    },
  ],
};

// ─── Package-Specific FAQs ───

export const packageFAQs: Record<string, PackageFAQ[]> = {
  budget: [
    {
      question: 'What does Budget include?',
      answer: 'Supply & installation of standard IKEA Pax wardrobes with filler panels. We handle the materials, assembly, and securing to wall. It uses standard IKEA doors and finishes.',
    },
    {
      question: 'Will there be gaps above the wardrobe?',
      answer: 'Budget uses standard Pax heights, so there may be a gap between the top of the wardrobe and the ceiling. This is normal for the Budget package.',
    },
    {
      question: 'Can I upgrade to custom doors later?',
      answer: 'Yes. You can start with Budget and upgrade to Select or PaxBespoke later. The Pax frame stays the same — we just add custom finishes on top.',
    },
  ],
  paxbespoke: [
    {
      question: 'Is this fully bespoke joinery?',
      answer: 'The interior uses the IKEA Pax system, but the exterior — bespoke hinged doors, fillers, trims, and finishes — is fully custom. The result looks indistinguishable from traditional bespoke wardrobes.',
    },
    {
      question: 'Can you handle sloped ceilings and awkward spaces?',
      answer: 'Yes. Loft angle cuts, chimney breast integration, bulkheads, and alcoves are all standard PaxBespoke project types. We scribe and cut to match your exact room shape.',
    },
    {
      question: 'Do I need to order anything myself?',
      answer: 'No. We handle everything — IKEA items, bespoke doors, trims, materials, delivery, fitting, and rubbish removal. You just approve the design.',
    },
  ],
  select: [
    {
      question: 'What can Select do that PaxBespoke cannot?',
      answer: 'Select adds full bespoke wall integration, sliding door systems (including floor-to-ceiling), custom door finishes, split-side wall build-outs, and advanced carpentry. No restrictions within the Pax system.',
    },
    {
      question: 'Do I need to order anything myself?',
      answer: 'No. We handle everything — IKEA items, custom doors, trims, materials, delivery, fitting, and rubbish removal. You just approve the design.',
    },
    {
      question: 'Is there anything Select cannot do?',
      answer: 'Within the Pax system, no. Select is our highest capability package. If your project requires something outside the Pax system entirely, we will discuss alternatives during the consultation.',
    },
  ],
};

// ─── Helper: get project types for a package ───

export function getProjectTypesForPackage(packageId: string): ProjectType[] {
  return projectTypes.filter((pt) => pt.packages.includes(packageId as 'budget' | 'paxbespoke' | 'select'));
}
