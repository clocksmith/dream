/**
 * @license
 * MIT License
 *
 * Copyright (c) 2025 dream
 *
 * This software, "dream", is a fork of Google's material-color-utilities
 * (https://github.com/material-foundation/material-color-utilities).
 * While based on and incorporating concepts and code from the original
 * material-color-utilities project, "hctjs" is maintained and distributed
 * under the terms of the MIT License as set forth below.
 *
 * The original material-color-utilities project is licensed under the
 * Apache License 2.0.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice, including the
 * acknowledgement of the original material-color-utilities project, shall be
 * included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */
export declare const math: {
    clampDouble: typeof clampDouble;
    clampInt: typeof clampInt;
    differenceDegrees: typeof differenceDegrees;
    lerp: typeof lerp;
    matrixMultiply: typeof matrixMultiply;
    rotationDirection: typeof rotationDirection;
    sanitizeDegreesDouble: typeof sanitizeDegreesDouble;
    sanitizeDegreesInt: typeof sanitizeDegreesInt;
    signum: typeof signum;
};
export declare const utils: {
    alphaFromArgb: typeof alphaFromArgb;
    argbFromLab: typeof argbFromLab;
    argbFromLinrgb: typeof argbFromLinrgb;
    argbFromLstar: typeof argbFromLstar;
    argbFromRgb: typeof argbFromRgb;
    argbFromXyz: typeof argbFromXyz;
    blueFromArgb: typeof blueFromArgb;
    delinearized: typeof delinearized;
    greenFromArgb: typeof greenFromArgb;
    isOpaque: typeof isOpaque;
    labFromArgb: typeof labFromArgb;
    linearized: typeof linearized;
    lstarFromArgb: typeof lstarFromArgb;
    lstarFromY: typeof lstarFromY;
    redFromArgb: typeof redFromArgb;
    whitePointD65: typeof whitePointD65;
    xyzFromArgb: typeof xyzFromArgb;
    yFromLstar: typeof yFromLstar;
};
/**
 * Functions for blending in HCT and CAM16.
 */
export declare class Blend {
    /**
     * Blend the design color's HCT hue towards the key color's HCT
     * hue, in a way that leaves the original color recognizable and
     * recognizably shifted towards the key color.
     *
     * @param designColor ARGB representation of an arbitrary color.
     * @param sourceColor ARGB representation of the main theme color.
     * @return The design color with a hue shifted towards the
     * system's color, a slightly warmer/cooler variant of the design
     * color's hue.
     */
    static harmonize(designColor: number, sourceColor: number): number;
    /**
     * Blends hue from one color into another. The chroma and tone of
     * the original color are maintained.
     *
     * @param from ARGB representation of color
     * @param to ARGB representation of color
     * @param amount how much blending to perform; 0.0 >= and <= 1.0
     * @return from, with a hue blended towards to. Chroma and tone
     * are constant.
     */
    static hctHue(from: number, to: number, amount: number): number;
    /**
     * Blend in CAM16-UCS space.
     *
     * @param from ARGB representation of color
     * @param to ARGB representation of color
     * @param amount how much blending to perform; 0.0 >= and <= 1.0
     * @return from, blended towards to. Hue, chroma, and tone will
     * change.
     */
    static cam16Ucs(from: number, to: number, amount: number): number;
}
/**
 * Utility methods for calculating contrast given two colors, or calculating a
 * color given one color and a contrast ratio.
 *
 * Contrast ratio is calculated using XYZ's Y. When linearized to match human
 * perception, Y becomes HCT's tone and L*a*b*'s' L*. Informally, this is the
 * lightness of a color.
 *
 * Methods refer to tone, T in the the HCT color space.
 * Tone is equivalent to L* in the L*a*b* color space, or L in the LCH color
 * space.
 */
export declare class Contrast {
    /**
     * Returns a contrast ratio, which ranges from 1 to 21.
     *
     * @param toneA Tone between 0 and 100. Values outside will be clamped.
     * @param toneB Tone between 0 and 100. Values outside will be clamped.
     */
    static ratioOfTones(toneA: number, toneB: number): number;
    static ratioOfYs(y1: number, y2: number): number;
    /**
     * Returns a tone >= tone parameter that ensures ratio parameter.
     * Return value is between 0 and 100.
     * Returns -1 if ratio cannot be achieved with tone parameter.
     *
     * @param tone Tone return value must contrast with.
     * Range is 0 to 100. Invalid values will result in -1 being returned.
     * @param ratio Contrast ratio of return value and tone.
     * Range is 1 to 21, invalid values have undefined behavior.
     */
    static lighter(tone: number, ratio: number): number;
    /**
     * Returns a tone <= tone parameter that ensures ratio parameter.
     * Return value is between 0 and 100.
     * Returns -1 if ratio cannot be achieved with tone parameter.
     *
     * @param tone Tone return value must contrast with.
     * Range is 0 to 100. Invalid values will result in -1 being returned.
     * @param ratio Contrast ratio of return value and tone.
     * Range is 1 to 21, invalid values have undefined behavior.
     */
    static darker(tone: number, ratio: number): number;
    /**
     * Returns a tone >= tone parameter that ensures ratio parameter.
     * Return value is between 0 and 100.
     * Returns 100 if ratio cannot be achieved with tone parameter.
     *
     * This method is unsafe because the returned value is guaranteed to be in
     * bounds for tone, i.e. between 0 and 100. However, that value may not reach
     * the ratio with tone. For example, there is no color lighter than T100.
     *
     * @param tone Tone return value must contrast with.
     * Range is 0 to 100. Invalid values will result in 100 being returned.
     * @param ratio Desired contrast ratio of return value and tone parameter.
     * Range is 1 to 21, invalid values have undefined behavior.
     */
    static lighterUnsafe(tone: number, ratio: number): number;
    /**
     * Returns a tone >= tone parameter that ensures ratio parameter.
     * Return value is between 0 and 100.
     * Returns 100 if ratio cannot be achieved with tone parameter.
     *
     * This method is unsafe because the returned value is guaranteed to be in
     * bounds for tone, i.e. between 0 and 100. However, that value may not reach
     * the [ratio with [tone]. For example, there is no color darker than T0.
     *
     * @param tone Tone return value must contrast with.
     * Range is 0 to 100. Invalid values will result in 0 being returned.
     * @param ratio Desired contrast ratio of return value and tone parameter.
     * Range is 1 to 21, invalid values have undefined behavior.
     */
    static darkerUnsafe(tone: number, ratio: number): number;
}
/**
 * Check and/or fix universally disliked colors.
 * Color science studies of color preference indicate universal distaste for
 * dark yellow-greens, and also show this is correlated to distate for
 * biological waste and rotting food.
 *
 * See Palmer and Schloss, 2010 or Schloss and Palmer's Chapter 21 in Handbook
 * of Color Psychology (2015).
 */
export declare class DislikeAnalyzer {
    /**
     * Returns true if a color is disliked.
     *
     * @param hct A color to be judged.
     * @return Whether the color is disliked.
     *
     * Disliked is defined as a dark yellow-green that is not neutral.
     */
    static isDisliked(hct: Hct): boolean;
    /**
     * If a color is disliked, lighten it to make it likable.
     *
     * @param hct A color to be judged.
     * @return A new color if the original color is disliked, or the original
     *   color if it is acceptable.
     */
    static fixIfDisliked(hct: Hct): Hct;
}
/**
 * A class containing a value that changes with the contrast level.
 *
 * Usually represents the contrast requirements for a dynamic color on its
 * background. The four values correspond to values for contrast levels -1.0,
 * 0.0, 0.5, and 1.0, respectively.
 */
export declare class ContrastCurve {
    readonly low: number;
    readonly normal: number;
    readonly medium: number;
    readonly high: number;
    /**
     * Creates a `ContrastCurve` object.
     *
     * @param low Value for contrast level -1.0
     * @param normal Value for contrast level 0.0
     * @param medium Value for contrast level 0.5
     * @param high Value for contrast level 1.0
     */
    constructor(low: number, normal: number, medium: number, high: number);
    /**
     * Returns the value at a given contrast level.
     *
     * @param contrastLevel The contrast level. 0.0 is the default (normal); -1.0
     *     is the lowest; 1.0 is the highest.
     * @return The value. For contrast ratios, a number between 1.0 and 21.0.
     */
    get(contrastLevel: number): number;
}
/**
 * @param name The name of the dynamic color. Defaults to empty.
 * @param palette Function that provides a TonalPalette given
 * DynamicScheme. A TonalPalette is defined by a hue and chroma, so this
 * replaces the need to specify hue/chroma. By providing a tonal palette, when
 * contrast adjustments are made, intended chroma can be preserved.
 * @param tone Function that provides a tone given DynamicScheme.
 * @param isBackground Whether this dynamic color is a background, with
 * some other color as the foreground. Defaults to false.
 * @param background The background of the dynamic color (as a function of a
 *     `DynamicScheme`), if it exists.
 * @param secondBackground A second background of the dynamic color (as a
 *     function of a `DynamicScheme`), if it
 * exists.
 * @param contrastCurve A `ContrastCurve` object specifying how its contrast
 * against its background should behave in various contrast levels options.
 * @param toneDeltaPair A `ToneDeltaPair` object specifying a tone delta
 * constraint between two colors. One of them must be the color being
 * constructed.
 */
