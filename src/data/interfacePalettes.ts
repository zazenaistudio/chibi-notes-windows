import type { InterfacePalette, InterfaceThemeSettings } from '../types';

export const DEFAULT_INTERFACE_THEME: InterfaceThemeSettings = {
  paletteId: 'chibi-notes-original',
  background: '#f7fbff',
  surface: '#fffaf1',
  surfaceAlt: '#dff5ff',
  primary: '#ff9fb2',
  secondary: '#8fdfff',
  accent: '#ffd761',
  text: '#5b3e2f',
  muted: '#8a746b',
  button: '#ffe4ea',
  buttonHover: '#ffd0dc',
  border: '#bfe8f8',
  danger: '#e86b78',
  panelOpacity: 0.96,
  glow: 22,
  darkMode: false
};

export const INTERFACE_PALETTES: InterfacePalette[] = [
  {
    id: 'chibi-notes-original',
    name: 'Chibi Notes Original',
    description: 'Azul cielo, crema, rosa coral, amarillo pollito y lavanda.',
    colors: { ...DEFAULT_INTERFACE_THEME }
  },
  {
    id: 'sakura-cream',
    name: 'Sakura Cream',
    description: 'Rosa cerezo, crema cálida y texto cacao.',
    colors: { ...DEFAULT_INTERFACE_THEME, paletteId: 'sakura-cream', background: '#fff7fa', surface: '#fffdf8', surfaceAlt: '#ffe4ee', primary: '#f48fb1', secondary: '#ffc7d8', accent: '#ffd77c', text: '#5f3d4b', muted: '#8b6e79', button: '#ffe2eb', buttonHover: '#ffcddc', border: '#f4bfd0', danger: '#db647f' }
  },
  {
    id: 'lavender-cloud',
    name: 'Lavender Cloud',
    description: 'Lavanda suave, azul nube y brillo nacarado.',
    colors: { ...DEFAULT_INTERFACE_THEME, paletteId: 'lavender-cloud', background: '#f8f6ff', surface: '#fffaff', surfaceAlt: '#e8e1ff', primary: '#b397f5', secondary: '#a7dcff', accent: '#ffd887', text: '#504568', muted: '#766d8d', button: '#ece4ff', buttonHover: '#dcd0ff', border: '#d5c8ff', danger: '#df6e8b' }
  },
  {
    id: 'mint-mochi',
    name: 'Mint Mochi',
    description: 'Menta clara, vainilla y melocotón pastel.',
    colors: { ...DEFAULT_INTERFACE_THEME, paletteId: 'mint-mochi', background: '#f5fff9', surface: '#fffdf5', surfaceAlt: '#dff8ec', primary: '#79d1b2', secondary: '#9fddf0', accent: '#ffc987', text: '#3f5f55', muted: '#6f877f', button: '#ddf6eb', buttonHover: '#c7eedf', border: '#aee3d1', danger: '#e7767e' }
  },
  {
    id: 'peach-soda',
    name: 'Peach Soda',
    description: 'Melocotón, rosa gaseosa y azul hielo.',
    colors: { ...DEFAULT_INTERFACE_THEME, paletteId: 'peach-soda', background: '#fff8f2', surface: '#fffdf8', surfaceAlt: '#ffe5d7', primary: '#ff9d7b', secondary: '#9ee3ef', accent: '#ffd66b', text: '#65483f', muted: '#8f746a', button: '#ffe2d7', buttonHover: '#ffcfbd', border: '#f6c4af', danger: '#e86773' }
  },
  {
    id: 'blueberry-milk',
    name: 'Blueberry Milk',
    description: 'Azul arándano, crema fría y violeta pastel.',
    colors: { ...DEFAULT_INTERFACE_THEME, paletteId: 'blueberry-milk', background: '#f5f7ff', surface: '#fbfbff', surfaceAlt: '#dfe8ff', primary: '#7d8fe8', secondary: '#9bd7f5', accent: '#e8b9ff', text: '#424a6b', muted: '#69728e', button: '#e3e9ff', buttonHover: '#cfd9ff', border: '#bdc9f2', danger: '#e36f91' }
  },
  {
    id: 'midnight-candy',
    name: 'Midnight Candy',
    description: 'Modo oscuro con neón pastel y texto crema.',
    colors: { ...DEFAULT_INTERFACE_THEME, paletteId: 'midnight-candy', background: '#171523', surface: '#211d30', surfaceAlt: '#2d2742', primary: '#ff7fb8', secondary: '#63d8f0', accent: '#ffd45f', text: '#fff6ec', muted: '#b9abc2', button: '#352d49', buttonHover: '#493a62', border: '#6c568d', danger: '#ff7088', panelOpacity: 0.98, glow: 30, darkMode: true }
  },
  {
    id: 'ocean-jelly',
    name: 'Ocean Jelly',
    description: 'Turquesa acuoso, azul gelatina y coral.',
    colors: { ...DEFAULT_INTERFACE_THEME, paletteId: 'ocean-jelly', background: '#f0fbff', surface: '#f9feff', surfaceAlt: '#d3f4fa', primary: '#48bfd0', secondary: '#78aef2', accent: '#ffb7a0', text: '#315a67', muted: '#64818a', button: '#d9f6fa', buttonHover: '#c0edf4', border: '#9fdde8', danger: '#e76f7c' }
  },
  {
    id: 'monochrome-soft',
    name: 'Monochrome Soft',
    description: 'Grises cálidos con alto contraste accesible.',
    colors: { ...DEFAULT_INTERFACE_THEME, paletteId: 'monochrome-soft', background: '#f5f5f3', surface: '#ffffff', surfaceAlt: '#e8e8e4', primary: '#55585d', secondary: '#8a8e94', accent: '#d9b65f', text: '#242629', muted: '#686b70', button: '#ecece8', buttonHover: '#deded8', border: '#c7c8c3', danger: '#c85763', glow: 10 }
  }
];
