# Sahil — Portfolio (Website Release)

Public deployable website. Clean, self-contained, no editor required.

## Run locally
```bash
# from this folder (Website Release)
python -m http.server 8000
# then open
http://localhost:8000
```
Or double-click `../Preview.bat` from the parent `Portfolio` folder.

Do **not** open `index.html` directly via `file://` — YouTube embeds need HTTP (Error 153).

## Deploy

This folder is a static site. Push to GitHub and connect to any static host.

**Cloudflare Pages (recommended):**
1. Push this folder to GitHub (see below)
2. Cloudflare Dashboard → Create Project → Pages → Connect to Git
3. Select your repo, Framework preset: `None`, Build command: *(empty)*, Output directory: `/`

**GitHub Pages:**
- Repo Settings → Pages → Source: `main` branch, folder: `/ (root)` (this folder is the repo root)

**Netlify:**
- Drag and drop this folder to https://app.netlify.com/drop

No Python/Node is needed on the server.

## Update workflow
```bash
# 1. Edit in Portfolio Editor (saves to this folder automatically)
# 2. From THIS folder (Website Release):
git add .
git commit -m "Update portfolio content"
git push
# Hosting auto-deploys
```

## Create GitHub repo (when ready)
```bash
cd "D:\Software Development\Portfolio\Website Release"
git init
git add .
git commit -m "Initial portfolio release v2.1"
# create empty repo on github.com first, then:
git remote add origin https://github.com/<username>/portfolio.git
git branch -M main
git push -u origin main
# Or with GitHub CLI:
# gh repo create portfolio --public --source=. --remote=origin --push
```

Check first:
```bash
git --version
gh --version
gh auth status
```

## Version tags
```bash
git tag -a v2.1.0 -m "Release v2.1"
git push origin v2.1.0
```

## Files in this release
```
index.html      — website
style.css       — styles (Vidstack + responsive)
script.js       — rendering + Vidstack player
config.js       — content (single source of truth)
assets/images/  — thumbnails / photos
```
`data/content.json` is not required for the public site (kept in parent for editor).

## Notes
- `config.js` is the source the site reads (`<script src="config.js">` with cache-bust).
- Editor writes to this folder directly when `Website Release` exists.
- Keep `assets/images` under 5MB total for fast loads.