export interface FromPaletteOptions {
    name?: string;
    palette: (scheme: DynamicScheme) => TonalPalette;
    tone: (scheme: DynamicScheme) => number;
    isBackground?: boolean;
    background?: (scheme: DynamicScheme) => DynamicColor;
    secondBackground?: (scheme: DynamicScheme) => DynamicColor;
    contrastCurve?: ContrastCurve;
    toneDeltaPair?: (scheme: DynamicScheme) => ToneDeltaPair;
}
/**
 * A color that adjusts itself based on UI state provided by DynamicScheme.
 *
 * Colors without backgrounds do not change tone when contrast changes. Colors
 * with backgrounds become closer to their background as contrast lowers, and
 * further when contrast increases.
 *
 * Prefer static constructors. They require either a hexcode, a palette and
 * tone, or a hue and chroma. Optionally, they can provide a background
 * DynamicColor.
 */
export declare class DynamicColor {
    readonly name: string;
    readonly palette: (scheme: DynamicScheme) => TonalPalette;
    readonly tone: (scheme: DynamicScheme) => number;
    readonly isBackground: boolean;
    readonly background?: (scheme: DynamicScheme) => DynamicColor;
    readonly secondBackground?: (scheme: DynamicScheme) => DynamicColor;
    readonly contrastCurve?: ContrastCurve;
    readonly toneDeltaPair?: (scheme: DynamicScheme) => ToneDeltaPair;
    private readonly hctCache;
    /**
     * Create a DynamicColor defined by a TonalPalette and HCT tone.
     *
     * @param args Functions with DynamicScheme as input. Must provide a palette
     * and tone. May provide a background DynamicColor and ToneDeltaConstraint.
     */
    static fromPalette(args: FromPaletteOptions): DynamicColor;
    /**
     * The base constructor for DynamicColor.
     *
     * _Strongly_ prefer using one of the convenience constructors. This class is
     * arguably too flexible to ensure it can support any scenario. Functional
     * arguments allow  overriding without risks that come with subclasses.
     *
     * For example, the default behavior of adjust tone at max contrast
     * to be at a 7.0 ratio with its background is principled and
     * matches accessibility guidance. That does not mean it's the desired
     * approach for _every_ design system, and every color pairing,
     * always, in every case.
     *
     * @param name The name of the dynamic color. Defaults to empty.
     * @param palette Function that provides a TonalPalette given
     * DynamicScheme. A TonalPalette is defined by a hue and chroma, so this
     * replaces the need to specify hue/chroma. By providing a tonal palette, when
     * contrast adjustments are made, intended chroma can be preserved.
     * @param tone Function that provides a tone, given a DynamicScheme.
     * @param isBackground Whether this dynamic color is a background, with
     * some other color as the foreground. Defaults to false.
     * @param background The background of the dynamic color (as a function of a
     *     `DynamicScheme`), if it exists.
     * @param secondBackground A second background of the dynamic color (as a
     *     function of a `DynamicScheme`), if it
     * exists.
     * @param contrastCurve A `ContrastCurve` object specifying how its contrast
     * against its background should behave in various contrast levels options.
     * @param toneDeltaPair A `ToneDeltaPair` object specifying a tone delta
     * constraint between two colors. One of them must be the color being
     * constructed.
     */
    constructor(name: string, palette: (scheme: DynamicScheme) => TonalPalette, tone: (scheme: DynamicScheme) => number, isBackground: boolean, background?: (scheme: DynamicScheme) => DynamicColor, secondBackground?: (scheme: DynamicScheme) => DynamicColor, contrastCurve?: ContrastCurve, toneDeltaPair?: (scheme: DynamicScheme) => ToneDeltaPair);
    /**
     * Return a ARGB integer (i.e. a hex code).
     *
     * @param scheme Defines the conditions of the user interface, for example,
     * whether or not it is dark mode or light mode, and what the desired
     * contrast level is.
     */
    getArgb(scheme: DynamicScheme): number;
    /**
     * Return a color, expressed in the HCT color space, that this
     * DynamicColor is under the conditions in scheme.
     *
     * @param scheme Defines the conditions of the user interface, for example,
     * whether or not it is dark mode or light mode, and what the desired
     * contrast level is.
     */
    getHct(scheme: DynamicScheme): Hct;
    /**
     * Return a tone, T in the HCT color space, that this DynamicColor is under
     * the conditions in scheme.
     *
     * @param scheme Defines the conditions of the user interface, for example,
     * whether or not it is dark mode or light mode, and what the desired
     * contrast level is.
     */
    getTone(scheme: DynamicScheme): number;
    /**
     * Given a background tone, find a foreground tone, while ensuring they reach
     * a contrast ratio that is as close to [ratio] as possible.
     *
     * @param bgTone Tone in HCT. Range is 0 to 100, undefined behavior when it
     *     falls outside that range.
     * @param ratio The contrast ratio desired between bgTone and the return
     *     value.
     */
    static foregroundTone(bgTone: number, ratio: number): number;
    /**
     * Returns whether [tone] prefers a light foreground.
     *
     * People prefer white foregrounds on ~T60-70. Observed over time, and also
     * by Andrew Somers during research for APCA.
     *
     * T60 used as to create the smallest discontinuity possible when skipping
     * down to T49 in order to ensure light foregrounds.
     * Since `tertiaryContainer` in dark monochrome scheme requires a tone of
     * 60, it should not be adjusted. Therefore, 60 is excluded here.
     */
    static tonePrefersLightForeground(tone: number): boolean;
    /**
     * Returns whether [tone] can reach a contrast ratio of 4.5 with a lighter
     * color.
     */
    static toneAllowsLightForeground(tone: number): boolean;
    /**
     * Adjust a tone such that white has 4.5 contrast, if the tone is
     * reasonably close to supporting it.
     */
    static enableLightForeground(tone: number): number;
}
/**
 * @param sourceColorArgb The source color of the theme as an ARGB 32-bit
 *     integer.
 * @param variant The variant, or style, of the theme.
 * @param contrastLevel Value from -1 to 1. -1 represents minimum contrast,
 * 0 represents standard (i.e. the design as spec'd), and 1 represents maximum
 * contrast.
 * @param isDark Whether the scheme is in dark mode or light mode.
 * @param primaryPalette Given a tone, produces a color. Hue and chroma of the
 * color are specified in the design specification of the variant. Usually
 * colorful.
 * @param secondaryPalette Given a tone, produces a color. Hue and chroma of
 * the color are specified in the design specification of the variant. Usually
 * less colorful.
 * @param tertiaryPalette Given a tone, produces a color. Hue and chroma of
 * the color are specified in the design specification of the variant. Usually
 * a different hue from primary and colorful.
 * @param neutralPalette Given a tone, produces a color. Hue and chroma of the
 * color are specified in the design specification of the variant. Usually not
 * colorful at all, intended for background & surface colors.
 * @param neutralVariantPalette Given a tone, produces a color. Hue and chroma
 * of the color are specified in the design specification of the variant.
 * Usually not colorful, but slightly more colorful than Neutral. Intended for
 * backgrounds & surfaces.
 */
export interface DynamicSchemeOptions {
    sourceColorHct: Hct;
    variant: Variant;
    contrastLevel: number;
    isDark: boolean;
    primaryPalette: TonalPalette;
    secondaryPalette: TonalPalette;
    tertiaryPalette: TonalPalette;
    neutralPalette: TonalPalette;
    neutralVariantPalette: TonalPalette;
    errorPalette?: TonalPalette;
}
/**
 * Constructed by a set of values representing the current UI state (such as
 * whether or not its dark theme, what the theme style is, etc.), and
 * provides a set of TonalPalettes that can create colors that fit in
 * with the theme style. Used by DynamicColor to resolve into a color.
 */
