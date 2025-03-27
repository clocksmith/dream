/**
 * @file dc_scheme.js
 * @module dc_scheme
 * @description
 * This file defines the DynamicScheme class, which encapsulates the configuration
 * for a dynamic color scheme, such as light/dark mode and contrast level.
 * It also includes utility functions to check for Monochrome and Fidelity schemes.
 * @requires module:dc_core
 * @requires module:dc_palettes
 */

import { CorePalette } from './dc_palettes.js';
import { Hct } from './dc_color.js';

/**
 * Checks if the scheme is monochrome.
 *
 * @param {DynamicScheme} scheme - Dynamic scheme
 * @return {boolean} - True if monochrome, false otherwise
 */
const isMonochrome = (scheme) => scheme.primaryPalette === scheme.neutralPalette;

/**
 * Checks if the scheme is fidelity.
 *
 * @param {DynamicScheme} scheme - Dynamic scheme
 * @return {boolean} - True if fidelity, false otherwise
 */
const isFidelity = (scheme) => scheme.secondaryPalette === scheme.neutralVariantPalette;


/**
 * A DynamicScheme represents a color scheme configuration, including
 * light/dark mode and contrast level.
 */
class DynamicScheme {
    /**
     * @param {number} sourceColor - Source color for the scheme (ARGB)
     * @param {boolean} isDark - Whether it's a dark mode scheme
     * @param {number} contrastLevel - Contrast level (-1 to 1)
     * @param {CorePalette} primaryPalette - Primary core palette
     * @param {CorePalette} secondaryPalette - Secondary core palette
     * @param {CorePalette} tertiaryPalette - Tertiary core palette
     * @param {CorePalette} neutralPalette - Neutral core palette
     * @param {CorePalette} neutralVariantPalette - Neutral variant core palette
     * @param {Hct} sourceColorHct - Source color in HCT representation
     */
    constructor(
        sourceColor,
        isDark,
        contrastLevel,
        primaryPalette,
        secondaryPalette,
        tertiaryPalette,
        neutralPalette,
        neutralVariantPalette,
        sourceColorHct
    ) {
        this.sourceColor = sourceColor;
        this.isDark = isDark;
        this.contrastLevel = contrastLevel;
        this.primaryPalette = primaryPalette;
        this.secondaryPalette = secondaryPalette;
        this.tertiaryPalette = tertiaryPalette;
        this.neutralPalette = neutralPalette;
        this.neutralVariantPalette = neutralVariantPalette;
        this.sourceColorHct = sourceColorHct;
    }
}

export {
    DynamicScheme,
    isMonochrome,
    isFidelity,
};
