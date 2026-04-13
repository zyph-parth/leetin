# LeetInsight

LeetInsight is a Next.js app that turns a public LeetCode profile into an interview-prep dashboard.

Instead of only showing solved counts, it tries to answer higher-value questions:

- How ready is this profile for interviews?
- Which topics are actually weak right now?
- Which company patterns are still missing?
- What should the next few problems be?
- What has likely decayed in memory and should be reviewed again?

The app combines live profile data from LeetCode with browser-side analytics, a spaced repetition system (SRS), and a small mock interview generator.

## What It Does

After entering a LeetCode username, the app fetches profile data and renders a personalized dashboard with:

- A profile header with avatar, rank, solve counts, and streak data
- A solver personality label such as `The Architect`, `The Grinder`, or `The Sprinter`
- An interview readiness score out of 100
- Topic coverage and weak-area analysis
- Company-readiness estimates for `Google`, `Meta`, `Amazon`, and `Microsoft`
- Recommended next problems from an in-repo curated catalog
- Topic deep dives with readiness, retention, and follow-up suggestions
- A 12-week solve velocity chart
- Burnout-risk and consistency indicators
- A submission heatmap for the last year
- A local SRS queue for reviewing previously solved problems
- Forgetting-curve and memory-health views
- A virtual mock interview with timer, progress tracking, and persisted session state
- Import/export of SRS progress as JSON backups

## Core Features

### 1. Live LeetCode profile fetch

The API route at `app/api/profile/route.ts` calls `lib/leetcode.ts`, which makes a single GraphQL request to `https://leetcode.com/graphql`.

That request pulls:

- Basic profile info
- Solve counts by difficulty
- Submission calendar and streak info
- Recent submissions
- Tag statistics
- Contest ranking
- Badges
- Language usage

This means the dashboard is generated from live public LeetCode data at request time, not from a local seed file or manual export.

### 2. Interview-readiness dashboard

The main dashboard lives in `components/Dashboard.tsx` and is powered by `lib/analytics.ts`.

It computes:

- A readiness score
- A verdict label such as `Interview Ready`, `Almost There`, `On Track`, or `Keep Building`
- Gaps still holding the user back
- Company fit and missing topics
- Topic diversity and difficulty distribution
- Progression and consistency signals

### 3. Personalized problem recommendations

The project ships with a curated problem catalog in `lib/analytics.ts`.

Recommendations are ranked using a mix of:

- Low practice coverage in a topic
- Weak-topic detection
- Low SRS retention
- Target company fit
- Difficulty balancing
- Topic relevance to the selected company

This is not a full LeetCode search engine. It is a focused, heuristic recommendation layer built into the app.

### 4. Spaced repetition for solved problems

The SRS system is implemented in:

- `lib/srs.ts`
- `lib/srs-store.ts`
- `components/SRSPanel.tsx`
- `components/ReviewCard.tsx`
- `components/ForgetCurve.tsx`

Key ideas:

- Accepted recent submissions are converted into tracked review items
- New review items are seeded differently for `Easy`, `Medium`, and `Hard`
- Reviews update interval and ease factor using an SM-2 style algorithm
- Memory health is estimated from retention percentages across tracked items
- Problems due now are prioritized by urgency and estimated forgetting

The current review UI exposes these ratings:

- `Blackout`
- `Hard`
- `Good`
- `Easy`

### 5. Forgetting curve and memory health

The app does not only queue cards. It also visualizes memory decay:

- Forgetting curves for individual problems
- Topic-level retention bars
- A memory health score
- A "most forgotten" topic summary

This gives the SRS section a more analytical feel than a simple flashcard queue.

### 6. Mock interview generator

The mock interview flow is implemented in:

- `lib/mock-interview.ts`
- `components/MockInterviewPanel.tsx`

Each session currently generates 3 problems:

- 1 easy warm-up
- 1 medium core problem
- 1 hard stretch problem

Selection is based on:

- Weak topics
- Company target
- Current recommendation scores
- Due/overdue SRS items for the easy warm-up when useful