export declare class DynamicScheme {
    /**
     * The source color of the theme as an HCT color.
     */
    sourceColorHct: Hct;
    /**
     * Given a tone, produces a reddish, colorful, color.
     */
    errorPalette: TonalPalette;
    /** The source color of the theme as an ARGB 32-bit integer. */
    readonly sourceColorArgb: number;
    /** The variant, or style, of the theme. */
    readonly variant: Variant;
    /**
     * Value from -1 to 1. -1 represents minimum contrast. 0 represents standard
     * (i.e. the design as spec'd), and 1 represents maximum contrast.
     */
    readonly contrastLevel: number;
    /** Whether the scheme is in dark mode or light mode. */
    readonly isDark: boolean;
    /**
     * Given a tone, produces a color. Hue and chroma of the
     * color are specified in the design specification of the variant. Usually
     * colorful.
     */
    readonly primaryPalette: TonalPalette;
    /**
     * Given a tone, produces a color. Hue and chroma of
     * the color are specified in the design specification of the variant. Usually
     * less colorful.
     */
    readonly secondaryPalette: TonalPalette;
    /**
     * Given a tone, produces a color. Hue and chroma of
     * the color are specified in the design specification of the variant. Usually
     * a different hue from primary and colorful.
     */
    readonly tertiaryPalette: TonalPalette;
    /**
     * Given a tone, produces a color. Hue and chroma of the
     * color are specified in the design specification of the variant. Usually not
     * colorful at all, intended for background & surface colors.
     */
    readonly neutralPalette: TonalPalette;
    /**
     * Given a tone, produces a color. Hue and chroma
     * of the color are specified in the design specification of the variant.
     * Usually not colorful, but slightly more colorful than Neutral. Intended for
     * backgrounds & surfaces.
     */
    readonly neutralVariantPalette: TonalPalette;
    constructor(args: DynamicSchemeOptions);
    /**
     * Support design spec'ing Dynamic Color by schemes that specify hue
     * rotations that should be applied at certain breakpoints.
     * @param sourceColor the source color of the theme, in HCT.
     * @param hues The "breakpoints", i.e. the hues at which a rotation should
     * be apply.
     * @param rotations The rotation that should be applied when source color's
     * hue is >= the same index in hues array, and <= the hue at the next index
     * in hues array.
     */
    static getRotatedHue(sourceColor: Hct, hues: number[], rotations: number[]): number;
    getArgb(dynamicColor: DynamicColor): number;
    getHct(dynamicColor: DynamicColor): Hct;
    get primaryPaletteKeyColor(): number;
    get secondaryPaletteKeyColor(): number;
    get tertiaryPaletteKeyColor(): number;
    get neutralPaletteKeyColor(): number;
    get neutralVariantPaletteKeyColor(): number;
    get background(): number;
    get onBackground(): number;
    get surface(): number;
    get surfaceDim(): number;
    get surfaceBright(): number;
    get surfaceContainerLowest(): number;
    get surfaceContainerLow(): number;
    get surfaceContainer(): number;
    get surfaceContainerHigh(): number;
    get surfaceContainerHighest(): number;
    get onSurface(): number;
    get surfaceVariant(): number;
    get onSurfaceVariant(): number;
    get inverseSurface(): number;
    get inverseOnSurface(): number;
    get outline(): number;
    get outlineVariant(): number;
    get shadow(): number;
    get scrim(): number;
    get surfaceTint(): number;
    get primary(): number;
    get onPrimary(): number;
    get primaryContainer(): number;
    get onPrimaryContainer(): number;
    get inversePrimary(): number;
    get secondary(): number;
    get onSecondary(): number;
    get secondaryContainer(): number;
    get onSecondaryContainer(): number;
    get tertiary(): number;
    get onTertiary(): number;
    get tertiaryContainer(): number;
    get onTertiaryContainer(): number;
    get error(): number;
    get onError(): number;
    get errorContainer(): number;
    get onErrorContainer(): number;
    get primaryFixed(): number;
    get primaryFixedDim(): number;
    get onPrimaryFixed(): number;
    get onPrimaryFixedVariant(): number;
    get secondaryFixed(): number;
    get secondaryFixedDim(): number;
    get onSecondaryFixed(): number;
    get onSecondaryFixedVariant(): number;
    get tertiaryFixed(): number;
    get tertiaryFixedDim(): number;
    get onTertiaryFixed(): number;
    get onTertiaryFixedVariant(): number;
}
/**
 * DynamicColors for the colors in the Material Design system.
 */
export declare class MaterialDynamicColors {
    static contentAccentToneDelta: number;
    static highestSurface(s: DynamicScheme): DynamicColor;
    static primaryPaletteKeyColor: DynamicColor;
    static secondaryPaletteKeyColor: DynamicColor;
    static tertiaryPaletteKeyColor: DynamicColor;
    static neutralPaletteKeyColor: DynamicColor;
    static neutralVariantPaletteKeyColor: DynamicColor;
    static background: DynamicColor;
    static onBackground: DynamicColor;
    static surface: DynamicColor;
    static surfaceDim: DynamicColor;
    static surfaceBright: DynamicColor;
    static surfaceContainerLowest: DynamicColor;
    static surfaceContainerLow: DynamicColor;
    static surfaceContainer: DynamicColor;
    static surfaceContainerHigh: DynamicColor;
    static surfaceContainerHighest: DynamicColor;
    static onSurface: DynamicColor;
    static surfaceVariant: DynamicColor;
    static onSurfaceVariant: DynamicColor;
    static inverseSurface: DynamicColor;
    static inverseOnSurface: DynamicColor;
    static outline: DynamicColor;
    static outlineVariant: DynamicColor;
    static shadow: DynamicColor;
    static scrim: DynamicColor;
    static surfaceTint: DynamicColor;
    static primary: DynamicColor;
    static onPrimary: DynamicColor;
    static primaryContainer: DynamicColor;
    static onPrimaryContainer: DynamicColor;
    static inversePrimary: DynamicColor;
    static secondary: DynamicColor;
    static onSecondary: DynamicColor;
    static secondaryContainer: DynamicColor;
    static onSecondaryContainer: DynamicColor;
    static tertiary: DynamicColor;
    static onTertiary: DynamicColor;
    static tertiaryContainer: DynamicColor;
    static onTertiaryContainer: DynamicColor;
    static error: DynamicColor;
    static onError: DynamicColor;
    static errorContainer: DynamicColor;
    static onErrorContainer: DynamicColor;
    static primaryFixed: DynamicColor;
    static primaryFixedDim: DynamicColor;
    static onPrimaryFixed: DynamicColor;
    static onPrimaryFixedVariant: DynamicColor;
    static secondaryFixed: DynamicColor;
    static secondaryFixedDim: DynamicColor;
    static onSecondaryFixed: DynamicColor;
    static onSecondaryFixedVariant: DynamicColor;
    static tertiaryFixed: DynamicColor;
    static tertiaryFixedDim: DynamicColor;
    static onTertiaryFixed: DynamicColor;
    static onTertiaryFixedVariant: DynamicColor;
}
/**
 * Describes the different in tone between colors.
 */
type TonePolarity = 'darker' | 'lighter' | 'nearer' | 'farther';
/**
 * Documents a constraint between two DynamicColors, in which their tones must
 * have a certain distance from each other.
 *
 * Prefer a DynamicColor with a background, this is for special cases when
 * designers want tonal distance, literally contrast, between two colors that
 * don't have a background / foreground relationship or a contrast guarantee.
 */
export declare class ToneDeltaPair {
    readonly roleA: DynamicColor;
    readonly roleB: DynamicColor;
    readonly delta: number;
    readonly polarity: TonePolarity;
    readonly stayTogether: boolean;
    /**
     * Documents a constraint in tone distance between two DynamicColors.
     *
     * The polarity is an adjective that describes "A", compared to "B".
     *
     * For instance, ToneDeltaPair(A, B, 15, 'darker', stayTogether) states that
     * A's tone should be at least 15 darker than B's.
     *
     * 'nearer' and 'farther' describes closeness to the surface roles. For
     * instance, ToneDeltaPair(A, B, 10, 'nearer', stayTogether) states that A
     * should be 10 lighter than B in light mode, and 10 darker than B in dark
     * mode.
     *
     * @param roleA The first role in a pair.
     * @param roleB The second role in a pair.
     * @param delta Required difference between tones. Absolute value, negative
     * values have undefined behavior.
     * @param polarity The relative relation between tones of roleA and roleB,
     * as described above.
     * @param stayTogether Whether these two roles should stay on the same side of
     * the "awkward zone" (T50-59). This is necessary for certain cases where
     * one role has two backgrounds.
     */
    constructor(roleA: DynamicColor, roleB: DynamicColor, delta: number, polarity: TonePolarity, stayTogether: boolean);
}
/**
 * Set of themes supported by Dynamic Color.
 * Instantiate the corresponding subclass, ex. SchemeTonalSpot, to create
 * colors corresponding to the theme.
 */
declare enum Variant {
    MONOCHROME = 0,
    NEUTRAL = 1,
    TONAL_SPOT = 2,
    VIBRANT = 3,
    EXPRESSIVE = 4,
    FIDELITY = 5,
    CONTENT = 6,
    RAINBOW = 7,
    FRUIT_SALAD = 8
}
/**
 * CAM16, a color appearance model. Colors are not just defined by their hex
 * code, but rather, a hex code and viewing conditions.
 *
 * CAM16 instances also have coordinates in the CAM16-UCS space, called J*, a*,
 * b*, or jstar, astar, bstar in code. CAM16-UCS is included in the CAM16
 * specification, and should be used when measuring distances between colors.
 *
 * In traditional color spaces, a color can be identified solely by the
 * observer's measurement of the color. Color appearance models such as CAM16
 * also use information about the environment where the color was
 * observed, known as the viewing conditions.
 *
 * For example, white under the traditional assumption of a midday sun white
 * point is accurately measured as a slightly chromatic blue by CAM16. (roughly,
 * hue 203, chroma 3, lightness 100)
 */
