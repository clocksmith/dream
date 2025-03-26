// functional_tests.js

const newLib = require('./path/to/your/new/js/library'); // <--- ADJUST PATH TO YOUR NEW JS LIB
const oldLib = require('./path/to/ts/compiled/js/library'); // <--- ADJUST PATH TO TS COMPILED JS LIB

// --- Helper Assertion Functions (No external deps!) ---

function assertEqual(actual, expected, message) {
    if (actual !== expected) {
        throw new Error(`Assertion failed: ${message} - Expected: ${expected}, Actual: ${actual}`);
    }
}

function assertDeepEqual(actual, expected, message) {
    // Basic deep equality for objects/arrays (can be improved if needed)
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        throw new Error(`Assertion failed: ${message} - Expected: ${JSON.stringify(expected)}, Actual: ${JSON.stringify(actual)}`);
    }
}

function assertTrue(condition, message) {
    if (!condition) {
        throw new Error(`Assertion failed: ${message} - Expected: true, Actual: false`);
    }
}

function assertFalse(condition, message) {
    if (condition) {
        throw new Error(`Assertion failed: ${message} - Expected: false, Actual: true`);
    }
}

// --- Test Workflow Functions ---

function testColorConversions(lib) {
    console.log("Running Color Conversion Tests...");

    // --- Test Case 1: ARGB <-> Hex ---
    const argbColor = 0xFF0088CC;
    const hexString = lib.hexUtils.hexFromArgb(argbColor);
    const convertedArgb = lib.hexUtils.argbFromHex(hexString);
    assertEqual(convertedArgb, argbColor, "ARGB <-> Hex Conversion");

    // --- Test Case 2: ARGB -> HCT -> ARGB ---
    const argbColor2 = 0xFFFFAA00;
    const hctColor = lib.Hct.fromInt(argbColor2);
    const roundTripArgb = hctColor.toInt();
    assertEqual(roundTripArgb, argbColor2, "ARGB -> HCT -> ARGB Roundtrip");

    // --- Test Case 3: ARGB -> Lab -> ARGB Roundtrip (less precise, allow small delta) ---
    const argbColor3 = 0xFF55AA33;
    const labColor = lib.colorUtils.labFromArgb(argbColor3);
    const labRoundTripArgb = lib.colorUtils.argbFromLab(labColor[0], labColor[1], labColor[2]);
    assertTrue(Math.abs(labRoundTripArgb - argbColor3) < 2, "ARGB -> Lab -> ARGB Roundtrip"); // Allow small delta

    console.log("Color Conversion Tests Passed!");
}


function testSchemeGeneration(lib) {
    console.log("Running Scheme Generation Tests...");

    const seedColor = 0xFF4080FF; // Example seed color

    // --- Test Case 1: Scheme.light() structure and basic colors ---
    const lightScheme = lib.Scheme.light(seedColor);
    assertTrue(lightScheme instanceof lib.Scheme, "Scheme.light() returns a Scheme object");
    assertTrue(typeof lightScheme.primary === 'number', "Scheme.light() has primary color");
    assertTrue(typeof lightScheme.background === 'number', "Scheme.light() has background color");

    // --- Test Case 2: Scheme.dark() structure and basic colors ---
    const darkScheme = lib.Scheme.dark(seedColor);
    assertTrue(darkScheme instanceof lib.Scheme, "Scheme.dark() returns a Scheme object");
    assertTrue(typeof darkScheme.primary === 'number', "Scheme.dark() has primary color");
    assertTrue(typeof darkScheme.background === 'number', "Scheme.dark() has background color");

    // --- Test Case 3: SchemeTonalSpot structure ---
    const tonalSpotScheme = new lib.SchemeTonalSpot(lib.Hct.fromInt(seedColor), false, 0); // Light mode, default contrast
    assertTrue(tonalSpotScheme instanceof lib.DynamicScheme, "SchemeTonalSpot is a DynamicScheme");
    assertTrue(typeof tonalSpotScheme.primary === 'number', "SchemeTonalSpot has primary color");


    // --- Basic Contrast Check (Example: Surface vs. OnSurface in Light Scheme) ---
    const contrastRatio = lib.Contrast.ratioOfTones(
        lib.colorUtils.lstarFromArgb(lightScheme.surface),
        lib.colorUtils.lstarFromArgb(lightScheme.onSurface)
    );
    assertTrue(contrastRatio >= 3.0, "Light Scheme Surface/OnSurface Contrast >= 3.0"); // Basic check

    console.log("Scheme Generation Tests - Basic Structure and Contrast Checked!");
}


