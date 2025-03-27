/**
 * @file dc_color.js
 * @module dc_color
 * @description
 * This file defines color representation classes for the dynamic color library,
 * including HCT, CAM16, and ViewingConditions. It also includes the HctSolver
 * for color space conversions and calculations.
 * @requires module:dc_core
 */

import { mathUtils, colorUtils } from './dc_core.js';

/**
 * Viewing conditions for color appearance models.
 */
class ViewingConditions {
    /**
     * @param {number} n - Surround factor
     * @param {number} aw - White luminance in candelas per meter squared
     * @param {number} nbb - Background relative luminance
     * @param {number} ncb - Colorfulness stimuli relative luminance
     * @param {number} c - Exponential nonlinearities
     * @param {number} nc - Chromatic induction factor
     * @param {number} fl - Luminance level of the light source in candelas per meter squared
     * @param {number} fLRoot - Square root of light source luminance
     * @param {number} z - Factor representing degree of adaptation
     * @param {number[]} rgbD - Color adaptation matrix in RGB
     */
    n;
    aw;
    nbb;
    ncb;
    c;
    nc;
    fl;
    fLRoot;
    z;
    rgbD;

    constructor(n, aw, nbb, ncb, c, nc, fl, fLRoot, z, rgbD) {
        this.n = n;
        this.aw = aw;
        this.nbb = nbb;
        this.ncb = ncb;
        this.c = c;
        this.nc = nc;
        this.fl = fl;
        this.fLRoot = fLRoot;
        this.z = z;
        this.rgbD = rgbD;
    }

    /**
     * Creates default viewing conditions.
     *
     * @return {ViewingConditions} - Default viewing conditions
     */
    static make() {
        return ViewingConditions.DEFAULT;
    }

    /**
     * Default viewing conditions for typical viewing environment.
     */
    static DEFAULT = (() => {
        const n = 1.0;
        const aw = colorUtils.yFromLstar(50.0) * 63.66197723675813;
        const nbb = 1.0;
        const ncb = 0.9;
        const c = 0.69;
        const nc = 1.0;
        const fl = aw;
        const fLRoot = Math.sqrt(fl);
        const z = 1.0 + 1.64 * Math.pow(fl, 0.29) - Math.pow(fl, 0.8);
        const rgbD = [1.0, 1.0, 1.0];

        return new ViewingConditions(n, aw, nbb, ncb, c, nc, fl, fLRoot, z, rgbD);
    })();
}

/**
 * CAM16 color representation.
 */
class Cam16 {
    /**
     * @param {number} hue - Hue in degrees
     * @param {number} chroma - Chroma
     * @param {number} j - Lightness
     * @param {number} q - Brightness
     * @param {number} colorfulness - Colorfulness
     * @param {number} saturation - Saturation
     * @param {number} jStar - CAM16-UCS J*
     * @param {number} aStar - CAM16-UCS a*
     * @param {number} bStar - CAM16-UCS b*
     */
    hue;
    chroma;
    j;
    q;
    colorfulness;
    saturation;
    jStar;
    aStar;
    bStar;

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
     * Creates a CAM16 color from an ARGB integer.
     *
     * @param {number} argb - ARGB color
     * @return {Cam16} - CAM16 color
     */
    static fromInt(argb) {
        return Cam16.fromIntInViewingConditions(argb, ViewingConditions.DEFAULT);
    }