export declare class Cam16 {
    readonly hue: number;
    readonly chroma: number;
    readonly j: number;
    readonly q: number;
    readonly m: number;
    readonly s: number;
    readonly jstar: number;
    readonly astar: number;
    readonly bstar: number;
    /**
     * All of the CAM16 dimensions can be calculated from 3 of the dimensions, in
     * the following combinations:
     *      -  {j or q} and {c, m, or s} and hue
     *      - jstar, astar, bstar
     * Prefer using a static method that constructs from 3 of those dimensions.
     * This constructor is intended for those methods to use to return all
     * possible dimensions.
     *
     * @param hue
     * @param chroma informally, colorfulness / color intensity. like saturation
     *     in HSL, except perceptually accurate.
     * @param j lightness
     * @param q brightness; ratio of lightness to white point's lightness
     * @param m colorfulness
     * @param s saturation; ratio of chroma to white point's chroma
     * @param jstar CAM16-UCS J coordinate
     * @param astar CAM16-UCS a coordinate
     * @param bstar CAM16-UCS b coordinate
     */
    constructor(hue: number, chroma: number, j: number, q: number, m: number, s: number, jstar: number, astar: number, bstar: number);
    /**
     * CAM16 instances also have coordinates in the CAM16-UCS space, called J*,
     * a*, b*, or jstar, astar, bstar in code. CAM16-UCS is included in the CAM16
     * specification, and is used to measure distances between colors.
     */
    distance(other: Cam16): number;
    /**
     * @param argb ARGB representation of a color.
     * @return CAM16 color, assuming the color was viewed in default viewing
     *     conditions.
     */
    static fromInt(argb: number): Cam16;
    /**
     * @param argb ARGB representation of a color.
     * @param viewingConditions Information about the environment where the color
     *     was observed.
     * @return CAM16 color.
     */
    static fromIntInViewingConditions(argb: number, viewingConditions: ViewingConditions): Cam16;
    /**
     * @param j CAM16 lightness
     * @param c CAM16 chroma
     * @param h CAM16 hue
     */
    static fromJch(j: number, c: number, h: number): Cam16;
    /**
     * @param j CAM16 lightness
     * @param c CAM16 chroma
     * @param h CAM16 hue
     * @param viewingConditions Information about the environment where the color
     *     was observed.
     */
    static fromJchInViewingConditions(j: number, c: number, h: number, viewingConditions: ViewingConditions): Cam16;
    /**
     * @param jstar CAM16-UCS lightness.
     * @param astar CAM16-UCS a dimension. Like a* in L*a*b*, it is a Cartesian
     *     coordinate on the Y axis.
     * @param bstar CAM16-UCS b dimension. Like a* in L*a*b*, it is a Cartesian
     *     coordinate on the X axis.
     */
    static fromUcs(jstar: number, astar: number, bstar: number): Cam16;
    /**
     * @param jstar CAM16-UCS lightness.
     * @param astar CAM16-UCS a dimension. Like a* in L*a*b*, it is a Cartesian
     *     coordinate on the Y axis.
     * @param bstar CAM16-UCS b dimension. Like a* in L*a*b*, it is a Cartesian
     *     coordinate on the X axis.
     * @param viewingConditions Information about the environment where the color
     *     was observed.
     */
    static fromUcsInViewingConditions(jstar: number, astar: number, bstar: number, viewingConditions: ViewingConditions): Cam16;
    /**
     *  @return ARGB representation of color, assuming the color was viewed in
     *     default viewing conditions, which are near-identical to the default
     *     viewing conditions for sRGB.
     */
    toInt(): number;
    /**
     * @param viewingConditions Information about the environment where the color
     *     will be viewed.
     * @return ARGB representation of color
     */
    viewed(viewingConditions: ViewingConditions): number;
    static fromXyzInViewingConditions(x: number, y: number, z: number, viewingConditions: ViewingConditions): Cam16;
    xyzInViewingConditions(viewingConditions: ViewingConditions): number[];
}
/**
 * A color system built using CAM16 hue and chroma, and L* from
 * L*a*b*.
 *
 * Using L* creates a link between the color system, contrast, and thus
 * accessibility. Contrast ratio depends on relative luminance, or Y in the XYZ
 * color space. L*, or perceptual luminance can be calculated from Y.
 *
 * Unlike Y, L* is linear to human perception, allowing trivial creation of
 * accurate color tones.
 *
 * Unlike contrast ratio, measuring contrast in L* is linear, and simple to
 * calculate. A difference of 40 in HCT tone guarantees a contrast ratio >= 3.0,
 * and a difference of 50 guarantees a contrast ratio >= 4.5.
 */
/**
 * HCT, hue, chroma, and tone. A color system that provides a perceptually
 * accurate color measurement system that can also accurately render what colors
 * will appear as in different lighting environments.
 */
export declare class Hct {
    private argb;
    /**
     * @param hue 0 <= hue < 360; invalid values are corrected.
     * @param chroma 0 <= chroma < ?; Informally, colorfulness. The color
     *     returned may be lower than the requested chroma. Chroma has a different
     *     maximum for any given hue and tone.
     * @param tone 0 <= tone <= 100; invalid values are corrected.
     * @return HCT representation of a color in default viewing conditions.
     */
    internalHue: number;
    internalChroma: number;
    internalTone: number;
    static from(hue: number, chroma: number, tone: number): Hct;
    /**
     * @param argb ARGB representation of a color.
     * @return HCT representation of a color in default viewing conditions
     */
    static fromInt(argb: number): Hct;
    toInt(): number;
    /**
     * A number, in degrees, representing ex. red, orange, yellow, etc.
     * Ranges from 0 <= hue < 360.
     */
    get hue(): number;
    /**
     * @param newHue 0 <= newHue < 360; invalid values are corrected.
     * Chroma may decrease because chroma has a different maximum for any given
     * hue and tone.
     */
    set hue(newHue: number);
    get chroma(): number;
    /**
     * @param newChroma 0 <= newChroma < ?
     * Chroma may decrease because chroma has a different maximum for any given
     * hue and tone.
     */
    set chroma(newChroma: number);
    /** Lightness. Ranges from 0 to 100. */
    get tone(): number;
    /**
     * @param newTone 0 <= newTone <= 100; invalid valids are corrected.
     * Chroma may decrease because chroma has a different maximum for any given
     * hue and tone.
     */
    set tone(newTone: number);
    private constructor();
    private setInternalState;
    /**
     * Translates a color into different [ViewingConditions].
     *
     * Colors change appearance. They look different with lights on versus off,
     * the same color, as in hex code, on white looks different when on black.
     * This is called color relativity, most famously explicated by Josef Albers
     * in Interaction of Color.
     *
     * In color science, color appearance models can account for this and
     * calculate the appearance of a color in different settings. HCT is based on
     * CAM16, a color appearance model, and uses it to make these calculations.
     *
     * See [ViewingConditions.make] for parameters affecting color appearance.
     */
    inViewingConditions(vc: ViewingConditions): Hct;
}
/**
 * A class that solves the HCT equation.
 */
