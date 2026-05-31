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

Run the following SQL queries inside your **Supabase SQL Editor** to configure your database schema and enable public storage policies for travel photos:

```sql
-- 1. Extend place_logs table mapping
ALTER TABLE place_logs
  ADD COLUMN IF NOT EXISTS photo_url TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS photo_external_url TEXT DEFAULT NULL;

-- 2. Create the storage bucket for travel photos
INSERT INTO storage.buckets (id, name, public)
  VALUES ('place-photos', 'place-photos', true)
  ON CONFLICT DO NOTHING;

-- 3. Storage Security Policies
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