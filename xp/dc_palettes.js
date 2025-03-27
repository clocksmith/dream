/**
 * @file dc_palettes.js
 * @module dc_palettes
 * @description
 * This file defines classes for creating and managing color palettes within
 * the dynamic color library, including TonalPalette, KeyColor, CorePalette,
 * and CorePalettes.
 * @requires module:dc_color
 */

import { Hct } from './dc_color.js';

/**
 * A tonal palette based on a color's hue and chroma.
 */
class TonalPalette {
    /**
     * @param {number} hue - Hue in degrees (0-360)
     * @param {number} chroma - Chroma
     * @param {Hct} keyColor - Key color for the palette
     */
    hue;
    chroma;
    keyColor;
    cache;

    /**
     * Creates a new tonal palette.
     *
     * @param {number} hue - Hue in degrees (0-360)
     * @param {number} chroma - Chroma
     * @param {Hct} keyColor - Key color for the palette
     */
    constructor(hue, chroma, keyColor) {
        this.hue = hue;
        this.chroma = chroma;
        this.keyColor = keyColor;
        this.cache = new Map();
    }

    /**
     * Creates a tonal palette from an ARGB integer.
     *
     * @param {number} argb - ARGB color
     * @return {TonalPalette} - Tonal palette
     */
    static fromInt(argb) {
        return TonalPalette.fromHct(Hct.fromInt(argb));
    }

    /**
     * Creates a tonal palette from an HCT color.
     *
     * @param {Hct} hct - HCT color
     * @return {TonalPalette} - Tonal palette
     */
    static fromHct(hct) {
        return new TonalPalette(hct.hue, hct.chroma, hct);
    }

    /**
     * Creates a tonal palette from a hue and chroma.
     *
     * @param {number} hue - Hue in degrees (0-360)
     * @param {number} chroma - Chroma
     * @return {TonalPalette} - Tonal palette
     */
    static fromHueAndChroma(hue, chroma) {
        const keyColor = new KeyColor(hue, chroma).create();
        return new TonalPalette(hue, chroma, keyColor);
    }

    /**
     * Gets the ARGB color for a given tone.
     *
     * @param {number} tone - Tone (L* value, 0-100)
     * @return {number} - ARGB color
     */
    tone(tone) {
        // Check cache first
        let argb = this.cache.get(tone);

        if (!argb) {
            // Create color and cache it
            argb = Hct.from(this.hue, this.chroma, tone).toInt();
            this.cache.set(tone, argb);
        }

        return argb;
    }

    /**
     * Gets the HCT color for a given tone.
     *
     * @param {number} tone - Tone (L* value, 0-100)
     * @return {Hct} - HCT color
     */
    getHct(tone) {
        return Hct.fromInt(this.tone(tone));
    }
}

/**
 * Utility to find appropriate key colors for tonal palettes.
 */
class KeyColor {
    /**
     * @param {number} hue - Hue in degrees (0-360)
     * @param {number} requestedChroma - Requested chroma
     */
    hue;
    requestedChroma;
    chromaCache;
    maxChromaValue = 200;

    /**
     * Creates a new key color finder.
     *
     * @param {number} hue - Hue in degrees (0-360)
     * @param {number} requestedChroma - Requested chroma
     */
    constructor(hue, requestedChroma) {
        this.hue = hue;
        this.requestedChroma = requestedChroma;
        this.chromaCache = new Map();
    }

    /**
     * Creates a key color.
     *
     * @return {Hct} - Key color
     */
    create() {
        const preferredTone = 50;
        const toneStep = 1;
        const epsilon = 0.01;

        // Binary search to find a color with the highest chroma
        let lowerTone = 0;
        let upperTone = 100;

        while (lowerTone < upperTone) {
            const midTone = Math.floor((lowerTone + upperTone) / 2);

            // Check if moving away from mid increases chroma
            const isAscending = this.maxChroma(midTone) < this.maxChroma(midTone + toneStep);

            // Check if current tone has sufficient chroma
            const sufficientChroma = this.maxChroma(midTone) >= this.requestedChroma - epsilon;

            if (sufficientChroma) {
                // Found a tone with sufficient chroma, now choose the one closer to the preferred tone
                if (Math.abs(lowerTone - preferredTone) < Math.abs(upperTone - preferredTone)) {
                    upperTone = midTone;
                } else {
                    if (lowerTone === midTone) {
                        // Avoid infinite loop
                        return Hct.from(this.hue, this.requestedChroma, lowerTone);
                    }
                    lowerTone = midTone;
                }
            } else if (isAscending) {
                // Need to move up in tone to get more chroma
                lowerTone = midTone + toneStep;
            } else {
                // Need to move down in tone to get more chroma
                upperTone = midTone;
            }
        }

        return Hct.from(this.hue, this.requestedChroma, lowerTone);
    }

    /**
     * Finds the maximum achievable chroma for a given tone.
     *
     * @param {number} tone - Tone (L* value, 0-100)
     * @return {number} - Maximum chroma
     */
    maxChroma(tone) {
        if (this.chromaCache.has(tone)) {
            return this.chromaCache.get(tone);
        }

        // Create color with very high chroma and get the actual achievable chroma
        const chroma = Hct.from(this.hue, this.maxChromaValue, tone).chroma;

        this.chromaCache.set(tone, chroma);
        return chroma;
    }
}

