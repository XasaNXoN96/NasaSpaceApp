# Singularity’s

A student project: what six NASA explorers left behind, and whether each one still works.
Apollo 11 laser retroreflector, Voyager 1, Sojourner, Spirit, Opportunity and Perseverance.

## Open it

The site lives in `public/`. Serve that folder and open it in a browser, for example:

    python -m http.server 8781 --directory public

then go to http://localhost:8781. (Opening `public/index.html` by double-click also works, but browsers
block the 3D viewer's modules from disk, so you get the NASA photos instead of 3D.)
The page needs an internet connection for NASA's 3D models, some photos and the live Perseverance data;
without one it still works and shows the photos in `public/img/`.

## What is where

| Path | What it holds |
|---|---|
| `public/index.html` | The page: markup, the small start-up script and the 3D viewer |
| `public/style3.css` | All styles |
| `public/js/data.js` | **The facts.** Every object's status, dates, numbers and sources. Change a fact here and it changes everywhere |
| `public/js/learn-data.js` | Glossary terms, search keywords and quiz questions |
| `public/js/i18n-strings.js` | Russian and Uzbek translations, keyed by the English text |
| `public/js/hero.js`, `sections.js`, `site.js`, `ui.js` | The page's behaviour: hero, sections, pages and live data, settings and search |
| `public/js/films.js`, `sound.js`, `present.js` | Films, sound and presentation mode |
| `public/models/` | Optional local copies of NASA's 3D models (see the note inside): the site then works offline |
| `public/img/photos`, `public/img/films` | NASA photographs used by the site and the films |
| `NASA_объекты_таблица.xlsx` | The team's fact table, the source of `js/data.js` |

## Publish it (Firebase Hosting)

The site is hosted on Firebase (`firebase.json` serves the `public/` folder). From this folder run:

    firebase deploy --only hosting:singularitynasa

When you change a CSS or JS file, raise the `?v=` number on its `<link>`/`<script>` tag in
`public/index.html`, so visitors' browsers fetch the new file instead of a cached old one.

## Credits

Images, 3D models and data: NASA/JPL-Caltech, NASA VTAD and the other NASA teams credited on each picture.
Singularity’s is an independent student project, not affiliated with or endorsed by NASA.