    /**
     * Creates a CAM16 color from an ARGB integer with specific viewing conditions.
     *
     * @param {number} argb - ARGB color
     * @param {ViewingConditions} viewingConditions - Viewing conditions
     * @return {Cam16} - CAM16 color
     */
    static fromIntInViewingConditions(argb, viewingConditions) {
        // Transform ARGB to XYZ
        const xyz = colorUtils.xyzFromArgb(argb);
        const rLinear = xyz[0] / 100.0;
        const gLinear = xyz[1] / 100.0;
        const bLinear = xyz[2] / 100.0;

        // Apply discount-illuminant factors
        const rD = viewingConditions.rgbD[0] * rLinear;
        const gD = viewingConditions.rgbD[1] * gLinear;
        const bD = viewingConditions.rgbD[2] * bLinear;

        // Chromatic adaptation
        const rA = HctSolver.chromaticAdaptation(rD);
        const gA = HctSolver.chromaticAdaptation(gD);
        const bA = HctSolver.chromaticAdaptation(bD);

        // Calculate cone responses
        const displayScaledConeResponseRed = (rA * 400.0) / (rA + 27.13);
        const displayScaledConeResponseGreen = (gA * 400.0) / (gA + 27.13);
        const displayScaledConeResponseBlue = (bA * 400.0) / (bA + 27.13);

        const adaptedFactorRed = Math.pow(viewingConditions.fl * Math.abs(displayScaledConeResponseRed) / 100, 0.42);
        const adaptedFactorGreen = Math.pow(viewingConditions.fl * Math.abs(displayScaledConeResponseGreen) / 100, 0.42);
        const adaptedFactorBlue = Math.pow(viewingConditions.fl * Math.abs(displayScaledConeResponseBlue) / 100, 0.42);

        const rAComponent = mathUtils.signum(displayScaledConeResponseRed) * 400 * adaptedFactorRed / (adaptedFactorRed + 27.13);
        const gAComponent = mathUtils.signum(displayScaledConeResponseGreen) * 400 * adaptedFactorGreen / (adaptedFactorGreen + 27.13);
        const bAComponent = mathUtils.signum(displayScaledConeResponseBlue) * 400 * adaptedFactorBlue / (adaptedFactorBlue + 27.13);

        // Calculate a, b, u, and p2 components for hue and chroma
        const cam16AComponent = (11 * rAComponent + -12 * gAComponent + bAComponent) / 11;
        const cam16BComponent = (rAComponent + gAComponent - 2 * bAComponent) / 9;
        const uComponent = (20 * rAComponent + 20 * gAComponent + 21 * bAComponent) / 20;
        const p2 = (40 * rAComponent + 20 * gAComponent + bAComponent) / 20;

        // Calculate hue
        let hueDegrees = 180 * Math.atan2(cam16BComponent, cam16AComponent) / Math.PI;
        let hue = hueDegrees < 0 ? hueDegrees + 360 : (hueDegrees >= 360 ? hueDegrees - 360 : hueDegrees);
        const hueRadians = hue * Math.PI / 180;

        // Calculate achromatic response
        const aChromaticity = p2 * viewingConditions.nbb;

        // Calculate lightness
        const jValue = 100 * Math.pow(aChromaticity / viewingConditions.aw, viewingConditions.c * viewingConditions.z);

        // Calculate brightness
        const qValue = 4 / viewingConditions.c * Math.sqrt(jValue / 100) * (viewingConditions.aw + 4) * viewingConditions.fLRoot;

        // Adjust hue for calculation
        const hPrime = (hue < 20.14) ? hue + 360 : hue;

        // Calculate eccentricity factor
        const eHue = 0.25 * (Math.cos(hPrime * Math.PI / 180 + 2) + 3.8);

        // Calculate hue-based factor for chroma calculation
        const p1 = 50000 / 13 * eHue * viewingConditions.nc * viewingConditions.ncb;

        // Calculate temporary t value
        const tValue = p1 * Math.sqrt(cam16AComponent * cam16AComponent + cam16BComponent * cam16BComponent) / (uComponent + 0.305);

        // Calculate alpha for chroma calculation
        const alpha = Math.pow(tValue, 0.9) * Math.pow(1.64 - Math.pow(0.29, viewingConditions.n), 0.73);

        // Calculate chroma
        const chroma = alpha * Math.sqrt(jValue / 100);

        // Calculate colorfulness
        const colorfulness = chroma * viewingConditions.fLRoot;

        // Calculate saturation
        const saturation = 50 * Math.sqrt(alpha * viewingConditions.c / (viewingConditions.aw + 4));

        // Calculate CAM16-UCS coordinates
        const jStar = (1 + 100 * 0.007) * jValue / (1 + 0.007 * jValue);
        const mStar = Math.log(1 + 0.0228 * colorfulness) / 0.0228;
        const aStar = mStar * Math.cos(hueRadians);
        const bStar = mStar * Math.sin(hueRadians);

        return new Cam16(hue, chroma, jValue, qValue, colorfulness, saturation, jStar, aStar, bStar);
    }

    /**
     * Creates a CAM16 color from J, C, and h.
     *
     * @param {number} j - Lightness
     * @param {number} c - Chroma
     * @param {number} h - Hue in degrees
     * @return {Cam16} - CAM16 color
     */
    static fromJch(j, c, h) {
        return Cam16.fromJchInViewingConditions(j, c, h, ViewingConditions.DEFAULT);
    }

    /**
     * Creates a CAM16 color from J, C, and h with specific viewing conditions.
     *
     * @param {number} j - Lightness
     * @param {number} c - Chroma
     * @param {number} h - Hue in degrees
     * @param {ViewingConditions} viewingConditions - Viewing conditions
     * @return {Cam16} - CAM16 color
     */
    static fromJchInViewingConditions(j, c, h, viewingConditions) {
        // Calculate brightness
        const q = 4 / viewingConditions.c * Math.sqrt(j / 100) * (viewingConditions.aw + 4) * viewingConditions.fLRoot;

        // Calculate colorfulness
        const m = c * viewingConditions.fLRoot;

        // Calculate alpha
        const alpha = c / Math.sqrt(j / 100);

        // Calculate saturation
        const s = 50 * Math.sqrt(alpha * viewingConditions.c / (viewingConditions.aw + 4));

        // Convert hue to radians
        const hRads = h * Math.PI / 180;

        // Calculate CAM16-UCS coordinates
        const jstar = (1 + 100 * .007) * j / (1 + .007 * j);
        const mstar = Math.log(1 + .0228 * m) / .0228;
        const astar = mstar * Math.cos(hRads);
        const bstar = mstar * Math.sin(hRads);

        return new Cam16(h, c, j, q, m, s, jstar, astar, bstar);
    }

    /**
     * Creates a CAM16 color from CAM16-UCS coordinates.
     *
     * @param {number} jstar - J* coordinate
     * @param {number} astar - a* coordinate
     * @param {number} bstar - b* coordinate
     * @return {Cam16} - CAM16 color
     */
    static fromUcs(jstar, astar, bstar) {
        return Cam16.fromUcsInViewingConditions(jstar, astar, bstar, ViewingConditions.DEFAULT);
    }

