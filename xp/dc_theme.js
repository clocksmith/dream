
/**
 * @file dc_theme.js
 * @module dc_theme
 * @description
 * This file provides utility classes and functions for creating and
 * managing dynamic color themes within the Material Dynamic Color system.
 * It includes classes for DynamicColor, ToneDeltaPair, MaterialDynamicColors,
 * color blending, scoring, theme generation, and handling custom colors.
 * @requires module:dc_core
 * @requires module:dc_color
 * @requires module:dc_quant
 * @requires module:dc_contrast
 * @requires module:dc_palettes
 * @requires module:dc_scheme
 */
import { colorUtils, mathUtils, hexUtils } from './dc_core.js';
import { Hct } from './dc_color.js';
import { QuantizerWu } from './dc_quant.js';
import { ContrastCurve, Contrast } from './dc_contrast.js';
import { TonalPalette, CorePalette, CorePalettes } from './dc_palettes.js';
import { DynamicScheme, isFidelity, isMonochrome } from './dc_scheme.js';

/**
 * @typedef {object} CustomColor
 * @property {number} value - ARGB value of the custom color
 * @property {string} name - Name of the custom color
 * @property {boolean} blend - Whether to blend the custom color with the source color
 */

/**
 * @typedef {object} ColorGroup
 * @property {number} color - Color value
 * @property {number} onColor - Text color for using on the color
 * @property {number} colorContainer - Container color
 * @property {number} onColorContainer - Text color for using on the container color
 */

/**
 * @typedef {object} CustomColorGroup
 * @property {CustomColor} color - Custom color information
 * @property {number} value - ARGB value of the custom color
 * @property {ColorGroup} light - Light mode color group
 * @property {ColorGroup} dark - Dark mode color group
 */

/**
 * @typedef {object} Theme
 * @property {number} source - Source color
 * @property {{light: DynamicScheme, dark: DynamicScheme}} schemes - Light and dark schemes
 * @property {{primary: TonalPalette, secondary: TonalPalette, tertiary: TonalPalette, neutral: TonalPalette, neutralVariant: TonalPalette, error: TonalPalette}} palettes - Tonal palettes
 * @property {CustomColorGroup[]} customColors - Custom colors
 */

/**
 * Represents a tone delta pair for maintaining proper contrast between two colors.
 */
class ToneDeltaPair {
    // ... (ToneDeltaPair class - same as before) ...
    constructor(roleA, roleB, delta, polarity, stayTogether) {
        this.roleA = roleA;
        this.roleB = roleB;
        this.delta = delta;
        this.polarity = polarity;
        this.stayTogether = stayTogether;
    }
}

/**
 * A color that adjusts itself based on UI state provided by a DynamicScheme.
 */
class DynamicColor {
    constructor(name, palette, tone, isBackground, background, secondBackground, contrastCurve, toneDeltaPair) {
        this.name = name;
        this.palette = palette;
        this.tone = tone;
        this.isBackground = isBackground;
        this.background = background;
        this.secondBackground = secondBackground;
        this.contrastCurve = contrastCurve;
        this.toneDeltaPair = toneDeltaPair;
        this.hctCache = new Map();

        // Validate that the required parameters are provided in the correct combination
        if (!background && secondBackground) {
            throw new Error(`Color ${name} has secondBackground defined, but background is not defined.`);
        }

        if (!background && contrastCurve) {
            throw new Error(`Color ${name} has contrastCurve defined, but background is not defined.`);
        }

        if (background && !contrastCurve) {
            throw new Error(`Color ${name} has background defined, but contrastCurve is not defined.`);
        }
    }

    static fromPalette(args) {
        return new DynamicColor(
            args.name || '',
            args.palette,
            args.tone,
            args.isBackground || false,
            args.background,
            args.secondBackground,
            args.contrastCurve,
            args.toneDeltaPair
        );
    }

    getArgb(scheme) {
        return this.getHct(scheme).toInt();
    }

    getHct(scheme) {
        // Check cache first
        const cachedAnswer = this.hctCache.get(scheme);
        if (cachedAnswer) {
            return cachedAnswer;
        }

        // Calculate tone for this scheme
        const tone = this.getTone(scheme);

        // Get color from palette
        const answer = this.palette(scheme).getHct(tone);

        // Cache the result (with LRU-like behavior)
        if (this.hctCache.size > 4) {
            this.hctCache.clear();
        }
        this.hctCache.set(scheme, answer);

        return answer;
    }

