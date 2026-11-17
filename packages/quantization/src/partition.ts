export type PartitionKind = "square" | "hex" | "voronoi";

export type PartitionMap = Readonly<{
  width: number;
  height: number;
  regionCount: number;
  regionIds: Uint32Array;
  centers: Float32Array;
}>;

const hash = (seed: number) => {
  let value = seed >>> 0;
  return () => {
    value += 0x6d2b79f5;
    let next = value;
    next = Math.imul(next ^ (next >>> 15), next | 1);
    next ^= next + Math.imul(next ^ (next >>> 7), next | 61);
    return ((next ^ (next >>> 14)) >>> 0) / 4_294_967_296;
  };
};

const nearestCentersMap = (
  width: number,
  height: number,
  centers: readonly Readonly<{ x: number; y: number }>[],
): PartitionMap => {
  const regionIds = new Uint32Array(width * height);
  const flatCenters = new Float32Array(centers.length * 2);
  centers.forEach((center, index) => {
    flatCenters[index * 2] = center.x;
    flatCenters[index * 2 + 1] = center.y;
  });
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      let nearest = 0;
      let nearestDistance = Number.POSITIVE_INFINITY;
      for (let index = 0; index < centers.length; index += 1) {
        const dx = x + 0.5 - centers[index].x;
        const dy = y + 0.5 - centers[index].y;
        const distance = dx * dx + dy * dy;
        if (distance < nearestDistance) {
          nearest = index;
          nearestDistance = distance;
        }
      }
      regionIds[y * width + x] = nearest;
    }
  }
  return {
    width,
    height,
    regionCount: centers.length,
    regionIds,
    centers: flatCenters,
  };
};

export const createSquarePartition = (
  width: number,
  height: number,
): PartitionMap => {
  const regionIds = new Uint32Array(width * height);
  const centers = new Float32Array(width * height * 2);
  for (let index = 0; index < regionIds.length; index += 1) {
    regionIds[index] = index;
    centers[index * 2] = (index % width) + 0.5;
    centers[index * 2 + 1] = Math.floor(index / width) + 0.5;
  }
  return { width, height, regionCount: width * height, regionIds, centers };
};

export const createHexPartition = (
  width: number,
  height: number,
  radius: number,
): PartitionMap => {
  const centers: { x: number; y: number }[] = [];
  const horizontal = Math.max(2, radius * 1.5);
  const vertical = Math.max(2, Math.sqrt(3) * radius);
  let column = 0;
  for (let x = -radius; x <= width + radius; x += horizontal) {
    const offset = column % 2 === 0 ? 0 : vertical / 2;
    for (let y = -radius + offset; y <= height + radius; y += vertical) {
      centers.push({ x, y });
    }
    column += 1;
  }
  return nearestCentersMap(width, height, centers);
};

export const createPoissonPartition = (
  width: number,
  height: number,
  radius: number,
  seed = 1,
  attempts = 48,
): PartitionMap => {
  const random = hash(seed);
  const cellSize = radius / Math.SQRT2;
  const columns = Math.max(1, Math.ceil(width / cellSize));
  const rows = Math.max(1, Math.ceil(height / cellSize));
  const grid = new Int32Array(columns * rows);
  grid.fill(-1);
  const points: { x: number; y: number }[] = [];
  const active: number[] = [];

  const insert = (x: number, y: number) => {
    const index = points.length;
    points.push({ x, y });
    active.push(index);
    const gx = Math.min(columns - 1, Math.floor(x / cellSize));
    const gy = Math.min(rows - 1, Math.floor(y / cellSize));
    grid[gy * columns + gx] = index;
  };

  insert(random() * width, random() * height);
  while (active.length > 0) {
    const activePosition = Math.floor(random() * active.length);
    const point = points[active[activePosition]];
    let accepted = false;
    for (let attempt = 0; attempt < attempts; attempt += 1) {
      const angle = random() * Math.PI * 2;
      const distance = radius * (1 + random());
      const x = point.x + Math.cos(angle) * distance;
      const y = point.y + Math.sin(angle) * distance;
      if (x < 0 || y < 0 || x >= width || y >= height) continue;
      const gx = Math.floor(x / cellSize);
      const gy = Math.floor(y / cellSize);
      let valid = true;
      for (let oy = -2; oy <= 2 && valid; oy += 1) {
        for (let ox = -2; ox <= 2; ox += 1) {
          const nx = gx + ox;
          const ny = gy + oy;
          if (nx < 0 || ny < 0 || nx >= columns || ny >= rows) continue;
          const neighborIndex = grid[ny * columns + nx];
          if (neighborIndex < 0) continue;
          const neighbor = points[neighborIndex];
          const dx = x - neighbor.x;
          const dy = y - neighbor.y;
          if (dx * dx + dy * dy < radius * radius) {
            valid = false;
            break;
          }
        }
      }
      if (!valid) continue;
      insert(x, y);
      accepted = true;
      break;
    }
    if (!accepted) active.splice(activePosition, 1);
  }
  return nearestCentersMap(width, height, points);
};

