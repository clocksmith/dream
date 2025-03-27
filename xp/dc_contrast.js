/**
 * @file dc_contrast.js
 * @module dc_contrast
 * @description
 * This file defines classes related to contrast calculations within the
 * dynamic color library, including ContrastCurve for defining contrast
 * requirements and Contrast for utility functions to calculate contrast ratios.
 * @requires module:dc_core
 */

import { mathUtils, colorUtils } from './dc_core.js';

/**
 * A curve that defines contrast requirements for two colors.
 */
class ContrastCurve {
    /**
     * Creates a new contrast curve.
     *
     * @param {number} low - Contrast for low contrast level (-1.0)
     * @param {number} normal - Contrast for normal contrast level (0.0)
     * @param {number} medium - Contrast for medium contrast level (0.5)
     * @param {number} high - Contrast for high contrast level (1.0)
     */
    constructor(low, normal, medium, high) {
        this.low = low;
        this.normal = normal;
        this.medium = medium;
        this.high = high;
    }

    /**
     * Gets the contrast ratio for a given contrast level.
     *
     * @param {number} contrastLevel - Contrast level (-1.0 to 1.0)
     * @return {number} - Contrast ratio
     */
    get = (contrastLevel) => {
        if (contrastLevel <= -1) {
            return this.low;
        } else if (contrastLevel < 0) {
            return mathUtils.lerp(this.low, this.normal, (contrastLevel + 1) / 1);
        } else if (contrastLevel < 0.5) {
            return mathUtils.lerp(this.normal, this.medium, contrastLevel / 0.5);
        } else if (contrastLevel < 1) {
            return mathUtils.lerp(this.medium, this.high, (contrastLevel - 0.5) / 0.5);
        } else {
            return this.high;
        }
    }
}

/**
 * Utility class for calculating contrast between colors.
 */
class Contrast {
    /**
     * Calculates the contrast ratio between two tones.
     *
     * @param {number} toneA - First tone (L* value, 0-100)
     * @param {number} toneB - Second tone (L* value, 0-100)
     * @return {number} - Contrast ratio (1-21)
     */
    static ratioOfTones = (toneA, toneB) => {
        toneA = mathUtils.clampDouble(0, 100, toneA);
        toneB = mathUtils.clampDouble(0, 100, toneB);
        return Contrast.ratioOfYs(colorUtils.yFromLstar(toneA), colorUtils.yFromLstar(toneB));
    };

    /**
     * Calculates the contrast ratio between two Y values.
     *
     * @param {number} y1 - First Y value
     * @param {number} y2 - Second Y value
     * @return {number} - Contrast ratio (1-21)
     */
    static ratioOfYs = (y1, y2) => {
        const lighter = y1 > y2 ? y1 : y2;
        const darker = lighter === y2 ? y1 : y2;
        return (lighter + 5) / (darker + 5);
    };

    /**
     * Finds a tone lighter than the input tone that meets the contrast ratio.
     *
     * @param {number} tone - Input tone (L* value, 0-100)
     * @param {number} ratio - Target contrast ratio
     * @return {number} - Lighter tone, or -1 if not achievable
     */
    static lighter = (tone, ratio) => {
        if (tone < 0 || tone > 100) return -1;

        const darkY = colorUtils.yFromLstar(tone);
        const lightY = ratio * (darkY + 5) - 5;

        const realContrast = Contrast.ratioOfYs(lightY, darkY);
        const delta = Math.abs(realContrast - ratio);

        if (realContrast < ratio && delta > 0.04) return -1;

        // Add a small buffer to avoid floating-point errors
        const resultTone = colorUtils.lstarFromY(lightY) + 0.4;
        return (resultTone < 0 || resultTone > 100) ? -1 : resultTone;
    };

    /**
     * Finds a tone darker than the input tone that meets the contrast ratio.
     *
     * @param {number} tone - Input tone (L* value, 0-100)
     * @param {number} ratio - Target contrast ratio
     * @return {number} - Darker tone, or -1 if not achievable
     */
    static darker = (tone, ratio) => {
        if (tone < 0 || tone > 100) return -1;

        const lightY = colorUtils.yFromLstar(tone);
        const darkY = (lightY + 5) / ratio - 5;

        const realContrast = Contrast.ratioOfYs(lightY, darkY);
        const delta = Math.abs(realContrast - ratio);

        if (realContrast < ratio && delta > 0.04) return -1;

        // Subtract a small buffer to avoid floating-point errors
        const resultTone = colorUtils.lstarFromY(darkY) - 0.4;
        return (resultTone < 0 || resultTone > 100) ? -1 : resultTone;
    };

    /**
     * Finds a tone lighter than the input tone that meets the contrast ratio,
     * falling back to 100 if not achievable.
     *
     * @param {number} tone - Input tone (L* value, 0-100)
     * @param {number} ratio - Target contrast ratio
     * @return {number} - Lighter tone
     */
    static lighterUnsafe = (tone, ratio) => {
        const lighterSafe = Contrast.lighter(tone, ratio);
        return (lighterSafe < 0.0) ? 100.0 : lighterSafe;
    };

    /**
     * Finds a tone darker than the input tone that meets the contrast ratio,
     * falling back to 0 if not achievable.
     *
     * @param {number} tone - Input tone (L* value, 0-100)
     * @return {number} - Darker tone
     */
    static darkerUnsafe = (tone, ratio) => {
        const darkerSafe = Contrast.darker(tone, ratio);
        return (darkerSafe < 0.0) ? 0.0 : darkerSafe;
    };
}

export {
    ContrastCurve,
    Contrast
};