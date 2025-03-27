# dream (Fork of material-color-utilities)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**dream** is a Javascript library for dynamic color theming, originally forked from Google's excellent [material-color-utilities](https://github.com/material-foundation/material-color-utilities) project. It provides utilities for color science and dynamic color scheme generation based on the principles of Material Design 3.

This fork, **dream**, has been refactored into a **single `main.js` file** for ease of use in various JavaScript environments and is maintained and distributed under the **MIT License**.

## Key Features

*   **Dynamic Color Schemes:** Generates comprehensive and harmonious color schemes (including light/dark modes and contrast levels) from a single seed color using Material Design 3 principles.
*   **Color Science Foundation:** Leverages advanced color spaces like HCT (Hue, Chroma, Tone) and CAM16 for perceptually accurate color manipulation and contrast calculations.
*   **Color Quantization:** Includes algorithms (Wu, WSMeans) for extracting prominent colors from images by reducing color palettes while maintaining visual fidelity.
*   **Theme Generation & Application:** Provides functions to create complete theme objects (palettes, schemes, custom colors) and apply them as CSS custom properties to DOM elements.
*   **Single File Distribution:** Consolidated into a single `main.js` file with JSDoc annotations and `@section` separators for improved integration and understanding.
*   **MIT Licensed:** Offers permissive licensing for broader use cases.

## Installation

Since `dream` is provided as a single file (`main.js`), you can integrate it in several ways:

1.  **Directly include via `<script>` tag:**
    ```html
    <script type="module" src="path/to/main.js"></script>
    <script>
        // Your code using the library's exported functions/classes
        // e.g., const theme = dream.themeFromSourceColor(...)
        // Note: Exports might be available directly or under a namespace depending on how you load it.
    </script>
    ```

2.  **Import in a module-based project:**
    ```javascript
    import * as dream from './path/to/dream.js';
    // or import specific parts if needed (adjust based on actual exports)
    // import { themeFromSourceColor, applyTheme, Hct } from './path/to/dream.js';

    const sourceColor = dream.hexUtils.argbFromHex('#6750A4');
    const theme = dream.themeFromSourceColor(sourceColor);
    dream.applyTheme(theme, { target: document.body });
    ```

3.  **Copy-paste:** You can copy the contents of `dream.js` directly into your project if needed.

*(Adjust paths and import methods based on your project structure and build tools.)*

## Basic Usage

```javascript
// Assuming you have imported the library, e.g., as 'dream'

// 1. Define a source color (e.g., from hex)
const sourceColorHex = '#3498db'; // Example blue
const sourceColorArgb = dream.hexUtils.argbFromHex(sourceColorHex);

// 2. Generate the theme
const theme = dream.themeFromSourceColor(sourceColorArgb);

// 3. Apply the theme (e.g., to the document body for light mode)
dream.applyTheme(theme, {
    dark: false, // Apply light mode
    target: document.body // Apply CSS variables to the <body> element
});

// --- You can now use the generated CSS variables in your CSS ---
/*
body {
  background-color: var(--md-sys-color-background);
  color: var(--md-sys-color-on-background);
}

button {
  background-color: var(--md-sys-color-primary);
  color: var(--md-sys-color-on-primary);
}
*/

// --- To apply dark mode ---
// dream.applyTheme(theme, { dark: true, target: document.body });

// --- Generate colors with specific contrast ---
const highContrastSchemes = hctjs.dynamicSchemesFromSourceColor(sourceColorArgb, 0.5); // Contrast level 0.5
const highContrastPrimary = hctjs.MaterialDynamicColors.primary.getArgb(highContrastSchemes.light);
console.log('High Contrast Light Primary:', hctjs.hexUtils.hexFromArgb(highContrastPrimary));

// --- Manipulate colors in HCT ---
const hctColor = dream.Hct.fromInt(sourceColorArgb);
hctColor.tone = 80; // Make it lighter
const lighterArgb = hctColor.toInt();
console.log('Lighter Blue:', dream.hexUtils.hexFromArgb(lighterArgb));


Explore the `main.js` file and the included demo functions for more detailed examples of using palettes, contrast calculation, color extraction, and blending.
```

## Acknowledgement

**dream** is built upon the foundation of Google's open-source `material-color-utilities` project. We acknowledge and appreciate the work done by the original authors.

The original `material-color-utilities` project is licensed under the Apache License 2.0. You can find the full license text here:

