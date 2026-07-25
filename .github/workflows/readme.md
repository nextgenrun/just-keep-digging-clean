# Workflows

- `quality-gates.yml` is the fail-closed pull-request, main-branch, merge-queue,
  nightly, and manual safety pipeline.
- `rollback-candidate.yml` creates a read-only, validated rollback artifact from
  an explicitly selected commit or tag.

Both workflows use read-only repository permissions and disable persisted Git
credentials. Deployment remains a separate, explicitly authorized operation.
