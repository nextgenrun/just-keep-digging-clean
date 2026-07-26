# GitHub Safety Automation

`workflows/quality-gates.yml` runs the structural, deep-regression, production
package, and optional deployed-canary workers. Protect `main` with the final
`Safety gate` check so incomplete workers cannot be merged.

`workflows/rollback-candidate.yml` rebuilds and revalidates a previously green
commit as a downloadable package. It does not push, revert, or deploy anything.

`workflows/shop-ui-uptime.yml` validates the consumptive `E` interaction path,
runtime-health wiring, production package, and served Bobo/shop modules on
every `main` push. If the exact tip fails, it verifies that no newer push
exists, reverts only that commit, pushes the rollback, and opens an incident.
