# AI Reel Maker

## Overview

AI Reel Maker is a React web application for creating short-form vertical video reels. Users describe a story idea, generate editable scenes with AI-assisted narration, produce images and text-to-speech audio per scene, optionally translate narration, assemble a final MP4 in the browser with FFmpeg WebAssembly, and generate YouTube publishing metadata and thumbnails.

The repository includes a landing page and a studio workspace. Server-side AI provider calls run through Vercel serverless API routes so API keys stay on the server.

## Core Capabilities

- AI-assisted scene generation from a movie idea
- Image generation with configurable provider/model support
- Text-to-speech narration generation
- Narration translation
- Editable scene workflow with anchor reference images
- Subtitle generation and burned-in captions during assembly
- Browser-side FFmpeg assembly into a vertical MP4
- YouTube title, description, and thumbnail generation
- Assistant/chat workflow for script and publishing tasks
- Provider availability detection for OpenAI, Gemini, and ElevenLabs

## Architecture

- **React frontend (`src/`)** — landing page, studio UI, client services, and browser-side media assembly
- **Vercel serverless API routes (`api/`)** — provider integrations for generation, translation, chat, and metadata
- **Provider helper modules (`api/_lib/`)** — shared server-side logic for Gemini, OpenAI, ElevenLabs, validation, and prompts
- **Browser-side FFmpeg pipeline (`src/services/ffmpegService.js`)** — loads FFmpeg WebAssembly, builds per-scene clips with subtitles, and concatenates the final MP4
- **Python repository validation layer (`scripts/validate_project.py`)** — read-only audits of repository structure, imports, API routes, environment-variable usage, FFmpeg invariants, and asset references

Python validates the repository and pipeline configuration. Python does not run the production web application.

## Technologies

- JavaScript
- React
- CSS
- HTML
- Python
- Vercel
- FFmpeg WebAssembly
- Tailwind CSS
- CRACO

## Run Locally

Install dependencies:

```bash
npm install
```

Start the React development server:

```bash
npm start
```

Run the full local stack with Vercel dev and API routes:

```bash
npm run dev
```

Build for production:

```bash
npm run build
```

Run React tests:

```bash
npm test -- --watchAll=false
```

## Validation

Run the repository validator:

```bash
python scripts/validate_project.py
```

Verbose output:

```bash
python scripts/validate_project.py --verbose
```

JSON output:

```bash
python scripts/validate_project.py --json
```

Run Python unit tests:

```bash
python -m unittest discover -s tests -p "test_*.py"
```

Windows alternatives:

```powershell
py scripts/validate_project.py
py -m unittest discover -s tests -p "test_*.py"
```

## Environment Variables

Configure server-side provider credentials locally or in Vercel project settings. Do not commit real key values.

| Variable | Purpose |
| --- | --- |
| `GEMINI_API_KEY` | Google Gemini text, image, and chat generation |
| `OPENAI_API_KEY` | OpenAI chat, image, and text generation |
| `ELEVENLABS_API_KEY` | ElevenLabs text-to-speech voices |
| `OPENAI_MODEL` | Optional OpenAI chat model override (defaults to `gpt-4o`) |

Copy `.env.example` to `.env.local` for local development with `vercel dev`.

## Deployment

The project is configured for Vercel:

- Frontend build output: `build/`
- Build command: `npm run build`
- API routes: files under `api/`
- SPA routing: `vercel.json` rewrites non-static requests to `index.html`

Set the environment variables above in the Vercel project. No provider API keys are required in the browser bundle.

## Project Validation Scope

The Python validator checks:

- repository structure and critical entry files
- `package.json` scripts and dependencies
- local JavaScript import resolution under `src/`
- Vercel API route structure and helper imports
- environment-variable references and client/server boundaries
- FFmpeg pipeline invariants in `ffmpegService.js`
- local asset references in HTML, CSS, and JavaScript
- source integrity issues such as merge markers and malformed JSON

Warnings do not fail the validator. Failures exit with a non-zero status code.
