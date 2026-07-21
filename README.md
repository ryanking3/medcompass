# MedCompass

MedCompass is an AI-powered study workspace for medical students. It helps students work from their permitted textbooks, lecture PDFs, and learning objectives to create grounded notes, revision material, and Anki-compatible flashcards.

## Project documentation

- [Product specification](docs/PRODUCT_SPECIFICATION.md)
- [v0.1 implementation plan](docs/V0_1_IMPLEMENTATION_PLAN.md)

## v0.1 focus

Upload a textbook chapter or lecture PDF, read it, ask source-cited questions, save notes, and generate editable Anki cards.

## Status

Static UI prototype complete. Authentication, private uploads, and AI retrieval are intentionally not connected yet.

## Run locally

```sh
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to explore the dashboard, textbook reader, cited-tutor interface, and card-review flow using local sample data.
