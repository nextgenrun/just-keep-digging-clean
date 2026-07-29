# Multi-cave entry repair

## Failure

Production generation created integrated caves and visible scenic mouths, but
`CaveEntryController` admitted only `standaloneScene` caves. Production sets
that flag to `false`, so the approved mouth was decorative and the working
`CaveScene` gameplay stack could only be reached through review mode. In the
scenic main renderer, `CaveScene` also inherited no legacy tile atlas; reaching
it produced a Phaser `PutTileAt` crash after drawing only the background.

## Repair

- Every Level One `authored-gap` or `level-one-procedural` cave with an AIR
  entry and solid supporting floor is now interactable.
- Invalid or overwritten entry metadata is rejected instead of producing a
  broken prompt.
- All six cave identities choose an approved existing cave background, apply a
  depth-safe resource bias, and place one persistent mineable signature node.
- The compact interior names the discovered cave, shows its authored hint, and
  uses the approved cave-mouth art for the return route.
- The compact renderer now creates its tile atlas on demand when the scenic main
  world did not create one, so the player, solid floor, rewards, and exit paint.
- Entering, collecting, exiting, and re-entering retain the existing save
  contract.

## Health, validation, and rollback

`CaveEntryController.getHealthSnapshot()` reports known, usable, interactive,
and invalid entrances. The focused repair contract verifies multiple live
entrances, collision-safe admission, six signature nodes, and collection
persistence.

Use `?caveEntrances=0` to disable integrated cave interaction while preserving
the generated world and saved cave rewards.
