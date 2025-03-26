/**
 * Demo script showcasing Material Dynamic Color functionality
 */

import {
    colorUtils,
    hexUtils,
    mathUtils
} from './dc_core.js';

import {
    Hct
} from './dc_color.js';

import {
    TonalPalette,
    CorePalette
} from './dc_palettes.js';

import {
    DynamicScheme
} from './dc_scheme.js';

import {
    ContrastCurve,
    Contrast
} from './dc_contrast.js';

import {
    MaterialDynamicColors,
    themeFromSourceColor,
    dynamicThemeFromSourceColor,
    Blend,
    Score
} from './dc_theme.js';

import {
    QuantizerWu
} from './dc_quant.js';

function demoBasicTheme() {
    console.log('\n🎨 DEMO 1: Basic Theme Generation');

    const sourceColorHex = '#0B57D0';
    const sourceColor = hexUtils.argbFromHex(sourceColorHex);
    console.log(`Source color: ${sourceColorHex} (ARGB: ${sourceColor.toString(16)})`);

    // Create palette
    const palette = CorePalette.of(sourceColor);

    // Use direct tone access instead of MaterialDynamicColors
    console.log('\nLight Mode Colors:');
    console.log(`Primary: ${hexUtils.hexFromArgb(palette.a1.tone(40))}`);
    console.log(`On Primary: ${hexUtils.hexFromArgb(palette.a1.tone(100))}`);
    console.log(`Primary Container: ${hexUtils.hexFromArgb(palette.a1.tone(90))}`);
    console.log(`Surface: ${hexUtils.hexFromArgb(palette.n1.tone(98))}`);

    console.log('\nDark Mode Colors:');
    console.log(`Primary: ${hexUtils.hexFromArgb(palette.a1.tone(80))}`);
    console.log(`On Primary: ${hexUtils.hexFromArgb(palette.a1.tone(20))}`);
    console.log(`Primary Container: ${hexUtils.hexFromArgb(palette.a1.tone(30))}`);
    console.log(`Surface: ${hexUtils.hexFromArgb(palette.n1.tone(6))}`);
}

function demoBasicMaterialTheme() {
    console.log('\n🎨 DEMO 1: Basic Theme Generation');

    const sourceColorHex = '#0B57D0';
    const sourceColor = hexUtils.argbFromHex(sourceColorHex);
    console.log(`Source color: ${sourceColorHex} (ARGB: ${sourceColor.toString(16)})`);

    const theme = themeFromSourceColor(sourceColor);

    console.log('\nLight Mode Colors:');
    console.log(`Primary: ${hexUtils.hexFromArgb(MaterialDynamicColors.primary.getArgb(theme.schemes.light))}`);
    console.log(`On Primary: ${hexUtils.hexFromArgb(MaterialDynamicColors.onPrimary.getArgb(theme.schemes.light))}`);
    console.log(`Primary Container: ${hexUtils.hexFromArgb(MaterialDynamicColors.primaryContainer.getArgb(theme.schemes.light))}`);
    console.log(`Surface: ${hexUtils.hexFromArgb(MaterialDynamicColors.surface.getArgb(theme.schemes.light))}`);

    console.log('\nDark Mode Colors:');
    console.log(`Primary: ${hexUtils.hexFromArgb(MaterialDynamicColors.primary.getArgb(theme.schemes.dark))}`);
    console.log(`On Primary: ${hexUtils.hexFromArgb(MaterialDynamicColors.onPrimary.getArgb(theme.schemes.dark))}`);
    console.log(`Primary Container: ${hexUtils.hexFromArgb(MaterialDynamicColors.primaryContainer.getArgb(theme.schemes.dark))}`);
    console.log(`Surface: ${hexUtils.hexFromArgb(MaterialDynamicColors.surface.getArgb(theme.schemes.dark))}`);
}

function demoContrastLevels() {
    console.log('\n🔆 DEMO 2: Dynamic Themes with Contrast Levels');

    const sourceColor = hexUtils.argbFromHex('#6750A4');

    const contrastLevels = [-1, -0.5, 0, 0.5, 1];

    for (const contrast of contrastLevels) {
        console.log(`\nContrast Level: ${contrast}`);

        const lightTheme = dynamicThemeFromSourceColor(sourceColor, false, contrast);
        const darkTheme = dynamicThemeFromSourceColor(sourceColor, true, contrast);

        const lightTextBgContrast = Contrast.ratioOfTones(
            colorUtils.lstarFromArgb(MaterialDynamicColors.onSurface.getArgb(lightTheme.schemes.light)),
            colorUtils.lstarFromArgb(MaterialDynamicColors.surface.getArgb(lightTheme.schemes.light))
        );

        const darkTextBgContrast = Contrast.ratioOfTones(
            colorUtils.lstarFromArgb(MaterialDynamicColors.onSurface.getArgb(darkTheme.schemes.dark)),
            colorUtils.lstarFromArgb(MaterialDynamicColors.surface.getArgb(darkTheme.schemes.dark))
        );

        console.log(`Light mode text/bg contrast: ${lightTextBgContrast.toFixed(2)}`);
        console.log(`Dark mode text/bg contrast: ${darkTextBgContrast.toFixed(2)}`);
    }
}