    getTone(scheme) {
        const decreasingContrast = scheme.contrastLevel < 0;

        if (this.toneDeltaPair) {
            // ... (getTone logic for toneDeltaPair - MOVED FROM ORIGINAL FILE) ...
            const toneDeltaPair = this.toneDeltaPair(scheme);
            const roleA = toneDeltaPair.roleA;
            const roleB = toneDeltaPair.roleB;
            const delta = toneDeltaPair.delta;
            const polarity = toneDeltaPair.polarity;
            const stayTogether = toneDeltaPair.stayTogether;

            if (!roleA) {
                console.error("roleA is undefined for DynamicColor:", this.name);
                return this.tone(scheme);
            }
            if (!roleB) {
                console.error("roleB is undefined for DynamicColor:", this.name);
                return this.tone(scheme);
            }

            // Get the background tone
            const bg = this.background(scheme);
            const bgTone = bg.getTone(scheme);

            // Determine which color is nearer to the background
            const aIsNearer = polarity === 'nearer' ||
                (polarity === 'lighter' && !scheme.isDark) ||
                (polarity === 'darker' && scheme.isDark);

            const nearer = aIsNearer ? roleA : roleB;
            const farther = aIsNearer ? roleB : roleA;
            const amNearer = this.name === nearer.name;

            // Direction to expand the range based on light/dark mode
            const expansionDir = scheme.isDark ? 1 : -1;

            // Get desired contrast for each color
            const nContrast = nearer.contrastCurve.get(scheme.contrastLevel);
            const fContrast = farther.contrastCurve.get(scheme.contrastLevel);

            // Initial tones that meet individual contrast requirements
            let nTone = Contrast.ratioOfTones(bgTone, nearer.tone(scheme)) >= nContrast ?
                nearer.tone(scheme) :
                DynamicColor.foregroundTone(bgTone, nContrast);

            let fTone = Contrast.ratioOfTones(bgTone, farther.tone(scheme)) >= fContrast ?
                farther.tone(scheme) :
                DynamicColor.foregroundTone(bgTone, fContrast);

            // For decreasing contrast, use the exact foreground tone
            if (decreasingContrast) {
                nTone = DynamicColor.foregroundTone(bgTone, nContrast);
                fTone = DynamicColor.foregroundTone(bgTone, fContrast);
            }

            // Ensure the delta between the two colors is met
            if ((fTone - nTone) * expansionDir < delta) {
                // Expand farther to match delta
                fTone = mathUtils.clampDouble(0, 100, nTone + delta * expansionDir);

                // If still not sufficient, also move nearer
                if ((fTone - nTone) * expansionDir < delta) {
                    nTone = mathUtils.clampDouble(0, 100, fTone - delta * expansionDir);
                }
            }

            // Avoid the 50-59 awkward zone where colors can be hard to distinguish
            if (50 <= nTone && nTone < 60) {
                if (expansionDir > 0) {
                    // In dark mode, move up to 60
                    nTone = 60;
                    fTone = Math.max(fTone, nTone + delta * expansionDir);
                } else {
                    // In light mode, move down to 49
                    nTone = 49;
                    fTone = Math.min(fTone, nTone + delta * expansionDir);
                }
            } else if (50 <= fTone && fTone < 60) {
                if (stayTogether) {
                    // If colors should stay together, fix both
                    if (expansionDir > 0) {
                        nTone = 60;
                        fTone = Math.max(fTone, nTone + delta * expansionDir);
                    } else {
                        nTone = 49;
                        fTone = Math.min(fTone, nTone + delta * expansionDir);
                    }
                } else {
                    // Otherwise, only fix the farther color
                    fTone = expansionDir > 0 ? 60 : 49;
                }
            }

            // Return the appropriate tone based on which role this color plays
            return amNearer ? nTone : fTone;

        } else {
            // ... (getTone logic for no toneDeltaPair - MOVED FROM ORIGINAL FILE) ...
            let answer = this.tone(scheme);

            // If no background, just return the base tone
            if (!this.background) {
                return answer;
            }

            // Get background tone
            const bgTone = this.background(scheme).getTone(scheme);

            // Get desired contrast ratio
            const desiredRatio = this.contrastCurve.get(scheme.contrastLevel);

            // Adjust to meet contrast if necessary
            if (Contrast.ratioOfTones(bgTone, answer) < desiredRatio) {
                answer = DynamicColor.foregroundTone(bgTone, desiredRatio);
            }

            // For decreasing contrast, use the exact foreground tone
            if (decreasingContrast) {
                answer = DynamicColor.foregroundTone(bgTone, desiredRatio);
            }

            // Adjust if background is in the awkward zone
            if (this.isBackground && 50 <= answer && answer < 60) {
                answer = Contrast.ratioOfTones(49, bgTone) >= desiredRatio ? 49 : 60;
            }

            // Case 3: Adjust for dual backgrounds
            if (this.secondBackground) {
                const bg1 = this.background;
                const bg2 = this.secondBackground;
                const bgTone1 = bg1(scheme).getTone(scheme);
                const bgTone2 = bg2(scheme).getTone(scheme);

                // Get min and max background tones
                const upper = Math.max(bgTone1, bgTone2);
                const lower = Math.min(bgTone1, bgTone2);

                // Check if contrast is met for both backgrounds
                if (Contrast.ratioOfTones(upper, answer) < desiredRatio ||
                    Contrast.ratioOfTones(lower, answer) < desiredRatio) {

                    // Try a lighter color
                    const lightOption = Contrast.lighter(upper, desiredRatio);

                    // Try a darker color
                    const darkOption = Contrast.darker(lower, desiredRatio);

                    // Collect valid options
                    const availables = [];
                    if (lightOption !== -1) {
                        availables.push(lightOption);
                    }
                    if (darkOption !== -1) {
                        availables.push(darkOption);
                    }

                    // Determine if a light foreground is preferred
                    const prefersLight = DynamicColor.tonePrefersLightForeground(bgTone1) ||
                        DynamicColor.tonePrefersLightForeground(bgTone2);

                    // Choose option based on preference and availability
                    if (prefersLight) {
                        return lightOption < 0 ? 100 : lightOption;
                    }

                    if (availables.length === 1) {
                        return availables[0];
                    }

                    return darkOption < 0 ? 0 : darkOption;
                }
            }

            return answer;
        }
    }


    static foregroundTone(bgTone, ratio) {
        // ... (foregroundTone logic - MOVED FROM ORIGINAL FILE) ...
        const lighterTone = Contrast.lighterUnsafe(bgTone, ratio);
        const darkerTone = Contrast.darkerUnsafe(bgTone, ratio);

        // Calculate actual contrast ratios
        const lighterRatio = Contrast.ratioOfTones(lighterTone, bgTone);
        const darkerRatio = Contrast.ratioOfTones(darkerTone, bgTone);

        // Determine which to use based on background and contrast
        const preferLighter = DynamicColor.tonePrefersLightForeground(bgTone);

        // Edge case where neither option is clearly better
        const negligibleDifference = Math.abs(lighterRatio - darkerRatio) < 0.1 &&
            lighterRatio < ratio &&
            darkerRatio < ratio;

        if (preferLighter) {
            return lighterRatio >= ratio || lighterRatio >= darkerRatio || negligibleDifference ?
                lighterTone : darkerTone;
        } else {
            return darkerRatio >= ratio || darkerRatio >= lighterRatio ?
                darkerTone : lighterTone;
        }
    }

