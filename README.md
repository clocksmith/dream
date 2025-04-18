# dream

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**dream** is a Javascript library for dynamic color theming, forked from Google's [material-color-utilities](https://github.com/material-foundation/material-color-utilities). It provides utilities for color science and dynamic color scheme generation based on Material Design 3 principles.

This fork has been refactored into a single [`dream.js`](./dream.js) file and is maintained under the MIT License. It includes functions like [`themeFromSourceColors()`](./dream.js#L<line_number>) and [`themeFromImageUsingSources()`](./dream.js#L<line_number>) for multi-seed theme generation. 

## Demo

All demo files are located in the `demo/` folder. The demo showcases the library's capabilities, allowing users to generate Material Design 3 color palettes from text prompts, specific colors, or image uploads. It demonstrates patterns like **Human-in-the-loop** interaction, leveraging **Large Language Models (LLMs)** for creative input (like color suggestions from text), and uses an orchestration approach inspired by concepts like **[Model-Context-Protocol (MCP)](https://ai.googleblog.com/2023/06/google-at-icml-2023.html)** (see related agentic workflow discussions) internally to manage the workflow between user input, LLM calls, and core color utilities ([`dream.js`](./dream.js) functions). It displays the resulting themes and previews how components would look with the generated colors.

Use a local web server of your choice from the root directory and navigate to `/demo/index.html`.

For example, using Python's built-in server:

```bash
python -m http.server
```

Then open http://localhost:8000/demo/ in your web browser.

## Acknowledgement

dream is built upon Google's material-color-utilities project (Apache License 2.0).

## License

dream is distributed under the MIT License. See the LICENSE file for details.
