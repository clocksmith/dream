
/**
 * @file dc_core.js
 * @module dc_core
 * @description
 * This file provides essential core utility functions for the dynamic color library.
 * It includes mathematical operations, hexadecimal color conversions, and core
 * color science utilities. This module has no dependencies on other modules
 * within this library.
 */

/**
 * Utility methods for mathematical operations.
 */
const mathUtils = {
    /**
     * Returns the sign of a number: -1, 0, or 1.
     *
     * @param {number} num - Number to get sign of
     * @return {number} - Sign of the number
     */
    signum: (num) => num < 0 ? -1 : (num > 0 ? 1 : 0),

    /**
     * Linear interpolation between two values.
     *
     * @param {number} start - Start value
     * @param {number} stop - End value
     * @param {number} amount - Interpolation factor (0.0 to 1.0)
     * @return {number} - Interpolated value
     */
    lerp: (start, stop, amount) => (1.0 - amount) * start + amount * stop,

    /**
     * Clamps an integer value to a given range.
     *
     * @param {number} min - Minimum value
     * @param {number} max - Maximum value
     * @param {number} input - Value to clamp
     * @return {number} - Clamped value
     */
    clampInt: (min, max, input) => Math.min(max, Math.max(min, input)),

    /**
     * Clamps a floating-point value to a given range.
     *
     * @param {number} min - Minimum value
     * @param {number} max - Maximum value
     * @param {number} input - Value to clamp
     * @return {number} - Clamped value
     */
    clampDouble: (min, max, input) => Math.min(max, Math.max(min, input)),

    /**
     * Normalizes a degree value to 0 to 360 range (excluding 360).
     *
     * @param {number} degrees - Angle in degrees
     * @return {number} - Normalized angle in degrees
     */
    sanitizeDegreesInt: (degrees) => {
        degrees %= 360;
        return degrees < 0 ? degrees + 360 : degrees;
    },

    /**
     * Normalizes a floating-point degree value to 0 to 360 range (excluding 360).
     *
     * @param {number} degrees - Angle in degrees
     * @return {number} - Normalized angle in degrees
     */
    sanitizeDegreesDouble: (degrees) => {
        degrees %= 360.0;
        return degrees < 0 ? degrees + 360.0 : degrees;
    },

    /**
     * Determines the rotation direction for the shortest distance between angles.
     *
     * @param {number} from - Start angle in degrees
     * @param {number} to - End angle in degrees
     * @return {number} - Direction of rotation (1.0 for clockwise, -1.0 for counterclockwise)
     */
    rotationDirection: (from, to) => {
        const diff = mathUtils.sanitizeDegreesDouble(to - from);
        return diff <= 180.0 ? 1.0 : -1.0;
    },

    /**
     * Calculates the angular distance between two angles.
     *
     * @param {number} a - First angle in degrees
     * @param {number} b - Second angle in degrees
     * @return {number} - Distance in degrees (0 to 180)
     */
    differenceDegrees: (a, b) => 180.0 - Math.abs(Math.abs(a - b) - 180.0),

    /**
     * Multiplies a row vector by a matrix.
     *
     * @param {number[]} row - Row vector
     * @param {number[][]} matrix - Matrix
     * @return {number[]} - Resulting vector
     */
    matrixMultiply: (row, matrix) => {
        const a = row[0] * matrix[0][0] + row[1] * matrix[0][1] + row[2] * matrix[0][2];
        const b = row[0] * matrix[1][0] + row[1] * matrix[1][1] + row[2] * matrix[1][2];
        const c = row[0] * matrix[2][0] + row[1] * matrix[2][1] + row[2] * matrix[2][2];
        return [a, b, c];
    }
};

/**
 * Utility methods for hexadecimal representations of colors.
 */