    static tonePrefersLightForeground(tone) {
        return Math.round(tone) < 60.0;
    }

    static toneAllowsLightForeground(tone) {
        return Math.round(tone) <= 49.0;
    }

    static enableLightForeground(tone) {
        return DynamicColor.tonePrefersLightForeground(tone) &&
            !DynamicColor.toneAllowsLightForeground(tone) ? 49.0 : tone;
    }
}

/**
 * Material Design dynamic colors definitions.
 */
class MaterialDynamicColors {
    // ... (MaterialDynamicColors class content - MOVED FROM ORIGINAL FILE) ...
    static contentAccentToneDelta = 15.0;

    static highestSurface(scheme) {
        return scheme.isDark ?
            MaterialDynamicColors.surfaceBright :
            MaterialDynamicColors.surfaceDim;
    }


    static primaryPaletteKeyColor = DynamicColor.fromPalette({
        name: 'primary_palette_key_color',
        palette: scheme => scheme.primaryPalette,
        tone: scheme => scheme.primaryPalette.keyColor.tone
    });


    static secondaryPaletteKeyColor = DynamicColor.fromPalette({
        name: 'secondary_palette_key_color',
        palette: scheme => scheme.secondaryPalette,
        tone: scheme => scheme.secondaryPalette.keyColor.tone
    });


    static tertiaryPaletteKeyColor = DynamicColor.fromPalette({
        name: 'tertiary_palette_key_color',
        palette: scheme => scheme.tertiaryPalette,
        tone: scheme => scheme.tertiaryPalette.keyColor.tone
    });


    static neutralPaletteKeyColor = DynamicColor.fromPalette({
        name: 'neutral_palette_key_color',
        palette: scheme => scheme.neutralPalette,
        tone: scheme => scheme.neutralPalette.keyColor.tone
    });


    static neutralVariantPaletteKeyColor = DynamicColor.fromPalette({
        name: 'neutral_variant_palette_key_color',
        palette: scheme => scheme.neutralVariantPalette,
        tone: scheme => scheme.neutralVariantPalette.keyColor.tone
    });


    static background = DynamicColor.fromPalette({
        name: 'background',
        palette: scheme => scheme.neutralPalette,
        tone: scheme => scheme.isDark ? 6 : 98,
        isBackground: true
    });


    static onBackground = DynamicColor.fromPalette({
        name: 'on_background',
        palette: scheme => scheme.neutralPalette,
        tone: scheme => scheme.isDark ? 90 : 10,
        background: scheme => MaterialDynamicColors.background,
        contrastCurve: new ContrastCurve(3, 3, 4.5, 7)
    });


    static surface = DynamicColor.fromPalette({
        name: 'surface',
        palette: scheme => scheme.neutralPalette,
        tone: scheme => scheme.isDark ? 6 : 98,
        isBackground: true
    });


    static surfaceDim = DynamicColor.fromPalette({
        name: 'surface_dim',
        palette: scheme => scheme.neutralPalette,
        tone: scheme => scheme.isDark ? 6 : new ContrastCurve(87, 87, 80, 75).get(scheme.contrastLevel),
        isBackground: true
    });


    static surfaceBright = DynamicColor.fromPalette({
        name: 'surface_bright',
        palette: scheme => scheme.neutralPalette,
        tone: scheme => scheme.isDark ? new ContrastCurve(24, 24, 29, 34).get(scheme.contrastLevel) : 98,
        isBackground: true
    });


    static surfaceContainerLowest = DynamicColor.fromPalette({
        name: 'surface_container_lowest',
        palette: scheme => scheme.neutralPalette,
        tone: scheme => scheme.isDark ? new ContrastCurve(4, 4, 2, 0).get(scheme.contrastLevel) : 100,
        isBackground: true
    });


    static surfaceContainerLow = DynamicColor.fromPalette({
        name: 'surface_container_low',
        palette: scheme => scheme.neutralPalette,
        tone: scheme => scheme.isDark ?
            new ContrastCurve(10, 10, 11, 12).get(scheme.contrastLevel) :
            new ContrastCurve(96, 96, 96, 95).get(scheme.contrastLevel),
        isBackground: true
    });


    static surfaceContainer = DynamicColor.fromPalette({
        name: 'surface_container',
        palette: scheme => scheme.neutralPalette,
        tone: scheme => scheme.isDark ?
            new ContrastCurve(12, 12, 16, 20).get(scheme.contrastLevel) :
            new ContrastCurve(94, 94, 92, 90).get(scheme.contrastLevel),
        isBackground: true
    });


    static surfaceContainerHigh = DynamicColor.fromPalette({
        name: 'surface_container_high',
        palette: scheme => scheme.neutralPalette,
        tone: scheme => scheme.isDark ?
            new ContrastCurve(17, 17, 21, 25).get(scheme.contrastLevel) :
            new ContrastCurve(92, 92, 88, 85).get(scheme.contrastLevel),
        isBackground: true
    });


    static surfaceContainerHighest = DynamicColor.fromPalette({
        name: 'surface_container_highest',
        palette: scheme => scheme.neutralPalette,
        tone: scheme => scheme.isDark ?
            new ContrastCurve(22, 22, 26, 30).get(scheme.contrastLevel) :
            new ContrastCurve(90, 90, 84, 80).get(scheme.contrastLevel),
        isBackground: true
    });