function testThemeGeneration(lib) {
    console.log("Running Theme Generation Tests...");

    const sourceColor = 0xFF00AABB;

    // --- Test Case 1: themeFromSourceColor structure ---
    const theme = lib.themeFromSourceColor(sourceColor);
    assertTrue(typeof theme === 'object', "themeFromSourceColor returns an object");
    assertTrue(typeof theme.schemes === 'object' && theme.schemes.light && theme.schemes.dark, "Theme has light and dark schemes");
    assertTrue(Array.isArray(theme.customColors), "Theme has customColors array");

    // --- Test Case 2: Theme palettes are present and TonalPalette instances ---
    assertTrue(theme.palettes.primary instanceof lib.TonalPalette, "Theme has primary palette");
    assertTrue(theme.palettes.secondary instanceof lib.TonalPalette, "Theme has secondary palette");

    // --- Test Case 3: Theme with Custom Colors ---
    const customColors = [{ value: 0xFFCC00CC, name: "Custom Purple", blend: true }];
    const themeWithCustom = lib.themeFromSourceColor(sourceColor, customColors);
    assertTrue(themeWithCustom.customColors.length > 0, "Theme with custom colors has customColors");
    assertTrue(themeWithCustom.customColors[0].color.name === "Custom Purple", "Custom color name is correct");


    console.log("Theme Generation Tests - Basic Structure and Custom Colors Checked!");
}

function testThemeApplication(lib) {
    console.log("Running Theme Application Tests...");

    const theme = lib.themeFromSourceColor(0xFF123456);
    const testElement = { style: {} }; // Simulate a minimal DOM element

    // --- Test Case 1: Apply theme without brightness suffix ---
    lib.applyTheme(theme, { target: testElement });
    assertTrue(typeof testElement.style['--md-sys-color-primary'] === 'string', "applyTheme sets --md-sys-color-primary");
    assertTrue(testElement.style['--md-sys-color-primary'].startsWith('#'), "--md-sys-color-primary is a hex code");

    // --- Test Case 2: Apply theme with brightness suffix ---
    const testElement2 = { style: {} };
    lib.applyTheme(theme, { target: testElement2, brightnessSuffix: true });
    assertTrue(typeof testElement2.style['--md-sys-color-primary-light'] === 'string', "applyTheme with suffix sets --md-sys-color-primary-light");
    assertTrue(typeof testElement2.style['--md-sys-color-primary-dark'] === 'string', "applyTheme with suffix sets --md-sys-color-primary-dark");


    console.log("Theme Application Tests - Basic Functionality Checked!");
}


// --- Main Test Execution ---

function runTests(lib, libName) {
    console.log(`\n--- Running tests against: ${libName} ---`);
    try {
        testColorConversions(lib);
        testSchemeGeneration(lib);
        testThemeGeneration(lib);
        testThemeApplication(lib);
        console.log(`\n--- All tests PASSED for: ${libName} ---`);

    } catch (error) {
        console.error(`\n--- Tests FAILED for: ${libName} ---`);
        console.error(error);
    }
}


// --- Run tests against BOTH libraries (adjust paths at the top!) ---

runTests(newLib, "New JavaScript Library");
runTests(oldLib, "Original TS-Compiled Library"); // Now testing both

console.log("\n--- Test Run Complete ---");