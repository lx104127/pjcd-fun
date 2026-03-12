import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

type Stage = 'caterpillar' | 'butterfly';
type FoodType = 'apple' | 'banana';
type DirectionName = '上' | '右' | '下' | '左';
type Position = { x: number; y: number };
type Food = Position & { type: FoodType; id: string };
type GameStateRow = {
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

type Direction = Position & { name: DirectionName };

type FoodMeta = { label: string; emoji: string; buyback: number; xp: number };

const GRID_SIZE = 24;
const MAX_FOODS = 20;
const TICK_SECONDS = 10;
const FOOD_TYPES: Record<FoodType, FoodMeta> = {
  apple: { label: '苹果', emoji: '🍎', buyback: 0.15, xp: 10 },
  banana: { label: '香蕉', emoji: '🍌', buyback: 0.3, xp: 15 },
};
const DIRECTIONS: Direction[] = [
  { x: 0, y: -1, name: '上' },
  { x: 1, y: 0, name: '右' },
  { x: 0, y: 1, name: '下' },
  { x: -1, y: 0, name: '左' },
];

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const slug = process.env.GAME_STATE_SLUG || 'pjcd-main';

function keyOf(pos: Position) { return `${pos.x}-${pos.y}`; }
function samePos(a: Position, b: Position) { return a.x === b.x && a.y === b.y; }
function clampWrap(n: number) { if (n < 0) return GRID_SIZE - 1; if (n >= GRID_SIZE) return 0; return n; }
function randInt(max: number) { return Math.floor(Math.random() * max); }
function randomFoodType(): FoodType { return Math.random() < 0.75 ? 'apple' : 'banana'; }
function turnLeftIndex(idx: number) { return (idx + 3) % 4; }
function turnRightIndex(idx: number) { return (idx + 1) % 4; }
function describeTurn(prevIndex: number, nextIndex: number) {
  if (nextIndex === prevIndex) return '前进';
  if (nextIndex === turnLeftIndex(prevIndex)) return '左转';
  return '右转';
}
function buildMove(directionIndex: number) {
  const candidateIndexes = [directionIndex, turnLeftIndex(directionIndex), turnRightIndex(directionIndex)];
  const nextDirectionIndex = candidateIndexes[randInt(candidateIndexes.length)];
  return { nextDirectionIndex, dir: DIRECTIONS[nextDirectionIndex], moveType: describeTurn(directionIndex, nextDirectionIndex) };
}
function getEmptyCell(excluded: Position[]): Position | null {
  const taken = new Set(excluded.map(keyOf));
  let tries = 0;
  while (tries < 500) {
    const cell = { x: randInt(GRID_SIZE), y: randInt(GRID_SIZE) };
    if (!taken.has(keyOf(cell))) return cell;
    tries += 1;
  }
  return null;
}
function spawnFoodsForState(wormState: Position[], foodState: Food[], stage: Stage): Food[] {
  const nextFoods = [...foodState];
  while (nextFoods.length < MAX_FOODS && stage !== 'butterfly') {
    const occupied: Position[] = [...wormState, ...nextFoods.map((f) => ({ x: f.x, y: f.y }))];
    const cell = getEmptyCell(occupied);
    if (!cell) break;
    const type = randomFoodType();
    nextFoods.push({ ...cell, type, id: `${type}-${Date.now()}-${Math.random()}` });
  }
  return nextFoods;
}
function inferDirectionIndex(worm: Position[]): number {
  if (worm.length < 2) return 1;
  const head = worm[0];
  const neck = worm[1];
  const dx = clampWrap(head.x - neck.x) === 0 ? head.x - neck.x : head.x === 0 && neck.x === GRID_SIZE - 1 ? 1 : head.x === GRID_SIZE - 1 && neck.x === 0 ? -1 : head.x - neck.x;
  const dy = clampWrap(head.y - neck.y) === 0 ? head.y - neck.y : head.y === 0 && neck.y === GRID_SIZE - 1 ? 1 : head.y === GRID_SIZE - 1 && neck.y === 0 ? -1 : head.y - neck.y;
  const idx = DIRECTIONS.findIndex((d) => d.x === dx && d.y === dy);
  return idx >= 0 ? idx : 1;
}

function applyTick(current: GameStateRow): GameStateRow {
  if (current.stage === 'butterfly') return current;
  const directionIndex = inferDirectionIndex(current.worm);
  const head = current.worm[0];
  const { dir, moveType } = buildMove(directionIndex);
  const nextHead: Position = { x: clampWrap(head.x + dir.x), y: clampWrap(head.y + dir.y) };
  let nextWorm: Position[] = [nextHead, ...current.worm.slice(0, current.worm.length - 1)];
  let nextFoods = [...(current.foods || [])];
  let nextBuyback = Number(current.buyback || 0);
  let nextXp = current.xp || 0;
  let nextEatenApples = current.eaten_apples || 0;
  let nextEatenBananas = current.eaten_bananas || 0;
  const nextEvents = [`Agent 决策触发：根据链上交易情况，毛毛虫${moveType} 1 格，当前朝向 ${dir.name}。`, ...(current.events || [])].slice(0, 10);
  const hitFood = nextFoods.find((food) => samePos(food, nextHead));
  if (hitFood) {
    const meta = FOOD_TYPES[hitFood.type];
    nextFoods = nextFoods.filter((food) => food.id !== hitFood.id);
    nextBuyback = Number((nextBuyback + meta.buyback).toFixed(2));
    nextXp = Math.min(current.xp_max || 1000, nextXp + meta.xp);
    if (hitFood.type === 'apple') nextEatenApples += 1; else nextEatenBananas += 1;
    nextEvents.unshift(`吃到${meta.label} ${meta.emoji}：触发回购 ${meta.buyback} BNB，经验 +${meta.xp}。`);
  }
  let nextStage: Stage = current.stage;
  let chipsBurned = current.chips_burned;
  if (nextXp >= (current.xp_max || 1000)) {
    nextStage = 'butterfly';
    chipsBurned = true;
    nextFoods = [];
    nextEvents.unshift('经验已满：筹码全部销毁，毛毛虫开始破茧成蝶。🦋');
  } else {
    nextFoods = spawnFoodsForState(nextWorm, nextFoods, nextStage);
  }
  return {
    ...current,
    stage: nextStage,
    chips_burned: chipsBurned,
    worm: nextWorm,
    foods: nextFoods,
    last_move: `${moveType}（朝${dir.name}）`,
    moves: (current.moves || 0) + 1,
    buyback: nextBuyback,
    xp: nextXp,
    eaten_apples: nextEatenApples,
    eaten_bananas: nextEatenBananas,
    events: nextEvents.slice(0, 10),
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(500).json({ error: 'Missing server env' });
  }

  const { data, error } = await supabase.from('game_state').select('*').eq('slug', slug).single();
  if (error || !data) return res.status(500).json({ error: error?.message || 'No state found' });

  let state = data as GameStateRow;
  const now = Date.now();
  const updatedAt = new Date(state.updated_at).getTime();
  const elapsedSeconds = Math.max(0, Math.floor((now - updatedAt) / 1000));
  const ticksDue = state.stage === 'butterfly' ? 0 : Math.floor(elapsedSeconds / TICK_SECONDS);

  if (ticksDue > 0) {
    for (let i = 0; i < ticksDue; i += 1) state = applyTick(state);
    const newUpdatedAt = new Date(updatedAt + ticksDue * TICK_SECONDS * 1000).toISOString();
    const payload = {
      stage: state.stage,
      xp: state.xp,
      xp_max: state.xp_max,
      buyback: state.buyback,
      moves: state.moves,
      seconds_until_move: state.stage === 'butterfly' ? 0 : TICK_SECONDS,
      eaten_apples: state.eaten_apples,
      eaten_bananas: state.eaten_bananas,
      chips_burned: state.chips_burned,
      last_move: state.last_move,
      foods: state.foods,
      worm: state.worm,
      events: state.events,
      updated_at: newUpdatedAt,
    };
    const { data: updatedRows, error: updateError } = await supabase
      .from('game_state')
      .update(payload)
      .eq('slug', slug)
      .select('*')
      .single();
    if (!updateError && updatedRows) state = updatedRows as GameStateRow;
  }

  const sinceUpdate = Math.max(0, Math.floor((Date.now() - new Date(state.updated_at).getTime()) / 1000));
  const secondsUntilMove = state.stage === 'butterfly' ? 0 : Math.max(1, TICK_SECONDS - (sinceUpdate % TICK_SECONDS));
  return res.status(200).json({ ...state, seconds_until_move: secondsUntilMove });
}
