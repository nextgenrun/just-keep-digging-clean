# Workflows

- `quality-gates.yml` is the fail-closed pull-request, main-branch, merge-queue,
  nightly, and manual safety pipeline.
- `rollback-candidate.yml` creates a read-only, validated rollback artifact from
  an explicitly selected commit or tag. It also triggers automatically when a
  main-branch push fails `Dig Game Safety Gates`, checks out that failed
  commit's first parent, revalidates it, and publishes it only when every
  rollback check passes.

Both workflows use read-only repository permissions and disable persisted Git
credentials. They never rewrite a branch. Deployment remains a separate,
explicitly authorized operation.
