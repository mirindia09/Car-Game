export interface CarStats {
  engine: number; // 1 to 5 (acceleration)
  tires: number;  // 1 to 5 (grip)
  weight: number; // 1 to 5 (handling / sliding inertia)
  boost: number;  // 1 to 5 (nitro boost capacity)
}

export interface CarCustomization {
  color: string;       // HEX color
  underglow: string;   // HEX or 'none'
  bodyType: 'sports' | 'muscle' | 'drift' | 'truck';
  rims: 'standard' | 'racing' | 'retro' | 'neon';
  stats: CarStats;
}

export type PlayerState = 'lobby' | 'ready' | 'racing' | 'finished';

export interface Player {
  id: string;
  name: string;
  x: number;
  y: number;
  angle: number;
  vx: number;
  vy: number;
  angularVelocity: number;
  driftValue: number; // current skid score
  isDrifting: boolean;
  color: string;
  customization: CarCustomization;
  state: PlayerState;
  currentLap: number;
  lastCheckpoint: number;
  finishedTime?: number;
  ping?: number;
}

export type ObjectType = 'cone' | 'barrel' | 'box' | 'barrier';

export interface DestructibleObject {
  id: string;
  type: ObjectType;
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  vangle: number;
  mass: number;
  radius: number;
  isDestroyed: boolean;
  health: number;
}

export type WeatherType = 'sunny' | 'rainy' | 'snowy' | 'night';

export interface ShortcutArea {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  isRevealed: boolean;
  destructibleBarrierId: string; // ID of the object blocking it
}

export interface MapData {
  id: string;
  name: string;
  description: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  width: number;
  height: number;
  startPos: { x: number; y: number; angle: number };
  checkpoints: { x: number; y: number; radius: number }[];
  laps: number;
  walls: { x1: number; y1: number; x2: number; y2: number }[];
  destructibles: { id: string; type: ObjectType; x: number; y: number }[];
  shortcuts: ShortcutArea[];
  backgroundUrl?: string;
}

export type RaceStage = 'lobby' | 'countdown' | 'racing' | 'finished';

export interface GameRoom {
  id: string;
  name: string;
  hostId: string;
  players: { [id: string]: Player };
  mapId: string;
  weather: WeatherType;
  stage: RaceStage;
  countdown: number; // in seconds
  destructibles: DestructibleObject[];
}

export interface ClientEvent {
  type: string;
  [key: string]: any;
}