    /**
     * Creates a CAM16 color from CAM16-UCS coordinates with specific viewing conditions.
     *
     * @param {number} jstar - J* coordinate
     * @param {number} astar - a* coordinate
     * @param {number} bstar - b* coordinate
     * @param {ViewingConditions} viewingConditions - Viewing conditions
     * @return {Cam16} - CAM16 color
     */
    static fromUcsInViewingConditions(jstar, astar, bstar, viewingConditions) {
        // Extract CAM16-UCS coordinates
        const a = astar;
        const b = bstar;

        // Calculate M and colorfulness
        const m = Math.sqrt(a * a + b * b);
        const M = (Math.exp(.0228 * m) - 1) / .0228;

        // Calculate chroma
        const c = M / viewingConditions.fLRoot;

        // Calculate hue
        let h = Math.atan2(b, a) * 180 / Math.PI;
        if (h < 0) {
            h += 360;
        }

        // Calculate J
        const j = jstar / (1 - (jstar - 100) * .007);

        return Cam16.fromJchInViewingConditions(j, c, h, viewingConditions);
    }

    /**
     * Converts the CAM16 color to an ARGB integer.
     *
     * @return {number} - ARGB color
     */
    toInt() {
        return this.viewed(ViewingConditions.DEFAULT);
    }

    /**
     * Converts the CAM16 color to an ARGB integer with the given viewing conditions.
     *
     * @param {ViewingConditions} viewingConditions - Viewing conditions
     * @return {number} - ARGB color
     */
    viewed(viewingConditions) {
        // Handle special case for zero chroma or zero lightness
        const alpha = (this.chroma === 0.0 || this.j === 0.0) ?
            0 : this.chroma / Math.sqrt(this.j / 100);

        // Calculate t
        const t = Math.pow(alpha / Math.pow(1.64 - Math.pow(.29, viewingConditions.n), .73), 1 / .9);

        // Convert hue to radians
        const hRad = this.hue * Math.PI / 180;

        // Calculate hue-dependent factors
        const eHue = .25 * (Math.cos(hRad + 2) + 3.8);
        const aC = viewingConditions.aw * Math.pow(this.j / 100, 1 / viewingConditions.c / viewingConditions.z);
        const p1 = 50000 / 13 * eHue * viewingConditions.nc * viewingConditions.ncb;
        const p2 = aC / viewingConditions.nbb;

        // Calculate hue-dependent trigonometric values
        const hSin = Math.sin(hRad);
        const hCos = Math.cos(hRad);

        // Calculate gamma
        const gamma = 23 * (p2 + .305) * t / (23 * p1 + 11 * t * hCos + 108 * t * hSin);

        // Calculate a and b
        const a = gamma * hCos;
        const b = gamma * hSin;

        // Calculate opponent color responses
        const rA = (460 * p2 + 451 * a + 288 * b) / 1403;
        const gA = (460 * p2 - 891 * a - 261 * b) / 1403;
        const bA = (460 * p2 - 220 * a - 6300 * b) / 1403;

        // Calculate post-adaptation cone responses
        const rCBase = Math.max(0, 27.13 * Math.abs(rA) / (400 - Math.abs(rA)));
        const rC = mathUtils.signum(rA) * 100 / viewingConditions.fl * Math.pow(rCBase, 1 / .42);

        const gCBase = Math.max(0, 27.13 * Math.abs(gA) / (400 - Math.abs(gA)));
        const gC = mathUtils.signum(gA) * 100 / viewingConditions.fl * Math.pow(gCBase, 1 / .42);

        const bCBase = Math.max(0, 27.13 * Math.abs(bA) / (400 - Math.abs(bA)));
        const bC = mathUtils.signum(bA) * 100 / viewingConditions.fl * Math.pow(bCBase, 1 / .42);

        // Calculate cone responses
        const rF = rC / viewingConditions.rgbD[0];
        const gF = gC / viewingConditions.rgbD[1];
        const bF = bC / viewingConditions.rgbD[2];

        // Convert cone responses to XYZ
        const x = 1.86206786 * rF - 1.01125463 * gF + .14918677 * bF;
        const y = .38752654 * rF + .62144744 * gF - .00897398 * bF;
        const z = -.0158415 * rF - .03412294 * gF + 1.04996444 * bF;

        // Convert XYZ to ARGB
        return colorUtils.argbFromXyz(x, y, z);
    }

