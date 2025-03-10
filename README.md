# paper2llm

Convert PDFs with a focus on academic papers into human-and-LLM-friendly **text-only Markdown files**.

- Text, tables and equations are parsed using [Mistral AI](https://mistral.ai/en)'s [OCR model](https://mistral.ai/en/news/mistral-ocr).
- Figures are converted to a text description using vision models such as [Pixtral 12B](https://mistral.ai/en/news/pixtral-12b).
- You need a Mistral AI [API key](https://console.mistral.ai/api-keys) to use `paper2llm`. Their [free API tier](https://docs.mistral.ai/deployment/laplateforme/tier/) is compatible with `paper2llm`, within rate limits.

`paper2llm` was written by [Luigi Acerbi](https://lacerbi.github.io/) using [Claude 3.7 Sonnet](https://www.anthropic.com/news/claude-3-7-sonnet). 
You can follow me on [X](https://x.com/AcerbiLuigi) and [Bluesky](https://bsky.app/profile/lacerbi.bsky.social).

## Disclaimers

- We have no affiliation or financial relationship with Mistral AI, besides sympathy for a European AI company and appreciation for their AI models.
- This is a research preview, as they say. Use at your own risk and with all the caveats of modern AI and LLM usage.
- In particular, image descriptions might be off in many ways. The default model, Pixtral 12B, is a fantastic model for its size, but might not be best suited for understanding complex diagrams and concepts.
  - See if [Pixtral Large](https://mistral.ai/en/news/pixtral-large) works better (you may need API credits).
  - It's unclear if Pixtral Large is available on the free API tier - the API call is not rejected, but it might redirect to Pixtral 12B.
- We should add support for other vision model APIs (at a minimum, OpenAI's API) for the image-to-text conversion. This is a bit of a pain point for having to add multiple API providers.

## License

`paper2llm` is released under the terms of the [MIT License](LICENSE).
