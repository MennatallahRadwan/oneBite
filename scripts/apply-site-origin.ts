import {readFileSync, writeFileSync, existsSync} from 'node:fs';

// public/sitemap.xml is checked in with a placeholder origin because the file
// has to be readable and reviewable in the repo. The real origin is only known
// at deploy time, so it is substituted into the built copy instead. src/seo.ts
// needs no equivalent — it reads window.location.origin at runtime.
const PLACEHOLDER = 'https://onebite.example';
const target = 'dist/sitemap.xml';

const origin = process.env.SITE_ORIGIN?.trim().replace(/\/+$/, '');

if (!origin) {
  console.warn(
    `SITE_ORIGIN is not set, so ${target} still points at ${PLACEHOLDER}. ` +
      'Search engines will ignore the sitemap until it names the real domain.'
  );
  process.exit(0);
}

if (!/^https?:\/\/[^/\s]+$/.test(origin)) {
  throw new Error(`SITE_ORIGIN must be a bare origin such as https://www.example.com, got "${origin}".`);
}

if (!existsSync(target)) {
  throw new Error(`${target} is missing — run the client build before this script.`);
}

const source = readFileSync(target, 'utf8');
if (!source.includes(PLACEHOLDER)) {
  console.warn(`${target} contains no "${PLACEHOLDER}" to replace; leaving it untouched.`);
  process.exit(0);
}

writeFileSync(target, source.replaceAll(PLACEHOLDER, origin));
console.log(`Rewrote ${target} to ${origin}.`);
