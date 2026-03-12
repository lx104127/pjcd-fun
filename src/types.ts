export type Stage = 'caterpillar' | 'butterfly';
export type FoodType = 'apple' | 'banana';
export type DirectionName = '上' | '右' | '下' | '左';

export type Position = {
  x: number;
  y: number;
};

export type Food = Position & {
  type: FoodType;
  id: string;
};

export type GameStateRow = {
  id: string;
  slug: string;
  stage: Stage;
  xp: number;
  xp_max: number;
  buyback: number;
  moves: number;
  seconds_until_move: number;
  eaten_apples: number;
  eaten_bananas: number;
  chips_burned: boolean;
  last_move: string;
  foods: Food[];
  worm: Position[];
  events: string[];
  updated_at: string;
};