    static onSurface = DynamicColor.fromPalette({
        name: 'on_surface',
        palette: scheme => scheme.neutralPalette,
        tone: scheme => scheme.isDark ? 90 : 10,
        background: scheme => MaterialDynamicColors.highestSurface(scheme),
        contrastCurve: new ContrastCurve(4.5, 7, 11, 21)
    });


    static surfaceVariant = DynamicColor.fromPalette({
        name: 'surface_variant',
        palette: scheme => scheme.neutralVariantPalette,
        tone: scheme => scheme.isDark ? 30 : 90,
        isBackground: true
    });


    static onSurfaceVariant = DynamicColor.fromPalette({
        name: 'on_surface_variant',
        palette: scheme => scheme.neutralVariantPalette,
        tone: scheme => scheme.isDark ? 80 : 30,
        background: scheme => MaterialDynamicColors.highestSurface(scheme),
        contrastCurve: new ContrastCurve(3, 4.5, 7, 11)
    });


    static inverseSurface = DynamicColor.fromPalette({
        name: 'inverse_surface',
        palette: scheme => scheme.neutralPalette,
        tone: scheme => scheme.isDark ? 90 : 20
    });


    static inverseOnSurface = DynamicColor.fromPalette({
        name: 'inverse_on_surface',
        palette: scheme => scheme.neutralPalette,
        tone: scheme => scheme.isDark ? 20 : 95,
        background: scheme => MaterialDynamicColors.inverseSurface,
        contrastCurve: new ContrastCurve(4.5, 7, 11, 21)
    });


    static outline = DynamicColor.fromPalette({
        name: 'outline',
        palette: scheme => scheme.neutralVariantPalette,
        tone: scheme => scheme.isDark ? 60 : 50,
        background: scheme => MaterialDynamicColors.highestSurface(scheme),
        contrastCurve: new ContrastCurve(1.5, 3, 4.5, 7)
    });


    static outlineVariant = DynamicColor.fromPalette({
        name: 'outline_variant',
        palette: scheme => scheme.neutralVariantPalette,
        tone: scheme => scheme.isDark ? 30 : 80,
        background: scheme => MaterialDynamicColors.highestSurface(scheme),
        contrastCurve: new ContrastCurve(1, 1, 3, 4.5)
    });


    static shadow = DynamicColor.fromPalette({
        name: 'shadow',
        palette: scheme => scheme.neutralPalette,
        tone: scheme => 0
    });


    static scrim = DynamicColor.fromPalette({
        name: 'scrim',
        palette: scheme => scheme.neutralPalette,
        tone: scheme => 0
    });


    static surfaceTint = DynamicColor.fromPalette({
        name: 'surface_tint',
        palette: scheme => scheme.primaryPalette,
        tone: scheme => scheme.isDark ? 80 : 40,
        isBackground: true
    });


    static primary = DynamicColor.fromPalette({
        name: 'primary',
        palette: scheme => scheme.primaryPalette,
        tone: scheme => isMonochrome(scheme) ?
            (scheme.isDark ? 100 : 0) :
            (scheme.isDark ? 80 : 40),
        isBackground: true,
        background: scheme => MaterialDynamicColors.highestSurface(scheme),
        contrastCurve: new ContrastCurve(3, 4.5, 7, 7),
        toneDeltaPair: scheme => new ToneDeltaPair(
            MaterialDynamicColors.primaryContainer,
            MaterialDynamicColors.primary,
            10,
            'nearer',
            false
        )
    });


    static onPrimaryContainer = DynamicColor.fromPalette({
        name: 'on_primary_container',
        palette: scheme => scheme.primaryPalette,
        tone: scheme => isFidelity(scheme) ?
            DynamicColor.foregroundTone(MaterialDynamicColors.primaryContainer.tone(scheme), 4.5) :
            isMonochrome(scheme) ?
                (scheme.isDark ? 0 : 100) :
                (scheme.isDark ? 90 : 10),
        background: scheme => MaterialDynamicColors.primaryContainer,
        contrastCurve: new ContrastCurve(3, 4.5, 7, 11)
    });


    static inversePrimary = DynamicColor.fromPalette({
        name: 'inverse_primary',
        palette: scheme => scheme.primaryPalette,
        tone: scheme => scheme.isDark ? 40 : 80,
        background: scheme => MaterialDynamicColors.inverseSurface,
        contrastCurve: new ContrastCurve(3, 4.5, 7, 7)
    });


    static secondary = DynamicColor.fromPalette({
        name: 'secondary',
        palette: scheme => scheme.secondaryPalette,
        tone: scheme => scheme.isDark ? 80 : 40,
        isBackground: true,
        background: scheme => MaterialDynamicColors.highestSurface(scheme),
        contrastCurve: new ContrastCurve(3, 4.5, 7, 7),
        toneDeltaPair: scheme => new ToneDeltaPair(
            MaterialDynamicColors.secondaryContainer,
            MaterialDynamicColors.secondary,
            10,
            'nearer',
            false
        )
    });


    static onSecondary = DynamicColor.fromPalette({
        name: 'on_secondary',
        palette: scheme => scheme.secondaryPalette,
        tone: scheme => isMonochrome(scheme) ?
            (scheme.isDark ? 10 : 100) :
            (scheme.isDark ? 20 : 100),
        background: scheme => MaterialDynamicColors.secondary,
        contrastCurve: new ContrastCurve(4.5, 7, 11, 21)
    });


