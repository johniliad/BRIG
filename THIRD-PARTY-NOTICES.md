# Third-party notices — BRIG

**Product:** BRIG — CISO Board Reporting Intelligence Generator
**Owner:** Dr. John Iliadis · <https://www.iliadis.net/>
**This document:** attribution and licence texts for third-party software used by BRIG

BRIG itself is licensed under the **Apache License 2.0** (see `LICENSE`). It also contains
third-party components, which remain under their own licences.

**This file must ship with every deployment.** The build copies it to `dist/THIRD-PARTY-NOTICES.txt`
and `dist/LICENSE.txt`; both are linked from the site footer (`/THIRD-PARTY-NOTICES.txt`,
`/LICENSE.txt`) and from the branded error pages. Distributing the built app without these files
would breach the MIT/ISC/Zlib conditions reproduced in section 4.

---

## 1. Components distributed with the built application (`dist/`)

These packages are bundled into `dist/assets/*.js` by Vite, i.e. they are **conveyed to the browser**
and therefore require their copyright and permission notices to be reproduced (section 4).

| Component | Version | Licence | Copyright notice |
|-----------|---------|---------|------------------|
| React | 18.3.1 | MIT | Copyright (c) Facebook, Inc. and its affiliates |
| React DOM | 18.3.1 | MIT | Copyright (c) Facebook, Inc. and its affiliates |
| scheduler | 0.23.2 | MIT | Copyright (c) Facebook, Inc. and its affiliates |
| loose-envify | 1.4.0 | MIT | Copyright (c) 2015 Andres Suarez |
| js-tokens | 4.0.0 | MIT | Copyright (c) 2014-2018 Simon Lydell |
| Chart.js | 4.6.1 | MIT | Copyright (c) 2014-2024 Chart.js Contributors |
| @kurkle/color | 0.3.4 | MIT | Copyright (c) 2018-2024 Jukka Kurkela |
| react-chartjs-2 | 5.3.1 | MIT | Copyright (c) 2020 Jeremy Ayerst |
| PptxGenJS | 3.12.0 | MIT | Copyright (c) 2015-2022 Brent Ely |
| JSZip | 3.10.2 | MIT *(chosen from MIT OR GPL-3.0-or-later)* | Copyright (c) 2009-2016 Stuart Knightley, David Duponchel, Franz Buchinger, António Afonso |
| lie | 3.3.0 | MIT | Copyright (c) 2014-2018 Calvin Metcalf, Jordan Harband |
| immediate | 3.0.6 | MIT | Copyright (c) 2012 Barnesandnoble.com, llc, Donavon West, Domenic Denicola, Brian Cavalier |
| pako | 1.0.11 | MIT **and** Zlib | Copyright (C) 2014-2017 Vitaly Puzrin and Andrei Tuputcyn |
| readable-stream | 2.3.8 | MIT | Copyright Node.js contributors |
| core-util-is | 1.0.3 | MIT | Copyright Node.js contributors |
| string_decoder | 1.1.1 | MIT | Copyright Node.js contributors |
| inherits | 2.0.4 | ISC | Copyright (c) Isaac Z. Schlueter |
| isarray | 1.0.0 | MIT | Copyright (c) Julian Gruber |
| process-nextick-args | 2.0.1 | MIT | Copyright (c) 2015 Calvin Metcalf |
| safe-buffer | 5.1.2 | MIT | Copyright (c) Feross Aboukhadijeh |
| util-deprecate | 1.0.2 | MIT | Copyright (c) 2014 Nathan Rajlich |
| setimmediate | 1.0.5 | MIT | Copyright (c) 2012 Barnesandnoble.com, llc, Donavon West, Domenic Denicola |
| image-size | 2.0.3 | MIT | Copyright (c) 2013-Present Aditya Yadav |
| https | 1.0.0 | ISC | Copyright (c) hardus van der berg |

