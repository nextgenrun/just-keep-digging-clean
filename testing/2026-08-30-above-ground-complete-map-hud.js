export function configureCompleteMapHud(scene, review) {
  const chapterSelect = document.querySelector("#chapter-select");
  const bandSelect = document.querySelector("#band-select");
  for (const chapter of review.chapters) {
    chapterSelect.add(new Option(chapter.label, chapter.id));
  }
  for (const band of review.bands) bandSelect.add(new Option(band.label, band.id));
  chapterSelect.addEventListener("change", event => scene.jumpToChapter(event.target.value));
  bandSelect.addEventListener("change", event => scene.jumpToBand(event.target.value));
  document.querySelector("#previous").addEventListener("click", () => scene.stepChapter(-1));
  document.querySelector("#next").addEventListener("click", () => scene.stepChapter(1));
  globalThis.__ABOVE_GROUND_COMPLETE_MAP__ = {
    jumpToChapter: id => scene.jumpToChapter(id),
    jumpToBand: id => scene.jumpToBand(id),
    jumpTo: (chapterId, bandId) => scene.jumpTo(chapterId, bandId),
    snapshot: () => scene.snapshot(),
  };
}

export function snapshotCompleteMapCamera(camera) {
  return {
    scrollX: camera.scrollX,
    scrollY: camera.scrollY,
    zoom: camera.zoom,
    view: {
      left: camera.worldView.left,
      right: camera.worldView.right,
      top: camera.worldView.top,
      bottom: camera.worldView.bottom,
    },
  };
}
