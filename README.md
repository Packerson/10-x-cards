# 10x-cards

[![version](https://img.shields.io/badge/version-0.0.1-blue.svg)](./package.json)
[![node](https://img.shields.io/badge/node-22.14.0-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![astro](https://img.shields.io/badge/Astro-5-FF5D01?logo=astro&logoColor=white)](https://astro.build/)
[![react](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![typescript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![tailwind](https://img.shields.io/badge/TailwindCSS-4-38B2AC?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![status](https://img.shields.io/badge/status-WIP-yellow.svg)](#project-status)
[![license](https://img.shields.io/badge/license-TBD-lightgrey.svg)](#license)

## Table of Contents

- [Project description](#project-description)
- [Tech stack](#tech-stack)
- [Getting started locally](#getting-started-locally)
- [Available scripts](#available-scripts)
- [Project scope](#project-scope)
- [Project status](#project-status)
- [License](#license)

## Project description

10x-cards helps learners quickly create and manage high‑quality flashcard sets. The app leverages Large Language Models (via API) to propose flashcards from user-provided text, so users spend less time crafting questions and answers and more time learning (spaced repetition).

Key goals:
- Speed up flashcard creation with AI suggestions
- Keep a simple workflow for manual creation and editing
- Prepare for spaced repetition learning sessions using an existing, battle‑tested algorithm

## Tech stack

- Frontend
  - Astro 5 (app shell, routing, build)
  - React 19 (interactive components)
  - TypeScript 5
  - Tailwind CSS 4, shadcn/ui (Radix-based UI primitives), Radix UI Slot
  - Utility libraries: clsx, class-variance-authority, tailwind-merge, lucide-react, tw-animate-css
- Backend (planned)
  - Supabase (PostgreSQL, Auth, SDK) as the Backend‑as‑a‑Service
- AI (planned)
  - OpenRouter for unified access to multiple LLM providers (OpenAI, Anthropic, Google, etc.)
- Tooling
  - ESLint 9, Prettier, Husky + lint-staged
- CI/CD & Hosting (planned)
  - GitHub Actions for CI/CD
  - DigitalOcean for hosting (Docker image)

See also:
- Product Requirements (PRD): [.ai/prd.md](.ai/prd.md)
- Tech Stack notes: [.ai/tech-stack.md](.ai/tech-stack.md)

## Getting started locally

### Prerequisites
- Node.js 22.14.0 (see `.nvmrc`)
- npm (comes with Node)

Recommended:
- `nvm` to match the exact Node version

### Setup

```bash
# 1) Clone the repository
git clone https://github.com/Packerson/10-x-cards
cd 10-x-cards

# 2) Use the right Node version
nvm use

# 3) Install dependencies (uses package-lock)
npm ci
```

### Run the app

```bash
# Start the dev server
npm run dev
# Astro dev server defaults to http://localhost:3000
```

### Build and preview

```bash
# Production build
npm run build

# Preview the production build locally
npm run preview
# Opens on http://localhost:3000 by default
```

### Editor & formatting
- ESLint and Prettier are configured. You can auto‑fix many issues via:

```bash
npm run lint:fix
npm run format
```

### Future configuration (coming with integrations)
When Supabase and OpenRouter integrations are added, you will likely need environment variables such as:
- `SUPABASE_URL`, `SUPABASE_ANON_KEY`
- `OPENROUTER_API_KEY`

These are not required for the current starter and will be documented when the integrations land.

## Available scripts

```text
npm run dev       # Start the Astro dev server
npm run build     # Build for production
npm run preview   # Preview the production build
npm run astro     # Run arbitrary Astro CLI commands
npm run lint      # Lint all files
npm run lint:fix  # Lint and auto-fix
npm run format    # Prettier format
```

## Project scope

### In scope (MVP)
- Automatic flashcard generation from pasted text via LLM API (user reviews/edits/accepts)
- Manual flashcard CRUD (create, edit, delete) and “My flashcards” list
- Basic auth (sign up, sign in, delete account and associated data)
- Integration with a known spaced‑repetition algorithm/library
- Secure, scalable storage for users and flashcards
- Generation stats (how many proposed vs. accepted by users)
- GDPR compliance: data access and deletion on request

### Out of scope (for MVP)
- Custom/advanced spaced repetition algorithm (will use existing open‑source implementation)
- Gamification
- Mobile apps (web only)
- Multi‑format document import (PDF, DOCX, etc.)
- Public API
- Flashcard sharing/collaboration
- Advanced notifications
- Advanced keyword search

## Project status

- Status: Work‑in‑progress (starter scaffold in place; features to be implemented per PRD)
- Current repo contains Astro + React + Tailwind setup and base tooling
- Upcoming milestones:
  - Supabase auth and data model
  - AI generation via OpenRouter
  - Learning session using a spaced‑repetition algorithm

References:
- PRD: [.ai/prd.md](.ai/prd.md)
- Tech stack: [.ai/tech-stack.md](.ai/tech-stack.md)

## License

TBD. No license has been chosen yet. Until a license is added, all rights are reserved by the repository owner.


