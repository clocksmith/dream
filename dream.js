/**
 * @file main.js
 * @module DynamicColor
 * @description
 * Consolidated library for Material Dynamic Color generation and manipulation.
 * Includes core utilities, color representations (HCT, CAM16), contrast calculation,
 * palettes, schemes, quantization, and theme generation/application.
 */

/**
 * @section Core Utilities
 * @description Essential mathematical, hexadecimal, and color science utilities.
 */

/**
 * Utility methods for mathematical operations.
 * @namespace mathUtils
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
 * @namespace hexUtils
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

            case 8: // Allow AARRGGBB format, but ignore alpha
                r = parseHex(hex.slice(2, 4));
                g = parseHex(hex.slice(4, 6));
                b = parseHex(hex.slice(6, 8));
                break;

            default:
                throw new Error('Unexpected hex string format: ' + hex);
        }

        // Always return fully opaque ARGB
        return ((255 << 24) | ((r & 0xff) << 16) | ((g & 0xff) << 8) | (b & 0xff)) >>> 0;
    }
};

/**
 * Color science utilities.
 * @namespace colorUtils
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
     * Creates an ARGB color from RGB values (assuming full opacity).
     *
     * @param {number} r - Red component (0-255)
     * @param {number} g - Green component (0-255)
     * @param {number} b - Blue component (0-255)
     * @return {number} - Color in ARGB format
     */
    argbFromRgb: (r, g, b) => (255 << 24 | (r & 255) << 16 | (g & 255) << 8 | b & 255) >>> 0,

    /**
     * Creates an ARGB color from linear RGB values (assuming full opacity).
     *
     * @param {number[]} linrgb - Linear RGB values (0-100 for each component)
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
    alphaFromArgb: (argb) => (argb >> 24) & 255,

    /**
     * Extracts the red component from an ARGB color.
     *
     * @param {number} argb - Color in ARGB format
     * @return {number} - Red component (0-255)
     */
    redFromArgb: (argb) => (argb >> 16) & 255,

    /**
     * Extracts the green component from an ARGB color.
     *
     * @param {number} argb - Color in ARGB format
     * @return {number} - Green component (0-255)
     */
    greenFromArgb: (argb) => (argb >> 8) & 255,

    /**
     * Extracts the blue component from an ARGB color.
     *
     * @param {number} argb - Color in ARGB format
     * @return {number} - Blue component (0-255)
     */
    blueFromArgb: (argb) => argb & 255,

    /**
     * Checks if a color is fully opaque (alpha is 255).
     *
     * @param {number} argb - Color in ARGB format
     * @return {boolean} - Whether the color is fully opaque
     */
    isOpaque: (argb) => colorUtils.alphaFromArgb(argb) >= 255,

    /**
     * Creates an ARGB color from XYZ coordinates (assuming full opacity).
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
     * @return {number[]} - XYZ coordinates [X, Y, Z]
     */
    xyzFromArgb: (argb) => {
        const r = colorUtils.linearized(colorUtils.redFromArgb(argb));
        const g = colorUtils.linearized(colorUtils.greenFromArgb(argb));
        const b = colorUtils.linearized(colorUtils.blueFromArgb(argb));
        return mathUtils.matrixMultiply([r, g, b], colorUtils.SRGB_TO_XYZ);
    },

    /**
     * Creates an ARGB color from CIE Lab coordinates (assuming full opacity).
     *
     * @param {number} l - L* coordinate (Lightness)
     * @param {number} a - a* coordinate (Green-Red axis)
     * @param {number} b - b* coordinate (Blue-Yellow axis)
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
     * Creates an ARGB color with the specified L* value (grayscale, full opacity).
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
     * Calculates the L* value (lightness) for an ARGB color.
     *
     * @param {number} argb - Color in ARGB format
     * @return {number} - L* value (0-100)
     */
    lstarFromArgb: (argb) => {
        // Extract Y from XYZ conversion
        const y = colorUtils.xyzFromArgb(argb)[1];
        // Convert Y to L*
        return 116.0 * colorUtils.labF(y / 100.0) - 16.0;
    },

    /**
     * Converts L* (lightness) to Y (relative luminance).
     * Y refers to the Y component of the XYZ color space.
     * L* ranges from 0 to 100. Y ranges from 0 to 100.
     *
     * @param {number} lstar - L* value (0-100)
     * @return {number} - Y value (0-100)
     */
    yFromLstar: (lstar) => 100.0 * colorUtils.labInvf((lstar + 16.0) / 116.0),

    /**
     * Converts Y (relative luminance) to L* (lightness).
     * Y refers to the Y component of the XYZ color space.
     * L* ranges from 0 to 100. Y ranges from 0 to 100.
     *
     * @param {number} y - Y value (0-100)
     * @return {number} - L* value (0-100)
     */
    lstarFromY: (y) => colorUtils.labF(y / 100.0) * 116.0 - 16.0,

    /**
     * Linearizes an sRGB component (0-255) to a linear value (0-100).
     *
     * @param {number} rgbComponent - sRGB component (0-255)
     * @return {number} - Linear component (0-100)
     */
    linearized: (rgbComponent) => {
        const normalized = rgbComponent / 255.0;

        if (normalized <= 0.040449936) {
            return normalized / 12.92 * 100.0;
        } else {
            // Use Math.pow for exponentiation
            return Math.pow((normalized + 0.055) / 1.055, 2.4) * 100.0;
        }
    },

    /**
     * Delinearizes (applies gamma correction) a linear RGB component (0-100) back to sRGB (0-255).
     *
     * @param {number} rgbComponent - Linear component (0-100)
     * @return {number} - sRGB component (0-255), clamped and rounded
     */
    delinearized: (rgbComponent) => {
        const normalized = rgbComponent / 100.0;
        let delinearizedVal;

        if (normalized <= 0.0031308) {
            delinearizedVal = normalized * 12.92;
        } else {
            // Use Math.pow for exponentiation
            delinearizedVal = 1.055 * Math.pow(normalized, 1.0 / 2.4) - 0.055;
        }

        // Clamp and round the result to the 0-255 range
        return mathUtils.clampInt(0, 255, Math.round(delinearizedVal * 255.0));
    },

    /**
     * Gets the D65 white point in XYZ coordinates.
     *
     * @return {number[]} - XYZ values for the D65 white point [X, Y, Z]
     */
    whitePointD65: () => [...colorUtils.WHITE_POINT_D65], // Return a copy

    /**
     * Helper function for Lab conversion (forward transformation).
     * Maps XYZ components to nonlinear perceptual values.
     *
     * @param {number} t - Normalized XYZ component (e.g., X/Xn, Y/Yn, Z/Zn)
     * @return {number} - Corresponding f(t) value used in Lab calculation
     */
    labF: (t) => {
        const e = 216.0 / 24389.0; // (6/29)^3
        const kappa = 24389.0 / 27.0; // (29/3)^3

        if (t > e) {
            return Math.pow(t, 1.0 / 3.0);
        } else {
            return (kappa * t + 16) / 116;
        }
    },

    /**
     * Inverse of labF (inverse transformation).
     * Maps nonlinear perceptual values back towards XYZ components.
     *
     * @param {number} ft - f(t) value (e.g., fx, fy, fz from Lab calculation)
     * @return {number} - Corresponding t value (normalized XYZ component)
     */
    labInvf: (ft) => {
        const e = 216.0 / 24389.0; // (6/29)^3
        const kappa = 24389.0 / 27.0; // (29/3)^3
        const ft3 = ft * ft * ft; // ft^3

        if (ft3 > e) {
            return ft3;
        } else {
            return (116 * ft - 16) / kappa;
        }
    }
};

/**
 * @section Color Representation (HCT, CAM16)
 * @description Classes for HCT (Hue, Chroma, Tone) and CAM16 color appearance models.
 */

/**
 * Defines the standard viewing conditions for CAM16.
 */
class ViewingConditions {
    /**
     * @param {number} n - Background luminance factor
     * @param {number} aw - Adapted white point luminance
     * @param {number} nbb - Background induction factor
     * @param {number} ncb - Chromatic induction factor
     * @param {number} c - Surround impact factor
     * @param {number} nc - Color induction factor
     * @param {number[]} rgbD - Discounted RGB factors
     * @param {number} fl - Luminance adaptation factor
     * @param {number} fLRoot - Square root of FL
     * @param {number} z - Luminance adaptation exponent
     */
    constructor(n, aw, nbb, ncb, c, nc, rgbD, fl, fLRoot, z) {
        this.n = n;
        this.aw = aw;
        this.nbb = nbb;
        this.ncb = ncb;
        this.c = c;
        this.nc = nc;
        this.rgbD = rgbD;
        this.fl = fl;
        this.fLRoot = fLRoot;
        this.z = z;
    }

    /**
     * Creates standard sRGB viewing conditions.
     * @return {ViewingConditions} Standard viewing conditions.
     */
    static make(
        whitePoint = colorUtils.whitePointD65(),
        adaptingLuminance = (200.0 / Math.PI) * colorUtils.yFromLstar(50.0) / 100.0,
        backgroundLstar = 50.0,
        surround = 2.0, // Average surround
        discountingIlluminant = false
    ) {
        const matrix = colorUtils.XYZ_TO_SRGB;
        const xyz = whitePoint;
        const rW = xyz[0] * matrix[0][0] + xyz[1] * matrix[0][1] + xyz[2] * matrix[0][2];
        const gW = xyz[0] * matrix[1][0] + xyz[1] * matrix[1][1] + xyz[2] * matrix[1][2];
        const bW = xyz[0] * matrix[2][0] + xyz[1] * matrix[2][1] + xyz[2] * matrix[2][2];

        const n = (surround === 1.0) ? 1.0 : (surround === 0.0) ? 0.0 : (0.8 + surround / 10.0);
        const f = (n >= 0.9) ? mathUtils.lerp(0.59, 0.69, (n - 0.9) * 10.0) : mathUtils.lerp(0.525, 0.59, (n - 0.8) * 10.0);

        let c = f; // Surround impact factor
        let nc = f; // Color induction factor

        let rgbD = discountingIlluminant ?
            [1.0, 1.0, 1.0] :
            [
                1000.0 / (rW + 27.13),
                1000.0 / (gW + 27.13),
                1000.0 / (bW + 27.13)
            ];

        const k = 1.0 / (5.0 * adaptingLuminance + 1.0);
        const k4 = k * k * k * k;
        const k4_1 = 1.0 - k4;

        const fl = (k4 * adaptingLuminance) + (0.1 * k4_1 * k4_1 * Math.pow(5.0 * adaptingLuminance, 1.0 / 3.0));
        const nbb = 0.725 / Math.pow(n, 0.2); // Background induction factor
        const ncb = nbb; // Chromatic induction factor (assumed same as background)

        const rgbAFactors = [
            Math.pow(fl * rgbD[0] * rW / 100.0, 0.42),
            Math.pow(fl * rgbD[1] * gW / 100.0, 0.42),
            Math.pow(fl * rgbD[2] * bW / 100.0, 0.42)
        ];

        const rgbA = [
            (400.0 * rgbAFactors[0]) / (rgbAFactors[0] + 27.13),
            (400.0 * rgbAFactors[1]) / (rgbAFactors[1] + 27.13),
            (400.0 * rgbAFactors[2]) / (rgbAFactors[2] + 27.13)
        ];

        const aw = (2.0 * rgbA[0] + rgbA[1] + 0.05 * rgbA[2]) * nbb;
        const z = 1.48 + Math.sqrt(n);
        const fLRoot = Math.pow(fl, 0.25);

        return new ViewingConditions(n, aw, nbb, ncb, c, nc, rgbD, fl, fLRoot, z);
    }

    /** Default viewing conditions instance. */
    static DEFAULT = ViewingConditions.make();
}


/**
 * CAM16 color appearance model implementation.
 * Represents color in terms of hue, chroma, lightness (J),
 * brightness (Q), colorfulness (M), and saturation (S).
 */
class Cam16 {
    /** Hue angle in degrees (0-360). */
    hue;
    /** Chroma (color intensity). */
    chroma;
    /** Lightness (perceived brightness relative to white). */
    j;
    /** Brightness (absolute perceived brightness). */
    q;
    /** Colorfulness (absolute chroma). */
    colorfulness; // M
    /** Saturation (color intensity relative to brightness). */
    saturation; // S
    /** CAM16-UCS lightness coordinate. */
    jStar;
    /** CAM16-UCS a* coordinate (red-green axis). */
    aStar;
    /** CAM16-UCS b* coordinate (yellow-blue axis). */
    bStar;

    /**
     * @param {number} hue
     * @param {number} chroma
     * @param {number} j
     * @param {number} q
     * @param {number} colorfulness
     * @param {number} saturation
     * @param {number} jStar
     * @param {number} aStar
     * @param {number} bStar
     * @hideconstructor
     */
    constructor(hue, chroma, j, q, colorfulness, saturation, jStar, aStar, bStar) {
        this.hue = hue;
        this.chroma = chroma;
        this.j = j;
        this.q = q;
        this.colorfulness = colorfulness;
        this.saturation = saturation;
        this.jStar = jStar;
        this.aStar = aStar;
        this.bStar = bStar;
    }

    /**
     * Creates a CAM16 color from an ARGB integer using default viewing conditions.
     * @param {number} argb ARGB color value.
     * @return {Cam16} CAM16 representation.
     */
    static fromInt(argb) {
        return Cam16.fromIntInViewingConditions(argb, ViewingConditions.DEFAULT);
    }

    /**
     * Creates a CAM16 color from HCT components using default viewing conditions.
     * @param {number} hue Hue angle (0-360).
     * @param {number} chroma Chroma value.
     * @param {number} tone Tone (lightness L*, 0-100).
     * @return {Cam16} CAM16 representation.
     */
    static fromJch(j, c, h) {
        return Cam16.fromJchInViewingConditions(j, c, h, ViewingConditions.DEFAULT);
    }

    /**
     * Creates a CAM16 color from HCT components using specified viewing conditions.
     * @param {number} j Lightness J.
     * @param {number} c Chroma C.
     * @param {number} h Hue angle h (0-360).
     * @param {ViewingConditions} viewingConditions Custom viewing conditions.
     * @return {Cam16} CAM16 representation.
     */
    static fromJchInViewingConditions(j, c, h, viewingConditions) {
        if (j < 1e-9 || c < 1e-9) { // Handle black/achromatic case
            return Cam16.fromIntInViewingConditions(colorUtils.argbFromLstar(j), viewingConditions);
        }

        const hueRadians = h * Math.PI / 180.0;
        const q = (4.0 / viewingConditions.c) * Math.sqrt(j / 100.0) * (viewingConditions.aw + 4.0) * viewingConditions.fLRoot;
        const m = c * viewingConditions.fLRoot;
        const alpha = c / Math.sqrt(j / 100.0);
        const s = 50.0 * Math.sqrt((alpha * viewingConditions.c) / (viewingConditions.aw + 4.0));

        const jstar = (1.0 + 100.0 * 0.007) * j / (1.0 + 0.007 * j);
        const mstar = (1.0 / 0.0228) * Math.log(1.0 + 0.0228 * m);
        const astar = mstar * Math.cos(hueRadians);
        const bstar = mstar * Math.sin(hueRadians);

        return new Cam16(h, c, j, q, m, s, jstar, astar, bstar);
    }

    /**
     * Creates a CAM16 color from CAM16-UCS coordinates using default viewing conditions.
     * @param {number} jStar UCS J* coordinate.
     * @param {number} aStar UCS a* coordinate.
     * @param {number} bStar UCS b* coordinate.
     * @return {Cam16} CAM16 representation.
     */
    static fromUcs(jStar, aStar, bStar) {
        return Cam16.fromUcsInViewingConditions(jStar, aStar, bStar, ViewingConditions.DEFAULT);
    }

    /**
     * Creates a CAM16 color from CAM16-UCS coordinates using specified viewing conditions.
     * @param {number} jStar UCS J* coordinate.
     * @param {number} aStar UCS a* coordinate.
     * @param {number} bStar UCS b* coordinate.
     * @param {ViewingConditions} viewingConditions Custom viewing conditions.
     * @return {Cam16} CAM16 representation.
     */
    static fromUcsInViewingConditions(jStar, aStar, bStar, viewingConditions) {
        const m = Math.sqrt(aStar * aStar + bStar * bStar);
        const M = (Math.exp(m * 0.0228) - 1.0) / 0.0228;
        const c = M / viewingConditions.fLRoot;
        let h = Math.atan2(bStar, aStar) * (180.0 / Math.PI);
        h = h < 0 ? h + 360.0 : h;
        const j = jStar / (1 - (jStar - 100.0) * 0.007);

        return Cam16.fromJchInViewingConditions(j, c, h, viewingConditions);
    }

    /**
     * Creates a CAM16 color from an ARGB integer using specified viewing conditions.
     * @param {number} argb ARGB color value.
     * @param {ViewingConditions} viewingConditions Custom viewing conditions.
     * @return {Cam16} CAM16 representation.
     */
    static fromIntInViewingConditions(argb, viewingConditions) {
        // Convert ARGB to XYZ
        const xyz = colorUtils.xyzFromArgb(argb);
        const x = xyz[0];
        const y = xyz[1];
        const z = xyz[2];

        // Convert XYZ to sharpened RGB
        const rT = x * 0.401288 + y * 0.650173 + z * -0.051461;
        const gT = x * -0.250268 + y * 1.204414 + z * 0.045854;
        const bT = x * -0.002079 + y * 0.048952 + z * 0.953127;

        // Apply viewing conditions discount
        const rD = viewingConditions.rgbD[0] * rT;
        const gD = viewingConditions.rgbD[1] * gT;
        const bD = viewingConditions.rgbD[2] * bT;

        // Apply chromatic adaptation
        const rAF = Math.pow(viewingConditions.fl * Math.abs(rD) / 100.0, 0.42);
        const gAF = Math.pow(viewingConditions.fl * Math.abs(gD) / 100.0, 0.42);
        const bAF = Math.pow(viewingConditions.fl * Math.abs(bD) / 100.0, 0.42);

        const rA = Math.sign(rD) * 400.0 * rAF / (rAF + 27.13);
        const gA = Math.sign(gD) * 400.0 * gAF / (gAF + 27.13);
        const bA = Math.sign(bD) * 400.0 * bAF / (bAF + 27.13);

        // Calculate opponent channels
        const a = rA + gA * -12.0 / 11.0 + bA / 11.0;
        const b = (rA + gA - 2.0 * bA) / 9.0;

        // Calculate hue angle
        const hue = Math.atan2(b, a) * (180.0 / Math.PI);
        const hueSanitized = hue < 0 ? hue + 360.0 : hue >= 360 ? hue - 360.0 : hue;

        // Calculate achromatic response
        const p2 = (40.0 * rA + 20.0 * gA + bA) / 20.0;
        const ac = p2 * viewingConditions.nbb;

        // Calculate lightness J
        const j = 100.0 * Math.pow(ac / viewingConditions.aw, viewingConditions.c * viewingConditions.z);

        // Calculate brightness Q
        const q = (4.0 / viewingConditions.c) * Math.sqrt(j / 100.0) * (viewingConditions.aw + 4.0) * viewingConditions.fLRoot;

        // Calculate hue composition
        const huePrime = (hueSanitized < 20.14) ? hueSanitized + 360 : hueSanitized;
        const eHue = 0.25 * (Math.cos(huePrime * Math.PI / 180.0 + 2.0) + 3.8);
        const p1 = 50000.0 / 13.0 * eHue * viewingConditions.nc * viewingConditions.ncb;
        const t = p1 * Math.sqrt(a * a + b * b) / (ac + 0.305);
        const alpha = Math.pow(t, 0.9) * Math.pow(1.64 - Math.pow(0.29, viewingConditions.n), 0.73);

        // Calculate chroma C
        const c = alpha * Math.sqrt(j / 100.0);

        // Calculate colorfulness M
        const m = c * viewingConditions.fLRoot;

        // Calculate saturation S
        const s = 50.0 * Math.sqrt((alpha * viewingConditions.c) / (viewingConditions.aw + 4.0));

        // Calculate UCS coordinates
        const jstar = (1.0 + 100.0 * 0.007) * j / (1.0 + 0.007 * j);
        const mstar = Math.log(1.0 + 0.0228 * m) / 0.0228;
        const hueRadians = hueSanitized * Math.PI / 180.0;
        const astar = mstar * Math.cos(hueRadians);
        const bstar = mstar * Math.sin(hueRadians);

        return new Cam16(hueSanitized, c, j, q, m, s, jstar, astar, bstar);
    }