    static secondaryContainer = DynamicColor.fromPalette({
        name: 'secondary_container',
        palette: scheme => scheme.secondaryPalette,
        tone: scheme => {
            const intermediateTone = scheme.isDark ? 30 : 90;
            return isMonochrome(scheme) ?
                (scheme.isDark ? 30 : 85) :
                (isFidelity(scheme) ?
                    findDesiredChromaByTone(
                        scheme.secondaryPalette.hue,
                        scheme.secondaryPalette.chroma,
                        intermediateTone,
                        !scheme.isDark
                    ) :
                    intermediateTone);
        },
        isBackground: true,
        background: scheme => MaterialDynamicColors.highestSurface(scheme),
        contrastCurve: new ContrastCurve(1, 1, 3, 4.5),
        toneDeltaPair: scheme => new ToneDeltaPair(
            MaterialDynamicColors.secondaryContainer,
            MaterialDynamicColors.secondary,
            10,
            'nearer',
            false
        )
    });


    static onSecondaryContainer = DynamicColor.fromPalette({
        name: 'on_secondary_container',
        palette: scheme => scheme.secondaryPalette,
        tone: scheme => isMonochrome(scheme) ?
            (scheme.isDark ? 90 : 10) :
            (isFidelity(scheme) ?
                DynamicColor.foregroundTone(MaterialDynamicColors.secondaryContainer.tone(scheme), 4.5) :
                (scheme.isDark ? 90 : 10)),
        background: scheme => MaterialDynamicColors.secondaryContainer,
        contrastCurve: new ContrastCurve(3, 4.5, 7, 11)
    });


    static tertiary = DynamicColor.fromPalette({
        name: 'tertiary',
        palette: scheme => scheme.tertiaryPalette,
        tone: scheme => isMonochrome(scheme) ?
            (scheme.isDark ? 90 : 25) :
            (scheme.isDark ? 80 : 40),
        isBackground: true,
        background: scheme => MaterialDynamicColors.highestSurface(scheme),
        contrastCurve: new ContrastCurve(3, 4.5, 7, 7),
        toneDeltaPair: scheme => new ToneDeltaPair(
            MaterialDynamicColors.tertiaryContainer,
            MaterialDynamicColors.tertiary,
            10,
            'nearer',
            false
        )
    });


    static onTertiary = DynamicColor.fromPalette({
        name: 'on_tertiary',
        palette: scheme => scheme.tertiaryPalette,
        tone: scheme => isMonochrome(scheme) ?
            (scheme.isDark ? 10 : 90) :
            (scheme.isDark ? 20 : 100),
        background: scheme => MaterialDynamicColors.tertiary,
        contrastCurve: new ContrastCurve(4.5, 7, 11, 21)
    });


    static tertiaryContainer = DynamicColor.fromPalette({
        name: 'tertiary_container',
        palette: scheme => scheme.tertiaryPalette,
        tone: scheme => isMonochrome(scheme) ?
            (scheme.isDark ? 60 : 49) :
            (isFidelity(scheme) ?
                DislikeAnalyzer.fixIfDisliked(
                    scheme.tertiaryPalette.getHct(scheme.sourceColorHct.tone)
                ).tone :
                (scheme.isDark ? 30 : 90)),
        isBackground: true,
        background: scheme => MaterialDynamicColors.highestSurface(scheme),
        contrastCurve: new ContrastCurve(1, 1, 3, 4.5),
        toneDeltaPair: scheme => new ToneDeltaPair(
            MaterialDynamicColors.tertiaryContainer,
            MaterialDynamicColors.tertiary,
            10,
            'nearer',
            false
        )
    });


    static onTertiaryContainer = DynamicColor.fromPalette({
        name: 'on_tertiary_container',
        palette: scheme => scheme.tertiaryPalette,
        tone: scheme => isMonochrome(scheme) ?
            (scheme.isDark ? 0 : 100) :
            (isFidelity(scheme) ?
                DynamicColor.foregroundTone(MaterialDynamicColors.tertiaryContainer.tone(scheme), 4.5) :
                (scheme.isDark ? 90 : 10)),
        background: scheme => MaterialDynamicColors.tertiaryContainer,
        contrastCurve: new ContrastCurve(3, 4.5, 7, 11)
    });


    static error = DynamicColor.fromPalette({
        name: 'error',
        palette: scheme => scheme.errorPalette,
        tone: scheme => scheme.isDark ? 80 : 40,
        isBackground: true,
        background: scheme => MaterialDynamicColors.highestSurface(scheme),
        contrastCurve: new ContrastCurve(3, 4.5, 7, 7),
        toneDeltaPair: scheme => new ToneDeltaPair(
            MaterialDynamicColors.errorContainer,
            MaterialDynamicColors.error,
            10,
            'nearer',
            false
        )
    });


    static onError = DynamicColor.fromPalette({
        name: 'on_error',
        palette: scheme => scheme.errorPalette,
        tone: scheme => scheme.isDark ? 20 : 100,
        background: scheme => MaterialDynamicColors.error,
        contrastCurve: new ContrastCurve(4.5, 7, 11, 21)
    });


    static errorContainer = DynamicColor.fromPalette({
        name: 'error_container',
        palette: scheme => scheme.errorPalette,
        tone: scheme => scheme.isDark ? 30 : 90,
        isBackground: true,
        background: scheme => MaterialDynamicColors.highestSurface(scheme),
        contrastCurve: new ContrastCurve(1, 1, 3, 4.5),
        toneDeltaPair: scheme => new ToneDeltaPair(
            MaterialDynamicColors.errorContainer,
            MaterialDynamicColors.error,
            10,
            'nearer',
            false
        )
    });


    static onErrorContainer = DynamicColor.fromPalette({
        name: 'on_error_container',
        palette: scheme => scheme.errorPalette,
        tone: scheme => isMonochrome(scheme) ?
            (scheme.isDark ? 90 : 10) :
            (scheme.isDark ? 90 : 10),
        background: scheme => MaterialDynamicColors.errorContainer,
        contrastCurve: new ContrastCurve(3, 4.5, 7, 11)
    });


