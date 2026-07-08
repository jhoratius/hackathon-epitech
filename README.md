# ProMotion

ProMotion is a web application developed during the Epitech Hackathon. Built with Next.js, it features an integrated AI chat interface designed to manage autonomous conversational agents.

## Table of Contents

- [Project Overview](#project-overview)
- [Tech Stack](#tech-stack)
- [Repository Structure](#repository-structure)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)

## Project Overview

ProMotion provides a streamlined frontend interface and a dedicated backend API for handling AI interactions. The project relies on specific agent instructions to guide the conversational flows.

## Tech Stack

- **Framework**: Next.js (App Router)
- **Languages**: TypeScript, JavaScript
- **Styling**: Tailwind CSS via PostCSS
- **Linting**: ESLint

## Repository Structure

The core source code is located in the `pro-motion` directory:

- `app/api/chat/route.js`: Backend API endpoint handling the AI agent chat logic.
- `app/page.tsx` & `app/layout.tsx`: Main frontend React components and layouts.
- `app/globals.css`: Global stylesheet containing Tailwind directives.
- `AGENTS.md` & `CLAUDE.md`: Documentation and configuration guidelines for the AI agents.
- `public/`: Contains static assets like the ProMotion logo and icons.

## Getting Started

Follow these steps to run the ProMotion application locally.

### Prerequisites

- Node.js
- npm (Node Package Manager)

### Installation

1. Clone the repository:
   ```bash
   git clone [https://github.com/jhoratius/hackathon-epitech.git](https://github.com/jhoratius/hackathon-epitech.git)
   cd hackathon-epitech/pro-motion

2. Install the project dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```
4. Open your browser and navigate to http://localhost:3000 to interact with the application.