    /**
     * Converts the CAM16 color back to an ARGB integer using default viewing conditions.
     * @return {number} ARGB color value.
     */
    toInt() {
        return this.viewed(ViewingConditions.DEFAULT);
    }

    /**
     * Converts the CAM16 color to XYZ coordinates under the specified viewing conditions.
     * This is the inverse operation of the static `fromIntInViewingConditions`.
     *
     * @param {ViewingConditions} viewingConditions The viewing conditions to use for the conversion.
     * @return {number[]} The XYZ coordinates [X, Y, Z].
     */
    xyzInViewingConditions(viewingConditions) {
        const alpha = (this.chroma === 0.0 || this.j === 0.0) ?
            0.0 : this.chroma / Math.sqrt(this.j / 100.0);

        const t = Math.pow(
            alpha / Math.pow(1.64 - Math.pow(0.29, viewingConditions.n), 0.73),
            1.0 / 0.9);
        const hRad = this.hue * Math.PI / 180.0;

        const eHue = 0.25 * (Math.cos(hRad + 2.0) + 3.8);
        const ac = viewingConditions.aw *
            Math.pow(this.j / 100.0, 1.0 / viewingConditions.c / viewingConditions.z);
        const p1 = eHue * (50000.0 / 13.0) * viewingConditions.nc * viewingConditions.ncb;
        const p2 = (ac / viewingConditions.nbb);

        const hSin = Math.sin(hRad);
        const hCos = Math.cos(hRad);

        const gamma = 23.0 * (p2 + 0.305) * t /
            (23.0 * p1 + 11 * t * hCos + 108.0 * t * hSin);
        const a = gamma * hCos;
        const b = gamma * hSin;

        const rA = (460.0 * p2 + 451.0 * a + 288.0 * b) / 1403.0;
        const gA = (460.0 * p2 - 891.0 * a - 261.0 * b) / 1403.0;
        const bA = (460.0 * p2 - 220.0 * a - 6300.0 * b) / 1403.0;

        const rCBase = Math.max(0, (27.13 * Math.abs(rA)) / (400.0 - Math.abs(rA)));
        const rC = Math.sign(rA) * (100.0 / viewingConditions.fl) *
            Math.pow(rCBase, 1.0 / 0.42);

        const gCBase = Math.max(0, (27.13 * Math.abs(gA)) / (400.0 - Math.abs(gA)));
        const gC = Math.sign(gA) * (100.0 / viewingConditions.fl) *
            Math.pow(gCBase, 1.0 / 0.42);

        const bCBase = Math.max(0, (27.13 * Math.abs(bA)) / (400.0 - Math.abs(bA)));
        const bC = Math.sign(bA) * (100.0 / viewingConditions.fl) *
            Math.pow(bCBase, 1.0 / 0.42);

        const rF = rC / viewingConditions.rgbD[0];
        const gF = gC / viewingConditions.rgbD[1];
        const bF = bC / viewingConditions.rgbD[2];

        // Convert sharpened RGB back to XYZ
        const x = 1.86206786 * rF - 1.01125463 * gF + 0.14918677 * bF;
        const y = 0.38752654 * rF + 0.62144744 * gF - 0.00897398 * bF;
        const z = -0.01584150 * rF - 0.03412294 * gF + 1.04996444 * bF;

        return [x, y, z];
    }

    /**
     * Converts the CAM16 color back to an ARGB integer using specified viewing conditions.
     * @param {ViewingConditions} viewingConditions Custom viewing conditions.
     * @return {number} ARGB color value.
     */
    viewed(viewingConditions) {
        const xyz = this.xyzInViewingConditions(viewingConditions);
        return colorUtils.argbFromXyz(xyz[0], xyz[1], xyz[2]);
    }
}


/**
 * HCT (Hue, Chroma, Tone) color space representation.
 * Provides a perceptually accurate way to manipulate colors.
 */
class Hct {
    /** Internal ARGB representation. */
    internalArgb;
    /** Internal hue value. */
    internalHue;
    /** Internal chroma value. */
    internalChroma;
    /** Internal tone value (L*). */
    internalTone;

    /**
     * @param {number} argb - Initial ARGB value.
     * @hideconstructor
     */
    constructor(argb) {
        this.setInternalState(argb);
    }

    /**
     * Creates an HCT color from hue, chroma, and tone components.
     * Hue is 0-360. Chroma is >= 0. Tone is 0-100.
     * Values outside these ranges may lead to unpredictable results.
     *
     * @param {number} hue Hue component.
     * @param {number} chroma Chroma component.
     * @param {number} tone Tone (L*) component.
     * @return {Hct} HCT color object.
     */
    static from(hue, chroma, tone) {
        const argb = HctSolver.solveToInt(hue, chroma, tone);
        return new Hct(argb);
    }

    /**
     * Creates an HCT color from an ARGB integer.
     * @param {number} argb ARGB color value.
     * @return {Hct} HCT color object.
     */
    static fromInt(argb) {
        return new Hct(argb);
    }

    /**
     * Converts the HCT color to its ARGB integer representation.
     * @return {number} ARGB color value.
     */
    toInt() {
        return this.internalArgb;
    }

    /** Gets the hue component (0-360). */
    get hue() {
        return this.internalHue;
    }

    /**
     * Sets the hue component, updating the ARGB value.
     * Chroma may decrease if the new hue is out of gamut.
     * @param {number} newHue New hue value (0-360).
     */
    set hue(newHue) {
        this.setInternalState(HctSolver.solveToInt(newHue, this.internalChroma, this.internalTone));
    }

    /** Gets the chroma component (>= 0). */
    get chroma() {
        return this.internalChroma;
    }

    /**
     * Sets the chroma component, updating the ARGB value.
     * Chroma will be clamped to the maximum possible for the current hue and tone.
     * @param {number} newChroma New chroma value (>= 0).
     */
    set chroma(newChroma) {
        this.setInternalState(HctSolver.solveToInt(this.internalHue, newChroma, this.internalTone));
    }

    /** Gets the tone (L*) component (0-100). */
    get tone() {
        return this.internalTone;
    }

    /**
     * Sets the tone (L*) component, updating the ARGB value.
     * Chroma may decrease if the new tone is out of gamut.
     * @param {number} newTone New tone value (0-100).
     */
    set tone(newTone) {
        this.setInternalState(HctSolver.solveToInt(this.internalHue, this.internalChroma, newTone));
    }

    /**
     * Updates the internal HCT and ARGB values from a new ARGB color.
     * @param {number} argb New ARGB color value.
     * @protected
     */
    setInternalState(argb) {
        this.internalArgb = argb;
        const cam = Cam16.fromInt(argb);
        this.internalHue = cam.hue;
        this.internalChroma = cam.chroma;
        this.internalTone = colorUtils.lstarFromArgb(argb);
    }

    /**
     * Translates the color to the given hue, maintaining perceived relationships.
     * This is different from `set hue` as it attempts to preserve relative chroma and tone.
     * @param {number} hue The target hue angle (0-360).
     * @param {ViewingConditions} viewingConditions The viewing conditions for the transformation. Default is standard.
     * @return {Hct} A new HCT color with the translated hue.
     */
    translate(hue, viewingConditions = ViewingConditions.DEFAULT) {
        // This implementation focuses on just changing the hue in CAM16 space,
        // then converting back. More complex translation might consider gamut mapping.
        const cam = Cam16.fromIntInViewingConditions(this.toInt(), viewingConditions);
        const newCam = Cam16.fromJchInViewingConditions(cam.j, cam.chroma, hue, viewingConditions);
        return Hct.fromInt(newCam.toInt());
    }
}

/**
 * Internal solver for converting between HCT and ARGB.
 * Uses CAM16 and searches within the sRGB gamut.
 * @private
 */
class HctSolver {
    /**
     * Solves for the ARGB representation of an HCT color.
     * Finds the color in the sRGB gamut that matches the given hue, chroma, and tone.
     *
     * @param {number} hue The hue component (0-360).
     * @param {number} chroma The chroma component (>= 0).
     * @param {number} tone The tone (L*) component (0-100).
     * @return {number} The corresponding ARGB color value.
     */
    static solveToInt(hue, chroma, tone) {
        // Handle simple achromatic cases.
        if (chroma < 0.5 || mathUtils.clampDouble(0.0, 100.0, tone) !== tone) {
            return colorUtils.argbFromLstar(tone);
        }

        hue = mathUtils.sanitizeDegreesDouble(hue);

        // Start search with a chroma value slightly higher than requested.
        // This helps ensure we find a solution within gamut if one exists close by.
        let highChroma = chroma;
        let midChroma = chroma;
        let lowChroma = 0.0;
        let isFirstLoop = true;

        let answer = null;

        // Binary search for the highest possible chroma at the given hue and tone.
        while (Math.abs(lowChroma - highChroma) >= 0.4) {
            // Check the midpoint chroma.
            midChroma = lowChroma + (highChroma - lowChroma) / 2.0;

            // Generate HCT from candidate chroma/hue/tone
            // Hct.from internally uses HctSolver.solveToInt, creating recursion.
            // We need a direct CAM16 -> ARGB check here.
            const cam = Cam16.fromJch(tone, midChroma, hue);
            const candidateArgb = cam.toInt();

            // Check if the candidate ARGB, when converted back to HCT,
            // retains the intended hue, chroma, and tone within tolerance.
            const hctCandidate = Hct.fromInt(candidateArgb);

            // Check tone first, as it's most critical.
            if (Math.abs(hctCandidate.tone - tone) > 0.5) {
                // If the tone is wrong, likely means we're out of gamut in a way
                // that significantly shifts lightness. Usually happens when requested
                // chroma is too high. Try lower chroma.
                highChroma = midChroma;
                continue; // Skip chroma/hue checks if tone is already off
            }

            // Check chroma match (within a tolerance)
            // Allow slightly lower chroma than requested if it's the max possible.
            const chromaMatches = hctCandidate.chroma >= midChroma - 0.5;

            // Check hue match (within a tolerance, handling wrap-around)
            const hueMatches = mathUtils.differenceDegrees(hctCandidate.hue, hue) < 0.5;


            if (chromaMatches && hueMatches) {
                // This chroma is possible or very close. Store it and try higher.
                answer = candidateArgb;
                lowChroma = midChroma;
                isFirstLoop = false;
            } else {
                // This chroma/hue combination is likely out of gamut. Try lower chroma.
                highChroma = midChroma;
            }
        }

        // If no solution was found in the loop (answer is still null),
        // it implies even very low chroma was out of gamut for this tone/hue,
        // which is unlikely but possible at extremes. Return the achromatic color.
        // If a solution *was* found (answer is not null), return the last valid ARGB found.
        return answer === null ? colorUtils.argbFromLstar(tone) : answer;
    }
}


/**
 * @section Contrast Calculation
 * @description Utilities for calculating contrast ratios and finding tones that meet contrast requirements.
 */

/**
 * A curve that specifies contrast requirements between two colors
 * across different contrast levels (-1.0 to 1.0).
 */
class ContrastCurve {
    /** Low contrast requirement (-1.0). */
    low;
    /** Normal contrast requirement (0.0). */
    normal;
    /** Medium contrast requirement (0.5). */
    medium;
    /** High contrast requirement (1.0). */
    high;

    /**
     * Creates a new contrast curve.
     *
     * @param {number} low Contrast ratio for low contrast level (-1.0).
     * @param {number} normal Contrast ratio for normal contrast level (0.0).
     * @param {number} medium Contrast ratio for medium contrast level (0.5).
     * @param {number} high Contrast ratio for high contrast level (1.0).
     */
    constructor(low, normal, medium, high) {
        this.low = low;
        this.normal = normal;
        this.medium = medium;
        this.high = high;
    }

    /**
     * Gets the required contrast ratio for a given contrast level.
     * Interpolates between the defined points on the curve.
     *
     * @param {number} contrastLevel Contrast level, typically -1.0 to 1.0.
     *                                Values outside this range are clamped.
     * @return {number} The required contrast ratio (e.g., 3.0, 4.5).
     */
    get = (contrastLevel) => {
        // Clamp contrast level to the defined range [-1, 1]
        const level = mathUtils.clampDouble(-1.0, 1.0, contrastLevel);

        if (level <= -1.0) {
            return this.low;
        } else if (level < 0.0) {
            // Lerp between low and normal
            return mathUtils.lerp(this.low, this.normal, (level + 1.0) / 1.0);
        } else if (level < 0.5) {
            // Lerp between normal and medium
            return mathUtils.lerp(this.normal, this.medium, level / 0.5);
        } else if (level < 1.0) {
            // Lerp between medium and high
            return mathUtils.lerp(this.medium, this.high, (level - 0.5) / 0.5);
        } else { // level >= 1.0
            return this.high;
        }
    }
}

/**
 * Utility class for calculating contrast ratios based on WCAG 2.1 definition.
 * Uses L* (lightness) values as input.
 */
class Contrast {
    /** Minimum contrast ratio (1:1). */
    static ratioMin = 1.0;
    /** Maximum contrast ratio (21:1). */
    static ratioMax = 21.0;

    /**
     * Calculates the contrast ratio between two tones (L* values).
     *
     * @param {number} toneA First tone (L* value, 0-100).
     * @param {number} toneB Second tone (L* value, 0-100).
     * @return {number} Contrast ratio (1-21). Returns 1.0 if inputs are invalid.
     */
    static ratioOfTones = (toneA, toneB) => {
        // Clamp tones to valid L* range
        toneA = mathUtils.clampDouble(0, 100, toneA);
        toneB = mathUtils.clampDouble(0, 100, toneB);

        // Handle invalid inputs gracefully
        if (isNaN(toneA) || isNaN(toneB)) {
            return Contrast.ratioMin;
        }

        // Calculate Y (relative luminance) from L*
        const y1 = colorUtils.yFromLstar(toneA);
        const y2 = colorUtils.yFromLstar(toneB);

        return Contrast.ratioOfYs(y1, y2);
    };

    /**
     * Calculates the contrast ratio between two Y values (relative luminance).
     * Formula from WCAG 2.1: (L1 + 0.05) / (L2 + 0.05), where L1 is the lighter luminance.
     * Y values should be in the range 0-100.
     *
     * @param {number} y1 First Y value (0-100).
     * @param {number} y2 Second Y value (0-100).
     * @return {number} Contrast ratio (1-21). Returns 1.0 if inputs are invalid.
     */
    static ratioOfYs = (y1, y2) => {
        // Handle invalid inputs gracefully
        if (isNaN(y1) || isNaN(y2)) {
            return Contrast.ratioMin;
        }

        // Clamp Y values to expected range (though they should typically be within it)
        y1 = mathUtils.clampDouble(0, 100, y1);
        y2 = mathUtils.clampDouble(0, 100, y2);

        const lighter = Math.max(y1, y2);
        const darker = Math.min(y1, y2);

        // Add 0.05 adjustment according to WCAG formula (scaled for Y range 0-100)
        // (L + 0.05) becomes (Y/100 + 0.05), scaled by 100 -> (Y + 5)
        const ratio = (lighter + 5.0) / (darker + 5.0);

        // Ensure ratio is within valid range [1, 21]
        return mathUtils.clampDouble(Contrast.ratioMin, Contrast.ratioMax, ratio);
    };

    /**
     * Finds the lightest possible tone (L*) that satisfies a minimum contrast ratio
     * relative to a given tone.
     *
     * @param {number} tone Input tone (L* value, 0-100).
     * @param {number} ratio Target minimum contrast ratio (1-21).
     * @return {number} The lightest tone (L*) that meets the ratio, or -1.0 if
     *                  no lighter tone (including 100) can achieve the ratio,
     *                  or if the input tone is invalid.
     */
    static lighter = (tone, ratio) => {
        // Validate input tone and ratio
        if (tone < 0 || tone > 100 || isNaN(tone) || ratio < Contrast.ratioMin || ratio > Contrast.ratioMax || isNaN(ratio)) {
            return -1.0;
        }

        // Calculate relative luminance of the input tone
        const darkY = colorUtils.yFromLstar(tone);

        // Calculate the target relative luminance for the lighter color
        // Formula derived from contrast = (lightY + 5) / (darkY + 5)
        // lightY = ratio * (darkY + 5) - 5
        const lightY = ratio * (darkY + 5.0) - 5.0;

        // If target luminance is impossible (>= Y of white), no solution exists, try 100
        if (lightY > 100.0) {
            return (Contrast.ratioOfTones(100.0, tone) >= ratio) ? 100.0 : -1.0;
        }
        // If target luminance is impossible (< Y of input), no lighter solution exists
        if (lightY < darkY) {
            return (Contrast.ratioOfTones(100.0, tone) >= ratio) ? 100.0 : -1.0;
        }


        // Convert target luminance back to L* tone
        const resultTone = colorUtils.lstarFromY(lightY);

        // Due to the non-linear relationship, the calculated L* might be slightly off.
        // Check if the actual result meets the ratio. Check T100 as a backup.
        if (Contrast.ratioOfTones(resultTone, tone) < ratio - 0.01) { // Use small tolerance
            return (Contrast.ratioOfTones(100.0, tone) >= ratio) ? 100.0 : -1.0;
        }


        // Return the found tone, ensuring it's within bounds and actually lighter
        return mathUtils.clampDouble(tone, 100.0, resultTone); // Ensure it's >= original tone
    };

    /**
     * Finds the darkest possible tone (L*) that satisfies a minimum contrast ratio
     * relative to a given tone.
     *
     * @param {number} tone Input tone (L* value, 0-100).
     * @param {number} ratio Target minimum contrast ratio (1-21).
     * @return {number} The darkest tone (L*) that meets the ratio, or -1.0 if
     *                  no darker tone (including 0) can achieve the ratio,
     *                  or if the input tone is invalid.
     */
    static darker = (tone, ratio) => {
        // Validate input tone and ratio
        if (tone < 0 || tone > 100 || isNaN(tone) || ratio < Contrast.ratioMin || ratio > Contrast.ratioMax || isNaN(ratio)) {
            return -1.0;
        }

        // Calculate relative luminance of the input tone
        const lightY = colorUtils.yFromLstar(tone);

        // Calculate the target relative luminance for the darker color
        // Formula derived from contrast = (lightY + 5) / (darkY + 5)
        // darkY = (lightY + 5) / ratio - 5
        const darkY = (lightY + 5.0) / ratio - 5.0;

        // If target luminance is impossible (< Y of black), no solution exists, try 0
        if (darkY < 0.0) {
            return (Contrast.ratioOfTones(tone, 0.0) >= ratio) ? 0.0 : -1.0;
        }
        // If target luminance is impossible (> Y of input), no darker solution exists
        if (darkY > lightY) {
            return (Contrast.ratioOfTones(tone, 0.0) >= ratio) ? 0.0 : -1.0;
        }

        // Convert target luminance back to L* tone
        const resultTone = colorUtils.lstarFromY(darkY);

        // Check if the actual result meets the ratio. Check T0 as a backup.
        if (Contrast.ratioOfTones(tone, resultTone) < ratio - 0.01) { // Use small tolerance
            return (Contrast.ratioOfTones(tone, 0.0) >= ratio) ? 0.0 : -1.0;
        }

        // Return the found tone, ensuring it's within bounds and actually darker
        return mathUtils.clampDouble(0.0, tone, resultTone); // Ensure it's <= original tone
    };

    /**
     * Finds a tone lighter than the input tone that meets the contrast ratio.
     * Returns 100.0 if no suitable lighter tone is found within the L* range [0, 100].
     * This is 'unsafe' because it might return 100 even if the contrast target
     * is theoretically unachievable.
     *
     * @param {number} tone Input tone (L* value, 0-100).
     * @param {number} ratio Target minimum contrast ratio (1-21).
     * @return {number} The lightest tone (L*) meeting the ratio, or 100.0 as a fallback.
     */
    static lighterUnsafe = (tone, ratio) => {
        const lighterSafe = Contrast.lighter(tone, ratio);
        // If lighter() returned -1 (no solution found), default to 100.0
        return (lighterSafe === -1.0) ? 100.0 : lighterSafe;
    };