function demoHctColorSpace() {
    console.log('\n🌈 DEMO 3: HCT Color Space');

    const hct = Hct.from(270, 40, 60);
    console.log(`HCT(270, 40, 60) as hex: ${hexUtils.hexFromArgb(hct.toInt())}`);

    console.log('\nTransforming colors in HCT space:');

    const hctCopy = Hct.fromInt(hct.toInt());

    hctCopy.hue = (hctCopy.hue + 60) % 360;
    console.log(`After 60° hue rotation: ${hexUtils.hexFromArgb(hctCopy.toInt())}`);

    hctCopy.chroma = Math.min(100, hctCopy.chroma + 20);
    console.log(`After increasing chroma: ${hexUtils.hexFromArgb(hctCopy.toInt())}`);

    hctCopy.tone = 80;
    console.log(`After setting tone to 80: ${hexUtils.hexFromArgb(hctCopy.toInt())}`);
}

function demoTonalPalettes() {
    console.log('\n🎭 DEMO 4: Tonal Palettes');

    const sourceColor = hexUtils.argbFromHex('#00A3FF');
    const hct = Hct.fromInt(sourceColor);

    const palette = TonalPalette.fromHueAndChroma(hct.hue, hct.chroma);

    const tones = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 95, 99, 100];

    console.log(`Palette colors from HCT(${Math.round(hct.hue)}, ${Math.round(hct.chroma)}):`);
    for (const tone of tones) {
        console.log(`Tone ${tone}: ${hexUtils.hexFromArgb(palette.tone(tone))}`);
    }
}

function demoBlending() {
    console.log('\n🔄 DEMO 5: Color Blending and Harmonization');

    const color1 = hexUtils.argbFromHex('#DB4437');
    const color2 = hexUtils.argbFromHex('#0F9D58');

    console.log(`Color 1: ${hexUtils.hexFromArgb(color1)}`);
    console.log(`Color 2: ${hexUtils.hexFromArgb(color2)}`);

    const blendAmounts = [0, 25, 50, 75, 100];

    console.log('\nHarmonizing colors:');
    for (const amount of blendAmounts) {
        const blended = Blend.harmonize(color1, color2, amount);
        console.log(`Blend ${amount}%: ${hexUtils.hexFromArgb(blended)}`);
    }
}

function demoContrast() {
    console.log('\n♿ DEMO 6: Contrast and Accessibility');

    const darkTone = 10;
    const midTone = 50;
    const lightTone = 90;

    const contrastDarkMid = Contrast.ratioOfTones(darkTone, midTone);
    const contrastDarkLight = Contrast.ratioOfTones(darkTone, lightTone);
    const contrastMidLight = Contrast.ratioOfTones(midTone, lightTone);

    console.log(`Contrast between tones ${darkTone} and ${midTone}: ${contrastDarkMid.toFixed(2)}`);
    console.log(`Contrast between tones ${darkTone} and ${lightTone}: ${contrastDarkLight.toFixed(2)}`);
    console.log(`Contrast between tones ${midTone} and ${lightTone}: ${contrastMidLight.toFixed(2)}`);

    const targetContrast = 4.5;
    const sufficientLightTone = Contrast.lighter(darkTone, targetContrast);

    console.log(`\nTo achieve a contrast of ${targetContrast} with tone ${darkTone}:`);
    console.log(`Lighter tone needed: ${sufficientLightTone.toFixed(1)}`);
    console.log(`Actual contrast: ${Contrast.ratioOfTones(darkTone, sufficientLightTone).toFixed(2)}`);
}

function demoColorExtraction() {
    console.log('\n🖼️ DEMO 7: Color Extraction (Wu Quantizer)');

    const mockImageData = {
        data: [
            255, 0, 0, 255,
            200, 30, 30, 255,
            180, 40, 40, 255,

            0, 0, 255, 255,
            30, 30, 200, 255,

            0, 255, 0, 255,
            30, 200, 30, 255,

            255, 255, 0, 255,
            200, 200, 30, 255,
        ]
    };

    const quantizer = new QuantizerWu();
    const colors = quantizer.quantize(extractPixelsFromImageData(mockImageData), 5);

    console.log('Extracted dominant colors:');
    for (const color of colors) {
        console.log(`  ${hexUtils.hexFromArgb(color)}`);
    }
}

function extractPixelsFromImageData(imageData) {
    const pixels = [];
    for (let i = 0; i < imageData.data.length; i += 4) {
        const r = imageData.data[i];
        const g = imageData.data[i + 1];
        const b = imageData.data[i + 2];
        const a = imageData.data[i + 3];

        const argb = (a << 24) | (r << 16) | (g << 8) | b;
        pixels.push(argb);
    }
    return pixels;
}

function runAllDemos() {
    console.log('===== MATERIAL DYNAMIC COLOR SYSTEM DEMO =====');
    demoBasicTheme();
    // demoBasicMaterialTheme();
    demoContrastLevels();
    demoHctColorSpace();
    demoTonalPalettes();
    demoBlending();
    demoContrast();
    demoColorExtraction();
    console.log('\n===== DEMO COMPLETE =====');
}

runAllDemos();