# Website History report UI

Editable source for the skill's offline HTML report. Normal skill users run the bundled renderer without installing anything.

```sh
npm ci --prefix ui/report
npm run build --prefix ui/report
node skills/website-history/scripts/render-report.mjs examples/report-leads.json examples/report-leads.html
node skills/website-history/scripts/render-report.mjs examples/report-customers.json examples/report-customers.html
python3 scripts/export-skill.py
```

The build inlines React and Motion into the skill assets. It does not include fonts, analytics, remote images, or CDN scripts. The renderer safely embeds the normalized JSON and a readable fallback for browsers with JavaScript disabled. Search, filters, disclosures, CSV export, reduced-motion support, pagination, and full-report printing run locally.

The list is adapted from [React Bits Animated List](https://reactbits.dev/components/animated-list), installed with:

```sh
npx shadcn@latest add @react-bits/AnimatedList-JS-CSS --yes
```

The requested `@react-bits/Components-JS-CSS` identifier failed registry lookup. `AnimatedList-JS-CSS` is the specific list component. Its adaptation uses semantic list elements, native keyboard-accessible disclosures, one-time subtle entrance motion, stable row keys, and no global keyboard listener. It is incorporated as part of this report application, not a component-library export.

The palette follows the supplied brand reference: cream `#f5f0e7`, navy `#132440`, violet `#7045ff`, and sage `#5f7e6c`. Serif headlines and system sans-serif labels need no external font download. The illustrated cover cards are decorative, not data; stage-mix proportions and counts use actual report rows.

Third-party notices live in `skills/website-history/assets/report/`. React Bits' license applies to its adapted list; the repository MIT license does not replace it. Rebuild the assets and regenerate both examples whenever UI source changes.