    /**
     * Finds a tone darker than the input tone that meets the contrast ratio.
     * Returns 0.0 if no suitable darker tone is found within the L* range [0, 100].
     * This is 'unsafe' because it might return 0 even if the contrast target
     * is theoretically unachievable.
     *
     * @param {number} tone Input tone (L* value, 0-100).
     * @param {number} ratio Target minimum contrast ratio (1-21).
     * @return {number} The darkest tone (L*) meeting the ratio, or 0.0 as a fallback.
     */
    static darkerUnsafe = (tone, ratio) => {
        const darkerSafe = Contrast.darker(tone, ratio);
        // If darker() returned -1 (no solution found), default to 0.0
        return (darkerSafe === -1.0) ? 0.0 : darkerSafe;
    };
}


/**
 * @section Palettes (Tonal, Core)
 * @description Classes for defining and managing tonal palettes derived from key colors.
 */

/**
 * Represents a tonal palette generated from a single HCT color (hue and chroma).
 * Provides methods to retrieve colors at specific tone (L*) levels.
 */
class TonalPalette {
    /** Hue of the palette. */
    hue;
    /** Chroma of the palette (target chroma). */
    chroma;
    /** The key HCT color defining the palette's hue and chroma. */
    keyColor;
    /** Cache for previously generated tones to improve performance. */
    cache;

    /**
     * Creates a new TonalPalette instance. Use static factory methods for common creation patterns.
     * @param {number} hue The hue (0-360).
     * @param {number} chroma The chroma (>=0).
     * @param {Hct} keyColor The HCT object representing the key color.
     * @hideconstructor
     */
    constructor(hue, chroma, keyColor) {
        this.hue = hue;
        this.chroma = chroma;
        this.keyColor = keyColor;
        this.cache = new Map();
    }

    /**
     * Creates a TonalPalette from an ARGB color integer.
     * Extracts hue and chroma from the ARGB value.
     * @param {number} argb The ARGB color value.
     * @return {TonalPalette} A new TonalPalette instance.
     */
    static fromInt(argb) {
        const hct = Hct.fromInt(argb);
        return TonalPalette.fromHct(hct);
    }

    /**
     * Creates a TonalPalette from an HCT color object.
     * @param {Hct} hct The HCT color object.
     * @return {TonalPalette} A new TonalPalette instance.
     */
    static fromHct(hct) {
        // Ensure keyColor is also an Hct instance if needed elsewhere, though constructor just uses hue/chroma
        return new TonalPalette(hct.hue, hct.chroma, hct);
    }

    /**
     * Creates a TonalPalette directly from hue and chroma values.
     * A key color (HCT) is generated internally, typically aiming for tone 50.
     * @param {number} hue The hue (0-360).
     * @param {number} chroma The chroma (>=0).
     * @return {TonalPalette} A new TonalPalette instance.
     */
    static fromHueAndChroma(hue, chroma) {
        // Generate a representative key color for this hue/chroma pair.
        // Often aims for Tone 50, but KeyColor class handles finding a suitable one.
        const keyColor = new KeyColor(hue, chroma).create();
        return new TonalPalette(hue, chroma, keyColor);
    }

    /**
     * Gets the ARGB color integer for a specific tone within this palette.
     * Uses caching for performance.
     *
     * @param {number} tone The desired tone (L* value, 0-100).
     *                      Values outside this range will be clamped by HctSolver.
     * @return {number} The ARGB color value for the given tone.
     */
    tone(tone) {
        // Check cache first
        let argb = this.cache.get(tone);

        if (argb === undefined) {
            // If not cached, generate the color using HctSolver via Hct.from
            argb = Hct.from(this.hue, this.chroma, tone).toInt();
            this.cache.set(tone, argb);
        }

        return argb;
    }

    /**
     * Gets the HCT color object for a specific tone within this palette.
     *
     * @param {number} tone The desired tone (L* value, 0-100).
     * @return {Hct} The HCT color object for the given tone.
     */
    getHct(tone) {
        // Retrieve the ARGB from cache/generation, then convert to HCT
        return Hct.fromInt(this.tone(tone));
    }
}

/**
 * Utility class to find a suitable HCT "key color" for a given hue and chroma target.
 * A key color aims to be a representative color within a TonalPalette, often
 * near tone 50, while maximizing chroma up to the requested level.
 * @private
 */
class KeyColor {
    hue;
    requestedChroma;
    // Cache for max chroma at a given tone to avoid redundant calculations
    chromaCache = new Map();
    // A very high chroma value used in searching for the max achievable chroma
    static maxChromaValue = 200.0;
    // Target tone for the key color
    static targetTone = 50.0;

    /**
     * @param {number} hue The target hue (0-360).
     * @param {number} requestedChroma The desired chroma level.
     */
    constructor(hue, requestedChroma) {
        this.hue = mathUtils.sanitizeDegreesDouble(hue);
        this.requestedChroma = Math.max(0.0, requestedChroma); // Chroma cannot be negative
    }

    /**
     * Finds the HCT color that best represents the key color for this hue and requested chroma.
     * This involves finding a tone (usually near 50) where the requested chroma is achievable,
     * or the maximum possible chroma if the requested chroma is too high for the gamut.
     *
     * @return {Hct} The generated key HCT color.
     */
    create() {
        // Binary search for the tone that provides the highest chroma <= requestedChroma,
        // prioritizing tones closer to the targetTone (50).

        let lowerTone = 0.0;
        let upperTone = 100.0;
        let bestTone = KeyColor.targetTone; // Start assuming target tone is best

        // Use a slightly wider tolerance for the loop condition
        while (Math.abs(upperTone - lowerTone) > 0.01) {
            const midTone = lowerTone + (upperTone - lowerTone) / 2.0;
            const midChroma = this.maxChroma(midTone);

            if (midChroma < this.requestedChroma) {
                // Chroma at midTone is too low. Search higher tones (closer to peak chroma tone).
                lowerTone = midTone;
            } else {
                // Chroma at midTone is sufficient. This tone is a candidate.
                // Store it and search lower tones (potentially closer to 50).
                bestTone = midTone;
                upperTone = midTone;
            }
        }

        // Use the best tone found and generate the final HCT color,
        // ensuring chroma doesn't exceed the maximum for that tone or the requested chroma.
        const actualChroma = Math.min(this.maxChroma(bestTone), this.requestedChroma);
        return Hct.from(this.hue, actualChroma, bestTone);
    }


    /**
     * Finds the maximum achievable chroma for the given hue at a specific tone.
     * Uses caching.
     *
     * @param {number} tone The tone (L* value, 0-100).
     * @return {number} The maximum chroma possible at this hue and tone.
     */
    maxChroma(tone) {
        // Round tone slightly for cache effectiveness
        const roundedTone = Math.round(tone * 100) / 100;

        if (this.chromaCache.has(roundedTone)) {
            return this.chromaCache.get(roundedTone);
        }

        // Generate an HCT color with a very high chroma target.
        // The actual chroma of the resulting HCT object will be the maximum achievable.
        // Use the direct CAM16 -> ARGB -> HCT path to avoid solver recursion.
        const cam = Cam16.fromJch(roundedTone, KeyColor.maxChromaValue, this.hue);
        const chroma = Hct.fromInt(cam.toInt()).chroma;


        this.chromaCache.set(roundedTone, chroma);
        return chroma;
    }

}

/**
 * Represents the set of core accent and neutral palettes in Material Design.
 * Generated from a single source color or multiple seed colors.
 */
class CorePalette {
    /** Primary accent palette (A1). */
    a1;
    /** Secondary accent palette (A2). */
    a2;
    /** Tertiary accent palette (A3). */
    a3;
    /** Neutral palette (N1). */
    n1;
    /** Neutral variant palette (N2). */
    n2;
    /** Error palette (always the same fixed red). */
    error;

    /**
     * Creates a new CorePalette. Prefer using static factory methods:
     * `of()` (single source), `contentOf()` (single source, content style),
     * or `fromColors()` (multiple seeds).
     * @param {number} primarySeedArgb The primary seed color ARGB value.
     * @param {boolean} isContent If true, generates content-specific chroma levels.
     * @hideconstructor
     */
    constructor(primarySeedArgb, isContent) {
        const hct = Hct.fromInt(primarySeedArgb);
        const hue = hct.hue;
        const chroma = hct.chroma;

        // Standard platform chroma logic (used as fallback in fromColors)
        const primaryChroma = isContent ? chroma : Math.max(48.0, chroma);
        const secondaryChroma = isContent ? chroma / 3.0 : 16.0;
        const tertiaryChroma = isContent ? chroma / 2.0 : 24.0;
        const neutralChroma = isContent ? Math.min(chroma / 12.0, 4.0) : 4.0;
        const neutralVariantChroma = isContent ? Math.min(chroma / 6.0, 8.0) : 8.0;
        const tertiaryHue = mathUtils.sanitizeDegreesDouble(hue + 60.0);

        this.a1 = TonalPalette.fromHueAndChroma(hue, primaryChroma);
        this.a2 = TonalPalette.fromHueAndChroma(hue, secondaryChroma);
        this.a3 = TonalPalette.fromHueAndChroma(tertiaryHue, tertiaryChroma);
        this.n1 = TonalPalette.fromHueAndChroma(hue, neutralChroma);
        this.n2 = TonalPalette.fromHueAndChroma(hue, neutralVariantChroma);
        this.error = TonalPalette.fromHueAndChroma(25.0, 84.0); // Fixed error palette
    }

    /**
     * Creates a CorePalette using standard platform chroma levels from a single source color.
     * @param {number} argb Source color ARGB value.
     * @return {CorePalette} A new CorePalette instance.
     */
    static of(argb) {
        return new CorePalette(argb, false /* isContent */);
    }

    /**
     * Creates a CorePalette using content-specific chroma levels from a single source color,
     * preserving more of the source color's original chroma.
     * @param {number} argb Source color ARGB value.
     * @return {CorePalette} A new CorePalette instance.
     */
    static contentOf(argb) {
        return new CorePalette(argb, true /* isContent */);
    }

    /**
     * Creates a CorePalette from one, two, or three seed colors.
     *
     * @param {object} seeds Seed colors.
     * @param {number} seeds.primary The ARGB value for the primary seed color.
     * @param {number} [seeds.secondary] Optional ARGB value for the secondary seed color.
     * @param {number} [seeds.tertiary] Optional ARGB value for the tertiary seed color.
     * @param {boolean} [isContent=false] Whether to use content-specific chroma rules (affects fallbacks).
     * @return {CorePalette} A new CorePalette instance.
     */
    static fromColors(seeds, isContent = false) {
        if (!seeds || seeds.primary === undefined) {
            throw new Error("CorePalette.fromColors requires at least a 'primary' seed color.");
        }

        const primaryHct = Hct.fromInt(seeds.primary);
        const primaryHue = primaryHct.hue;
        const primaryChroma = primaryHct.chroma;

        // Instantiate a dummy palette to hold results
        // We use the constructor logic as fallback for missing seeds
        const palette = new CorePalette(seeds.primary, isContent);

        // --- Primary ---
        // Always derived from the primary seed, using standard platform chroma minimum
        palette.a1 = TonalPalette.fromHueAndChroma(primaryHue, Math.max(48.0, primaryChroma));

        // --- Secondary ---
        if (seeds.secondary !== undefined) {
            const secondaryHct = Hct.fromInt(seeds.secondary);
            // Use secondary seed's hue and chroma directly
            palette.a2 = TonalPalette.fromHueAndChroma(secondaryHct.hue, secondaryHct.chroma);
        } else {
            // Fallback: Use primary hue, standard secondary chroma
            const secondaryChroma = isContent ? primaryChroma / 3.0 : 16.0;
            palette.a2 = TonalPalette.fromHueAndChroma(primaryHue, secondaryChroma);
        }

        // --- Tertiary ---
        if (seeds.tertiary !== undefined) {
            const tertiaryHct = Hct.fromInt(seeds.tertiary);
            // Use tertiary seed's hue and chroma directly
            palette.a3 = TonalPalette.fromHueAndChroma(tertiaryHct.hue, tertiaryHct.chroma);
        } else {
            // Fallback: Use primary hue + 60 deg, standard tertiary chroma
            const tertiaryHue = mathUtils.sanitizeDegreesDouble(primaryHue + 60.0);
            const tertiaryChroma = isContent ? primaryChroma / 2.0 : 24.0;
            palette.a3 = TonalPalette.fromHueAndChroma(tertiaryHue, tertiaryChroma);
        }

        // --- Neutrals ---
        // Always derived from the primary seed's hue for consistency
        const neutralChroma = isContent ? Math.min(primaryChroma / 12.0, 4.0) : 4.0;
        const neutralVariantChroma = isContent ? Math.min(primaryChroma / 6.0, 8.0) : 8.0;
        palette.n1 = TonalPalette.fromHueAndChroma(primaryHue, neutralChroma);
        palette.n2 = TonalPalette.fromHueAndChroma(primaryHue, neutralVariantChroma);

        // --- Error ---
        // Remains fixed
        palette.error = TonalPalette.fromHueAndChroma(25.0, 84.0);

        return palette;
    }
}

/**
 * A container for the five core tonal palettes (Primary, Secondary, Tertiary, Neutral, Neutral Variant)
 * plus the Error palette. This simplifies passing palettes around.
 */
class CorePalettes {
    /** Primary Tonal Palette. */
    primary;
    /** Secondary Tonal Palette. */
    secondary;
    /** Tertiary Tonal Palette. */
    tertiary;
    /** Neutral Tonal Palette. */
    neutral;
    /** Neutral Variant Tonal Palette. */
    neutralVariant;
    /** Error Tonal Palette. */
    error;

    /**
     * Creates a CorePalettes collection from a CorePalette object.
     * @param {CorePalette} corePalette A CorePalette object containing a1, a2, a3, n1, n2, error palettes.
     */
    constructor(corePalette) {
        if (!(corePalette instanceof CorePalette)) {
            throw new Error("CorePalettes constructor requires a CorePalette instance.");
        }
        this.primary = corePalette.a1;
        this.secondary = corePalette.a2;
        this.tertiary = corePalette.a3;
        this.neutral = corePalette.n1;
        this.neutralVariant = corePalette.n2;
        this.error = corePalette.error;
    }
}

/**
 * @section Dynamic Scheme
 * @description Defines the configuration for a dynamic color scheme (light/dark, contrast).
 */

/**
 * Represents the configuration parameters for generating a dynamic color scheme.
 * It holds the source color, theme settings (dark mode, contrast), and the
 * core palettes used to derive the scheme's colors.
 */
class DynamicScheme {
    /** Source color ARGB value. */
    sourceColorArgb;
    /** Source color HCT object. */
    sourceColorHct;
    /** The variant style (e.g., Tonal Spot, Vibrant). Not fully implemented here, using default. */
    variant; // Simplified placeholder
    /** Indicates if the scheme is for dark mode. */
    isDark;
    /** Contrast level (-1.0 to 1.0). */
    contrastLevel;
    /** Primary Tonal Palette. */
    primaryPalette;
    /** Secondary Tonal Palette. */
    secondaryPalette;
    /** Tertiary Tonal Palette. */
    tertiaryPalette;
    /** Neutral Tonal Palette. */
    neutralPalette;
    /** Neutral Variant Tonal Palette. */
    neutralVariantPalette;
    /** Error Tonal Palette. */
    errorPalette;

    /**
     * Creates a new DynamicScheme configuration.
     *
     * @param {object} args Configuration arguments.
     * @param {number} args.sourceColorArgb Source color ARGB.
     * @param {Hct} args.sourceColorHct Source color HCT.
     * @param {any} args.variant Scheme variant (simplified).
     * @param {boolean} args.isDark True for dark mode, false for light mode.
     * @param {number} args.contrastLevel Contrast level (-1.0 to 1.0).
     * @param {TonalPalette} args.primaryPalette Primary palette.
     * @param {TonalPalette} args.secondaryPalette Secondary palette.
     * @param {TonalPalette} args.tertiaryPalette Tertiary palette.
     * @param {TonalPalette} args.neutralPalette Neutral palette.
     * @param {TonalPalette} args.neutralVariantPalette Neutral variant palette.
     * @param {TonalPalette} args.errorPalette Error palette.
     */
    constructor(args) {
        // Validate required arguments
        if (args.sourceColorArgb === undefined || args.sourceColorHct === undefined ||
            args.variant === undefined || args.isDark === undefined || args.contrastLevel === undefined ||
            !args.primaryPalette || !args.secondaryPalette || !args.tertiaryPalette ||
            !args.neutralPalette || !args.neutralVariantPalette || !args.errorPalette) {
            throw new Error("Missing required arguments for DynamicScheme constructor");
        }

        this.sourceColorArgb = args.sourceColorArgb;
        this.sourceColorHct = args.sourceColorHct;
        this.variant = args.variant; // Store variant identifier
        this.isDark = args.isDark;
        this.contrastLevel = args.contrastLevel;
        this.primaryPalette = args.primaryPalette;
        this.secondaryPalette = args.secondaryPalette;
        this.tertiaryPalette = args.tertiaryPalette;
        this.neutralPalette = args.neutralPalette;
        this.neutralVariantPalette = args.neutralVariantPalette;
        this.errorPalette = args.errorPalette;
    }
}

// --- Scheme Type Checks (Helper functions based on palette relationships) ---

/**
 * Checks if the scheme is considered "Monochrome".
 * In Material Design, this often means the primary color comes from the neutral palette.
 * Note: This check might be less relevant or accurate when using multiple seed colors
 * where palettes are derived independently. It primarily applies to single-seed generation.
 *
 * @param {DynamicScheme} scheme The scheme to check.
 * @return {boolean} True if the scheme is monochrome, false otherwise.
 */
const isMonochrome = (scheme) => scheme.primaryPalette === scheme.neutralPalette;

/**
 * Checks if the scheme is considered "Fidelity".
 * In Material Design, this often relates to how closely secondary/tertiary colors
 * relate to the source color vs. being shifted for visual variety. A common fidelity
 * check involves comparing the secondary palette to the neutral variant.
 * Note: This check might be less relevant or accurate when using multiple seed colors.
 *
 * @param {DynamicScheme} scheme The scheme to check.
 * @return {boolean} True if the scheme meets the fidelity criteria, false otherwise.
 */
const isFidelity = (scheme) => scheme.secondaryPalette === scheme.neutralVariantPalette;


/**
 * @section Color Quantization
 * @description Algorithms for reducing the number of colors in an image (Wu, WSMeans).
 */

/**
 * @typedef {object} DistanceAndIndexQuant
 * @property {number} distance - Distance value used for sorting.
 * @property {number} index - Original index associated with the distance.
 */

/**
 * @typedef {object} PointProvider
 * @property {function(number[]): number} toInt - Converts a point in the provider's space (e.g., Lab) to an ARGB integer.
 * @property {function(number): number[]} fromInt - Converts an ARGB integer to a point in the provider's space.
 * @property {function(number[], number[]): number} distance - Calculates the distance (typically squared) between two points in the provider's space.
 */

/**
 * @typedef {object} BoxQuant
 * @property {number} r0 - Minimum red value (quantized index).
 * @property {number} r1 - Maximum red value (quantized index).
 * @property {number} g0 - Minimum green value (quantized index).
 * @property {number} g1 - Maximum green value (quantized index).
 * @property {number} b0 - Minimum blue value (quantized index).
 * @property {number} b1 - Maximum blue value (quantized index).
 * @property {number} vol - Volume of the box in quantized index space.
 */

/**
 * @typedef {object} CreateBoxesResult
 * @property {number} requestedCount - Number of colors initially requested.
 * @property {number} resultCount - Actual number of distinct boxes (colors) generated.
 */

/**
 * @typedef {object} MaximizeResult
 * @property {number} cutLocation - Index where the cut should occur (-1 if no cut found).
 * @property {number} maximum - Maximum variance value found during the maximization process.
 */

// Constants for Wu Quantizer
const INDEX_BITS_WU = 5; // 5 bits per color component (32 levels)
const SIDE_LENGTH_WU = (1 << INDEX_BITS_WU) + 1; // 32 + 1 = 33
const TOTAL_SIZE_WU = SIDE_LENGTH_WU * SIDE_LENGTH_WU * SIDE_LENGTH_WU; // 33 * 33 * 33