    static primaryFixed = DynamicColor.fromPalette({
        name: 'primary_fixed',
        palette: scheme => scheme.primaryPalette,
        tone: scheme => isMonochrome(scheme) ? 40 : 90,
        isBackground: true,
        background: scheme => MaterialDynamicColors.highestSurface(scheme),
        contrastCurve: new ContrastCurve(1, 1, 3, 4.5),
        toneDeltaPair: scheme => new ToneDeltaPair(
            MaterialDynamicColors.primaryFixed,
            MaterialDynamicColors.primaryFixedDim,
            10,
            'lighter',
            true
        )
    });


    static primaryFixedDim = DynamicColor.fromPalette({
        name: 'primary_fixed_dim',
        palette: scheme => scheme.primaryPalette,
        tone: scheme => isMonochrome(scheme) ? 30 : 80,
        isBackground: true,
        background: scheme => MaterialDynamicColors.highestSurface(scheme),
        contrastCurve: new ContrastCurve(1, 1, 3, 4.5),
        toneDeltaPair: scheme => new ToneDeltaPair(
            MaterialDynamicColors.primaryFixed,
            MaterialDynamicColors.primaryFixedDim,
            10,
            'lighter',
            true
        )
    });


    static onPrimaryFixed = DynamicColor.fromPalette({
        name: 'on_primary_fixed',
        palette: scheme => scheme.primaryPalette,
        tone: scheme => isMonochrome(scheme) ? 100 : 10,
        background: scheme => MaterialDynamicColors.primaryFixedDim,
        secondBackground: scheme => MaterialDynamicColors.primaryFixed,
        contrastCurve: new ContrastCurve(4.5, 7, 11, 21)
    });


    static onPrimaryFixedVariant = DynamicColor.fromPalette({
        name: 'on_primary_fixed_variant',
        palette: scheme => scheme.primaryPalette,
        tone: scheme => isMonochrome(scheme) ? 90 : 30,
        background: scheme => MaterialDynamicColors.primaryFixedDim,
        secondBackground: scheme => MaterialDynamicColors.primaryFixed,
        contrastCurve: new ContrastCurve(3, 4.5, 7, 11)
    });


    static secondaryFixed = DynamicColor.fromPalette({
        name: 'secondary_fixed',
        palette: scheme => scheme.secondaryPalette,
        tone: scheme => isMonochrome(scheme) ? 80 : 90,
        isBackground: true,
        background: scheme => MaterialDynamicColors.highestSurface(scheme),
        contrastCurve: new ContrastCurve(1, 1, 3, 4.5),
        toneDeltaPair: scheme => new ToneDeltaPair(
            MaterialDynamicColors.secondaryFixed,
            MaterialDynamicColors.secondaryFixedDim,
            10,
            'lighter',
            true
        )
    });


    static secondaryFixedDim = DynamicColor.fromPalette({
        name: 'secondary_fixed_dim',
        palette: scheme => scheme.secondaryPalette,
        tone: scheme => isMonochrome(scheme) ? 70 : 80,
        isBackground: true,
        background: scheme => MaterialDynamicColors.highestSurface(scheme),
        contrastCurve: new ContrastCurve(1, 1, 3, 4.5),
        toneDeltaPair: scheme => new ToneDeltaPair(
            MaterialDynamicColors.secondaryFixed,
            MaterialDynamicColors.secondaryFixedDim,
            10,
            'lighter',
            true
        )
    });


    static onSecondaryFixed = DynamicColor.fromPalette({
        name: 'on_secondary_fixed',
        palette: scheme => scheme.secondaryPalette,
        tone: scheme => 10,
        background: scheme => MaterialDynamicColors.secondaryFixedDim,
        secondBackground: scheme => MaterialDynamicColors.secondaryFixed,
        contrastCurve: new ContrastCurve(4.5, 7, 11, 21)
    });


    static onSecondaryFixedVariant = DynamicColor.fromPalette({
        name: 'on_secondary_fixed_variant',
        palette: scheme => scheme.secondaryPalette,
        tone: scheme => isMonochrome(scheme) ? 25 : 30,
        background: scheme => MaterialDynamicColors.secondaryFixedDim,
        secondBackground: scheme => MaterialDynamicColors.secondaryFixed,
        contrastCurve: new ContrastCurve(3, 4.5, 7, 11)
    });


    static tertiaryFixed = DynamicColor.fromPalette({
        name: 'tertiary_fixed',
        palette: scheme => scheme.tertiaryPalette,
        tone: scheme => isMonochrome(scheme) ? 40 : 90,
        isBackground: true,
        background: scheme => MaterialDynamicColors.highestSurface(scheme),
        contrastCurve: new ContrastCurve(1, 1, 3, 4.5),
        toneDeltaPair: scheme => new ToneDeltaPair(
            MaterialDynamicColors.tertiaryFixed,
            MaterialDynamicColors.tertiaryFixedDim,
            10,
            'lighter',
            true
        )
    });


    static tertiaryFixedDim = DynamicColor.fromPalette({
        name: 'tertiary_fixed_dim',
        palette: scheme => scheme.tertiaryPalette,
        tone: scheme => isMonochrome(scheme) ? 30 : 80,
        isBackground: true,
        background: scheme => MaterialDynamicColors.highestSurface(scheme),
        contrastCurve: new ContrastCurve(1, 1, 3, 4.5),
        toneDeltaPair: scheme => new ToneDeltaPair(
            MaterialDynamicColors.tertiaryFixed,
            MaterialDynamicColors.tertiaryFixedDim,
            10,
            'lighter',
            true
        )
    });