[Apache License 2.0](https://www.apache.org/licenses/LICENSE-2.0)

## License

**dream** is distributed under the **MIT License**. See the `LICENSE` file for details. This allows for more permissive use and integration compared to the original Apache 2.0 license.


## TypeScript Build Workflows: Base, JSDoc, API Preserved, Minified

This guide outlines the command-line steps to build your TypeScript project in four different ways: a base transpile, transpiled to JavaScript with JSDoc, minified JavaScript with preserved API names, and fully minified JavaScript.

### Prerequisites

1.  **Node.js & npm/yarn:** Ensure you have Node.js installed.
2.  **Install Dependencies:** Run this command in your project's root directory:
    ```bash
    npm install --save-dev typescript terser tslib
    # or
    yarn add --dev typescript terser tslib
    ```
3.  **`tsconfig` Files:** Make sure you have the following files configured in your project root (adjust `exclude` arrays as needed per your project structure):
    *   `tsconfig.json` (Base configuration)
    *   `tsconfig.jsdoc.json` (Extends base, for JSDoc conversion - **Note:** Assumes tests are *included* as requested)
    *   `tsconfig.api.json` (Extends base, for API preservation prep)
    *   `tsconfig.minify.json` (Extends base, for full minification prep)

---

### Build 1: Base Transpiled Output

This process uses the base `tsconfig.json` to transpile TypeScript to JavaScript, typically including declaration files and source maps, without any minification by `tsc` itself.

```bash
# 1. Transpile TS to JS using the base configuration
npx tsc -p tsconfig.json
```

*   **Final Output (Build 1):** Standard JavaScript files, `.d.ts` declaration files, and source maps located in `./dist/base/` (or as configured in `tsconfig.json`'s `outDir`).

---

### Build 2: JSDoc Converted Output (Including Tests)

This process uses `tsc` with `tsconfig.jsdoc.json` to transpile your TypeScript code (including test files, as requested) into standard JavaScript, adding JSDoc comments based on your original TypeScript type annotations.

```bash
# 1. Transpile TS directly to JS with JSDoc annotations (using tsconfig.jsdoc.json)
npx tsc -p tsconfig.jsdoc.json
```

*   **Final Output (Build 2):** JavaScript files (including transpiled tests) with JSDoc type annotations located in `./dist/jsdoc/`. Note that `.d.ts` files might also be generated; you can typically ignore or delete these if your goal is solely the JSDoc-annotated JavaScript.

---

### Build 3: API Preserved Minified Output

This process transpiles TypeScript to JavaScript and generates declaration (`.d.ts`) files. Terser is then used to minify the JavaScript while attempting to preserve the names of your public API (classes, functions, constants, etc.). Declaration files are copied separately.

```bash
# 1. Transpile TS to JS + .d.ts (intermediate step using tsconfig.api.json)
npx tsc -p tsconfig.api.json

# 2. Minify JS, preserving key API names (IMPORTANT: customize 'reserved' list)
npx terser ./dist/api-temp/**/*.js \
  --compress \
  --mangle reserved=['MyClass','myFunction','MY_CONST'] \
  --source-map "content=inline,url=output.api.min.js.map" \
  -o ./dist/api/output.api.min.js
  # Consider adding Terser options like --keep-classnames and --keep-fnames if needed for your API

# 3. Copy declaration files (.d.ts, .d.ts.map) to the final API directory
# Example for Linux/macOS (preserves directory structure):
find ./dist/api-temp -name '*.d.ts' -exec cp --parents {} ./dist/api/ \;
find ./dist/api-temp -name '*.d.ts.map' -exec cp --parents {} ./dist/api/ \;

# Example for Windows (PowerShell - preserves directory structure):
# Get-ChildItem -Path ./dist/api-temp -Recurse -Filter *.d.ts | Copy-Item -Destination ./dist/api -Container
# Get-ChildItem -Path ./dist/api-temp -Recurse -Filter *.d.ts.map | Copy-Item -Destination ./dist/api -Container

# 4. (Optional) Clean up intermediate files
# rm -rf ./dist/api-temp
```

*   **Final Output (Build 3):** Minified JavaScript with preserved API names in `./dist/api/output.api.min.js`, along with corresponding `.d.ts` declaration files and source maps in the `./dist/api/` directory structure.

---

### Build 4: Fully Minified Output

This process transpiles TypeScript to an intermediate JavaScript format and then uses Terser to fully minify it (including renaming variables, removing whitespace, dead code elimination, etc.).

```bash
# 1. Transpile TS to JS (intermediate step using tsconfig.minify.json)
npx tsc -p tsconfig.minify.json

# 2. Minify the JS output using Terser (full compression and mangling)
npx terser ./dist/minified-temp/**/*.js \
  --compress \
  --mangle \
  --source-map "content=inline,url=output.min.js.map" \
  -o ./dist/minified/output.min.js

# 3. (Optional) Clean up intermediate files
# rm -rf ./dist/minified-temp
```

*   **Final Output (Build 4):** Fully minified JavaScript in `./dist/minified/output.min.js` and its source map (`output.min.js.map`).

---