// Constants for WSMeans Quantizer
const MAX_ITERATIONS_WSMEANS = 10;
const MIN_MOVEMENT_DISTANCE_WSMEANS = 3.0 * 3.0; // Use squared distance

/**
 * Direction constants for Wu quantizer cuts.
 * @enum {string}
 */
const WuDirections = {
    RED: 'red',
    GREEN: 'green',
    BLUE: 'blue'
};

/**
 * Simple quantizer that counts occurrences of each distinct opaque color.
 */
class QuantizerMap {
    /**
     * Creates a map of color counts from an array of pixels.
     * Ignores transparent pixels (alpha < 255).
     *
     * @param {number[]} pixels Array of ARGB color integers.
     * @return {Map<number, number>} Map where keys are ARGB colors and values are counts.
     */
    static quantize(pixels) {
        const countByColor = new Map();
        for (const pixel of pixels) {
            // Only consider opaque pixels
            if (colorUtils.alphaFromArgb(pixel) < 255) continue;
            countByColor.set(pixel, (countByColor.get(pixel) || 0) + 1);
        }
        return countByColor;
    }
}


/**
 * Represents a 3D box in the quantized RGB color space for the Wu algorithm.
 * Stores boundaries and volume.
 * @private
 */
class BoxWu {
    r0 = 0;
    r1 = 0;
    g0 = 0;
    g1 = 0;
    b0 = 0;
    b1 = 0;
    vol = 0;
}

/**
 * Implementation of Xiaolin Wu's color quantization algorithm (Wu Quant).
 * Divides the color space into boxes to find representative colors.
 */
class QuantizerWu {
    /** Weights (pixel counts) for each cell in the 3D histogram. */
    weights = [];
    /** Sum of red components for each cell. */
    momentsR = [];
    /** Sum of green components for each cell. */
    momentsG = [];
    /** Sum of blue components for each cell. */
    momentsB = [];
    /** Sum of (r*r + g*g + b*b) for each cell. Used for variance calculation. */
    moments = [];
    /** Array of BoxWu objects representing the color clusters. */
    cubes = [];

    /**
     * Quantizes an array of pixels to a maximum number of colors using Wu's algorithm.
     *
     * @param {number[]} pixels Array of ARGB color integers.
     * @param {number} maxColors Maximum number of colors desired in the output palette.
     * @return {number[]} Array of ARGB colors representing the quantized palette.
     */
    quantize(pixels, maxColors) {
        this.constructHistogram(pixels);
        this.computeMoments();
        const createBoxesResult = this.createBoxes(maxColors);
        const results = this.createResult(createBoxesResult.resultCount);
        return results;
    }

    /**
     * Builds the 3D histogram and initial moments from the input pixels.
     * @param {number[]} pixels Array of ARGB color integers.
     * @protected
     */
    constructHistogram(pixels) {
        // Initialize moment arrays
        this.weights = Array(TOTAL_SIZE_WU).fill(0);
        this.momentsR = Array(TOTAL_SIZE_WU).fill(0);
        this.momentsG = Array(TOTAL_SIZE_WU).fill(0);
        this.momentsB = Array(TOTAL_SIZE_WU).fill(0);
        this.moments = Array(TOTAL_SIZE_WU).fill(0);

        // Count occurrences of each color
        const countByColor = QuantizerMap.quantize(pixels);

        // Populate the histogram and initial moments
        for (const [pixel, count] of countByColor.entries()) {
            const r = colorUtils.redFromArgb(pixel);
            const g = colorUtils.greenFromArgb(pixel);
            const b = colorUtils.blueFromArgb(pixel);

            // Quantize coordinates to fit within the 3D histogram indices (0-32)
            const bitsToRemove = 8 - INDEX_BITS_WU;
            const iR = (r >> bitsToRemove) + 1; // +1 to shift range to 1-33
            const iG = (g >> bitsToRemove) + 1;
            const iB = (b >> bitsToRemove) + 1;

            const index = this.getIndex(iR, iG, iB);

            this.weights[index] += count;
            this.momentsR[index] += count * r;
            this.momentsG[index] += count * g;
            this.momentsB[index] += count * b;
            // Pre-calculate sum of squares for variance
            this.moments[index] += count * (r * r + g * g + b * b);
        }
    }

    /**
     * Computes the cumulative moments (prefix sums) for efficient volume calculation.
     * Converts the initial moments into a Summed Area Table (SAT).
     * @protected
     */
    computeMoments() {
        for (let r = 1; r < SIDE_LENGTH_WU; r++) {
            const area = Array(SIDE_LENGTH_WU).fill(0);
            const areaR = Array(SIDE_LENGTH_WU).fill(0);
            const areaG = Array(SIDE_LENGTH_WU).fill(0);
            const areaB = Array(SIDE_LENGTH_WU).fill(0);
            const area2 = Array(SIDE_LENGTH_WU).fill(0.0);

            for (let g = 1; g < SIDE_LENGTH_WU; g++) {
                let line = 0;
                let lineR = 0;
                let lineG = 0;
                let lineB = 0;
                let line2 = 0.0;

                for (let b = 1; b < SIDE_LENGTH_WU; b++) {
                    const index = this.getIndex(r, g, b);

                    // Accumulate line sums
                    line += this.weights[index];
                    lineR += this.momentsR[index];
                    lineG += this.momentsG[index];
                    lineB += this.momentsB[index];
                    line2 += this.moments[index];

                    // Accumulate area sums (2D SAT for the current R-plane)
                    area[b] += line;
                    areaR[b] += lineR;
                    areaG[b] += lineG;
                    areaB[b] += lineB;
                    area2[b] += line2;

                    // Compute 3D SAT using previous R-plane's value
                    const previousIndex = this.getIndex(r - 1, g, b);
                    this.weights[index] = this.weights[previousIndex] + area[b];
                    this.momentsR[index] = this.momentsR[previousIndex] + areaR[b];
                    this.momentsG[index] = this.momentsG[previousIndex] + areaG[b];
                    this.momentsB[index] = this.momentsB[previousIndex] + areaB[b];
                    this.moments[index] = this.moments[previousIndex] + area2[b];
                }
            }
        }
    }

    /**
     * Iteratively creates boxes (clusters) by splitting the box with the highest variance.
     * @param {number} maxColors Maximum number of boxes (colors) to create.
     * @return {CreateBoxesResult} Information about the created boxes.
     * @protected
     */
    createBoxes(maxColors) {
        this.cubes = Array.from({ length: maxColors }, () => new BoxWu());
        const volumeVariance = Array(maxColors).fill(0.0);

        // Initialize the first box to encompass the entire color space
        const firstBox = this.cubes[0];
        firstBox.r0 = firstBox.g0 = firstBox.b0 = 1; // Start from 1 (due to +1 in histogram)
        firstBox.r1 = firstBox.g1 = firstBox.b1 = SIDE_LENGTH_WU - 1; // End at 32
        firstBox.vol = (firstBox.r1 - firstBox.r0 + 1) * (firstBox.g1 - firstBox.g0 + 1) * (firstBox.b1 - firstBox.b0 + 1);
        volumeVariance[0] = this.variance(firstBox); // Calculate initial variance


        let generatedColorCount = 1;
        let next = 0; // Index of the box to cut next

        // Iteratively cut boxes until maxColors is reached or no more cuts are possible
        for (let i = 1; i < maxColors; i++) {
            if (volumeVariance[next] <= 0) { // Stop if the box with highest variance can't be split
                generatedColorCount = i;
                break;
            }
            const currentBox = this.cubes[next];
            const nextBox = this.cubes[i];

            if (this.cut(currentBox, nextBox)) {
                // Successfully cut the box 'next' into 'next' and 'i'
                volumeVariance[next] = currentBox.vol > 1 ? this.variance(currentBox) : 0.0;
                volumeVariance[i] = nextBox.vol > 1 ? this.variance(nextBox) : 0.0;
                generatedColorCount++;
            } else {
                // Could not cut the box 'next', its variance is now effectively 0
                volumeVariance[next] = 0.0;
                i--; // Retry cutting a different box in the next iteration
            }

            // Find the box with the highest variance to cut next
            next = 0;
            let maxVariance = -1.0; // Use -1 to ensure the first positive variance is picked
            for (let j = 0; j < generatedColorCount; j++) { // Only check generated boxes
                if (volumeVariance[j] > maxVariance) {
                    maxVariance = volumeVariance[j];
                    next = j;
                }
            }

            // If max variance is 0 or less, no more boxes can be effectively cut
            if (maxVariance <= 0.0) {
                // generatedColorCount is already correct from the last successful cut
                break;
            }
        }


        return { requestedCount: maxColors, resultCount: generatedColorCount };
    }

    /**
     * Calculates the average color for each generated box.
     * @param {number} colorCount The number of boxes (colors) generated.
     * @return {number[]} Array of ARGB colors representing the palette.
     * @protected
     */
    createResult(colorCount) {
        const colors = [];
        for (let i = 0; i < colorCount; ++i) {
            const cube = this.cubes[i];
            const weight = this.volume(cube, this.weights);

            if (weight > 0) {
                // Calculate average R, G, B for the box
                const r = Math.round(this.volume(cube, this.momentsR) / weight);
                const g = Math.round(this.volume(cube, this.momentsG) / weight);
                const b = Math.round(this.volume(cube, this.momentsB) / weight);
                const color = colorUtils.argbFromRgb(r, g, b);
                colors.push(color);
            }
            // Else: Box has zero weight, likely created but empty after cuts. Ignore it.
        }
        return colors;
    }

    /**
     * Calculates the variance of color within a box.
     * Variance is used to decide which box to split next (higher variance = more diverse colors).
     * @param {BoxWu} cube The box to calculate variance for.
     * @return {number} The variance value. Returns 0 if the box has no weight.
     * @protected
     */
    variance(cube) {
        const dr = this.volume(cube, this.momentsR);
        const dg = this.volume(cube, this.momentsG);
        const db = this.volume(cube, this.momentsB);
        const dw = this.volume(cube, this.weights);

        if (dw === 0) return 0.0; // Avoid division by zero

        // Variance calculation using moments: Var = E[X^2] - (E[X])^2
        // E[X^2] is calculated from the 'moments' array (sum of r*r+g*g+b*b)
        const sumOfSquares = this.volume(cube, this.moments);
        // (E[X])^2 is calculated from the individual moments (dr, dg, db)
        const sumOfMeansSquared = (dr * dr + dg * dg + db * db) / dw;

        return sumOfSquares - sumOfMeansSquared;
    }

    /**
     * Cuts a box ('one') into two ('one' and 'two') along the dimension with the largest range.
     * Finds the optimal cut point within that dimension to maximize variance reduction.
     * @param {BoxWu} one The box to be cut (will be modified to become the lower part).
     * @param {BoxWu} two The box to store the upper part of the cut.
     * @return {boolean} True if the cut was successful, false otherwise (e.g., box too small).
     * @protected
     */
    cut(one, two) {
        const wholeR = this.volume(one, this.momentsR);
        const wholeG = this.volume(one, this.momentsG);
        const wholeB = this.volume(one, this.momentsB);
        const wholeW = this.volume(one, this.weights);

        // Find the best possible cut point and variance reduction for each dimension
        // Note: Range for maximize should be exclusive of the last index (one.r1)
        const maxRResult = this.maximize(one, WuDirections.RED, one.r0 + 1, one.r1, wholeR, wholeG, wholeB, wholeW);
        const maxGResult = this.maximize(one, WuDirections.GREEN, one.g0 + 1, one.g1, wholeR, wholeG, wholeB, wholeW);
        const maxBResult = this.maximize(one, WuDirections.BLUE, one.b0 + 1, one.b1, wholeR, wholeG, wholeB, wholeW);

        let direction;
        let cutLocation = -1;
        const maxR = maxRResult.maximum;
        const maxG = maxGResult.maximum;
        const maxB = maxBResult.maximum;

        // Choose the dimension with the highest variance reduction for the cut
        if (maxR >= maxG && maxR >= maxB) {
            if (maxRResult.cutLocation < 0) return false; // No valid cut found in R
            direction = WuDirections.RED;
            cutLocation = maxRResult.cutLocation;
        } else if (maxG >= maxR && maxG >= maxB) {
            if (maxGResult.cutLocation < 0) return false; // No valid cut found in G
            direction = WuDirections.GREEN;
            cutLocation = maxGResult.cutLocation;
        } else { // maxB is largest
            if (maxBResult.cutLocation < 0) return false; // No valid cut found in B
            direction = WuDirections.BLUE;
            cutLocation = maxBResult.cutLocation;
        }

        // Check if the cut is possible (box must have size > 1 in the cut dimension)
        if (cutLocation < 0) {
            return false;
        }


        // Set up the second box ('two') to be the upper part initially matching 'one'
        two.r1 = one.r1; two.g1 = one.g1; two.b1 = one.b1;
        two.r0 = one.r0; two.g0 = one.g0; two.b0 = one.b0; // Also copy lower bounds initially

        // Adjust boundaries based on the chosen cut direction and location
        // `cutLocation` is the index *before* the cut
        switch (direction) {
            case WuDirections.RED:
                if (one.r1 <= one.r0) return false; // Cannot cut if size is 1
                one.r1 = cutLocation;
                two.r0 = one.r1 + 1; // 'two' starts just after 'one' ends
                break;
            case WuDirections.GREEN:
                if (one.g1 <= one.g0) return false;
                one.g1 = cutLocation;
                two.g0 = one.g1 + 1;
                break;
            case WuDirections.BLUE:
                if (one.b1 <= one.b0) return false;
                one.b1 = cutLocation;
                two.b0 = one.b1 + 1;
                break;
            default:
                throw new Error('unexpected direction ' + direction);
        }

        // Update volumes of the two resulting boxes
        one.vol = (one.r1 - one.r0 + 1) * (one.g1 - one.g0 + 1) * (one.b1 - one.b0 + 1);
        two.vol = (two.r1 - two.r0 + 1) * (two.g1 - two.g0 + 1) * (two.b1 - two.b0 + 1);

        return true; // Cut was successful
    }

    /**
     * Finds the optimal cut point within a dimension ('first' to 'last') that maximizes
     * the sum of variances of the two resulting sub-boxes.
     *
     * @param {BoxWu} cube The box being considered for cutting.
     * @param {WuDirections} direction The dimension ('red', 'green', 'blue') to cut along.
     * @param {number} first The starting index (inclusive) for potential cut points.
     * @param {number} last The ending index (exclusive) for potential cut points.
     * @param {number} wholeR Total red moment of the original box.
     * @param {number} wholeG Total green moment of the original box.
     * @param {number} wholeB Total blue moment of the original box.
     * @param {number} wholeW Total weight (pixel count) of the original box.
     * @return {MaximizeResult} The best cut location and the maximized variance sum.
     * @protected
     */
    maximize(cube, direction, first, last, wholeR, wholeG, wholeB, wholeW) {
        const bottomR = this.bottom(cube, direction, this.momentsR);
        const bottomG = this.bottom(cube, direction, this.momentsG);
        const bottomB = this.bottom(cube, direction, this.momentsB);
        const bottomW = this.bottom(cube, direction, this.weights);

        let max = 0.0;
        let cut = -1;

        // Iterate through possible cut locations 'i' (exclusive of last)
        for (let i = first; i < last; i++) {
            // Calculate moments for the 'lower' half (includes index i)
            let halfR = bottomR + this.top(cube, direction, i, this.momentsR);
            let halfG = bottomG + this.top(cube, direction, i, this.momentsG);
            let halfB = bottomB + this.top(cube, direction, i, this.momentsB);
            let halfW = bottomW + this.top(cube, direction, i, this.weights);

            // Skip if lower half is empty
            if (halfW === 0) continue;

            // Calculate variance contribution of the lower half
            let temp = (halfR * halfR + halfG * halfG + halfB * halfB) / halfW;

            // Calculate moments for the 'upper' half (from i+1 to end)
            let upperR = wholeR - halfR;
            let upperG = wholeG - halfG;
            let upperB = wholeB - halfB;
            let upperW = wholeW - halfW;

            // Skip if upper half is empty
            if (upperW === 0) continue;

            // Add variance contribution of the upper half
            temp += (upperR * upperR + upperG * upperG + upperB * upperB) / upperW;

            // If this cut yields higher total variance, update max
            if (temp > max) {
                max = temp;
                cut = i; // Store the cut location (index *before* the actual cut plane)
            }
        }

        return { cutLocation: cut, maximum: max };
    }

    /**
     * Calculates the sum of moments within a box using the Summed Area Table (SAT).
     * Corrected to use indices starting from 1.
     * @param {BoxWu} cube The box boundaries (r0,g0,b0 are inclusive lower bound index, r1,g1,b1 are inclusive upper bound index).
     * @param {number[]} moment The moment array (SAT) to use (e.g., weights, momentsR).
     * @return {number} The sum of the moment within the box volume.
     * @protected
     */
    volume(cube, moment) {
        // Adjust indices for SAT lookup (SAT index corresponds to upper corner)
        const r1 = cube.r1; const g1 = cube.g1; const b1 = cube.b1;
        const r0 = cube.r0 - 1; const g0 = cube.g0 - 1; const b0 = cube.b0 - 1;

        return (
            moment[this.getIndex(r1, g1, b1)]
            - moment[this.getIndex(r1, g1, b0)]
            - moment[this.getIndex(r1, g0, b1)]
            + moment[this.getIndex(r1, g0, b0)]
            - moment[this.getIndex(r0, g1, b1)]
            + moment[this.getIndex(r0, g1, b0)]
            + moment[this.getIndex(r0, g0, b1)]
            - moment[this.getIndex(r0, g0, b0)]);
    }

    /**
     * Calculates the sum of moments for the 'bottom' face of a box (relative to a dimension), excluding the box itself.
     * Used in the maximize function for efficient calculation.
     * Corrected for indices starting from 1.
     * @param {BoxWu} cube The box boundaries.
     * @param {WuDirections} direction The dimension defining the 'bottom'.
     * @param {number[]} moment The moment array (SAT).
     * @return {number} Sum of moments for the bottom face.
     * @protected
     */
    bottom(cube, direction, moment) {
        // Calculates volume "below" the box's minimum on the specified axis (index r0-1, g0-1, or b0-1)
        const r1 = cube.r1; const g1 = cube.g1; const b1 = cube.b1;
        const r0 = cube.r0 - 1; const g0 = cube.g0 - 1; const b0 = cube.b0 - 1;

        switch (direction) {
            case WuDirections.RED:
                return (
                    -moment[this.getIndex(r0, g1, b1)]
                    + moment[this.getIndex(r0, g1, b0)]
                    + moment[this.getIndex(r0, g0, b1)]
                    - moment[this.getIndex(r0, g0, b0)]);
            case WuDirections.GREEN:
                return (
                    -moment[this.getIndex(r1, g0, b1)]
                    + moment[this.getIndex(r1, g0, b0)]
                    + moment[this.getIndex(r0, g0, b1)]
                    - moment[this.getIndex(r0, g0, b0)]);
            case WuDirections.BLUE:
                return (
                    -moment[this.getIndex(r1, g1, b0)]
                    + moment[this.getIndex(r1, g0, b0)]
                    + moment[this.getIndex(r0, g1, b0)]
                    - moment[this.getIndex(r0, g0, b0)]);
            default:
                throw new Error('unexpected direction ' + direction);
        }
    }

