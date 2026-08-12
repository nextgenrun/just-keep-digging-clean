# Scene runtime authority

These modules provide framework-independent scene stability primitives.

- `SceneModeController` owns the base phase and nestable suspension tokens.
- `SceneLifecycleRegistry` tears down registered resources once, in reverse order.
- `FramePhaseScheduler` preserves registered phase order, quarantines presentation
  faults, and blocks the frame after simulation, progression, or persistence faults.

Concrete Phaser UI and recovery presentation stay in `ui/scenes`; these systems
depend only on canonical values.