const hexUtils = {
    /**
     * Converts an ARGB color to a hex string.
     *
     * @param {number} argb - Color in ARGB format
     * @return {string} - Hex string in the format "#RRGGBB"
     */
    hexFromArgb: (argb) => {
        const r = colorUtils.redFromArgb(argb);
        const g = colorUtils.greenFromArgb(argb);
        const b = colorUtils.blueFromArgb(argb);
        const parts = [
            r.toString(16),
            g.toString(16),
            b.toString(16)
        ].map(part => part.length === 1 ? '0' + part : part);

        return '#' + parts.join('');
    },

    /**
     * Converts a hex string to an ARGB color.
     *
     * @param {string} hex - Hex string (with or without leading #)
     * @return {number} - Color in ARGB format
     */
    argbFromHex: (hex) => {
        hex = hex.replace('#', '');
        let r, g, b;
        const parseHex = (val) => parseInt(val, 16);

        switch (hex.length) {
            case 3:
                r = parseHex(hex[0].repeat(2));
                g = parseHex(hex[1].repeat(2));
                b = parseHex(hex[2].repeat(2));
                break;

            case 6:
                r = parseHex(hex.slice(0, 2));
                g = parseHex(hex.slice(2, 4));
                b = parseHex(hex.slice(4, 6));
                break;

            case 8:
                r = parseHex(hex.slice(2, 4));
                g = parseHex(hex.slice(4, 6));
                b = parseHex(hex.slice(6, 8));
                break;

            default:
                throw new Error('unexpected hex ' + hex);
        }

        return ((255 << 24) | ((r & 0xff) << 16) | ((g & 0xff) << 8) | (b & 0xff)) >>> 0;
    }
};

/**
 * Color science utilities.
 */