    /**
     * Calculates the sum of moments for the volume slice at a specific position along a dimension, within the box's other bounds.
     * Used in the maximize function for efficient calculation.
     * Corrected for indices starting from 1.
     * @param {BoxWu} cube The box boundaries.
     * @param {WuDirections} direction The dimension defining the slice.
     * @param {number} position The index along the dimension defining the slice (e.g., a specific r value).
     * @param {number[]} moment The moment array (SAT).
     * @return {number} Sum of moments for the slice at 'position'.
     * @protected
     */
    top(cube, direction, position, moment) {
        // Calculates volume slice at 'position' on the specified axis
        const g1 = cube.g1; const b1 = cube.b1;
        const r0 = cube.r0 - 1; const g0 = cube.g0 - 1; const b0 = cube.b0 - 1;
        const r1 = cube.r1; // Use r1 from cube for bounds check

        switch (direction) {
            case WuDirections.RED:
                if (position > r1) position = r1; // Clamp position
                return (
                    moment[this.getIndex(position, g1, b1)]
                    - moment[this.getIndex(position, g1, b0)]
                    - moment[this.getIndex(position, g0, b1)]
                    + moment[this.getIndex(position, g0, b0)]);
            case WuDirections.GREEN:
                if (position > g1) position = g1;
                return (
                    moment[this.getIndex(r1, position, b1)]
                    - moment[this.getIndex(r1, position, b0)]
                    - moment[this.getIndex(r0, position, b1)]
                    + moment[this.getIndex(r0, position, b0)]);
            case WuDirections.BLUE:
                if (position > b1) position = b1;
                return (
                    moment[this.getIndex(r1, g1, position)]
                    - moment[this.getIndex(r1, g0, position)]
                    - moment[this.getIndex(r0, g1, position)]
                    + moment[this.getIndex(r0, g0, position)]);
            default:
                throw new Error('unexpected direction ' + direction);
        }
    }

    /**
     * Calculates the 1D index into the moment arrays from 3D quantized coordinates.
     * Assumes coordinates r, g, b are in the range [1, 33] or [0, 32] for SAT lookups.
     * @param {number} r Red index.
     * @param {number} g Green index.
     * @param {number} b Blue index.
     * @return {number} The 1D index. Returns 0 if any index is out of bounds (less than 0).
     * @protected
     */
    getIndex(r, g, b) {
        // Handle boundary conditions for SAT lookups (index 0 represents volume up to -1)
        if (r < 0 || g < 0 || b < 0) {
            return 0;
        }
        // Ensure indices do not exceed bounds
        r = Math.min(r, SIDE_LENGTH_WU - 1);
        g = Math.min(g, SIDE_LENGTH_WU - 1);
        b = Math.min(b, SIDE_LENGTH_WU - 1);

        return r * (SIDE_LENGTH_WU * SIDE_LENGTH_WU) + g * SIDE_LENGTH_WU + b;
    }
}

/**
 * Helper class storing distance and index, used for sorting clusters in WSMeans.
 * @private
 */
class DistanceAndIndexWsmeans {
    distance = -1.0;
    index = -1;
}

/**
 * PointProvider implementation using the CIE Lab color space for WSMeans.
 * @implements {PointProvider}
 */
class LabPointProvider {
    /**
     * Converts an ARGB color integer to a 3D point in Lab space [L*, a*, b*].
     * @param {number} argb ARGB color integer.
     * @return {number[]} Lab point [L*, a*, b*].
     */
    fromInt(argb) {
        return colorUtils.labFromArgb(argb);
    }

    /**
     * Converts a 3D point in Lab space [L*, a*, b*] back to an ARGB color integer.
     * @param {number[]} point Lab point [L*, a*, b*].
     * @return {number} ARGB color integer.
     */
    toInt(point) {
        return colorUtils.argbFromLab(point[0], point[1], point[2]);
    }

    /**
     * Calculates the squared Euclidean distance between two points in Lab space.
     * Squared distance is used for efficiency as sqrt is not needed for comparison.
     * @param {number[]} from First Lab point [L*, a*, b*].
     * @param {number[]} to Second Lab point [L*, a*, b*].
     * @return {number} Squared distance between the points.
     */
    distance(from, to) {
        const dL = from[0] - to[0];
        const dA = from[1] - to[1];
        const dB = from[2] - to[2];
        return dL * dL + dA * dA + dB * dB;
    }
}


/**
 * Implementation of the Weighted K-Means (specifically, Weighted Square Means - WSMeans)
 * color quantization algorithm. Used to refine results from an initial quantizer like Wu.
 */
class QuantizerWsmeans {
    /**
     * Quantizes pixels using WSMeans, starting from initial clusters.
     *
     * @param {number[]} inputPixels Array of ARGB color integers.
     * @param {number[]} startingClusters Array of ARGB integers representing initial cluster centers.
     * @param {number} maxColors Maximum number of clusters (colors) to produce.
     * @return {Map<number, number>} Map where keys are the final ARGB cluster centers and values are the pixel counts (population) belonging to each cluster.
     */
    static quantize(inputPixels, startingClusters, maxColors) {
        const pixelToCount = new Map();
        const points = []; // Points in Lab space
        const pixels = []; // Corresponding ARGB values for points
        const pointProvider = new LabPointProvider();

        // Aggregate unique pixels and their counts, convert to Lab points
        for (const inputPixel of inputPixels) {
            if (colorUtils.alphaFromArgb(inputPixel) < 255) continue; // Ignore transparent

            const currentPixelCount = pixelToCount.get(inputPixel);
            if (currentPixelCount === undefined) {
                pixelToCount.set(inputPixel, 1);
                points.push(pointProvider.fromInt(inputPixel));
                pixels.push(inputPixel);
            } else {
                pixelToCount.set(inputPixel, currentPixelCount + 1);
            }
        }

        // Create array of counts corresponding to the 'points' array
        const counts = pixels.map(pixel => pixelToCount.get(pixel));

        // Determine the actual number of clusters to use
        let clusterCount = Math.min(maxColors, points.length);
        if (startingClusters.length > 0) {
            clusterCount = Math.min(clusterCount, startingClusters.length);
        }

        // Initialize cluster centers (in Lab space)
        let clusters = startingClusters
            .slice(0, clusterCount) // Use only the required number of starting clusters
            .map(clusterArgb => pointProvider.fromInt(clusterArgb));

        // If no starting clusters provided or insufficient starting clusters, initialize randomly
        const initialClusterCount = clusters.length;
        const additionalClustersNeeded = clusterCount - initialClusterCount;

        if (initialClusterCount === 0 && points.length > 0) {
            console.warn("WSMeans: No starting clusters provided, using random initialization from pixels.");
            const randomIndexes = new Set();
            while (randomIndexes.size < clusterCount && randomIndexes.size < points.length) {
                randomIndexes.add(Math.floor(Math.random() * points.length));
            }
            clusters = Array.from(randomIndexes).map(index => points[index]);
            clusterCount = clusters.length; // Update actual cluster count
        } else if (additionalClustersNeeded > 0 && points.length > initialClusterCount) {
            console.warn(`WSMeans: Insufficient starting clusters (${initialClusterCount} provided, ${clusterCount} needed). Adding random initial clusters.`);
            // Add more random clusters, trying not to duplicate existing points used as starts
            const existingPointsAsClusters = new Set(clusters.map(p => JSON.stringify(p)));
            const availablePoints = points.filter(p => !existingPointsAsClusters.has(JSON.stringify(p)));
            const randomIndexes = new Set();
            while (randomIndexes.size < additionalClustersNeeded && randomIndexes.size < availablePoints.length) {
                randomIndexes.add(Math.floor(Math.random() * availablePoints.length));
            }
            for (const index of randomIndexes) {
                clusters.push(availablePoints[index]);
            }
            clusterCount = clusters.length; // Update actual cluster count
        } else if (points.length <= initialClusterCount) {
            // Fewer unique points than requested clusters, reduce cluster count
            clusterCount = points.length;
            clusters = clusters.slice(0, clusterCount);
        }

        // Handle edge case: no points to cluster
        if (clusterCount === 0 || points.length === 0) {
            return new Map();
        }


        // Assign each point to the closest initial cluster
        const clusterIndices = points.map(point => {
            let minDistance = Infinity;
            let index = 0;
            for (let i = 0; i < clusterCount; i++) {
                // Handle potential undefined clusters if initialization failed unexpectedly
                if (!clusters[i]) continue;
                const distance = pointProvider.distance(point, clusters[i]);
                if (distance < minDistance) {
                    minDistance = distance;
                    index = i;
                }
            }
            return index;
        });

        // --- K-Means Iterations ---
        const componentASums = Array(clusterCount).fill(0.0); // L* sums
        const componentBSums = Array(clusterCount).fill(0.0); // a* sums
        const componentCSums = Array(clusterCount).fill(0.0); // b* sums
        const clusterPixelCounts = Array(clusterCount).fill(0);

        for (let iter = 0; iter < MAX_ITERATIONS_WSMEANS; iter++) {
            // Reset sums for recalculating centroids
            componentASums.fill(0.0);
            componentBSums.fill(0.0);
            componentCSums.fill(0.0);
            clusterPixelCounts.fill(0);

            // --- Update Centroids ---
            for (let i = 0; i < points.length; i++) {
                const clusterIndex = clusterIndices[i];
                // Handle potential out-of-bounds index if clusterCount was reduced
                if (clusterIndex >= clusterCount) continue;
                const point = points[i];
                const count = counts[i];

                clusterPixelCounts[clusterIndex] += count;
                componentASums[clusterIndex] += point[0] * count;
                componentBSums[clusterIndex] += point[1] * count;
                componentCSums[clusterIndex] += point[2] * count;
            }

            // Calculate new cluster centers (centroids)
            let centroidMoved = false;
            for (let i = 0; i < clusterCount; i++) {
                const pixelCount = clusterPixelCounts[i];
                if (pixelCount === 0) {
                    // Empty cluster - keep its position (or reinitialize if desired)
                    continue;
                }
                // Handle potential undefined clusters
                if (!clusters[i]) {
                    clusters[i] = [0, 0, 0]; // Initialize if somehow undefined
                }

                const newL = componentASums[i] / pixelCount;
                const newA = componentBSums[i] / pixelCount;
                const newB = componentCSums[i] / pixelCount;
                const newCluster = [newL, newA, newB];

                // Check if centroid moved significantly
                if (pointProvider.distance(newCluster, clusters[i]) > 1e-5) { // Small threshold for movement
                    centroidMoved = true;
                }
                clusters[i] = newCluster;
            }

            // If centroids didn't move, convergence is reached
            if (!centroidMoved && iter > 0) {
                break;
            }


            // --- Assign Points to New Centroids ---
            let pointsMoved = 0;
            for (let i = 0; i < points.length; i++) {
                const point = points[i];
                const previousClusterIndex = clusterIndices[i];

                // Handle potential out-of-bounds index
                if (previousClusterIndex >= clusterCount || !clusters[previousClusterIndex]) continue;

                let minDistance = pointProvider.distance(point, clusters[previousClusterIndex]);
                let newClusterIndex = previousClusterIndex;

                // Find the closest new centroid
                for (let j = 0; j < clusterCount; j++) {
                    // Handle potential undefined clusters
                    if (!clusters[j]) continue;
                    const distance = pointProvider.distance(point, clusters[j]);
                    if (distance < minDistance) {
                        minDistance = distance;
                        newClusterIndex = j;
                    }
                }

                // Reassign point if a closer centroid was found
                if (newClusterIndex !== previousClusterIndex) {
                    pointsMoved++;
                    clusterIndices[i] = newClusterIndex;
                }
            }

            // Check for convergence (no points reassigned)
            if (pointsMoved === 0 && iter > 0) {
                break;
            }
        }

        // --- Create Final Result Map ---
        const argbToPopulation = new Map();
        // Recalculate final populations based on the last assignment
        clusterPixelCounts.fill(0);
        for (let i = 0; i < points.length; i++) {
            // Handle potential out-of-bounds index
            if (clusterIndices[i] >= clusterCount) continue;
            clusterPixelCounts[clusterIndices[i]] += counts[i];
        }

        for (let i = 0; i < clusterCount; i++) {
            const count = clusterPixelCounts[i];
            if (count === 0) continue; // Skip empty clusters

            // Handle potential undefined clusters
            if (!clusters[i]) continue;

            const clusterArgb = pointProvider.toInt(clusters[i]);
            // Add population to existing color if it maps to the same ARGB
            argbToPopulation.set(clusterArgb, (argbToPopulation.get(clusterArgb) || 0) + count);
        }

        return argbToPopulation;
    }
}

/**
 * Quantizer using a combination of Wu for initial clustering and WSMeans for refinement.
 */
class QuantizerCelebi {
    /**
     * Quantizes pixels using Wu followed by WSMeans.
     *
     * @param {number[]} pixels Array of ARGB color integers.
     * @param {number} maxColors Maximum number of colors desired.
     * @return {Map<number, number>} Map of final ARGB colors to their pixel counts.
     */
    static quantize(pixels, maxColors) {
        const wu = new QuantizerWu();
        // Wu gives initial cluster centers (ARGB)
        const wuResult = wu.quantize(pixels, maxColors);

        if (wuResult.length === 0) {
            // Wu quantizer failed or produced no colors
            console.warn("QuantizerCelebi: Wu quantization returned no colors. Returning empty map.");
            return new Map();
        }

        // Refine using WSMeans with Wu results as starting points
        return QuantizerWsmeans.quantize(pixels, wuResult, maxColors);
    }
}


/**
 * @section Theme Generation
 * @description Classes and functions for generating Material Design dynamic themes.
 */

/**
 * @typedef {object} CustomColor
 * @property {number} value - ARGB value of the custom color.
 * @property {string} name - Unique name for the custom color (used for CSS variables).
 * @property {boolean} blend - If true, blend the custom color with the theme's source color.
 *                             If false, use the color directly.
 */

/**
 * @typedef {object} ColorGroup
 * @property {number} color - The main color ARGB value for this group (e.g., primary).
 * @property {number} onColor - The corresponding 'on' color ARGB value (e.g., onPrimary).
 * @property {number} colorContainer - The corresponding container color ARGB value (e.g., primaryContainer).
 * @property {number} onColorContainer - The corresponding 'on' container color ARGB value (e.g., onPrimaryContainer).
 */

/**
 * @typedef {object} CustomColorGroup
 * @property {CustomColor} color - The original CustomColor definition.
 * @property {number} value - The ARGB value of the custom color after potential blending.
 * @property {ColorGroup} light - The ColorGroup generated for the light theme.
 * @property {ColorGroup} dark - The ColorGroup generated for the dark theme.
 */

/**
 * @typedef {object} Theme
 * @property {number} source - The primary source ARGB color used to generate the theme.
 * @property {{light: DynamicScheme, dark: DynamicScheme}} schemes - The generated light and dark DynamicScheme configurations.
 * @property {CorePalettes} palettes - The set of core TonalPalettes (primary, secondary, etc.).
 * @property {CustomColorGroup[]} customColors - Array of processed custom color groups included in the theme.
 * @property {object} [seedColors] - The original seed colors provided, if using `themeFromColors`.
 * @property {number} [seedColors.primary] - Primary seed ARGB.
 * @property {number} [seedColors.secondary] - Secondary seed ARGB (if provided).
 * @property {number} [seedColors.tertiary] - Tertiary seed ARGB (if provided).
 */

/**
 * Represents a pairing between two dynamic color roles and the desired
 * tone delta (difference in L*) between them. Used to ensure contrast
 * and visual separation.
 * @private
 */
class ToneDeltaPair {
    /** @type {DynamicColor} The first color role in the pair. */
    roleA;
    /** @type {DynamicColor} The second color role in the pair. */
    roleB;
    /** @type {number} The desired difference in L* tone between roleA and roleB. */
    delta;
    /** @type {'lighter' | 'darker' | 'nearer' | 'farther'} Specifies which role should be closer to the background tone. */
    polarity;
    /** @type {boolean} If true, the tones should stay together even if one pushes the other into the 50-59 L* range. */
    stayTogether;
    /** @type {DynamicColor} The background color role against which polarity is measured. */
    background;


    /**
     * @param {DynamicColor} roleA
     * @param {DynamicColor} roleB
     * @param {number} delta
     * @param {'lighter' | 'darker' | 'nearer' | 'farther'} polarity
     * @param {boolean} stayTogether
     * @param {DynamicColor} background Background color role for polarity check.
     */
    constructor(roleA, roleB, delta, polarity, stayTogether, background) {
        this.roleA = roleA;
        this.roleB = roleB;
        this.delta = delta;
        this.polarity = polarity;
        this.stayTogether = stayTogether;
        this.background = background; // Store the background reference
    }
}

/**
 * Represents a color role within a dynamic theme (e.g., "primary", "onSurface").
 * Its actual ARGB value depends on the specific DynamicScheme (light/dark mode, contrast level)
 * and potential contrast requirements against background colors.
 */
class DynamicColor {
    /** Name of the color role (e.g., 'primary', 'on_surface'). */
    name;
    /** Function that returns the TonalPalette for this color role based on the scheme. */
    palette;
    /** Function that returns the base L* tone for this color role based on the scheme. */
    tone;
    /** Indicates if this color role is typically used as a background. */
    isBackground;
    /** Optional function returning another DynamicColor used as the primary background for contrast checks. */
    background;
    /** Optional function returning a second DynamicColor background for contrast checks. */
    secondBackground;
    /** Optional ContrastCurve defining contrast requirements against the background(s). */
    contrastCurve;
    /** Optional function returning a ToneDeltaPair if this color's tone depends on another color's tone. */
    toneDeltaPairProvider; // Renamed from toneDeltaPair to avoid conflict with property name
    /** Cache for HCT objects to avoid recalculation. Maps DynamicScheme to Hct. */
    hctCache = new Map();

    /**
     * @param {string} name
     * @param {(scheme: DynamicScheme) => TonalPalette} palette
     * @param {(scheme: DynamicScheme) => number} tone
     * @param {boolean} isBackground
     * @param {(scheme: DynamicScheme) => DynamicColor} [background]
     * @param {(scheme: DynamicScheme) => DynamicColor} [secondBackground]
     * @param {ContrastCurve} [contrastCurve]
     * @param {(scheme: DynamicScheme) => ToneDeltaPair} [toneDeltaPairProvider]
     * @hideconstructor
     */
    constructor(name, palette, tone, isBackground, background, secondBackground, contrastCurve, toneDeltaPairProvider) {
        this.name = name;
        this.palette = palette;
        this.tone = tone;
        this.isBackground = isBackground;
        this.background = background;
        this.secondBackground = secondBackground;
        this.contrastCurve = contrastCurve;
        this.toneDeltaPairProvider = toneDeltaPairProvider;

        // Validation
        if (!background && (secondBackground || contrastCurve)) {
            throw new Error(`DynamicColor ${name}: Background must be provided if secondBackground or contrastCurve is set.`);
        }
        if (background && !contrastCurve && !toneDeltaPairProvider) { // Allow background without curve if it's for a delta pair
            console.warn(`DynamicColor ${name}: Background provided without a contrastCurve and not part of a ToneDeltaPair.`);
        }
    }

    /**
     * Factory method to create a DynamicColor instance.
     * @param {object} args Configuration arguments.
     * @param {string} args.name Name of the color role.
     * @param {(scheme: DynamicScheme) => TonalPalette} args.palette Palette function.
     * @param {(scheme: DynamicScheme) => number} args.tone Base tone function.
     * @param {boolean} [args.isBackground=false] Is this a background color?
     * @param {(scheme: DynamicScheme) => DynamicColor} [args.background] Primary background dependency.
     * @param {(scheme: DynamicScheme) => DynamicColor} [args.secondBackground] Secondary background dependency.
     * @param {ContrastCurve} [args.contrastCurve] Contrast requirements.
     * @param {(scheme: DynamicScheme) => ToneDeltaPair} [args.toneDeltaPairProvider] Tone delta relationship provider.
     * @return {DynamicColor} A new DynamicColor instance.
     */
    static fromPalette(args) {
        // Validate required fields
        if (!args.name || !args.palette || args.tone === undefined) {
            throw new Error("DynamicColor.fromPalette requires 'name', 'palette', and 'tone' arguments.");
        }
        return new DynamicColor(
            args.name,
            args.palette,
            args.tone,
            args.isBackground || false,
            args.background,
            args.secondBackground,
            args.contrastCurve,
            args.toneDeltaPairProvider // Pass the provider function directly
        );
    }

    /**
     * Gets the ARGB integer value of this color role for a specific scheme.
     * @param {DynamicScheme} scheme The scheme configuration.
     * @return {number} ARGB color value.
     */
    getArgb(scheme) {
        return this.getHct(scheme).toInt();
    }