export declare class HctSolver {
    static SCALED_DISCOUNT_FROM_LINRGB: number[][];
    static LINRGB_FROM_SCALED_DISCOUNT: number[][];
    static Y_FROM_LINRGB: number[];
    static CRITICAL_PLANES: number[];
    /**
     * Sanitizes a small enough angle in radians.
     *
     * @param angle An angle in radians; must not deviate too much
     * from 0.
     * @return A coterminal angle between 0 and 2pi.
     */
    private static sanitizeRadians;
    /**
     * Delinearizes an RGB component, returning a floating-point
     * number.
     *
     * @param rgbComponent 0.0 <= rgb_component <= 100.0, represents
     * linear R/G/B channel
     * @return 0.0 <= output <= 255.0, color channel converted to
     * regular RGB space
     */
    private static trueDelinearized;
    private static chromaticAdaptation;
    /**
     * Returns the hue of a linear RGB color in CAM16.
     *
     * @param linrgb The linear RGB coordinates of a color.
     * @return The hue of the color in CAM16, in radians.
     */
    private static hueOf;
    private static areInCyclicOrder;
    /**
     * Solves the lerp equation.
     *
     * @param source The starting number.
     * @param mid The number in the middle.
     * @param target The ending number.
     * @return A number t such that lerp(source, target, t) = mid.
     */
    private static intercept;
    private static lerpPoint;
    /**
     * Intersects a segment with a plane.
     *
     * @param source The coordinates of point A.
     * @param coordinate The R-, G-, or B-coordinate of the plane.
     * @param target The coordinates of point B.
     * @param axis The axis the plane is perpendicular with. (0: R, 1:
     * G, 2: B)
     * @return The intersection point of the segment AB with the plane
     * R=coordinate, G=coordinate, or B=coordinate
     */
    private static setCoordinate;
    private static isBounded;
    /**
     * Returns the nth possible vertex of the polygonal intersection.
     *
     * @param y The Y value of the plane.
     * @param n The zero-based index of the point. 0 <= n <= 11.
     * @return The nth possible vertex of the polygonal intersection
     * of the y plane and the RGB cube, in linear RGB coordinates, if
     * it exists. If this possible vertex lies outside of the cube,
     * [-1.0, -1.0, -1.0] is returned.
     */
    private static nthVertex;
    /**
     * Finds the segment containing the desired color.
     *
     * @param y The Y value of the color.
     * @param targetHue The hue of the color.
     * @return A list of two sets of linear RGB coordinates, each
     * corresponding to an endpoint of the segment containing the
     * desired color.
     */
    private static bisectToSegment;
    private static midpoint;
    private static criticalPlaneBelow;
    private static criticalPlaneAbove;
    /**
     * Finds a color with the given Y and hue on the boundary of the
     * cube.
     *
     * @param y The Y value of the color.
     * @param targetHue The hue of the color.
     * @return The desired color, in linear RGB coordinates.
     */
    private static bisectToLimit;
    private static inverseChromaticAdaptation;
    /**
     * Finds a color with the given hue, chroma, and Y.
     *
     * @param hueRadians The desired hue in radians.
     * @param chroma The desired chroma.
     * @param y The desired Y.
     * @return The desired color as a hexadecimal integer, if found; 0
     * otherwise.
     */
    private static findResultByJ;
    /**
     * Finds an sRGB color with the given hue, chroma, and L*, if
     * possible.
     *
     * @param hueDegrees The desired hue, in degrees.
     * @param chroma The desired chroma.
     * @param lstar The desired L*.
     * @return A hexadecimal representing the sRGB color. The color
     * has sufficiently close hue, chroma, and L* to the desired
     * values, if possible; otherwise, the hue and L* will be
     * sufficiently close, and chroma will be maximized.
     */
    static solveToInt(hueDegrees: number, chroma: number, lstar: number): number;
    /**
     * Finds an sRGB color with the given hue, chroma, and L*, if
     * possible.
     *
     * @param hueDegrees The desired hue, in degrees.
     * @param chroma The desired chroma.
     * @param lstar The desired L*.
     * @return An CAM16 object representing the sRGB color. The color
     * has sufficiently close hue, chroma, and L* to the desired
     * values, if possible; otherwise, the hue and L* will be
     * sufficiently close, and chroma will be maximized.
     */
    static solveToCam(hueDegrees: number, chroma: number, lstar: number): Cam16;
}
/**
 * In traditional color spaces, a color can be identified solely by the
 * observer's measurement of the color. Color appearance models such as CAM16
 * also use information about the environment where the color was
 * observed, known as the viewing conditions.
 *
 * For example, white under the traditional assumption of a midday sun white
 * point is accurately measured as a slightly chromatic blue by CAM16. (roughly,
 * hue 203, chroma 3, lightness 100)
 *
 * This class caches intermediate values of the CAM16 conversion process that
 * depend only on viewing conditions, enabling speed ups.
 */
export declare class ViewingConditions {
    n: number;
    aw: number;
    nbb: number;
    ncb: number;
    c: number;
    nc: number;
    rgbD: number[];
    fl: number;
    fLRoot: number;
    z: number;
    /** sRGB-like viewing conditions.  */
    static DEFAULT: ViewingConditions;
    /**
     * Create ViewingConditions from a simple, physically relevant, set of
     * parameters.
     *
     * @param whitePoint White point, measured in the XYZ color space.
     *     default = D65, or sunny day afternoon
     * @param adaptingLuminance The luminance of the adapting field. Informally,
     *     how bright it is in the room where the color is viewed. Can be
     *     calculated from lux by multiplying lux by 0.0586. default = 11.72,
     *     or 200 lux.
     * @param backgroundLstar The lightness of the area surrounding the color.
     *     measured by L* in L*a*b*. default = 50.0
     * @param surround A general description of the lighting surrounding the
     *     color. 0 is pitch dark, like watching a movie in a theater. 1.0 is a
     *     dimly light room, like watching TV at home at night. 2.0 means there
     *     is no difference between the lighting on the color and around it.
     *     default = 2.0
     * @param discountingIlluminant Whether the eye accounts for the tint of the
     *     ambient lighting, such as knowing an apple is still red in green light.
     *     default = false, the eye does not perform this process on
     *       self-luminous objects like displays.
     */
    static make(whitePoint?: number[], adaptingLuminance?: number, backgroundLstar?: number, surround?: number, discountingIlluminant?: boolean): ViewingConditions;
    /**
     * Parameters are intermediate values of the CAM16 conversion process. Their
     * names are shorthand for technical color science terminology, this class
     * would not benefit from documenting them individually. A brief overview
     * is available in the CAM16 specification, and a complete overview requires
     * a color science textbook, such as Fairchild's Color Appearance Models.
     */
    private constructor();
}
/**
 * @deprecated Use {@link DynamicScheme} for color scheme generation.
 * Use {@link CorePalettes} for core palettes container class.
 */
export interface CorePaletteColors {
    primary: number;
    secondary?: number;
    tertiary?: number;
    neutral?: number;
    neutralVariant?: number;
    error?: number;
}
/**
 * An intermediate concept between the key color for a UI theme, and a full
 * color scheme. 5 sets of tones are generated, all except one use the same hue
 * as the key color, and all vary in chroma.
 *
 * @deprecated Use {@link DynamicScheme} for color scheme generation.
 * Use {@link CorePalettes} for core palettes container class.
 */
export declare class CorePalette {
    a1: TonalPalette;
    a2: TonalPalette;
    a3: TonalPalette;
    n1: TonalPalette;
    n2: TonalPalette;
    error: TonalPalette;
    /**
     * @param argb ARGB representation of a color
     *
     * @deprecated Use {@link DynamicScheme} for color scheme generation.
     * Use {@link CorePalettes} for core palettes container class.
     */
    static of(argb: number): CorePalette;
    /**
     * @param argb ARGB representation of a color
     *
     * @deprecated Use {@link DynamicScheme} for color scheme generation.
     * Use {@link CorePalettes} for core palettes container class.
     */
    static contentOf(argb: number): CorePalette;
    /**
     * Create a [CorePalette] from a set of colors
     *
     * @deprecated Use {@link DynamicScheme} for color scheme generation.
     * Use {@link CorePalettes} for core palettes container class.
     */
    static fromColors(colors: CorePaletteColors): CorePalette;
    /**
     * Create a content [CorePalette] from a set of colors
     *
     * @deprecated Use {@link DynamicScheme} for color scheme generation.
     * Use {@link CorePalettes} for core palettes container class.
     */
    static contentFromColors(colors: CorePaletteColors): CorePalette;
    private static createPaletteFromColors;
    private constructor();
}
/**
 * Comprises foundational palettes to build a color scheme. Generated from a
 * source color, these palettes will then be part of a [DynamicScheme] together
 * with appearance preferences.
 */
export declare class CorePalettes {
    primary: TonalPalette;
    secondary: TonalPalette;
    tertiary: TonalPalette;
    neutral: TonalPalette;
    neutralVariant: TonalPalette;
    constructor(primary: TonalPalette, secondary: TonalPalette, tertiary: TonalPalette, neutral: TonalPalette, neutralVariant: TonalPalette);
}
/**
 *  A convenience class for retrieving colors that are constant in hue and
 *  chroma, but vary in tone.
 */
export declare class TonalPalette {
    readonly hue: number;
    readonly chroma: number;
    readonly keyColor: Hct;
    private readonly cache;
    /**
     * @param argb ARGB representation of a color
     * @return Tones matching that color's hue and chroma.
     */
    static fromInt(argb: number): TonalPalette;
    /**
     * @param hct Hct
     * @return Tones matching that color's hue and chroma.
     */
    static fromHct(hct: Hct): TonalPalette;
    /**
     * @param hue HCT hue
     * @param chroma HCT chroma
     * @return Tones matching hue and chroma.
     */
    static fromHueAndChroma(hue: number, chroma: number): TonalPalette;
    private constructor();
    /**
     * @param tone HCT tone, measured from 0 to 100.
     * @return ARGB representation of a color with that tone.
     */
    tone(tone: number): number;
    /**
     * @param tone HCT tone.
     * @return HCT representation of a color with that tone.
     */
    getHct(tone: number): Hct;
}
/**
 * Key color is a color that represents the hue and chroma of a tonal palette
 */
export declare class KeyColor {
    readonly hue: number;
    readonly requestedChroma: number;
    private readonly chromaCache;
    private readonly maxChromaValue;
    constructor(hue: number, requestedChroma: number);
    /**
     * Creates a key color from a [hue] and a [chroma].
     * The key color is the first tone, starting from T50, matching the given hue
     * and chroma.
     *
     * @return Key color [Hct]
     */
    create(): Hct;
    private maxChroma;
}
/**
 * Provides conversions needed for K-Means quantization. Converting input to
 * points, and converting the final state of the K-Means algorithm to colors.
 */
