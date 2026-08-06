import type { WidgetBackground, WidgetBackgroundPalette } from '../types';

const TARGET_WIDTH = 720;
const TARGET_HEIGHT = 1280;
const TARGET_RATIO = TARGET_WIDTH / TARGET_HEIGHT;

type Rgb = { r: number; g: number; b: number };

const clamp = (value: number) => Math.max(0, Math.min(255, Math.round(value)));
const rgbToHex = ({ r, g, b }: Rgb) => `#${[r, g, b].map((value) => clamp(value).toString(16).padStart(2, '0')).join('')}`;
const mix = (a: Rgb, b: Rgb, amount: number): Rgb => ({
  r: a.r + (b.r - a.r) * amount,
  g: a.g + (b.g - a.g) * amount,
  b: a.b + (b.b - a.b) * amount,
});
const luminance = ({ r, g, b }: Rgb) => (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
const saturationScore = ({ r, g, b }: Rgb) => {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const saturation = max === 0 ? 0 : (max - min) / max;
  const lightness = (max + min) / 510;
  return saturation * (1 - Math.abs(lightness - 0.56));
};

const createPalette = (context: CanvasRenderingContext2D): WidgetBackgroundPalette => {
  const sampleCanvas = document.createElement('canvas');
  sampleCanvas.width = 36;
  sampleCanvas.height = 64;
  const sampleContext = sampleCanvas.getContext('2d', { willReadFrequently: true });
  if (!sampleContext) throw new Error('No se pudo analizar la paleta del fondo.');
  sampleContext.drawImage(context.canvas, 0, 0, sampleCanvas.width, sampleCanvas.height);
  const pixels = sampleContext.getImageData(0, 0, sampleCanvas.width, sampleCanvas.height).data;

  let total: Rgb = { r: 0, g: 0, b: 0 };
  let count = 0;
  let accent: Rgb = { r: 235, g: 136, b: 175 };
  let accentScore = -1;

  for (let index = 0; index < pixels.length; index += 4) {
    if (pixels[index + 3] < 180) continue;
    const color = { r: pixels[index], g: pixels[index + 1], b: pixels[index + 2] };
    total = { r: total.r + color.r, g: total.g + color.g, b: total.b + color.b };
    count += 1;
    const score = saturationScore(color);
    if (score > accentScore) {
      accent = color;
      accentScore = score;
    }
  }

  const average = count ? { r: total.r / count, g: total.g / count, b: total.b / count } : { r: 236, g: 221, b: 233 };
  const dark = luminance(average) < 0.43;
  const white = { r: 255, g: 252, b: 247 };
  const black = { r: 25, g: 18, b: 28 };
  const surface = dark ? mix(average, black, 0.56) : mix(average, white, 0.82);
  const glassStrong = dark ? mix(surface, black, 0.22) : mix(surface, white, 0.22);
  const secondary = mix(accent, average, 0.42);

  return {
    background: rgbToHex(average),
    surface: rgbToHex(surface),
    primary: rgbToHex(accent),
    secondary: rgbToHex(secondary),
    text: dark ? '#fffaf4' : '#3f302d',
    muted: dark ? '#e0d3de' : '#78625f',
    border: rgbToHex(dark ? mix(accent, white, 0.42) : mix(accent, white, 0.58)),
    shadow: dark ? '#09060d' : '#5f4050',
    glass: rgbToHex(surface),
    glassStrong: rgbToHex(glassStrong),
    dark,
  };
};

const loadImage = (file: File) => new Promise<HTMLImageElement>((resolve, reject) => {
  const url = URL.createObjectURL(file);
  const image = new Image();
  image.onload = () => {
    URL.revokeObjectURL(url);
    resolve(image);
  };
  image.onerror = () => {
    URL.revokeObjectURL(url);
    reject(new Error('No se pudo leer la imagen seleccionada.'));
  };
  image.src = url;
});

const fileNameWithoutExtension = (name: string) => name.replace(/\.[^.]+$/, '').trim() || 'Fondo personalizado';

export async function importWidgetBackground(file: File, language: 'es' | 'en' = 'es'): Promise<WidgetBackground> {
  if (!file.type.startsWith('image/')) throw new Error('Selecciona un archivo de imagen válido.');
  const image = await loadImage(file);
  if (!image.naturalWidth || !image.naturalHeight) throw new Error('La imagen seleccionada no tiene un tamaño válido.');

  const sourceRatio = image.naturalWidth / image.naturalHeight;
  let sourceX = 0;
  let sourceY = 0;
  let sourceWidth = image.naturalWidth;
  let sourceHeight = image.naturalHeight;

  if (sourceRatio > TARGET_RATIO) {
    sourceWidth = image.naturalHeight * TARGET_RATIO;
    sourceX = (image.naturalWidth - sourceWidth) / 2;
  } else if (sourceRatio < TARGET_RATIO) {
    sourceHeight = image.naturalWidth / TARGET_RATIO;
    sourceY = (image.naturalHeight - sourceHeight) / 2;
  }

  const canvas = document.createElement('canvas');
  canvas.width = TARGET_WIDTH;
  canvas.height = TARGET_HEIGHT;
  const context = canvas.getContext('2d', { alpha: false, willReadFrequently: true });
  if (!context) throw new Error('No se pudo preparar el recorte del fondo.');

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, TARGET_WIDTH, TARGET_HEIGHT);

  const palette = createPalette(context);
  const src = canvas.toDataURL('image/jpeg', 0.86);
  const createdAt = new Date().toISOString();

  return {
    id: `custom-widget-background-${crypto.randomUUID()}`,
    name: fileNameWithoutExtension(file.name),
    themeId: 'custom-widget-backgrounds',
    themeName: language === 'en' ? 'My backgrounds' : 'Mis fondos',
    themeDescription: language === 'en' ? 'Imported backgrounds automatically cropped to a 9:16 format.' : 'Fondos importados y recortados automáticamente a formato 9:16.',
    src,
    width: TARGET_WIDTH,
    height: TARGET_HEIGHT,
    aspectRatio: '9:16',
    palette,
    builtin: false,
    sourceName: file.name,
    createdAt,
  };
}
