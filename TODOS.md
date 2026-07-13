# TODOS

## Soft-delete / undo for cascade deletes
**What:** Instead of hard-deleting boards/columns/workspaces immediately, mark them
`deleted_at` and purge after N days, with an "Undo" toast for ~10 seconds after delete.

**Why:** Phase 1 eng review (Issue 6) approved cascade-delete-with-confirmation for
boards/columns/workspaces with children. A confirmation dialog reduces but doesn't
eliminate fat-finger data loss.

**Pros:** Real safety net beyond a confirmation dialog.

**Cons:** Every query needs a `deleted_at IS NULL` filter, plus a cleanup job — real
added surface for a wedge that has zero validated users yet.

**Context:** Deferred deliberately during Phase 1 review because the confirmation
dialog from Issue 6 is enough safety net for a pilot with ~3 known users. Revisit once
real users are touching the app and a fat-fingered delete actually happens, or before
inviting users beyond the initial pilot group.

**Depends on / blocked by:** None — can be picked up independently any time after
Phase 1 ships.
