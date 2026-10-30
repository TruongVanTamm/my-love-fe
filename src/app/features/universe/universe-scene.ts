import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  effect,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import type { AfterViewInit, OnDestroy } from '@angular/core';
import {
  BufferGeometry,
  InstancedMesh,
  LineBasicMaterial,
  LineSegments,
  MeshBasicMaterial,
  PerspectiveCamera,
  Points,
  PointsMaterial,
  Raycaster,
  Scene,
  SphereGeometry,
  Vector2,
  Vector3,
  WebGLRenderer,
} from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { UniverseConstellation, UniverseStar } from './universe.model';
import {
  GLOW_BASE_OPACITY,
  createBackground,
  createConstellationLines,
  createMemoryThreads,
  createStarGlow,
  createStarMesh,
} from './universe-geometry';
import type { MemoryThreads } from './universe-geometry';

interface SceneLabel {
  id: string;
  name: string;
  x: number;
  y: number;
  visible: boolean;
}

const CAMERA_START = new Vector3(0, 8, 45);
const MAX_PIXEL_RATIO = 1.75;
const GLOW_PULSE_AMPLITUDE = 0.035;
const GLOW_PULSE_SPEED = 0.0015;

@Component({
  selector: 'app-universe-scene',
  template: `
    <div class="scene-frame">
      <div class="scene-caption" aria-hidden="true">
        <span>✦ OUR LITTLE UNIVERSE</span>
        <span>BẢN ĐỒ ÁNH SÁNG</span>
      </div>
      <canvas
        #canvas
        aria-label="Bản đồ vũ trụ 3D với các sợi sáng nối kỷ niệm. Kéo để xoay, dùng hai ngón tay để phóng to hoặc di chuyển."
        role="img"
      ></canvas>
      @for (label of labels(); track label.id) {
        @if (label.visible) {
          <span class="constellation-label" [style.left.px]="label.x" [style.top.px]="label.y">{{
            label.name
          }}</span>
        }
      }
      <div class="scene-legend" aria-hidden="true">
        <span><i class="legend-dot memory-dot"></i>Kỷ niệm</span>
        <span><i class="legend-dot milestone-dot"></i>Cột mốc</span>
        <span><i class="legend-line"></i>Sợi sáng</span>
        <span><i class="legend-line constellation-line"></i>Chòm sao</span>
      </div>
    </div>
  `,
  styles: `
    :host {
      display: block;
      min-width: 0;
    }
    .scene-frame {
      position: relative;
      width: 100%;
      height: 100%;
      min-height: 380px;
      overflow: hidden;
      border-radius: 22px;
      background:
        radial-gradient(ellipse at 28% 68%, rgb(126 64 126 / 38%), transparent 38%),
        radial-gradient(ellipse at 77% 22%, rgb(53 89 151 / 48%), transparent 42%),
        radial-gradient(ellipse at 52% 48%, #152848, #070e24 68%, #040817);
      box-shadow: inset 0 0 90px rgb(3 5 18 / 60%);
    }
    .scene-frame::after {
      position: absolute;
      inset: 12px;
      border: 1px solid rgb(255 230 194 / 13%);
      border-radius: 14px;
      content: '';
      pointer-events: none;
    }
    canvas {
      width: 100%;
      height: 100%;
      display: block;
      touch-action: none;
    }
    .scene-caption,
    .scene-legend {
      position: absolute;
      z-index: 1;
      display: flex;
      gap: 0.7rem;
      color: #f8e6d8;
      font-size: 0.61rem;
      letter-spacing: 0.13em;
      pointer-events: none;
      text-shadow: 0 2px 12px #050b20;
    }
    .scene-caption {
      top: 1.8rem;
      left: 1.8rem;
      right: 1.8rem;
      justify-content: space-between;
    }
    .scene-legend {
      bottom: 1.8rem;
      left: 1.8rem;
      flex-wrap: wrap;
      gap: 0.8rem 1.2rem;
      letter-spacing: 0.02em;
    }
    .scene-legend span {
      display: inline-flex;
      align-items: center;
      gap: 0.45rem;
    }
    .legend-dot {
      width: 0.5rem;
      height: 0.5rem;
      border-radius: 50%;
      box-shadow: 0 0 10px currentColor;
    }
    .memory-dot {
      background: #f3afd2;
      color: #f3afd2;
    }
    .milestone-dot {
      background: #ffcf80;
      color: #ffcf80;
    }
    .legend-line {
      width: 0.9rem;
      height: 1px;
      background: #b8a9df;
    }
    .constellation-line {
      background: #ffcc8f;
    }
    .constellation-label {
      position: absolute;
      transform: translate(-50%, -50%);
      pointer-events: none;
      padding: 0.25rem 0.5rem;
      border-radius: 999px;
      color: #f8e6b7;
      background: rgb(7 16 34 / 75%);
      font: 600 0.72rem/1.2 sans-serif;
      white-space: nowrap;
    }
    @media (max-width: 600px) {
      .scene-frame {
        min-height: 340px;
        border-radius: 16px;
      }
      .scene-caption {
        top: 1.5rem;
        left: 1.5rem;
        right: 1.5rem;
      }
      .scene-caption span:last-child {
        display: none;
      }
      .scene-legend {
        bottom: 1.5rem;
        left: 1.5rem;
        right: 1.5rem;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UniverseScene implements AfterViewInit, OnDestroy {
  private readonly canvasRef = viewChild<ElementRef<HTMLCanvasElement>>('canvas');
  readonly stars = input<UniverseStar[]>([]);
  readonly constellations = input<UniverseConstellation[]>([]);
  readonly selectedId = input<string | null>(null);
  readonly animationEnabled = input(true);
  readonly reducedMotion = input(false);
  readonly anniversary = input(false);
  readonly selected = output<string>();
  readonly available = output<boolean>();
  readonly labels = signal<SceneLabel[]>([]);
  private readonly ready = signal(false);
  private readonly scene = new Scene();
  private readonly camera = new PerspectiveCamera(60, 1, 0.1, 200);
  private readonly raycaster = new Raycaster();
  private renderer: WebGLRenderer | null = null;
  private controls: OrbitControls | null = null;
  private mesh: InstancedMesh<SphereGeometry, MeshBasicMaterial> | null = null;
  private glow: InstancedMesh<SphereGeometry, MeshBasicMaterial> | null = null;
  private lines: LineSegments<BufferGeometry, LineBasicMaterial> | null = null;
  private threads: MemoryThreads = { base: null, highlight: null };
  private background: Points<BufferGeometry, PointsMaterial> | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private frameId = 0;
  private pointerStart: { x: number; y: number } | null = null;

  constructor() {
    effect(() => {
      if (!this.ready()) return;
      this.rebuild(this.stars(), this.constellations(), this.selectedId(), this.anniversary());
      this.syncAnimation(this.animationEnabled() && !this.reducedMotion());
    });
  }

  ngAfterViewInit(): void {
    const canvas = this.canvasRef()?.nativeElement;
    if (!canvas) return;
    if (
      typeof WebGLRenderingContext === 'undefined' &&
      typeof WebGL2RenderingContext === 'undefined'
    ) {
      this.available.emit(false);
      return;
    }
    try {
      this.renderer = new WebGLRenderer({
        canvas,
        antialias: true,
        alpha: true,
        powerPreference: 'low-power',
      });
    } catch {
      this.available.emit(false);
      return;
    }
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO));
    this.renderer.setClearColor(0x071022, 0);
    this.camera.position.copy(CAMERA_START);
    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enablePan = true;
    this.controls.minDistance = 5;
    this.controls.maxDistance = 85;
    this.controls.addEventListener('change', this.render);
    canvas.addEventListener('pointerdown', this.pointerDown);
    canvas.addEventListener('pointerup', this.pointerUp);
    document.addEventListener('visibilitychange', this.visibilityChanged);
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(this.resize);
      this.resizeObserver.observe(canvas.parentElement ?? canvas);
    } else window.addEventListener('resize', this.resize);
    this.background = createBackground();
    this.scene.add(this.background);
    this.resize();
    this.ready.set(true);
    this.available.emit(true);
  }

  reset(): void {
    this.camera.position.copy(CAMERA_START);
    this.controls?.target.set(0, 0, 0);
    this.controls?.update();
    this.render();
  }

  focus(id: string): void {
    const star = this.stars().find((item) => item.id === id);
    if (!star || !this.controls) return;
    const target = new Vector3(star.position.x, star.position.y, star.position.z);
    this.controls.target.copy(target);
    this.camera.position.copy(target).add(new Vector3(0, 2, 7));
    this.controls.update();
    this.render();
  }

  ngOnDestroy(): void {
    this.ready.set(false);
    cancelAnimationFrame(this.frameId);
    document.removeEventListener('visibilitychange', this.visibilityChanged);
    window.removeEventListener('resize', this.resize);
    this.resizeObserver?.disconnect();
    const canvas = this.canvasRef()?.nativeElement;
    canvas?.removeEventListener('pointerdown', this.pointerDown);
    canvas?.removeEventListener('pointerup', this.pointerUp);
    this.controls?.removeEventListener('change', this.render);
    this.controls?.dispose();
    this.disposeObjects();
    this.background?.geometry.dispose();
    this.background?.material.dispose();
    this.renderer?.dispose();
    this.renderer?.forceContextLoss();
  }

  private readonly resize = (): void => {
    if (!this.renderer) return;
    const host = this.canvasRef()?.nativeElement.parentElement;
    const width = Math.max(1, host?.clientWidth ?? 1);
    const height = Math.max(1, host?.clientHeight ?? 1);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
    this.render();
  };

  private readonly render = (): void => {
    if (!this.renderer) return;
    this.renderer.render(this.scene, this.camera);
    this.updateLabels();
  };

  private readonly tick = (): void => {
    this.frameId = requestAnimationFrame(this.tick);
    if (this.background) this.background.rotation.y += 0.00012;
    if (this.glow)
      this.glow.material.opacity =
        GLOW_BASE_OPACITY + Math.sin(performance.now() * GLOW_PULSE_SPEED) * GLOW_PULSE_AMPLITUDE;
    this.controls?.update();
    this.render();
  };

  private readonly visibilityChanged = (): void => {
    this.syncAnimation(this.animationEnabled() && !this.reducedMotion());
  };

  private syncAnimation(enabled: boolean): void {
    const shouldRun = enabled && !document.hidden && !!this.renderer;
    if (this.controls) this.controls.enableDamping = shouldRun;
    if (shouldRun && !this.frameId) this.frameId = requestAnimationFrame(this.tick);
    if (!shouldRun && this.frameId) {
      cancelAnimationFrame(this.frameId);
      this.frameId = 0;
      if (this.glow) this.glow.material.opacity = GLOW_BASE_OPACITY;
      this.render();
    }
  }

  private rebuild(
    stars: UniverseStar[],
    groups: UniverseConstellation[],
    selected: string | null,
    anniversary: boolean,
  ): void {
    this.disposeObjects();
    if (stars.length) {
      this.glow = createStarGlow(stars, selected, anniversary);
      this.mesh = createStarMesh(stars, selected, anniversary);
      this.scene.add(this.glow);
      this.scene.add(this.mesh);
    }
    this.threads = createMemoryThreads(stars, selected);
    if (this.threads.base) this.scene.add(this.threads.base);
    if (this.threads.highlight) this.scene.add(this.threads.highlight);
    this.lines = createConstellationLines(stars, groups);
    if (this.lines) this.scene.add(this.lines);
    this.render();
  }

  private disposeObjects(): void {
    if (this.mesh) {
      this.scene.remove(this.mesh);
      this.mesh.geometry.dispose();
      this.mesh.material.dispose();
      this.mesh = null;
    }
    if (this.glow) {
      this.scene.remove(this.glow);
      this.glow.geometry.dispose();
      this.glow.material.dispose();
      this.glow = null;
    }
    for (const line of [this.threads.base, this.threads.highlight]) {
      if (!line) continue;
      this.scene.remove(line);
      line.geometry.dispose();
      line.material.dispose();
    }
    this.threads = { base: null, highlight: null };
    if (this.lines) {
      this.scene.remove(this.lines);
      this.lines.geometry.dispose();
      this.lines.material.dispose();
      this.lines = null;
    }
  }

  private updateLabels(): void {
    const host = this.canvasRef()?.nativeElement.parentElement;
    if (!host) return;
    const next = this.constellations().map((group) => {
      const center = group.layout;
      const projected = new Vector3(center.centerX, center.centerY, center.centerZ).project(
        this.camera,
      );
      return {
        id: group.id,
        name: group.name,
        x: ((projected.x + 1) / 2) * host.clientWidth,
        y: ((1 - projected.y) / 2) * host.clientHeight,
        visible:
          projected.z > -1 &&
          projected.z < 1 &&
          Math.abs(projected.x) < 0.9 &&
          Math.abs(projected.y) < 0.9,
      };
    });
    const previous = this.labels();
    if (
      next.length !== previous.length ||
      next.some((item, index) => {
        const old = previous[index];
        return (
          !old ||
          Math.abs(item.x - old.x) > 1 ||
          Math.abs(item.y - old.y) > 1 ||
          item.visible !== old.visible ||
          item.name !== old.name
        );
      })
    )
      this.labels.set(next);
  }

  private readonly pointerDown = (event: PointerEvent): void => {
    this.pointerStart = { x: event.clientX, y: event.clientY };
  };

  private readonly pointerUp = (event: PointerEvent): void => {
    if (!this.pointerStart || !this.mesh) return;
    const distance = Math.hypot(
      event.clientX - this.pointerStart.x,
      event.clientY - this.pointerStart.y,
    );
    this.pointerStart = null;
    if (distance > 6) return;
    const canvas = this.canvasRef()?.nativeElement;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const pointer = new Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1,
    );
    this.raycaster.setFromCamera(pointer, this.camera);
    const hit = this.raycaster.intersectObject(this.mesh)[0];
    const star = hit?.instanceId === undefined ? null : this.stars()[hit.instanceId];
    if (star) this.selected.emit(star.id);
  };
}