    /**
     * Gets the HCT object representing this color role for a specific scheme.
     * Uses caching.
     * @param {DynamicScheme} scheme The scheme configuration.
     * @return {Hct} HCT color object.
     */
    getHct(scheme) {
        const cachedAnswer = this.hctCache.get(scheme);
        if (cachedAnswer) {
            return cachedAnswer;
        }

        // Calculate the final tone required for this scheme
        const finalTone = this.getTone(scheme);
        // Get the palette for this scheme
        const currentPalette = this.palette(scheme);
        // Get the HCT color from the palette at the final tone
        const hct = currentPalette.getHct(finalTone);

        // Cache the result (simple Map acts somewhat like LRU here)
        if (this.hctCache.size > 4) { // Limit cache size
            // Find the first key and delete it (basic LRU simulation)
            const firstKey = this.hctCache.keys().next().value;
            if (firstKey) this.hctCache.delete(firstKey);
        }
        this.hctCache.set(scheme, hct);
        return hct;
    }

    /**
     * Calculates the final L* tone for this color role in the given scheme,
     * considering contrast requirements and tone delta pairings.
     * @param {DynamicScheme} scheme The scheme configuration.
     * @return {number} The final L* tone (0-100).
     */
    getTone(scheme) {
        const decreasingContrast = scheme.contrastLevel < 0.0;

        // --- Case 1: Tone depends on another color via ToneDeltaPair ---
        if (this.toneDeltaPairProvider) {
            const toneDeltaPair = this.toneDeltaPairProvider(scheme);
            if (!toneDeltaPair || !toneDeltaPair.roleA || !toneDeltaPair.roleB || !toneDeltaPair.background) {
                console.error(`DynamicColor ${this.name}: Invalid ToneDeltaPair provided or missing background dependency. Falling back to base tone.`);
                return this.tone(scheme); // Fallback to base tone
            }
            const { roleA, roleB, delta, polarity, stayTogether, background } = toneDeltaPair;


            const bgTone = background.getTone(scheme);

            // Determine which role is 'nearer' to the background tone
            const aIsNearer = polarity === 'nearer' ||
                (polarity === 'lighter' && !scheme.isDark) ||
                (polarity === 'darker' && scheme.isDark);

            const nearer = aIsNearer ? roleA : roleB;
            const farther = aIsNearer ? roleB : roleA;
            const amNearer = this.name === nearer.name;
            const expansionDir = scheme.isDark ? 1 : -1; // +1 for dark (expand away from 0), -1 for light (expand away from 100)

            // Ensure contrast curves exist for roles in the pair
            if (!nearer.contrastCurve || !farther.contrastCurve) {
                console.error(`DynamicColor ${this.name}: Missing contrastCurve for role ${nearer.contrastCurve ? farther.name : nearer.name} in ToneDeltaPair. Falling back.`);
                // Attempt fallback using a default medium contrast if possible, else base tone
                const fallbackRatio = 4.5;
                return Contrast.ratioOfTones(bgTone, this.tone(scheme)) >= fallbackRatio ?
                    this.tone(scheme) : DynamicColor.foregroundTone(bgTone, fallbackRatio);
            }


            // Target contrast ratios for nearer/farther roles against the background
            const nContrast = nearer.contrastCurve.get(scheme.contrastLevel);
            const fContrast = farther.contrastCurve.get(scheme.contrastLevel);

            // Initial tones based on individual requirements
            const nBaseTone = nearer.tone(scheme);
            const fBaseTone = farther.tone(scheme);

            let nTone = Contrast.ratioOfTones(bgTone, nBaseTone) >= nContrast ?
                nBaseTone :
                DynamicColor.foregroundTone(bgTone, nContrast);
            let fTone = Contrast.ratioOfTones(bgTone, fBaseTone) >= fContrast ?
                fBaseTone :
                DynamicColor.foregroundTone(bgTone, fContrast);

            // If contrast is decreasing, ensure we use tones specifically calculated for foreground
            if (decreasingContrast) {
                nTone = DynamicColor.foregroundTone(bgTone, nContrast);
                fTone = DynamicColor.foregroundTone(bgTone, fContrast);
            }


            // --- Adjust tones to meet the required delta ---
            const currentDelta = Math.abs(fTone - nTone);
            if (currentDelta < delta) {
                // Expand farther tone first
                fTone = mathUtils.clampDouble(0, 100, nTone + delta * expansionDir);
                // If farther hits boundary, adjust nearer tone
                if (Math.abs(fTone - nTone) < delta) {
                    nTone = mathUtils.clampDouble(0, 100, fTone - delta * expansionDir);
                }
            }


            // --- Avoid the awkward 50-59 L* range ---
            // Define helper to adjust a tone out of the 50-59 range
            const avoid50s = (toneToAdjust) => {
                if (50 <= toneToAdjust && toneToAdjust < 60) {
                    return expansionDir > 0 ? 60.0 : 49.0;
                }
                return toneToAdjust;
            }

            const nToneAdjusted = avoid50s(nTone);
            const fToneAdjusted = avoid50s(fTone);

            // Scenario 1: Only Nearer was in 50s
            if (nToneAdjusted !== nTone && fToneAdjusted === fTone) {
                nTone = nToneAdjusted;
                // Ensure delta is still met after adjusting nearer
                if (Math.abs(fTone - nTone) < delta) {
                    fTone = mathUtils.clampDouble(0, 100, nTone + delta * expansionDir);
                }
            }
            // Scenario 2: Only Farther was in 50s
            else if (fToneAdjusted !== fTone && nToneAdjusted === nTone) {
                // If stayTogether, adjusting farther implies adjusting nearer too
                if (stayTogether) {
                    nTone = avoid50s(nTone); // Adjust nearer as well
                    fTone = mathUtils.clampDouble(0, 100, nTone + delta * expansionDir);
                } else {
                    fTone = fToneAdjusted;
                    // Ensure delta is still met after adjusting farther
                    if (Math.abs(fTone - nTone) < delta) {
                        nTone = mathUtils.clampDouble(0, 100, fTone - delta * expansionDir);
                    }
                }
            }
            // Scenario 3: Both were in 50s (or adjusted into conflict)
            else if (nToneAdjusted !== nTone && fToneAdjusted !== fTone) {
                nTone = nToneAdjusted;
                fTone = mathUtils.clampDouble(0, 100, nTone + delta * expansionDir); // Recalculate farther based on adjusted nearer
            }


            return amNearer ? nTone : fTone;
        }
        // --- Case 2: No ToneDeltaPair, handle standard contrast requirements ---
        else {
            let answer = this.tone(scheme); // Start with the base tone

            // If no background dependency or no contrast curve, return base tone
            if (!this.background || !this.contrastCurve) {
                return answer;
            }

            const bg = this.background(scheme);
            const bgTone = bg.getTone(scheme);

            // Check primary background contrast
            const requiredRatio = this.contrastCurve.get(scheme.contrastLevel);

            // Check if current tone meets contrast against primary background
            const currentRatio = Contrast.ratioOfTones(bgTone, answer);
            if (currentRatio < requiredRatio) {
                answer = DynamicColor.foregroundTone(bgTone, requiredRatio);
            } else if (decreasingContrast) {
                // If contrast is decreasing, always use the calculated foreground tone
                // to ensure reduction happens smoothly relative to background.
                answer = DynamicColor.foregroundTone(bgTone, requiredRatio);
            }


            // --- Adjustments for specific scenarios ---

            // Adjust if this is a background color itself landing in the 50-59 range
            if (this.isBackground && 50 <= answer && answer < 60) {
                // Try tone 49 first if it meets contrast, otherwise use 60
                answer = Contrast.ratioOfTones(49.0, bgTone) >= requiredRatio ? 49.0 : 60.0;
                // Recalculate if needed for decreasing contrast
                if (decreasingContrast) {
                    answer = DynamicColor.foregroundTone(bgTone, requiredRatio);
                }
            }

            // Handle dual backgrounds (contrast against both)
            if (this.secondBackground) {
                const bg2 = this.secondBackground(scheme);
                const bgTone2 = bg2.getTone(scheme);

                const upperBgTone = Math.max(bgTone, bgTone2);
                const lowerBgTone = Math.min(bgTone, bgTone2);

                // Check if current answer meets contrast against both backgrounds
                const meetsUpper = Contrast.ratioOfTones(upperBgTone, answer) >= requiredRatio;
                const meetsLower = Contrast.ratioOfTones(lowerBgTone, answer) >= requiredRatio;

                if (!meetsUpper || !meetsLower) {
                    // If contrast fails against either, find best alternative
                    const lighterOption = Contrast.lighterUnsafe(upperBgTone, requiredRatio); // Use unsafe for wider search
                    const darkerOption = Contrast.darkerUnsafe(lowerBgTone, requiredRatio);   // Use unsafe

                    // Determine preferred direction (light or dark foreground)
                    const prefersLight = DynamicColor.tonePrefersLightForeground(bgTone) ||
                        DynamicColor.tonePrefersLightForeground(bgTone2);

                    // Check actual contrast provided by options
                    const lightRatio = Contrast.ratioOfTones(upperBgTone, lighterOption);
                    const darkRatio = Contrast.ratioOfTones(lowerBgTone, darkerOption);
                    const lightMet = lightRatio >= requiredRatio - 0.01; // Allow small tolerance
                    const darkMet = darkRatio >= requiredRatio - 0.01;

                    // Choose best available option based on preference and meeting contrast
                    if (prefersLight) {
                        answer = lightMet ? lighterOption : (darkMet ? darkerOption : lighterOption); // Prefer light if possible, else dark, else light fallback
                    } else { // Prefers dark
                        answer = darkMet ? darkerOption : (lightMet ? lightOption : darkerOption); // Prefer dark if possible, else light, else dark fallback
                    }

                    // Re-evaluate if contrast is decreasing - recalculate preferred option
                    if (decreasingContrast) {
                        const primaryBg = prefersLight ? upperBgTone : lowerBgTone;
                        const secondaryBg = prefersLight ? lowerBgTone : upperBgTone;
                        answer = DynamicColor.foregroundTone(primaryBg, requiredRatio);
                        // Check if this also works for the secondary background
                        if (Contrast.ratioOfTones(secondaryBg, answer) < requiredRatio) {
                            // If not, try foreground tone for secondary background
                            answer = DynamicColor.foregroundTone(secondaryBg, requiredRatio);
                        }
                    }
                }
            }

            return answer;
        }
    }

    /**
     * Calculates the optimal foreground tone (lighter or darker) to achieve
     * a target contrast ratio against a background tone.
     *
     * @param {number} bgTone Background L* tone (0-100).
     * @param {number} ratio Target contrast ratio (1-21).
     * @return {number} The calculated foreground L* tone (0-100).
     * @protected
     */
    static foregroundTone(bgTone, ratio) {
        // Find the lightest and darkest tones that meet the ratio (using unsafe variants for fallback)
        const lighterTone = Contrast.lighterUnsafe(bgTone, ratio);
        const darkerTone = Contrast.darkerUnsafe(bgTone, ratio);

        // Calculate the actual contrast ratios achieved by these tones
        const lighterRatio = Contrast.ratioOfTones(lighterTone, bgTone);
        const darkerRatio = Contrast.ratioOfTones(darkerTone, bgTone);

        // Determine if the background tone generally prefers a light foreground
        const prefersLight = DynamicColor.tonePrefersLightForeground(bgTone);

        // Check if one option clearly meets the ratio (within tolerance) and the other doesn't
        const lightMet = lighterRatio >= ratio - 0.01;
        const darkMet = darkerRatio >= ratio - 0.01;

        if (lightMet && darkMet) {
            // Both meet ratio: choose based on preference, prioritizing closer contrast delta
            const lightDelta = Math.abs(lighterRatio - ratio);
            const darkDelta = Math.abs(darkerRatio - ratio);
            if (prefersLight) {
                return lightDelta <= darkDelta + 0.1 ? lighterTone : darkerTone; // Favor preferred if close
            } else {
                return darkDelta <= lightDelta + 0.1 ? darkerTone : lighterTone; // Favor preferred if close
            }

        } else if (lightMet) {
            return lighterTone; // Only light option works
        } else if (darkMet) {
            return darkerTone; // Only dark option works
        } else {
            // Neither meets ratio (likely due to unsafe fallbacks): choose the one with higher actual contrast
            return lighterRatio >= darkerRatio ? lighterTone : darkerTone;
        }
    }

    /**
     * Determines if a given tone generally prefers a light foreground for contrast.
     * Typically, tones below 60 prefer light foregrounds.
     * @param {number} tone L* tone (0-100).
     * @return {boolean} True if light foreground is preferred.
     * @protected
     */
    static tonePrefersLightForeground(tone) {
        return Math.round(tone) < 60;
    }

    /**
     * Determines if a given tone allows a light foreground (ensuring sufficient separation).
     * Typically, tones below 49 allow light foregrounds without ambiguity.
     * @param {number} tone L* tone (0-100).
     * @return {boolean} True if light foreground is allowed.
     * @protected
     */
    static toneAllowsLightForeground(tone) {
        return Math.round(tone) <= 49;
    }

    /**
     * Adjusts a tone slightly if it prefers a light foreground but doesn't strictly allow it
     * (i.e., it's in the 50-59 range). Moves it to 49.0 to ensure better contrast perception.
     * @param {number} tone L* tone (0-100).
     * @return {number} The adjusted or original tone.
     * @protected
     */
    static enableLightForeground(tone) {
        if (DynamicColor.tonePrefersLightForeground(tone) && !DynamicColor.toneAllowsLightForeground(tone)) {
            return 49.0;
        }
        return tone;
    }
}


/**
 * Defines the standard Material Design dynamic color roles using DynamicColor instances.
 * Each role specifies its palette, base tone, background dependencies, and contrast curves.
 * @namespace MaterialDynamicColors
 */