/**
 * Core material palette with all tonal palettes needed for theming.
 */
class CorePalette {
    /**
     * @param {TonalPalette} a1 - Primary accent palette
     * @param {TonalPalette} a2 - Secondary accent palette
     * @param {TonalPalette} a3 - Tertiary accent palette
     * @param {TonalPalette} n1 - Neutral palette
     * @param {TonalPalette} n2 - Neutral variant palette
     * @param {TonalPalette} error - Error palette
     */
    a1;
    a2;
    a3;
    n1;
    n2;
    error;

    /**
     * Creates a new core palette.
     *
     * @param {number} argb - ARGB color to derive the palette from
     * @param {boolean} isContent - Whether this is a content palette
     */
    constructor(argb, isContent) {
        const hct = Hct.fromInt(argb);
        const hue = hct.hue;
        const chroma = hct.chroma;

        if (isContent) {
            // Content palettes preserve chroma
            this.a1 = TonalPalette.fromHueAndChroma(hue, chroma);
            this.a2 = TonalPalette.fromHueAndChroma(hue, chroma / 3);
            this.a3 = TonalPalette.fromHueAndChroma(hue + 60, chroma / 2);
            this.n1 = TonalPalette.fromHueAndChroma(hue, Math.min(chroma / 12, 4));
            this.n2 = TonalPalette.fromHueAndChroma(hue, Math.min(chroma / 6, 8));
        } else {
            // Non-content palettes use standardized chroma
            this.a1 = TonalPalette.fromHueAndChroma(hue, Math.max(48, chroma));
            this.a2 = TonalPalette.fromHueAndChroma(hue, 16);
            this.a3 = TonalPalette.fromHueAndChroma(hue + 60, 24);
            this.n1 = TonalPalette.fromHueAndChroma(hue, 4);
            this.n2 = TonalPalette.fromHueAndChroma(hue, 8);
        }

        // Error palette is always the same
        this.error = TonalPalette.fromHueAndChroma(25, 84);
    }

    /**
     * Creates a core palette from an ARGB color.
     *
     * @param {number} argb - ARGB color
     * @return {CorePalette} - Core palette
     */
    static of(argb) {
        return new CorePalette(argb, false);
    }

    /**
     * Creates a content-friendly core palette from an ARGB color.
     *
     * @param {number} argb - ARGB color
     * @return {CorePalette} - Core palette
     */
    static contentOf(argb) {
        return new CorePalette(argb, true);
    }

    /**
     * Creates a core palette from a set of colors.
     *
     * @param {Object} colors - Colors to use
     * @return {CorePalette} - Core palette
     */
    static fromColors(colors) {
        return CorePalette.createPaletteFromColors(false, colors);
    }

    /**
     * Creates a content-friendly core palette from a set of colors.
     *
     * @param {Object} colors - Colors to use
     * @return {CorePalette} - Core palette
     */
    static contentFromColors(colors) {
        return CorePalette.createPaletteFromColors(true, colors);
    }

    /**
     * Creates a core palette from a set of colors.
     *
     * @param {boolean} content - Whether this is a content palette
     * @param {Object} colors - Colors to use
     * @return {CorePalette} - Core palette
     */
    static createPaletteFromColors(content, colors) {
        const palette = new CorePalette(colors.primary, content);

        if (colors.secondary) {
            palette.a2 = new CorePalette(colors.secondary, content).a1;
        }

        if (colors.tertiary) {
            palette.a3 = new CorePalette(colors.tertiary, content).a1;
        }

        if (colors.error) {
            palette.error = new CorePalette(colors.error, content).a1;
        }

        if (colors.neutral) {
            palette.n1 = new CorePalette(colors.neutral, content).n1;
        }

        if (colors.neutralVariant) {
            palette.n2 = new CorePalette(colors.neutralVariant, content).n2;
        }

        return palette;
    }
}

/**
 * Collection of core palettes.
 */
class CorePalettes {
    /**
     * @param {TonalPalette} primary - Primary palette
     * @param {TonalPalette} secondary - Secondary palette
     * @param {TonalPalette} tertiary - Tertiary palette
     * @param {TonalPalette} neutral - Neutral palette
     * @param {TonalPalette} neutralVariant - Neutral variant palette
     */
    primary;
    secondary;
    tertiary;
    neutral;
    neutralVariant;

    /**
     * Creates a new collection of core palettes.
     *
     * @param {TonalPalette} primary - Primary palette
     * @param {TonalPalette} secondary - Secondary palette
     * @param {TonalPalette} tertiary - Tertiary palette
     * @param {TonalPalette} neutral - Neutral palette
     * @param {TonalPalette} neutralVariant - Neutral variant palette
     */
    constructor(primary, secondary, tertiary, neutral, neutralVariant) {
        this.primary = primary;
        this.secondary = secondary;
        this.tertiary = tertiary;
        this.neutral = neutral;
        this.neutralVariant = neutralVariant;
    }
}

export {
    TonalPalette,
    KeyColor,
    CorePalette,
    CorePalettes
};