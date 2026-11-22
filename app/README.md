# ATLAS — A world worth knowing

Turn any geography test list into an interactive map, flashcards, and real exam-style quizzes.

- Paste a list of places → every one is pinpointed on a world map, numbered `1…N`
- Flashcards in both directions ("Where is Egypt?" / "What is this location?")
- Typed, dropdown, click-the-map, and full blank-map tests with automatic grading
- Learn mode drills the set in groups of 10 until every place sticks
- Mistake review, mastery tracking, and progress stats that persist
- Leaderboard ranking every attempt by accuracy, then fastest time

## Built-in example set

The example is **European Geography (Example)** with all 57 supplied locations,
in the supplied order. Labels are preserved, including “The Netherlands”,
“Bosnia & Herzegovina”, and “Vatican City (Holy See)”. For this AP World class,
“Macedonia” resolves to the **ancient kingdom of Macedon**, centered in northern
Greece, not modern North Macedonia. “Macedon” and “ancient Macedonia” are accepted.

Static and server modes share the same validated resolver. Existing example copies
with a modern-Macedonia row are upgraded in place, retaining their location IDs
and progress. Custom study sets are not changed.

## Midnight design

A calmer ATLAS: deep navy, crisp white and a soft citron accent. Space Grotesk
headings, Plus Jakarta Sans UI and JetBrains Mono details are bundled by
Next.js. The custom two-tone SVG glyphs and folded-map monogram replace the old
emoji, text-glyph controls and compass branding.

- Shorter, cleaner landing page with an interactive European map tour, four
  study routes, saved sets and a quick flip-clue quiz.
- Spacious study workspace, searchable place index, numbered pins, tour controls,
  place notes and all six study sections.
- Navy is the default; the optional daylight theme uses white and navy. Phone
  layouts, keyboard controls and reduced-motion support are retained.
- Brief, quiet milestone acknowledgements replace confetti. Navigation and
  buttons share one consistent icon, spacing and surface language.
- Smooth cursor-anchored zoom and locally bundled Natural Earth boundaries.
  Optional Esri terrain requires an internet connection.

The Natural Earth layer uses generalized **modern** country geometry. Water
features and historical regions use approximate dashed study extents; ancient
Macedonia is not a modern national border. Click grading retains the original
bounding extents and tolerances, rather than polygon containment.

### Existing data and file sharing

The study engine, 57 built-in places, modes and custom-set tools are retained.
Original study-set and progress storage keys remain unchanged. New `.atlas.json`
exports keep the legacy compatibility marker; old `.geomaster.json` files still
import.

**Class codes have been removed**: no entry form, displayed codes, copy controls,
client lookup helper or code-lookup API route remains. Old internal database
fields are retained only for compatibility with existing saved data. Use JSON
export/import to move a custom set between devices.

In static mode, sets, progress and leaderboard scores stay in this browser.
Server mode enables shared database-backed leaderboards. Export important sets
as a backup; clearing browser storage removes local data.

## Release archive

The ATLAS Midnight release ZIP includes this source project and a
`ready-to-upload/` folder containing the production static build. Upload that
folder's **contents** to a static host (its `index.html` must be at the host root),
or serve it locally:

```bash
python3 -m http.server 3000 --directory ready-to-upload
```

Open `http://localhost:3000`; do not double-click the HTML file. To change the
app, use the source and rebuild as below. A fresh build writes to `out/`, not
`ready-to-upload/`.

## Run locally

```bash
npm install
GEOMASTER_STATIC=1 npm run build
python3 -m http.server 3000 --bind 0.0.0.0 --directory out
```

Open `http://localhost:3000`. The static app works without a database. To edit
with hot reload in local-storage mode, use `GEOMASTER_STATIC=1 npm run dev`.

Checks: `npm run lint`, `npm run typecheck`, and the static production build.
Node 22 is recommended. Keep the bundled `public/data/countries.geojson` file;
its source is Natural Earth, public domain.

---

## Deploying to EdgeOne Pages

ATLAS builds in **two modes**, so it fits either EdgeOne deployment style.

| | Static mode | Server mode |
| --- | --- | --- |
| Database needed | No | Yes (PostgreSQL) |
| Build command | `GEOMASTER_STATIC=1 npm run build` | `npm run build` |
| Output directory | `out` | `.next` |
| Study sets & progress | Saved in the browser | Saved in the database |
| Leaderboard | This device only | **Shared by the whole class** |

### Option A — Static (recommended, works with no setup)

This is the fix if your uploads kept failing: a static build has no server and
no database, so there is nothing left to misconfigure.

**Upload by hand**

```bash
npm install
GEOMASTER_STATIC=1 npm run build     # creates ./out with index.html
```

Then open <https://pages.edgeone.ai/manage>, choose **Direct Upload**, and
upload the **contents of the `out` folder** (not the folder itself — EdgeOne
requires `index.html` at the top level of what you upload).

