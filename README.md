# 🌍 WorldTracker — Premium 3D AI Travel Log & Memoir Generator

WorldTracker is a premium, feature-rich, and visually stunning 3D travel visualization dashboard. It allows globetrotters to log their travel memories, attach beautiful photos, group places into multi-day trips, track their continent achievements, and generate high-fidelity AI-powered memoirs and postcards.

Designed with **modern aesthetics**, **mobile-first layouts**, **sleek glassmorphism**, and **smooth interactive animations**, the application offers a premium user experience that works perfectly across all desktop and mobile devices.

---

## ✨ Key Features

### 1. 🔮 Interactive 3D Globe Viewer
* **Dual Visual Modes**: Easily toggle between **Realistic** (Google Hybrid satellite imagery with high-resolution roads) and **Stylized** (Sleek dark-matter vector base tiles by CartoDB).
* **Hexagonal Density Columns (Heatmap)**: Clicking the **Layers** toggle aggregates close-range markers into beautiful, glowing 3D pillars showing your travel density.
* **Autopilot Storyteller**: Let the autopilot take the wheel and fly you from pin to pin, telling the visual story of your multi-stop journeys.
* **Sub-national Drill Down**: Click on supported countries to zoom in and load district/province boundaries, dynamically colored based on visited, friend-visited, or wishlisted status.
* **Global Conquest HUD**: Toggle the conquests display to see a breakdown of your exploration progress across the 7 continents.

### 2. 📸 Media System & External Album Links
* **Supabase Storage Integration**: Compress high-resolution photos on-the-fly (capped at 800px JPEG via HTML5 canvas) to stay within the free-tier storage limits (1 GB storage, 2 GB bandwidth).
* **iCloud/Drive Linking**: Dedicated **"📎 Link Photo Album"** field on logs to attach shared iCloud, Google Drive, or Google Photos albums.
* **Rich Thumbnails**: Embedded visual hero headers across timeline logs, map tooltips, and souvenir cards.

### 3. 🤖 AI Souvenir Memory Console
* **Custom Notes Guidance**: A **"Your Notes for AI"** textarea allows you to feed raw diary scribbles, sensory highlights, or specific memories directly to guide the AI narrator.
* **Multiple Genres**:
  * *Vintage Postcard* (evocative, under 150 words)
  * *Travelogue Diary* (approx 350 words, rich narrative)
  * *Country Memoir* (summarizes your total footprint across a country)
  * *Letter from the Unvisited* (a playful invitation written by cities you skipped)
* **High-Fidelity Offline Simulator**: Preconfigured with extensive simulation databases for 25 major countries so the AI functions beautifully out-of-the-box even without a Groq API key!
* **Print & Exports**: One-click download of your generated memories as pristine **PDFs** (portrait or landscape depending on the genre) or beautiful **PNG souvenirs**.

### 4. 🗂️ Travel Logs & Multi-Stop Trip Sections
* **Trips Planner**: Group place logs into cohesive trip folders to visualize multi-stop routes with custom AI Trip Travelogues.
* **Recycle Bin**: Soft-delete safety net. Access deleted logs directly in Settings to review and restore them seamlessly.
* **Deep Timeline Filtering**: Sort logs dynamically (Newest, Oldest, Rating, A-Z) and quick-filter via year chips or rating thresholds ($\ge N \bigstar$).

---

## 🛠️ Technology Stack

* **Core**: React 19, TypeScript, Vite, TailwindCSS (for sleek CSS rendering and responsive configurations)
* **3D Visuals**: `three.js`, `globe.gl` (high-performance canvas-based coordinate plotting)
* **State Management**: Zustand (for lightning-fast localized storage and cloud sync listeners)
* **Database & Cloud**: Supabase (PostgreSQL Database, Auth, Storage bucket)
* **AI Engine**: Groq API Client (Llama 3.3-70b-versatile for high-fidelity memoirs and Llama 3.1-8b-instant for fast country route recommendations)

---

## ⚙️ Environment Configuration

To run the application locally, copy the `.env.example` file to `.env` in the root directory and configure the variables:

```bash
# ── Supabase Credentials
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key

# ── Groq AI Credentials (Optional - Falls back to local simulated database if empty)
VITE_GROQ_API_KEY=gsk_your-groq-api-key
```

---

## 💾 Supabase Database Setup

Run the following consolidated SQL query inside your **Supabase SQL Editor** to automatically spin up all tables (`place_logs`, `wishlists`, `ai_memories`), enable Row-Level Security (RLS) policies, configure the public storage bucket for travel photos, and write storage access rules:

```sql
-- 1. Create Place Logs table
CREATE TABLE IF NOT EXISTS place_logs (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL,
  place_name TEXT NOT NULL,
  place_type TEXT NOT NULL,
  country_code VARCHAR(2) NOT NULL,
  country_name TEXT NOT NULL,
  state_name TEXT,
  city_name TEXT,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  visited_at DATE,
  visited_at_end DATE,
  visit_count INT DEFAULT 1,
  rating INT,
  notes TEXT,
  tags TEXT[],
  visibility VARCHAR(10) DEFAULT 'friends',
  ai_memory_id TEXT,
  photo_url TEXT DEFAULT NULL,
  photo_external_url TEXT DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- Enable Row Level Security (RLS) so users only manage their own data
ALTER TABLE place_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own place logs" ON place_logs
  FOR ALL TO authenticated USING (auth.uid() = user_id);

-- 2. Create Wishlists table
CREATE TABLE IF NOT EXISTS wishlists (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL,
  place_name TEXT NOT NULL,
  place_type TEXT,
  country_code VARCHAR(2) NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  priority INT DEFAULT 2,
  notes TEXT,
  ai_suggestion_source TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

ALTER TABLE wishlists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own wishlist" ON wishlists
  FOR ALL TO authenticated USING (auth.uid() = user_id);

-- 3. Create AI Memories table
CREATE TABLE IF NOT EXISTS ai_memories (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL,
  entity_type VARCHAR(15) NOT NULL,
  entity_id TEXT NOT NULL,
  memory_type VARCHAR(20) NOT NULL,
  prompt_used TEXT NOT NULL,
  generated_text TEXT NOT NULL,
  user_edited_text TEXT,
  model_used TEXT NOT NULL,
  generated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  mood VARCHAR(20)
);

ALTER TABLE ai_memories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own memories" ON ai_memories
  FOR ALL TO authenticated USING (auth.uid() = user_id);

-- 4. Create the storage bucket for travel photos
INSERT INTO storage.buckets (id, name, public)
  VALUES ('place-photos', 'place-photos', true)
  ON CONFLICT DO NOTHING;

-- 5. Storage Security Policies
CREATE POLICY "Users can upload their own photos"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'place-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Photos are publicly readable"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'place-photos');

CREATE POLICY "Users can delete their own photos"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'place-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
```

---

## 🚀 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Start the Development Server
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser to explore the interactive globe!

### 3. Build for Production
```bash
npm run build
```
This compiles the TypeScript files and bundles static assets into `/dist` using Rollup, optimized for deployment on Vercel, Netlify, or AWS.