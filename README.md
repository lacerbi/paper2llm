# paper2llm

Convert PDFs with a focus on academic papers into human-and-LLM-friendly **text-only Markdown files**.

- Text, tables and equations are parsed using [Mistral OCR](https://mistral.ai/en/news/mistral-ocr).
- Figures are converted to a textual description using a selected vision model (see below).
- You need a Mistral AI [API key](https://console.mistral.ai/api-keys) to use `paper2llm`. Their [free API tier](https://docs.mistral.ai/deployment/laplateforme/tier/) is compatible with `paper2llm`, within rate limits.
- For the image-to-text conversion, multiple providers are supported.

`paper2llm` was written by [Luigi Acerbi](https://lacerbi.github.io/) using [Claude 3.7 Sonnet](https://www.anthropic.com/news/claude-3-7-sonnet) and Athanor. 
You can follow me on [X](https://x.com/AcerbiLuigi) and [Bluesky](https://bsky.app/profile/lacerbi.bsky.social).

## Image descriptions

After the OCR step, figures are converted to a Markdown text description using vision models such as Mistral AI's [Pixtral 12B](https://mistral.ai/en/news/pixtral-12b) or Google's [Gemini 2.0 Flash](https://deepmind.google/technologies/gemini/flash/). 

- You can select the desired model via a dropdown menu, based on which API keys you entered. Both Mistral AI and Google Gemini offer a free API tier.
- The free Mistral AI model, Pixtral 12B, is a fantastic model for its size, but might not be best suited for understanding complex diagrams and concepts.
- [Pixtral Large](https://mistral.ai/en/news/pixtral-large) may work better, but you may need API credits. It's unclear if Pixtral Large is available on the free API tier - the API call is not rejected, but it might redirect to Pixtral 12B.
- Gemini 2.0 Flash does a good job and is included in the [Gemini API free tier](https://ai.google.dev/gemini-api/docs/pricing) or otherwise very cheap.
- Other premium models such as OpenAI's GPT-4o or Gemini 2.0 Pro might work better for complex figures, but beware of API costs.

## Disclaimers

- We have no affiliation or financial relationship with Mistral AI, besides sympathy for a European AI company and appreciation for their AI models, nor with any other LLM providers.
- This is a *research preview*, as they say. Use at your own risk and with all the caveats of modern AI and LLM usage.
- In particular, image descriptions might be off in clear or subtle ways and you should double-check and fix them as needed.

## License

`paper2llm` is released under the terms of the [MIT License](LICENSE).