    static onTertiaryFixed = DynamicColor.fromPalette({
        name: 'on_tertiary_fixed',
        palette: scheme => scheme.tertiaryPalette,
        tone: scheme => isMonochrome(scheme) ? 100 : 10,
        background: scheme => MaterialDynamicColors.tertiaryFixedDim,
        secondBackground: scheme => MaterialDynamicColors.tertiaryFixed,
        contrastCurve: new ContrastCurve(4.5, 7, 11, 21)
    });


    static onTertiaryFixedVariant = DynamicColor.fromPalette({
        name: 'on_tertiary_fixed_variant',
        palette: scheme => scheme.tertiaryPalette,
        tone: scheme => isMonochrome(scheme) ? 90 : 30,
        background: scheme => MaterialDynamicColors.tertiaryFixedDim,
        secondBackground: scheme => MaterialDynamicColors.tertiaryFixed,
        contrastCurve: new ContrastCurve(3, 4.5, 7, 11)
    });
}

/**
 * Blends a color with the given source color.
 *
 * @param {number} colorToBlend - Color to blend (ARGB)
 * @param {number} sourceColor - Source color (ARGB)
 * @return {number} - Blended color (ARGB)
 */
const Blend = (() => {
    /**
     * Blends HCT in HCT space.
     *
     * @param {Hct} colorHct - Color to blend in HCT
     * @param {Hct} sourceColorHct - Source color in HCT
     * @param {number} blend - Blend amount (0-100)
     * @return {Hct} - Blended HCT color
     */
    const blendHctHue = (colorHct, sourceColorHct, blend) => {
        const blendedHue = mathUtils.lerp(colorHct.hue, sourceColorHct.hue, blend / 100.0);
        const blendedChroma = mathUtils.lerp(colorHct.chroma, sourceColorHct.chroma, blend / 100.0);
        const blendedTone = mathUtils.lerp(colorHct.tone, sourceColorHct.tone, blend / 100.0);
        return Hct.from(blendedHue, blendedChroma, blendedTone);
    };

    return {
        hctHue: blendHctHue,

        /**
         * Blends colorToBlend with sourceColor, in HCT space, and returns ARGB
         *
         * @param {number} colorToBlend - ARGB color to blend
         * @param {number} sourceColor - ARGB source color
         * @param {number} blend - How much blending to perform; 0-100.
         * @return {number} - ARGB blended color
         */
        harmonize: (colorToBlend, sourceColor, blend = 100) => {
            const colorHct = Hct.fromInt(colorToBlend);
            const sourceColorHct = Hct.fromInt(sourceColor);
            const blended = blendHctHue(colorHct, sourceColorHct, blend);
            return blended.toInt();
        }
    };
})();


/**
 * Scores a color's suitability for use as a system theme primary color.
 */
class Score {
    /**
     * Generates a ranked list of colors based on their scores.
     *
     * @param {number[]} colorsToScore - Colors to score (ARGB array)
     * @param {number[]} desired - Colors desired in the list
     * @param {boolean} filter - Whether to filter out colors
     * @return {number[]} - Ranked list of colors (ARGB array)
     */
    static score(colorsToScore, desired, filter) {
        const scoredColors = colorsToScore.map(color => ({ color: color, score: Score.scoreColor(color) }));
        scoredColors.sort((a, b) => b.score - a.score); // Sort in descending order of score

        let result = scoredColors.map(scoredColor => scoredColor.color);

        if (desired !== undefined && desired > 0) {
            result = result.slice(0, Math.min(desired, result.length));
        }
        if (filter === true) {
            result = result.filter(color => Score.isSufficientlyDistinct(color));
        }
        return result;
    }


    /**
     * Scores a single color based on its chroma and hue.
     *
     * @param {number} color - Color to score (ARGB)
     * @return {number} - Score value
     */
    static scoreColor(color) {
        const hct = Hct.fromInt(color);
        const chromaFactor = hct.chroma / 48.0; // Normalize chroma
        const hueFactor = (1.0 - Math.abs(hct.hue - 60.0) / 180.0); // Normalize hue, favoring yellows and greens

        return chromaFactor * 0.4 + hueFactor * 0.6; // Weighted score
    }

    /**
     * Checks if a color is sufficiently distinct from other colors.
     *
     * @param {number} color - Color to check (ARGB)
     * @return {boolean} - True if distinct, false otherwise
     */
    static isSufficientlyDistinct(color) {
        const hct = Hct.fromInt(color);
        return hct.chroma >= 15.0 && hct.tone <= 90.0 && hct.tone >= 20.0;
    }
}


/**
 * Generates a dynamic theme from a source color.
 *
 * @param {number} sourceColor - Source color (ARGB)
 * @param {DynamicVariant} dynamicVariant - Dynamic variant style
 * @param {boolean} isDark - Whether to generate a dark theme
 * @param {number} contrastLevel - Contrast level (-1 to 1)
 * @return {Theme} - Dynamic theme object
 */
const dynamicThemeFromSourceColor = (sourceColor, isDark, contrastLevel) => {
    const sourceColorHct = Hct.fromInt(sourceColor);
    const corePalette = CorePalette.of(sourceColor);
    const corePalettes = new CorePalettes(
        corePalette.a1,
        corePalette.a2,
        corePalette.a3,
        corePalette.n1,
        corePalette.n2
    );

    const scheme = new DynamicScheme(
        sourceColor,
        isDark,
        contrastLevel,
        corePalettes.primary,
        corePalettes.secondary,
        corePalettes.tertiary,
        corePalettes.neutral,
        corePalettes.neutralVariant,
        sourceColorHct
    );

    return {
        source: sourceColor,
        schemes: { light: scheme, dark: scheme },
        palettes: corePalettes,
        customColors: []
    };
};


/**
 * Generates a theme from a source color.
 *
 * @param {number} source - Source color (ARGB)
 * @return {Theme} - Theme object
 */
