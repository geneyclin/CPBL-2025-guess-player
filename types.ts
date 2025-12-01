
export type PlayerType = 'batter' | 'pitcher';

export interface StatItem {
  label: string;
  value: string | number; // e.g., ".302" or "145"
  pr: number; // 0-99
}

export interface PlayerData {
  name: string;
  team: string;
  type: PlayerType;
  year: string;
  stats: StatItem[];
  // For batters: mock spray chart data points
  sprayChart?: { x: number; y: number; type: '1B' | '2B' | '3B' | 'HR' | 'FO' }[]; 
  // For pitchers: mock velocity distribution
  pitchDistribution?: { type: string; mean: number; data: { speed: number; count: number }[] }[];
  // Grounding sources
  sourceUrls?: string[];
}

export enum GameStatus {
  LOADING,
  PLAYING,
  WON,
  LOST,
  ERROR
}

export interface Guess {
  name: string;
  isCorrect: boolean;
  data?: PlayerData; // The stats of the guessed player (for comparison)
  error?: string;    // Error message if player not found/qualified
  isLoading?: boolean; // Loading state for lazy fetching stats
}