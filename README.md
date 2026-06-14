# ResumeFit ATS Checker

A deployable static web application that lets a user upload a resume, calculate an ATS-readiness score, review recommendations, and download an ATS-friendly text draft.

## Features

- Browser-only resume analysis for privacy.
- PDF and plain-text resume parsing.
- Downloads preserve the uploaded format: PDF uploads export PDF, text uploads export TXT.
- Optional job description matching for keyword alignment.
- ATS score across parseability, keyword match, impact signals, and missing basics.
- Prioritized format and content recommendations.
- Editable generated resume draft with copy and download actions.

## Run locally

Open `index.html` directly in a browser, or serve the folder:

```bash
python3 -m http.server 4173
```

Then visit `http://localhost:4173`.

## Deploy

This is a static app. Deploy the `ats-resume-checker` folder to Netlify, Vercel, GitHub Pages, Cloudflare Pages, or any static host.

No backend is required. PDF parsing, PDF export, and icons load from CDNs, so the deployed app needs internet access.

## Notes

The score is a transparent heuristic to catch common ATS parsing and tailoring risks. It is not a guarantee of ranking inside any specific employer ATS.
