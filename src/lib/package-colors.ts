// Package color system
// Budget = #f28c43 (warm orange)
// Select = #2d5c37 (deep green)
// PaxBespoke = gradient blend of both

export const PACKAGE_COLORS = {
  budget: {
    primary: '#f28c43',
    primaryHover: '#e07c33',
    bg: 'bg-[#f28c43]',
    bgLight: 'bg-[#f28c43]/5',
    bgLighter: 'bg-[#f28c43]/10',
    text: 'text-[#f28c43]',
    border: 'border-[#f28c43]',
    borderLight: 'border-[#f28c43]/20',
    ring: 'ring-[#f28c43]/50',
    checkBg: 'bg-[#f28c43]/10',
    checkText: 'text-[#f28c43]',
    shadow: 'shadow-[#f28c43]/25',
  },
  paxbespoke: {
    primary: '#f28c43',
    primaryAlt: '#2d5c37',
    primaryHover: '#e07c33',
    bg: 'bg-gradient-to-r from-[#f28c43] to-[#2d5c37]',
    bgLight: 'bg-gradient-to-r from-[#f28c43]/5 to-[#2d5c37]/5',
    bgLighter: 'bg-gradient-to-r from-[#f28c43]/10 to-[#2d5c37]/10',
    text: 'text-[#f28c43]',
    textAlt: 'text-[#2d5c37]',
    border: 'border-[#f28c43]',
    borderLight: 'border-[#f28c43]/20',
    ring: 'ring-[#f28c43]/50',
    checkBg: 'bg-[#2d5c37]/10',
    checkText: 'text-[#2d5c37]',
    shadow: 'shadow-[#f28c43]/25',
  },
  select: {
    primary: '#2d5c37',
    primaryHover: '#234a2c',
    bg: 'bg-[#2d5c37]',
    bgLight: 'bg-[#2d5c37]/5',
    bgLighter: 'bg-[#2d5c37]/10',
    text: 'text-[#2d5c37]',
    border: 'border-[#2d5c37]',
    borderLight: 'border-[#2d5c37]/20',
    ring: 'ring-[#2d5c37]/50',
    checkBg: 'bg-[#2d5c37]/10',
    checkText: 'text-[#2d5c37]',
    shadow: 'shadow-[#2d5c37]/25',
  },
} as const;

export type PackageId = keyof typeof PACKAGE_COLORS;

export function getPackageColors(id: string) {
  return PACKAGE_COLORS[id as PackageId] || PACKAGE_COLORS.paxbespoke;
}