export declare class LabPointProvider implements PointProvider {
    /**
     * Convert a color represented in ARGB to a 3-element array of L*a*b*
     * coordinates of the color.
     */
    fromInt(argb: number): number[];
    /**
     * Convert a 3-element array to a color represented in ARGB.
     */
    toInt(point: number[]): number;
    /**
     * Standard CIE 1976 delta E formula also takes the square root, unneeded
     * here. This method is used by quantization algorithms to compare distance,
     * and the relative ordering is the same, with or without a square root.
     *
     * This relatively minor optimization is helpful because this method is
     * called at least once for each pixel in an image.
     */
    distance(from: number[], to: number[]): number;
}
/**
 * An interface to allow use of different color spaces by
 * quantizers.
 */
declare interface PointProvider {
    toInt(point: number[]): number;
    fromInt(argb: number): number[];
    distance(from: number[], to: number[]): number;
}
/**
 * An image quantizer that improves on the quality of a standard K-Means
 * algorithm by setting the K-Means initial state to the output of a Wu
 * quantizer, instead of random centroids. Improves on speed by several
 * optimizations, as implemented in Wsmeans, or Weighted Square Means, K-Means
 * with those optimizations.
 *
 * This algorithm was designed by M. Emre Celebi, and was found in their 2011
 * paper, Improving the Performance of K-Means for Color Quantization.
 * https://arxiv.org/abs/1101.0395
 */
export declare class QuantizerCelebi {
    /**
     * @param pixels Colors in ARGB format.
     * @param maxColors The number of colors to divide the image into. A lower
     *     number of colors may be returned.
     * @return Map with keys of colors in ARGB format, and values of number of
     *     pixels in the original image that correspond to the color in the
     *     quantized image.
     */
    static quantize(pixels: number[], maxColors: number): Map<number, number>;
}
/**
 * Quantizes an image into a map, with keys of ARGB colors, and values of the
 * number of times that color appears in the image.
 */
export declare class QuantizerMap {
    /**
     * @param pixels Colors in ARGB format.
     * @return A Map with keys of ARGB colors, and values of the number of times
     *     the color appears in the image.
     */
    static quantize(pixels: number[]): Map<number, number>;
}
/**
 * An image quantizer that improves on the speed of a standard K-Means algorithm
 * by implementing several optimizations, including deduping identical pixels
 * and a triangle inequality rule that reduces the number of comparisons needed
 * to identify which cluster a point should be moved to.
 *
 * Wsmeans stands for Weighted Square Means.
 *
 * This algorithm was designed by M. Emre Celebi, and was found in their 2011
 * paper, Improving the Performance of K-Means for Color Quantization.
 * https://arxiv.org/abs/1101.0395
 */
export declare class QuantizerWsmeans {
    /**
     * @param inputPixels Colors in ARGB format.
     * @param startingClusters Defines the initial state of the quantizer. Passing
     *     an empty array is fine, the implementation will create its own initial
     *     state that leads to reproducible results for the same inputs.
     *     Passing an array that is the result of Wu quantization leads to higher
     *     quality results.
     * @param maxColors The number of colors to divide the image into. A lower
     *     number of colors may be returned.
     * @return Colors in ARGB format.
     */
    static quantize(inputPixels: number[], startingClusters: number[], maxColors: number): Map<number, number>;
}
/**
 *  A wrapper for maintaining a table of distances between K-Means clusters.
 */
export declare class DistanceAndIndex {
    distance: number;
    index: number;
}
/**
 * An image quantizer that divides the image's pixels into clusters by
 * recursively cutting an RGB cube, based on the weight of pixels in each area
 * of the cube.
 *
 * The algorithm was described by Xiaolin Wu in Graphic Gems II, published in
 * 1991.
 */
export declare class QuantizerWu {
    private weights;
    private momentsR;
    private momentsG;
    private momentsB;
    private moments;
    private cubes;
    constructor(weights?: number[], momentsR?: number[], momentsG?: number[], momentsB?: number[], moments?: number[], cubes?: Box[]);
    /**
     * @param pixels Colors in ARGB format.
     * @param maxColors The number of colors to divide the image into. A lower
     *     number of colors may be returned.
     * @return Colors in ARGB format.
     */
    quantize(pixels: number[], maxColors: number): number[];
    private constructHistogram;
    private computeMoments;
    private createBoxes;
    private createResult;
    private variance;
    private cut;
    private maximize;
    private volume;
    private bottom;
    private top;
    private getIndex;
}
/**
 * Keeps track of the state of each box created as the Wu  quantization
 * algorithm progresses through dividing the image's pixels as plotted in RGB.
 */
export declare class Box {
    r0: number;
    r1: number;
    g0: number;
    g1: number;
    b0: number;
    b1: number;
    vol: number;
    constructor(r0?: number, r1?: number, g0?: number, g1?: number, b0?: number, b1?: number, vol?: number);
}
/**
 * Represents final result of Wu algorithm.
 */
export declare class CreateBoxesResult {
    requestedCount: number;
    resultCount: number;
    /**
     * @param requestedCount how many colors the caller asked to be returned from
     *     quantization.
     * @param resultCount the actual number of colors achieved from quantization.
     *     May be lower than the requested count.
     */
    constructor(requestedCount: number, resultCount: number);
}
/**
 * Represents the result of calculating where to cut an existing box in such
 * a way to maximize variance between the two new boxes created by a cut.
 */
export declare class MaximizeResult {
    cutLocation: number;
    maximum: number;
    constructor(cutLocation: number, maximum: number);
}
/**
 * DEPRECATED. The `Scheme` class is deprecated in favor of `DynamicScheme`.
 * Please see
 * https://github.com/material-foundation/material-color-utilities/blob/main/make_schemes.md
 * for migration guidance.
 *
 * Represents a Material color scheme, a mapping of color roles to colors.
 */
export declare class Scheme {
    private readonly props;
    get primary(): number;
    get onPrimary(): number;
    get primaryContainer(): number;
    get onPrimaryContainer(): number;
    get secondary(): number;
    get onSecondary(): number;
    get secondaryContainer(): number;
    get onSecondaryContainer(): number;
    get tertiary(): number;
    get onTertiary(): number;
    get tertiaryContainer(): number;
    get onTertiaryContainer(): number;
    get error(): number;
    get onError(): number;
    get errorContainer(): number;
    get onErrorContainer(): number;
    get background(): number;
    get onBackground(): number;
    get surface(): number;
    get onSurface(): number;
    get surfaceVariant(): number;
    get onSurfaceVariant(): number;
    get outline(): number;
    get outlineVariant(): number;
    get shadow(): number;
    get scrim(): number;
    get inverseSurface(): number;
    get inverseOnSurface(): number;
    get inversePrimary(): number;
    /**
     * @param argb ARGB representation of a color.
     * @return Light Material color scheme, based on the color's hue.
     */
    static light(argb: number): Scheme;
    /**
     * @param argb ARGB representation of a color.
     * @return Dark Material color scheme, based on the color's hue.
     */
    static dark(argb: number): Scheme;
    /**
     * @param argb ARGB representation of a color.
     * @return Light Material content color scheme, based on the color's hue.
     */
    static lightContent(argb: number): Scheme;
    /**
     * @param argb ARGB representation of a color.
     * @return Dark Material content color scheme, based on the color's hue.
     */
    static darkContent(argb: number): Scheme;
    /**
     * Light scheme from core palette
     */
    static lightFromCorePalette(core: CorePalette): Scheme;
    /**
     * Dark scheme from core palette
     */
    static darkFromCorePalette(core: CorePalette): Scheme;
    private constructor();
    toJSON(): {
        primary: number;
        onPrimary: number;
        primaryContainer: number;
        onPrimaryContainer: number;
        secondary: number;
        onSecondary: number;
        secondaryContainer: number;
        onSecondaryContainer: number;
        tertiary: number;
        onTertiary: number;
        tertiaryContainer: number;
        onTertiaryContainer: number;
        error: number;
        onError: number;
        errorContainer: number;
        onErrorContainer: number;
        background: number;
        onBackground: number;
        surface: number;
        onSurface: number;
        surfaceVariant: number;
        onSurfaceVariant: number;
        outline: number;
        outlineVariant: number;
        shadow: number;
        scrim: number;
        inverseSurface: number;
        inverseOnSurface: number;
        inversePrimary: number;
    };
}
/**
 * Represents an Android 12 color scheme, a mapping of color roles to colors.
 */
