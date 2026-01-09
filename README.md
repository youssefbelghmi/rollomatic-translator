# Rollomatic Technical Translator — Frontend

This repository contains **only the public frontend website** (no backend yet).

## Deploy on GitHub Pages
1. Go to **Settings → Pages**
2. Source: **Deploy from a branch**
3. Branch: `main` / Folder: `/(root)`
4. Save — your site will be published at a URL like:
   `https://<username>.github.io/rollomatic-translator/`

## Connect the backend later
When your Azure backend API is ready, set the URL in `app.js`:

```js
const API_URL = "https://your-backend-domain/translate";
```

> Do **not** put any API keys in the frontend. Keep keys on the backend only.
