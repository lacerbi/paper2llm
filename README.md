# `paper2llm` 📄→✨

Convert PDFs with a focus on academic papers into human-and-LLM-friendly **text-only Markdown files**.

### Features

- Text, tables and equations are parsed using [Mistral OCR](https://mistral.ai/en/news/mistral-ocr).
- Figures are converted to a textual description using a selected vision model (see below).
- Additional postprocessing is available, such as splitting the file into multiple parts (main, appendix, backmatter) and fetching a bibtex.
- **Example:** We converted all [our research group](https://www.helsinki.fi/en/researchgroups/machine-and-human-intelligence) papers to Markdown in [this repo](https://github.com/acerbilab/pubs-llms).

### Requirements

- You need a Mistral AI [API key](https://console.mistral.ai/api-keys) to use `paper2llm`. Their [free API tier](https://docs.mistral.ai/deployment/laplateforme/tier/) is compatible with `paper2llm`, within rate limits.
- For the image-to-text conversion, multiple providers are supported.
- **You should read the [API Keys Security Guide](https://github.com/lacerbi/paper2llm/blob/main/paper2llm-web/docs/security/README.md) before using the app with your API keys.**

### Credits

`paper2llm` was written by [Luigi Acerbi](https://lacerbi.github.io/) using [Claude](https://www.anthropic.com/claude) and [Claude Code](https://claude.ai/code).
You can follow me on [X](https://x.com/AcerbiLuigi), [LinkedIn](https://www.linkedin.com/in/luigi-acerbi-719b492/), and [Bluesky](https://bsky.app/profile/lacerbi.bsky.social).

## Image Descriptions and Vision Models

After the OCR step, figures are converted to a Markdown text description using vision models such as Mistral AI's [Mistral Small 3.1](https://mistral.ai/news/mistral-small-3-1) or Google's [Gemini 3 Flash](https://blog.google/products/gemini/gemini-3-flash/). You can select the desired vision model via a dropdown menu, based on which API keys you entered.

<details>
<summary>Notes on vision models choice.</summary>

- Both Mistral AI and Google Gemini offer a **free API tier**.
- [**Gemini 3 Flash**](https://blog.google/products/gemini/gemini-3-flash/) is our currently recommended model for `paper2llm`. It is included in the [Gemini API free tier](https://ai.google.dev/gemini-api/docs/pricing) or otherwise very cheap, and shows very good performance.
- If you prefer to stick to only using the Mistral AI API, the default free Mistral AI model, [Mistral Small 3.1](https://mistral.ai/news/mistral-small-3-1), is a top-performing model in its size category and works generally well.
- [Mistral Large 3](https://mistral.ai/news/mistral-large-3) or [Pixtral Large](https://mistral.ai/news/pixtral-large) may work better for understanding complex diagrams and concepts, but they are premier models.
- Other premium models such as OpenAI's GPT-5, Anthropic's Claude 4.5 Sonnet, or Google Gemini 3 Pro might work better for complex figures, but beware of API costs.
</details>

## Disclaimers

- We have no affiliation or financial relationship with Mistral AI, besides sympathy for a European AI company and appreciation for their AI models, nor with any other LLM providers.
- This is a _research preview_, as they say. Use at your own risk and with all the caveats of modern AI and LLM usage.
- In particular, image descriptions might be off in clear or subtle ways and you should double-check and fix them as needed.

### Privacy and Legal

- **Data transmission:** When you use `paper2llm`, your PDF content is sent to third-party API providers (Mistral AI, OpenAI, Google, Anthropic) for processing. By using this tool, you agree to the terms of service and privacy policies of these providers.
- **No server-side storage:** `paper2llm` runs entirely in your browser. We do not store, collect, or have access to your documents, API keys, or converted files.
- **Your responsibility:** You are solely responsible for ensuring you have the right to process and convert any documents you upload. Do not upload confidential, proprietary, or sensitive documents unless you understand and accept the data handling practices of the API providers.
- **API provider policies:** Please review the data usage policies of the respective providers, as some may use API inputs for model training unless you opt out. See [Mistral AI](https://mistral.ai/terms/), [OpenAI](https://openai.com/policies/), [Google](https://ai.google.dev/terms), and [Anthropic](https://www.anthropic.com/legal/privacy) for details.

## License

`paper2llm` is released under the terms of the [MIT License](LICENSE).
