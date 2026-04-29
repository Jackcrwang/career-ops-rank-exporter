# Career Ops Rank Exporter

A lightweight CSV ranking helper for job scan outputs and manual application prioritization.

I built this project to make my job search workflow easier. The script turns local job pipeline results into a clean ranked CSV. It helps me decide which roles are worth applying to first.

## What this project does

- Reads local job entries from `data/pipeline.md`
- Parses each pending job into company, role, and URL fields
- Applies rule based scoring for target function fit, seniority fit, skills fit, authorization safety, and conversion likelihood
- Assigns a recommendation label such as `APPLY HIGH`, `APPLY`, or `MAYBE`
- Exports a clean CSV file for manual review
- Also writes a JSON file for later analysis or debugging

## Why I built it

Raw job scan results are useful, but they are hard to review manually when there are many roles. I wanted a simple way to turn job pipeline outputs into a ranked list that I could open in Excel or Google Sheets.

The goal was not to automate final decisions. The goal was to reduce manual sorting time and make my application process more consistent.

## Scoring logic

The script scores each role using five simple dimensions:

| Dimension | Purpose |
| --- | --- |
| Function fit | Checks whether the role matches target analytics, BI, data, or business analyst directions |
| Seniority fit | Penalizes roles that look too senior, such as director, principal, staff, or head roles |
| Skills fit | Checks whether the title likely values analytics, forecasting, strategy, or BI skills |
| Authorization safety | Flags early risks such as citizenship, green card, ITAR, EAR, export control, or security clearance wording |
| Conversion likelihood | Estimates whether the role is worth application time based on title fit and expected accessibility |

The final score is the average of these dimensions. The output keeps roles rated `MAYBE` or above.

## Output

The script writes output files into the `output` folder:

```text
output/rank-YYYY-MM-DD.csv
output/rank-YYYY-MM-DD.json
```

The CSV contains the most important review fields:

```text
rank, company, role, location, url, archetype, score, recommendation, key_reason, main_risk, authorization_note
```

## Example usage

Place `rank.mjs` in the root folder of a local workflow that has this file:

```text
data/pipeline.md
```

Then run:

```bash
node rank.mjs
```

## Example input format

The script expects pending jobs in this format:

```text
- [ ] https://example.com/job | Example Company | Data Analyst
- [ ] https://example.com/job-2 | Example Company | Business Intelligence Engineer
```

## Example output

See `sample/rank-example.csv` for a small example of the CSV output format.

## Project scope

This repository contains my independent helper script and documentation. It does not include the original career-ops project source code.

## Attribution

This project was designed to work with my local career-ops style workflow.

The original career-ops project was created by Santiago Fernandez de Valderrama and is licensed under the MIT License.

This repository is not affiliated with or endorsed by the original career-ops project.

## License

This project is released under the MIT License. See `LICENSE` for details.