export type PartitionFraming = Readonly<{
  backgroundMask: Uint8Array;
  backgroundColorId: number;
}>;

export const rasterizePartitionColors = (
  colorIds: Uint16Array,
  width: number,
  height: number,
  kind: Exclude<PartitionKind, "square">,
  scale: number,
  seed: number,
  multiplier: number,
  framing?: PartitionFraming,
): Readonly<{ width: number; height: number; colorIds: Uint16Array }> => {
  if (framing && framing.backgroundMask.length !== width * height) {
    throw new RangeError(
      "Frame background mask must match the partition grid dimensions.",
    );
  }
  const partition = createPartition(kind, width, height, scale, seed);
  const regionColors = new Uint16Array(partition.regionCount);
  if (framing) regionColors.fill(framing.backgroundColorId);
  const assigned = new Uint8Array(partition.regionCount);
  for (let index = 0; index < partition.regionIds.length; index += 1) {
    // Margin cells (including painted ones) do not choose the image region color.
    if (framing?.backgroundMask[index]) continue;
    const region = partition.regionIds[index];
    if (!assigned[region]) {
      regionColors[region] = colorIds[index];
      assigned[region] = 1;
    }
  }
  const bucketSize = Math.max(1, scale);
  const buckets = new Map<string, number[]>();
  for (let region = 0; region < partition.regionCount; region += 1) {
    const bx = Math.floor(partition.centers[region * 2] / bucketSize);
    const by = Math.floor(partition.centers[region * 2 + 1] / bucketSize);
    const key = `${bx}:${by}`;
    const bucket = buckets.get(key);
    if (bucket) bucket.push(region);
    else buckets.set(key, [region]);
  }
  const outputWidth = width * multiplier;
  const outputHeight = height * multiplier;
  const output = new Uint16Array(outputWidth * outputHeight);
  for (let y = 0; y < outputHeight; y += 1) {
    for (let x = 0; x < outputWidth; x += 1) {
      const px = (x + 0.5) / multiplier;
      const py = (y + 0.5) / multiplier;
      const cellIndex =
        Math.min(height - 1, Math.floor(py)) * width +
        Math.min(width - 1, Math.floor(px));
      if (framing?.backgroundMask[cellIndex]) {
        // Preserve the composed cell ID, not just the fill ID: users may have
        // painted this margin cell after conversion.
        output[y * outputWidth + x] = colorIds[cellIndex];
        continue;
      }
      const bx = Math.floor(px / bucketSize);
      const by = Math.floor(py / bucketSize);
      let nearest =
        partition.regionIds[
          Math.min(height - 1, Math.floor(py)) * width +
            Math.min(width - 1, Math.floor(px))
        ];
      let nearestDistance = Number.POSITIVE_INFINITY;
      for (let oy = -2; oy <= 2; oy += 1) {
        for (let ox = -2; ox <= 2; ox += 1) {
          for (const region of buckets.get(`${bx + ox}:${by + oy}`) ?? []) {
            const dx = px - partition.centers[region * 2];
            const dy = py - partition.centers[region * 2 + 1];
            const distance = dx * dx + dy * dy;
            if (distance < nearestDistance) {
              nearest = region;
              nearestDistance = distance;
            }
          }
        }
      }
      output[y * outputWidth + x] = regionColors[nearest];
    }
  }
  return { width: outputWidth, height: outputHeight, colorIds: output };
};

export const createPartition = (
  kind: PartitionKind,
  width: number,
  height: number,
  scale: number,
  seed = 1,
): PartitionMap => {
  if (kind === "square") return createSquarePartition(width, height);
  if (kind === "hex") return createHexPartition(width, height, scale);
  return createPoissonPartition(width, height, scale, seed);
};