const MaterialDynamicColors = {
    // --- Constants ---
    contentAccentToneDelta: 15.0,

    // --- Helper ---
    highestSurface(scheme) {
        return scheme.isDark ? this.surfaceBright : this.surfaceDim;
    },

    // --- Palette Key Colors (Internal use or debugging) ---
    primaryPaletteKeyColor: DynamicColor.fromPalette({
        name: 'primary_palette_key_color',
        palette: scheme => scheme.primaryPalette,
        tone: scheme => scheme.primaryPalette.keyColor.tone,
    }),
    secondaryPaletteKeyColor: DynamicColor.fromPalette({
        name: 'secondary_palette_key_color',
        palette: scheme => scheme.secondaryPalette,
        tone: scheme => scheme.secondaryPalette.keyColor.tone,
    }),
    tertiaryPaletteKeyColor: DynamicColor.fromPalette({
        name: 'tertiary_palette_key_color',
        palette: scheme => scheme.tertiaryPalette,
        tone: scheme => scheme.tertiaryPalette.keyColor.tone,
    }),
    neutralPaletteKeyColor: DynamicColor.fromPalette({
        name: 'neutral_palette_key_color',
        palette: scheme => scheme.neutralPalette,
        tone: scheme => scheme.neutralPalette.keyColor.tone,
    }),
    neutralVariantPaletteKeyColor: DynamicColor.fromPalette({
        name: 'neutral_variant_palette_key_color',
        palette: scheme => scheme.neutralVariantPalette,
        tone: scheme => scheme.neutralVariantPalette.keyColor.tone,
    }),
    errorPaletteKeyColor: DynamicColor.fromPalette({ // Added for completeness
        name: 'error_palette_key_color',
        palette: scheme => scheme.errorPalette,
        tone: scheme => scheme.errorPalette.keyColor.tone,
    }),

    // --- Core Semantic Colors ---
    background: DynamicColor.fromPalette({
        name: 'background',
        palette: scheme => scheme.neutralPalette,
        tone: scheme => scheme.isDark ? 6 : 98,
        isBackground: true,
    }),
    onBackground: DynamicColor.fromPalette({
        name: 'on_background',
        palette: scheme => scheme.neutralPalette,
        tone: scheme => scheme.isDark ? 90 : 10,
        background: scheme => MaterialDynamicColors.background,
        contrastCurve: new ContrastCurve(3, 3, 4.5, 7),
    }),
    surface: DynamicColor.fromPalette({
        name: 'surface',
        palette: scheme => scheme.neutralPalette,
        tone: scheme => scheme.isDark ? 6 : 98,
        isBackground: true,
    }),
    surfaceDim: DynamicColor.fromPalette({
        name: 'surface_dim',
        palette: scheme => scheme.neutralPalette,
        tone: scheme => scheme.isDark ? 6 : (new ContrastCurve(87, 87, 80, 75)).get(scheme.contrastLevel),
        isBackground: true,
    }),
    surfaceBright: DynamicColor.fromPalette({
        name: 'surface_bright',
        palette: scheme => scheme.neutralPalette,
        tone: scheme => scheme.isDark ? (new ContrastCurve(24, 24, 29, 34)).get(scheme.contrastLevel) : 98,
        isBackground: true,
    }),
    surfaceContainerLowest: DynamicColor.fromPalette({
        name: 'surface_container_lowest',
        palette: scheme => scheme.neutralPalette,
        tone: scheme => scheme.isDark ? (new ContrastCurve(4, 4, 2, 0)).get(scheme.contrastLevel) : 100,
        isBackground: true,
    }),
    surfaceContainerLow: DynamicColor.fromPalette({
        name: 'surface_container_low',
        palette: scheme => scheme.neutralPalette,
        tone: scheme => scheme.isDark ?
            (new ContrastCurve(10, 10, 11, 12)).get(scheme.contrastLevel) :
            (new ContrastCurve(96, 96, 96, 95)).get(scheme.contrastLevel),
        isBackground: true,
    }),
    surfaceContainer: DynamicColor.fromPalette({
        name: 'surface_container',
        palette: scheme => scheme.neutralPalette,
        tone: scheme => scheme.isDark ?
            (new ContrastCurve(12, 12, 16, 20)).get(scheme.contrastLevel) :
            (new ContrastCurve(94, 94, 92, 90)).get(scheme.contrastLevel),
        isBackground: true,
    }),
    surfaceContainerHigh: DynamicColor.fromPalette({
        name: 'surface_container_high',
        palette: scheme => scheme.neutralPalette,
        tone: scheme => scheme.isDark ?
            (new ContrastCurve(17, 17, 21, 25)).get(scheme.contrastLevel) :
            (new ContrastCurve(92, 92, 88, 85)).get(scheme.contrastLevel),
        isBackground: true,
    }),
    surfaceContainerHighest: DynamicColor.fromPalette({
        name: 'surface_container_highest',
        palette: scheme => scheme.neutralPalette,
        tone: scheme => scheme.isDark ?
            (new ContrastCurve(22, 22, 26, 30)).get(scheme.contrastLevel) :
            (new ContrastCurve(90, 90, 84, 80)).get(scheme.contrastLevel),
        isBackground: true,
    }),
    onSurface: DynamicColor.fromPalette({
        name: 'on_surface',
        palette: scheme => scheme.neutralPalette,
        tone: scheme => scheme.isDark ? 90 : 10,
        background: scheme => MaterialDynamicColors.highestSurface(scheme),
        contrastCurve: new ContrastCurve(4.5, 7, 11, 21),
    }),
    surfaceVariant: DynamicColor.fromPalette({
        name: 'surface_variant',
        palette: scheme => scheme.neutralVariantPalette,
        tone: scheme => scheme.isDark ? 30 : 90,
        isBackground: true,
    }),
    onSurfaceVariant: DynamicColor.fromPalette({
        name: 'on_surface_variant',
        palette: scheme => scheme.neutralVariantPalette,
        tone: scheme => scheme.isDark ? 80 : 30,
        background: scheme => MaterialDynamicColors.highestSurface(scheme), // Contrast against highest surface
        contrastCurve: new ContrastCurve(3, 4.5, 7, 11),
    }),
    inverseSurface: DynamicColor.fromPalette({
        name: 'inverse_surface',
        palette: scheme => scheme.neutralPalette,
        tone: scheme => scheme.isDark ? 90 : 20,
        isBackground: true, // It acts as a background for inverseOnSurface
    }),
    inverseOnSurface: DynamicColor.fromPalette({
        name: 'inverse_on_surface',
        palette: scheme => scheme.neutralPalette,
        tone: scheme => scheme.isDark ? 20 : 95,
        background: scheme => MaterialDynamicColors.inverseSurface,
        contrastCurve: new ContrastCurve(4.5, 7, 11, 21),
    }),
    outline: DynamicColor.fromPalette({
        name: 'outline',
        palette: scheme => scheme.neutralVariantPalette,
        tone: scheme => scheme.isDark ? 60 : 50,
        background: scheme => MaterialDynamicColors.highestSurface(scheme),
        contrastCurve: new ContrastCurve(1.5, 3, 4.5, 7),
    }),
    outlineVariant: DynamicColor.fromPalette({
        name: 'outline_variant',
        palette: scheme => scheme.neutralVariantPalette,
        tone: scheme => scheme.isDark ? 30 : 80,
        background: scheme => MaterialDynamicColors.highestSurface(scheme),
        contrastCurve: new ContrastCurve(1, 1, 3, 4.5),
    }),
    shadow: DynamicColor.fromPalette({
        name: 'shadow',
        palette: scheme => scheme.neutralPalette,
        tone: scheme => 0, // Always black
        // No contrast requirement usually needed for shadows
    }),
    scrim: DynamicColor.fromPalette({
        name: 'scrim',
        palette: scheme => scheme.neutralPalette,
        tone: scheme => 0, // Always black
        // No contrast requirement usually needed for scrim
    }),
    surfaceTint: DynamicColor.fromPalette({
        name: 'surface_tint', // Often same as Primary, used for elevation overlays
        palette: scheme => scheme.primaryPalette,
        tone: scheme => scheme.isDark ? 80 : 40,
        isBackground: true, // Can be used as a background layer
    }),

    // --- Primary Role ---
    primary: DynamicColor.fromPalette({
        name: 'primary',
        palette: scheme => scheme.primaryPalette,
        tone: scheme => isMonochrome(scheme) ?
            (scheme.isDark ? 100 : 0) :
            (scheme.isDark ? 80 : 40),
        isBackground: true, // Can act as a background for onPrimary
        background: scheme => MaterialDynamicColors.highestSurface(scheme),
        contrastCurve: new ContrastCurve(3, 4.5, 7, 7), // Minimum 3:1 against surface
        toneDeltaPairProvider: scheme => new ToneDeltaPair(
            MaterialDynamicColors.primaryContainer, // Role A
            MaterialDynamicColors.primary,       // Role B (self)
            10,                                  // Delta
            'nearer',                            // Polarity: primaryContainer should be nearer to surface
            false,                               // Stay together: No
            MaterialDynamicColors.highestSurface(scheme) // Background reference
        )
    }),
    onPrimary: DynamicColor.fromPalette({
        name: 'on_primary',
        palette: scheme => scheme.primaryPalette,
        tone: scheme => isMonochrome(scheme) ?
            (scheme.isDark ? 10 : 90) : // Adjusted monochrome onPrimary for dark
            (scheme.isDark ? 20 : 100),
        background: scheme => MaterialDynamicColors.primary,
        contrastCurve: new ContrastCurve(4.5, 7, 11, 21), // High contrast against primary
    }),
    primaryContainer: DynamicColor.fromPalette({
        name: 'primary_container',
        palette: scheme => scheme.primaryPalette,
        tone: scheme => isMonochrome(scheme) ?
            (scheme.isDark ? 85 : 10) : // Adjusted monochrome container tones
            (scheme.isDark ? 30 : 90),
        isBackground: true, // Can act as background for onPrimaryContainer
        background: scheme => MaterialDynamicColors.highestSurface(scheme),
        contrastCurve: new ContrastCurve(1, 1, 3, 4.5), // Low contrast against surface is okay
        toneDeltaPairProvider: scheme => new ToneDeltaPair(
            MaterialDynamicColors.primaryContainer, // Role A (self)
            MaterialDynamicColors.primary,       // Role B
            10,                                  // Delta
            'nearer',                            // Polarity: self should be nearer to surface
            false,                               // Stay together: No
            MaterialDynamicColors.highestSurface(scheme) // Background reference
        )
    }),
    onPrimaryContainer: DynamicColor.fromPalette({
        name: 'on_primary_container',
        palette: scheme => scheme.primaryPalette,
        // Tone needs contrast against primaryContainer
        tone: scheme => {
            const containerTone = MaterialDynamicColors.primaryContainer.getTone(scheme);
            return DynamicColor.foregroundTone(containerTone, 4.5); // Target 4.5:1 contrast
        },
        background: scheme => MaterialDynamicColors.primaryContainer,
        contrastCurve: new ContrastCurve(4.5, 7, 11, 21), // High contrast against container
    }),
    inversePrimary: DynamicColor.fromPalette({
        name: 'inverse_primary',
        palette: scheme => scheme.primaryPalette,
        tone: scheme => scheme.isDark ? 40 : 80,
        background: scheme => MaterialDynamicColors.inverseSurface,
        contrastCurve: new ContrastCurve(3, 4.5, 7, 7), // Contrast against inverse surface
    }),

    // --- Secondary Role ---
    secondary: DynamicColor.fromPalette({
        name: 'secondary',
        palette: scheme => scheme.secondaryPalette,
        tone: scheme => scheme.isDark ? 80 : 40,
        isBackground: true,
        background: scheme => MaterialDynamicColors.highestSurface(scheme),
        contrastCurve: new ContrastCurve(3, 4.5, 7, 7),
        toneDeltaPairProvider: scheme => new ToneDeltaPair(
            MaterialDynamicColors.secondaryContainer,
            MaterialDynamicColors.secondary,
            10, 'nearer', false,
            MaterialDynamicColors.highestSurface(scheme)
        )
    }),
    onSecondary: DynamicColor.fromPalette({
        name: 'on_secondary',
        palette: scheme => scheme.secondaryPalette,
        tone: scheme => isMonochrome(scheme) ? // Should match onPrimary monochrome logic
            (scheme.isDark ? 10 : 90) :
            (scheme.isDark ? 20 : 100),
        background: scheme => MaterialDynamicColors.secondary,
        contrastCurve: new ContrastCurve(4.5, 7, 11, 21),
    }),
    secondaryContainer: DynamicColor.fromPalette({
        name: 'secondary_container',
        palette: scheme => scheme.secondaryPalette,
        tone: scheme => {
            // Simplified logic - standard is often best unless fidelity/monochrome requires specific tweaks
            const standardTone = scheme.isDark ? 30 : 90;
            return isMonochrome(scheme) ? (scheme.isDark ? 30 : 85) : standardTone;
        },
        isBackground: true,
        background: scheme => MaterialDynamicColors.highestSurface(scheme),
        contrastCurve: new ContrastCurve(1, 1, 3, 4.5),
        toneDeltaPairProvider: scheme => new ToneDeltaPair(
            MaterialDynamicColors.secondaryContainer,
            MaterialDynamicColors.secondary,
            10, 'nearer', false,
            MaterialDynamicColors.highestSurface(scheme)
        )
    }),
    onSecondaryContainer: DynamicColor.fromPalette({
        name: 'on_secondary_container',
        palette: scheme => scheme.secondaryPalette,
        tone: scheme => {
            const containerTone = MaterialDynamicColors.secondaryContainer.getTone(scheme);
            // Adjust for monochrome
            if (isMonochrome(scheme)) { return scheme.isDark ? 90 : 10; }
            return DynamicColor.foregroundTone(containerTone, 4.5); // Target 4.5:1
        },
        background: scheme => MaterialDynamicColors.secondaryContainer,
        contrastCurve: new ContrastCurve(4.5, 7, 11, 21), // Use higher curve for 'on' colors
    }),

    // --- Tertiary Role ---
    tertiary: DynamicColor.fromPalette({
        name: 'tertiary',
        palette: scheme => scheme.tertiaryPalette,
        tone: scheme => isMonochrome(scheme) ?
            (scheme.isDark ? 90 : 25) :
            (scheme.isDark ? 80 : 40),
        isBackground: true,
        background: scheme => MaterialDynamicColors.highestSurface(scheme),
        contrastCurve: new ContrastCurve(3, 4.5, 7, 7),
        toneDeltaPairProvider: scheme => new ToneDeltaPair(
            MaterialDynamicColors.tertiaryContainer,
            MaterialDynamicColors.tertiary,
            10, 'nearer', false,
            MaterialDynamicColors.highestSurface(scheme)
        )
    }),
    onTertiary: DynamicColor.fromPalette({
        name: 'on_tertiary',
        palette: scheme => scheme.tertiaryPalette,
        tone: scheme => isMonochrome(scheme) ?
            (scheme.isDark ? 10 : 90) :
            (scheme.isDark ? 20 : 100),
        background: scheme => MaterialDynamicColors.tertiary,
        contrastCurve: new ContrastCurve(4.5, 7, 11, 21),
    }),
    tertiaryContainer: DynamicColor.fromPalette({
        name: 'tertiary_container',
        palette: scheme => scheme.tertiaryPalette,
        tone: scheme => {
            // Simplified logic - standard is often best unless fidelity/monochrome requires specific tweaks
            const standardTone = scheme.isDark ? 30 : 90;
            // DislikeAnalyzer removed, Fidelity logic simplified
            return isMonochrome(scheme) ? (scheme.isDark ? 60 : 49) : standardTone;
        },
        isBackground: true,
        background: scheme => MaterialDynamicColors.highestSurface(scheme),
        contrastCurve: new ContrastCurve(1, 1, 3, 4.5),
        toneDeltaPairProvider: scheme => new ToneDeltaPair(
            MaterialDynamicColors.tertiaryContainer,
            MaterialDynamicColors.tertiary,
            10, 'nearer', false,
            MaterialDynamicColors.highestSurface(scheme)
        )
    }),
    onTertiaryContainer: DynamicColor.fromPalette({
        name: 'on_tertiary_container',
        palette: scheme => scheme.tertiaryPalette,
        tone: scheme => {
            const containerTone = MaterialDynamicColors.tertiaryContainer.getTone(scheme);
            // Adjust for monochrome
            if (isMonochrome(scheme)) { return scheme.isDark ? 0 : 100; }
            return DynamicColor.foregroundTone(containerTone, 4.5); // Target 4.5:1
        },
        background: scheme => MaterialDynamicColors.tertiaryContainer,
        contrastCurve: new ContrastCurve(4.5, 7, 11, 21), // Use higher curve
    }),

    // --- Error Role ---
    error: DynamicColor.fromPalette({
        name: 'error',
        palette: scheme => scheme.errorPalette,
        tone: scheme => scheme.isDark ? 80 : 40,
        isBackground: true,
        background: scheme => MaterialDynamicColors.highestSurface(scheme),
        contrastCurve: new ContrastCurve(3, 4.5, 7, 7),
        toneDeltaPairProvider: scheme => new ToneDeltaPair(
            MaterialDynamicColors.errorContainer,
            MaterialDynamicColors.error,
            10, 'nearer', false,
            MaterialDynamicColors.highestSurface(scheme)
        )
    }),
    onError: DynamicColor.fromPalette({
        name: 'on_error',
        palette: scheme => scheme.errorPalette,
        tone: scheme => scheme.isDark ? 20 : 100,
        background: scheme => MaterialDynamicColors.error,
        contrastCurve: new ContrastCurve(4.5, 7, 11, 21),
    }),
    errorContainer: DynamicColor.fromPalette({
        name: 'error_container',
        palette: scheme => scheme.errorPalette,
        tone: scheme => scheme.isDark ? 30 : 90,
        isBackground: true,
        background: scheme => MaterialDynamicColors.highestSurface(scheme),
        contrastCurve: new ContrastCurve(1, 1, 3, 4.5),
        toneDeltaPairProvider: scheme => new ToneDeltaPair(
            MaterialDynamicColors.errorContainer,
            MaterialDynamicColors.error,
            10, 'nearer', false,
            MaterialDynamicColors.highestSurface(scheme)
        )
    }),
    onErrorContainer: DynamicColor.fromPalette({
        name: 'on_error_container',
        palette: scheme => scheme.errorPalette,
        // Tone needs contrast against errorContainer
        tone: scheme => {
            const containerTone = MaterialDynamicColors.errorContainer.getTone(scheme);
            // Monochrome check not typically applied to error roles
            return DynamicColor.foregroundTone(containerTone, 4.5); // Target 4.5:1
        },
        background: scheme => MaterialDynamicColors.errorContainer,
        contrastCurve: new ContrastCurve(4.5, 7, 11, 21), // Use higher curve
    }),

    // --- Fixed Accent Colors (Newer roles, mainly for surfaces that don't change with theme) ---
    primaryFixed: DynamicColor.fromPalette({
        name: 'primary_fixed',
        palette: scheme => scheme.primaryPalette,
        tone: scheme => isMonochrome(scheme) ? 40.0 : 90.0,
        isBackground: true,
        background: scheme => MaterialDynamicColors.highestSurface(scheme),
        contrastCurve: new ContrastCurve(1.0, 1.0, 3.0, 4.5),
        toneDeltaPairProvider: scheme => new ToneDeltaPair(
            MaterialDynamicColors.primaryFixed,
            MaterialDynamicColors.primaryFixedDim,
            10.0, 'lighter', true,
            MaterialDynamicColors.highestSurface(scheme)
        ),
    }),
    primaryFixedDim: DynamicColor.fromPalette({
        name: 'primary_fixed_dim',
        palette: scheme => scheme.primaryPalette,
        tone: scheme => isMonochrome(scheme) ? 30.0 : 80.0,
        isBackground: true,
        background: scheme => MaterialDynamicColors.highestSurface(scheme),
        contrastCurve: new ContrastCurve(1.0, 1.0, 3.0, 4.5),
        toneDeltaPairProvider: scheme => new ToneDeltaPair(
            MaterialDynamicColors.primaryFixed,
            MaterialDynamicColors.primaryFixedDim,
            10.0, 'lighter', true,
            MaterialDynamicColors.highestSurface(scheme)
        ),
    }),
    onPrimaryFixed: DynamicColor.fromPalette({
        name: 'on_primary_fixed',
        palette: scheme => scheme.primaryPalette,
        tone: scheme => isMonochrome(scheme) ? 100.0 : 10.0,
        background: scheme => MaterialDynamicColors.primaryFixedDim, // Contrast against dim first
        secondBackground: scheme => MaterialDynamicColors.primaryFixed, // Also contrast against bright
        contrastCurve: new ContrastCurve(4.5, 7.0, 11.0, 21.0),
    }),
    onPrimaryFixedVariant: DynamicColor.fromPalette({
        name: 'on_primary_fixed_variant',
        palette: scheme => scheme.primaryPalette,
        tone: scheme => isMonochrome(scheme) ? 90.0 : 30.0,
        background: scheme => MaterialDynamicColors.primaryFixedDim,
        secondBackground: scheme => MaterialDynamicColors.primaryFixed,
        contrastCurve: new ContrastCurve(3.0, 4.5, 7.0, 11.0),
    }),

    secondaryFixed: DynamicColor.fromPalette({
        name: 'secondary_fixed',
        palette: scheme => scheme.secondaryPalette,
        tone: scheme => isMonochrome(scheme) ? 80.0 : 90.0,
        isBackground: true,
        background: scheme => MaterialDynamicColors.highestSurface(scheme),
        contrastCurve: new ContrastCurve(1.0, 1.0, 3.0, 4.5),
        toneDeltaPairProvider: scheme => new ToneDeltaPair(
            MaterialDynamicColors.secondaryFixed,
            MaterialDynamicColors.secondaryFixedDim,
            10.0, 'lighter', true,
            MaterialDynamicColors.highestSurface(scheme)
        ),
    }),
    secondaryFixedDim: DynamicColor.fromPalette({
        name: 'secondary_fixed_dim',
        palette: scheme => scheme.secondaryPalette,
        tone: scheme => isMonochrome(scheme) ? 70.0 : 80.0,
        isBackground: true,
        background: scheme => MaterialDynamicColors.highestSurface(scheme),
        contrastCurve: new ContrastCurve(1.0, 1.0, 3.0, 4.5),
        toneDeltaPairProvider: scheme => new ToneDeltaPair(
            MaterialDynamicColors.secondaryFixed,
            MaterialDynamicColors.secondaryFixedDim,
            10.0, 'lighter', true,
            MaterialDynamicColors.highestSurface(scheme)
        ),
    }),
    onSecondaryFixed: DynamicColor.fromPalette({
        name: 'on_secondary_fixed',
        palette: scheme => scheme.secondaryPalette,
        tone: scheme => 10.0, // Typically dark
        background: scheme => MaterialDynamicColors.secondaryFixedDim,
        secondBackground: scheme => MaterialDynamicColors.secondaryFixed,
        contrastCurve: new ContrastCurve(4.5, 7.0, 11.0, 21.0),
    }),
    onSecondaryFixedVariant: DynamicColor.fromPalette({
        name: 'on_secondary_fixed_variant',
        palette: scheme => scheme.secondaryPalette,
        tone: scheme => isMonochrome(scheme) ? 25.0 : 30.0,
        background: scheme => MaterialDynamicColors.secondaryFixedDim,
        secondBackground: scheme => MaterialDynamicColors.secondaryFixed,
        contrastCurve: new ContrastCurve(3.0, 4.5, 7.0, 11.0),
    }),

    tertiaryFixed: DynamicColor.fromPalette({
        name: 'tertiary_fixed',
        palette: scheme => scheme.tertiaryPalette,
        tone: scheme => isMonochrome(scheme) ? 40.0 : 90.0,
        isBackground: true,
        background: scheme => MaterialDynamicColors.highestSurface(scheme),
        contrastCurve: new ContrastCurve(1.0, 1.0, 3.0, 4.5),
        toneDeltaPairProvider: scheme => new ToneDeltaPair(
            MaterialDynamicColors.tertiaryFixed,
            MaterialDynamicColors.tertiaryFixedDim,
            10.0, 'lighter', true,
            MaterialDynamicColors.highestSurface(scheme)
        ),
    }),
    tertiaryFixedDim: DynamicColor.fromPalette({
        name: 'tertiary_fixed_dim',
        palette: scheme => scheme.tertiaryPalette,
        tone: scheme => isMonochrome(scheme) ? 30.0 : 80.0,
        isBackground: true,
        background: scheme => MaterialDynamicColors.highestSurface(scheme),
        contrastCurve: new ContrastCurve(1.0, 1.0, 3.0, 4.5),
        toneDeltaPairProvider: scheme => new ToneDeltaPair(
            MaterialDynamicColors.tertiaryFixed,
            MaterialDynamicColors.tertiaryFixedDim,
            10.0, 'lighter', true,
            MaterialDynamicColors.highestSurface(scheme)
        ),
    }),
    onTertiaryFixed: DynamicColor.fromPalette({
        name: 'on_tertiary_fixed',
        palette: scheme => scheme.tertiaryPalette,
        tone: scheme => isMonochrome(scheme) ? 100.0 : 10.0,
        background: scheme => MaterialDynamicColors.tertiaryFixedDim,
        secondBackground: scheme => MaterialDynamicColors.tertiaryFixed,
        contrastCurve: new ContrastCurve(4.5, 7.0, 11.0, 21.0),
    }),
    onTertiaryFixedVariant: DynamicColor.fromPalette({
        name: 'on_tertiary_fixed_variant',
        palette: scheme => scheme.tertiaryPalette,
        tone: scheme => isMonochrome(scheme) ? 90.0 : 30.0,
        background: scheme => MaterialDynamicColors.tertiaryFixedDim,
        secondBackground: scheme => MaterialDynamicColors.tertiaryFixed,
        contrastCurve: new ContrastCurve(3.0, 4.5, 7.0, 11.0),
    }),
}; // End of MaterialDynamicColors namespace


/**
 * Namespace for color blending functions.
 * @namespace Blend
 */
