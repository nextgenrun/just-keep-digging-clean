# Bed guidance runtime evidence

The live test used the canonical serve.py and production PlayScene in a fresh
isolated browser. All checkpoint writes ended in an in-memory writer.

Verified through real UI clicks and keyboard input:
- Pause overview Save and Saves-tab Save both resume play and show bed directions.
- Ignored arrow stays for 8 seconds, then fades out over 650 ms.
- Moving toward the bed keeps the arrow after 9 seconds and through a pause.
- Arrival removes the arrow. Sleep plus blessing selection writes one checkpoint.
- An underground Save attempt points upward and writes no additional checkpoint.
- The guide adapts to 960 x 640 and 1280 x 720 viewports.
- When the bed is visible, the instruction moves above it to keep the destination clear.
- A new Save attempt clears stale Rest Saved feedback.

The underground location is an explicitly authored empty test alcove. Normal
safe teleport correctly rejects solid terrain; the fixture asserts placement.
The final run had no page errors or failed requests.

01: Save request with an offscreen destination.
02: Accepted directions persist while the player pauses movement.
03: Arrival clears the arrow.
04: Underground directions, with no checkpoint written.
05: Smaller viewport.
06: Arrow over the visible bed; instruction above the scene.