    /**
     * Converts the CAM16 color to XYZ coordinates with the given viewing conditions.
     *
     * @param {ViewingConditions} viewingConditions - Viewing conditions
     * @return {number[]} - XYZ coordinates
     */
    xyzInViewingConditions(viewingConditions) {
        // Handle special case for zero chroma or zero lightness
        const alpha = (this.chroma === 0.0 || this.j === 0.0) ?
            0.0 : this.chroma / Math.sqrt(this.j / 100.0);

        // Calculate t
        const t = Math.pow(
            alpha / Math.pow(1.64 - Math.pow(0.29, viewingConditions.n), 0.73),
            1.0 / 0.9);

        // Convert hue to radians
        const hRad = this.hue * Math.PI / 180.0;

        // Calculate hue-dependent factors
        const eHue = 0.25 * (Math.cos(hRad + 2.0) + 3.8);
        const aC = viewingConditions.aw *
            Math.pow(this.j / 100.0, 1.0 / viewingConditions.c / viewingConditions.z);
        const p1 = eHue * (50000.0 / 13.0) * viewingConditions.nc * viewingConditions.ncb;
        const p2 = (aC / viewingConditions.nbb);

        // Calculate hue-dependent trigonometric values
        const hSin = Math.sin(hRad);
        const hCos = Math.cos(hRad);

        // Calculate gamma
        const gamma = 23.0 * (p2 + 0.305) * t /
            (23.0 * p1 + 11 * t * hCos + 108.0 * t * hSin);

        // Calculate a and b
        const a = gamma * hCos;
        const b = gamma * hSin;

        // Calculate opponent color responses
        const rA = (460.0 * p2 + 451.0 * a + 288.0 * b) / 1403.0;
        const gA = (460.0 * p2 - 891.0 * a - 261.0 * b) / 1403.0;
        const bA = (460.0 * p2 - 220.0 * a - 6300.0 * b) / 1403.0;

        // Calculate post-adaptation cone responses
        const rCBase = Math.max(0, (27.13 * Math.abs(rA)) / (400.0 - Math.abs(rA)));
        const rC = mathUtils.signum(rA) * (100.0 / viewingConditions.fl) *
            Math.pow(rCBase, 1.0 / 0.42);

        const gCBase = Math.max(0, (27.13 * Math.abs(gA)) / (400.0 - Math.abs(gA)));
        const gC = mathUtils.signum(gA) * (100.0 / viewingConditions.fl) *
            Math.pow(gCBase, 1.0 / 0.42);

        const bCBase = Math.max(0, (27.13 * Math.abs(bA)) / (400.0 - Math.abs(bA)));
        const bC = mathUtils.signum(bA) * (100.0 / viewingConditions.fl) *
            Math.pow(bCBase, 1.0 / 0.42);

        // Calculate cone responses
        const rF = rC / viewingConditions.rgbD[0];
        const gF = gC / viewingConditions.rgbD[1];
        const bF = bC / viewingConditions.rgbD[2];

        // Convert cone responses to XYZ
        const x = 1.86206786 * rF - 1.01125463 * gF + 0.14918677 * bF;
        const y = 0.38752654 * rF + 0.62144744 * gF - 0.00897398 * bF;
        const z = -0.01584150 * rF - 0.03412294 * gF + 1.04996444 * bF;

        return [x, y, z];
    }
}

/**
 * HCT (Hue, Chroma, Tone) color representation.
 */
class Hct {
    /**
     * @param {number} argb - ARGB color value
     */
    argb;
    internalHue;
    internalChroma;
    internalTone;

    /**
     * Creates a new HCT color object.
     *
     * @param {number} argb - ARGB color value
     */
    constructor(argb) {
        this.argb = argb;
        const cam = Cam16.fromInt(argb);
        this.internalHue = cam.hue;
        this.internalChroma = cam.chroma;
        this.internalTone = colorUtils.lstarFromArgb(argb);
    }

    /**
     * Creates an HCT color from hue, chroma, and tone.
     *
     * @param {number} hue - Hue in degrees (0-360)
     * @param {number} chroma - Chroma
     * @param {number} tone - Tone (L* value, 0-100)
     * @return {Hct} - HCT color
     */
    static from(hue, chroma, tone) {
        return new Hct(HctSolver.solveToInt(hue, chroma, tone));
    }

    /**
     * Creates an HCT color from an ARGB integer.
     *
     * @param {number} argb - ARGB color
     * @return {Hct} - HCT color
     */
    static fromInt(argb) {
        return new Hct(argb);
    }

    /**
     * Converts the HCT color to an ARGB integer.
     *
     * @return {number} - ARGB color
     */
    toInt() {
        return this.argb;
    }

    /**
     * Gets the hue of the color.
     *
     * @return {number} - Hue in degrees (0-360)
     */
    get hue() { return this.internalHue; }

    /**
     * Sets the hue of the color, preserving chroma and tone.
     *
     * @param {number} hue - Hue in degrees (0-360)
     */
    set hue(hue) { this.setInternalState(HctSolver.solveToInt(hue, this.internalChroma, this.internalTone)); }

    /**
     * Gets the chroma of the color.
     *
     * @return {number} - Chroma
     */
    get chroma() { return this.internalChroma; }

    /**
     * Sets the chroma of the color, preserving hue and tone.
     *
     * @param {number} chroma - Chroma
     */
    set chroma(chroma) { this.setInternalState(HctSolver.solveToInt(this.internalHue, chroma, this.internalTone)); }

    /**
     * Gets the tone of the color.
     *
     * @return {number} - Tone (L* value, 0-100)
     */
    get tone() { return this.internalTone; }

    /**
     * Sets the tone of the color, preserving hue and chroma.
     *
     * @param {number} tone - Tone (L* value, 0-100)
     */
    set tone(tone) { this.setInternalState(HctSolver.solveToInt(this.internalHue, this.internalChroma, tone)); }

    /**
     * Updates the internal state of the color from an ARGB integer.
     *
     * @param {number} argb - ARGB color
     */
    setInternalState(argb) {
        const cam = Cam16.fromInt(argb);
        this.internalHue = cam.hue;
        this.internalChroma = cam.chroma;
        this.internalTone = colorUtils.lstarFromArgb(argb);
        this.argb = argb;
    }