const colorUtils = {
    // Standard matrices for color space conversions
    SRGB_TO_XYZ: [
        [0.41233895, 0.35762064, 0.18051042],
        [0.2126, 0.7152, 0.0722],
        [0.01932141, 0.11916382, 0.95034478]
    ],

    XYZ_TO_SRGB: [
        [3.2413774792388685, -1.5376652402851851, -0.49885366846268053],
        [-0.9691452513005321, 1.8758853451067872, 0.04156585616912061],
        [0.05562093689691305, -0.20395524564742123, 1.0571799111220335]
    ],

    // D65 white point reference values
    WHITE_POINT_D65: [95.047, 100.0, 108.883],

    /**
     * Creates an ARGB color from RGB values.
     *
     * @param {number} r - Red component (0-255)
     * @param {number} g - Green component (0-255)
     * @param {number} b - Blue component (0-255)
     * @return {number} - Color in ARGB format
     */
    argbFromRgb: (r, g, b) => (255 << 24 | (r & 255) << 16 | (g & 255) << 8 | b & 255) >>> 0,

    /**
     * Creates an ARGB color from linear RGB values.
     *
     * @param {number[]} linrgb - Linear RGB values (0-100)
     * @return {number} - Color in ARGB format
     */
    argbFromLinrgb: (linrgb) => {
        const r = colorUtils.delinearized(linrgb[0]);
        const g = colorUtils.delinearized(linrgb[1]);
        const b = colorUtils.delinearized(linrgb[2]);
        return colorUtils.argbFromRgb(r, g, b);
    },

    /**
     * Extracts the alpha component from an ARGB color.
     *
     * @param {number} argb - Color in ARGB format
     * @return {number} - Alpha component (0-255)
     */
    alphaFromArgb: (argb) => argb >> 24 & 255,

    /**
     * Extracts the red component from an ARGB color.
     *
     * @param {number} argb - Color in ARGB format
     * @return {number} - Red component (0-255)
     */
    redFromArgb: (argb) => argb >> 16 & 255,

    /**
     * Extracts the green component from an ARGB color.
     *
     * @param {number} argb - Color in ARGB format
     * @return {number} - Green component (0-255)
     */
    greenFromArgb: (argb) => argb >> 8 & 255,

    /**
     * Extracts the blue component from an ARGB color.
     *
     * @param {number} argb - Color in ARGB format
     * @return {number} - Blue component (0-255)
     */
    blueFromArgb: (argb) => argb & 255,

    /**
     * Checks if a color is fully opaque.
     *
     * @param {number} argb - Color in ARGB format
     * @return {boolean} - Whether the color is fully opaque
     */
    isOpaque: (argb) => colorUtils.alphaFromArgb(argb) >= 255,

    /**
     * Creates an ARGB color from XYZ coordinates.
     *
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @param {number} z - Z coordinate
     * @return {number} - Color in ARGB format
     */
    argbFromXyz: (x, y, z) => {
        const matrix = colorUtils.XYZ_TO_SRGB;
        const linearR = matrix[0][0] * x + matrix[0][1] * y + matrix[0][2] * z;
        const linearG = matrix[1][0] * x + matrix[1][1] * y + matrix[1][2] * z;
        const linearB = matrix[2][0] * x + matrix[2][1] * y + matrix[2][2] * z;
        const r = colorUtils.delinearized(linearR);
        const g = colorUtils.delinearized(linearG);
        const b = colorUtils.delinearized(linearB);
        return colorUtils.argbFromRgb(r, g, b);
    },

    /**
     * Converts an ARGB color to XYZ coordinates.
     *
     * @param {number} argb - Color in ARGB format
     * @return {number[]} - XYZ coordinates
     */
    xyzFromArgb: (argb) => {
        const r = colorUtils.linearized(colorUtils.redFromArgb(argb));
        const g = colorUtils.linearized(colorUtils.greenFromArgb(argb));
        const b = colorUtils.linearized(colorUtils.blueFromArgb(argb));
        return mathUtils.matrixMultiply([r, g, b], colorUtils.SRGB_TO_XYZ);
    },

    /**
     * Creates an ARGB color from CIE Lab coordinates.
     *
     * @param {number} l - L* coordinate
     * @param {number} a - a* coordinate
     * @param {number} b - b* coordinate
     * @return {number} - Color in ARGB format
     */
    argbFromLab: (l, a, b) => {
        const whitePoint = colorUtils.WHITE_POINT_D65;

        // L* to Y
        const fy = (l + 16.0) / 116.0;

        // a* and b* to X and Z
        const fx = a / 500.0 + fy;
        const fz = fy - b / 200.0;

        const xNormalized = colorUtils.labInvf(fx);
        const yNormalized = colorUtils.labInvf(fy);
        const zNormalized = colorUtils.labInvf(fz);

        // Denormalize with white point
        const x = xNormalized * whitePoint[0];
        const y = yNormalized * whitePoint[1];
        const z = zNormalized * whitePoint[2];

        return colorUtils.argbFromXyz(x, y, z);
    },

    /**
     * Converts an ARGB color to CIE Lab coordinates.
     *
     * @param {number} argb - Color in ARGB format
     * @return {number[]} - Lab coordinates [L*, a*, b*]
     */
    labFromArgb: (argb) => {
        // Convert to linear RGB
        const linearR = colorUtils.linearized(colorUtils.redFromArgb(argb));
        const linearG = colorUtils.linearized(colorUtils.greenFromArgb(argb));
        const linearB = colorUtils.linearized(colorUtils.blueFromArgb(argb));

        // Convert to XYZ
        const matrix = colorUtils.SRGB_TO_XYZ;
        const x = matrix[0][0] * linearR + matrix[0][1] * linearG + matrix[0][2] * linearB;
        const y = matrix[1][0] * linearR + matrix[1][1] * linearG + matrix[1][2] * linearB;
        const z = matrix[2][0] * linearR + matrix[2][1] * linearG + matrix[2][2] * linearB;

        // Normalize by white point
        const whitePoint = colorUtils.WHITE_POINT_D65;
        const xNormalized = x / whitePoint[0];
        const yNormalized = y / whitePoint[1];
        const zNormalized = z / whitePoint[2];

        // XYZ to Lab
        const fx = colorUtils.labF(xNormalized);
        const fy = colorUtils.labF(yNormalized);
        const fz = colorUtils.labF(zNormalized);

        const l = 116.0 * fy - 16;
        const a = 500.0 * (fx - fy);
        const b = 200.0 * (fy - fz);

        return [l, a, b];
    },

    /**
     * Creates an ARGB color with the specified L* value (grayscale).
     *
     * @param {number} lstar - L* value (0-100)
     * @return {number} - Color in ARGB format
     */
    argbFromLstar: (lstar) => {
        const y = colorUtils.yFromLstar(lstar);
        const component = colorUtils.delinearized(y);
        return colorUtils.argbFromRgb(component, component, component);
    },

    /**
     * Calculates the L* value for an ARGB color.
     *
     * @param {number} argb - Color in ARGB format
     * @return {number} - L* value (0-100)
     */
    lstarFromArgb: (argb) => {
        const y = colorUtils.xyzFromArgb(argb)[1];
        return 116.0 * colorUtils.labF(y / 100.0) - 16.0;
    },

    /**
     * Converts L* to Y.
     *
     * @param {number} lstar - L* value (0-100)
     * @return {number} - Y value (0-100)
     */
    yFromLstar: (lstar) => 100.0 * colorUtils.labInvf((lstar + 16.0) / 116.0),

    /**
     * Converts Y to L*.
     *
     * @param {number} y - Y value (0-100)
     * @return {number} - L* value (0-100)
     */
    lstarFromY: (y) => colorUtils.labF(y / 100.0) * 116.0 - 16.0,

    /**
     * Linearizes an sRGB component.
     *
     * @param {number} rgbComponent - sRGB component (0-255)
     * @return {number} - Linear component (0-100)
     */
    linearized: (rgbComponent) => {
        const normalized = rgbComponent / 255.0;

        if (normalized <= 0.040449936) {
            return normalized / 12.92 * 100.0;
        } else {
            return Math.pow((normalized + 0.055) / 1.055, 2.4) * 100.0;
        }
    },

    /**
     * Delinearizes a linear RGB component to sRGB.
     *
     * @param {number} rgbComponent - Linear component (0-100)
     * @return {number} - sRGB component (0-255)
     */
    delinearized: (rgbComponent) => {
        const normalized = rgbComponent / 100.0;
        let delinearizedVal;

        if (normalized <= 0.0031308) {
            delinearizedVal = normalized * 12.92;
        } else {
            delinearizedVal = 1.055 * Math.pow(normalized, 1.0 / 2.4) - 0.055;
        }

        return mathUtils.clampInt(0, 255, Math.round(delinearizedVal * 255.0));
    },

    /**
     * Gets the D65 white point.
     *
     * @return {number[]} - XYZ values for the D65 white point
     */
    whitePointD65: () => colorUtils.WHITE_POINT_D65,

    /**
     * Helper function for LAB conversion.
     *
     * @param {number} t - Input value
     * @return {number} - Converted value
     */
    labF: (t) => {
        const e = 216.0 / 24389.0;
        const kappa = 24389.0 / 27.0;

        if (t > e) {
            return Math.pow(t, 1.0 / 3.0);
        } else {
            return (kappa * t + 16) / 116;
        }
    },

    /**
     * Inverse of labF.
     *
     * @param {number} ft - Input value
     * @return {number} - Converted value
     */
    labInvf: (ft) => {
        const e = 216.0 / 24389.0;
        const kappa = 24389.0 / 27.0;
        const ft3 = ft * ft * ft;

        if (ft3 > e) {
            return ft3;
        } else {
            return (116 * ft - 16) / kappa;
        }
    }
};


export {
    mathUtils,
    hexUtils,
    colorUtils
};