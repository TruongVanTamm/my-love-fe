import { Matrix4, Quaternion, Vector3 } from 'three';
import {
  createConstellationLines,
  createMemoryThreads,
  createStarGlow,
  createStarMesh,
} from './universe-geometry';
import type { UniverseConstellation, UniverseStar } from './universe.model';

const star = (id: string, constellationId: string | null, x: number): UniverseStar => ({
  id,
  sourceType: 'memory',
  sourceId: id,
  constellationId,
  position: { x, y: 0, z: 0 },
  appearance: { size: 1, variant: 'memory', colorKey: 'rose' },
  layoutVersion: 1,
});
const group = (id: string): UniverseConstellation => ({
  id,
  name: id,
  description: '',
  theme: 'gold',
  milestoneId: null,
  layout: { centerX: 0, centerY: 0, centerZ: 0, scale: 1 },
});

describe('Hình học Universe', () => {
  it('nối các sao chưa thuộc chòm sao bằng sợi sáng, tô sáng nhánh của sao được chọn', () => {
    const stars = [star('c', null, 9), star('a', null, 0), star('b', null, 2)];
    const threads = createMemoryThreads(stars, 'a');
    expect(threads.base?.geometry.getAttribute('position').count).toBe(32);
    expect(threads.highlight?.geometry.getAttribute('position').count).toBe(16);
    const position = threads.base?.geometry.getAttribute('position');
    expect(position?.getX(0)).toBe(0);
    expect(position?.getX(15)).toBe(2);
    expect(stars.map((item) => item.id)).toEqual(['c', 'a', 'b']);
    threads.base?.geometry.dispose();
    threads.base?.material.dispose();
    threads.highlight?.geometry.dispose();
    threads.highlight?.material.dispose();
  });

  it('một sao vẫn có quầng sáng và không tạo đường nối rỗng', () => {
    const stars = [star('a', null, 1)];
    expect(createMemoryThreads(stars, null)).toEqual({ base: null, highlight: null });
    const glow = createStarGlow(stars, 'a', false);
    expect(glow.count).toBe(1);
    const matrix = new Matrix4();
    glow.getMatrixAt(0, matrix);
    const scale = new Vector3();
    matrix.decompose(new Vector3(), new Quaternion(), scale);
    expect(scale.x).toBeCloseTo(1.65);
    glow.geometry.dispose();
    glow.material.dispose();
  });

  it('chỉ nối sao cùng chòm sao và giữ tọa độ logic', () => {
    const stars = [star('a', 'g1', 1), star('b', 'g1', 2), star('c', 'g2', 9)];
    const lines = createConstellationLines(stars, [group('g1'), group('g2')]);
    expect(lines).not.toBeNull();
    if (!lines) throw new Error('Thiếu đường nối trong fixture');
    const positions = lines.geometry.getAttribute('position');
    expect(positions.count).toBe(2);
    expect([positions.getX(0), positions.getX(1)]).toEqual([1, 2]);
    lines.geometry.dispose();
    lines.material.dispose();
  });

  it('dùng một InstancedMesh cho nhiều sao và làm nổi sao được chọn', () => {
    const mesh = createStarMesh([star('a', null, 1), star('b', null, 2)], 'b', false);
    expect(mesh.count).toBe(2);
    const matrix = new Matrix4();
    mesh.getMatrixAt(1, matrix);
    const position = new Vector3();
    const scale = new Vector3();
    matrix.decompose(position, new Quaternion(), scale);
    expect(position.x).toBe(2);
    expect(scale.x).toBeCloseTo(1.55);
    mesh.geometry.dispose();
    mesh.material.dispose();
  });
});