    /**
     * Creates a new HCT color with the same hue, chroma, and tone,
     * viewed under different viewing conditions.
     *
     * @param {ViewingConditions} viewingConditions - Viewing conditions
     * @return {Hct} - New HCT color
     */
    inViewingConditions(viewingConditions) {
        // Get CAM16 representation of the color
        const cam = Cam16.fromInt(this.toInt());

        // Get XYZ coordinates under the new viewing conditions
        const viewedXYZ = cam.xyzInViewingConditions(viewingConditions);

        // Convert back to CAM16 under the default viewing conditions
        const recastInVC = Cam16.fromXyzInViewingConditions(
            viewedXYZ[0], viewedXYZ[1], viewedXYZ[2], ViewingConditions.make());

        // Create new HCT color from the adjusted hue and chroma
        return Hct.from(recastInVC.hue, recastInVC.chroma, colorUtils.lstarFromY(viewedXYZ[1]));
    }
}

/**
 * Solver for HCT (Hue, Chroma, Tone) conversions.
 */
class HctSolver {
    // Constants for conversion calculations
    static SCALED_DISCOUNT_FROM_LINRGB = [
        [0.001200833568784504, 0.002389694492170889, 0.0002795742885861124],
        [0.0005891086651375999, 0.0029785502573438758, 0.0003270666104008398],
        [0.00010146692491640572, 0.0005364214359186694, 0.0032979401770712076]
    ];

    static LINRGB_FROM_SCALED_DISCOUNT = [
        [1373.2198709594231, -1100.4251190754821, -7.278681089101213],
        [-271.815969077903, 559.6580465940733, -32.46047482791194],
        [1.9622899599665666, -57.173814538844006, 308.7233197812385]
    ];

    static Y_FROM_LINRGB = [0.2126, 0.7152, 0.0722];

    // Critical planes for finding HCT solutions
    static CRITICAL_PLANES = [
        0.015176349177441876, 0.045529047532325624, 0.07588174588720938,
        0.10623444424209313, 0.13658714259697685, 0.16693984095186062,
        0.19729253930674434, 0.2276452376616281, 0.2579979360165119,
        0.28835063437139563, 0.3188300904430532, 0.350925934958123,
        0.3848314933096426, 0.42057480301049466, 0.458183274052838,
        0.4976837250274023, 0.5391024159806381, 0.5824650784040898,
        0.6277969426914107, 0.6751227633498623, 0.7244668422128921,
        0.775853049866786, 0.829304845476233, 0.8848452951698498,
        0.942497089126609, 1.0022825574869039, 1.0642236851973577,
        1.1283421258858297, 1.1946592148522128, 1.2631959812511864,
        1.3339731595349034, 1.407011200216447, 1.4823302800086415,
        1.5599503113873272, 1.6398909516233677, 1.7221716113234105,
        1.8068114625156377, 1.8938294463134073, 1.9832442801866852,
        2.075074464868551, 2.1693382909216234, 2.2660538449872063,
        2.36523901573795, 2.4669114995532007, 2.5710888059345764,
        2.6777882626779785, 2.7870270208169257, 2.898822059350997,
        3.0131901897720907, 3.1301480604002863, 3.2497121605402226,
        3.3718988244681087, 3.4967242352587946, 3.624204428461639,
        3.754355295633311, 3.887192587735158, 4.022731918402185,
        4.160988767090289, 4.301978482107941, 4.445716283538092,
        4.592217266055746, 4.741496401646282, 4.893568542229298,
        5.048448422192488, 5.20615066083972, 5.3666897647573375,
        5.5300801301023865, 5.696336044816294, 5.865471690767354,
        6.037501145825082, 6.212438385869475, 6.390297286737924,
        6.571091626112461, 6.7548350853498045, 6.941541251256611,
        7.131223617812143, 7.323895587840543, 7.5195704746346665,
        7.7182615035334345, 7.919981813454504, 8.124744458384042,
        8.332562408825165, 8.543448553206703, 8.757415699253682,
        8.974476575321063, 9.194643831691977, 9.417930041841839,
        9.644347703669503, 9.873909240696694, 10.106627003236781,
        10.342513269534024, 10.58158024687427, 10.8238400726681,
        11.069304815507364, 11.317986476196008, 11.569896988756009,
        11.825048221409341, 12.083451977536606, 12.345119996613247,
        12.610063955123938, 12.878295467455942, 13.149826086772048,
        13.42466730586372, 13.702830557985108, 13.984327217668513,
        14.269168601521828, 14.55736596900856, 14.848930523210871,
        15.143873411576273, 15.44220572664832, 15.743938506781891,
        16.04908273684337, 16.35764934889634, 16.66964922287304,
        16.985093187232053, 17.30399201960269, 17.62635644741625,
        17.95219714852476, 18.281524751807332, 18.614349837764564,
        18.95068293910138, 19.290534541298456, 19.633915083172692,
        19.98083495742689, 20.331304511189067, 20.685334046541502,
        21.042933821039977, 21.404114048223256, 21.76888489811322,
        22.137256497705877, 22.50923893145328, 22.884842241736916,
        23.264076429332462, 23.6469514538663, 24.033477234264016,
        24.42366364919083, 24.817520537484558, 25.21505769858089,
        25.61628489293138, 26.021211842414342, 26.429848230738664,
        26.842203703840827, 27.258287870275353, 27.678110301598522,
        28.10168053274597, 28.529008062403893, 28.96010235337422,
        29.39497283293396, 29.83362889318845, 30.276079891419332,
        30.722335150426627, 31.172403958865512, 31.62629557157785,
        32.08401920991837, 32.54558406207592, 33.010999283389665,
        33.4802739966603, 33.953417292456834, 34.430438229418264,
        34.911345834551085, 35.39614910352207, 35.88485700094671,
        36.37747846067349, 36.87402238606382, 37.37449765026789,
        37.87891309649659, 38.38727753828926, 38.89959975977785,
        39.41588851594697, 39.93615253289054, 40.460400508064545,
        40.98864111053629, 41.520882981230194, 42.05713473317016,
        42.597404951718396, 43.141702194811224, 43.6900349931913,
        44.24241185063697, 44.798841244188324, 45.35933162437017,
        45.92389141541209, 46.49252901546552, 47.065252796817916,
        47.64207110610409, 48.22299226451468, 48.808024568002054,
        49.3971762874833, 49.9904556690408, 50.587870934119984,
        51.189430279724725, 51.79514187861014, 52.40501387947288,
        53.0190544071392, 53.637271562750364, 54.259673423945976,
        54.88626804504493, 55.517063457223934, 56.15206766869424,
        56.79128866487574, 57.43473440856916, 58.08241284012621,
        58.734331877617365, 59.39049941699807, 60.05092333227251,
        60.715611475655585, 61.38457167773311, 62.057811747619894,
        62.7353394731159, 63.417162620860914, 64.10328893648692,
        64.79372614476921, 65.48848194977529, 66.18756403501224,
        66.89098006357258, 67.59873767827808, 68.31084450182222,
        69.02730813691093, 69.74813616640164, 70.47333615344107,
        71.20291564160104, 71.93688215501312, 72.67524319850172,
        73.41800625771542, 74.16517879925733, 74.9167682708136,
        75.67278210128072, 76.43322770089146, 77.1981124613393,
        77.96744375590167, 78.74122893956174, 79.51947534912904,
        80.30219030335869, 81.08938110306934, 81.88105503125999,
        82.67721935322541, 83.4778813166706, 84.28304815182372,
        85.09272707154808, 85.90692527145302, 86.72564993000343,
        87.54890820862819, 88.3767072518277, 89.2090541872801,
        90.04595612594655, 90.88742016217518, 91.73345337380438,
        92.58406282226491, 93.43925555268066, 94.29903859396902,
        95.16341895893969, 96.03240364439274, 96.9059996312159,
        97.78421388448044, 98.6670533535366, 99.55452497210776,
    ];

