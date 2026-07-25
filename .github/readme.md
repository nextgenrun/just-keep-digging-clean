# GitHub Safety Automation

`workflows/quality-gates.yml` runs the structural, deep-regression, production
package, and optional deployed-canary workers. Protect `main` with the final
`Safety gate` check so incomplete workers cannot be merged.

`workflows/rollback-candidate.yml` rebuilds and revalidates a previously green
commit as a downloadable package. It does not push, revert, or deploy anything.