const Blend = (() => {
    /**
     * Blends the hue and chroma of two HCT colors. Tone is interpolated linearly.
     * @param {Hct} from - Starting HCT color.
     * @param {Hct} to - Target HCT color.
     * @param {number} amount - Blend amount (0.0 to 1.0). 0 = 'from', 1 = 'to'.
     * @return {Hct} The blended HCT color.
     */
    const blendHctHue = (from, to, amount) => {
        // Use circular lerp for hue
        const hueDiff = mathUtils.differenceDegrees(from.hue, to.hue);
        const direction = mathUtils.rotationDirection(from.hue, to.hue);
        const blendedHueDegrees = from.hue + direction * hueDiff * amount;
        const finalHue = mathUtils.sanitizeDegreesDouble(blendedHueDegrees);

        // Linear lerp for chroma and tone
        const blendedChroma = mathUtils.lerp(from.chroma, to.chroma, amount);
        const blendedTone = mathUtils.lerp(from.tone, to.tone, amount);

        return Hct.from(finalHue, blendedChroma, blendedTone);
    };

    /**
     * Blends a 'design' color towards the theme's source color in HCT space.
     * This harmonizes the design color with the theme.
     *
     * @param {number} designColor ARGB color to blend.
     * @param {number} sourceColor ARGB source color of the theme.
     * @param {number} [amount=1.0] Blend amount (0.0 to 1.0). 0 = designColor, 1 = fully harmonized.
     * @return {number} ARGB blended color.
     */
    const harmonize = (designColor, sourceColor, amount = 1.0) => {
        const fromHct = Hct.fromInt(designColor);
        const toHct = Hct.fromInt(sourceColor);
        const blended = blendHctHue(fromHct, toHct, amount);
        return blended.toInt();
    };

    return {
        hctHue: blendHctHue,
        harmonize: harmonize,
    };
})();

/**
 * Namespace for scoring potential source colors based on suitability (chroma, hue range).
 * @namespace Score
 */
const Score = {
    // --- Constants for scoring ---
    targetChroma: 48.0, // Target chroma for primary colors
    weightChroma: 0.5, // Weight for chroma difference in score
    weightHue: 0.5,    // Weight for hue preference in score
    cutoffChroma: 5.0, // Minimum chroma to be considered colorful
    cutoffTone: 10.0,  // Exclude very dark tones

    /**
     * Scores a single ARGB color based on its desirability as a theme source color.
     * Favors colors with sufficient chroma and hues not typically disliked.
     *
     * @param {number} argb The ARGB color integer.
     * @return {number} A score from 0 to 100 (higher is better).
     */
    scoreColor: (argb) => {
        const hct = Hct.fromInt(argb);

        // Skip colors below minimum chroma or tone thresholds
        if (hct.chroma < Score.cutoffChroma || hct.tone < Score.cutoffTone) {
            return 0.0;
        }

        // Score based on difference from target chroma (higher chroma is generally better up to a point)
        const chromaScore = Math.max(0.0, 100.0 * (1.0 - Math.abs(hct.chroma - Score.targetChroma) / Score.targetChroma));

        // Score based on hue preference (e.g., avoid overly greenish yellows if desired)
        // This simplified version doesn't penalize specific hues but could be added.
        const hueScore = 100.0; // Placeholder - assume all hues equally valid initially

        // Weighted average score
        return chromaScore * Score.weightChroma + hueScore * Score.weightHue;
    },

    /**
     * Filters and ranks colors based on their score.
     *
     * @param {Map<number, number>} colorsToScore Map of ARGB colors to their pixel counts.
     * @param {object} [options={}] Options for scoring and filtering.
     * @param {number} [options.desired=4] Maximum number of colors to return.
     * @param {boolean} [options.filter=true] Whether to filter out low-scoring colors.
     * @return {number[]} Array of ranked ARGB colors (highest score first).
     */
    score: (colorsToScore, options = {}) => {
        const desired = options.desired === undefined ? 4 : options.desired;
        const filter = options.filter === undefined ? true : options.filter;

        const scoredColors = [];
        for (const color of colorsToScore.keys()) {
            const score = Score.scoreColor(color);
            // Apply filter: only include colors with a positive score if filtering is enabled
            if (!filter || score > 0.01) {
                scoredColors.push({ color, score });
            }
        }

        // Sort by score descending
        scoredColors.sort((a, b) => b.score - a.score);

        // Return the top 'desired' colors
        return scoredColors.slice(0, desired).map(item => item.color);
    }
};


/**
 * Generates a Theme object containing palettes and schemes from a **single** source color.
 *
 * @param {number} sourceColorArgb Source color ARGB value.
 * @param {CustomColor[]} [customColors=[]] Array of custom color definitions to include.
 * @param {boolean} [isContent=false] Whether to use content-based palette generation rules.
 * @return {Theme} The generated theme object.
 */
const themeFromSourceColor = (sourceColorArgb, customColors = [], isContent = false) => {
    // Generate core palettes from the single source color
    const corePalette = isContent ? CorePalette.contentOf(sourceColorArgb) : CorePalette.of(sourceColorArgb);
    const palettes = new CorePalettes(corePalette);

    const sourceColorHct = Hct.fromInt(sourceColorArgb);

    // Create default light and dark scheme configurations
    const lightScheme = new DynamicScheme({
        sourceColorArgb: sourceColorArgb,
        sourceColorHct: sourceColorHct,
        variant: 'default', // Simplified variant identifier
        isDark: false,
        contrastLevel: 0.0, // Default contrast
        primaryPalette: palettes.primary,
        secondaryPalette: palettes.secondary,
        tertiaryPalette: palettes.tertiary,
        neutralPalette: palettes.neutral,
        neutralVariantPalette: palettes.neutralVariant,
        errorPalette: palettes.error,
    });

    const darkScheme = new DynamicScheme({
        sourceColorArgb: sourceColorArgb,
        sourceColorHct: sourceColorHct,
        variant: 'default',
        isDark: true,
        contrastLevel: 0.0,
        primaryPalette: palettes.primary,
        secondaryPalette: palettes.secondary,
        tertiaryPalette: palettes.tertiary,
        neutralPalette: palettes.neutral,
        neutralVariantPalette: palettes.neutralVariant,
        errorPalette: palettes.error,
    });

    const theme = {
        source: sourceColorArgb,
        schemes: {
            light: lightScheme,
            dark: darkScheme,
        },
        palettes: palettes,
        customColors: [], // Initialize empty, will be populated below
        seedColors: { primary: sourceColorArgb } // Store the single seed
    };

    // Process and add custom colors
    if (customColors && customColors.length > 0) {
        theme.customColors = processCustomColors(theme, customColors);
    }

    return theme;
};

/**
 * Generates a Theme object containing palettes and schemes from **multiple** seed colors.
 *
 * @param {object} seeds Seed colors.
 * @param {number} seeds.primary The ARGB value for the primary seed color.
 * @param {number} [seeds.secondary] Optional ARGB value for the secondary seed color.
 * @param {number} [seeds.tertiary] Optional ARGB value for the tertiary seed color.
 * @param {CustomColor[]} [customColors=[]] Array of custom color definitions to include.
 * @param {boolean} [isContent=false] Whether to use content-based palette generation rules for fallback palettes.
 * @return {Theme} The generated theme object.
 */
const themeFromColors = (seeds, customColors = [], isContent = false) => {
    // Generate core palettes from the provided seed colors
    const corePalette = CorePalette.fromColors(seeds, isContent);
    const palettes = new CorePalettes(corePalette);

    // Use the primary seed color as the main source color reference for the schemes
    const sourceColorArgb = seeds.primary;
    const sourceColorHct = Hct.fromInt(sourceColorArgb);

    // Create default light and dark scheme configurations using the derived palettes
    const lightScheme = new DynamicScheme({
        sourceColorArgb: sourceColorArgb,
        sourceColorHct: sourceColorHct,
        variant: 'multi_seed', // Indicate multi-seed origin
        isDark: false,
        contrastLevel: 0.0,
        primaryPalette: palettes.primary,
        secondaryPalette: palettes.secondary,
        tertiaryPalette: palettes.tertiary,
        neutralPalette: palettes.neutral,
        neutralVariantPalette: palettes.neutralVariant,
        errorPalette: palettes.error,
    });

    const darkScheme = new DynamicScheme({
        sourceColorArgb: sourceColorArgb,
        sourceColorHct: sourceColorHct,
        variant: 'multi_seed',
        isDark: true,
        contrastLevel: 0.0,
        primaryPalette: palettes.primary,
        secondaryPalette: palettes.secondary,
        tertiaryPalette: palettes.tertiary,
        neutralPalette: palettes.neutral,
        neutralVariantPalette: palettes.neutralVariant,
        errorPalette: palettes.error,
    });

    const theme = {
        source: sourceColorArgb, // Primary seed is the main source reference
        schemes: {
            light: lightScheme,
            dark: darkScheme,
        },
        palettes: palettes,
        customColors: [],
        seedColors: { ...seeds } // Store all provided seeds
    };

    // Process and add custom colors
    if (customColors && customColors.length > 0) {
        theme.customColors = processCustomColors(theme, customColors);
    }

    return theme;
};


/**
 * Generates dynamic light and dark schemes based on contrast level for a given source color.
 * Useful for creating themes that adapt to user contrast preferences.
 *
 * @param {number} sourceColorArgb Source color ARGB value.
 * @param {number} contrastLevel Contrast level (-1.0 to 1.0).
 * @param {boolean} [isContent=false] Whether to use content-based palette rules.
 * @return {{light: DynamicScheme, dark: DynamicScheme}} Object containing light and dark schemes.
 */
const dynamicSchemesFromSourceColor = (sourceColorArgb, contrastLevel, isContent = false) => {
    const corePalette = isContent ? CorePalette.contentOf(sourceColorArgb) : CorePalette.of(sourceColorArgb);
    const palettes = new CorePalettes(corePalette);
    const sourceColorHct = Hct.fromInt(sourceColorArgb);

    const lightScheme = new DynamicScheme({
        sourceColorArgb: sourceColorArgb,
        sourceColorHct: sourceColorHct,
        variant: 'default_contrast',
        isDark: false,
        contrastLevel: contrastLevel,
        primaryPalette: palettes.primary,
        secondaryPalette: palettes.secondary,
        tertiaryPalette: palettes.tertiary,
        neutralPalette: palettes.neutral,
        neutralVariantPalette: palettes.neutralVariant,
        errorPalette: palettes.error,
    });

    const darkScheme = new DynamicScheme({
        sourceColorArgb: sourceColorArgb,
        sourceColorHct: sourceColorHct,
        variant: 'default_contrast',
        isDark: true,
        contrastLevel: contrastLevel,
        primaryPalette: palettes.primary,
        secondaryPalette: palettes.secondary,
        tertiaryPalette: palettes.tertiary,
        neutralPalette: palettes.neutral,
        neutralVariantPalette: palettes.neutralVariant,
        errorPalette: palettes.error,
    });

    return { light: lightScheme, dark: darkScheme };
};


/**
 * Extracts prominent colors from image data using quantization and scoring.
 *
 * @param {ImageData} imageData The image data object (typically from a canvas context).
 * @param {object} [options={}] Options for quantization and scoring.
 * @param {number} [options.maxColors=128] Maximum colors to consider during quantization.
 * @param {number} [options.desired=4] Number of top-scoring colors to return.
 * @param {boolean} [options.filter=true] Whether to filter out low-scoring colors.
 * @param {number} [options.fallbackColorARGB=0xFF4285F4] Fallback color if extraction fails.
 * @return {Promise<number[]>} Promise resolving to an array of prominent ARGB colors.
 */
const extractColorsFromImage = async (imageData, options = {}) => {
    const maxQuantizeColors = options.maxColors === undefined ? 128 : options.maxColors;
    const desiredResultCount = options.desired === undefined ? 4 : options.desired;
    const fallbackColor = options.fallbackColorARGB === undefined ? 0xFF4285F4 : options.fallbackColorARGB;
    const filterScores = options.filter === undefined ? true : options.filter;

    return new Promise((resolve) => {
        if (!imageData || !imageData.data || imageData.data.length === 0) {
            console.warn("extractColorsFromImage: Invalid or empty image data provided. Using fallback.");
            resolve([fallbackColor]);
            return;
        }

        // Extract pixel array from ImageData
        const pixels = [];
        const data = imageData.data;
        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const a = data[i + 3];
            // Pre-multiply alpha if needed, or just use opaque colors
            if (a === 255) {
                const argb = (a << 24) | (r << 16) | (g << 8) | b;
                pixels.push(argb);
            }
        }

        if (pixels.length === 0) {
            console.warn("extractColorsFromImage: No opaque pixels found. Using fallback.");
            resolve([fallbackColor]);
            return;
        }

        // Quantize colors
        const colorCounts = QuantizerCelebi.quantize(pixels, maxQuantizeColors);

        if (colorCounts.size === 0) {
            console.warn("extractColorsFromImage: Quantization resulted in no colors. Using fallback.");
            resolve([fallbackColor]);
            return;
        }

        // Score and rank colors
        const prominentColors = Score.score(colorCounts, { desired: desiredResultCount, filter: filterScores });

        if (prominentColors.length === 0) {
            console.warn("extractColorsFromImage: Scoring resulted in no colors. Using fallback.");
            resolve([fallbackColor]);
        } else {
            resolve(prominentColors);
        }
    });
};


/**
 * Generates a Theme object from the most prominent color found in image data.
 *
 * @param {ImageData} imageData The image data object.
 * @param {CustomColor[]} [customColors=[]] Array of custom color definitions.
 * @param {object} [options={}] Options passed to extractColorsFromImage.
 * @param {boolean} [options.isContent=false] Use content-based rules for palette generation.
 * @return {Promise<Theme>} Promise resolving to the generated Theme object.
 */
const themeFromImage = async (imageData, customColors = [], options = {}) => {
    const isContent = options.isContent || false;
    const colors = await extractColorsFromImage(imageData, options);
    const sourceColor = colors[0]; // Use the highest scoring color as the source
    return themeFromSourceColor(sourceColor, customColors, isContent);
};

/**
 * Processes custom color definitions for a theme, applying blending if necessary
 * and generating light/dark color groups.
 *
 * @param {Theme} theme The theme object containing schemes and source color.
 * @param {CustomColor[]} customColorDefs Array of custom color definitions.
 * @return {CustomColorGroup[]} Array of processed custom color groups.
 * @private
 */
function processCustomColors(theme, customColorDefs) {
    return customColorDefs.map(customColor => {
        let finalColorValue = customColor.value;
        // Apply blending if requested, using the theme's primary source color
        if (customColor.blend) {
            finalColorValue = Blend.harmonize(customColor.value, theme.source);
        }

        // Create a TonalPalette from the (potentially blended) color
        const palette = TonalPalette.fromInt(finalColorValue);

        // Define tones for light/dark modes (these could be customizable)
        const lightTone = 40;
        const darkTone = 80;
        const lightContainerTone = 90;
        const darkContainerTone = 30;
        // For 'on' colors, calculate based on contrast against their background
        const lightOnTone = DynamicColor.foregroundTone(lightTone, 4.5);
        const darkOnTone = DynamicColor.foregroundTone(darkTone, 4.5);
        const lightOnContainerTone = DynamicColor.foregroundTone(lightContainerTone, 4.5);
        const darkOnContainerTone = DynamicColor.foregroundTone(darkContainerTone, 4.5);


        // Generate light mode group
        const lightColor = palette.tone(lightTone);
        const lightContainer = palette.tone(lightContainerTone);
        const lightGroup = {
            color: lightColor,
            onColor: palette.tone(lightOnTone),
            colorContainer: lightContainer,
            onColorContainer: palette.tone(lightOnContainerTone)
        };

        // Generate dark mode group
        const darkColor = palette.tone(darkTone);
        const darkContainer = palette.tone(darkContainerTone);
        const darkGroup = {
            color: darkColor,
            onColor: palette.tone(darkOnTone),
            colorContainer: darkContainer,
            onColorContainer: palette.tone(darkOnContainerTone)
        };

        return {
            color: customColor, // Original definition
            value: finalColorValue,
            light: lightGroup,
            dark: darkGroup,
        };
    });
}

/**
 * Applies the generated theme colors as CSS custom properties to a target element.
 *
 * @param {Theme} theme The theme object.
 * @param {object} [options={}] Application options.
 * @param {boolean} [options.dark=false] If true, applies the dark scheme. Otherwise, applies light.
 * @param {HTMLElement} [options.target=document.body] The DOM element to apply the styles to.
 * @param {boolean} [options.brightnessSuffix=false] If true, appends '-light' or '-dark' to CSS variables.
 * @param {boolean} [options.paletteTones=false] If true, also exports tones from TonalPalettes.
 */
function applyTheme(theme, options = {}) {
    const isDark = options.dark || false;
    const target = options.target || (typeof document !== 'undefined' ? document.body : null); // Safe access to document
    const brightnessSuffix = options.brightnessSuffix || false;
    const exportPaletteTones = options.paletteTones || false;

    if (!target || !target.style) {
        console.error("applyTheme: Invalid target element provided or document unavailable.");
        return;
    }

    const scheme = isDark ? theme.schemes.dark : theme.schemes.light;
    const suffix = brightnessSuffix ? (isDark ? '-dark' : '-light') : '';

    // Apply standard Material Dynamic Colors
    for (const key in MaterialDynamicColors) {
        // Check if the property is a DynamicColor instance
        if (MaterialDynamicColors[key] instanceof DynamicColor) {
            const dynamicColor = MaterialDynamicColors[key];
            try {
                const value = hexUtils.hexFromArgb(dynamicColor.getArgb(scheme));
                // Convert camelCase or underscore_case key to kebab-case CSS variable
                const varName = `--md-sys-color-${key.replace(/_/g, '-').replace(/([A-Z])/g, '-$1').toLowerCase()}${suffix}`;
                target.style.setProperty(varName, value);
            } catch (error) {
                console.error(`Error applying color role ${key}:`, error);
                // Optionally skip this variable or set a fallback
            }
        }
    }

    // Apply custom colors
    theme.customColors.forEach(group => {
        try {
            const colorGroup = isDark ? group.dark : group.light;
            // Ensure name is safe for CSS variable
            const name = group.color.name.replace(/[^a-zA-Z0-9_-]/g, '-').toLowerCase(); // Kebab-case name

            target.style.setProperty(`--md-custom-color-${name}${suffix}`, hexUtils.hexFromArgb(colorGroup.color));
            target.style.setProperty(`--md-custom-color-on-${name}${suffix}`, hexUtils.hexFromArgb(colorGroup.onColor));
            target.style.setProperty(`--md-custom-color-${name}-container${suffix}`, hexUtils.hexFromArgb(colorGroup.colorContainer));
            target.style.setProperty(`--md-custom-color-on-${name}-container${suffix}`, hexUtils.hexFromArgb(colorGroup.onColorContainer));
        } catch (error) {
            console.error(`Error applying custom color ${group.color.name}:`, error);
        }
    });

    // Optionally export palette tones
    if (exportPaletteTones) {
        const palettes = theme.palettes;
        const tones = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 95, 99, 100];
        for (const paletteKey in palettes) {
            const palette = palettes[paletteKey];
            if (palette instanceof TonalPalette) {
                try {
                    tones.forEach(tone => {
                        const value = hexUtils.hexFromArgb(palette.tone(tone));
                        const varName = `--md-ref-palette-${paletteKey}-tone${tone}${suffix}`;
                        target.style.setProperty(varName, value);
                    });
                } catch (error) {
                    console.error(`Error applying palette tones for ${paletteKey}:`, error);
                }
            }
        }
    }
}

export {
    // Core Utilities
    mathUtils,
    hexUtils,
    colorUtils,

    // Color Representation
    ViewingConditions,
    Cam16,
    Hct,
    HctSolver, // Note: HctSolver is often internal, but needed for tests if they use it directly

    // Contrast Calculation
    ContrastCurve,
    Contrast,

    // Palettes
    TonalPalette,
    KeyColor, // Note: KeyColor is often internal, but needed for tests if they use it directly
    CorePalette,
    CorePalettes,

    // Dynamic Scheme
    DynamicScheme,
    isMonochrome,
    isFidelity,

    // Color Quantization
    QuantizerCelebi,
    QuantizerWsmeans,
    // DistanceAndIndexWsmeans, // Usually internal helper
    LabPointProvider,      // Often internal, but test might use it
    QuantizerMap,
    QuantizerWu,
    // BoxWu,                 // Usually internal helper
    // WuDirections,          // Usually internal helper

    // Theme Generation
    // ToneDeltaPair,         // Usually internal helper
    DynamicColor,
    MaterialDynamicColors,
    Blend,
    Score,
    themeFromSourceColor,
    themeFromColors,        // Added export
    dynamicSchemesFromSourceColor,
    extractColorsFromImage,
    themeFromImage,
    applyTheme,
    processCustomColors     // Often internal, but needed for tests if they use it directly
};