**Or connect Git** — EdgeOne reads [`edgeone.json`](./edgeone.json) from the
repo and already uses the static build command, `out` directory, and Node
22.11.0. No environment variables required.

> Static mode pre-renders pages for the first 40 study sets on a device. If you
> need more, raise `MAX_STATIC_SETS` in `src/app/set/[id]/layout.tsx`.

### Option B — Server mode with a shared class leaderboard

Use this when you want every student's score on **one** leaderboard.

1. Create a PostgreSQL database (Neon, Supabase, or Tencent Cloud all work) and
   copy its connection string.
2. Import the repo into EdgeOne Pages and set **Framework preset: Next.js**.
3. Override the settings from `edgeone.json`:
   - Build command: `npm run build`
   - Output directory: `.next`
4. Add an environment variable `DATABASE_URL` with your connection string.
5. Deploy, then run `npx drizzle-kit push` locally once (with the same
   `DATABASE_URL`) to create the tables.

### If a deploy still fails

| Message in the log | Cause | Fix |
| --- | --- | --- |
| `Output directory ... does not exist` | Mode/output mismatch | Static → `out`; server → `.next` |
| 404 after Direct Upload | `index.html` not at the top level | Upload the *contents* of `out`, not the folder |
| `Cannot find module` / Tailwind or TypeScript missing | EdgeOne sets `NODE_ENV=production`, skipping devDependencies | Install command must be `npm install --include=dev` (already in `edgeone.json`) |
| `DATABASE_URL is not set` | Server mode without a database | Add the variable, or switch to static mode |
| Node version errors | Unsupported Node | Use a pre-installed version such as `22.11.0` |

---

## Deploying to Render

### Fix for `Using Python` / `pip install -r requirements.txt`

This is a **Next.js/Node application**, not a Python application. If the log says:

```text
Using Python version ...
Running build command 'pip install -r requirements.txt'
```

then the service was created with Render's **Python runtime**. That runtime and
build command live in the Render service settings; pushing another commit does
not change them. There should not be a `requirements.txt` in this repository.

The repository now includes a production [`Dockerfile`](./Dockerfile) and a
Docker [`render.yaml`](./render.yaml), so Render cannot guess the language.

#### Recommended clean deployment

1. Push the latest commit to GitHub.
2. In Render, delete the incorrectly configured **Python web service**. Keep any
   Postgres database you want to reuse.
3. Click **New + → Blueprint** (not “Web Service”).
4. Select this repository. Render will read `render.yaml` and show:
   - Runtime: **Docker**
   - Web service: **geomaster**
   - Database: **geomaster-db**
5. Click **Apply**.

The Docker container builds Next.js, applies the Drizzle schema on startup, runs
on Render's assigned `PORT`, and exposes `/api/health` for health checks.

### Fix for `package-lock.json: not found`

Older versions of this Dockerfile required both `package.json` and
`package-lock.json`, which caused Docker to stop at `COPY` if the lockfile was
missing from GitHub. The current Dockerfile accepts either state:

- If `package-lock.json` exists, it uses `npm ci`.
- If only `package.json` exists, it uses `npm install`.

Push the current `Dockerfile`, then choose **Manual Deploy → Clear build cache &
deploy** in Render. Committing `package-lock.json` is still recommended for
reproducible builds, but it is no longer required for the image to build.

#### Manual deployment instead

If you do not use the Blueprint:

1. Create a new **Web Service** and select **Docker** as the language/runtime.
2. Dockerfile path: `./Dockerfile`
3. Health check path: `/api/health`
4. Create/link a Render Postgres database.
5. Add `DATABASE_URL` using that database's **Internal Database URL**.

Do not enter a Python build command. Do not enter `pip install`. The Dockerfile
provides both the build and start commands.

### If Render says it cannot find `app` or `pages`

Verify that **`src/app/page.tsx`** is visible on GitHub. If it is missing, push
again with Git instead of dragging files into GitHub's web uploader:

```bash
git add .
git commit -m "Deploy ATLAS"
git push origin main
```

The included `.gitignore` keeps `node_modules`, `.next`, and secret `.env` files
out of GitHub.

---

## Server-mode development

```bash
npm install
cp .env.example .env      # point DATABASE_URL at your Postgres
npx drizzle-kit push      # create the tables
npm run dev               # http://localhost:3000
```

To preview the static build exactly as EdgeOne serves it:

```bash
GEOMASTER_STATIC=1 npm run build
npx serve out
```

## Tech

Next.js (App Router) · TypeScript · Tailwind CSS · Drizzle ORM · PostgreSQL ·
Leaflet with bundled Natural Earth cartography and optional Esri terrain · OpenStreetMap/Nominatim geocoding with a curated
gazetteer of ~330 study-relevant places.
