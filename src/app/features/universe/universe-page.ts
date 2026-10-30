import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnDestroy,
  signal,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { errorMessage } from '../../core/api.service';
import { StarStoryPanel } from './star-story-panel';
import { UniverseApiService } from './universe-api.service';
import type { StarDetail, UniverseData, UniverseStar } from './universe.model';
import { UniverseScene } from './universe-scene';

@Component({
  selector: 'app-universe-page',
  imports: [RouterLink, UniverseScene, StarStoryPanel],
  templateUrl: './universe-page.html',
  styleUrl: './universe-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UniversePage implements OnDestroy {
  private readonly api = inject(UniverseApiService);
  private readonly scene = viewChild(UniverseScene);
  private readonly motionQuery =
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia('(prefers-reduced-motion: reduce)')
      : null;
  readonly universe = signal<UniverseData | null>(null);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly webglAvailable = signal(true);
  readonly selectedId = signal<string | null>(null);
  readonly detail = signal<StarDetail | null>(null);
  readonly detailLoading = signal(false);
  readonly detailError = signal('');
  readonly settingsBusy = signal(false);
  readonly groupBusy = signal(false);
  readonly groupError = signal('');
  readonly systemReducedMotion = signal(this.motionQuery?.matches ?? false);
  readonly reducedMotion = computed(
    () => this.systemReducedMotion() || !!this.universe()?.settings.reducedMotion,
  );
  readonly showAnniversary = computed(
    () => !!this.universe()?.anniversary && !!this.universe()?.settings.anniversaryEffectsEnabled,
  );

  constructor() {
    this.motionQuery?.addEventListener('change', this.motionChanged);
    void this.load();
  }

  ngOnDestroy(): void {
    this.motionQuery?.removeEventListener('change', this.motionChanged);
  }

  async load(): Promise<void> {
    if (this.loading()) return;
    this.loading.set(true);
    this.error.set('');
    try {
      const data = await firstValueFrom(this.api.get());
      this.universe.set(data);
      if (this.selectedId() && !data.stars.some((star) => star.id === this.selectedId()))
        this.closeStory();
    } catch (error) {
      this.error.set(errorMessage(error));
    } finally {
      this.loading.set(false);
    }
  }

  async selectStar(id: string): Promise<void> {
    this.selectedId.set(id);
    this.detail.set(null);
    this.detailLoading.set(true);
    this.detailError.set('');
    try {
      const detail = await firstValueFrom(this.api.detail(id));
      if (this.selectedId() === id) this.detail.set(detail);
    } catch (error) {
      if (this.selectedId() === id) this.detailError.set(errorMessage(error));
    } finally {
      if (this.selectedId() === id) this.detailLoading.set(false);
    }
  }

  retryStory(): void {
    const id = this.selectedId();
    if (id) void this.selectStar(id);
  }

  closeStory(): void {
    this.selectedId.set(null);
    this.detail.set(null);
    this.detailError.set('');
    this.detailLoading.set(false);
    this.groupError.set('');
  }

  resetCamera(): void {
    this.scene()?.reset();
  }

  focusSelected(): void {
    const id = this.selectedId();
    if (id) this.scene()?.focus(id);
  }

  async changeSetting(
    key: 'animationEnabled' | 'reducedMotion' | 'anniversaryEffectsEnabled',
  ): Promise<void> {
    const current = this.universe();
    if (!current || this.settingsBusy()) return;
    this.settingsBusy.set(true);
    this.error.set('');
    try {
      const value = !current.settings[key];
      const settings = await firstValueFrom(this.api.settings({ [key]: value }));
      this.universe.set({ ...current, settings });
    } catch (error) {
      this.error.set(errorMessage(error));
    } finally {
      this.settingsBusy.set(false);
    }
  }

  starName(star: UniverseStar, index: number): string {
    return `${star.sourceType === 'milestone' ? 'Cột mốc' : 'Kỷ niệm'} ${index + 1}`;
  }

  async assignGroup(constellationId: string | null): Promise<void> {
    const star = this.detail();
    if (!star || this.groupBusy()) return;
    this.groupBusy.set(true);
    this.groupError.set('');
    try {
      await firstValueFrom(this.api.assign(star.id, constellationId));
      this.detail.set({ ...star, constellationId });
      await this.load();
    } catch (error) {
      this.groupError.set(errorMessage(error));
      this.detail.set({ ...star });
    } finally {
      this.groupBusy.set(false);
    }
  }

  async createGroup(name: string): Promise<void> {
    const star = this.detail();
    if (!star || !name || this.groupBusy()) return;
    this.groupBusy.set(true);
    this.groupError.set('');
    try {
      const group = await firstValueFrom(this.api.createConstellation(name));
      await firstValueFrom(this.api.assign(star.id, group.id));
      this.detail.set({ ...star, constellationId: group.id });
      await this.load();
    } catch (error) {
      this.groupError.set(errorMessage(error));
    } finally {
      this.groupBusy.set(false);
    }
  }

  async removeStar(): Promise<void> {
    const id = this.selectedId();
    if (!id || this.groupBusy()) return;
    if (!window.confirm('Gỡ ngôi sao này cho cả hai? Kỷ niệm hoặc cột mốc gốc vẫn còn.')) return;
    this.groupBusy.set(true);
    this.groupError.set('');
    try {
      await firstValueFrom(this.api.remove(id));
      this.closeStory();
      await this.load();
    } catch (error) {
      this.groupError.set(errorMessage(error));
    } finally {
      this.groupBusy.set(false);
    }
  }

  private readonly motionChanged = (event: MediaQueryListEvent): void => {
    this.systemReducedMotion.set(event.matches);
  };
}
