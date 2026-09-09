/** Removes only neutral checker pixels connected to a carrier edge. */
export function extractCheckerForegroundAlpha(rgb, width, height, build) {
  const pixelCount = width * height;
  const candidate = new Uint8Array(pixelCount);
  const alpha = new Uint8Array(pixelCount);
  alpha.fill(255);
  for (let index = 0; index < pixelCount; index += 1) {
    const rgbIndex = index * 3;
    const values = [rgb[rgbIndex], rgb[rgbIndex + 1], rgb[rgbIndex + 2]];
    const minimum = Math.min(...values);
    const chroma = Math.max(...values) - minimum;
    candidate[index] = minimum >= build.checkerMinimum
      && chroma <= build.checkerChromaMaximum ? 1 : 0;
  }

  const visited = new Uint8Array(pixelCount);
  const queue = new Int32Array(pixelCount);
  let head = 0;
  let tail = 0;
  const enqueue = index => {
    if (!candidate[index] || visited[index]) return;
    visited[index] = 1;
    queue[tail++] = index;
  };
  for (let x = 0; x < width; x += 1) {
    enqueue(x);
    enqueue((height - 1) * width + x);
  }
  for (let y = 1; y < height - 1; y += 1) {
    enqueue(y * width);
    enqueue(y * width + width - 1);
  }
  while (head < tail) {
    const index = queue[head++];
    alpha[index] = 0;
    const x = index % width;
    const y = Math.floor(index / width);
    if (x > 0) enqueue(index - 1);
    if (x + 1 < width) enqueue(index + 1);
    if (y > 0) enqueue(index - width);
    if (y + 1 < height) enqueue(index + width);
  }

  const crisp = new Uint8Array(alpha);
  for (let index = 0; index < pixelCount; index += 1) {
    if (crisp[index] === 0) continue;
    const x = index % width;
    const y = Math.floor(index / width);
    let nearBackground = false;
    for (let dy = -build.checkerFringeRadiusPx;
      dy <= build.checkerFringeRadiusPx && !nearBackground;
      dy += 1) {
      const sampleY = y + dy;
      if (sampleY < 0 || sampleY >= height) continue;
      for (let dx = -build.checkerFringeRadiusPx; dx <= build.checkerFringeRadiusPx; dx += 1) {
        const sampleX = x + dx;
        if (sampleX < 0 || sampleX >= width) continue;
        if (crisp[sampleY * width + sampleX] === 0) {
          nearBackground = true;
          break;
        }
      }
    }
    if (!nearBackground) continue;
    const rgbIndex = index * 3;
    const values = [rgb[rgbIndex], rgb[rgbIndex + 1], rgb[rgbIndex + 2]];
    const minimum = Math.min(...values);
    const chroma = Math.max(...values) - minimum;
    if (minimum >= build.fringeMinimum && chroma <= build.fringeChromaMaximum) {
      alpha[index] = build.fringeAlpha;
    }
  }
  return alpha;
}