    /**
     * Sanitizes an angle in radians to be between 0 and 2π.
     *
     * @param {number} angle - Angle in radians
     * @return {number} - Sanitized angle in radians
     */
    static sanitizeRadians(angle) {
        return (angle + Math.PI * 8) % (Math.PI * 2);
    }

    /**
     * True delinearization of an RGB component by applying the sRGB gamma correction.
     *
     * @param {number} rgbComponent - Linear RGB component (0-100)
     * @return {number} - sRGB component (0-255)
     */
    static trueDelinearized(rgbComponent) {
        const normalized = rgbComponent / 100.0;
        let delinearized;

        if (normalized <= 0.0031308) {
            delinearized = 12.92 * normalized;
        } else {
            delinearized = 1.055 * Math.pow(normalized, 1 / 2.4) - 0.055;
        }

        return 255 * delinearized;
    }

    /**
     * Applies chromatic adaptation to a color component.
     *
     * @param {number} component - Color component
     * @return {number} - Adapted component
     */
    static chromaticAdaptation(component) {
        const aF = Math.pow(Math.abs(component), 0.42);
        return mathUtils.signum(component) * 400 * aF / (aF + 27.13);
    }

    /**
     * Calculates the hue of a linear RGB color.
     *
     * @param {number[]} linrgb - Linear RGB color
     * @return {number} - Hue in radians
     */
    static hueOf(linrgb) {
        const sD = mathUtils.matrixMultiply(linrgb, HctSolver.SCALED_DISCOUNT_FROM_LINRGB);
        const rA = HctSolver.chromaticAdaptation(sD[0]);
        const gA = HctSolver.chromaticAdaptation(sD[1]);
        const bA = HctSolver.chromaticAdaptation(sD[2]);
        return Math.atan2((rA + gA - 2 * bA) / 9, (11 * rA + -12 * gA + bA) / 11);
    }

    /**
     * Checks if three angles are in cyclic order.
     *
     * @param {number} a - First angle in radians
     * @param {number} b - Second angle in radians
     * @param {number} c - Third angle in radians
     * @return {boolean} - Whether the angles are in cyclic order
     */
    static areInCyclicOrder(a, b, c) {
        const dAB = HctSolver.sanitizeRadians(b - a);
        const dAC = HctSolver.sanitizeRadians(c - a);
        return dAB < dAC;
    }

    /**
     * Calculates the interpolation parameter for a value between two points.
     *
     * @param {number} source - Source value
     * @param {number} mid - Interpolated value
     * @param {number} target - Target value
     * @return {number} - Interpolation parameter (0.0 to 1.0)
     */
    static intercept(source, mid, target) {
        return (mid - source) / (target - source);
    }

    /**
     * Linearly interpolates between two points.
     *
     * @param {number[]} source - Source point
     * @param {number} t - Interpolation parameter (0.0 to 1.0)
     * @param {number[]} target - Target point
     * @return {number[]} - Interpolated point
     */
    static lerpPoint(source, t, target) {
        return [
            source[0] + (target[0] - source[0]) * t,
            source[1] + (target[1] - source[1]) * t,
            source[2] + (target[2] - source[2]) * t
        ];
    }