> JSZip: BRIG selects the **MIT** option of its dual licence and does not distribute JSZip under the
> GPL. pako is used under MIT **and** Zlib (both texts are reproduced in section 4).
> `isarray` and `https` ship without a `LICENSE` file in the npm tarball; their licence fields and
> upstream repositories state MIT and ISC respectively, and both texts are reproduced in section 4.

---

## 2. Build-time and development tooling (NOT distributed)

Used to type-check, bundle and test the app. None of this code is conveyed in `dist/`, so no notice is
required for it; it is listed for transparency and to make future audits easy.

| Component | Version | Licence |
|-----------|---------|---------|
| Vite | 6.4.6 | MIT |
| @vitejs/plugin-react | 4.7.0 | MIT |
| Rollup | 4.68.0 | MIT |
| esbuild | 0.25.12 | MIT |
| TypeScript | 5.9.3 | Apache-2.0 |
| Vitest | 4.1.12 | MIT |
| @types/react, @types/react-dom, @types/node | 18.3.x | MIT |

> If any of these ever becomes part of the shipped bundle (for example by importing a build tool at
> runtime), move it into section 1 and reproduce its notice here.

---

## 3. Optional server-side component (NOT bundled)

| Component | Licence | Status |
|-----------|---------|--------|
| PEAR `File_PDF` (FPDF-style class) | PHP License 3.01 | **Optional.** Not shipped with BRIG. Installed on the host via PEAR, uploaded to `api/vendor/`, or referenced by `pdf.file_pdf_path`. |

If you copy `File/PDF.php` into `api/vendor/` (i.e. you distribute it with the app), also copy its
`LICENSE`/header notice into that folder. When File_PDF is absent, `api/reports/pdf.php` falls back to
a print-ready HTML page, so BRIG works without it.

PHP, MySQL/MariaDB, Apache and cPanel are provided by the hosting environment and are not distributed
with BRIG.

---

## 4. Licence texts

### 4.1 MIT License

Applies to every component marked MIT in section 1, each with the copyright notice listed against it.

```
Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
```

### 4.2 ISC License

Applies to `inherits` (Copyright (c) Isaac Z. Schlueter) and `https`
(Copyright (c) hardus van der berg).

```
Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted, provided that the above
copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
```

### 4.3 Zlib License

Applies to the Zlib-licensed portions of `pako` (Copyright (C) 2014-2017 Vitaly Puzrin and
Andrei Tuputcyn).

```
This software is provided 'as-is', without any express or implied
warranty.  In no event will the authors be held liable for any damages
arising from the use of this software.

Permission is granted to anyone to use this software for any purpose,
including commercial applications, and to alter it and redistribute it
freely, subject to the following restrictions:

1. The origin of this software must not be misrepresented; you must not
   claim that you wrote the original software. If you use this software
   in a product, an acknowledgment in the product documentation would be
   appreciated but is not required.
2. Altered source versions must be plainly marked as such, and must not be
   misrepresented as being the original software.
3. This notice may not be removed or altered from any source distribution.
```

### 4.4 Apache License 2.0

BRIG's own licence. The full text is in `LICENSE` and is deployed as `/LICENSE.txt`.
TypeScript (build-time only) is also Apache-2.0.

---

## 5. Keeping this file accurate

Before every release:

1. `npm ls --omit=dev --all` — compare against section 1.
2. For any new package: add a row (name, version, licence, copyright) and, if the licence is not MIT,
   ISC, Zlib or Apache-2.0, add its full text to section 4.
3. Confirm `npm run build` still emits `dist/THIRD-PARTY-NOTICES.txt` and `dist/LICENSE.txt`
   (`scripts/copy-legal-notices.mjs`).
4. Confirm `/THIRD-PARTY-NOTICES.txt` and `/LICENSE.txt` are reachable on the deployed site and
   linked from the footer.

Remember: a licence obligation is triggered by **conveying the build**, not by publishing the source.
Anything inside `dist/` counts; anything in `devDependencies` that never reaches `dist/` does not.

