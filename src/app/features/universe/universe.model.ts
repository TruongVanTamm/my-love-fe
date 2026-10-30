export interface UniversePosition {
  x: number;
  y: number;
  z: number;
}

export interface UniverseStar {
  id: string;
  sourceType: 'memory' | 'milestone';
  sourceId: string;
  constellationId: string | null;
  position: UniversePosition;
  appearance: { size: number; variant: string; colorKey: string };
  layoutVersion: number;
}

export interface UniverseConstellation {
  id: string;
  name: string;
  description: string;
  theme: string;
  milestoneId: string | null;
  layout: { centerX: number; centerY: number; centerZ: number; scale: number };
}

export interface UniverseSettings {
  theme: string;
  animationEnabled: boolean;
  reducedMotion: boolean;
  anniversaryEffectsEnabled: boolean;
}

export interface UniverseData {
  stars: UniverseStar[];
  constellations: UniverseConstellation[];
  settings: UniverseSettings;
  anniversary: boolean;
  timezone: string;
}

export interface StarSource {
  id: string;
  title: string;
  description: string;
  happenedAt: string;
  media?: { id: string; kind: 'image' | 'video' | 'audio' }[];
  visibility?: 'shared' | 'private';
}

export interface StarDetail extends UniverseStar {
  source: StarSource;
}
