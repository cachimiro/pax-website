// Package guide data extracted from PaxBespoke Marketing Guide PDF.
// Images mapped by PDF page order and cross-referenced with text descriptions.
// Package hierarchy (ascending): Budget < PaxBespoke < Select
//   Budget: affordable pre-designed storage install, standard doors, basic finishing
//   PaxBespoke: IKEA-based fitted wardrobes with custom finishes, doors within IKEA/PAX ecosystem, rubbish removal
//   Select: everything in PaxBespoke + full bespoke integration, sliding doors, advanced carpentry

export interface ProjectType {
  id: string;
  title: string;
  description: string;
  benefit: string;
  images: string[];
  imageCaptions?: string[];
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
    title: 'Large Filler Panels',
    description: 'Standard IKEA PAX units boxed in with filler panels. Filler panels are flush with the frame (not the doors) and colour-matched to the frame. No custom doors, no frame cutting, scribing, or height alterations.',
    benefit: 'Built-in look at the lowest price — filler panels flush with the frame.',
    images: ['/images/guide/budget-large-filler.jpg', '/images/guide/budget-large-filler-2.jpg'],
    imageCaptions: [
      'Standard IKEA PAX doors with filler panels flush with the frame, colour-matched to the frame',
      'White PAX doors with large side filler panel — filler size can vary depending on the space',
    ],
    packages: ['budget'],
  },
  {
    id: 'budget-gap-above',
    title: 'Gap Above (Tall / Sloping Ceiling)',
    description: 'When PAX does not reach the ceiling, or the ceiling shape prevents a standard closure. A practical solution for very tall or sloping ceilings using standard PAX heights. You may see visible gaps above.',
    benefit: 'Practical storage even with tricky ceiling heights.',
    images: ['/images/guide/budget-gaps-above.jpg', '/images/guide/budget-gap-above-2.jpg', '/images/guide/budget-gap-above-3.jpg'],
    imageCaptions: [
      'Standard PAX units that don\'t reach the ceiling — visible gap above',
      'PAX interior system open — drawers, shelves, and hanging rails can be changed at any time',
      'Standard IKEA doors with mirror option — gap above visible',
    ],
    packages: ['budget'],
  },

  // ── PaxBespoke Standard (PDF pages 11–49, projects 1–19) ──

  // Project 1: Filler panel flush with doors (PDF pages 16, 21)
  {
    id: 'pb-filler-flush',
    title: 'Flush Filler Surround',
    description: 'Filler panels sit flush with the doors (not just the frame). The filler width varies depending on your walls — tailored to your space for a noticeably better finish.',
    benefit: 'Filler panels flush with the doors — not the frame — for a noticeably better finish.',
    images: ['/images/guide/pb-filler-flush-1.jpg'],
    imageCaptions: [
      'Flush filler panels visible on both sides — sits level with the doors, not recessed like Budget',
    ],
    packages: ['paxbespoke', 'select'],
  },

  // Project 2: Skirting Board Finish (PDF pages 16–17)
  {
    id: 'pb-skirting',
    title: 'Skirting Board Finish',
    description: 'Wardrobes raised on a timber platform and finished with a new skirting board matched to the room. The skirting board is raised to match the height of the skirting board in the room of the customer.',
    benefit: 'Wardrobes raised on a timber platform with a new skirting board matched to the room.',
    images: ['/images/guide/pb-skirting-annotated.jpg'],
    imageCaptions: [
      'Annotated: skirting board added to a timber platform raised to match the room skirting height',
    ],
    packages: ['paxbespoke', 'select'],
  },

  // Project 3: Cornice finish with gap above (PDF page 18)
  {
    id: 'pb-cornice',
    title: 'Cornice Finish',
    description: 'An MDF cornice is fitted across the top of the wardrobe. There is a gap between the cornice and the ceiling. This is a traditional finish that works well in period homes.',
    benefit: 'Cornice moulding across the top with a gap above — a clean, traditional finish.',
    images: ['/images/guide/pb-cornice-1.jpg'],
    imageCaptions: [
      'Cornice across the top of the wardrobe with gap above — preserves ceiling features',
    ],
    packages: ['paxbespoke', 'select'],
  },

  // Project 4: Coving over the filler panel (PDF page 18)
  {
    id: 'pb-coving',
    title: 'Coving Over Filler Panel',
    description: 'When the filler panel above would be too wide, coving visually wraps it. Turns a large filler into a design feature rather than a compromise.',
    benefit: 'Turns a problem filler into a design feature.',
    images: ['/images/guide/pb-coving-1.jpg'],
    imageCaptions: [
      'Coving wraps the top filler panel — hides large fillers and makes the finish look intentional',
    ],
    packages: ['paxbespoke', 'select'],
  },

  // Project 5: Skirting + cornice combined (PDF pages 19, 21)
  {
    id: 'pb-skirting-cornice',
    title: 'Skirting + Cornice Combined',
    description: 'Skirting at the base and cornice at the top, with a gap above. Best for Victorian or period features where you want a traditional finish without interfering with ceiling details.',
    benefit: 'Traditional finish that keeps existing ceiling features.',
    images: ['/images/guide/pb-skirting-cornice-1.jpg', '/images/guide/pb-skirting-cornice-2.jpg', '/images/guide/pb-skirting-cornice-3.jpg', '/images/guide/pb-skirting-cornice-4.jpg'],
    imageCaptions: [
      'Cornice at the top, skirting at the bottom, gap above preserved — period room',
      'Skirting + cornice finish with flush filler panels on both sides',
      'Ornate Victorian ceiling cornice — the type of feature this finish preserves',
      'Annotated: cornice across the top with gap above, skirting board at the base',
    ],
    packages: ['paxbespoke', 'select'],
  },

  // Project 6: Skirting + coving over filler (PDF pages 22–24)
  {
    id: 'pb-skirting-coving',
    title: 'Skirting + Coving Over Filler',
    description: 'For homes where the top filler would be very tall (20–30cm). Coving on the filler panels turns a problem into a strong traditional feature. Skirting board at the base.',
    benefit: 'Turns tall fillers into a premium design detail.',
    images: ['/images/guide/pb-skirting-coving-1.jpg', '/images/guide/pb-coving-skirting-annotated.jpg'],
    imageCaptions: [
      'Skirting board finish at the base, coving over the filler panel at the top — bedroom with radiator',
      'Annotated: coving on filler panels at the top, skirting board at the base',
    ],
    packages: ['paxbespoke', 'select'],
  },

  // Project 7: Sloping back cut / loft (PDF page 25)
  {
    id: 'pb-loft-angle',
    title: 'Loft & Sloping Back Cut',
    description: 'Frames cut to follow the sloping ceiling at the back. Maximises usable storage in loft rooms where the ceiling slopes away from the wall.',
    benefit: 'Frames cut to follow the sloping ceiling at the back — maximises usable storage in loft rooms.',
    images: ['/images/guide/pb-loft-angle-1.jpg'],
    imageCaptions: [
      'Frames cut to follow sloping ceiling at the back',
    ],
    packages: ['paxbespoke', 'select'],
  },

  // Project 8: Angle cut wardrobes (PDF pages 26–27)
  {
    id: 'pb-angle-cut',
    title: 'Angle Cut Wardrobes',
    description: 'Wardrobes cut on an angle, following the ceiling line. The doors and frames follow the slope for a seamless look. Works for loft rooms, under-stairs, and any angled space.',
    benefit: 'Follows the ceiling line for a seamless look.',
    images: ['/images/guide/pb-angle-cut-1.jpg', '/images/guide/pb-angle-cut-2.jpg', '/images/guide/pb-angle-cut-3.jpg'],
    imageCaptions: [
      'Annotated: angle cut wardrobes following the ceiling — loft room with skylight',
      'Angle cut following staircase line — under-stairs storage',
      'Beige flat doors under a staircase with herringbone floor — modern application',
    ],
    packages: ['paxbespoke', 'select'],
  },

  // Project 9: Tall ceiling with 2nd cupboard above (PDF pages 29–30)
  {
    id: 'pb-tall-ceiling',
    title: 'Tall Ceiling Solutions',
    description: 'For rooms with high ceilings, a second cupboard is added above the main wardrobe to use the full height. Maximises storage and looks fully built-in.',
    benefit: 'No wasted space above — storage all the way up.',
    images: ['/images/guide/pb-tall-ceiling-1.jpg', '/images/guide/pb-tall-ceiling-2.jpg', '/images/guide/pb-tall-ceiling-3.jpg', '/images/guide/pb-tall-ceiling-4.jpg'],
    imageCaptions: [
      'White high-gloss doors with second row of cupboards above — full ceiling height used',
      'White shaker and mirror doors with upper cupboards — blue bedroom',
      'L-shaped dressing room with wardrobes on two walls and upper cupboards',
      'Annotated: single dark grey wardrobe with upper cupboard in narrow alcove',
    ],
    packages: ['paxbespoke', 'select'],
  },

  // Project 10: Dressing room (PDF pages 31–34)
  {
    id: 'pb-dressing-room',
    title: 'Dressing Room',
    description: 'Full room fit-outs using multiple PAX units configured as a dressing room. Options include a built-in dressing table and a drawer island. Optional glass top or worktop on request.',
    benefit: 'A complete dressing room at a fraction of bespoke joinery cost.',
    images: ['/images/guide/pb-dressing-room-1.jpg', '/images/guide/pb-dressing-room-2.jpg'],
    imageCaptions: [
      'Integrated dressing table with drawers, open shelves, and vanity mirror',
      'Annotated: built-in dressing table (left) and island with drawers (right)',
    ],
    packages: ['paxbespoke', 'select'],
  },

  // Project 11: Alcoves only (PDF pages 35–36)
  {
    id: 'pb-alcove',
    title: 'Alcove Wardrobe',
    description: 'Wardrobes designed for the alcoves either side of a chimney breast. Custom fillers and scribing ensure a tight fit against uneven walls.',
    benefit: 'Turns dead alcove space into proper storage.',
    images: ['/images/guide/pb-alcove-1.jpg', '/images/guide/pb-alcove-2.jpg', '/images/guide/pb-alcove-3.jpg'],
    imageCaptions: [
      'Alcove wardrobes either side of a chimney breast — TV mounted on the chimney breast wall',
      'Alcove wardrobes with cornice at the top and open shelving',
      'Before: empty alcoves either side of chimney breast. After: wardrobes fitted into both alcoves',
    ],
    packages: ['paxbespoke', 'select'],
  },

  // Project 12: Across the chimney breast (PDF page 37)
  {
    id: 'pb-chimney-breast',
    title: 'Chimney Breast Integration',
    description: 'Wardrobes built across the chimney breast, creating an apparent flat wall. Frames cut around the chimney breast. With doors closed it looks like a flat wall.',
    benefit: 'Symmetrical storage without removing the chimney.',
    images: ['/images/guide/pb-chimney-breast-1.jpg', '/images/guide/pb-chimney-breast-2.jpg'],
    imageCaptions: [
      'Wardrobes spanning the full wall across the chimney breast — PAX interior visible with doors open',
      'Annotated: frames cut around the chimney breast — with doors closed it looks like a flat wall',
    ],
    packages: ['paxbespoke', 'select'],
  },

  // Project 13: TV space (PDF pages 38–40)
  {
    id: 'pb-tv-space',
    title: 'TV & Media Space',
    description: 'Dedicated TV space with top and bottom cupboards — with or without a chimney breast. Functional and aesthetic, great for bedrooms.',
    benefit: 'Dedicated TV space with top and bottom cupboards — with or without a chimney breast.',
    images: ['/images/guide/pb-tv-space-1.jpg', '/images/guide/pb-tv-space-2.jpg'],
    imageCaptions: [
      'TV niche in the centre with cupboards above and below — beige shaker doors',
      'Annotated: dedicated space for TV with slatted wood panel behind — grey shaker doors',
    ],
    packages: ['paxbespoke', 'select'],
  },

  // Project 14: Bridge cupboards (PDF page 41)
  {
    id: 'pb-bridge-cupboard',
    title: 'Over-Bed Bridge Cupboard',
    description: 'Wardrobes either side of the bed with bridging cupboards across the top. Maximises storage in bedrooms without taking up floor space.',
    benefit: 'Extra storage above the bed without losing floor space.',
    images: ['/images/guide/pb-bridge-cupboard-1.jpg'],
    imageCaptions: [
      'Cupboards above the bed — wardrobes on either side with bridge cupboards spanning across the top',
    ],
    packages: ['paxbespoke', 'select'],
  },

  // Project 15: SKYTTA sliding (PDF pages 42–43)
  {
    id: 'pb-skytta-sliding',
    title: 'SKYTTA Sliding Doors',
    description: 'IKEA SKYTTA sliding door system fitted to PAX frames. Floor to ceiling and wall to wall. Ideal for rooms where hinged doors would block space.',
    benefit: 'Space-saving sliding doors with a premium feel.',
    images: ['/images/guide/pb-skytta-sliding-1.jpg', '/images/guide/pb-skytta-sliding-2.jpg'],
    imageCaptions: [
      'SKYTTA sliding panels with centre mirror — modern, clean look',
      'Floor to ceiling and wall to wall door sliding system',
    ],
    packages: ['paxbespoke', 'select'],
  },

  // Project 16: Stairs bulkhead (PDF page 44)
  {
    id: 'pb-bulkhead',
    title: 'Built Around Bulkheads',
    description: 'Wardrobes built around an awkward stairs bulkhead. Frames configured at different heights to work around the staircase structure.',
    benefit: 'Hides structural elements and maximises storage.',
    images: ['/images/guide/pb-bulkhead-1.jpg'],
    imageCaptions: [
      'Wardrobes built around stairs bulk head — frames at different heights to work around the structure',
    ],
    packages: ['paxbespoke', 'select'],
  },

  // Project 17: Custom door/frame widths – BERGSBO / plain doors (PDF pages 45–46)
  {
    id: 'pb-custom-frames',
    title: 'Custom Frame Widths',
    description: 'When the room does not work with standard PAX widths. Non-standard frame widths to fill your exact wall space — BERGSBO (shaker) or plain doors.',
    benefit: 'Wall-to-wall fit with no awkward gaps.',
    images: ['/images/guide/pb-custom-frames-1.jpg', '/images/guide/pb-custom-frames-2.jpg'],
    imageCaptions: [
      'Custom width BERGSBO shaker doors — wall-to-wall fit',
      'Custom width BERGSBO doors — non-standard widths to fill the exact space',
    ],
    packages: ['paxbespoke', 'select'],
  },

  // Project 18: Office (PDF pages 47–48)
  {
    id: 'pb-office',
    title: 'Office & Desk Storage',
    description: 'Wardrobes combined with a bespoke desk — deeper tops, cable holes/caps. Combines storage with a work-from-home setup in one cohesive unit.',
    benefit: 'Work-from-home setup that looks built-in.',
    images: ['/images/guide/pb-office-1.jpg', '/images/guide/pb-office-2.jpg'],
    imageCaptions: [
      'Loft room desk setup with angled shelving following the ceiling slope',
      'Large desk with drawers/shelving to be used as home office space',
    ],
    packages: ['paxbespoke', 'select'],
  },

  // Project 19: Custom frames + custom-cut doors (PDF page 49)
  {
    id: 'pb-custom-cut-doors',
    title: 'Custom Cut Doors',
    description: 'For spaces where standard PAX dimensions do not fit cleanly. We customise frames and cut doors to non-standard sizes for a perfect fit.',
    benefit: 'Every door fits perfectly, no matter the space.',
    images: ['/images/guide/pb-custom-cut-doors-1.jpg', '/images/guide/pb-custom-cut-doors-2.jpg'],
    imageCaptions: [
      'White shaker doors with black knobs — full wall with custom frame and door widths',
      'L-shaped corner dressing room with custom-cut doors and gold handles',
    ],
    packages: ['paxbespoke', 'select'],
  },

  // ── Select-specific (PDF pages 50–57) ──

  // Select project 1: 5cm filler panels (PDF pages 50, 53–54)
  {
    id: 'select-filler',
    title: 'Select – 5cm Filler Panels',
    description: 'Premium look with perfect front and curated door choices. Bespoke-looking result with spray-painted or vinyl doors, refined filler finishes, and design details. Broader choice of door styles, colours, and premium finishes.',
    benefit: 'The most premium finish — bespoke front, practical interior.',
    images: ['/images/guide/select-filler-1.jpg', '/images/guide/select-filler-2.jpg', '/images/guide/select-filler-3.jpg'],
    imageCaptions: [
      'Sage green custom shaker doors with chrome knobs — 5cm filler surround',
      'Sage green doors colour-matched to walls with Victorian fireplace — Select overview',
      'Grey shaker doors on two walls with open shelving niche — narrow 5cm filler panels',
    ],
    packages: ['select'],
  },

  // Select project 2: Angle cut wardrobes – PRIORITY #1 to promote (PDF pages 55, 57)
  {
    id: 'select-angle-cut',
    title: 'Select – Angle Cut Wardrobes',
    description: 'For loft and angled spaces where customers want spray-painted or vinyl shaker doors and a premium finish. Advanced angle cuts with full wall integration. This is the #1 priority project type to promote for Select.',
    benefit: 'Premium finish in the most difficult spaces.',
    images: ['/images/guide/select-angle-cut-2.jpg'],
    imageCaptions: [
      'Angle-cut following loft slope with premium shaker doors',
    ],
    packages: ['select'],
  },
];