export declare class SchemeAndroid {
    private readonly props;
    get colorAccentPrimary(): number;
    get colorAccentPrimaryVariant(): number;
    get colorAccentSecondary(): number;
    get colorAccentSecondaryVariant(): number;
    get colorAccentTertiary(): number;
    get colorAccentTertiaryVariant(): number;
    get textColorPrimary(): number;
    get textColorSecondary(): number;
    get textColorTertiary(): number;
    get textColorPrimaryInverse(): number;
    get textColorSecondaryInverse(): number;
    get textColorTertiaryInverse(): number;
    get colorBackground(): number;
    get colorBackgroundFloating(): number;
    get colorSurface(): number;
    get colorSurfaceVariant(): number;
    get colorSurfaceHighlight(): number;
    get surfaceHeader(): number;
    get underSurface(): number;
    get offState(): number;
    get accentSurface(): number;
    get textPrimaryOnAccent(): number;
    get textSecondaryOnAccent(): number;
    get volumeBackground(): number;
    get scrim(): number;
    /**
     * @param argb ARGB representation of a color.
     * @return Light Material color scheme, based on the color's hue.
     */
    static light(argb: number): SchemeAndroid;
    /**
     * @param argb ARGB representation of a color.
     * @return Dark Material color scheme, based on the color's hue.
     */
    static dark(argb: number): SchemeAndroid;
    /**
     * @param argb ARGB representation of a color.
     * @return Light Android color scheme, based on the color's hue.
     */
    static lightContent(argb: number): SchemeAndroid;
    /**
     * @param argb ARGB representation of a color.
     * @return Dark Android color scheme, based on the color's hue.
     */
    static darkContent(argb: number): SchemeAndroid;
    /**
     * Light scheme from core palette
     */
    static lightFromCorePalette(core: CorePalette): SchemeAndroid;
    /**
     * Dark scheme from core palette
     */
    static darkFromCorePalette(core: CorePalette): SchemeAndroid;
    private constructor();
    toJSON(): {
        colorAccentPrimary: number;
        colorAccentPrimaryVariant: number;
        colorAccentSecondary: number;
        colorAccentSecondaryVariant: number;
        colorAccentTertiary: number;
        colorAccentTertiaryVariant: number;
        textColorPrimary: number;
        textColorSecondary: number;
        textColorTertiary: number;
        textColorPrimaryInverse: number;
        textColorSecondaryInverse: number;
        textColorTertiaryInverse: number;
        colorBackground: number;
        colorBackgroundFloating: number;
        colorSurface: number;
        colorSurfaceVariant: number;
        colorSurfaceHighlight: number;
        surfaceHeader: number;
        underSurface: number;
        offState: number;
        accentSurface: number;
        textPrimaryOnAccent: number;
        textSecondaryOnAccent: number;
        volumeBackground: number;
        scrim: number;
    };
}
/**
 * A scheme that places the source color in `Scheme.primaryContainer`.
 *
 * Primary Container is the source color, adjusted for color relativity.
 * It maintains constant appearance in light mode and dark mode.
 * This adds ~5 tone in light mode, and subtracts ~5 tone in dark mode.
 * Tertiary Container is the complement to the source color, using
 * `TemperatureCache`. It also maintains constant appearance.
 */
export declare class SchemeContent extends DynamicScheme {
    constructor(sourceColorHct: Hct, isDark: boolean, contrastLevel: number);
}
/**
 * A Dynamic Color theme that is intentionally detached from the source color.
 */
export declare class SchemeExpressive extends DynamicScheme {
    /**
     * Hues (in degrees) used at breakpoints such that designers can specify a
     * hue rotation that occurs at a given break point.
     */
    private static readonly hues;
    /**
     * Hue rotations (in degrees) of the Secondary [TonalPalette],
     * corresponding to the breakpoints in [hues].
     */
    private static readonly secondaryRotations;
    /**
     * Hue rotations (in degrees) of the Tertiary [TonalPalette],
     * corresponding to the breakpoints in [hues].
     */
    private static readonly tertiaryRotations;
    constructor(sourceColorHct: Hct, isDark: boolean, contrastLevel: number);
}
/**
 * A scheme that places the source color in `Scheme.primaryContainer`.
 *
 * Primary Container is the source color, adjusted for color relativity.
 * It maintains constant appearance in light mode and dark mode.
 * This adds ~5 tone in light mode, and subtracts ~5 tone in dark mode.
 * Tertiary Container is the complement to the source color, using
 * `TemperatureCache`. It also maintains constant appearance.
 */
export declare class SchemeFidelity extends DynamicScheme {
    constructor(sourceColorHct: Hct, isDark: boolean, contrastLevel: number);
}
/**
 * A playful theme - the source color's hue does not appear in the theme.
 */
export declare class SchemeFruitSalad extends DynamicScheme {
    constructor(sourceColorHct: Hct, isDark: boolean, contrastLevel: number);
}
/** A Dynamic Color theme that is grayscale. */
export declare class SchemeMonochrome extends DynamicScheme {
    constructor(sourceColorHct: Hct, isDark: boolean, contrastLevel: number);
}
/** A Dynamic Color theme that is near grayscale. */
export declare class SchemeNeutral extends DynamicScheme {
    constructor(sourceColorHct: Hct, isDark: boolean, contrastLevel: number);
}
/**
 * A playful theme - the source color's hue does not appear in the theme.
 */
export declare class SchemeRainbow extends DynamicScheme {
    constructor(sourceColorHct: Hct, isDark: boolean, contrastLevel: number);
}
/**
 * A Dynamic Color theme with low to medium colorfulness and a Tertiary
 * TonalPalette with a hue related to the source color.
 *
 * The default Material You theme on Android 12 and 13.
 */
export declare class SchemeTonalSpot extends DynamicScheme {
    constructor(sourceColorHct: Hct, isDark: boolean, contrastLevel: number);
}
/**
 * A Dynamic Color theme that maxes out colorfulness at each position in the
 * Primary Tonal Palette.
 */
export declare class SchemeVibrant extends DynamicScheme {
    /**
     * Hues (in degrees) used at breakpoints such that designers can specify a
     * hue rotation that occurs at a given break point.
     */
    private static readonly hues;
    /**
     * Hue rotations (in degrees) of the Secondary [TonalPalette],
     * corresponding to the breakpoints in [hues].
     */
    private static readonly secondaryRotations;
    /**
     * Hue rotations (in degrees) of the Tertiary [TonalPalette],
     * corresponding to the breakpoints in [hues].
     */
    private static readonly tertiaryRotations;
    constructor(sourceColorHct: Hct, isDark: boolean, contrastLevel: number);
}
/**
 * Default options for ranking colors based on usage counts.
 * desired: is the max count of the colors returned.
 * fallbackColorARGB: Is the default color that should be used if no
 *                    other colors are suitable.
 * filter: controls if the resulting colors should be filtered to not include
 *         hues that are not used often enough, and colors that are effectively
 *         grayscale.
 */
declare interface ScoreOptions {
    desired?: number;
    fallbackColorARGB?: number;
    filter?: boolean;
}
export declare function compare(a: {
    hct: Hct;
    score: number;
}, b: {
    hct: Hct;
    score: number;
}): number;
/**
 *  Given a large set of colors, remove colors that are unsuitable for a UI
 *  theme, and rank the rest based on suitability.
 *
 *  Enables use of a high cluster count for image quantization, thus ensuring
 *  colors aren't muddied, while curating the high cluster count to a much
 *  smaller number of appropriate choices.
 */
export declare class Score {
    private static readonly TARGET_CHROMA;
    private static readonly WEIGHT_PROPORTION;
    private static readonly WEIGHT_CHROMA_ABOVE;
    private static readonly WEIGHT_CHROMA_BELOW;
    private static readonly CUTOFF_CHROMA;
    private static readonly CUTOFF_EXCITED_PROPORTION;
    private constructor();
    /**
     * Given a map with keys of colors and values of how often the color appears,
     * rank the colors based on suitability for being used for a UI theme.
     *
     * @param colorsToPopulation map with keys of colors and values of how often
     *     the color appears, usually from a source image.
     * @param {ScoreOptions} options optional parameters.
     * @return Colors sorted by suitability for a UI theme. The most suitable
     *     color is the first item, the least suitable is the last. There will
     *     always be at least one color returned. If all the input colors
     *     were not suitable for a theme, a default fallback color will be
     *     provided, Google Blue.
     */
    static score(colorsToPopulation: Map<number, number>, options?: ScoreOptions): number[];
}
/**
 * Design utilities using color temperature theory.
 *
 * Analogous colors, complementary color, and cache to efficiently, lazily,
 * generate data for calculations when needed.
 */
