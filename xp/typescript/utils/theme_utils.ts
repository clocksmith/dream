/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {Blend} from '../blend/blend.js';
import {CorePalette} from '../palettes/core_palette.js';
import {TonalPalette} from '../palettes/tonal_palette.js';
import {Scheme} from '../scheme/scheme.js';

import {sourceColorFromImage} from './image_utils.js';
import {hexFromArgb} from './string_utils.js';

/**
 * Custom color used to pair with a theme
 */
export interface CustomColor {
  value: number;
  name: string;
  blend: boolean;
}

/**
 * Color group
 */
export interface ColorGroup {
  color: number;
  onColor: number;
  colorContainer: number;
  onColorContainer: number;
}

/**
 * Custom Color Group
 */
export interface CustomColorGroup {
  color: CustomColor;
  value: number;
  light: ColorGroup;
  dark: ColorGroup;
}

/**
 * Theme
 */
export interface Theme {
  source: number;
  schemes: {light: Scheme; dark: Scheme;};
  palettes: {
    primary: TonalPalette; secondary: TonalPalette; tertiary: TonalPalette;
    neutral: TonalPalette;
    neutralVariant: TonalPalette;
    error: TonalPalette;
  };
  customColors: CustomColorGroup[];
}

/**
 * Generate a theme from a source color
 *
 * @param source Source color
 * @param customColors Array of custom colors
 * @return Theme object
 */
export function themeFromSourceColor(
    source: number, customColors: CustomColor[] = []): Theme {
  const palette = CorePalette.of(source);
  return {
    source,
    schemes: {
      light: Scheme.light(source),
      dark: Scheme.dark(source),
    },
    palettes: {
      primary: palette.a1,
      secondary: palette.a2,
      tertiary: palette.a3,
      neutral: palette.n1,
      neutralVariant: palette.n2,
      error: palette.error,
    },
    customColors: customColors.map((c) => customColor(source, c)),
  };
}

/**
 * Generate a theme from an image source
 *
 * @param image Image element
 * @param customColors Array of custom colors
 * @return Theme object
 */
export async function themeFromImage(
    image: HTMLImageElement, customColors: CustomColor[] = []) {
  const source = await sourceColorFromImage(image);
  return themeFromSourceColor(source, customColors);
}

/**
 * Generate custom color group from source and target color
 *
 * @param source Source color
 * @param color Custom color
 * @return Custom color group
 *
 * @link https://m3.material.io/styles/color/the-color-system/color-roles
 */
export function customColor(
    source: number, color: CustomColor): CustomColorGroup {
  let value = color.value;
  const from = value;
  const to = source;
  if (color.blend) {
    value = Blend.harmonize(from, to);
  }
  const palette = CorePalette.of(value);
  const tones = palette.a1;
  return {
    color,
    value,
    light: {
      color: tones.tone(40),
      onColor: tones.tone(100),
      colorContainer: tones.tone(90),
      onColorContainer: tones.tone(10),
    },
    dark: {
      color: tones.tone(80),
      onColor: tones.tone(20),
      colorContainer: tones.tone(30),
      onColorContainer: tones.tone(90),
    },
  };
}

/**
 * Apply a theme to an element
 *
 * @param theme Theme object
 * @param options Options
 */
export function applyTheme(theme: Theme, options?: {
  dark?: boolean,
  target?: HTMLElement,
  brightnessSuffix?: boolean,
  paletteTones?: number[],
}) {
  const target = options?.target || document.body;
  const isDark = options?.dark ?? false;
  const scheme = isDark ? theme.schemes.dark : theme.schemes.light;
  setSchemeProperties(target, scheme);
  if (options?.brightnessSuffix) {
    setSchemeProperties(target, theme.schemes.dark, '-dark');
    setSchemeProperties(target, theme.schemes.light, '-light');
  }
  if (options?.paletteTones) {
    const tones = options?.paletteTones ?? [];
    for (const [key, palette] of Object.entries(theme.palettes)) {
      const paletteKey = key.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
      for (const tone of tones) {
        const token = `--md-ref-palette-${paletteKey}-${paletteKey}${tone}`;
        const color = hexFromArgb(palette.tone(tone));
        target.style.setProperty(token, color);
      }
    }
  }
}

function setSchemeProperties(
    target: HTMLElement,
    scheme: Scheme,
    suffix: string = '',
) {
  for (const [key, value] of Object.entries(scheme.toJSON())) {
    const token = key.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
    const color = hexFromArgb(value);
    target.style.setProperty(`--md-sys-color-${token}${suffix}`, color);
  }
}


/////\\\\//// Experiment \\\\\////\\\\

// === Assume these imports exist from the original code ===
// import { Blend } from '../blend/blend.js';
// import { CorePalette } from '../palettes/core_palette.js';
// import { TonalPalette } from '../palettes/tonal_palette.js';
// import { Scheme } from '../scheme/scheme.js';
// import { sourceColorFromImage } from './image_utils.js'; // Existing single color extraction
// import { hexFromArgb } from './string_utils.js';
// import { Theme, CustomColor, CustomColorGroup, ColorGroup } from './theme.js'; // Assuming interfaces are in a separate file or accessible