// ─── Process Steps (per package) ───
// Budget: customer supplies; PaxBespoke & Select: we supply & install
// Budget: basic install, PaxBespoke: custom finishes, Select: full bespoke integration

export const processSteps: Record<string, ProcessStep[]> = {
  budget: [
    {
      step: 1,
      title: 'Submit the Budget Form',
      description: 'Complete the form with your room measurements, photos, and IKEA Planner design link.',
      who: 'customer',
      details: [
        'Provide room measurements and photos of the space',
        'Include your IKEA Planner design link (created by you)',
        'Select availability for a 15–20 min Google Meet call',
      ],
    },
    {
      step: 2,
      title: 'Design Call (15–20 min, Google Meet)',
      description: 'We review your IKEA Planner design together, adjust if needed, and create a quote.',
      who: 'both',
      details: [
        'We review your IKEA Planner design (screen share)',
        'If adjustments are needed, we update the design and send a new link',
        'You receive a quote and we share fitting availability',
        'You pay the 50% deposit to secure the fitting slot',
      ],
    },
    {
      step: 3,
      title: 'Customer Orders and Checks the IKEA Items',
      description: 'You order the full IKEA setup, receive it, and confirm everything is ready.',
      who: 'customer',
      details: [
        'Order the full IKEA setup (including any extra materials for infill/filler)',
        'Receive the order and confirm no damaged or missing items',
        'Message us once everything has arrived and is ready for fitting',
      ],
    },
    {
      step: 4,
      title: 'Fitting Day',
      description: 'Our team arrives, reconfirms the space, installs the wardrobes, and issues the final invoice.',
      who: 'paxbespoke',
      details: [
        'Reconfirm the space and the final design with you',
        'Install the wardrobes — typically half a day to one day',
        'Review the result and issue the final invoice',
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
      answer: 'Professional installation of standard IKEA PAX wardrobes with filler panels. You purchase the IKEA items yourself — we handle the assembly, securing to wall, and filler panel fitting. It uses standard IKEA doors and finishes only.',
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
      answer: 'PaxBespoke Standard is built around the IKEA PAX system, refined and custom-fitted to your room. Doors and fronts can be customised within the IKEA/PAX ecosystem. If you want fully bespoke, made-to-order doors/fronts, our Select package is the better fit.',
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
