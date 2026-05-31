# 🌍 WorldTracker — Product Requirements Document (PRD)

**Version:** 2.0  
**Date:** May 2026  
**Status:** Updated Draft  
**Author:** Abhi (AI-Assisted Build)  
**Changelog v2.0:** Refined scope to personal-scale (~10–20 users), added free LLM layer (Groq + Ollama), country intelligence panel with "missed spots", AI memory generation & downloadable artifacts, perpetual data retention strategy, interactive travel timeline, photos made optional.

---

## Table of Contents

1. [Product Overview](#1-product-overview)
2. [Goals & Success Metrics](#2-goals--success-metrics)
3. [User Personas](#3-user-personas)
4. [Feature Inventory & Prioritization](#4-feature-inventory--prioritization)
5. [Detailed Feature Specifications](#5-detailed-feature-specifications)
6. [Data Models](#6-data-models)
7. [Tech Stack Recommendations (100% Free)](#7-tech-stack-recommendations-100-free)
8. [Free LLM Integration Architecture](#8-free-llm-integration-architecture)
9. [System Architecture](#9-system-architecture)
10. [UI/UX Flows](#10-uiux-flows)
11. [Non-Functional Requirements](#11-non-functional-requirements)
12. [Free APIs & Databases](#12-free-apis--databases)
13. [Data Retention Strategy (Forever)](#13-data-retention-strategy-forever)
14. [Phased Roadmap](#14-phased-roadmap)
15. [Open Questions & Risks](#15-open-questions--risks)
16. [Appendix: AI Build Strategy](#16-appendix-ai-build-strategy)

---

## 1. Product Overview

### 1.1 Vision

**WorldTracker** is a personal + small-group travel memory and intelligence web application. It lets you and a small circle of family/friends log every place ever visited on a 3D globe — at any granularity from country to tourist spot — then uses free AI/LLMs to generate rich travel narratives, surface the best spots you missed in each country, and produce beautiful downloadable memory artifacts (travel diaries, personalized travel reports, country scorecards). Your data lives forever.

### 1.2 Elevator Pitch

> "Your entire travel life on a 3D globe — with an AI that tells you what you missed, writes your travel story, and keeps your memories forever."

### 1.3 Core Value Propositions

| Value | Description |
|---|---|
| **Visual Storytelling** | 3D interactive globe + interactive timeline of your travel life |
| **Granular Logging** | Log at any level — continent → country → state → city → tourist spot |
| **AI Country Intelligence** | Free LLM surfaces the top spots per country, tells you what you missed, gives stats |
| **AI Memory Generation** | LLM writes creative travel diaries, postcards, and memory summaries — downloadable |
| **Perpetual Memory** | Data stored forever — this is your life's travel archive |
| **Personal Scale** | Designed for 1–20 users max — free infra stays comfortable forever |
| **Timeline View** | Chronological, revisitable history of every trip and place |

### 1.4 Scope (Updated)

- **Users:** Personal use + small friend/family group (target: 1–20 registered users max)
- **Scale consequence:** Supabase free tier (500 MB DB, 1 GB storage) is more than sufficient for this scale forever — no need to worry about limits
- **Photos:** Completely optional — app works fully without any photos; text-first design
- **LLMs:** Free-tier only (Groq free API, Ollama for local, HuggingFace Inference API free tier)
- **Data:** Never deleted — all data retained permanently with soft-delete pattern
- **Out of Scope:** Native mobile app, monetization, public social discovery

---

## 2. Goals & Success Metrics

### 2.1 Product Goals (Personal Scale)

| Goal | Metric | Target |
|---|---|---|
| Core logging habit | Places logged per active user/month | ≥ 10 |
| AI engagement | AI-generated memories created | ≥ 1 per trip |
| Data richness | % of logged places with dates | ≥ 70% |
| Country intelligence use | Country panels opened per session | ≥ 2 |
| Timeline engagement | Timeline visited per session | ≥ 1 |

### 2.2 User Goals

- Log visited places in < 30 seconds
- Understand what I've missed in countries I've been to (AI-powered)
- Relive travel memories chronologically via timeline
- Download a beautiful AI-generated travel diary or postcard
- Know my travel data will never be lost

---

## 3. User Personas

### Persona 1 — "The Memory Keeper" (Primary)
- **Who:** Abhi + close family/friends (1–20 people)
- **Motivation:** One permanent, beautiful place for all travel memories
- **Pain point:** Memories scattered across WhatsApp, Google Photos, mental notes
- **Key features:** Globe, timeline, AI memory generation, perpetual storage

### Persona 2 — "The Curious Explorer"
- **Who:** Wants to know what they missed and what to see next
- **Motivation:** Make more informed travel decisions
- **Key features:** Country intelligence panel (AI-powered missed spots), wishlist

### Persona 3 — "The Nostalgic Revisitor"
- **Who:** Looks back at past travels more than planning new ones
- **Motivation:** Relive memories, see how far they've come
- **Key features:** Timeline, "On this day", AI-generated travel stories, downloadable diary

---

## 4. Feature Inventory & Prioritization

### Priority Tiers

| Tier | Label | Meaning |
|---|---|---|
| P0 | **MVP** | Core, must ship first |
| P1 | **v1.1** | High value, next sprint |
| P2 | **v2** | Differentiating, after stability |
| P3 | **Future** | Nice-to-have |

### Master Feature List (v2.0)

| # | Feature | Tier | Effort | New/Updated |
|---|---|---|---|---|
| F01 | Email/password auth + user profile | P0 | S | — |
| F02 | Interactive 3D globe (WebGL) | P0 | M | — |
| F03 | Log a visited place (search & pin) | P0 | M | — |
| F04 | Multi-level place hierarchy (country → tourist spot) | P0 | L | — |
| F05 | Globe color-coding — visited vs unvisited | P0 | S | — |
| F06 | Place detail card (date, notes, rating; photos optional) | P0 | S | Updated |
| F07 | My Places list view (searchable, filterable) | P0 | S | — |
| F08 | Global stats dashboard (countries, cities, % world) | P0 | M | — |
| F09 | Invite friends / family by email | P0 | M | — |
| F10 | View friends' globes | P0 | M | — |
| **F11** | **Interactive travel timeline** | **P0** | **M** | **NEW → P0** |
| **F12** | **Country intelligence panel (stats + AI missed spots)** | **P0** | **L** | **NEW** |
| **F13** | **AI memory generation (diary, postcard, summary)** | **P1** | **L** | **NEW** |
| **F14** | **Downloadable AI artifacts (PDF diary, PNG postcard)** | **P1** | **M** | **NEW** |
| F15 | Wishlist (places you want to visit) | P1 | S | — |
| F16 | Trip planner (group places into a trip with dates) | P1 | L | — |
| F17 | Milestone badges & achievements | P1 | M | — |
| F18 | Social feed (friends' recent pins) | P1 | M | — |
| F19 | "On this day" memory flashbacks (AI-narrated) | P1 | S | Updated |
| F20 | Overlap map (places you and a friend both visited) | P2 | M | — |
| F21 | Continent & region-level stats | P2 | S | — |
| F22 | Heat map of visit density | P2 | M | — |
| F23 | Export travel map as PNG | P2 | S | — |
| F24 | Draw custom routes on the map | P2 | L | — |
| F25 | Collaborative trip planning with friends | P2 | L | — |
| F26 | Public shareable profile link | P2 | M | — |
| F27 | Comments & reactions on friends' pins | P2 | S | — |
| F28 | Leaderboard within friend group | P2 | S | — |
| F29 | Photo upload per place (optional, up to 5) | P2 | M | Deprioritized |
| F30 | AI trip recommendations from wishlist | P3 | L | — |
| F31 | PWA / offline mode | P3 | L | — |

---

## 5. Detailed Feature Specifications

### F02 — Interactive 3D Globe

**Library:** Globe.gl (free, WebGL/Three.js)

**Behaviors:**
- Auto-rotates on idle, stops on interaction
- Visited countries/regions highlighted (color by visit density)
- Unvisited countries: dark/muted
- Wishlisted: amber glow
- Click country → zooms in → opens Country Intelligence Panel (F12)
- Zoom levels: Globe → Continent → Country → State → City
- Mobile: pinch-zoom + drag; Desktop: scroll + drag

**Globe color states:**

| State | Color |
|---|---|
| Not visited | #1a1a2e (dark navy) |
| Visited (country, 1–2 cities) | #2ecc71 (soft green) |
| Visited (3–5 cities) | #27ae60 (medium green) |
| Visited (6+ cities / deep explore) | #1e8449 (deep green) |
| Wishlisted only | #f39c12 (amber) |
| Active selection | #3498db (blue ring) |
| Friends' visits (overlay) | #9b59b6 (purple, toggleable) |

---

### F06 — Place Detail Card (Photos Optional)

Each logged place stores:

| Field | Type | Required |
|---|---|---|
| Place name | Text | Yes |
| Hierarchy level | Enum | Auto |
| Date(s) visited | Date or date range | Recommended |
| Number of visits | Integer counter | Auto |
| Personal rating | 1–5 stars | No |
| Notes / story | Text (1000 chars) | No |
| Tags | Custom (e.g., "solo", "honeymoon") | No |
| Photos | Up to 5 images | **No — fully optional** |
| Visibility | friends / private | Yes |
| AI memory generated? | Boolean flag | Auto |

> **Photos are optional.** The app is designed to be fully useful with zero photos. Text notes and AI-generated memories are the primary memory layer.

---

### F11 — Interactive Travel Timeline (NEW — P0)

**Description:** A chronological, scrollable, visual timeline of all places ever logged — the "time machine" view of your travel life.

**Layout:**
- Vertical timeline with year markers as dividers
- Each entry shows: place name, flag/emoji, date, rating stars, first 100 chars of notes
- Entries grouped by Trip (if assigned) or by Month (if standalone)
- Filter bar: by year, by country, by type (city/landmark/etc.), by trip
- Click any entry → opens Place Detail Card

**Timeline entry anatomy:**

```
┌─────────────────────────────────────────────┐
│  📍 Eiffel Tower, Paris, France             │
│  ⭐⭐⭐⭐⭐  |  Jun 2019  |  🇫🇷             │
│  "Went at sunset, absolutely breathtaking…" │
│  [Part of: Europe Summer 2019 trip]         │
│  [View on Globe] [Edit] [Generate Memory]   │
└─────────────────────────────────────────────┘
```

**Year summary cards:**
- At each year boundary, show a "Year in Review" card: countries visited, new places, top-rated place
- Click year card → AI generates a "Year in Travel" summary (F13)

**Export:** Timeline can be exported as a PDF travel log (chronological list, no photos needed)

---

### F12 — Country Intelligence Panel (NEW — P0)

**Description:** When a user clicks a country on the globe, a side panel opens showing both their personal stats for that country AND AI-generated intelligence about what they may have missed.

**Panel sections:**

#### Section A — Your Stats for This Country
- Total places logged in this country
- Cities visited (list)
- Districts / states visited
- Landmarks visited
- Date first visited → date last visited
- Total estimated days spent
- Your rating average for this country
- % of country's top-rated spots you've visited (AI-computed)

#### Section B — AI Intelligence: "What You Missed" (LLM-powered)

Triggered on first open (then cached for 7 days). Calls free LLM (Groq) with a prompt like:

```
You are a knowledgeable travel guide. The user has visited the following 
places in [Country]: [list of logged places].

1. List the top 10 most-visited / must-see spots in [Country] that this 
   user has NOT visited, ranked by popularity. For each: name, one-line 
   description, why it's worth visiting.
2. Give a "coverage score" out of 100 for how well they've explored this 
   country (based on their visited places vs the country's highlights).
3. Suggest a 3-day itinerary using only the missed spots.
```

**Panel UI:**

```
┌─────────────────────────────────────────────────┐
│  🇮🇳 India — Your Explorer Profile              │
│─────────────────────────────────────────────────│
│  YOUR STATS                                     │
│  12 cities · 3 states · 8 landmarks             │
│  First visit: Dec 2015 · Last: Jan 2026         │
│  Coverage Score: 38 / 100  ████░░░░░░░░         │
│─────────────────────────────────────────────────│
│  🤖 AI: PLACES YOU MISSED                       │
│  1. Varanasi — "The spiritual heart of India…"  │
│  2. Hampi — "Ancient ruins and boulder…"        │
│  3. Rann of Kutch — "Vast salt desert that…"   │
│  ... (7 more)                                   │
│─────────────────────────────────────────────────│
│  🗺️ SUGGESTED 3-DAY ROUTE (Missed Spots)        │
│  Day 1: Varanasi → Day 2: Sarnath → Day 3: …   │
│─────────────────────────────────────────────────│
│  [Add to Wishlist] [Generate Country Diary]     │
└─────────────────────────────────────────────────┘
```

**Caching:** LLM response cached in Supabase for 7 days per (user × country) pair to avoid hitting rate limits.

---

### F13 — AI Memory Generation (NEW — P1)

**Description:** Use a free LLM to generate creative, personalized travel memories, stories, and artifacts based on the user's logged data (place name, date, notes, rating, tags).

**Generation types:**

| Type | Description | LLM Prompt Style | Output Length |
|---|---|---|---|
| **Travel Postcard** | Short, warm, first-person memory of one place | Creative writing, postcard style | 150 words |
| **Trip Diary Entry** | Full narrative diary entry for a trip | Vivid, descriptive, first-person | 500 words |
| **Year in Travel** | Annual travel summary, reflective tone | Editorial, magazine style | 300 words |
| **Country Story** | Narrative of everything visited in one country | Storytelling, travel memoir style | 400 words |
| **Life Travel Story** | Full-life travel memoir intro (all places ever) | Grand, reflective, inspiring | 600 words |
| **Missed Spots Letter** | A letter from the places you haven't seen yet | Creative, playful, inviting | 250 words |

**Prompt construction example (Trip Diary):**
```
You are a vivid travel writer. Write a first-person diary entry for a trip 
to [places list] from [start date] to [end date]. 
The traveler rated [place A] ⭐⭐⭐⭐⭐ and noted: "[their notes]".
They rated [place B] ⭐⭐⭐ and noted: "[their notes]".
Write in a warm, personal, descriptive style. 500 words. First person.
Do not make up facts — only use the places and notes provided.
```

**UI Flow:**
1. User clicks "Generate Memory" on a place, trip, or year card
2. Selects memory type from a dropdown
3. LLM generates in ~3–5 seconds (streamed)
4. Preview shown with options: **Regenerate / Edit / Save / Download**
5. Saved memories stored in DB linked to the place/trip

**Editable after generation:** User can edit the AI draft before saving — it's a starting point, not a final product.

---

### F14 — Downloadable AI Artifacts (NEW — P1)

**Description:** Package AI-generated memories and stats into beautiful downloadable files.

**Artifact types:**

| Artifact | Format | Contents |
|---|---|---|
| **Travel Postcard** | PNG (1200×800) | Place photo (or illustration), AI text, date, country flag |
| **Trip Diary** | PDF | Cover page, per-day entries, AI narrative, stats, map snapshot |
| **Year in Review** | PDF | Year stats, countries visited, best moments, AI summary |
| **Country Scorecard** | PDF | Your stats + coverage score + missed spots + AI country story |
| **Life Travel Book** | PDF | All trips chronological, AI memoir intro, globe snapshot, stats |
| **Timeline Export** | PDF | Full chronological place list, formatted like a travel log |

**Generation stack (all free):**
- PDF: `jsPDF` + `html2canvas` (client-side, no server needed)
- PNG postcard: HTML Canvas rendered client-side → `canvas.toBlob()` → download
- Illustrations (no photos): Use SVG/CSS country silhouettes or free Unsplash API (50 req/hour free) for place hero images

**Download flow:**
```
User clicks "Download [Artifact Type]"
    │
    ▼
App renders artifact in hidden HTML div (styled template)
    │
    ▼
html2canvas captures → jsPDF packages → browser download
    │
    ▼
File saved: "WorldTracker_India_2024.pdf" etc.
```

---

### F19 — "On This Day" (AI-Narrated, Updated)

- Checks today's date against all logged place visit dates
- If match: shows a card "3 years ago today, you were in Santorini, Greece"
- Clicking it generates an AI "memory flashback" — a short, nostalgic re-telling of that visit
- Shown on dashboard home as a daily card (disappears if no match)

---

## 6. Data Models

### Users
```sql
users
  id               UUID PK
  email            TEXT UNIQUE NOT NULL
  password_hash    TEXT NOT NULL
  display_name     TEXT
  avatar_url       TEXT
  bio              TEXT
  created_at       TIMESTAMPTZ DEFAULT now()
  settings         JSONB  -- theme, notif prefs, default visibility
  deleted_at       TIMESTAMPTZ  -- soft delete only, never hard delete
```

### Place Logs (Core Entity)
```sql
place_logs
  id               UUID PK
  user_id          UUID FK → users
  place_id         TEXT  -- Nominatim/OSM place_id for deduplication
  place_name       TEXT NOT NULL
  place_type       TEXT  -- country | state | district | city | neighborhood | landmark
  country_code     TEXT  -- ISO 3166-1 alpha-2
  country_name     TEXT
  state_name       TEXT
  city_name        TEXT
  latitude         FLOAT
  longitude        FLOAT
  geojson          JSONB  -- boundary polygon
  visited_at       DATE   -- nullable (user may not remember exact date)
  visited_at_end   DATE   -- for multi-day visits
  visit_count      INT DEFAULT 1
  rating           SMALLINT CHECK (rating BETWEEN 1 AND 5)
  notes            TEXT   -- up to 1000 chars
  tags             TEXT[]
  visibility       TEXT DEFAULT 'friends' CHECK (visibility IN ('friends','private'))
  ai_memory_id     UUID FK → ai_memories (nullable)
  created_at       TIMESTAMPTZ DEFAULT now()
  updated_at       TIMESTAMPTZ DEFAULT now()
  deleted_at       TIMESTAMPTZ  -- soft delete — data never lost
```

### Trips
```sql
trips
  id               UUID PK
  user_id          UUID FK → users
  title            TEXT NOT NULL
  description      TEXT
  start_date       DATE
  end_date         DATE
  cover_photo_url  TEXT
  participant_ids  UUID[]
  ai_diary_id      UUID FK → ai_memories (nullable)
  created_at       TIMESTAMPTZ DEFAULT now()
  deleted_at       TIMESTAMPTZ

trip_places
  id               UUID PK
  trip_id          UUID FK → trips
  place_log_id     UUID FK → place_logs
  order_index      INT
  day_number       INT  -- which day of the trip
```

### AI Memories (NEW)
```sql
ai_memories
  id               UUID PK
  user_id          UUID FK → users
  entity_type      TEXT  -- 'place' | 'trip' | 'year' | 'country' | 'life'
  entity_id        TEXT  -- place_log_id / trip_id / year / country_code
  memory_type      TEXT  -- 'postcard' | 'diary' | 'year_review' | 'country_story' | 'life_memoir' | 'missed_spots_letter'
  prompt_used      TEXT  -- exact prompt sent (for auditability)
  generated_text   TEXT NOT NULL
  user_edited_text TEXT  -- if user modified the AI output
  model_used       TEXT  -- 'groq/llama3' | 'groq/mixtral' | 'ollama/llama3' etc.
  generated_at     TIMESTAMPTZ DEFAULT now()
  is_downloaded    BOOLEAN DEFAULT false
  deleted_at       TIMESTAMPTZ  -- soft delete
```

### Country Intelligence Cache (NEW)
```sql
country_intelligence_cache
  id               UUID PK
  user_id          UUID FK → users
  country_code     TEXT
  visited_places   JSONB  -- snapshot of visited places used to generate this
  coverage_score   SMALLINT  -- 0–100
  missed_spots     JSONB  -- array of {name, description, why_visit}
  suggested_route  TEXT   -- AI-generated itinerary text
  model_used       TEXT
  generated_at     TIMESTAMPTZ DEFAULT now()
  expires_at       TIMESTAMPTZ  -- 7 days from generated_at
  -- No deleted_at — this is ephemeral cache, but kept for audit history
```

### Photos (Optional)
```sql
place_photos
  id               UUID PK
  place_log_id     UUID FK → place_logs
  user_id          UUID FK → users
  storage_url      TEXT NOT NULL
  caption          TEXT
  taken_at         DATE
  created_at       TIMESTAMPTZ DEFAULT now()
  deleted_at       TIMESTAMPTZ  -- soft delete — never purge storage files
```

### Wishlists
```sql
wishlists
  id               UUID PK
  user_id          UUID FK → users
  place_name       TEXT
  place_type       TEXT
  country_code     TEXT
  latitude         FLOAT
  longitude        FLOAT
  priority         SMALLINT DEFAULT 2 CHECK (priority IN (1,2,3))
  notes            TEXT
  ai_suggestion_source TEXT  -- 'country_panel' | 'manual' | 'ai_recommendation'
  created_at       TIMESTAMPTZ DEFAULT now()
  deleted_at       TIMESTAMPTZ
```

### Friendships
```sql
friendships
  id               UUID PK
  requester_id     UUID FK → users
  addressee_id     UUID FK → users
  status           TEXT CHECK (status IN ('pending','accepted','blocked'))
  created_at       TIMESTAMPTZ DEFAULT now()
```

### Badges
```sql
user_badges
  id               UUID PK
  user_id          UUID FK → users
  badge_key        TEXT
  earned_at        TIMESTAMPTZ DEFAULT now()
```

---

## 7. Tech Stack Recommendations (100% Free)

### Frontend

| Layer | Choice | Why |
|---|---|---|
| Framework | **Next.js 14 (React + TypeScript)** | SSR/SSG, Vercel free tier, best ecosystem |
| Styling | **Tailwind CSS** | Fast to build, responsive utility classes |
| 3D Globe | **Globe.gl** | Free, WebGL, built on Three.js, superb docs |
| Map (2D fallback) | **Leaflet.js** | Free, OSM tiles, no API key |
| State | **Zustand** | Lightweight, simple |
| Data fetching | **TanStack Query** | Caching, sync, optimistic updates |
| Forms | **React Hook Form + Zod** | Type-safe validation |
| UI Components | **shadcn/ui** | Free, beautiful, accessible |
| Charts | **Recharts** | Free React charting |
| Timeline UI | **react-vertical-timeline-component** | Free, customizable |
| PDF export | **jsPDF + html2canvas** | Client-side PDF/PNG generation, no server |
| Animations | **Framer Motion** | Globe transitions, timeline reveals |

### Backend

| Layer | Choice | Why |
|---|---|---|
| Runtime | **Next.js API routes** | Serverless, single repo |
| ORM | **Prisma** | Type-safe, migrations |
| Auth | **NextAuth.js v5** | Free, email+password |
| Email | **Resend** | 3k emails/month free |

### Database & Storage

| Layer | Choice | Why |
|---|---|---|
| Database | **Supabase PostgreSQL** | 500 MB free — comfortable forever at this user scale |
| File storage | **Supabase Storage** | 1 GB free — plenty for optional photos at 10–20 users |
| Cache | **Upstash Redis** | 10k req/day — for LLM response caching |

### Hosting

| Layer | Choice | Why |
|---|---|---|
| Frontend + API | **Vercel** (free Hobby tier) | Auto-deploy, 100 GB bandwidth |
| Domain | Vercel `.vercel.app` subdomain | Zero cost |

### Scale reality check at 20 users:

| Resource | Estimated Use | Free Limit | Status |
|---|---|---|---|
| Supabase DB | ~10 MB | 500 MB | ✅ Comfortable |
| Supabase Storage | ~200 MB (photos optional) | 1 GB | ✅ Fine |
| Vercel bandwidth | ~1 GB/month | 100 GB | ✅ Tiny |
| Upstash Redis | ~500 req/day | 10k/day | ✅ Easy |
| Groq free API | ~200 req/day | 14.4k req/day | ✅ Fine |

---

## 8. Free LLM Integration Architecture

This is a new section covering exactly how free LLMs are integrated.

### 8.1 LLM Provider Options (All Free)

| Provider | Model | Free Limit | Latency | Best For |
|---|---|---|---|---|
| **Groq** | Llama 3 8B / 70B | 14,400 req/day, 30k tokens/min | ~1s | Primary — fast inference |
| **Groq** | Mixtral 8x7B | Same as above | ~1s | Creative writing (memories) |
| **HuggingFace Inference API** | Zephyr, Mistral 7B | Free tier (rate-limited) | ~3–5s | Fallback |
| **Ollama (local)** | Any open model | Unlimited | ~2–5s (local) | Self-hosted option |
| **OpenRouter** | Multiple free models | Free tier available | Varies | Secondary fallback |

**Recommended primary:** Groq (Llama 3 70B for quality, 8B for speed)  
**Fallback:** HuggingFace Inference API (Mistral 7B)

### 8.2 LLM Use Cases & Prompt Map

| Feature | LLM Task | Model | Tokens (avg) | Frequency |
|---|---|---|---|---|
| F12: Country missed spots | Structured list generation | Groq Llama3-8B | ~800 out | On demand, cached 7 days |
| F12: Coverage score | Scoring + short reasoning | Groq Llama3-8B | ~200 out | Same as above |
| F12: 3-day itinerary | Trip planning text | Groq Llama3-8B | ~400 out | Same as above |
| F13: Travel postcard | Creative writing | Groq Mixtral / Llama3-70B | ~200 out | On demand |
| F13: Trip diary entry | Long-form creative | Groq Llama3-70B | ~600 out | On demand |
| F13: Year in review | Editorial summary | Groq Llama3-70B | ~400 out | On demand |
| F13: Country story | Travel memoir | Groq Llama3-70B | ~500 out | On demand |
| F13: Life memoir | Grand narrative | Groq Llama3-70B | ~700 out | On demand (rare) |
| F19: On This Day | Short flashback | Groq Llama3-8B | ~150 out | Daily, once per day |

### 8.3 API Call Architecture

```
Client (Next.js)
    │
    ▼  POST /api/ai/[task]
Next.js API Route (server-side)
    │
    ├── Check Upstash Redis cache (key: userId:country:taskType)
    │       ├── HIT → return cached response immediately
    │       └── MISS → continue
    │
    ├── Build prompt from user's DB data (Prisma query)
    │
    ├── Call Groq API (primary)
    │       └── On failure/rate-limit → fallback to HuggingFace
    │
    ├── Stream response to client (SSE / ReadableStream)
    │
    ├── Cache result in Upstash Redis (TTL: 7 days for country intel, 30 days for memories)
    │
    └── Save generated text to ai_memories table in Supabase
```

### 8.4 Prompt Safety Rules

- Never inject raw user notes verbatim into prompts without sanitization
- System prompt always includes: "You are a helpful travel assistant. Do not make up places the user has not visited. Do not fabricate dates. Base everything strictly on the provided data."
- Max input tokens capped at 2000 to stay within free tier limits
- If user data exceeds token limit: summarize the most recent 20 places

### 8.5 Groq API Setup (Free)

```
1. Sign up at console.groq.com (free, no credit card)
2. Create API key
3. Store as GROQ_API_KEY in Vercel environment variables
4. Use Groq's OpenAI-compatible API:
   POST https://api.groq.com/openai/v1/chat/completions
   Model: "llama3-70b-8192" or "mixtral-8x7b-32768"
```

### 8.6 LLM Response Quality Controls

- Temperature: 0.7 for creative writing, 0.3 for structured outputs (missed spots list)
- Always request JSON for structured outputs (coverage score, missed spots list)
- Parse and validate JSON before storing; fallback to raw text if malformed
- Show spinner + streaming text while generating (not a blank wait)
- Cap retries at 2; show "Try again later" if all fail

---

## 9. System Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                     CLIENT (Browser)                          │
│   Next.js React + Globe.gl + Timeline + jsPDF + html2canvas  │
└─────────────────────────┬────────────────────────────────────┘
                          │ HTTPS
┌─────────────────────────▼────────────────────────────────────┐
│               Next.js API Routes (Vercel Serverless)          │
│  /api/places  /api/trips  /api/ai/[task]  /api/friends       │
│                    NextAuth.js (JWT)                           │
└────┬──────────────┬──────────────┬────────────────┬──────────┘
     │              │              │                │
┌────▼────┐  ┌──────▼──────┐  ┌───▼───────┐  ┌────▼──────────┐
│Supabase │  │  Upstash    │  │   Groq    │  │  Nominatim    │
│Postgres │  │  Redis      │  │  LLM API  │  │  (OSM Search) │
│+Storage │  │  (Cache)    │  │  (Free)   │  │  (Free)       │
└─────────┘  └─────────────┘  └───────────┘  └───────────────┘
                                    │
                               ┌────▼──────────┐
                               │  HuggingFace  │
                               │  (Fallback)   │
                               └───────────────┘
```

---

## 10. UI/UX Flows

### 10.1 Onboarding Flow
```
Landing page
    │
    ▼
Sign up (email + password)
    │
    ▼
"Where have you been?" quick-add wizard (log first 3 places)
    │
    ▼
Globe animates, pins drop in
    │
    ▼
AI generates a short welcome memory: "Your journey begins…"
    │
    ▼
Dashboard home
```

### 10.2 Log a Place
```
Click "+" or click globe
    │
    ▼
Search (Nominatim typeahead): any place, any granularity
    │
    ▼
Quick-log modal:
  - Date visited (optional)
  - Rating (optional)
  - Notes (optional)
  - Tags (optional)
  - Photo (optional — clearly marked "optional")
    │
    ▼
Save → Pin animates on globe + timeline entry created
    │
    ▼
Toast: "📍 Added! Want AI to write a memory for this place?" [Yes / Later]
```

### 10.3 Country Intelligence Panel
```
Click country on globe
    │
    ▼
Side panel slides in:
  - Your stats for this country (instant, from DB)
  - Loading spinner for AI section
    │
    ▼
AI section loads (streamed from Groq):
  - Coverage score
  - Top missed spots (list)
  - Suggested 3-day route
    │
    ▼
Actions:
  - "Add missed spot to Wishlist" (one click per item)
  - "Generate Country Diary" → F13 flow
  - "Download Country Scorecard" → F14 flow
```

### 10.4 AI Memory Generation
```
User clicks "Generate Memory" (on place / trip / year / country)
    │
    ▼
Memory type picker:
  [ Postcard ] [ Diary Entry ] [ Year Review ] 
  [ Country Story ] [ Missed Spots Letter ]
    │
    ▼
AI generates (streamed, ~3–5s) — text appears word by word
    │
    ▼
Preview screen:
  - Full generated text
  - [Regenerate] [Edit] [Save] [Download]
    │
    ├─ Save → stored in ai_memories table
    └─ Download → renders template → PDF or PNG download
```

### 10.5 Timeline View
```
Timeline page (vertical scroll)
    │
    ▼
Year 2026 ─────────────────────
  📍 Hampi, Karnataka · Feb 2026 · ⭐⭐⭐⭐⭐
  📍 Coorg, Karnataka · Jan 2026 · ⭐⭐⭐⭐
Year 2025 ─────────────────────
  [Year in Review card] → "12 places · 3 countries · click for AI summary"
  📍 ...
    │
    ▼
Filter bar: [All] [By Country] [By Year] [Trips only] [With Notes] [With Memories]
    │
    ▼
Click any entry → Place detail card (full view)
Click Year card → AI generates Year in Review
```

---

## 11. Non-Functional Requirements

### Performance

| Metric | Target |
|---|---|
| Globe initial render | < 3s on 4G |
| Place search (Nominatim) | < 600ms |
| AI response (first token) | < 2s (Groq streaming) |
| Timeline load (200 entries) | < 1s (paginated) |
| PDF export generation | < 5s (client-side) |
| Lighthouse score | ≥ 85 |

### Security

- bcrypt (cost 12) for passwords
- JWT 7-day + refresh rotation
- Supabase Row-Level Security (RLS) on all tables — users only see their own data
- LLM API keys stored in Vercel env vars, never exposed to client
- All LLM calls made server-side only
- Input sanitization before LLM prompt injection
- Rate limiting: 10 LLM requests/user/hour (Upstash rate limiter)

### Data Integrity

- **Soft deletes everywhere** — `deleted_at` timestamp, never `DELETE` from DB
- **No cascade deletes** — if user "deletes" a place, it's flagged, not removed
- All AI-generated content stored with the exact prompt used (for reproducibility)
- Weekly Supabase DB backup (built into Supabase free tier)

---

## 12. Free APIs & Databases

### Geocoding & Place Data

| API | Cost | Use |
|---|---|---|
| **Nominatim (OpenStreetMap)** | Free (1 req/sec) | Place search, geocoding |
| **GeoNames** | Free (20k credits/day) | Country/state hierarchy |
| **Natural Earth** | Free, static | Country GeoJSON boundaries |
| **REST Countries API** | Free, no key | Country flags, population, capital |

### LLM APIs

| Provider | Cost | Model | Use |
|---|---|---|---|
| **Groq** | Free tier (14.4k req/day) | Llama3-70B, Mixtral | Primary LLM |
| **HuggingFace Inference API** | Free tier | Mistral 7B, Zephyr | Fallback LLM |
| **OpenRouter** | Free models available | Various | Secondary fallback |

### Image / Illustration (for Artifacts — Optional)

| API | Cost | Use |
|---|---|---|
| **Unsplash API** | Free (50 req/hour) | Place hero images for PDF artifacts |
| **SVG country silhouettes** | Free (static assets) | Postcard illustrations without photos |

### Infrastructure

| Service | Free Limit |
|---|---|
| **Supabase** | 500 MB DB, 1 GB storage, 2 GB egress, Realtime |
| **Upstash Redis** | 10k req/day, 256 MB |
| **Vercel** | 100 GB bandwidth, 100k serverless invocations/day |
| **Resend** | 3,000 emails/month |
| **GitHub Actions** | 2,000 CI/CD minutes/month |

---

## 13. Data Retention Strategy (Forever)

This is a core product promise: **your travel data is never deleted.**

### 13.1 Principles

1. **Soft deletes only** — Every table has `deleted_at TIMESTAMPTZ`. UI shows "deleted" items as hidden, but they remain in DB.
2. **No hard deletes in application code** — A database constraint or trigger can prevent `DELETE` statements from the API layer.
3. **Photos are never purged** — If user "removes" a photo, `deleted_at` is set. The file in Supabase Storage is kept. Storage cost at 20 users with optional photos is negligible (< 200 MB).
4. **AI memories are permanent** — Once generated and saved, AI memories are archived forever. User can hide them but not destroy them.
5. **Audit log** — A lightweight `audit_log` table tracks every write operation (created/updated/deleted) with timestamp and user_id.

### 13.2 Database Backup

| Mechanism | Frequency | Retention |
|---|---|---|
| Supabase built-in backup | Daily (free tier) | 7 days rolling |
| Manual pg_dump export (script) | Weekly (GitHub Action) | Push to GitHub private repo |
| Supabase Point-in-Time Recovery | Available on paid tier | Upgrade path if needed |

**Recommended:** Add a weekly GitHub Action that runs `pg_dump` on Supabase and commits to a private GitHub repo. Free, automated, permanent.

```yaml
# .github/workflows/db-backup.yml
name: Weekly DB Backup
on:
  schedule:
    - cron: '0 2 * * 0'  # Every Sunday at 2am
jobs:
  backup:
    runs-on: ubuntu-latest
    steps:
      - name: Dump Supabase DB
        run: pg_dump ${{ secrets.DATABASE_URL }} > backup_$(date +%Y%m%d).sql
      - name: Commit to backup repo
        run: |
          git config --global user.email "backup@worldtracker"
          git add . && git commit -m "Weekly backup $(date)" && git push
```

### 13.3 "Recycle Bin" UI

- Users can see soft-deleted places in a "Recycle Bin" page
- Can restore from recycle bin anytime
- No automatic purge ever

### 13.4 Data Export (User-Owned Data)

- Users can export their full data as JSON at any time: `/settings/export`
- Includes all place logs, trips, AI memories, wishlists
- Generated client-side as a `.json` download — no server involvement

---

## 14. Phased Roadmap

### Phase 0 — Setup (Week 1–2)
- [ ] Next.js + TypeScript + Tailwind scaffold
- [ ] Supabase project + all tables from data model
- [ ] Prisma schema + migrations
- [ ] NextAuth.js email+password
- [ ] Vercel deployment + env vars (GROQ_API_KEY, DATABASE_URL, etc.)
- [ ] GitHub Actions: weekly DB backup workflow

### Phase 1 — Core MVP (Week 3–7)
- [ ] F01: Auth (signup, login, profile page)
- [ ] F02: 3D Globe (Globe.gl, country GeoJSON highlight)
- [ ] F03+F04: Log a place (Nominatim search, all levels)
- [ ] F05: Globe color-coding
- [ ] F06: Place detail card (photos optional)
- [ ] F07: My Places list view
- [ ] F08: Global stats dashboard
- [ ] F11: Interactive travel timeline
- [ ] F12: Country intelligence panel + Groq integration
- [ ] F09+F10: Friend invites + view friends' globes

**🚀 Internal Launch**

### Phase 2 — AI Memory Layer (Week 8–12)
- [ ] F13: AI memory generation (all 6 types)
- [ ] F14: Downloadable artifacts (PDF + PNG)
- [ ] F15: Wishlist (one-click add from country panel)
- [ ] F19: "On This Day" AI flashbacks
- [ ] F17: Milestone badges

### Phase 3 — Social & Planning (Week 13–18)
- [ ] F16: Trip planner
- [ ] F18: Social feed
- [ ] F20: Overlap map
- [ ] F21: Continent stats
- [ ] F22: Heat map
- [ ] F28: Public shareable profile

### Phase 4 — Polish
- [ ] F23: Export travel map (PNG)
- [ ] F27: Comments + reactions
- [ ] F28: Leaderboard
- [ ] Accessibility audit (WCAG AA)
- [ ] Performance audit (Lighthouse ≥ 85)
- [ ] PWA manifest (installable on mobile)

---

## 15. Open Questions & Risks

### Open Questions

| # | Question | Impact |
|---|---|---|
| OQ1 | Should multiple visits to the same place each get their own timeline entry? | Data model + UX |
| OQ2 | Should AI memories be private-only or shareable to friends? | Privacy model |
| OQ3 | Groq rate limits on free tier — hit by heavy AI usage in one day? | LLM architecture |
| OQ4 | Should coverage score (0–100) be purely AI-generated or deterministic (visited / total top spots)? | Accuracy + cost |
| OQ5 | Realistic vs stylized globe texture preference? | UX only |

### Risks & Mitigations

| Risk | Likelihood | Mitigation |
|---|---|---|
| Groq free API discontinues or changes limits | Low-Medium | HuggingFace fallback always ready; Ollama as local fallback |
| Supabase storage fills from photos | Very Low (20 users, photos optional) | Photo compression on upload; Cloudinary fallback |
| Globe.gl perf on low-end mobile | Medium | 2D Leaflet fallback auto-triggered for low-end devices |
| LLM hallucinating place names | Medium | Prompt explicitly constrains to only user's logged data; UI shows "AI-generated" badge |
| Nominatim 1 req/sec limit causes lag | Medium | Client debounce (300ms) + Redis cache of common searches |
| User loses all data (Supabase outage) | Very Low | Weekly pg_dump backup to GitHub private repo |

---

## 16. Appendix: AI Build Strategy

### Recommended AI Tools

| Tool | Use |
|---|---|
| **Claude (claude.ai)** | Architecture, PRD, complex logic, debugging |
| **Cursor IDE** | Full codebase AI coding (most recommended) |
| **v0.dev** | Generate React UI components from prompts |
| **Lovable.dev** | Full app scaffold from natural language |
| **GitHub Copilot** | Inline autocomplete |

### Recommended Build Order

```
1. Supabase schema setup (use Claude to generate SQL migrations)
2. Next.js scaffold + auth (use Lovable or v0 for initial scaffold)
3. Globe.gl integration (use Cursor with Globe.gl docs in context)
4. Place logging + Nominatim (straightforward API integration)
5. Timeline component (use v0 to generate UI, wire to DB with Cursor)
6. Groq LLM integration (use Claude to design prompt library)
7. Country intelligence panel (combine DB + Groq)
8. AI memory generation + download artifacts (jsPDF + html2canvas)
9. Friends + social features
10. Polish + PWA
```

### Key Prompts to Use with Claude

For Globe.gl + GeoJSON country highlighting:
> "Generate a Next.js component using Globe.gl that renders a 3D globe, loads country GeoJSON from Natural Earth, and highlights countries based on an array of ISO country codes passed as props. Visited countries should be green (#2ecc71), wishlisted amber (#f39c12), others dark grey."

For Groq country intelligence:
> "Write a Next.js API route at /api/ai/country-intel that takes a country_code and array of visited place names, builds a Groq Llama3-70B prompt to return: (1) top 10 missed spots as JSON array, (2) coverage score 0–100, (3) 3-day itinerary text. Cache result in Upstash Redis for 7 days."

For jsPDF artifact:
> "Write a function using jsPDF and html2canvas that takes a React ref to a styled div and downloads it as a PDF. The div contains: country name, coverage score, AI-generated text, and a list of visited places."

---

*Document maintained by Abhi. Version 2.0 — May 2026.*  
*Next review: After Phase 1 MVP launch.*