The session includes:

- A countdown timer
- Pause/resume
- Completion tracking
- Persisted session state in browser storage

## Tech Stack

- Next.js 15
- React 19
- TypeScript
- Tailwind CSS v4
- Recharts for charts and data visualization
- `next/font` for Google font loading
- Browser `localStorage` for client-side persistence

Styling is mostly driven by:

- Inline component styles
- Global CSS variables in `app/globals.css`
- A small amount of Tailwind setup for base integration

## Project Structure

```text
.
|-- app/
|   |-- api/profile/route.ts      # API endpoint for profile lookup
|   |-- globals.css               # Global tokens and animation helpers
|   |-- layout.tsx                # Fonts and page shell
|   `-- page.tsx                  # Landing page, search, import/export flow
|-- components/
|   |-- Dashboard.tsx             # Main analytics dashboard
|   |-- Heatmap.tsx               # Submission heatmap with tooltip portal
|   |-- MockInterviewPanel.tsx    # Timed mock interview UI
|   |-- ReviewCard.tsx            # SRS review interaction
|   |-- SRSPanel.tsx              # Memory queue and retention views
|   `-- ForgetCurve.tsx           # Forgetting curve and retention bars
|-- lib/
|   |-- analytics.ts              # Heuristic scoring and recommendations
|   |-- leetcode.ts               # GraphQL fetch and response shaping
|   |-- mock-interview.ts         # Mock interview session generation
|   |-- srs-store.ts              # Browser persistence for SRS data
|   `-- srs.ts                    # SM-2 style review logic and retention math
|-- scripts/
|   `-- dev.mjs                   # Custom dev launcher for Node localStorage
|-- next.config.ts                # Remote image allowlist and API headers
`-- package.json
```

## How Data Flows Through the App

1. A user enters a LeetCode username on the landing page.
2. The client calls `/api/profile?username=<name>`.
3. The API route calls `fetchLeetCodeProfile()` from `lib/leetcode.ts`.
4. The LeetCode GraphQL response is normalized into a `LeetCodeProfile`.
5. `components/Dashboard.tsx` computes derived analytics using `computeAnalytics()`.
6. Browser-side SRS data is loaded and merged with newly detected solved problems.
7. The UI renders dashboard cards, charts, recommendation panels, memory views, and mock interview tools.

## Local Development

### Prerequisites

- Node.js 22+ recommended
- npm
- Internet access to `leetcode.com`

Node 22+ is recommended because the custom dev script uses Node's `--localstorage-file` flag in `scripts/dev.mjs`.

### Install

```bash
npm install
```

### Start the development server

```bash
npm run dev
```

Then open:

```text
http://localhost:3000
```

### Production build

```bash
npm run build
npm start
```

### Lint

```bash
npm run lint
```

## Available Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Starts Next.js in development using the custom Node launcher in `scripts/dev.mjs`. |
| `npm run build` | Builds the production app. |
| `npm start` | Starts the built production server. |
| `npm run lint` | Runs ESLint. |

## Browser Persistence

This app has no database. Personalized state is stored in the browser.

### SRS storage

Per-user SRS data is stored under:

```text
leetinsight:srs:<username>
```

This data contains the review state for tracked problems, including:

- Interval
- Ease factor
- Next review date
- Last review date
- Total reviews
- Difficulty and topics

### Mock interview session storage

The current mock interview session is stored under:

```text
leetinsight:mock:session
```

That allows refresh persistence for an active or paused session.

### Import/export backups

From the main page, the user can export SRS data to a JSON file and later import it back.

The exported file uses a versioned envelope so future schema migration is possible.

## Environment Variables

No environment variables are currently required.

The app works entirely from:

- Public LeetCode profile data
- Browser storage
- Local code-defined heuristics

## Analytics Model Summary

The scoring model in `lib/analytics.ts` is heuristic-based, not machine-learned.

### Interview readiness score

The readiness score is built from:

- Total problems solved
- Hard problems solved
- Topic diversity
- Consistency score
- Contest experience

### Solver personality

A solver personality is inferred from things like:

- Hard-problem share
- Long streaks and active-day counts
- Easy-problem skew
- Topic breadth

Current personalities include:

- `The Architect`
- `The Grinder`
- `The Sprinter`
- `The Explorer`
- `The Sniper`

### Burnout risk

Burnout is estimated from recent submission volume and short-term trend.

### Company readiness

Company readiness is based on overlap between solved topic families and a small in-repo map of commonly emphasized topics for:

- Google
- Meta
- Amazon
- Microsoft

### Recommended problems

Recommended problems are scored using:

- Weakness in the primary topic
- Retention decay in related SRS cards
- Target company alignment
- Difficulty balancing rules

## SRS Model Summary

The spaced repetition logic in `lib/srs.ts` is intentionally self-contained and pure.

### What it tracks

Each tracked problem stores:

- Problem slug and title
- Difficulty
- Topic list
- LeetCode problem number
- SM-2 repetition state
- Review timestamps
- Next due date

### Review behavior

On each review:

- Failed recall resets repetition count and shortens the interval
- Successful recall increases interval growth
- Ease factor is adjusted based on recall quality
- Future review date is scheduled automatically

### Retention estimation

Retention is estimated with exponential decay, then used for:

- Current memory percentage
- Topic-level retention summaries
- Due queue prioritization
- "Most forgotten" topic hints

## Mock Interview Logic Summary

The mock interview generator is also heuristic-based.

Current strategy:

- Easy: prefer a due or overdue easy problem with weak retention
- Medium: prefer a weak-topic problem that matches the selected company
- Hard: prefer the highest-priority hard recommendation that closes an important gap

This keeps the mock session targeted instead of random.

## Networking Notes

- The app depends on LeetCode being reachable from the server runtime.
- The profile endpoint returns a friendly error if the username is missing or the fetch fails.
- Remote images from LeetCode domains are allowed in `next.config.ts`.

## Limitations and Tradeoffs

This is important to understand before extending the project.

### 1. No server-side user persistence

There is no login, database, or backend user model. Personalized memory state exists only in browser storage unless exported manually.

### 2. Heuristic analytics, not ground truth

Readiness, burnout, personality, and company fit are useful estimates, not authoritative interview predictions.

### 3. Recommendation catalog is curated and finite

Problem recommendations come from the hardcoded catalog in `lib/analytics.ts`, not the full LeetCode corpus.

### 4. SRS coverage is best effort

Tracked solved problems are derived from the fetched profile data and recent accepted submissions, then enriched with topic information when possible.

That means the SRS queue may not represent a user's complete historical LeetCode history.

### 5. Public profile dependency

The app assumes the target LeetCode profile is public enough for the GraphQL fields being queried.

## Extending the Project

Good next steps if you want to take this further:

- Replace the curated problem catalog with a larger data source
- Add user auth and cloud persistence for SRS state
- Persist analytics snapshots over time
- Support more target companies and richer company topic maps
- Add tests around analytics heuristics and SRS behavior
- Add explicit confidence levels to recommendation and readiness outputs
- Add a shareable public report page for a generated profile

## Troubleshooting

### `npm run dev` fails immediately

Check the Node version first. The custom development script expects a Node runtime that supports `--localstorage-file`.

### Profile fetch returns an error

Possible causes:

- Invalid LeetCode username
- LeetCode is temporarily unavailable
- Network restrictions are blocking the GraphQL request

### SRS data seems missing

Remember that SRS state is stored per browser and per username in `localStorage`. Switching browsers, clearing storage, or using private browsing can reset it.

## Summary

LeetInsight is a frontend-heavy, analytics-focused LeetCode companion that combines:

- live profile fetches,
- interview heuristics,
- company-targeted recommendations,
- browser-based spaced repetition,
- and a mock interview workflow

into one polished dashboard.

If you want a repo to experiment with interview-prep analytics, client-side learning systems, and data-rich Next.js UI patterns, this is a strong base to build on.
