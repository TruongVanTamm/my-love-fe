import { inject, Injectable } from '@angular/core';
import { ApiService } from '../../core/api.service';
import type {
  StarDetail,
  UniverseConstellation,
  UniverseData,
  UniverseSettings,
  UniverseStar,
} from './universe.model';

@Injectable({ providedIn: 'root' })
export class UniverseApiService {
  private readonly api = inject(ApiService);

  get() {
    return this.api.get<UniverseData>('universe');
  }

  detail(id: string) {
    return this.api.get<StarDetail>(`universe/stars/${encodeURIComponent(id)}`);
  }

  settings(input: Partial<UniverseSettings>) {
    return this.api.patch<UniverseSettings>('universe/settings', input);
  }

  createConstellation(name: string) {
    return this.api.post<UniverseConstellation>('universe/constellations', { name });
  }

  assign(starId: string, constellationId: string | null) {
    return this.api.patch<UniverseStar>(`universe/stars/${encodeURIComponent(starId)}`, {
      constellationId,
    });
  }

  remove(starId: string) {
    return this.api.delete(`universe/stars/${encodeURIComponent(starId)}`);
  }
}
