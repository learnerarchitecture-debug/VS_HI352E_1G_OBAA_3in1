# Seamless PBR Texture Studio — Implementation Plan

**Working name:** `PBRForge` (rename freely)

**Goal:** A web app + server that takes a photographed or painted texture image and returns a
production-ready, tileable, **renderer-native PBR material set** — albedo, normal, roughness,
metallic, AO, height/displacement, opacity, emissive — packaged with correct colour spaces, bit
depths, channel packing and naming for **Enscape, V-Ray, Corona, Lumion, D5, Twinmotion, Unreal,
Unity, Blender, Arnold/Redshift/Octane, glTF, USD and MaterialX**.

**Assumptions** (tell me if wrong):
- Users are archviz / interior visualisation artists and small studios — Enscape, V-Ray, Corona,
  Lumion and Twinmotion are the primary targets, not game studios.
- Runs as a **web app with a local/on-prem option**. Studios are paranoid about client textures
  leaving their network, so offline mode is a feature, not a nice-to-have.
- Small team (2–5 people), GPU is available either in cloud or on the artist's workstation.
- Quality bar = "as good as a skilled artist doing the Photoshop offset trick + Materialize",
  but 20× faster and reproducible.

---

## 0. Executive summary — the five decisions that shape everything

1. **One authoritative height field drives everything.**
   Never process each map independently. Decide the surface geometry (height/displacement),
   fix its seams once, then *derive* normal, AO, cavity, curvature and edge wear from it.
   Independent per-map processing is the #1 cause of "my normal map doesn't line up with my
   albedo" bugs. Derived maps stay aligned **by construction**.

2. **Seamless is a menu of algorithms, not one algorithm.**
   Mirroring, Poisson blending, graph-cut quilting, frequency-domain matching, lattice detection
   and diffusion inpainting all fail on different inputs. The product is the *automatic chooser*
   plus a seam-quality metric that decides when to escalate to a heavier method. Shipping one
   method is shipping a tool that fails on half of real textures.

3. **Lattice (period) detection beats seam blending whenever the texture is man-made.**
   Brick, tile, plank, parquet, knit, paving — these have a real repeating unit. Find it, crop to
   an integer multiple of it, and it tiles *perfectly* with zero distortion and zero blur. This is
   the single highest-value classical feature and most competitors under-serve it.

4. **AI is a refinement layer, never the pipeline.**
   Diffusion produces beautiful seams and hallucinated grout lines with equal enthusiasm. Use AI
   at the seam band, at low frequency, and under constraints (circular padding, mask limits,
   colour matching, fixed seed). Everything else is deterministic math. **Every AI step must be
   pinnable to a seed + model version** or studios cannot reproduce last month's render.