// === NEW UTILITY (Conceptual) ===
// NOTE: You would need an actual implementation for this, likely using
// a color quantization library (e.g., node-vibrant, quantize.js)
// This is a placeholder signature.
/**
 * Extracts multiple source colors from an image.
 * @param image The image element.
 * @param count The maximum number of colors to extract. Defaults to 5.
 * @return A promise that resolves to an array of dominant color ARGB values.
 */
async function sourceColorsFromImage(
    image: HTMLImageElement, count: number = 5): Promise<number[]> {
  console.warn(
      'sourceColorsFromImage is a placeholder and needs a real implementation using color quantization.');
  // Placeholder implementation: returns shades of gray
  return new Array(count).fill(0).map((_, i) => {
    const shade = Math.round(255 * (i / Math.max(1, count - 1)));
    return (255 << 24) | (shade << 16) | (shade << 8) | shade; // ARGB
  });
  // Replace above with actual quantization logic
}


// === NEW CORE FUNCTION ===

/**
 * Defines how source colors map to theme roles.
 */
export interface SourceMappingOptions {
  /** Index in the `sources` array for the primary palette. Defaults to 0. */
  primarySourceIndex?: number;
  /** Index in the `sources` array for the secondary palette. Defaults to 1. */
  secondarySourceIndex?: number;
  /** Index in the `sources` array for the tertiary palette. Defaults to 2. */
  tertiarySourceIndex?: number;
  /** Index in the `sources` array to derive neutral palettes from. Defaults to 0. */
  neutralSourceIndex?: number;
  /** Index in the `sources` array to derive the error palette from. Defaults to 0. */
  errorSourceIndex?: number;
}

/**
 * Options for generating a theme from multiple source colors.
 */
export interface ThemeFromSourcesOptions {
  /** Defines which source color maps to which palette role. */
  mapping?: SourceMappingOptions;
  /**
   * Strategy for relating secondary/tertiary colors to the primary color.
   * 'direct': Use source colors directly (less inherent harmony).
   * 'harmonized': Blend secondary/tertiary sources with the primary source (more inherent harmony).
   * Defaults to 'direct'.
   */
  harmonyStrategy?: 'direct'|'harmonized';
  /** Array of custom colors to include in the theme. */
  customColors?: CustomColor[];
}

/**
 * Generates a theme based on an array of source colors, allowing direct
 * mapping to primary, secondary, and tertiary roles.
 *
 * @param sources An array of ARGB color values. Minimum length of 1 is required.
 * @param options Configuration options for mapping, harmony, and custom colors.
 * @return A Theme object. Contrast ratios are inherent in TonalPalette generation.
 */
export function themeFromSourceColors(
    sources: number[], options: ThemeFromSourcesOptions = {}): Theme {
  if (!sources || sources.length === 0) {
    throw new Error('At least one source color is required.');
  }

  const mapping = options.mapping ?? {};
  const harmonyStrategy = options.harmonyStrategy ?? 'direct';
  const customColors = options.customColors ?? [];

  // Determine effective source indices, handling out-of-bounds gracefully
  const primaryIndex = mapping.primarySourceIndex ?? 0;
  const secondaryIndex = mapping.secondarySourceIndex ?? 1;
  const tertiaryIndex = mapping.tertiarySourceIndex ?? 2;
  const neutralIndex = mapping.neutralSourceIndex ?? 0;
  const errorIndex = mapping.errorSourceIndex ?? 0;

  const getSource = (index: number, fallbackIndex: number = 0): number => {
    return sources[Math.min(index, sources.length - 1)] ?? sources[fallbackIndex];
  };

  let primarySource = getSource(primaryIndex);
  let secondarySource = getSource(secondaryIndex, primaryIndex);
  let tertiarySource = getSource(tertiaryIndex, primaryIndex);
  const neutralSource = getSource(neutralIndex, primaryIndex);
  const errorSource = getSource(errorIndex, primaryIndex);

  // Apply harmony strategy if requested
  if (harmonyStrategy === 'harmonized' && sources.length > 1) {
      // Blend secondary and tertiary with the primary source
      secondarySource = Blend.harmonize(secondarySource, primarySource);
      tertiarySource = Blend.harmonize(tertiarySource, primarySource);
      // Note: Neutrals and Error are generally not harmonized this way
  }

  // Generate palettes directly from the chosen/harmonized sources
  // We use CorePalette only to easily get an error palette structure,
  // based on the designated errorSource.
  const errorPaletteCore = CorePalette.of(errorSource);

  const palettes = {
    primary: TonalPalette.fromInt(primarySource),
    secondary: TonalPalette.fromInt(secondarySource),
    tertiary: TonalPalette.fromInt(tertiarySource),
    neutral: TonalPalette.fromInt(neutralSource), // Or use CorePalette.of(neutralSource).n1 for Material's specific neutral derivation
    neutralVariant: CorePalette.of(neutralSource).n2, // Using CorePalette logic for neutral variant is common
    error: errorPaletteCore.error,
  };

  // Generate schemes using the primary source as the key color reference
  // (Material schemes often key off the primary color)
  const schemes = {
    light: Scheme.light(primarySource),
    dark: Scheme.dark(primarySource),
  };

  // Process custom colors, blending with the primary source
  const processedCustomColors = customColors.map(
      (c) => customColor(primarySource, c) // Use existing customColor logic
  );

  // Use the first source as the nominal "source" for the theme object
  const nominalSource = sources[0];

  return {
    source: nominalSource, // Representing the origin, though multiple sources were used
    schemes,
    palettes,
    customColors: processedCustomColors,
  };
}


