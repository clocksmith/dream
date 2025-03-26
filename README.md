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
```

Explore the `main.js` file and the included demo functions for more detailed examples of using palettes, contrast calculation, color extraction, and blending.

## Acknowledgement

**dream** is built upon the foundation of Google's open-source `material-color-utilities` project. We acknowledge and appreciate the work done by the original authors.

The original `material-color-utilities` project is licensed under the Apache License 2.0. You can find the full license text here:

[Apache License 2.0](https://www.apache.org/licenses/LICENSE-2.0)

## License

**dream** is distributed under the **MIT License**. See the `LICENSE` file for details. This allows for more permissive use and integration compared to the original Apache 2.0 license.
```