    /**
     * Sets a specific coordinate of a point to a value by interpolating.
     *
     * @param {number[]} source - Source point
     * @param {number} coordinate - Target coordinate value
     * @param {number[]} target - Target point
     * @param {number} axis - Axis to set (0, 1, or 2)
     * @return {number[]} - Resulting point
     */
    static setCoordinate(source, coordinate, target, axis) {
        const t = HctSolver.intercept(source[axis], coordinate, target[axis]);
        return HctSolver.lerpPoint(source, t, target,);
    }

    /**
     * Checks if a value is between 0 and 100, inclusive.
     *
     * @param {number} x - Value to check
     * @return {boolean} - Whether the value is bounded
     */
    static isBounded(x) {
        return 0 <= x && x <= 100;
    }

    /**
     * Gets the nth vertex of a cube in RGB space corresponding to a given Y (luminance) value.
     *
     * @param {number} y - Y (luminance) value
     * @param {number} n - Vertex index (0-11)
     * @return {number[]} - RGB coordinates, or [-1, -1, -1] if invalid
     */
    static nthVertex(y, n) {
        const kR = HctSolver.Y_FROM_LINRGB[0];
        const kG = HctSolver.Y_FROM_LINRGB[1];
        const kB = HctSolver.Y_FROM_LINRGB[2];

        // Determine 2 of the 3 coordinates based on the index
        const coords = [n % 4 <= 1 ? 0 : 100, n % 2 == 0 ? 0 : 100];
        let r, g, b;

        // Calculate the third coordinate to match the target Y value
        if (n < 4) {
            // R is the unknown
            g = coords[0], b = coords[1], r = (y - g * kG - b * kB) / kR;
        } else if (n < 8) {
            // G is the unknown
            b = coords[0], r = coords[1], g = (y - r * kR - b * kB) / kG;
        } else {
            // B is the unknown
            r = coords[0], g = coords[1], b = (y - r * kR - g * kG) / kB;
        }

        // Return the coordinates if valid, otherwise a sentinel value
        return HctSolver.isBounded(r) ? [r, g, b] : [-1, -1, -1];
    }

    /**
     * Bisects a segment of RGB space to find the segment containing the target hue.
     *
     * @param {number} y - Y (luminance) value
     * @param {number} targetHue - Target hue in radians
     * @return {number[][]} - Two points defining the segment
     */
    static bisectToSegment(y, targetHue) {
        let l = [-1, -1, -1], r = l, lH = 0, rH = 0, init = false, uncut = true;

        // Check all 12 possible vertices
        for (let n = 0; n < 12; n++) {
            const mid = HctSolver.nthVertex(y, n);

            // Skip invalid vertices
            if (mid[0] < 0) continue;

            const mH = HctSolver.hueOf(mid);

            if (!init) {
                // First valid vertex becomes both endpoints initially
                l = mid, r = mid, lH = mH, rH = mH, init = true;
                continue;
            }

            if (uncut || HctSolver.areInCyclicOrder(lH, mH, rH)) {
                uncut = false;

                if (HctSolver.areInCyclicOrder(lH, targetHue, mH)) {
                    // Target is between lH and mH
                    r = mid, rH = mH;
                } else {
                    // Target is between mH and rH, or beyond rH
                    l = mid, lH = mH;
                }
            }
        }

        return [l, r];
    }

    /**
     * Calculates the midpoint between two points.
     *
     * @param {number[]} a - First point
     * @param {number[]} b - Second point
     * @return {number[]} - Midpoint
     */
    static midpoint(a, b) {
        return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
    }

    /**
     * Finds the critical plane below a value.
     *
     * @param {number} x - Value to find plane below
     * @return {number} - Index of critical plane
     */
    static criticalPlaneBelow(x) {
        return Math.floor(x - 0.5);
    }

    /**
     * Finds the critical plane above a value.
     *
     * @param {number} x - Value to find plane above
     * @return {number} - Index of critical plane
     */
    static criticalPlaneAbove(x) {
        return Math.ceil(x - 0.5);
    }

    /**
     * Bisects the RGB cube to find a color with the specified Y and hue.
     *
     * @param {number} y - Y (luminance) value
     * @param {number} targetHue - Target hue in radians
     * @return {number[]} - RGB color
     */
    static bisectToLimit(y, targetHue) {
        // Find initial segment containing target hue
        let [l, r] = HctSolver.bisectToSegment(y, targetHue);
        let lH = HctSolver.hueOf(l);

        // Refine along each axis
        for (let axis = 0; axis < 3; axis++) {
            if (l[axis] !== r[axis]) {
                let lP = -1, rP = 255;

                // Calculate initial plane indices
                if (l[axis] < r[axis]) {
                    lP = HctSolver.criticalPlaneBelow(HctSolver.trueDelinearized(l[axis]));
                    rP = HctSolver.criticalPlaneAbove(HctSolver.trueDelinearized(r[axis]));
                } else {
                    lP = HctSolver.criticalPlaneAbove(HctSolver.trueDelinearized(l[axis]));
                    rP = HctSolver.criticalPlaneBelow(HctSolver.trueDelinearized(r[axis]));
                }

                // Binary search to find best plane
                for (let i = 0; i < 8; i++) {
                    if (Math.abs(rP - lP) <= 1) break;
                    else {
                        const mP = Math.floor((lP + rP) / 2);
                        const mPC = HctSolver.CRITICAL_PLANES[mP];
                        const mid = HctSolver.setCoordinate(l, mPC, r, axis);
                        const mH = HctSolver.hueOf(mid);

                        // Update search bounds
                        if (HctSolver.areInCyclicOrder(lH, targetHue, mH)) {
                            r = mid, rP = mP;
                        } else {
                            l = mid, lH = mH, lP = mP;
                        }
                    }
                }
            }
        }

        // Return midpoint of final segment
        return HctSolver.midpoint(l, r);
    }

