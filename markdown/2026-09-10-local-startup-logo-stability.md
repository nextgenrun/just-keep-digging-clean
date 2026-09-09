# Local startup and logo stability — 2026-09-10

Fixed the reported localhost 0% startup stall and logo background bleed.

## Server

The exact localhost launch URL reproduced the stall. Multiple Python processes
were serving port 8080; the old Windows SO_REUSEADDR binding admitted competing
servers. serve.py now requests exclusive Windows ownership and reports an
occupied port instead of creating another listener. Successful request logging
is suppressed so a full module graph cannot fill an unread stdout pipe and block
all sixteen workers. Media supports bounded, open-ended and suffix byte ranges,
including HEAD and 416 responses; canceled transfers are handled quietly.
The existing screenshot upload route and development no-cache headers remain.

## Logo

The full-color animation remains enabled. Its authored static poster now acts
as a black silhouette beneath the video, and the dark contour remains static.
This blocks scenic leakage where the animated alpha varies without boosting
letter brightness or adding a rectangular plaque. Motion-disabled and media
failure paths restore the normal-color poster.

## Validation

The actual localhost game passed the prior 0% point and reached the opening
prompt without browser warnings or errors. HTTP checks confirmed 206 media
responses. testing/2026-09-10-local-server-contract.py passed real HTTP range,
HEAD, invalid range, duplicate bind and 1,200 concurrent module-request checks.
The existing threaded-server contract and logo JavaScript syntax check passed.

These repairs are local; no production deployment was performed in this turn.

Final browser verification reached the animated main menu without warnings/errors; screenshot and log evidence are testing/2026-09-10-logo-stability-menu.png and testing/2026-09-10-logo-stability-browser.json. The repaired server is running on port 8080.
