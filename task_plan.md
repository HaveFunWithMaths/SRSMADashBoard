# 📋 Task Plan — SRSMA Student Dashboard

## Protocol 0: Initialization
- [x] Create project memory files
- [x] Inspect Excel schema (Maths.xlsx, Physics.xlsx, LoginData.xlsx)
- [x] Inspect branding assets (SRSMALogo.jpeg)
- [x] Research tech stack
- [x] Write implementation plan
- [/] Get user approval on implementation plan
- [ ] Define finalized JSON Data Schema in `gemini.md`

## Phase 1: B — Blueprint
- [x] Finalize tech stack decision
- [ ] Scaffold project (Next.js + TypeScript)
- [ ] Set up project structure per A.N.T. 3-layer architecture

## Phase 2: L — Link (Connectivity)
- [ ] Build Excel parser (`src/lib/parser.ts`)
- [ ] Build data sync pipeline
- [ ] Test handshake with file-based data source

## Phase 3: A — Architect (3-Layer Build)
- [ ] Layer 1: Write Architecture SOPs
- [ ] Build Calculation Engine (percentages, ranks, aggregates)
- [ ] Build Authentication (NextAuth + bcrypt)
- [ ] Build Parent Dashboard (charts + table)
- [ ] Build Teacher View
- [ ] Build Admin Panel

## Phase 4: S — Stylize
- [ ] Apply SRSMA branding (logo, colors, typography)
- [ ] Responsive mobile layout
- [ ] Heatmap + zebra table styling
- [ ] Polish charts & interactions

## Phase 5: T — Trigger (Deployment)
- [ ] Cloud deployment (Vercel)
- [ ] Documentation & maintenance log