    /**
     * Inverse of the chromatic adaptation function.
     *
     * @param {number} adapted - Adapted value
     * @return {number} - Original value
     */
    static inverseChromaticAdaptation(adapted) {
        const absAdapted = Math.abs(adapted);
        const base = Math.max(0, 27.13 * absAdapted / (400 - absAdapted));
        return mathUtils.signum(adapted) * Math.pow(base, 1 / 0.42);
    }

    /**
     * Finds a color with the desired hue, chroma, and J value.
     *
     * @param {number} hueRadians - Desired hue in radians
     * @param {number} chroma - Desired chroma
     * @param {number} y - Y (luminance) value
     * @return {number} - ARGB color
     */
    static findResultByJ(hueRadians, chroma, y) {
        // Initial J estimate
        let j = 11 * Math.sqrt(y);

        // Get viewing conditions
        const vC = ViewingConditions.DEFAULT;
        const tIC = 1 / Math.pow(1.64 - Math.pow(0.29, vC.n), 0.73);
        const eH = 0.25 * (Math.cos(hueRadians + 2) + 3.8);
        const p1 = 50000 / 13 * eH * vC.nc * vC.ncb;
        const hSin = Math.sin(hueRadians);
        const hCos = Math.cos(hueRadians);

        // Iterative refinement
        for (let i = 0; i < 5; i++) {
            const jN = j / 100;
            const alpha = (chroma === 0 || j === 0) ? 0 : chroma / Math.sqrt(jN);
            const t = Math.pow(alpha * tIC, 1 / 0.9);
            const aC = vC.aw * Math.pow(jN, 1 / vC.c / vC.z);
            const p2 = aC / vC.nbb;

            // Calculate RGB components
            const gamma = 23 * (p2 + 0.305) * t / (23 * p1 + 11 * t * hCos + 108 * t * hSin);
            const a = gamma * hCos;
            const b = gamma * hSin;

            const rA = (460 * p2 + 451 * a + 288 * b) / 1403;
            const gA = (460 * p2 - 891 * a - 261 * b) / 1403;
            const bA = (460 * p2 - 220 * a - 6300 * b) / 1403;

            const rCS = HctSolver.inverseChromaticAdaptation(rA);
            const gCS = HctSolver.inverseChromaticAdaptation(gA);
            const bCS = HctSolver.inverseChromaticAdaptation(bA);

            const lrgb = mathUtils.matrixMultiply([rCS, gCS, bCS], HctSolver.LINRGB_FROM_SCALED_DISCOUNT);

            // Check if RGB values are valid
            if (lrgb[0] < 0 || lrgb[1] < 0 || lrgb[2] < 0) return 0;

            // Calculate Y value of result
            const [kR, kG, kB] = HctSolver.Y_FROM_LINRGB;
            const fnJ = kR * lrgb[0] + kG * lrgb[1] + kB * lrgb[2];

            // Check if Y is valid
            if (fnJ <= 0) return 0;

            // Check if converged or this is the last iteration
            if (i === 4 || Math.abs(fnJ - y) < 0.002) {
                // Check if in gamut
                if (lrgb[0] > 100.01 || lrgb[1] > 100.01 || lrgb[2] > 100.01) return 0;

                // Return color
                return colorUtils.argbFromLinrgb(lrgb);
            }

            // Update J for next iteration
            j -= (fnJ - y) * j / (2 * fnJ);
        }

        return 0;
    }

    /**
     * Solves for a color with the given hue, chroma, and tone.
     *
     * @param {number} hueDegrees - Hue in degrees
     * @param {number} chroma - Chroma
     * @param {number} tone - Tone (L* value)
     * @return {number} - ARGB color
     */
    static solveToInt(hueDegrees, chroma, tone) {
        if (chroma < 0.0001 || tone < 0.0001 || tone > 99.9999) {
            return colorUtils.argbFromLstar(tone);
        }

        hueDegrees = mathUtils.sanitizeDegreesDouble(hueDegrees);
        const hueRadians = hueDegrees / 180 * Math.PI;

        // Try to find a color with exact CAM16 values first
        const result = HctSolver.findResultByJ(hueRadians, chroma, colorUtils.yFromLstar(tone));

        // If unsuccessful, use a geometric approach
        if (result === 0) {
            return colorUtils.argbFromLinrgb(HctSolver.bisectToLimit(colorUtils.yFromLstar(tone), hueRadians));
        }

        return result;
    }

    /**
     * Solves for a CAM16 object with the given hue, chroma, and tone.
     *
     * @param {number} hueDegrees - Hue in degrees
     * @param {number} chroma - Chroma
     * @param {number} tone - Tone (L* value)
     * @return {Cam16} - CAM16 color
     */
    static solveToCam(hueDegrees, chroma, tone) {
        return Cam16.fromInt(HctSolver.solveToInt(hueDegrees, chroma, tone));
    }
}

export {
    ViewingConditions,
    Cam16,
    Hct,
    HctSolver
};