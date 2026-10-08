import { useColorScheme } from 'react-native';

/** Палитра Buty (как на сайте: tailwind.config.ts) для светлой и тёмной темы. */
const light = {
  background: '#FFFFFF',
  grouped: '#F2F2F7', // фон списков в стиле iOS
  card: '#FFFFFF',
  fill: '#F7F7F7',
  text: '#222222',
  textSoft: '#484848',
  muted: '#6A6A6A',
  faint: '#B0B0B0',
  line: '#DDDDDD',
  hair: '#EBEBEB',
  brand: '#E31C5F',
  brandBright: '#FF385C',
  brandSoft: '#FFF1F3',
  onBrand: '#FFFFFF',
  success: '#008A05',
  successSoft: '#EBF7EC',
  teal: '#008A80',
  tealSoft: '#E6F7F5',
  coral: '#D1501C',
  coralSoft: '#FFF4EE',
  amber: '#8A611A',
  amberSoft: '#FCF6E4',
};

const dark: typeof light = {
  background: '#000000',
  grouped: '#000000',
  card: '#1C1C1E',
  fill: '#2C2C2E',
  text: '#F5F5F7',
  textSoft: '#D1D1D6',
  muted: '#98989F',
  faint: '#636366',
  line: '#3A3A3C',
  hair: '#2C2C2E',
  brand: '#FF4F74',
  brandBright: '#FF385C',
  brandSoft: '#3A1220',
  onBrand: '#FFFFFF',
  success: '#45C35A',
  successSoft: '#11291A',
  teal: '#2CC5B8',
  tealSoft: '#0B2A28',
  coral: '#FF8A5B',
  coralSoft: '#3A1E12',
  amber: '#F1C24E',
  amberSoft: '#33290F',
};

export type Colors = typeof light;
export type Tone = 'brand' | 'success' | 'teal' | 'coral' | 'amber' | 'neutral';

export function useColors(): Colors {
  return useColorScheme() === 'dark' ? dark : light;
}

/** Цвет текста и фона для тона бейджа/плашки. */
export function toneColors(c: Colors, tone: Tone): { fg: string; bg: string } {
  switch (tone) {
    case 'brand':
      return { fg: c.brand, bg: c.brandSoft };
    case 'success':
      return { fg: c.success, bg: c.successSoft };
    case 'teal':
      return { fg: c.teal, bg: c.tealSoft };
    case 'coral':
      return { fg: c.coral, bg: c.coralSoft };
    case 'amber':
      return { fg: c.amber, bg: c.amberSoft };
    default:
      return { fg: c.textSoft, bg: c.fill };
  }
}

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const radius = { sm: 8, md: 12, lg: 16, xl: 22, pill: 999 } as const;

/** Типографика iOS (SF Pro — системный шрифт). */
export const type = {
  largeTitle: { fontSize: 34, lineHeight: 41, fontWeight: '700' as const, letterSpacing: 0.37 },
  title: { fontSize: 28, lineHeight: 34, fontWeight: '700' as const },
  title2: { fontSize: 22, lineHeight: 28, fontWeight: '700' as const },
  title3: { fontSize: 20, lineHeight: 25, fontWeight: '600' as const },
  headline: { fontSize: 17, lineHeight: 22, fontWeight: '600' as const },
  body: { fontSize: 17, lineHeight: 22, fontWeight: '400' as const },
  callout: { fontSize: 16, lineHeight: 21, fontWeight: '400' as const },
  subhead: { fontSize: 15, lineHeight: 20, fontWeight: '400' as const },
  footnote: { fontSize: 13, lineHeight: 18, fontWeight: '400' as const },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: '400' as const },
};
export type TypeVariant = keyof typeof type;

/** Тон уровня доказательности — как «лестница» на сайте. */
export const EVIDENCE_TONE: Record<string, Tone> = {
  STRONG: 'success',
  MODERATE: 'teal',
  LIMITED: 'amber',
  ANECDOTAL: 'neutral',
};

export const SEVERITY_TONE: Record<string, Tone> = {
  high: 'coral',
  medium: 'amber',
  low: 'neutral',
};
