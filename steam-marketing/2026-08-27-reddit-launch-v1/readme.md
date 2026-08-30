# UNDERSTAR Reddit Launch V1

Status: review-only. Nothing in this package has been uploaded, scheduled, or
published to Reddit.

## Recommended Reddit setup

Use Reddit's existing Devvit **Scheduler** app instead of building a custom
cross-community posting bot:

- it can schedule text, link, and single-image posts in a subreddit where it is
  installed;
- Reddit manages the authentication, so this repository stores no Reddit API
  key or account password;
- the Calendar keeps every queued post visible and editable before publication;
- native video posts still need to be uploaded manually because Scheduler does
  not support video.

Official app: <https://developers.reddit.com/apps/link-scheduler>

The currently connected Reddit account does not moderate a community yet, so
the app cannot be installed. `r/understar` already exists as a restricted,
empty community controlled by another moderator. Choose and create a distinct
official community name before continuing; `r/PlayUNDERSTAR` is the working
recommendation, subject to Reddit's availability check.

## Publishing boundary

The Devvit route is for the official community we control. Posts to unrelated
game-development or indie-game communities stay manual and are only submitted
after checking that community's current self-promotion rules. Do not repeat the
same promotional copy across communities.

Recommended first cadence: two useful posts per week in the official community,
with genuine replies between posts. Keep the Steam link secondary to the topic
or question whenever the post is meant to invite discussion.

## Verified destination

Steam page: <https://store.steampowered.com/app/4982520/>

## Marketing material map

| Use | Asset | Truth label |
| --- | --- | --- |
| Community introduction image | `../2026-08-17-steamworks-required-5x5-pack-v1/01-screenshots/screenshot_01_surface_town_english.png` | Live-game screenshot |
| Mining/Star discussion image | `../2026-08-26-gameplay-demo-trailer-v1/reference-gameplay-landscape-star-action.png` | Live-game capture used by the verified trailer pipeline |
| Titan systems discussion image | `../2026-08-17-steamworks-required-5x5-pack-v1/01-screenshots/screenshot_03_titan_archive_english.png` | Live-game UI screenshot |
| Manual Reddit video post | `../2026-08-26-gameplay-demo-trailer-v1/understar-gameplay-short-01-v1.mp4` | Gameplay-demo promotional edit |
| Manual trailer post | `../2026-08-26-gameplay-demo-trailer-v1/understar-gameplay-demo-trailer-v1.mp4` | Gameplay-demo trailer with a disclosed gameplay-derived end card |

Do not describe the OpenRouter key-art frames or generated cinematic shots as
raw gameplay. Recheck the selected capture against the current build before any
post claims that it shows the latest UI.

## Next action

1. Approve the official subreddit name and create it on Reddit.
2. Install Scheduler in that subreddit.
3. Configure moderator-only access and enable scheduled/published/failed
   notifications.
4. Review the copy in `post-drafts.md`.
5. Schedule only the individually approved posts.