const themeFromSourceColor = (source) => {
    const palette = CorePalette.of(source);
    const palettes = new CorePalettes(palette.a1, palette.a2, palette.a3, palette.n1, palette.n2);

    // Create scheme
    const sourceColorHct = Hct.fromInt(source);
    const scheme = new DynamicScheme(
        source,
        false, // light scheme initially
        0,     // default contrast
        palettes.primary,
        palettes.secondary,
        palettes.tertiary,
        palettes.neutral,
        palettes.neutralVariant,
        sourceColorHct
    );

    // Create dark scheme with same parameters
    const darkScheme = new DynamicScheme(
        source,
        true,  // dark scheme
        0,     // default contrast
        palettes.primary,
        palettes.secondary,
        palettes.tertiary,
        palettes.neutral,
        palettes.neutralVariant,
        sourceColorHct
    );

    return {
        source: source,
        schemes: {
            light: scheme,
            dark: darkScheme
        },
        palettes: palettes,
        customColors: []
    };
}


/**
 * Extracts prominent colors from an image.
 *
 * @param {ImageData} image - Image data
 * @param {ScoreOptions} options - Scoring options
 * @return {Promise<number[]>} - Promise resolving to an array of prominent colors (ARGB)
 */
const extractColorsFromImage = async (image, options = {}) => {
    const desiredCount = options.desired || 128;
    const fallbackColor = options.fallbackColorARGB || 0xff4285F4; // Material Design Blue 500
    const filterUnlikely = options.filter || true;

    return new Promise((resolve, reject) => {
        if (!image) {
            resolve([fallbackColor]);
            return;
        }

        const wu = new QuantizerWu();
        const resultWu = wu.quantize(image.data, desiredCount);
        if (resultWu.length === 0) {
            resolve([fallbackColor]);
            return;
        }

        let prominentColors = Score.score(resultWu, desiredCount, filterUnlikely);
        if (prominentColors.length === 0) {
            resolve([fallbackColor]);
        } else {
            resolve(prominentColors);
        }
    });
};


/**
 * Generates a theme from an image.
 *
 * @param {ImageData} image - Image data
 * @param {ScoreOptions} options - Scoring options
 * @return {Promise<Theme>} - Promise resolving to a theme object
 */
const themeFromImage = async (image, options = {}) => {
    const colors = await extractColorsFromImage(image, options);
    const sourceColor = colors[0]; // Take the top color

    return themeFromSourceColor(sourceColor);
};


/**
 * Finds a chroma for a given hue and tone, maximizing chroma for that tone.
 *
 * @param {number} hue - Hue in degrees
 * @param {number} chroma - Chroma
 * @param {number} tone - Tone (L* value)
 * @param {boolean} byDecreasingLightness - Search by decreasing lightness
 * @return {number} - Desired chroma
 */
const findDesiredChromaByTone = (hue, chroma, tone, byDecreasingLightness) => {
    let startTone = tone;
    let endTone = byDecreasingLightness ? 100 : 0;
    let midTone;
    let bestChroma = chroma;
    let bestHct = Hct.from(hue, chroma, tone);


    while (Math.abs(startTone - endTone) > 0.05) {
        midTone = (startTone + endTone) / 2.0;
        const midHct = Hct.from(hue, chroma, midTone);
        const argb = midHct.toInt();
        const calculatedTone = colorUtils.lstarFromArgb(argb);
        const deltaTone = Math.abs(tone - calculatedTone);

        if (deltaTone < 0.02) {
            bestChroma = midHct.chroma;
            bestHct = midHct;
            if (byDecreasingLightness) {
                endTone = midTone;
            } else {
                startTone = midTone;
            }
        } else {
            if (byDecreasingLightness) {
                startTone = midTone;
            } else {
                endTone = midTone;
            }
        }
    }
    return bestHct.tone;
};


/**
 * Adds a custom color to a theme.
 *
 * @param {Theme} theme - Theme object
 * @param {CustomColor} customColor - Custom color information
 * @return {Theme} - Updated theme object
 */
const addCustomColor = (theme, customColor) => {
    const lightModeColor = DynamicColor.fromPalette({
        name: customColor.name,
        palette: (scheme) => TonalPalette.fromInt(customColor.value),
        tone: (scheme) => 40 // Default tone for custom color in light mode
    });

    const darkModeColor = DynamicColor.fromPalette({
        name: customColor.name,
        palette: (scheme) => TonalPalette.fromInt(customColor.value),
        tone: (scheme) => 80 // Default tone for custom color in dark mode
    });

    const customColorGroup = {
        color: customColor,
        value: customColor.value,
        light: {
            color: lightModeColor.getArgb(theme.schemes.light),
            onColor: MaterialDynamicColors.onSurface.getArgb(theme.schemes.light),
            colorContainer: MaterialDynamicColors.surfaceContainer.getArgb(theme.schemes.light),
            onColorContainer: MaterialDynamicColors.onSurfaceContainer.getArgb(theme.schemes.light)
        },
        dark: {
            color: darkModeColor.getArgb(theme.schemes.dark),
            onColor: MaterialDynamicColors.onSurface.getArgb(theme.schemes.dark),
            colorContainer: MaterialDynamicColors.surfaceContainer.getArgb(theme.schemes.dark),
            onColorContainer: MaterialDynamicColors.onSurfaceContainer.getArgb(theme.schemes.dark)
        }
    };

    return {
        ...theme,
        customColors: [...theme.customColors, customColorGroup]
    };
};


export {
    ToneDeltaPair,
    DynamicColor,
    MaterialDynamicColors,
    Blend,
    Score,
    dynamicThemeFromSourceColor,
    addCustomColor,
    themeFromSourceColor,
    extractColorsFromImage,
    themeFromImage,
    isFidelity,
    isMonochrome,
    findDesiredChromaByTone,
};