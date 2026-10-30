import {
  AdditiveBlending,
  BufferGeometry,
  Color,
  Float32BufferAttribute,
  InstancedMesh,
  LineBasicMaterial,
  LineSegments,
  Matrix4,
  MeshBasicMaterial,
  Points,
  PointsMaterial,
  QuadraticBezierCurve3,
  Quaternion,
  SphereGeometry,
  Vector3,
} from 'three';
import type { UniverseConstellation, UniverseStar } from './universe.model';

const BACKGROUND_COUNT = 600;
const THREAD_SEGMENTS = 8;
export const GLOW_BASE_OPACITY = 0.12;

export interface MemoryThreads {
  base: LineSegments<BufferGeometry, LineBasicMaterial> | null;
  highlight: LineSegments<BufferGeometry, LineBasicMaterial> | null;
}

export function createBackground(): Points<BufferGeometry, PointsMaterial> {
  const coordinates = new Float32Array(BACKGROUND_COUNT * 3);
  for (let i = 0; i < BACKGROUND_COUNT; i += 1) {
    const angle = i * 2.399963;
    const height = 1 - (2 * (i + 0.5)) / BACKGROUND_COUNT;
    const radius = Math.sqrt(1 - height * height) * 75;
    coordinates[i * 3] = Math.cos(angle) * radius;
    coordinates[i * 3 + 1] = height * 75;
    coordinates[i * 3 + 2] = Math.sin(angle) * radius;
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(coordinates, 3));
  return new Points(
    geometry,
    new PointsMaterial({ color: 0x99a9c7, size: 0.16, sizeAttenuation: true }),
  );
}

function starColor(star: UniverseStar, selected: string | null, anniversary: boolean): Color {
  if (star.id === selected) return new Color(0xffffff);
  if (star.sourceType === 'milestone') return new Color(0xffcf80);
  return new Color(anniversary ? 0xffc6dd : 0xe7a4c0);
}

export function createStarMesh(
  stars: UniverseStar[],
  selected: string | null,
  anniversary: boolean,
): InstancedMesh<SphereGeometry, MeshBasicMaterial> {
  const mesh = new InstancedMesh(
    new SphereGeometry(0.24, 8, 6),
    new MeshBasicMaterial({ color: 0xffffff }),
    stars.length,
  );
  const rotation = new Quaternion();
  stars.forEach((star, index) => {
    const scale = star.appearance.size * (star.id === selected ? 1.55 : 1);
    mesh.setMatrixAt(
      index,
      new Matrix4().compose(
        new Vector3(star.position.x, star.position.y, star.position.z),
        rotation,
        new Vector3(scale, scale, scale),
      ),
    );
    mesh.setColorAt(index, starColor(star, selected, anniversary));
  });
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  return mesh;
}

export function createStarGlow(
  stars: UniverseStar[],
  selected: string | null,
  anniversary: boolean,
): InstancedMesh<SphereGeometry, MeshBasicMaterial> {
  const mesh = new InstancedMesh(
    new SphereGeometry(1, 12, 8),
    new MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: GLOW_BASE_OPACITY,
      blending: AdditiveBlending,
      depthWrite: false,
    }),
    stars.length,
  );
  const rotation = new Quaternion();
  stars.forEach((star, index) => {
    const scale = star.appearance.size * (star.id === selected ? 1.65 : 0.9);
    mesh.setMatrixAt(
      index,
      new Matrix4().compose(
        new Vector3(star.position.x, star.position.y, star.position.z),
        rotation,
        new Vector3(scale, scale, scale),
      ),
    );
    mesh.setColorAt(index, starColor(star, selected, anniversary));
  });
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  return mesh;
}

function nearestTree(stars: UniverseStar[]): [number, number][] {
  const positions = stars.map(
    (star) => new Vector3(star.position.x, star.position.y, star.position.z),
  );
  const visited = new Set<number>();
  const distances = Array<number>(stars.length).fill(Number.POSITIVE_INFINITY);
  const parents = Array<number>(stars.length).fill(-1);
  const edges: [number, number][] = [];
  if (stars.length) distances[0] = 0;
  for (let step = 0; step < stars.length; step += 1) {
    let next = -1;
    for (let index = 0; index < stars.length; index += 1) {
      if (!visited.has(index) && (next < 0 || distances[index] < distances[next])) next = index;
    }
    if (next < 0) break;
    visited.add(next);
    if (parents[next] >= 0) edges.push([parents[next], next]);
    for (let index = 0; index < stars.length; index += 1) {
      if (visited.has(index)) continue;
      const distance = positions[next].distanceToSquared(positions[index]);
      if (distance < distances[index]) {
        distances[index] = distance;
        parents[index] = next;
      }
    }
  }
  return edges;
}

function threadPoints(first: UniverseStar, second: UniverseStar): Vector3[] {
  const start = new Vector3(first.position.x, first.position.y, first.position.z);
  const end = new Vector3(second.position.x, second.position.y, second.position.z);
  const middle = start.clone().add(end).multiplyScalar(0.5);
  middle.z += Math.min(start.distanceTo(end) * 0.08, 2);
  const curve = new QuadraticBezierCurve3(start, middle, end);
  const points: Vector3[] = [];
  for (let index = 1; index <= THREAD_SEGMENTS; index += 1) {
    points.push(
      curve.getPoint((index - 1) / THREAD_SEGMENTS),
      curve.getPoint(index / THREAD_SEGMENTS),
    );
  }
  return points;
}

export function createMemoryThreads(stars: UniverseStar[], selected: string | null): MemoryThreads {
  if (stars.length < 2) return { base: null, highlight: null };
  const ordered = [...stars].sort((first, second) => first.id.localeCompare(second.id));
  const basePoints: Vector3[] = [];
  const highlightPoints: Vector3[] = [];
  for (const [from, to] of nearestTree(ordered)) {
    const first = ordered[from];
    const second = ordered[to];
    const points = threadPoints(first, second);
    basePoints.push(...points);
    if (first.id === selected || second.id === selected) highlightPoints.push(...points);
  }
  return {
    base: new LineSegments(
      new BufferGeometry().setFromPoints(basePoints),
      new LineBasicMaterial({
        color: 0xb8a9df,
        transparent: true,
        opacity: 0.42,
        depthWrite: false,
      }),
    ),
    highlight: highlightPoints.length
      ? new LineSegments(
          new BufferGeometry().setFromPoints(highlightPoints),
          new LineBasicMaterial({
            color: 0xffd59c,
            transparent: true,
            opacity: 0.95,
            depthWrite: false,
          }),
        )
      : null,
  };
}

export function createConstellationLines(
  stars: UniverseStar[],
  groups: UniverseConstellation[],
): LineSegments<BufferGeometry, LineBasicMaterial> | null {
  const points: Vector3[] = [];
  for (const group of groups) {
    const members = stars
      .filter((star) => star.constellationId === group.id)
      .sort((a, b) => a.id.localeCompare(b.id));
    for (let i = 1; i < members.length; i += 1) {
      const previous = members[i - 1]?.position;
      const current = members[i]?.position;
      if (previous && current)
        points.push(
          new Vector3(previous.x, previous.y, previous.z),
          new Vector3(current.x, current.y, current.z),
        );
    }
  }
  if (!points.length) return null;
  return new LineSegments(
    new BufferGeometry().setFromPoints(points),
    new LineBasicMaterial({ color: 0xffcc8f, transparent: true, opacity: 0.92 }),
  );
}