// === NEW IMAGE FUNCTION ===

/**
 * Options for generating a theme from an image using multiple source colors.
 */
export interface ThemeFromImageSourcesOptions extends ThemeFromSourcesOptions {
 /** The maximum number of source colors to extract from the image. Defaults to 5. */
  numSources?: number;
}

/**
 * Generate a theme from an image source, extracting multiple colors.
 *
 * @param image Image element.
 * @param options Configuration options for extraction, mapping, harmony, and custom colors.
 * @return A promise resolving to the generated Theme object.
 */
export async function themeFromImageUsingSources(
    image: HTMLImageElement, options: ThemeFromImageSourcesOptions = {}): Promise<Theme> {
  const numSources = options.numSources ?? 5;
  const extractedSources = await sourceColorsFromImage(image, numSources);

  if (extractedSources.length === 0) {
      // Handle case where no colors could be extracted - maybe return a default theme?
      console.warn("Could not extract colors from image, using fallback.");
      // Fallback to a single default color theme
      const fallbackSource = 0xff4285F4; // Google Blue
      return themeFromSourceColor(fallbackSource, options.customColors);
      // Or throw an error: throw new Error("Could not extract colors from image.");
  }

  return themeFromSourceColors(extractedSources, options);
}


// === NEW HELPER FOR VARIATIONS ===

/**
 * Options for generating theme variants.
 */
export interface GenerateThemeVariantsOptions {
  /** Input can be an image or predefined source colors */
  sourceInput: HTMLImageElement | number[];
   /** Base custom colors for all variants */
  customColors?: CustomColor[];
  /** Array of harmony strategies to try */
  harmonyStrategies?: ('direct'|'harmonized')[];
  /** Array of SourceMappingOptions to try (if sourceInput provides enough colors) */
  mappings?: SourceMappingOptions[];
  /** Number of colors to extract if sourceInput is an image */
  numSources?: number;
}

/**
 * Generates multiple theme variants based on different strategies or mappings
 * from a single image or a set of source colors.
 *
 * Useful for allowing users to preview and select a preferred theme.
 *
 * @param options Configuration for generating variants.
 * @return A promise resolving to an array of generated Theme objects.
 */
export async function generateThemeVariants(
    options: GenerateThemeVariantsOptions): Promise<Theme[]> {
  const {
    sourceInput,
    customColors = [],
    harmonyStrategies = ['direct', 'harmonized'],
    mappings = [{}], // Default: use the standard 0,1,2 mapping
    numSources = 5,
  } = options;

  let baseSources: number[];

  if (sourceInput instanceof HTMLImageElement) {
    baseSources = await sourceColorsFromImage(sourceInput, numSources);
    if (baseSources.length === 0) {
        console.warn("Could not extract colors for variants, returning empty array.");
        return [];
    }
  } else {
    baseSources = sourceInput;
    if (baseSources.length === 0) {
        console.warn("No source colors provided for variants, returning empty array.");
        return [];
    }
  }

  const themes: Theme[] = [];

  for (const strategy of harmonyStrategies) {
    for (const mapping of mappings) {
      // Check if mapping is feasible with the number of sources
      const requiredIndices = [
        mapping.primarySourceIndex ?? 0,
        mapping.secondarySourceIndex ?? 1,
        mapping.tertiarySourceIndex ?? 2,
        mapping.neutralSourceIndex ?? 0,
        mapping.errorSourceIndex ?? 0,
      ];
       if (Math.max(...requiredIndices) >= baseSources.length && baseSources.length > 0) {
         console.warn(`Skipping mapping ${JSON.stringify(mapping)} as it requires more sources than available (${baseSources.length}).`);
         continue; // Skip this mapping if not enough source colors
       }

       try {
          const theme = themeFromSourceColors(baseSources, {
            mapping,
            harmonyStrategy: strategy,
            customColors,
          });
          // TODO: Maybe add metadata to the theme about how it was generated?
          // theme.metadata = { strategy, mapping };
          themes.push(theme);
       } catch (error) {
          console.error(`Error generating theme variant with strategy ${strategy} and mapping ${JSON.stringify(mapping)}:`, error);
       }
    }
  }

  // Simple deduplication based on primary palette color (could be more sophisticated)
  const uniqueThemes = Array.from(new Map(themes.map(t => [t.palettes.primary.keyColor.toInt(), t])).values());

  return uniqueThemes;
}

// === Existing customColor function (assumed to be available) ===
// export function customColor(source: number, color: CustomColor): CustomColorGroup { ... }