# dream (Fork of material-color-utilities)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**dream** is a Javascript library for dynamic color theming, originally forked from Google's excellent [material-color-utilities](https://github.com/material-foundation/material-color-utilities) project. It provides utilities for color science and dynamic color scheme generation based on the principles of Material Design 3.

This fork, **dream**, has been refactored into a **single `main.js` file** for ease of use in various JavaScript environments and is maintained and distributed under the **MIT License**.

This fork currently includes 2 new functions:

`themeFromSourceColors()` and `themeFromImageUsingSources()`, which are
analogous to `themeFromSourceColor()` and `themeFromImageUsingSource()`,
but generate themes and palletes from more then 1 seed/source.

The demo "Multi Source" option uses 3 which map to primary, secodary, and tertiary.

## Demo

Use a local web server of your choice to server `index.html`

For example:

```bash
pytnon -m http.server
```

Then open the demo in a web browser.

## Acknowledgement

**dream** is built upon the foundation of Google's open-source `material-color-utilities` project. We acknowledge and appreciate the work done by the original authors.

The original `material-color-utilities` project is licensed under the Apache License 2.0. You can find the full license text here:

[Apache License 2.0](https://www.apache.org/licenses/LICENSE-2.0)

## License

**dream** is distributed under the **MIT License**. See the `LICENSE` file for details. This allows for more permissive use and integration compared to the original Apache 2.0 license.
