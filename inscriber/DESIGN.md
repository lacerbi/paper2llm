# inscriber — Design Document

> **Status:** Design / pre-implementation. No code exists yet. This document is
> the authoritative specification for the first implementation.
>
> **Audience:** A developer who has never seen this project (or its sibling,
> `paper2llm`). It is written to be read entirely standalone — every concept,
> dependency, and external quirk needed to build v1 is described here.
>
> **Last updated:** 2026-06-09

---

## 1. What this project is

**`inscriber`** is a cross-platform command-line tool that converts academic
PDFs into clean, LLM-friendly **text-only Markdown** — running **entirely on the
user's own machine** using local models served by
[**llama.cpp**](https://github.com/ggml-org/llama.cpp). No cloud APIs are
required for the core pipeline.

It is the local, offline-first reimagining of an existing web app called
[**`paper2llm`**](https://github.com/lacerbi/paper2llm). `paper2llm` does the
same job but relies on cloud APIs (Mistral OCR for text extraction; Mistral /
OpenAI / Gemini / Anthropic vision models for figure description). The cloud
model landscape changes constantly and is tedious to track. `inscriber` trades
that churn for local control: the user points the tool at llama.cpp plus a
couple of GGUF model files and gets the same kind of output, reproducibly,
without sending documents to third parties.

### 1.1 What "the same job" means (pipeline parity with paper2llm)

For a given PDF, the output is:

1. A **full Markdown file** — the paper's text, tables, and equations, with each
   figure replaced by a generated **textual description** of that figure.
2. **Split files** (unless disabled): the document divided into `main`,
   `appendix`, and `backmatter` parts (see §11).
3. Optionally, a **BibTeX entry** for the paper (this single feature requires
   network access; see §12).

### 1.2 Goals

- Fully local core pipeline (OCR + figure description) — works with no internet.
- Runs on **Windows, Linux, and macOS**.
- Input is a **PDF file path or a URL**; output mirrors `paper2llm`.
- A **config file** specifies the llama.cpp binary location and model paths;
  **every config value is overridable from the CLI.**
- **Pluggable OCR backends** behind a stable interface; **DeepSeek-OCR** is the
  first implemented adapter, with others (Dots.OCR, PaddleOCR-VL, GLM-OCR,
  HunyuanOCR) addable later without touching the pipeline.
- Pluggable **VLM backends** for figure description; first target is the
  **Gemma 4** family (Apache-2.0, multimodal, supported by llama.cpp).

### 1.3 Non-goals (v1)

- No GUI / web interface. CLI only.
- No bundling or downloading of model weights — the user supplies GGUFs.
- No training, fine-tuning, or quantization of models.
- No attempt to perfectly reconstruct multi-page tables/equations that straddle
  a page break (documented limitation, §10.3).
- No OCR of scanned-handwriting or non-document images beyond what the chosen
  OCR model supports.

---

## 2. Background: external facts the design depends on

These were verified in June 2026. A future dev should re-verify against current
llama.cpp before relying on exact token strings.

### 2.1 llama.cpp multimodal support

llama.cpp exposes multimodal (vision) inference two ways, both relevant here:

- **`llama-server`** — a long-running HTTP server with an **OpenAI-compatible**
  `/v1/chat/completions` endpoint and a `/health` endpoint. Images are passed as
  base64 data URLs in the chat message content (the standard OpenAI
  `image_url` content-part shape). **This is what `inscriber` uses.**
- **`llama-mtmd-cli`** — a one-shot CLI for a single image+prompt. Not used by
  `inscriber` (it reloads the model on every call). Mentioned only so a future
  dev understands why we don't use it.

A multimodal model in llama.cpp is **two files**:

- the **text model** GGUF (loaded with `-m` / `--model`), and
- a **multimodal projector** GGUF, conventionally named `mmproj-*.gguf` (loaded
  with `--mmproj`), which encodes images into embeddings the text model
  consumes.

So **every** model `inscriber` uses (OCR and VLM) is configured as a
`(model_gguf, mmproj_gguf)` pair.

### 2.2 DeepSeek-OCR (first OCR backend)

- Support was **merged into llama.cpp `master`** via PR #17400 (merged
  2026-03-25). It is no longer a feature branch.
- Requires a `deepseek-ocr` model GGUF + `mmproj-deepseek-ocr` projector GGUF.
  Reference GGUFs live in the `ggml-org/DeepSeek-OCR-GGUF` Hugging Face
  collection.
- **Quirks (must be respected):**
  - Use **f16** weights for the projector/model where recommended. **Q4_K_M
    quantization has been observed to cause an infinite generation loop on some
    prompts.** Default to f16; allow the user to override.
  - **Do NOT pass `--chat-template deepseek-ocr`** to the server — it breaks
    output. Let the model's built-in template apply.
  - The model is **prompt-driven**. Known working prompts:
    - `OCR` — plain OCR.
    - `OCR markdown` — OCR formatted as Markdown.
    - `<|grounding|>OCR` — OCR **with layout grounding** (bounding boxes for
      detected regions). **This is the mode `inscriber` uses** (see §8).
  - **Resolution modes** (dynamic): roughly `base`/`standard` (~1024px),
    `large` (~1280px), and a dynamic tiling mode informally called **"Gundam"**
    that tiles the page and adds a global view — highest quality, slowest, best
    for dense/multi-column pages. `inscriber` **defaults to `large`** and
    exposes `gundam` as an opt-in (§7, §13).

> ⚠️ **Implementation note on the grounding format.** DeepSeek-OCR's grounding
> output is expected to follow the DeepSeek-VL grounding convention:
> region references wrapped as
> `<|ref|>LABEL<|/ref|><|det|>[[x1, y1, x2, y2]]<|/det|>`, with coordinates
> normalized to a **0–999** grid relative to the input image. The first task in
> implementation (§8.3, Milestone M1) is to **run the model on a real page and
> capture the exact output** to lock the parser. Treat the token strings above
> as the expected-but-unverified format.

### 2.3 Gemma 4 (first VLM backend)

- Released April 2026, **Apache-2.0** licensed. Variants: `E2B`, `E4B`
  (multimodal, efficient), plus larger `26B` MoE and `31B` dense.
- The `E2B`/`E4B` variants are supported as multimodal models in llama.cpp and
  are the recommended figure-description models for `inscriber` (small, fast,
  permissively licensed). Larger variants work if the user has the hardware.
- Used purely as a **vision→text** describer (image in, prose out). It does not
  need grounding or special prompts beyond the description prompt (§9.3).

---

## 3. High-level architecture

```
                         ┌──────────────────────────────────────────┐
                         │                  CLI                      │
                         │  (argparse) parse args + load config      │
                         └───────────────┬──────────────────────────┘
                                         │ resolved RunConfig
                                         ▼
┌───────────────────────────────────────────────────────────────────────────┐
│                              Pipeline orchestrator                          │
│                                                                             │
│  1. Input resolution   (PDF path | URL → local PDF bytes)   [§6]            │
│  2. Rasterize pages    (PDF → page PNGs, page-range applied) [§7,§13]       │
│  3. OCR pass           (each page PNG → markdown + figure bboxes) [§8]       │
│        └─ via OcrBackend (DeepSeekOcrBackend) over a managed llama-server    │
│  4. Figure crop        (bboxes → cropped figure PNGs)        [§8.4]          │
│  5. VLM pass           (each figure crop + context → <img_desc>) [§9]        │
│        └─ via VlmBackend (GemmaVlmBackend) over a managed llama-server       │
│  6. Assemble + clean   (stitch pages, strip headers, inject descriptions)[§10│
│  7. Split              (main / appendix / backmatter)        [§11]           │
│  8. BibTeX (optional, online)                               [§12]           │
│  9. Write outputs                                           [§14]           │
└───────────────────────────────────────────────────────────────────────────┘
        │                               │
        ▼                               ▼
  LlamaServerManager              OcrCache (disk)
  (spawn/health/teardown) [§5]    (per-page OCR memoization) [§9.5/§8.5]
```

**Key design decision — sequential, single-model-resident inference.** OCR and
VLM are different models. To keep peak RAM/VRAM to **one model at a time**, the
orchestrator runs **the entire OCR pass first** (OCR server up), tears that
server down, **then** brings up the VLM server for the entire figure pass. A
power user with plenty of memory can opt into keeping both up concurrently
(§5.4), but sequential is the default.

The OCR cache (§8.5) makes this design especially valuable: re-running with
different VLM settings reuses cached OCR and skips the expensive OCR pass
entirely.

---

## 4. Project layout & language

**Language: Python (3.10+).** Chosen because the local PDF/raster/imaging
ecosystem (PyMuPDF, Pillow) is best-in-class there, llama.cpp is consumed as a
subprocess + HTTP, and the reusable logic from `paper2llm` (splitting, BibTeX,
domain handling, the figure-description prompt) ports cleanly.

```
inscriber/
├── pyproject.toml              # packaging, deps, console entry point
├── README.md
├── DESIGN.md                   # this document
├── LICENSE                     # MIT
├── inscriber/
│   ├── __init__.py
│   ├── __main__.py             # enables `python -m inscriber`
│   ├── cli.py                  # argparse, wires CLI→RunConfig→pipeline
│   ├── config.py               # TOML load/merge/validate → RunConfig
│   ├── models.py               # dataclasses: Region, Figure, OcrPage, etc.
│   ├── pipeline.py             # orchestrator (the 9 steps above)
│   ├── input/
│   │   ├── resolver.py         # PDF path or URL → local bytes
│   │   └── domain_handlers.py  # arXiv/OpenReview/bioRxiv URL normalization
│   ├── pdf/
│   │   ├── rasterize.py        # PyMuPDF: PDF → page images, page count
│   │   └── crop.py             # crop figure regions from page images
│   ├── llama/
│   │   ├── server.py           # LlamaServerManager (spawn/health/teardown)
│   │   └── client.py           # OpenAI-compatible chat client (httpx)
│   ├── ocr/
│   │   ├── base.py             # OcrBackend ABC + shared dataclasses
│   │   ├── registry.py         # name → backend class
│   │   └── deepseek.py         # DeepSeekOcrBackend (prompt + grounding parser)
│   ├── vlm/
│   │   ├── base.py             # VlmBackend ABC
│   │   ├── registry.py
│   │   └── gemma.py            # GemmaVlmBackend
│   ├── postprocess/
│   │   ├── stitch.py           # multi-page join, header/footer & hyphen cleanup
│   │   ├── splitter.py         # main/appendix/backmatter (ported heuristics)
│   │   └── prompt.py           # figure-description prompt template + extractor
│   ├── bibtex/
│   │   └── semantic_scholar.py # optional online BibTeX (title→entry)
│   ├── cache.py                # OcrCache: content-addressed per-page store
│   ├── output.py               # writes full + splits + bibtex + figures/
│   └── logging.py              # progress + structured logging
└── tests/
    ├── fixtures/               # tiny sample PDF + recorded OCR/VLM responses
    ├── test_config.py
    ├── test_deepseek_parser.py # grounding-format parsing (golden strings)
    ├── test_splitter.py
    ├── test_stitch.py
    ├── test_pipeline_mocked.py # full pipeline with mocked servers
    └── ...
```

---

## 5. llama.cpp server lifecycle (`llama/server.py`)

### 5.1 Ownership model

By default, **`inscriber` owns the server process**: it launches `llama-server`
with the right model/projector/flags, waits for readiness, runs the pass, and
terminates it. The user never hand-manages servers — they only configure the
binary directory and model paths.

A power-user escape hatch: if `--ocr-endpoint URL` (or `--vlm-endpoint URL`) is
given, `inscriber` **does not spawn** a server and instead talks to the
already-running endpoint at that URL. (Useful for remote/GPU boxes or shared
servers.)

### 5.2 Locating the binary (cross-platform)

`llama_cpp_bin_dir` from config points at the folder containing llama.cpp
binaries. To resolve the server executable:

```python
name = "llama-server.exe" if os.name == "nt" else "llama-server"
exe = Path(llama_cpp_bin_dir) / name
```

Resolve with `pathlib`; never rely on `PATH` unless `llama_cpp_bin_dir` is unset
(then fall back to `shutil.which("llama-server")`).

### 5.3 Launch, health, teardown

- **Launch:** `subprocess.Popen([exe, "-m", model, "--mmproj", mmproj, "--host",
  "127.0.0.1", "--port", port, "-c", ctx, "-ngl", n_gpu_layers, ...])`.
  - Always use a **list of args** (never `shell=True`).
  - Bind to `127.0.0.1` on an **ephemeral free port** chosen by `inscriber`
    (probe with a socket bind) so concurrent runs don't collide.
  - **Do NOT add `--chat-template`** for DeepSeek-OCR (§2.2).
  - Capture stdout/stderr to a log file under the cache/run dir for debugging.
- **Health:** poll `GET /health` until it returns ready or a timeout
  (`server_start_timeout`, default 120s). Surface a clear error including the
  last lines of the server log on timeout.
- **Teardown:** `proc.terminate()`, wait briefly, `proc.kill()` if needed.
  - Register an `atexit`/`finally` + signal handler so a Ctrl-C or crash never
    leaves an orphaned server. Use a `contextmanager`:
    ```python
    with server_manager.serve(ocr_model_spec) as endpoint:
        ... run OCR pass ...
    # server guaranteed down here
    ```
- **Cross-platform termination:** `Popen.terminate()` maps to `TerminateProcess`
  on Windows and `SIGTERM` on POSIX — both fine. Avoid `os.killpg`/process
  groups (POSIX-only). If a process group is needed for child cleanup, branch on
  `os.name`.

### 5.4 Concurrency mode

Config `inference.mode`:
- `sequential` (default) — one server at a time; OCR pass fully completes and
  server is town down before VLM server starts.
- `concurrent` — both servers up simultaneously (faster wall-clock, needs RAM
  for both). Only honored when both models fit; document the RAM caveat.

---

## 6. Input resolution (`input/`)

Input is one positional argument: a **local PDF path** or an **http(s) URL**.

- **Path:** validate it exists, is readable, and has a `%PDF` magic header.
- **URL (requires network):**
  - Run it through **domain handlers** (ported from `paper2llm`) that normalize
    known academic hosts to a direct PDF URL and derive a sensible filename:
    - **arXiv**: `arxiv.org/abs/1234.5678` → `arxiv.org/pdf/1234.5678`.
    - **OpenReview**, **bioRxiv/medRxiv**, and a **generic** fallback handler.
    - The handler interface (mirrors paper2llm's `DomainHandler`):
      ```python
      class DomainHandler(Protocol):
          def can_handle(self, url: str) -> bool: ...
          def normalize_pdf_url(self, url: str) -> str: ...
          def file_name(self, url: str) -> str: ...
      ```
  - Download with `httpx`, following redirects, with a timeout and a
    descriptive User-Agent. Validate the downloaded bytes are a PDF.
- Output of this stage: a `ResolvedInput(pdf_bytes, source, original_url,
  suggested_name)`.

> **Privacy note:** URL input and BibTeX (§12) are the *only* features that
> touch the network. The OCR + VLM core is fully offline. The README must state
> this clearly. A `--offline` flag hard-disables all network use (URL input then
> errors early).

---

## 7. PDF rasterization (`pdf/rasterize.py`)

**Library: PyMuPDF (`pymupdf`).** Chosen specifically for cross-platform ease —
it ships prebuilt wheels for Windows/macOS/Linux with **no system dependency**
(unlike `pdf2image`, which needs poppler installed separately, painful on
Windows).

Responsibilities:
- **Page count** — needed to validate/clamp the page range.
- **Page range** — config/CLI `pages` as a **1-indexed inclusive** range
  (`"1-10"`, `"3"`, `"5-"`, `"-12"`, or `all`). Convert to a concrete list of
  page indices, clamped to `[1, page_count]`.
- **Render** each selected page to a PNG at a resolution driven by the OCR
  resolution mode (§13). Implementation detail: render at a DPI that yields a
  long-edge pixel size matching the target (e.g. `large` ≈ 1280px long edge).
  Compute the zoom matrix: `zoom = target_px / max(page_pt_w, page_pt_h) * 72`.
- Return `[PageImage(page_number, png_bytes, width_px, height_px)]`.

Page images and crops are kept in a per-run **work directory** (under the OS temp
dir or `--workdir`), cleaned up on success unless `--keep-intermediates`.

---

## 8. OCR pass & the `OcrBackend` abstraction (`ocr/`)

### 8.1 Why an abstraction

Different OCR models emit different grounding/layout formats and need different
prompts. The pipeline must not know these details. So OCR is hidden behind an
interface; v1 ships **one** implementation (DeepSeek-OCR) but adding Dots.OCR /
PaddleOCR-VL / GLM-OCR / HunyuanOCR later is "write a new adapter + register
it", with **zero pipeline changes**.

### 8.2 The interface (`ocr/base.py`)

```python
@dataclass
class Region:
    label: str                 # e.g. "figure", "table", "text", "title"
    bbox_norm: tuple[float, float, float, float]  # x1,y1,x2,y2 in [0,1]
    text: str | None = None    # text content if the region carries any

@dataclass
class OcrPageResult:
    page_number: int           # 1-indexed
    markdown: str              # clean markdown for the page (coords stripped)
    regions: list[Region]      # all detected regions (figures, tables, etc.)

class OcrBackend(ABC):
    name: str                  # registry key, e.g. "deepseek-ocr"

    @abstractmethod
    def prompt(self, mode: ResolutionMode) -> str: ...
    """The exact user prompt to send for this model (e.g. '<|grounding|>OCR')."""

    @abstractmethod
    def parse(self, raw_output: str, image_size_px: tuple[int,int]) -> OcrPageResult: ...
    """Turn the model's raw text into clean markdown + normalized regions.
       Must strip any coordinate/grounding markup out of `markdown`."""

    # server requirements the backend imposes (e.g. no chat template)
    def server_flags(self) -> list[str]: return []
    def forbid_chat_template(self) -> bool: return False
```

The orchestrator, for each page: render → `client.describe(image, backend.prompt(mode))`
→ `backend.parse(raw, size)` → `OcrPageResult`. Bounding boxes are normalized to
`[0,1]` floats by the backend so cropping (§8.4) is model-agnostic.

### 8.3 `DeepSeekOcrBackend` (`ocr/deepseek.py`)

- `name = "deepseek-ocr"`.
- `prompt(mode)` returns `"<|grounding|>OCR"` (grounding always on; we want the
  figure boxes). A non-grounding fallback (`"OCR markdown"`) is available for a
  config option that disables figure extraction entirely.
- `forbid_chat_template() = True` (§2.2).
- **`parse(raw, size)`** — the core parser. Expected input contains interleaved
  grounding markup (see §2.2 note). Algorithm:
  1. Find all grounding spans via regex, expected:
     `<\|ref\|>(?P<label>.*?)<\|/ref\|><\|det\|>\[\[(?P<coords>[\d,\s]+)\]\]<\|/det\|>`
  2. For each, parse the 4 ints, divide by **999.0** → normalized bbox; build a
     `Region(label, bbox_norm, text=nearby_text)`.
  3. **Strip** all grounding markup tokens from the text to produce clean
     `markdown` (this is the "exact parsing → single pass" decision: one
     grounding call yields both clean text and boxes; no second OCR call).
  4. Classify figure-like regions (`label` ∈ {figure, image, picture, chart,
     diagram, plot}) for the crop step; keep all regions for context.
- **Robustness:** if grounding markup is malformed/absent, fall back to treating
  the whole output as plain markdown with `regions = []` (no figures described,
  pipeline still succeeds). Log a warning.

> **M1 task:** capture real DeepSeek-OCR output on 2–3 representative pages,
> commit them as golden fixtures in `tests/fixtures/`, and pin
> `test_deepseek_parser.py` to them. Adjust the regex/labels to the *actual*
> tokens. Do not ship the parser on assumptions.

### 8.4 Figure cropping (`pdf/crop.py`)

For each figure `Region` on a page: convert `bbox_norm` → pixel box against that
page's rendered image (`x1*W, y1*H, x2*W, y2*H`), add a small padding margin
(config `figure.crop_padding`, default a few %), clamp to image bounds, and crop
with Pillow. Save as `figures/fig_p{page}_{i}.png`. Attach the crop path to the
figure's record. Skip degenerate boxes (near-zero area).

Each figure also gets a stable **placeholder token** inserted into the page
markdown at the figure's position (e.g. `⟦INSCRIBER_FIG:fig_p3_1⟧`) so the VLM
description can be injected back in the exact spot (§10.2).

### 8.5 OCR cache (`cache.py`)

Per-page OCR is the expensive step; cache it.

- **Key:** hash of `(pdf_content_hash, page_number, ocr_backend_name,
  ocr_model_identity, resolution_mode, prompt)`. `ocr_model_identity` = model
  file path + size + mtime (cheap proxy for "same weights").
- **Value:** serialized `OcrPageResult` (JSON; bboxes + markdown) **plus** the
  raw model output (for debugging).
- **Location:** `platformdirs.user_cache_dir("inscriber")/ocr/`.
- On a re-run that changes only VLM settings, the entire OCR pass is served from
  cache → the OCR server is never even launched. `--no-cache` / `--refresh`
  bypass it.

---

## 9. VLM pass & the `VlmBackend` abstraction (`vlm/`)

### 9.1 Purpose

Each cropped figure is sent to a vision-language model with **surrounding text
as context**, producing a prose description that replaces the figure in the
final Markdown. This is exactly what `paper2llm` does with cloud vision models;
here it's a local VLM (Gemma 4).

### 9.2 Interface (`vlm/base.py`)

```python
class VlmBackend(ABC):
    name: str
    @abstractmethod
    def describe(self, image_png: bytes, context_text: str | None) -> str: ...
    """Return the cleaned description text (already extracted from tags)."""
```

`GemmaVlmBackend.describe` builds the prompt (§9.3), calls the chat client with
the image as a base64 data URL, then extracts the description from the
`<img_desc>…</img_desc>` tags (§9.4).

### 9.3 The figure-description prompt (`postprocess/prompt.py`)

Ported verbatim from `paper2llm` (it is model-agnostic and well-tuned). The
template, with a `{contextText}` placeholder:

```
# Task

Please describe the visual content of this image in detail, focusing on all
visible elements, text, and relevant information.

- Focus primarily on visual elements directly observable in the image: shapes,
  colors, objects, arrangements, and any visible text. When appropriate, include
  reasonable interpretation of what these elements represent based on their
  visual context.
- For academic or technical visuals: Identify the specific type (bar chart, line
  graph, flow diagram, etc.). Describe axes, labels, data points, and visual
  patterns exactly as they appear in the image.
- For any text visible in the image: Provide an accurate transcription,
  maintaining the original layout where meaningful.
- For images with multiple panels: Describe each panel separately based on its
  visual appearance. Note any panel labels if present. If the composition is
  unusual or the panels interact in a non-standard way, explain their
  relationship.
{contextText}

# Format

- Begin with a concise overview sentence identifying the type of image (e.g., "A
  line graph showing...", "A diagram illustrating...", "A photograph of...").
- Then provide specific details in a well-structured format. Use multiple
  paragraphs if necessary to organize different aspects of complex images.
- For complex visuals, you may use bullet points or numbered lists to clearly
  separate distinct elements.
- Adjust the length of your description based on the complexity of the image -
  simple images may need only a paragraph, while complex diagrams might require
  more detailed explanations.

IMPORTANT: You must wrap your entire description inside <img_desc> and
</img_desc> XML tags like this:

<img_desc>Your detailed description goes here.</img_desc>

Do not include anything else outside these tags.
```

When context is available, `{contextText}` is replaced with:

```
# Context

Context for reference:

<context>
{context}
</context>

Use this to correctly identify technical terms and provide reasonable
interpretations of what you can see in the image.
Your image description should still focus primarily on the visual aspects of the
figure and not be a mere repetition of the image caption or provided context.
```

When no context is available, the placeholder is removed.

### 9.4 Response extraction

Extract the substring between `<img_desc>` and `</img_desc>`. If the closing tag
is missing (truncated output), take everything after the opening tag. If the
opening tag is missing entirely, treat the whole (trimmed) response as the
description but log a warning (the model didn't follow format). Ported from
`paper2llm`'s `extractDescriptionFromTags`.

### 9.5 Context extraction

**Baseline behavior is ported from `paper2llm`** (`markdown-processor.ts`
→ `buildImageContextMap` / `extractImageContext`): it uses the **entire page's
text** as the figure's context — not a narrow window — prefixed with a short
preamble and **capped at ~2000 characters** to avoid overwhelming the model:

```
This image appears on page {N}. The surrounding page content follows.

{page_text, truncated to ~2000 chars}
```

This whole-page text becomes the `{context}` injected in §9.3. A narrower
window (config `figure.context_chars`) around the figure placeholder is an
**optional refinement**, but the default must match paper2llm's whole-page
behavior so output quality is comparable. The figure's **caption** (a nearby
`Figure N` / `Fig.` line, often already captured as the region text in §8.3) is
naturally included since it lives in the page text.

### 9.6 VLM caching

Same scheme as §8.5, keyed on `(figure_crop_hash, vlm_backend_name,
vlm_model_identity, prompt)`. Lets you re-run the document (e.g. to re-split or
re-fetch BibTeX) without re-describing figures.

---

## 10. Assembly & post-processing (`postprocess/stitch.py`)

### 10.1 Page stitching

OCR is per-page, so the document is reassembled by concatenating per-page
markdown in order. paper2llm exposes **two independent** page options
(`MarkdownOptions.addPageNumbers` / `addPageSeparators`) that `inscriber` keeps:
- **page numbers** — insert `#### Page {n}` before each page's content;
- **page separators** — insert a `---` horizontal rule between pages.

Both default off. **Note:** the splitter (§11) recognizes `#### Page N` markers
and shifts split boundaries around them, so keep the heading shape consistent
(`#### Page N`). Also port `normalizeLineBreaks` (collapse excess blank lines) as
part of the cleanup pass (§10.3).

### 10.2 Figure injection

Replace each `⟦INSCRIBER_FIG:{id}⟧` placeholder with the assembled figure block.
**Match paper2llm's actual output format** (`markdown-processor.ts`,
`enhanceImageReferences`): the `<img_desc>…</img_desc>` tags are only the model's
*response envelope* — they are **stripped** (§9.4), and the extracted text is
rendered as a **Markdown blockquote with a bold header**, each line prefixed with
`> `:

```markdown
> **Image.** {generated description, wrapped as a blockquote}
```

Config `figure.mode` controls the variant (mirrors paper2llm's `MarkdownOptions`):
- **`describe-and-keep`** (default) — keep the original image reference *and* add
  the description blockquote (paper2llm's `keepOriginalImages`):
  ```markdown
  ![{caption_or_label}](figures/{id}.png)

  > **Image.** {description}
  ```
- **`describe-only`** — the description blockquote only, image reference removed.
- **`placeholder`** — no description; emit paper2llm's exact placeholder
  (`replaceImagesWithPlaceholder`): `> **Image.** [not displayed]`.

> Do **not** leave raw `<img_desc>` tags in the output — they are an internal
> protocol with the VLM, not part of the document.

### 10.3 Cleanup pass

Two tiers: the **light normalization paper2llm already does** (port verbatim),
plus **new cleanup that local per-page OCR requires** (paper2llm got this for
free from Mistral's whole-document OCR).

**(a) Ported from paper2llm** (`markdown-processor.ts`) — always on:
- **`normalizeLineBreaks`** — collapse 3+ consecutive newlines to a single blank
  line (`\n{3,}` → `\n\n`).
- **`ensureImageDescriptionSpacing`** — guarantee a blank line **before and
  after** each `> **Image.** …` description blockquote, and around any
  `Figure …` caption line that immediately follows an image block. Operates
  line-by-line; matches `^> \*\*(?:Image description|Image Description|Image)\.\*\*`
  and `^Figure `. This is what keeps descriptions from fusing into adjacent text.

**(b) New for inscriber** (per-page OCR artifacts) — heuristic, conservative
(never delete content we're unsure about), toggled by `--no-clean`:
- **Running headers/footers & page numbers:** detect short lines that recur at
  the same relative page position across many pages and strip them. Threshold-
  based; log what was removed.
- **De-hyphenation across page/line breaks:** join `word-\nword` → `word`, and
  merge sentences split by a page break when the next page starts mid-sentence
  (lowercase continuation). Conservative rules only.
- **Known limitation:** tables and equations that span a page boundary may not
  reassemble cleanly. Documented, not fixed in v1.

---

## 11. Splitting (`postprocess/splitter.py`)

Ported from `paper2llm`'s `markdown-splitter`. Splits the full document into up
to three parts by detecting section boundaries via heading regexes (case-
insensitive, any heading level `#+`):

- **Backmatter start** — first match of acknowledgments / author contributions /
  funding / impact statements / ethics, **or** references/bibliography:
  - `Acknowledgments?` / `Acknowledgements?`
  - `Author Contributions`, `Funding`
  - `Impact Statement`, `Broader Impact`, `Societal Impact`,
    `Ethical Considerations`
  - `References`, `Bibliography`, `Works Cited`, `Literature Cited`,
    `Citations`, `References and Notes`, `References Cited`, `Cited Works`,
    `Cited Literature`
- **Appendix start**:
  - `Appendix` / `Appendices`
  - `Supplementary|Supporting (Material|Materials|Information|Data)`
  - `Supplemental …`, `SI …`, `S1.`/`S2.` style headings
  - `A ` / `A. ` style appendix headings — **only accepted if they occur after
    the acknowledgments match** (guards against false positives like "A " in
    body text).
- Title is extracted from the first `# Title` heading.
- If a `#### Page N` marker immediately precedes a split boundary, the boundary
  is moved before it so page markers don't dangle.

Outputs `MarkdownSections(main_content, backmatter | None, appendix | None,
title)`. The three regions are: `main = [0, backmatter_start)` (or to appendix if
no backmatter), `backmatter = [backmatter_start, appendix_start)`,
`appendix = [appendix_start, end)`.

**Combined / "allparts" assembly** (paper2llm's `getSectionContent("allparts")`):
the parts can also be re-joined into a single document where appendix and
backmatter are reintroduced under derived headings, in order
main → appendix → backmatter:

```markdown
{main_content}

# {title} - Appendix

---

{appendix}

# {title} - Backmatter

---

{backmatter}
```

This is the basis for the standalone full file (§14) and the
append-BibTeX-to-document option (§12).

---

## 12. BibTeX (optional, **online**) (`bibtex/semantic_scholar.py`)

Ported from `paper2llm`. **This is the one core-adjacent feature that requires
network access** and is therefore **opt-in** (`--bibtex` / config
`bibtex.enabled = true`).

- Extract the paper **title** from the document (`# Title`, §11).
- Query the **Semantic Scholar** API to find the best-matching paper; retrieve
  metadata (authors, year, venue, DOI, arXiv id, etc.).
- Format a BibTeX entry. Generate a citation key (e.g. `firstauthorYEARword`).
- **Title validation:** compare the document title with the returned entry's
  title under a normalized (lowercased, punctuation-stripped) comparison
  (paper2llm's `BibTeXTitleValidation`). If they **don't** match, still emit the
  entry but prepend paper2llm's exact warning comment so the user can verify:
  ```bibtex
  % WARNING: The retrieved citation title may not match the paper title.
  % Paper title: "{original_title}"
  % Citation title: "{bibtex_title}"
  @article{...}
  ```
- **Placement (two options, both from paper2llm):**
  - write a standalone `paper.bib` (default), **and/or**
  - **append the entry into the document** (`bibtex.append_to_document`) — appended
    only to the full / main / combined outputs, matching
    `getContentWithOptionalBibtex` (`section ∈ {full, main, allparts}`).
- Respects `--offline` (skips with a clear message) and network failure
  (warns, continues without BibTeX — never fails the whole run for this). On a
  failed lookup, the run can be retried on demand later (paper2llm's
  `retryBibtexGeneration`).

---

## 13. Configuration & CLI

### 13.1 Config file (TOML)

Default location resolved via **`platformdirs`**:
- Linux: `~/.config/inscriber/config.toml`
- macOS: `~/Library/Application Support/inscriber/config.toml`
- Windows: `%APPDATA%\inscriber\config.toml`

Overridable with `--config PATH`. **Every field is overridable by a CLI flag.**
Precedence: **CLI flag > config file > built-in default.**

```toml
[llama]
bin_dir = "/opt/llama.cpp/build/bin"   # folder containing llama-server[.exe]
host = "127.0.0.1"
# port is auto-selected (free port) unless set here
server_start_timeout = 120             # seconds to wait for /health
n_gpu_layers = 0                       # -ngl; 0 = CPU only
ctx_size = 8192                        # -c

[inference]
mode = "sequential"                    # "sequential" | "concurrent"

[ocr]
backend = "deepseek-ocr"               # registry key
model = "/models/deepseek-ocr-f16.gguf"
mmproj = "/models/mmproj-deepseek-ocr-f16.gguf"
resolution = "large"                   # "base" | "standard" | "large" | "gundam"
endpoint = ""                          # if set, use this URL; don't spawn server

[vlm]
backend = "gemma"
model = "/models/gemma-4-e4b-f16.gguf"
mmproj = "/models/mmproj-gemma-4-e4b.gguf"
endpoint = ""

[figure]
mode = "describe-and-keep"             # | "describe-only" | "placeholder"
crop_padding = 0.02                    # fraction of page dims
context_chars = 1500                   # context window around each figure

[output]
dir = "."                              # output directory
split = true                           # also write main/appendix/backmatter
page_numbers = false                   # insert "#### Page N" before each page
page_separators = false                # insert "---" between pages
normalize_line_breaks = true           # collapse excess blank lines
clean = true                           # header/footer + de-hyphenation pass

[bibtex]
enabled = false                        # online; opt-in
append_to_document = false             # also append entry into full/main output

[net]
offline = false                        # hard-disable all network use
```

### 13.2 CLI surface (`cli.py`, argparse)

```
inscriber INPUT [options]

  INPUT                         PDF file path or http(s) URL

  -c, --config PATH             config file (default: platform config dir)
  -o, --output-dir DIR          output directory (default: cwd)
      --pages RANGE             1-indexed inclusive, e.g. "1-10", "3", "5-", "all"

  # model / llama overrides
      --llama-bin-dir DIR
      --ocr-backend NAME        e.g. deepseek-ocr
      --ocr-model PATH
      --ocr-mmproj PATH
      --ocr-resolution MODE     base|standard|large|gundam
      --ocr-endpoint URL        use running server; don't spawn
      --vlm-backend NAME
      --vlm-model PATH
      --vlm-mmproj PATH
      --vlm-endpoint URL
      --ngl N                   GPU layers
      --ctx N                   context size
      --mode {sequential,concurrent}

  # pipeline behavior
      --figure-mode {describe-and-keep,describe-only,placeholder}
      --no-figures              skip figure detection/description entirely
      --no-split                write only the full document
      --page-numbers            insert "#### Page N" before each page
      --page-separators         insert "---" between pages
      --no-clean                skip header/footer + de-hyphenation cleanup
      --bibtex                  fetch BibTeX (requires network)
      --bibtex-in-doc           also append the BibTeX entry into the document
      --offline                 disable ALL network use (URL input + bibtex)

  # caching / debugging
      --no-cache / --refresh    bypass / rebuild the OCR & VLM caches
      --workdir DIR             where intermediate page/crop images go
      --keep-intermediates      don't delete the work dir on success
  -v, --verbose / -q, --quiet
      --version
```

---

## 14. Output layout (`output.py`)

Given `INPUT` resolving to a base name `paper` and output dir `OUT`:

```
OUT/
├── paper.md                  # full document (always)
├── paper.main.md             # if split = true and split succeeded
├── paper.appendix.md         # if an appendix section was detected
├── paper.backmatter.md       # if a backmatter section was detected
├── paper.bib                 # if --bibtex and an entry was found
└── figures/                  # if figure-mode keeps images
    ├── fig_p1_1.png
    └── ...
```

- Base name: from the PDF filename, or from the domain handler's
  `file_name(url)` for URL inputs.
- All files written **UTF-8 explicitly**, with `\n` newlines (don't let Windows
  inject `\r\n`).
- Never overwrite silently if `--no-clobber` is set (optional nicety); default
  is overwrite, matching typical CLI expectations — but log each file written.

---

## 15. Cross-platform requirements (Win / Linux / macOS)

These are hard requirements, not nice-to-haves:

- **Paths:** `pathlib.Path` everywhere; never string-concatenate paths. Resolve
  user `~` with `Path.expanduser()`.
- **PDF rendering:** PyMuPDF (wheels, no system poppler). **Do not** introduce a
  dependency that needs a separate system install on Windows.
- **Binary discovery:** append `.exe` on `os.name == "nt"` (§5.2).
- **Subprocess:** list-args only, no `shell=True`; `Popen.terminate()` for
  teardown (works on all three). Avoid POSIX-only `os.killpg`/`preexec_fn`
  unless guarded by an `os.name` branch.
- **Config/cache/data dirs:** `platformdirs` (`user_config_dir`,
  `user_cache_dir`, `user_data_dir`) — never hardcode `~/.config`.
- **File encoding:** always `encoding="utf-8"`, `newline="\n"` when writing text.
- **Temp/work dir:** `tempfile.mkdtemp()` or `--workdir`; clean up via
  contextmanager so it survives Ctrl-C handling.
- **GPU backend** (Metal on macOS, CUDA/Vulkan/etc. on Win/Linux) is whatever
  the user's llama.cpp build supports. `inscriber` stays agnostic and only
  passes `-ngl`.
- **CI:** test on all three OSes in the matrix (§17). No GPU in CI → servers are
  mocked.

---

## 16. Error handling, logging, progress

- **Fail fast, fail clearly** on config errors (missing model files, missing
  binary, unreadable PDF) — validate everything in `config.py` before any model
  loads.
- **Per-stage progress** to stderr: rasterizing (n pages), OCR (page i/N), VLM
  (figure i/M), assembling, splitting, bibtex, writing. A simple counter is
  enough; a progress bar (e.g. `rich`/`tqdm`) is a nice-to-have.
- **Resilience:** a single figure that fails to describe should not kill the run
  — log it, insert a `[figure description unavailable]` placeholder, continue.
  Same for BibTeX network failure.
- **Server failures:** on a `/health` timeout or non-200 chat responses, include
  the tail of the captured server log in the error so the user can diagnose
  (wrong model/mmproj pairing, OOM, bad flags).
- **Logging:** standard `logging`; `-v` → DEBUG (includes raw model outputs when
  `--keep-intermediates`), default INFO, `-q` → WARNING.

---

## 17. Testing strategy (`tests/`)

The real models need a GPU/large RAM and aren't available in CI, so tests mock
the inference layer at the **chat-client boundary**.

- **`test_deepseek_parser.py`** — golden-string tests for the grounding parser
  (§8.3) using **recorded real outputs** committed as fixtures. This is the
  highest-value test; the single-pass design hinges on the parser being exact.
- **`test_splitter.py`** — section-detection on a battery of synthetic markdown
  docs (with/without appendix, backmatter, the `A ` edge case, page markers).
- **`test_stitch.py`** — header/footer stripping & de-hyphenation on crafted
  multi-page inputs.
- **`test_config.py`** — TOML load, CLI-override precedence, validation errors.
- **`test_pipeline_mocked.py`** — end-to-end on a tiny fixture PDF with the OCR
  and VLM clients **mocked** to return canned responses; asserts the full set of
  output files and figure injection.
- **`LlamaServerManager`** — unit-test launch-arg construction and the `.exe`
  suffix logic without actually spawning (mock `Popen`).
- A **manual/integration** test doc (not in CI) describes how to run against a
  real llama.cpp + real GGUFs, with a known sample PDF, for release validation.

`npm`-style smoke check equivalent: `inscriber --version` and
`inscriber sample.pdf --no-figures --offline` against a fixture should pass with
mocked servers.

---

## 18. Packaging & distribution

- **`pyproject.toml`** (PEP 621), build backend `hatchling` or `setuptools`.
- Console entry point: `inscriber = "inscriber.cli:main"`.
- **PyPI name: `inscriber`** (verified available on PyPI as of 2026-06; the
  `inscriber` GitHub *user* exists but the repo will live in the maintainer's
  namespace, no conflict).
- Python `>=3.10`.
- License: **MIT** (matches `paper2llm`).
- Optional extras: `[bibtex]` could gate the Semantic Scholar dependency if it's
  more than `httpx`, but keep core deps minimal.

### 18.1 Dependencies (intended, minimal)

| Dependency | Purpose |
|---|---|
| `pymupdf` | PDF page count + rasterization (no system poppler) |
| `pillow` | Crop figure regions from page images |
| `httpx` | llama-server chat client; URL download; Semantic Scholar |
| `platformdirs` | Cross-platform config/cache/data dirs |
| `tomli` (py<3.11) | TOML parsing (`tomllib` is stdlib from 3.11) |
| `rich` *(optional)* | Progress output / nicer logs |

No heavy ML libs in `inscriber` itself — all inference is delegated to
llama.cpp over HTTP.

---

## 19. Performance & resources

- **DeepSeek-OCR at f16 + a Gemma 4 VLM** are the main memory consumers. The
  **sequential** mode (§5.4) keeps only one resident at a time — the default for
  good reason.
- **Resolution** is the main speed/quality lever: `large` (default) is a good
  balance; `gundam` (tiled) is best for dense two-column papers but noticeably
  slower; `base`/`standard` are the speed escape hatches.
- **Caching** (§8.5/§9.6) makes iteration cheap — changing split/figure/bibtex
  options re-runs in seconds because OCR and VLM results are reused.
- **GPU offload** via `-ngl` is the biggest wall-clock win when available; left
  to the user's hardware/build.

---

## 20. Security & privacy

- **Local by default.** The only network egress is (a) downloading a PDF when
  the input is a URL and (b) the opt-in Semantic Scholar BibTeX lookup. Both are
  disabled by `--offline`. Documents and figures are **never** sent to any
  third-party model API — they go only to the user's own llama.cpp server on
  `127.0.0.1`.
- The server binds to **loopback** on an ephemeral port; it is not exposed.
- No telemetry. No persisted secrets (there are no API keys in the core flow).

---

## 21. Implementation milestones

1. **M0 — Skeleton.** Project layout, `pyproject.toml`, CLI argparse →
   `RunConfig`, TOML config load/merge/validate, logging. `inscriber --version`
   and config errors work.
2. **M1 — OCR vertical slice.** `LlamaServerManager` (spawn/health/teardown),
   chat client, `DeepSeekOcrBackend` **with parser locked to real recorded
   output**, PyMuPDF rasterize. Produce per-page markdown for a real PDF (no
   figures yet). OCR cache in place.
3. **M2 — Figures.** Grounding-bbox cropping, VLM server + `GemmaVlmBackend`,
   figure-description prompt + extraction, context windows, injection into
   markdown. VLM cache.
4. **M3 — Assembly & splitting.** Stitching, header/footer + de-hyphenation
   cleanup, splitter (ported heuristics), output writer (full + splits +
   figures/).
5. **M4 — Inputs & BibTeX.** URL input + domain handlers, `--offline`, optional
   Semantic Scholar BibTeX with title validation.
6. **M5 — Hardening.** Cross-platform CI matrix, mocked end-to-end tests,
   `concurrent` mode, docs/README, packaging to PyPI.

---

## 22. Open questions / future work

- **Second OCR adapter** (Dots.OCR or PaddleOCR-VL) to validate the abstraction
  early — its grounding/layout format differs and will exercise the interface.
- **Table reconstruction across page breaks** (§10.3) — currently a documented
  limitation.
- **Equation fidelity** — verify DeepSeek-OCR's LaTeX/math output quality on real
  papers; may need a normalization pass.
- **Batch mode** — process a directory of PDFs reusing a single warm server.
- **Model auto-download helper** — optional command to fetch recommended GGUFs
  from Hugging Face (kept out of the core, opt-in, online).
- **Alternate BibTeX sources** — Crossref / arXiv API as fallbacks to Semantic
  Scholar; or fully-offline extraction from the paper's own reference list.

---

## 23. Relationship to `paper2llm` (reuse map)

Logic ported (reimplemented in Python), not shared as a library:

| `paper2llm` (TypeScript) | `inscriber` (Python) | Notes |
|---|---|---|
| `core/templates/image-prompt-template.ts` | `postprocess/prompt.py` | Prompt + `<img_desc>` extractor — used verbatim |
| `core/utils/markdown-splitter.ts` | `postprocess/splitter.py` | Section regexes + boundary logic |
| `core/utils/bibtex-generator.ts` | `bibtex/semantic_scholar.py` | Semantic Scholar lookup + title validation |
| `core/domain-handlers/*` | `input/domain_handlers.py` | arXiv/OpenReview/bioRxiv/generic |
| `core/ocr-service.ts` (Mistral) | `ocr/` backends | Replaced by local llama.cpp OCR |
| `core/image-service*.ts` (cloud VLMs) | `vlm/` backends | Replaced by local llama.cpp VLM |
| API-key storage/encryption | — | Not needed; no cloud keys in core flow |

---

## 24. paper2llm feature-parity checklist (with source pointers)

The dev will be given the `paper2llm` source. This table enumerates **every
paper2llm feature** and states whether `inscriber` keeps it, where it's
specified here, and which paper2llm file to read as the reference
implementation. Paths are relative to `paper2llm-web/src/`.

| # | paper2llm feature | Keep? | `inscriber` § | Reference source in paper2llm |
|---|---|---|---|---|
| 1 | PDF file input + validation | ✅ | §6 | `adapters/web/file-handler.ts` |
| 2 | URL input + domain handlers (arXiv, OpenReview, bioRxiv, generic) | ✅ | §6 | `core/domain-handlers/*`, `core/domain-handler-registry.ts`, `file-handler.ts` |
| 3 | Page-count detection + **page-range selection** | ✅ | §7 | `core/utils/pdf-page-utils.ts`, `web/components/PageRangeSelector.tsx` |
| 4 | OCR of text / tables / equations | ✅ (local) | §8 | `core/ocr-service.ts` (Mistral → DeepSeek-OCR) |
| 5 | Figure description via vision model | ✅ (local) | §9 | `core/image-service.ts`, `core/image-services/*` (cloud → llama.cpp VLM) |
| 6 | Image **context = whole page text** (~2000-char cap, preamble) | ✅ | §9.5 | `core/markdown-processor.ts` → `buildImageContextMap`, `extractImageContext` |
| 7 | Figure-description **prompt template** + `<img_desc>` extraction | ✅ (verbatim) | §9.3–9.4 | `core/templates/image-prompt-template.ts` |
| 8 | Figure rendered as **blockquote** `> **Image.** …` | ✅ | §10.2 | `core/markdown-processor.ts` → `enhanceImageReferences` |
| 9 | Figure modes: keep-image / describe-only / **placeholder** `[not displayed]` | ✅ | §10.2, §13 | `MarkdownOptions` (`keepOriginalImages`, `replaceImagesWithPlaceholder`) in `types/interfaces.ts` + `markdown-processor.ts` |
| 10 | Page **numbers** (`#### Page N`) and page **separators** (`---`) | ✅ | §10.1 | `core/markdown-processor.ts` (`addPageNumbers`, `addPageSeparators`) |
| 11 | `normalizeLineBreaks` (collapse 3+ blank lines) | ✅ | §10.3(a) | `core/markdown-processor.ts` |
| 11b | `ensureImageDescriptionSpacing` (blank lines around `> **Image.**` blocks & `Figure …` captions) | ✅ | §10.3(a) | `core/markdown-processor.ts` → `ensureImageDescriptionSpacing` |
| 12 | Split into **main / appendix / backmatter** (heading heuristics) | ✅ | §11 | `core/utils/markdown-splitter.ts` |
| 13 | **Combined "allparts"** with `# {title} - Appendix/Backmatter` headers | ✅ | §11 | `web/components/markdown-preview/utils/content-utils.ts` → `getSectionContent` |
| 14 | **BibTeX** generation (Semantic Scholar) | ✅ (online, opt-in) | §12 | `core/utils/bibtex-generator.ts` |
| 15 | BibTeX **title validation** + `% WARNING` mismatch comment | ✅ | §12 | `bibtex-generator.ts`, `content-utils.ts`, `BibTeXTitleValidation` in `types/interfaces.ts` |
| 16 | Include/**append BibTeX into the document** | ✅ | §12 | `content-utils.ts` → `getContentWithOptionalBibtex` |
| 17 | BibTeX **retry on demand** after a failed lookup | ✅ | §12 | `web/components/markdown-preview/hooks/useCopyDownload.ts` → `retryBibtexGeneration` |
| 18 | Output **filename** derived from source (PDF name / URL handler) | ✅ | §14 | `useCopyDownload.ts`, domain handlers |
| 19 | **Progress reporting** per stage | ✅ | §16 | `adapters/web/progress-reporter.ts`, `web/components/ProcessingStatus.tsx` |
| 20 | **Cancel** an in-flight operation | ✅ (Ctrl-C → teardown) | §5.3, §16 | `OcrService.cancelOperation`, `ImageService.cancelOperation` |
| 21 | Debug mode (verbose / keep intermediates) | ✅ | §13, §16 | `MarkdownOptions.debugMode` |
| 22 | Multi-**provider** model selection (Mistral/OpenAI/Gemini/Anthropic) | ⤳ Replaced | §8.1, §9.2 | `core/image-services/image-service-factory.ts` → replaced by pluggable local OCR/VLM **backends** |

### Intentionally **dropped** (cloud/UI-only, no local analog)

| paper2llm feature | Why dropped | Source (for reference) |
|---|---|---|
| API-key storage + encryption (session/local/encrypted, Web Crypto) | No cloud keys in the local flow; nothing secret to store | `adapters/web/api-storage/*`, `docs/security/` |
| Cloud provider selection & per-provider key validation | Superseded by local backend config (model file paths) | `web/components/ApiKeyManager.tsx`, `api-storage/internal/providers/*` |
| In-browser Markdown **preview / rendering** | CLI writes files instead of rendering | `web/components/markdown-preview/MarkdownRenderer.tsx`, `MarkdownPreview.tsx` |
| Copy/Download **menus**, filename field UI, document/processing info panels | CLI output layout (§14) replaces interactive copy/download | `markdown-preview/components/*` (`CopyMenu`, `DownloadMenu`, `DocumentInfo`, `ProcessingInfo`, `FilenameField`) |
| MUI theme / React app shell | No GUI | `web/theme/theme.tsx`, `web/App.tsx`, `App.tsx` |

> **Note on output framing:** unlike the in-browser copy/download variants
> (`full`, `main`, `appendix`, `backmatter`, `allparts`), `inscriber` writes the
> equivalent set as **files** (§14). The content-shaping logic behind those
> variants — section assembly, optional BibTeX, per-section titles — is the part
> worth porting (`content-utils.ts`); the menu/UI around it is not.

---

*End of design document.*
