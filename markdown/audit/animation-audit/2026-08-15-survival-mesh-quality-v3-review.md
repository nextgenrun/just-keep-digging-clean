# Survival mesh quality V3 review

## Candidate

V3 is a final-pixel presentation pass over the approved motion-locked V2.1
frames. It increases material colour separation, lowers the pale/washed look,
adds restrained local contrast and restores micro-detail after the 2048-to-256
downsample. Full-glove correction remains present.

The grade changes RGB only. All 164 frame alpha channels, registrations,
family counts and configured cadences are identical to V2.1. Runtime remains
unchanged.

## Animation review

The comparison package includes one complete six-family GIF and six
family-specific GIFs at native cadence: walk 16 fps, run 30 fps, side mining
30 fps, up mining 27 fps, down mining 30 fps and flight 16 fps. This avoids the
false choppiness caused by presenting every family at one slow review rate.

Actual motion smoothing is not bundled into the V3 colour grade. A later motion
candidate must remain family-by-family and pass foot-lock, knee, pelvis,
contact, facing, loop-seam, transition-size and collider authority gates before
promotion. It must not use cross-fade or optical-flow frames that can ghost or
warp hands.

## Approval boundary

All outputs are under
`visual-approval-previews/2026-08-15-survival-mesh-quality-v2-v3/`. Nothing is
referenced by Phaser. Approval of V3 visual quality does not authorize motion
retiming or runtime promotion.
