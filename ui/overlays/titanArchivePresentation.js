export function fitTitanArchiveImage(image, maximumWidth, maximumHeight) {
  const width = Math.max(1, image.width || image.displayWidth || 1);
  const height = Math.max(1, image.height || image.displayHeight || 1);
  const scale = Math.min(maximumWidth / width, maximumHeight / height);
  image.setScale(scale);
}

export function formatTitanArchiveIndex(index) {
  return String(index).padStart(2, "0");
}