export declare class TemperatureCache {
    input: Hct;
    constructor(input: Hct);
    hctsByTempCache: Hct[];
    hctsByHueCache: Hct[];
    tempsByHctCache: Map<Hct, number>;
    inputRelativeTemperatureCache: number;
    complementCache: Hct | null;
    get hctsByTemp(): Hct[];
    get warmest(): Hct;
    get coldest(): Hct;
    /**
     * A set of colors with differing hues, equidistant in temperature.
     *
     * In art, this is usually described as a set of 5 colors on a color wheel
     * divided into 12 sections. This method allows provision of either of those
     * values.
     *
     * Behavior is undefined when [count] or [divisions] is 0.
     * When divisions < count, colors repeat.
     *
     * [count] The number of colors to return, includes the input color.
     * [divisions] The number of divisions on the color wheel.
     */
    analogous(count?: number, divisions?: number): Hct[];
    /**
     * A color that complements the input color aesthetically.
     *
     * In art, this is usually described as being across the color wheel.
     * History of this shows intent as a color that is just as cool-warm as the
     * input color is warm-cool.
     */
    get complement(): Hct;
    /**
     * Temperature relative to all colors with the same chroma and tone.
     * Value on a scale from 0 to 1.
     */
    relativeTemperature(hct: Hct): number;
    /** Relative temperature of the input color. See [relativeTemperature]. */
    get inputRelativeTemperature(): number;
    /** A Map with keys of HCTs in [hctsByTemp], values of raw temperature. */
    get tempsByHct(): Map<Hct, number>;
    /**
     * HCTs for all hues, with the same chroma/tone as the input.
     * Sorted ascending, hue 0 to 360.
     */
    get hctsByHue(): Hct[];
    /** Determines if an angle is between two other angles, rotating clockwise. */
    static isBetween(angle: number, a: number, b: number): boolean;
    /**
     * Value representing cool-warm factor of a color.
     * Values below 0 are considered cool, above, warm.
     *
     * Color science has researched emotion and harmony, which art uses to select
     * colors. Warm-cool is the foundation of analogous and complementary colors.
     * See:
     * - Li-Chen Ou's Chapter 19 in Handbook of Color Psychology (2015).
     * - Josef Albers' Interaction of Color chapters 19 and 21.
     *
     * Implementation of Ou, Woodcock and Wright's algorithm, which uses
     * L*a*b* / LCH color space.
     * Return value has these properties:
     * - Values below 0 are cool, above 0 are warm.
     * - Lower bound: -0.52 - (chroma ^ 1.07 / 20). L*a*b* chroma is infinite.
     *   Assuming max of 130 chroma, -9.66.
     * - Upper bound: -0.52 + (chroma ^ 1.07 / 20). L*a*b* chroma is infinite.
     *   Assuming max of 130 chroma, 8.61.
     */
    static rawTemperature(color: Hct): number;
}
/**
 * Converts a color from RGB components to ARGB format.
 */
export declare function argbFromRgb(red: number, green: number, blue: number): number;
/**
 * Converts a color from linear RGB components to ARGB format.
 */
export declare function argbFromLinrgb(linrgb: number[]): number;
/**
 * Returns the alpha component of a color in ARGB format.
 */
export declare function alphaFromArgb(argb: number): number;
/**
 * Returns the red component of a color in ARGB format.
 */
export declare function redFromArgb(argb: number): number;
/**
 * Returns the green component of a color in ARGB format.
 */
export declare function greenFromArgb(argb: number): number;
/**
 * Returns the blue component of a color in ARGB format.
 */
export declare function blueFromArgb(argb: number): number;
/**
 * Returns whether a color in ARGB format is opaque.
 */
export declare function isOpaque(argb: number): boolean;
/**
 * Converts a color from ARGB to XYZ.
 */
export declare function argbFromXyz(x: number, y: number, z: number): number;
/**
 * Converts a color from XYZ to ARGB.
 */
export declare function xyzFromArgb(argb: number): number[];
/**
 * Converts a color represented in Lab color space into an ARGB
 * integer.
 */
export declare function argbFromLab(l: number, a: number, b: number): number;
/**
 * Converts a color from ARGB representation to L*a*b*
 * representation.
 *
 * @param argb the ARGB representation of a color
 * @return a Lab object representing the color
 */
export declare function labFromArgb(argb: number): number[];
/**
 * Converts an L* value to an ARGB representation.
 *
 * @param lstar L* in L*a*b*
 * @return ARGB representation of grayscale color with lightness
 * matching L*
 */
export declare function argbFromLstar(lstar: number): number;
/**
 * Computes the L* value of a color in ARGB representation.
 *
 * @param argb ARGB representation of a color
 * @return L*, from L*a*b*, coordinate of the color
 */
export declare function lstarFromArgb(argb: number): number;
/**
 * Converts an L* value to a Y value.
 *
 * L* in L*a*b* and Y in XYZ measure the same quantity, luminance.
 *
 * L* measures perceptual luminance, a linear scale. Y in XYZ
 * measures relative luminance, a logarithmic scale.
 *
 * @param lstar L* in L*a*b*
 * @return Y in XYZ
 */
export declare function yFromLstar(lstar: number): number;
/**
 * Converts a Y value to an L* value.
 *
 * L* in L*a*b* and Y in XYZ measure the same quantity, luminance.
 *
 * L* measures perceptual luminance, a linear scale. Y in XYZ
 * measures relative luminance, a logarithmic scale.
 *
 * @param y Y in XYZ
 * @return L* in L*a*b*
 */
export declare function lstarFromY(y: number): number;
/**
 * Linearizes an RGB component.
 *
 * @param rgbComponent 0 <= rgb_component <= 255, represents R/G/B
 * channel
 * @return 0.0 <= output <= 100.0, color channel converted to
 * linear RGB space
 */
export declare function linearized(rgbComponent: number): number;
/**
 * Delinearizes an RGB component.
 *
 * @param rgbComponent 0.0 <= rgb_component <= 100.0, represents
 * linear R/G/B channel
 * @return 0 <= output <= 255, color channel converted to regular
 * RGB space
 */
export declare function delinearized(rgbComponent: number): number;
/**
 * Returns the standard white point; white on a sunny day.
 *
 * @return The white point
 */
export declare function whitePointD65(): number[];
export declare function labF(t: number): number;
export declare function labInvf(ft: number): number;
/**
 * Get the source color from an image.
 *
 * @param image The image element
 * @return Source color - the color most suitable for creating a UI theme
 */
export declare function sourceColorFromImage(image: HTMLImageElement): Promise<number>;
/**
 * Get the source color from image bytes.
 *
 * @param imageBytes The image bytes
 * @return Source color - the color most suitable for creating a UI theme
 */
export declare function sourceColorFromImageBytes(imageBytes: Uint8ClampedArray): number;
/**
 * Utility methods for mathematical operations.
 */
/**
 * The signum function.
 *
 * @return 1 if num > 0, -1 if num < 0, and 0 if num = 0
 */
export declare function signum(num: number): number;
/**
 * The linear interpolation function.
 *
 * @return start if amount = 0 and stop if amount = 1
 */
export declare function lerp(start: number, stop: number, amount: number): number;
/**
 * Clamps an integer between two integers.
 *
 * @return input when min <= input <= max, and either min or max
 * otherwise.
 */
export declare function clampInt(min: number, max: number, input: number): number;
/**
 * Clamps an integer between two floating-point numbers.
 *
 * @return input when min <= input <= max, and either min or max
 * otherwise.
 */
export declare function clampDouble(min: number, max: number, input: number): number;
/**
 * Sanitizes a degree measure as an integer.
 *
 * @return a degree measure between 0 (inclusive) and 360
 * (exclusive).
 */
export declare function sanitizeDegreesInt(degrees: number): number;
/**
 * Sanitizes a degree measure as a floating-point number.
 *
 * @return a degree measure between 0.0 (inclusive) and 360.0
 * (exclusive).
 */
export declare function sanitizeDegreesDouble(degrees: number): number;
/**
 * Sign of direction change needed to travel from one angle to
 * another.
 *
 * For angles that are 180 degrees apart from each other, both
 * directions have the same travel distance, so either direction is
 * shortest. The value 1.0 is returned in this case.
 *
 * @param from The angle travel starts from, in degrees.
 * @param to The angle travel ends at, in degrees.
 * @return -1 if decreasing from leads to the shortest travel
 * distance, 1 if increasing from leads to the shortest travel
 * distance.
 */
export declare function rotationDirection(from: number, to: number): number;
/**
 * Distance of two points on a circle, represented using degrees.
 */
export declare function differenceDegrees(a: number, b: number): number;
/**
 * Multiplies a 1x3 row vector with a 3x3 matrix.
 */
export declare function matrixMultiply(row: number[], matrix: number[][]): number[];
/**
 * Utility methods for hexadecimal representations of colors.
 */
/**
 * @param argb ARGB representation of a color.
 * @return Hex string representing color, ex. #ff0000 for red.
 */
export declare function hexFromArgb(argb: number): string;
/**
 * @param hex String representing color as hex code. Accepts strings with or
 *     without leading #, and string representing the color using 3, 6, or 8
 *     hex characters.
 * @return ARGB representation of color.
 */
export declare function argbFromHex(hex: string): number;
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
    schemes: {
        light: Scheme;
        dark: Scheme;
    };
    palettes: {
        primary: TonalPalette;
        secondary: TonalPalette;
        tertiary: TonalPalette;
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
export declare function themeFromSourceColor(source: number, customColors?: CustomColor[]): Theme;
/**
 * Generate a theme from an image source
 *
 * @param image Image element
 * @param customColors Array of custom colors
 * @return Theme object
 */
export declare function themeFromImage(image: HTMLImageElement, customColors?: CustomColor[]): Promise<Theme>;
/**
 * Generate custom color group from source and target color
 *
 * @param source Source color
 * @param color Custom color
 * @return Custom color group
 *
 * @link https://m3.material.io/styles/color/the-color-system/color-roles
 */
export declare function customColor(source: number, color: CustomColor): CustomColorGroup;
/**
 * Apply a theme to an element
 *
 * @param theme Theme object
 * @param options Options
 */
export declare function applyTheme(theme: Theme, options?: {
    dark?: boolean;
    target?: HTMLElement;
    brightnessSuffix?: boolean;
    paletteTones?: number[];
}): void;
export declare function setSchemeProperties(target: HTMLElement, scheme: Scheme, suffix?: string): void;
export {};