5. **The deliverable is not an image — it is an export package.**
   The moat is not the algorithm (they're published papers). The moat is **renderer-native output**:
   ORM packing for Unreal, `.vrmat`/`.vrscene` for V-Ray, `.matpkg` for Enscape, Mask Map for Unity
   HDRP, non-colour colour-space tags in Blender, glTF/USD/MaterialX for everything else, plus
   correct filenames and sidecar JSON. Artists pay for "it just works in my renderer".

**Realistic outcome:** a usable MVP in **8–10 weeks**, a product competitive with Substance 3D
Sampler on the tiling problem in **4–6 months**, with the AI-quality features being the long pole
(and the biggest risk).

---

## 1. Read this first: what is actually hard here

Be honest about the limits before writing code, because two of these are unsolvable in the general
case and must be designed around, not "optimised".

| Problem | Why it's hard | Honest resolution |
|---|---|---|
| **True seamlessness without distortion** | A photo is a window onto a non-periodic surface. Making it periodic requires either cropping, warping, duplicating content, or hallucinating it. | Best-effort cascade (§5.2) + honest QC report. Lattice detection solves it exactly for man-made materials. For organic/random textures, synthesis is genuinely good. For *structured but non-periodic* images (a marble slab, a mural, a rendered facade), say so in the UI and recommend "random offset + crop" instead of pretending. |
| **De-lighting (separating albedo from lighting)** | Ill-posed: infinitely many (albedo, light) pairs produce the same photo. | Constrained heuristics + ML, user-adjustable strength, and a "keep some shading" default. Never claim a physically correct albedo. |
| **Metallic from a photo** | Metal vs painted-metal vs dirty-metal is not recoverable from appearance alone. | Classify dielectric/metal and default to a single value (0 or 1). Expose masked variation only where the user paints or where AI is confident. Warn explicitly. |
| **Roughness from a photo** | Specular only appears where light happens to hit; most pixels carry no roughness information. | Statistical estimate + macro-variation noise layer. Accept it looks "approximate" and give the artist a roughness remap curve + blend slider. This is where every auto-PBR tool gets complaints; own it in the UI. |
| **Repetition perception** | A perfectly seamable 4k concrete tile, repeated 12×, looks like a grid. | Ship **macro/micro variation** and **Wang tile / variant atlas** generation as part of the deliverable, not as a paid extra. |
| **Determinism** | Diffusion is non-deterministic; studios need reproducible renders. | Bake results to static maps, pin seeds and model versions, version the whole pipeline, keep a pipeline hash in the sidecar JSON. |

**What is genuinely easy and already solved:** height→normal, cavity/AO from height, channel
packing, colour-space tagging, format conversion, naming conventions. These are engineering, not
research. Do them perfectly — that's where trust is built.

---

## 2. Scope

### 2.1 In scope

- Ingest photographs, scans, existing PBR sets, and AI-generated images.
- Make seamless (cascade of algorithms + manual seam brush).
- De-light / albedo recovery.
- Derive and author the full PBR map set.
- Guarantee map alignment.
- Repack, convert, colour-manage, and export per-renderer packages.
- QC with quantitative metrics and live 3D preview.
- Batch, API, CLI, watch folders, and DCC integrations.
- Project library, versioning, search, sharing.
- Local/offline deployment with licensing.

### 2.2 Explicitly out of scope (v1) — but designed for later

- Full procedural material graph authoring (that's Substance Designer's job). We generate maps;
  we don't replace node graphs. **Later:** export a MaterialX/OpenPBR graph.
- 3D scanning / photogrammetry (we can *ingest* an already-aligned multi-view set later).
- UV unwrapping, modelling, scene assembly.
- Being a renderer. We never render final images — only preview.

---

## 3. Users and jobs to be done

| Persona | Job | What they touch | Success looks like |
|---|---|---|---|
| **Solo archviz artist** | "Client sent a photo of the actual floor tile. Build me the material for Enscape." | Web app, drag-drop, wizard | 90 seconds from photo to working Enscape material |
| **Studio visualiser (V-Ray/Corona)** | "80 textures for this hotel project. Nth-degree naming, mm-accurate displacement." | Batch + CLI + presets | Naming and units consistent across the whole job |
| **Studio pipeline TD** | "Wire it into Perforce, validate every texture before it enters the library." | API, webhooks, watch folder, QC gates | Zero manual QC, CI-style validation |
| **Texture/marketplace seller** | "Ship 1000 tiles with metadata, energy-valid albedo, and a preview." | Batch API, publishing tools | Store-compliant packs, no rejections |
| **Game/realtime dev** | "Give me ORM-packed, KTX2-compressed, DirectX-normal sets." | Presets, API | Drops into UE with correct sRGB flags |
| **Technical artist / tinkerer** | "I want to control the algorithm." | Advanced panel, CLI, plugin API | Every knob exposed, scriptable |

**Critical insight:** persona 1 and 2 are the paying majority. Persona 6 (tinkerer) should be
supported but never allowed to complicate the default flow.

---

## 4. Feature set

Priority: **P0 = MVP**, **P1 = v2**, **P2 = later**.

### 4.1 F-01 Ingest

- **P0** PNG, JPG, TIFF, WEBP, EXR (single + multi-part), BMP. Up to 8192² (16k² in v2).
  8/16/32-bit. sRGB / AdobeRGB / linear primitive colour-space detection from ICC + filename hints
  (`_normal`, `_nrm`, `_ao`, `_rough`, `_gloss` → treat as data).
- **P0** Multi-file drop of an already-split PBR set → auto-detect which map is which
  (name heuristics + image statistics: blue-dominant mean ≈ (0.5,0.5,1) → normal; flat greyscale
  ≈ 0.5 → roughness; R≈G≈B with detail → height/AO). This alone wins users.
- **P1** Bracket/photo sets (2–3 exposures) → merge before de-lighting.
- **P1** Import from URL, S3/MinIO bucket, Google Drive, Dropbox, local folder, ZIP of a pack.
- **P1** DCC round-trip: import a material *out of* a `.blend`/`.max` file (best-effort) for re-work.
- **P2** RAW camera files (CR2/NEF/ARW) via LibRaw.
- Validation & security: magic-number checks, decompression-bomb limits (max pixels, max layers),
  EXIF strip by default, virus scan on upload, no server-side URL fetch without allowlist (SSRF).

### 4.2 F-02 Pre-process & repair

- **P0** Auto-crop to content, deskew, perspective rectify (4-point manual + auto line detection),
  rotate any angle, square-or-preserve aspect choice, non-power-of-two → POT (with the size ladder
  1024/2048/4096/8192; never upscale silently).
- **P0** Vignette correction, white balance (grey-world + one-click "pick a neutral" eyedropper),
  auto-levels with clipping protection, optional colour-checker calibration.
- **P0** Denoise (guided/NLM) that preserves texture detail, JPEG artifact suppression
  (block + ringing removal applied lightly, masked to low-detail regions).
- **P1** Defect removal: scratch, dust, stain, speck, and **logo/watermark/text** removal
  (inpainting). Copyright-relevant: if a watermark is detected, warn instead of silently removing.
- **P1** Auto-tag & metadata: category classification, resolution, suggested real-world scale
  (e.g. brick count → cm using standard brick dimensions; paving stone width; plank width class).
- **P2** Lens distortion correction profiles (per camera/lens) for tiled phone shots.

### 4.3 F-03 Seamless engine (the core)

Algorithm cascade (§5.2) with automatic selection + manual override + seam brush.

- **P0** Offset + Poisson/Laplacian seam healing; mirror-wrap; multi-band stitch.
- **P0** Lattice/period detection with visual grid snap and integer-multiple crop *(highest value)*.
- **P0** Automatic seam-quality scoring and automatic escalation to a stronger method.
- **P0** Manual **seam brush**: paint a mask → regenerate *only* that region with the chosen method.
- **P1** Graph-cut quilting / patch-based synthesis for organic and highly structured textures.
- **P1** Frequency-domain matching (spectral + histogram) for noise-like textures (sand, gravel,
  concrete, asphalt, grass, fabric weave).
- **P1** AI seam inpainting (diffusion, circular-padded, low-frequency only, fine detail re-injected).
- **P1** Cross-map safety: apply the *same* result to all maps; forbid independent per-map seam runs.
- **P1** Tiling modes: **repeat**, **mirror**, **random-offset-safe** (mirror-safe but not
  necessarily tileable), **Wang tile set (v2)**.
- **P2** Anisotropy handling (directional textures like brushed metal, wood grain, weaves) with
  direction-aware synthesis and an explicit "keep direction" toggle.
- **P2** Animated/sequence textures (water, smoke): consistent seams across frames.

### 4.4 F-04 De-lighting and albedo recovery

- **P0** Illumination flattening: large-scale luminance removal (guided filter / L0 smoothing /
  multi-scale retinex) with strength slider. Removes vignetting, hot spots, uneven daylight.
- **P0** Baked shadow softening (luminance-aware, mask-driven, not global).
- **P0** Specular/highlight suppression via dichromatic reflection model (chromaticity).
- **P1** ML intrinsic decomposition (albedo + shading), with a "preserve intent" blend so the
  artist can dial between flattened and photographic.
- **P1** Shadow/highlight masks exported as separate maps — useful as AO or dirt masks in V-Ray.
- **P2** Multi-exposure fusion for extreme dynamic range surfaces (glossy tiles near a window).

### 4.5 F-05 PBR derivation

| Map | Method | Notes |
|---|---|---|
| **Height / displacement** | **P0** derived from de-lit luminance + local contrast equalisation; **P1** monocular depth/normal ML for correct *macroscopic* form | 16-bit PNG/TIFF/EXR. Mid-level + amplitude in **millimetres**. This is the authoritative geometry map. |
| **Normal** | **P0** Sobel/Scharr central differences on height, with smoothing and strength control | 8-bit for realtime, **16-bit for V-Ray/Corona/Arnold/Blender** (banding is visible otherwise). OpenGL (+Y) / DirectX (−Y) toggle. Never derive normals from the raw photo — that bakes in lighting. |
| **Roughness** | **P0** estimate from high-frequency luminance, cavity and specular presence; **P1** ML estimate | Remap curve in UI, range clamp (avoid pure 0/1), optional macro-variation noise overlay. |
| **Metallic** | **P0** classifier (metal / dielectric / mixed) + single value + masked variation | Binary by default. Explicit warning UI for "we guessed". |
| **AO / cavity** | **P0** height-field ray-march (HBAO-style), multi-scale; curvature map | Keep AO subtle — Enscape/Lumion generate their own SSAO; double-AO looks dirty. |
| **Specular / gloss** | **P0** conversion from metal-rough, and **back** with correct math (gloss = 1 − rough, with the legacy remap per renderer) | Not a naive inversion — V-Ray/Corona legacy gloss curves differ. |
| **Opacity / alpha** | **P1** chroma-key/background removal + matting refinement + foliage preset (leaf cutout) | Critical for foliage, decals, fences, lace. Needs premultiply handling and edge fringe removal. |
| **Emissive** | **P2** detection of self-illuminated regions (screens, lamps, neon) | Niche but archviz-relevant. |
| **Curvature / edge wear / dirt masks** | **P2** from height | Enables smart-material style wear without Substance. |
| **Anisotropy / clearcoat** | **P2** authored by user, not inferred | V-Ray/Corona/OpenPBR support them; photo inference is unreliable. |

### 4.6 F-06 Repack, convert, colour-manage (the moat)

- **P0** Channel packing:
  - Unreal **ORM** (R=AO, G=Roughness, B=Metallic)
  - Unity HDRP/URP **Mask Map** (R=Metallic, G=AO, B=Detail, A=Smoothness)
  - glTF **metallicRoughness** (G=roughness, B=metallic) + separate occlusion
  - V-Ray/Corona "RMA"/"MRA"/"ARM" custom orders (user-definable)
- **P0** Bit depth per map: data maps 16-bit option; albedo 8-bit sRGB or 16-bit; normal 16-bit option.
- **P0** Hard colour-space guards: normal/rough/metal/AO/height are **data** — never gamma'd,
  never JPEG-recompressed (JPEG destroys normal maps and produces banding in roughness).
- **P0** Roughness↔glossiness conversion; sRGB↔linear; normal green-channel flip; normal strength;
  height amplitude and mid-level; invert toggles per map with live preview.
- **P0** Downscale with proper filtering (Kaiser/Lanczos) + NPO2 and POT ladder; **never** let a
  naive resize destroy the normal map's unit length (re-normalise after resize).
- **P1** Real-time compression: **KTX2** (Basis/UASTC/BC7/BC5), DDS, ASTC. BC5 for normals
  (2-channel, recompute Z), BC7 for albedo, BC4 for single-channel.
- **P1** EXR (half/float) for V-Ray/Arnold displacement and HDR albedo work.
- **P1** Dithering for 8-bit gradients, alpha handling, tiling-aware resize (circular convolution —
  a resize must not break seamlessness; this is a real and commonly-missed bug).

### 4.7 F-07 Renderer presets & package export

**P0 (must ship):** V-Ray, Corona, Enscape, Unreal, Unity, Blender, glTF.
**P1:** Lumion, Twinmotion, D5, Arnold, Redshift, Octane, SketchUp/Revit native, USD, MaterialX.
**P2:** Cinema 4D, 3ds Max Slate material, `.vrmat`/`.vrscene` writers, `.matpkg` writer, OpenPBR 1.0 graph.

Every preset is a **versioned JSON profile** defining: map list, filename template, format, bit
depth, colour space, packing, normal orientation, roughness convention, extra files, and a
`renderedValidation` block recording against which renderer version it was verified.

**Filename template with tokens** — `{project}_{material}_{map}_{res}v{version}` →
`hotel_lobby_marble_albedo_4k_v003.png`. Because inconsistent naming is the #1 reason studios
reject delivered assets.

**Package contents (P0):**
```
hotel_lobby_marble_v003/
  maps/
    hotel_lobby_marble_albedo_4k.png          (sRGB, 8-bit)
    hotel_lobby_marble_normal_4k.png          (data, 16-bit, OpenGL +Y)
    hotel_lobby_marble_roughness_4k.png       (data, 16-bit)
    hotel_lobby_marble_metallic_4k.png        (data, 8-bit)
    hotel_lobby_marble_ao_4k.png              (data, 8-bit)
    hotel_lobby_marble_height_4k.exr          (data, 16-bit, mm)
  preview/
    sphere.png  plane_3x3.png  roughness_sweep.png
  material.json        (all parameters, physical scale, energy stats, pipeline hash, seed)
  README.txt           (how to wire it in V-Ray/Corona/Enscape, in 10 lines)
  import/vray/…        (optional .vrmat, MaxScript, node notes)
```

**Integration deliverables beyond files (this is where "feature integration" lives):**

| Target | Delivery mechanism | Difficulty |
|---|---|---|
| **V-Ray (Max/SketchUp/Rhino/Blender)** | Files + generated **MaxScript** that creates VRayMtl, wires Bitmap nodes, sets gamma/colour-space per map, applies VRayDisplacementMod (2D, mm scale) and VRayTriplanar for UV-free tiling; `.vrmat` + `.vrscene` writers for a true one-click import | Med |
| **Corona** | Files + MaxScript (CoronaMtl, CoronaDisplacementMod with screen-size), roughness (Corona 7+) / glossiness for older versions | Med |
| **Enscape** | Files with Enscape-friendly naming + **`.matpkg` package export** (Enscape's own material package format) + a visual "click these 4 slots" guide; keep resolutions ≤ 4k, no AO map (Enscape has SSAO), height used as bump/parallax, metallic as near-binary | Low–Med |
| **Unreal 5** | ORM pack, DirectX normals, sRGB flags documented, Texture Group/MipGen settings, **Python Editor Script** to import and build the material instance, optional Virtual Texture note | Med |
| **Unity HDRP/URP** | Mask Map + OpenGL normals, `.unitypackage` or an Editor script using `AssetImporter` to set sRGB/alpha flags and build the Shader Graph material | Med |
| **Blender 4.x** | Correct `Non-Color` colour-space tags, Principled BSDF v2 wiring (Roughness/Metallic/Normal/Displacement), **`.blend` template + addon** to auto-wire on drop, UDIM support for oversized materials | Low |
| **Lumion / Twinmotion / D5** | Flattened simplified sets (albedo/normal/roughness/height), 2k–4k, no packed maps, PDF/HTML one-pager showing which slot takes what | Low |
| **Arnold / Redshift / Octane** | Separate maps, 16-bit EXR normals, displacement notes, IOR and clearcoat/anisotropy hints | Low |
| **glTF 2.0 / USD / MaterialX** | Viewer-ready glTF with correct `metallicRoughness`, occlusion, normal `scale` (green flip), `KHR_materials_*` extensions; `.usda` with `UsdPreviewSurface`; `.mtlx` with an OpenPBR Surface graph (P2) | Med |

> **Add-on, not a renderer feature:** the single most appreciated integration is a **"Copy settings
> for <renderer>" panel** — the exact numeric values (IOR 1.5, glossiness 0.62, discolour…) and
> slot assignments with a screenshot per renderer. Artists screenshot it into studio wikis. Also:
> a **triplanar recommendation** for V-Ray/Corona so tiled materials stop showing UV grid artefacts
> on curved geometry.
>
> **Hard constraint, know it now:** you **cannot** generate `.sbsar` files without Adobe's
> Substance Automation Toolkit (licensed, and its use for redistribution is restricted). Ship
> `.mtlx`/`.usda`/`.blend`/`.max` equivalents instead and say so openly. Do not promise `.sbsar`.

### 4.8 F-08 QC, preview and validation

- **P0 Live 3D preview:** WebGL2/WebGPU sphere, plane, cylinder and floor, with HDRI switcher
  (studio / overcast outdoor / warm interior / night), exposure and roughness multipliers,
  and a **1×1 / 3×3 / 8×8 tiling** toggle.
- **P0 Seam heat-map overlay:** visualises the gradient discontinuity across wrap boundaries.
- **P0 Normal-orientation flip with instant preview** — the fastest way to prevent green-channel bugs.
- **P0 Map viewer:** per-map histogram, min/max/mean, clipping warnings, channel inspector.
- **P0 QC report card** with pass/warn/fail:
  - seam continuity score (mean wrap-boundary gradient error vs interior; warn above ~2.5%)
  - albedo energy sanity (mean luminance ≥ 0.18 typical, < 0.5% clipped pixels)
  - no pure black/white albedo (0.04 floor) — prevents fireflies in V-Ray and black-spot artefacts
  - normal map sanity (blue channel ≥ 0.5, unit length within tolerance, no NaNs)
  - roughness spread (warn if the histogram is a single spike — "flat 0.5" is the classic tell)
  - repetition analysis (autocorrelation/FFT peak) → "this will look gridded at 8× tiling"
  - colour-space and bit-depth audit per map
- **P1** A/B compare slider, version diff, "regenerate from this stage" history.
- **P1** Batch QC dashboard for a folder/asset library.

### 4.9 F-09 Projects, library and collaboration

- **P0** Projects → materials → versions; tags; search; thumbnails; download originals + derived.
- **P1** Team workspaces, roles (owner/editor/viewer), share links with expiry, comments with pins on
  the texture, approval status (WIP / review / approved), audit log.
- **P1** Duplicate detection and similarity search (perceptual hash + CLIP embeddings + pgvector):
  "have we already tiled this concrete?"
- **P2** Publishing tools: marketplace-ready packs, license metadata, generated marketing previews
  (sphere/plane/close-up grid), SEO-ish metadata, variant generation (wet, dirty, worn, snow, moss).
- **P2** Non-destructive node history with branching (regenerate from any stage without losing work).

### 4.10 F-10 Automation and integration

- **P0** REST API + API keys; async job model; webhooks on completion/failure.
- **P0** CLI (single static binary) with identical options to the API.
- **P0** Presets that are shareable, versionable JSON.
- **P1** Watch-folder agent (filesystem watcher → upload → process → write results back into the
  project tree, with sidecar). This is the studio killer feature, because it requires zero workflow change.
- **P1** DCC plugins: **Photoshop UXP panel** (send the current document, get maps back as layers),
  **Blender addon**, **3ds Max MaxScript/utility panel**.
- **P1** Pipeline hooks: ShotGrid/Flow, ftrack, Perforce (mirror output into a depot with correct
  revisioning), Git LFS, ftp/SFTP drops, S3/MinIO sync, Slack/Teams/email notifications.
- **P2** Zapier/n8n-style generic webhooks; a public "recipes" gallery of presets.
- **P2** MCP server so AI agents/IDEs can drive the API (relevant by 2027 — cheap to add later).

### 4.11 F-11 AI features

See §6 for architecture and risk. Feature list:

| Feature | Value | Risk |
|---|---|---|
| **Auto-material classification** → auto preset for seam/derivation | High (removes all setup decisions) | Low |
| **AI seam inpainting** (diffusion, circular-padded, seam-band only) | High for organic/structured texture | Med |
| **Photo → full PBR** (intrinsic decomposition / SVBRDF-style) | Very high for one-photo customers | High |
| **Super-resolution 2×/4×/8×, tiling-aware** | High (users own 1k phone photos) | Low–Med |
| **Semantic matting / background removal** (foliage, decals, lace) | High in archviz (trees, railings) | Low |
| **Defect & watermark removal** (inpainting) | Med | Med (legal) |
| **Prompt-to-texture** (generate a tileable material from text) | High marketing value, med monetisation | Med (licensing) |
| **Texture variation/synthesis** (Wang tile sets, "same material, 8 non-repeating variants") | High for large floors | Med |
| **Auto-scale & auto-tag** ("this is a 20 cm brick at 1.4 px/mm") | Med, big time-saver | Low |
| **Natural-language search** ("find all rough grey concrete") | Med | Low |
| **Roughness/metallic confidence scoring** ("we are 60% confident") | High trust-builder | Low |
| **Material family expansion** (wet/dirty/worn/snow/moss variants) | Med, marketing gold | Med |

**AI features I would NOT ship in v1:** training your own models from scratch, fine-tuning on
customer data (privacy disaster), fully automatic "one click is always right" claims, and anything
that silently alters material identity.

### 4.12 F-12 Authoring tools (the difference between a toy and a tool)

- **P0** Undo/redo across the whole pipeline, "regenerate from stage N".
- **P0** Seam brush, mask brush, clone/heal brush (basic).
- **P1** Crop-and-snap grid with lattice overlay, interactive period adjustment (drag the seam line).
- **P1** Levels/curves per map, sharpen/soften, contrast, per-map blend with the original.
- **P1** Macro-variation overlay generator (large-scale Perlin/worley blend with the albedo, and a
  matching roughness/AO nudge) — the feature that stops floors looking like tiles.
- **P1** Split/detail-map generator: macro (1 tile) + micro (8× detail) for V-Ray/Corona detail
  maps and for realtime detail nodes.
- **P2** Wang tile set + shader snippet per renderer.
- **P2** Batch operations: apply a preset to 200 files, per-file overrides via CSV/spreadsheet.
- **P2** Scripting: Python plugin API + headless pipeline function (studios will extend it).

---

## 5. Technical design

### 5.1 Architecture

```
                    ┌─────────────────────────────────────────────┐
   Browser (SPA)    │  Next.js + React + WebGPU preview (three.js) │
   Photoshop UXP ───┤  Local agent (watch folder, big-file upload) │
   Blender/Max ─────┘                                             │
                    └───────────────┬─────────────────────────────┘
                                    │  HTTPS / REST + WebSocket
                    ┌───────────────▼─────────────────────────────┐
                    │ API gateway  (auth, rate limit, idempotency)│
                    │ FastAPI (Python)  +  thin Rust/Go hot edges │
                    └───────┬───────────────┬─────────────┬───────┘
                            │               │             │
              ┌─────────────▼──┐   ┌────────▼──────┐  ┌───▼─────────────┐
              │ Orchestrator   │   │ Metadata DB   │  │ Object store    │
              │ Temporal /     │   │ Postgres +    │  │ S3 / MinIO      │
              │ Celery+Redis   │   │ pgvector      │  │ (originals,     │
              └─────┬──────────┘   └───────────────┘  │  maps, packs)   │
                    │                                 └─────────────────┘
        ┌───────────┴───────────┬──────────────────┬────────────────┐
        │                       │                  │                │
 ┌──────▼──────┐        ┌───────▼──────┐   ┌───────▼──────┐  ┌──────▼──────┐
 │ CPU workers │        │ GPU workers  │   │ AI inference │  │ Export/     │
 │ libvips,    │        │ CUDA/ONNX,   │   │ service      │  │ packer      │
 │ OpenCV,     │        │ moderngl,    │   │ Triton/FastAPI│ │ (CPU, Io   │
 │ OpenImageIO │        │ OpenGL CL    │   │ model pool   │  │  bound)     │
 └─────────────┘        └──────────────┘   └──────────────┘  └─────────────┘
```

**Tech stack (recommended, with rationale):**

| Layer | Choice | Why |
|---|---|---|
| Frontend | Next.js 15 + React + TypeScript + Tailwind/shadcn | Fast to build, good DX, easy on-prem static hosting |
| 3D preview | three.js on WebGPU with WebGL2 fallback | Smallest path to a credible PBR preview; WebGPU needed for 4k tiling previews at 60 fps |
| Image engine | **libvips** (pyvips) for I/O & resize, **NumPy/SciPy**, **OpenCV** (contrib), **scikit-image**, **OpenImageIO** for EXR | libvips is the only sane way to handle 8k+ images in bounded memory; OIIO for EXR/TX |
| GPU | PyTorch + CUDA, ONNX Runtime / TensorRT, `moderngl` (OpenGL compute) or compute shaders in WGSL | Poisson/solve and normal/AO generation are 10–100× faster on GPU |
| Backend | Python (FastAPI) for imaging+AI, with Rust or Go for the export/pack/API hot paths | Python has the imaging & ML ecosystem; step-function hot paths go native. Do not fight this. |
| Orchestration | Temporal (durable workflows, retries, replay) or Celery + Redis for v1 | Durable workflows matter once jobs run minutes and users pay per job |
| DB | Postgres 16 + pgvector | One database for relational + embeddings |
| Storage | S3-compatible (AWS/GCS/MinIO), immutable object keys, content-hash addressed | Dedup + cheap caching |
| Deploy | Docker Compose (on-prem single node) and Kubernetes + GPU node pool (cloud) | On-prem is a product requirement, not an ops detail |
| Observability | OpenTelemetry traces + Grafana/Prometheus, per-stage timing, GPU utilisation, cost per job | You cannot price AI features without this |

### 5.2 The seamless algorithm cascade (core IP)

Ordered, cheapest-first, with an automatic stop when the seam metric passes.

```
0. Validate & normalise    → colour space, POT/NPO2, max size, data-map protection
1. Lattice detection       → FFT/autocorrelation + line-count heuristics per class
                             → if confident: snap-crop to integer periods   [EXACT, 0 distortion]
2. Crop & random offset    → choose the largest window whose wrap error is minimal
                             (search over candidate offsets, score by boundary MSE + gradient)
3. Fast warp               → offset+mirror hybrid, Poisson/Laplacian seam healing,
                             multi-band (Laplacian pyramid) blending in the seam band only
4. Frequency/spectral      → phase randomisation + radial-spectrum & histogram matching
                             (noise-like: sand, gravel, concrete, asphalt, grass, fabric)
5. Graph-cut quilting      → patch synthesis minimising seam cost (Efros–Freeman / Kwatra /
                             GPNN); handles structured non-lattice textures
6. AI refinement           → diffusion inpainting restricted to the residual seam band,
                             circular padding so wrap continuity is enforced by construction,
                             colour/histogram match to surroundings, detail re-injection pass
7. Measure & escalate      → seam score, structure integrity score (SSIM vs original),
                             repetition score. Pass → stop. Fail → next method. Never ship
                             a silently-bad result; surface the score and let the artist choose.
```

**Rules that prevent 80% of bugs:**

- **Map alignment rule:** run the pipeline on a single authoritative representation
  (de-lit luminance/height). Derive normal/AO/cavity/roughness *after* the seam is fixed.
  Any per-map operation must be applied to all maps using the same warp field.
- **Tiling-safe resize rule:** when downscaling a tileable image, use circular (wrap-around)
  convolution kernel padding. A naive resize reintroduces seams at the opposite edge.
  Most competitors get this wrong.
- **Detail re-injection:** after any smoothing method, re-add the high-frequency band from the
  original (masked away from the actual seam) so the tissue paper doesn't get soft.
- **Never upsample before tiling:** make seamless at native resolution, then upscale with a
  tiling-aware model.

### 5.3 Job pipeline & state machine

```
created → validating → ingesting → preprocess → lattice_detect → seamless → delight
   → derive(height) → derive(normal,ao,cavity) → derive(rough,metal) → upscale?(ai)
   → repack → qc → ready → export → delivered
                                                    ↘ failed(reason, stage, retryable)
```

- Every stage writes its own artifact and a hash; the whole run has a **pipeline hash**
  (code + model + params + seed) recorded in `material.json`.
- Stage outputs are cached by content hash → re-running an export costs nothing.
- Partial failure is expected (AI model OOM, EXR corruption). Retries are per-stage with backoff.
- **Deterministic mode** (default for exports): fixed seeds, pinned model versions, no preview-time
  randomness. "Re-run" on the same input + params + hash must produce byte-identical output
  (except where the renderer's own compression is non-deterministic — document those cases).

### 5.4 Data model (sketch)

```
org(id, name, plan, sso_config, data_region, retention_days)
user(id, org_id, email, role, mfa, api_keys[])
project(id, org_id, name, root_path, watch_folder_config)
material(id, project_id, name, category, real_world_scale_mm, tags[])
asset(id, material_id, kind[original|albedo|normal|rough|metal|ao|height|alpha|emissive|packed],
      s3_key, sha256, width, height, bit_depth, colourspace, bytes)
version(id, material_id, seq, pipeline_hash, seed, params_json, created_by, notes)
job(id, version_id, stage, status, attempts, gpu_seconds, cost_estimate, error)
preset(id, org_id|null, name, target_renderer, renderer_version, spec_json, is_public)
export(id, version_id, preset_id, target, formats[], filename_template, zip_key, status)
qc_run(id, version_id, metrics_json, verdict)
comment/share/audit_log …
```

### 5.5 API surface (v1)

```
POST   /v1/assets                 multipart or presigned-URL registration
POST   /v1/assets/{id}/classify   AI classification + suggested preset
POST   /v1/jobs                   { asset_ids|asset_id, pipeline:{...} } → job_id
GET    /v1/jobs/{id}              status, stage, progress, per-stage timing, cost
WS     /v1/jobs/{id}/events       live progress + preview thumbnails
POST   /v1/jobs/{id}/cancel
POST   /v1/jobs/{id}/rerun        { from_stage }
GET    /v1/materials/{id}/versions
POST   /v1/materials/{id}/seams   manual seam mask (RLE or mask image) + method
GET    /v1/qc/{version_id}
POST   /v1/exports                { version_id, preset_id, resolution_matrix[], formats[] }
GET    /v1/exports/{id}           → zip URL (signed, expiring)
CRUD   /v1/presets /v1/projects /v1/tags
GET    /v1/search?q=&embedding=   hybrid keyword + CLIP similarity
POST   /v1/webhooks /v1/webhook_endpoints
GET    /v1/usage                  GPU seconds, jobs, storage, overage
```

**Pipeline JSON (user-facing knobs, all optional with good defaults):**

```json
{
  "seam": {
    "method": "auto",                  // auto|mirror|poisson|spectral|quilting|ai|manual
    "lattice": { "enabled": true, "sensitivity": 0.7, "axis_lock": "auto" },
    "seam_band_px": 96,
    "ai": { "enabled": true, "model": "seam-v3", "seed": 1234, "strength": 0.55 }
  },
  "delight": { "strength": 0.7, "remove_specular": true, "preserve_micro_shading": 0.3 },
  "derive": {
    "height":  { "source": "delit_luminance", "depth_ai": false, "detail_boost": 0.2, "amplitude_mm": 3.0, "bit_depth": 16 },
    "normal":  { "strength": 1.0, "orientation": "opengl", "bit_depth": 16, "smooth": 0.15 },
    "roughness": { "algorithm": "hybrid", "remap": [0.0, 1.0], "macro_variation": 0.25, "clamp": [0.05, 0.95] },
    "metallic": { "mode": "classify", "value": 0.0, "confidence_min": 0.9 },
    "ao":      { "strength": 0.6, "radius_px": 48, "multiscale": true }
  },
  "output": {
    "resolutions": [4096],
    "preset": "vray-6",
    "filename_template": "{material}_{map}_{res}v{version}",
    "formats": { "albedo": "png8", "normal": "png16", "height": "exr16" },
    "realtime_compression": null
  }
}
```

### 5.6 Performance targets

| Operation | 2k² | 4k² | 8k² | Hardware |
|---|---|---|---|---|
| Ingest + preprocess | < 1.5 s | < 4 s | < 12 s | CPU (libvips, 8 cores) |
| Lattice detect | < 0.4 s | < 1.2 s | < 4 s | CPU/GPU |
| Seamless (classical) | < 2 s | < 6 s | < 25 s | GPU |
| De-light | < 1 s | < 3 s | < 10 s | GPU |
| Derive all maps | < 2 s | < 6 s | < 20 s | GPU |
| AI seam refinement | < 4 s | < 12 s | < 40 s | mid GPU (L4/A10) |
| AI super-res 2× | < 3 s | < 10 s | < 35 s | mid GPU |
| Export pack | < 1 s | < 2 s | < 6 s | CPU |

**Design targets:** first pixel of progress feedback < 500 ms; full default pipeline for a 4k input
< 30 s on a single mid-range GPU; 100+ textures/minute in batch on a 4-GPU worker pool.
**Memory rules:** hard cap per job (e.g. 6 GB CPU / 12 GB VRAM), streamed I/O, never load three
8k float images at once — tile the work and stitch.

### 5.7 Deployment topologies

1. **Cloud SaaS** — multi-tenant K8s, GPU node pool with autoscale-to-zero, S3 + CDN, region
   pinning (EU/US/IN) for data residency.
2. **Single-node on-prem** — `docker compose up` on a studio workstation (4090/RTX-class), local
   MinIO, offline license file (signed, machine-bound) or floating license (RLM-style) for studios.
   **Air-gapped mode**: no telemetry, no model downloads, offline activation.
3. **Hybrid (recommended default for studios)** — everything local, AI calls opt-in per job with
   a clear indicator; the asset never leaves the building unless the artist ticks a box.
4. **Local-only desktop** — Tauri/Electron shell around the same engine for artists with no server.
   Ship in P2; it doubles as the offline demo and dramatically reduces support burden.

---

## 6. AI features — architecture, models, and honest risk

### 6.1 Where AI genuinely helps (ranked by value/risk)

1. **Classification → preset selection.** Cheap (a small CNN or CLIP-based classifier), removes all
   decision fatigue, near-zero risk. Ship first.
2. **Tiling-aware super-resolution.** Well-solved, users love it, low risk. Must be trained/used
   with circular padding.
3. **Semantic matting** (foliage cutouts, background removal). Well-solved, high archviz value.
4. **Seam inpainting.** High value. Constrain hard: seam band only, circular padding, colour match,
   fixed seed, detail re-injection, and always show a before/after.
5. **Intrinsic decomposition (photo → albedo/shading).** High value, but ill-posed — always ship
   with the classical fallback and a strength slider.
6. **Monocular depth/normal for macroscopic form.** Useful for adding large-scale relief the photo
   can't show. Risk: hallucinated geometry. Mark as "creative, not photogrammetric".
7. **Prompt-to-texture / variation generation.** Strong marketing, weak retention unless the output
   is genuinely good and licensable. Ship as a separate, clearly-labelled lab feature.

### 6.2 Model strategy

- **Don't train from scratch.** Fine-tune or adapt: an SDXL/FLUX-class inpainting model for seams
  and defects; a small U-Net or transformer for intrinsic decomposition; Real-ESRGAN-class
  (or a tiling-aware variant) for super-resolution; CLIP/SigLIP for classification and search;
  Marigold/DSINE-class monocular normals; a linear probe over CLIP/SigLIP embeddings for
  dielectric-vs-metal and roughness estimation; Depth Anything-class for macro form.
- **Serve via Triton or a FastAPI model pool** with warm workers, batched inference, FP16/INT8,
  and per-model VRAM guards. Cold starts kill UX; keep the common models resident.
- **Datasets:** your own benchmark + licensed capture library. Training on internet scrapes creates
  the licensing problem above; capture your own reference set (a weekend with a camera, a colour
  checker and a scale bar produces more usable data than most scraped sets).
- **Your own dataset is also your defensible moat.** Build the 200–500 texture benchmark set now;
  it powers QC gating, regression testing, model evaluation and marketing demos.

### 6.3 AI caveats and mitigations (do not skip this table)

| Caveat | Mitigation |
|---|---|
| Non-determinism → irreproducible renders | Pin seed + model version; store both in `material.json`; "freeze" outputs as static maps |
| Hallucinated structure (wrong brick bond, impossible grout, smeared detail) | Restrict AI to the seam band and low frequency; enforce lattice alignment; run structure-integrity QC and reject if SSIM to the original drops below a threshold |
| Colour/temperature shift in the seam region → visible patch in albedo | Histogram/mean–std matching in Lab space after generation; blend at low frequency only |
| Maps drifting out of alignment | Derive all maps from a single AI output; never AI-process individual maps independently |
| Structure breaks when tiling (AI doesn't "know" it wraps) | Circular padding + wrap-consistency loss/validation; final wrap test is a hard gate |
| Cost blowout | Per-job GPU-second budget, quotas, "AI is a paid action" metering, cheaper classical fallback always available |
| Privacy / IP leakage of client textures | Local-first mode, opt-in AI, explicit "this job will upload data" consent, EU region pinning, DPA, no training on customer data ever (write it in the contract) |
| Model licensing (commercial use, attribution, redistribution) | Maintain a per-model license register; prefer permissive weights; for on-prem distribution, ship weights only where the license allows, otherwise download on first use |
| Artists don't trust "black box" results | Always show before/after, a confidence score, the chosen method, and give the artist a one-click "do it classically instead" |
| Perceptual uncanny valley on man-made patterns | Auto-promote lattice detection above AI for known classes (brick, tile, plank, parquet) — deterministic beats hallucinated here |
| Evaluation difficulty | Fixed benchmark + human panel + blind A/B against Photoshop+Substance and Materialize; publish the numbers |
| GPU dependency excludes some users | CPU fallback path for everything except diffusion; degrade gracefully |

### 6.4 AI UX rules

1. Every AI step is a **labelled stage** with a slider and a "show me what changed" toggle.
2. Every AI step has a **deterministic alternative** one click away.
3. Never silently overwrite the user's work — always a new version.
4. Confidence scores always shown, never hidden.
5. The **AI badge** appears on exports in the metadata (`ai_assisted: ["seam_v3", "upscale_v2"]`)
   so studios can disclose it in client deliverables. This is a trust feature, and increasingly a
   contractual requirement.

---

## 7. Renderer integration reference (the cookbook)

> Verify every row against the *specific* renderer version in your test matrix before shipping a
> preset. Two of the most common support tickets in this category are a flipped normal green
> channel and a gamma applied to a roughness map. Both are cured by an automated render test (§9).

| Renderer | Map delivery | Normal | Roughness form | Packing | Notes / gotchas |
|---|---|---|---|---|---|
| **V-Ray 5/6/7** | Separate maps, PNG/TIFF/EXR | OpenGL (+Y) for Max/Maya-style; verify per host | `Roughness` (modern) or legacy `Glossiness = 1 − Roughness` | None (packing not needed; you *can* pack with VRayMultiSubTex for RAM) | 16-bit normals; Bitmap node gamma must be **Override 1.0** for data maps; VRayDisplacementMod (2D, mm) or V-Ray VDisplacement for 3D; VRayTriplanar for UV-free tiling; IOR 1.5–1.55 for most dielectrics, 1.76 for glass |
| **Corona 9–12** | Separate maps | OpenGL (+Y) | `Roughness` (Corona 7+); older = Glossiness | None | CoronaDisplacementMod uses **screen size (px)** not mm — document this; Base IOR ~1.52; 16-bit normals |
| **Enscape 3.x/4.x** | Separate, ≤ 4k recommended | OpenGL-style; verify | Roughness (linear, non-colour) | None | Simplified model: Albedo, Height (bump/displacement toggle), Roughness, Metallic, plus special slots (Water/Grass/Foliage/Emissive); **Enscape generates its own ambient occlusion — do not feed an AO map into albedo**; metallic should be near-binary; heavy displacement needs geometry in the host app; `.matpkg` is the native package format |
| **Unreal Engine 5** | **ORM packed** + separate normal/height | **DirectX (−Y)** | Roughness in **G** | ORM: R=AO, G=Rough, B=Metal | Texture Group + sRGB flags (false for all data maps); BC5 for normals; Nanite/WorldHeight caveat for displacement; Virtual Textures for tiled materials larger than 4k |
| **Unity HDRP/URP** | **Mask Map** + normal | OpenGL (+Y) | Smoothness in **A** of Mask Map (i.e. 1 − Roughness) | R=Metal, G=AO, B=Detail, A=Smoothness | Set Texture Type per map; alpha channel precision matters for smoothness; BC7/BC5; Shader Graph wiring guide |
| **Blender 4.x** | Separate maps | OpenGL (+Y) | `Roughness` | None | Set `Non-Color` colour space on **every** data map (the classic mistake); Principled BSDF v2 has Roughness/Metallic/IOR/Coat/Sheen/Anisotropy; Displacement needs subdivision or Adaptive Subdivision (Cycles) / experimental (EEVEE); pack a `.blend` template + addon for one-drop wiring |
| **Arnold / Redshift / Octane** | Separate, EXR preferred | OpenGL (+Y) | Roughness | None | 16-bit EXR normals; quantify displacement with `bounds`; anisotropy for brushed metal |
| **Lumion / Twinmotion / D5** | Simplified flat sets, 2k–4k | Per app | Roughness | None | Flatten everything; some support only albedo/normal; supply a one-pager with slot screenshots |
| **glTF 2.0 / USD / MaterialX** | `metallicRoughness` (G=rough, B=metal) + `occlusion` + `normal` | OpenGL (+Y), `normalTexture.scale` = height amplitude | Roughness in G | Per spec | Colour-space and `KHR_texture_transform` for tiling; `.usda` via `UsdPreviewSurface` and `sourceColorSpace`; **OpenPBR Surface 1.0** modelled in MaterialX is the right forward-looking target — supports anisotropy, coat, subsurface, subsurface-transmission in one graph |

### 7.1 Physical-scale & texel-density guidance (ship this as a tool, not a doc)

- Compute **px/mm** from the detected lattice + user-entered real-world size ("this brick is 190×90×57 mm")
  and print the texel density. Archviz artists almost never know this and it directly causes blurry
  or aliased materials.
- Recommend resolution: `px_per_mm × real_size`. A 2 m wall at 4 px/mm needs 8192 px. Tell the user
  when their chosen resolution is under- or over-sampled **before** they export and blame the tool.
- Memory budget calculator: 4k RGBA8 = 64 MB; 4k 16-bit = 128 MB; a 5-map set at 4k ≈ 320–640 MB
  uncompressed → BCn/KTX2 gives ~4–8× reduction. Essential for realtime users.

---

## 8. UX flows

### 8.1 Primary flow (target: under 90 seconds, first time)

```
Drop a photo
   ↓  auto-classify ("looks like: floor tile") + auto preset chosen, stated in plain language
Preview 1×1 / 3×3 / 8×8 tiles with seam heat-map off by default
   ↓  sliders: Seam strength · De-light · Relief · Roughness · Metalness (only the four that matter)
Live 3D sphere + plane in an HDRI you can switch (studio / outdoor / warm interior / night)
   ↓  Advanced ▾ for the 40 other knobs
Export ▸ preset picker with renderer logos + resolution + filename preview + "what you'll get" file tree
   ↓  ZIP (or straight into the DCC via plugin)
```

### 8.2 Screen inventory

1. **Landing / drop zone** — drag anywhere, paste from clipboard, URL, or folder.
2. **Wizard (3 steps)** — Upload → Adjust → Export. Never more than 3 in the default path.
3. **Editor** — left: map stack with thumbnails and per-map toggles; centre: 3D preview + 2D map
   viewer with zoom/pan and tiling; right: parameters in collapsible groups; bottom: stage timeline
   (regenerate from any stage).
4. **Batch queue** — grid of jobs, per-job stage, failures with reasons, retry-all, "apply preset to all".
5. **Library** — grid/list, filters by category/tag/renderer/QC verdict, similarity search.
6. **QC dashboard** — pass/warn/fail across the library, drill-down to the failing metric.
7. **Export dialog** — presets, matrix of resolutions, formats, filename template with live preview,
   sidecar options, "open folder" / "copy to Perforce".
8. **Team/settings** — members, SSO, API keys, presets, webhooks, retention, region, usage & billing.
9. **Onboarding** — 5 sample textures so the user's first click produces something beautiful.

### 8.3 UX laws for this product

- **Never show a raw algorithm name without a consequence.** "Poisson blend (fast, may soften fine
  detail)" beats "Poisson".
- **Show the failure.** If the seam score is 71%, say "this texture doesn't tile perfectly — here's
  the worst area" and jump the viewport there. Silent mediocrity destroys trust.
- **Defaults must be good enough to ship without touching anything.** Every extra required decision
  loses a user.
- Dark UI, honest performance indicators, no fake progress bars, no modal hell.
- Every destructive-ish action is a new version, never an overwrite.

---

## 9. Testing and quality assurance

### 9.1 Automated test layers

1. **Unit** — each filter/algorithm with golden images and PSNR/SSIM thresholds; deterministic seeds.
2. **Property tests** — the important ones:
   - *Wrap equality:* the output must tile pixel-exactly (`wrap(img, 1,0) == img` by construction).
   - *Idempotence:* running the seamless step twice must not degrade the image further.
   - *Alignment:* edges/features in albedo, normal, height and AO must cross-correlate within 1 px.
   - *Tiling-safe resize:* resizing a tileable image preserves tileability (the classic regression).
   - *Colour-space invariance:* data maps must survive every conversion without gamma.
   - *Unit normals:* normal maps remain unit-length after any resize/compression step.
3. **Benchmark suite** — 200–500 curated textures across classes (brick, tile, stone, concrete,
   plaster, wood, parquet, fabric, knit, leather, metal, rusty metal, gravel, sand, grass, foliage,
   water, asphalt, carpet, marble, terrazzo, glass block, rattan, wicker, wall paper, dirt/decals).
   Each with a human-rated golden result. Runs in CI on every algorithm change.
4. **Renderer integration tests (the differentiator — build this early):**
   headless 3ds Max (MAXScript), Blender (`--background`), Unreal (commandlet), Unity (`-batchmode`),
   each importing a generated pack, rendering a standardised test plane/sphere under a fixed HDRI,
   and pixel-comparing to a reference. This is the only way to catch colour-space and channel-order
   bugs at scale, and it becomes your compatibility matrix for marketing ("verified on V-Ray 6.2,
   Corona 11, Enscape 4.1, UE 5.4, Blender 4.2").
5. **Performance regression** — fail CI if any stage exceeds its latency budget by > 20%.
6. **Security** — malformed/hostile images, decompression bombs, EXR/PSD exploits, zip bombs, SSRF
   via URL import, path traversal in export, tenant isolation tests, signed-URL leakage.
7. **Privacy** — verify that no client image bytes leave the node when local-only mode is on
   (network-level assertion in CI, not just a code review).

### 9.2 Quality metric thresholds (starting points, tune with data)

| Metric | Warn | Fail |
|---|---|---|
| Seam boundary gradient error vs interior | > 1.5% | > 3% |
| Structure preservation (SSIM vs original, outside seam band) | < 0.97 | < 0.93 |
| Albedo mean luminance | < 0.15 or > 0.75 | < 0.10 or > 0.85 |
| Clipped albedo pixels (0 or 255) | > 0.5% | > 2% |
| Normal blue channel mean | < 0.6 | < 0.5 |
| Roughness histogram std-dev | < 0.02 (flat) | exactly 0 (a single value) |
| Repetition score (autocorrelation peak) at 8× tiling | warn | fail |
| Map alignment offset | > 0.5 px | > 1 px |

### 9.3 Human validation

- Blind A/B vs (a) an artist doing it manually, (b) Substance 3D Sampler, (c) Materialize,
  (d) PixPlant. Rate on: seam invisibility, albedo plausibility, relief believability, roughness
  believability, "would you ship this".
- Target: **≥ 80% of textures rated "ship as-is" with defaults; ≥ 95% after one manual seam-brush
  pass.** Below that, the product is a tool that saves typing, not time.
- Beta cohort of 20–50 archviz artists, instrumented (opt-in), with a weekly review of every
  failure case they hit.

---

## 10. Roadmap

Assumes a team of 4 (1 backend/imaging, 1 frontend, 1 ML, 1 tech-artist/QA) plus part-time
devops and design.

### Phase 0 — De-risk (2–3 weeks)

- Curate the benchmark texture set (200+ images, human-labelled).
- Spike three seam approaches (Poisson/healing, lattice crop, diffusion inpaint) and **measure**
  them against the benchmark. Publish an internal scorecard.
- Decide the AI hosting story (own GPU vs serverless GPU vs API) and cost per job.
- Talk to 15 archviz artists; watch them work. Confirm the Enscape/V-Ray preset priority order.

**Exit criteria:** a measured comparison table; go/no-go on diffusion seams; final scope for MVP.

### Phase 1 — MVP (8–10 weeks)

- Ingest, preprocess, lattice detection, Poisson/mirror/healing seamless, seam metric, seam brush.
- De-light (classical), height, normal, AO, roughness, metallic (heuristic + classifier).
- Live WebGPU preview with tiling and normal-flip.
- Export packs for **V-Ray, Corona, Enscape, Unreal, Unity, Blender, glTF** with filename templates
  and sidecar JSON. QC report card.
- Accounts, projects, versions, ZIP export. **No AI except classification.**

**Exit criteria:** 3 beta studios produce a real project's materials with it and ship renders.
Default-pipeline median time under 30 s at 4k. ≥ 70% of benchmark textures pass QC unedited.

### Phase 2 — Product (8–12 weeks)

- AI seam refinement, tiling-aware super-resolution, semantic matting.
- Batch queue, watch-folder agent, REST API + webhooks, CLI.
- Library with search/similarity, batch QC dashboard, preset sharing.
- Presets for Lumion, Twinmotion, D5, Arnold, Redshift, Octane, USD.
- Macro/micro variation generator, detail-map split, repeatability-breakup tools.
- **On-prem Docker deploy + offline licensing.** (Do this before enterprise sales, not after.)

**Exit criteria:** a studio can run the whole pipeline unattended; API used by ≥ 2 pipeline TDs;
on-prem install in ≤ 30 minutes.

### Phase 3 — Depth & moat (8–12 weeks)

- Photo → full PBR (intrinsic decomposition) with confidence UI.
- Wang tile / variant-atlas generation + shader snippets.
- Native writers: `.vrmat`/`.vrscene`, `.matpkg`, MaxScript, Unreal Python, Unity editor scripts,
  Blender addon, Photoshop UXP panel.
- Team collaboration: comments, approvals, roles, SSO/SAML, audit log.
- MaterialX/OpenPBR export; publishing tools for marketplace sellers.

### Phase 4 — Ecosystem (ongoing)

- Prompt-to-texture and variation families; defect/watermark removal; animated texture seams.
- Perforce/ShotGrid/ftrack integration; local desktop app (Tauri); plugin SDK.
- Mobile review app (approve materials on site); AR preview for client meetings.
- Marketplace of presets/recipes; API monetisation.

### Indicative effort & cost (rough, verify against your market)

| Line item | Estimate |
|---|---|
| Phase 0 | 2–3 weeks, ~$0 if it's you + a designer |
| Phase 1 | 8–10 weeks × 4 people |
| Phase 2 | 8–12 weeks × 4 people |
| Phase 3 | 8–12 weeks × 5 people |
| Cloud GPU | $0.35–1.20 / GPU-hour (L4/T4 to A10/L40S class). A 4k job ≈ 10–25 GPU-seconds ≈ **$0.002–0.01** in compute; AI super-res/inpaint ≈ 20–60 s ⇒ **$0.01–0.05**. Price AI as credits. |
| Storage | Negligible per asset; egress is the sneaky cost (a 4k 5-map pack ≈ 100–400 MB). Keep output local when possible. |
| On-prem target hardware | RTX 4070/4080-class workstation, 32 GB RAM, 16 GB VRAM → sweet spot for studios. |

**Cost insight:** the classical pipeline is basically free to run. Only AI features carry real
marginal cost, so gate them behind credits and always offer the free deterministic path — that
keeps gross margin healthy and keeps the price honest.

---

## 11. Drawbacks, limitations and risks (full disclosure)

### 11.1 Fundamental (cannot be engineered away)

1. **Information theory.** A single photograph does not contain enough information to uniquely
   determine albedo, roughness and metallic. Any tool that claims otherwise is guessing. Your
   product's honesty about this is a competitive advantage with professionals.
2. **Non-periodic content cannot be made periodic without change.** Marble slabs, murals, rendered
   facades, handwritten signage — the correct answer is often "don't tile this; use a random offset
   or a 2-tile atlas instead". Build that escape hatch.
3. **Every method has a signature.** Mirroring shows symmetry lines. Blending softens. Quilting shows
   patch edges. Spectral methods look mushy. Diffusion invents. Your job is picking the one whose
   signature is least visible for *this* texture, and telling the artist which one you picked.
4. **Repetition is inevitable past a certain tiling count.** 12× any tile reads as a pattern. Selling
   variation tools is the honest answer, not "better seams".

### 11.2 Technical drawbacks

| Drawback | Impact | Mitigation |
|---|---|---|
| Diffusion hallucinates structure | Visible wrong grout/brick; worst on man-made patterns | Prefer lattice detection for those classes; structure-integrity QC gate; restrict AI to low frequency |
| De-lighting over-flattens → plastic look | Artists reject results | Strength slider defaulting to ~0.7, "preserve micro-shading" parameter, before/after |
| Specular removal destroys real detail | Wet/glazed surfaces lose their story | Mask-based, confidence-gated; keep the specular map as a separate asset |
| Density mismatch | Baked-in shadows or over-bright albedo → inconsistent lighting across the scene | A "match to scene exposure" tool + albedo energy QC + reference values table (Appendix B) |
| Map misalignment | Bevel/edge artefacts; the #1 "why does this look wrong" bug | Single authoritative height field, shared warp field, alignment regression test |
| Tiling-safe resize regressions | Seams reappear on any resize | Circular convolution in every resample path + property test |
| Antialiasing on normals | Aliasing/shimmer in realtime | Mip generation rules, BC5 for normals, and never resize 8-bit normals without renormalising |
| 8-bit banding in normals/roughness | Terracing in specular | 16-bit where the renderer supports it; dithering; document the 8-bit trade-off |
| Over-sharpening from JPEG's aggressive neighbour | Ringing, halos, crunchy texture | Artifact suppression masked to low-detail regions; prefer high-quality source formats |
| Large-file UX | 8k uploads over a domestic link take minutes | Local agent, resumable/chunked uploads, process-from-local-path mode, local-only mode |
| VRAM exhaustion | Job failures under load | Per-model VRAM guards, job queues per GPU class, always-present CPU fallback |
| Nonlinear spatial transforms (perspective rectification) | Resampling blurs detail and can break tiling | Do rectification *before* seam fixing; use high-quality resampling; re-derive detail after |
| Anisotropic textures (brushed metal, wood grain, weaves) | Generic tiling destroys directionality | Direction detection with an explicit "preserve direction" mode |
| Alpha/premultiply errors | Dark fringes on foliage | Straight-vs-premultiplied handling, edge de-fringe pass, dedicated foliage preset |
| UDIM / very large materials | Tool can't handle beyond 8k in v1 | Explicitly documented limit, UDIM/sequence support in P2 |

### 11.3 Product, market and business risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| **Commoditisation** — the algorithms are published; someone clones the classical path in a weekend | High | Med | Moat = renderer-native exports + QC metrics + batch/API + local deploy + the benchmark dataset. Never compete on "we have a Poisson blend". |
| **Adobe / Substance** bundles Sampler deeper into Creative Cloud | High | High | Aim at the on-prem, offline, API-first, pipeline-automation buyer Adobe ignores. Support MaterialX/OpenPBR and non-Adobe flows loudly. |
| **Incumbent free/open tools** (Materialize, Material Maker (GPL), TextureLab, Blender addons, PixPlant) | High | Med | Out-feature them on batch, API, renderer presets, QC and team features — the things hobby tools don't build. |
| **AI-native competitor at $0** (a fine-tuned open model + a nice UI) | Med | High | Own the workflow: reproducibility, QC, renderer correctness, dataset, and the seam *problem* rather than the model. |
| Price pressure (Substance $20–50/mo, Sampler included) | High | High | Value-based tiers: realtime/compression + batch + API for pros; free tier for the hook; per-seat and per-GPU-second for AI. |
| Artist distrust of automation | High | Med | Non-destructive, before/after everywhere, manual override always available, do not market it as "no artist needed" (that insults the buyer) |
| Support surface explosion (renderer × version × OS × GPU driver) | High | Med | The automated render-test matrix; explicit "verified on" list; a hard rule that unverified presets are marked "community" not "verified" |
| Legal: processing third-party textures (marketplace EULAs, derivative works), plus AI model licences and output ownership | Med | High | Per-model licence register; rights metadata on every asset; a "you must have the rights to this image" acknowledgement; never auto-remove watermarks; legal review before marketplace publishing features |
| Privacy/IP objections from studios | High | High | Local/offline mode as a first-class product, not a checkbox; no training on customer data; DPA; region pinning; air-gapped support |
| GPL contamination in a distributed binary (FFmpeg, some codecs, Material Maker's code) | Med | High | Licence audit in CI; keep LGPL libvips as a separate process/dynamic link; never copy GPL code; avoid GPL-only codecs in shipped builds |
| Cost overruns on unlimited AI | Med | Med | Credits, quotas, per-job GPU budget, autoscale-to-zero, cheaper fallbacks |
| Team's domain gap (ML people who don't know archviz, artist who doesn't know CUDA) | High | Med | Hire one genuinely good tech-artist early; they define the QC bar and find the bugs your tests miss |
| Churn after the first 20 textures | Med | High | The library, batch and pipeline integrations are what create retention — build them by Phase 2, not Phase 4 |
| Determinism complaints from studios | Med | High | Deterministic mode default-on for exports; a visible pipeline hash in the sidecar JSON |

### 11.4 What will slip (plan for it)

- The AI seam module, always. Budget 1.5× and keep it behind a feature flag.
- The renderer preset matrix — each new renderer version is a support event. Start with 7 verified
  presets, not 15 unverified ones.
- Displacement and physical scale — deceptively fiddly, needs a real technical artist.
- Alpha/matting for foliage — 3D hair/leaf edges are harder than they look.

---

## 12. Success metrics

**North star:** textures shipped to a renderer-ready state without manual map editing.

| Metric | Target |
|---|---|
| Time from upload to export (4k, defaults) | < 30 s |
| Time to first successful tile (first-time user) | < 90 s |
| Benchmark textures passing QC unedited | ≥ 70% (Phase 1), ≥ 85% (Phase 2) |
| Blind A/B preference vs manual artist work | ≥ 50% (parity acceptable), 65% with AI |
| Seam failure rate reported by users | < 2% of jobs |
| Export format distribution | Tracks roadmap priority — a signal, not a vanity metric |
| Week-4 retention of paying users | ≥ 60% |
| Free → paid conversion | ≥ 5% |
| GPU cost per AI job | < 25% of the job's revenue |
| On-prem install success (first attempt) | ≥ 90% |

---

## 13. Immediate next steps (this week)

1. **Write the seam-chooser spike.** Take 30 textures, implement lattice-crop + healing/Poisson +
   spectral, and score each. If lattice detection wins as often as I expect on man-made patterns,
   it's the flagship feature — build the UI around it.
2. **Build the benchmark set** (start with 100; grow to 500). Everything downstream depends on it.
3. **Do one end-to-end hand test:** photo → seamless → height → normal → roughness → V-Ray/Corona
   render + Enscape render. Ship a static HTML "before/after" page to artists for reaction.
4. **Set up one headless render test** (Blender is the cheapest to automate). Prove the CI approach
   works before building 7 presets.
5. **Interview 15 archviz artists** about the cost of their current texture workflow, in minutes per
   texture. That number is your pricing anchor and your marketing claim.

---

## Appendix A — Map specification table

| Map | Type | Colour space | Bit depth | Needs tiling | Notes |
|---|---|---|---|---|---|
| Albedo / Base Colour | Colour | sRGB | 8 (16 for HDR work) | Yes | Never below 0.04 luminance; keep mean 0.18–0.70 |
| Height / Displacement | Data | Linear | 16 (EXR for V-Ray/Arnold) | Yes | Record amplitude in **mm** + mid-level |
| Normal | Data | Linear, Non-Color | 8 realtime / 16 for offline | Yes | Tangent-space; renormalise after any resize; orientation flag |
| Roughness | Data | Linear | 8–16 | Yes | Clamp 0.05–0.95; avoid flat |
| Glossiness (legacy) | Data | Linear | 8–16 | Yes | = 1 − Roughness (with remap) |
| Metallic | Data | Linear | 8 | Yes | Near-binary; disclose if guessed |
| AO / Cavity | Data | Linear | 8–16 | Yes | Keep subtle; optional per renderer |
| Opacity / Alpha | Data | Linear | 8 (16 for mattes) | Yes | Straight vs premultiplied — check per renderer |
| Emissive | Colour | sRGB | 8–16 | Yes | Often an HDR value in the material, not the map |
| Curvature / Edge / Wear | Data | Linear | 8–16 | Yes | Drives smart-material looks |
| Detail / Micro (normal+rough) | Data | Linear | 8 | N/A (repeats separately) | 1/4 to 1/8 scale of the material, for close-ups |
| Macro variation | Data | Linear | 8 | No (single, non-tiling) | Blended at low opacity across the surface |

## Appendix B — Physical reference values (starter table)

| Material | Albedo (approx sRGB) | Roughness | Metallic | IOR |
|---|---|---|---|---|
| Asphalt (new / worn) | 0.12 / 0.20 | 0.85 / 0.95 | 0 | 1.52 |
| Concrete (clean / weathered) | 0.35 / 0.45 | 0.75 / 0.9 | 0 | 1.5 |
| Plaster (white / painted) | 0.75 / 0.5 | 0.8 / 0.5 | 0 | 1.5 |
| Brick (red / buff) | 0.25 / 0.4 | 0.85 / 0.8 | 0 | 1.52 |
| Marble (polished / honed) | 0.75 / 0.7 | 0.1 / 0.5 | 0 | 1.55–1.6 |
| Ceramic tile (glazed) | 0.6 | 0.08–0.25 | 0 | 1.55 |
| Terracotta | 0.35 | 0.7 | 0 | 1.5 |
| Oak (sealed / raw) | 0.35 / 0.45 | 0.3 / 0.7 | 0 | 1.5 / 1.4 |
| Walnut (sealed) | 0.2 | 0.35 | 0 | 1.5 |
| Steel (polished / brushed) | 0.55 / 0.5 | 0.05–0.15 / 0.3–0.5 | 1 | — |
| Aluminium (brushed / anodised) | 0.9 / 0.75 | 0.3–0.5 / 0.4 | 1 / 0 (anodised is dielectric) | — |
| Copper / brass (clean) | 0.95 (tinted) | 0.1–0.3 | 1 | — |
| Gold | 1.0 (tinted) | 0.05–0.3 | 1 | — |
| Rubber | 0.05–0.1 | 0.85–0.95 | 0 | 1.5 |
| Leather (matte / polished) | 0.15 / 0.2 | 0.6 / 0.35 | 0 | 1.5 |
| Cotton fabric | 0.6 | 0.9 | 0 | 1.5 |
| Velvet | 0.05–0.35 | 0.9 (+sheen) | 0 | 1.5 |
| Grass (living / dry) | 0.2 / 0.4 | 0.9 | 0 | 1.5 |
| Snow (fresh) | 0.85–0.95 | 0.5–0.8 | 0 | 1.3 |
| Water/ice | — | 0.02–0.1 | 0 | 1.33 |
| Window glass | — | 0.02 | 0 | 1.52 |
| Car paint | 0.3–0.6 | 0.1 (clearcoat) | 1 (flake layer) | 1.5 + coat 1.5 |

*Ship this as a picker that sets sane ranges and as an explicit warning when the user's albedo is
outside the plausible range for the declared category. Air and impossible albedo are the two things
that make archviz renders look "CG".*

## Appendix C — Naming & export templates

```
{tokens}: {project} {material} {map} {res} {version} {renderer} {date} {category} {scale}
Default:  {material}_{map}_{res}_v{version}
Unreal:   T_{material}_{map}            (T_ prefix convention)
Unity:    {material}_{map}              + folder per material
V-Ray/Corona: {material}_{map}_{res}    + sidecar .json
glTF/USD: {material}_{map}              (spec-conventional lowercase)
Example:  hotel_lobby_marble_albedo_4k_v003.png
```

## Appendix D — Preset schema (JSON, abridged)

```json
{
  "name": "vray-6",
  "target_renderer": "vray",
  "renderer_versions_tested": ["6.2", "7.0"],
  "verified": true,
  "maps": [
    { "key": "albedo",  "file": "{material}_albedo_{res}.png",   "colours": "srgb",   "bit": 8,  "renderer_slot": "diffuseColor" },
    { "key": "normal",  "file": "{material}_normal_{res}.png",   "colours": "linear", "bit": 16, "renderer_slot": "bump", "orientation": "opengl" },
    { "key": "roughness","file":"{material}_roughness_{res}.png","colours": "linear", "bit": 16, "renderer_slot": "roughness" },
    { "key": "metallic","file": "{material}_metallic_{res}.png", "colours": "linear", "bit": 8,  "renderer_slot": "metalness" },
    { "key": "height",  "file": "{material}_height_{res}.exr",   "colours": "linear", "bit": 16, "renderer_slot": "displacement", "unit": "mm" }
  ],
  "material_defaults": { "ior": 1.52, "glossiness_mode": "roughness", "displacement_mode": "2d" },
  "notes": ["Set Bitmap gamma to Override 1.0 on all data maps.",
            "Use VRayTriplanar if the surface is curved or UVs are inconsistent."],
  "validator": "vray-6.2-headless-plane-test"
}
```

## Appendix E — Competitive teardown (abridged)

| Tool | Strengths | Weaknesses we exploit |
|---|---|---|
| **Substance 3D Sampler** (Adobe) | Excellent algorithms, ecosystem, brand | Cloud/CC account coupling; expensive; weak on-prem story; clunky for "just make this tile"; no batch/QC-first workflow for studios |
| **Substance Designer** | Ultimate procedural power | Enormous learning curve; overkill for "tile this photo" |
| **Materialize** (free, open) | Great manual control, free | Manual, no batch, no API, dated UX, no renderer packages |
| **PixPlant** | Fast, cheap, decent tiling | Limited PBR depth, no AI, no pipeline |
| **Material Maker** (GPL, free) | Powerful, procedural | GPL, node-graph learning curve, no automation |
| **Quixel Mixer / Bridge** | Huge free library, UE integration | Library-first, not "my client's photo"; weakened by Epic layoffs and roadmap drift; primarily game-oriented |
| **AI photo→PBR websites** | Fast, impressive demos | No QC, no reproducibility, no renderer correctness, no local/offline, weak on man-made patterns, subscription-only, questionable licences |
| **Manual workflow** (Photoshop offset + Materialize + hand-built maps) | Full artistic control | 30–120 minutes per texture; inconsistent; the actual thing we're replacing |

**Positioning statement:** *the professional, reproducible, renderer-native pipeline for turning
real-world photos into render-ready PBR materials — on your machine if you want, in your pipeline
if you need it, with numbers that prove it's correct.*

## Appendix F — Glossary

**Albedo** colour with lighting removed · **AO** ambient occlusion · **Bump vs displacement** surface
perturbation in shading only vs real geometry movement · **Cavity** concavity map derived from height ·
**Colour space** how numeric values map to light intensity (data maps must *not* be gamma-encoded) ·
**DirectX/OpenGL normals** green-channel orientation conventions (−Y vs +Y) · **Energy conservation**
a surface must not reflect more light than it receives (hence albedo ceilings) · **HDRI** high-dynamic-range
environment image used for lighting · **HBAO/SSAO** screen-space ambient occlusion techniques ·
**IOR** index of refraction (~1.5 for most dielectrics) · **KTX2/BCn/ASTC** GPU texture compression formats ·
**Mask Map** Unity HDRP's packed map (R=metal, G=AO, B=detail, A=smoothness) · **Metal/rough workflow**
the modern PBR parameterisation vs the older specular/glossiness workflow · **OpenPBR** the ASF's unified
surface shading model (successor to ad-hoc material models; expressed in MaterialX) · **ORM** Unreal's
packed map (R=AO, G=roughness, B=metallic) · **Poisson/Laplacian blending** seamless gradient-domain image
merging · **PPT** power-of-two texture dimensions · **Quilting** patch-based texture synthesis with
graph-cut seams · **Retinex** illumination/albedo separation by multi-scale filtering · **Specular/gloss**
legacy PBR parameterisation (roughness = 1 − glossiness, loosely) · **Texel density** texture pixels per
real-world unit · **Tick/UDIM** UV tile conventions for very large textures · **Wang tiles** a finite set of
edge-matched tiles that assemble without visible repetition · **Wrap/wrap-around** the edge of the image
treating the opposite edge as its neighbour.

## Appendix G — References worth reading/build-on

- Texture synthesis / tiling: Efros & Freeman, *Image Quilting* (2001); Kwatra et al., *Graphcut Textures*
  (2003); Kang et al., *PatchMatch-based randomized tiling* (2008); Barnes et al., *PatchMatch* (2009);
  generating Gaussian/Markov random fields (GPNN).
- Illumination & intrinsic decomposition: Retinex (Land & McCann); guided filter (He et al.);
  L0 smoothing (Xu et al.); "Intrinsic decomposition" literature; PBR-Net-style photo→PBR.
- Monocular geometry: Marigold (diffusion-based normals), DSINE, Depth Anything V2, Metric3D — used only
  for macro form.
- Material capture: *Materialistic* (SVBRDF from a phone photo), MaterialGAN, StableMaterials.
- Seamless diffusion: SDXL/FLUX-class inpainting with circular padding and tile-consistent inference;
  as a technique, "tile-aware" generation is now standard practice — the hard part is the constraint set,
  not the model.
- Specs to conform to: glTF 2.0 material spec; USD `UsdPreviewSurface`; **MaterialX / OpenPBR Surface 1.0**;
  Unreal texture conventions; Unity HDRP Mask Map; Substance presets (as a UX reference only).
- Renderer documentation: V-Ray (VRayMtl, VRayDisplacementMod, VRayTriplanar), Corona (CoronaMtl,
  CoronaDisplacementMod), Enscape (material editor + `.matpkg`), Lumion/Twinmotion/D5 material refs.

---

*One document, complete: scope, algorithms, architecture, renderer cookbook, AI features and their
honest limits, drawbacks, testing, roadmap, pricing, risks and appendices. Update the Assumptions
block at the top first if any of them are wrong — several roadmap decisions depend on it.*
