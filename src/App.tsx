import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Apple, Banana, Sparkles, Flame } from "lucide-react";
import type { Food, GameStateRow } from "./types";

const GRID_SIZE = 24;
const MAX_FOODS = 20;
const CELL_PX = 18;

const defaultState: GameStateRow = {
  id: "local-fallback",
  slug: "pjcd-main",
  stage: "caterpillar",
  xp: 0,
  xp_max: 1000,
  buyback: 0,
  moves: 0,
  seconds_until_move: 10,
  eaten_apples: 0,
  eaten_bananas: 0,
  chips_burned: false,
  last_move: "未开始",
  foods: [],
  worm: [
    { x: 8, y: 12 },
    { x: 7, y: 12 },
    { x: 6, y: 12 },
    { x: 5, y: 12 },
  ],
  events: [
    "系统启动：Agent 正在持续观察代币链上交易情况。",
    "规则：每 10 秒，Agent 会根据代币链上交易情况自主判断方向，并控制毛毛虫移动 1 次；只会前进、左转或右转，不会后退。",
  ],
  updated_at: new Date().toISOString(),
};

function keyOf(pos: { x: number; y: number }) {
  return `${pos.x}-${pos.y}`;
}

function PixelCell({ children, className = "" }: { children?: React.ReactNode; className?: string }) {
  return (
    <div
      className={`relative border border-black/10 ${className}`}
      style={{ width: CELL_PX, height: CELL_PX, imageRendering: "pixelated" }}
    >
      {children}
    </div>
  );
}

export default function CaterpillarVolumeSandboxDemo() {
  const [game, setGame] = useState<GameStateRow>(defaultState);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    const load = async () => {
      try {
        const res = await fetch("/api/state", { cache: "no-store" });
        if (!res.ok) throw new Error(`API ${res.status}`);
        const data = (await res.json()) as GameStateRow;
        if (!alive) return;
        setGame({
          ...data,
          foods: data.foods ?? [],
          worm: data.worm?.length ? data.worm : defaultState.worm,
          events: data.events ?? defaultState.events,
        });
        setError(null);
      } catch (err) {
        if (!alive) return;
        setError(err instanceof Error ? err.message : "加载失败");
      } finally {
        if (alive) setLoading(false);
      }
    };

    load();
    const timer = window.setInterval(load, 1000);
    return () => {
      alive = false;
      window.clearInterval(timer);
    };
  }, []);

  const foodMap = useMemo(() => {
    const map = new Map<string, Food>();
    game.foods.forEach((food) => map.set(keyOf(food), food));
    return map;
  }, [game.foods]);

  const wormMap = useMemo(() => {
    const map = new Map<string, number>();
    game.worm.forEach((part, index) => map.set(keyOf(part), index));
    return map;
  }, [game.worm]);

  const xpPercent = Math.round((game.xp / game.xp_max) * 100);
  const butterflyPulse = game.stage === "butterfly";

  if (loading) {
    return <div className="min-h-screen bg-zinc-950 text-zinc-100 grid place-items-center">正在加载统一状态…</div>;
  }

  return (
    <div className="min-h-screen w-full bg-zinc-950 p-6 text-zinc-100">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-3">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-sm text-emerald-300">
              <Sparkles className="h-4 w-4" />
              Agent 驱动 / 链上感应进化沙盒 Demo
            </div>
            <div className="mt-5 flex items-center gap-4">
              <img src="./project-logo.jpg" alt="Project Logo" className="h-20 w-20 rounded-2xl border border-lime-300/30 object-cover shadow-lg shadow-lime-500/10" />
              <div>
                <h1 className="text-3xl font-bold tracking-tight">破茧成蝶 flap首个Agent链上生命体</h1>
              </div>
            </div>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-400 whitespace-pre-line">
              {`毛毛虫 Agent 将以 10 秒为一个感知周期，持续监听代币的链上交易动态，并基于实时市场信号 自主决策下一次移动方向。由 Agent 独立判断生成
在探索过程中，若毛毛虫吞食 苹果，系统将自动执行 0.15 BNB 回购，并获得 10 点经验值；若吞食 香蕉，则自动执行 0.3 BNB 回购，并获得 15 点经验值。
随着经验不断积累，当经验值达到 1000 时，生命周期将进入最终进化阶段：此前通过回购所获得的全部筹码将被 一次性销毁，毛毛虫 Agent 完成从幼体到高阶形态的跃迁，正式 破茧成蝶。`}
            </p>
            {error ? <div className="mt-3 text-sm text-red-300">接口异常：{error}</div> : null}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_420px]">
          <Card className="rounded-3xl border-zinc-800 bg-zinc-900/80 shadow-2xl shadow-black/20">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between text-lg">
                <span>像素沙盒地图</span>
                <div className="flex items-center gap-2">
                  <Badge className="rounded-full bg-zinc-800 text-zinc-200 hover:bg-zinc-800">{GRID_SIZE} × {GRID_SIZE}</Badge>
                  <Badge className={`rounded-full ${game.stage === "butterfly" ? "bg-fuchsia-500/20 text-fuchsia-200" : "bg-emerald-500/20 text-emerald-200"}`}>
                    {game.stage === "butterfly" ? "破茧成蝶" : "毛毛虫阶段"}
                  </Badge>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mx-auto grid rounded-2xl border-4 border-zinc-800 bg-[#9ad36a] p-2 shadow-inner" style={{ gridTemplateColumns: `repeat(${GRID_SIZE}, ${CELL_PX}px)`, width: GRID_SIZE * CELL_PX + 16 }}>
                {Array.from({ length: GRID_SIZE * GRID_SIZE }).map((_, index) => {
                  const x = index % GRID_SIZE;
                  const y = Math.floor(index / GRID_SIZE);
                  const key = `${x}-${y}`;
                  const food = foodMap.get(key);
                  const wormIndex = wormMap.get(key);
                  const isHead = wormIndex === 0;
                  const isBody = wormIndex !== undefined;
                  const isButterflySpot = game.stage === "butterfly" && x >= 9 && x <= 14 && y >= 9 && y <= 14;

                  return (
                    <PixelCell key={key} className={(x + y) % 2 === 0 ? "bg-[#87c45a]" : "bg-[#96d267]"}>
                      {isBody && game.stage !== "butterfly" ? (
                        <div className={`absolute inset-[1px] ${isHead ? "bg-emerald-900" : "bg-emerald-700"}`} style={{ imageRendering: "pixelated" }}>
                          {isHead ? (
                            <>
                              <div className="absolute left-[3px] top-[4px] h-[2px] w-[2px] bg-white" />
                              <div className="absolute right-[3px] top-[4px] h-[2px] w-[2px] bg-white" />
                              <div className="absolute left-[2px] top-[1px] h-[2px] w-[2px] bg-lime-200" />
                              <div className="absolute right-[2px] top-[1px] h-[2px] w-[2px] bg-lime-200" />
                            </>
                          ) : null}
                        </div>
                      ) : null}
                      {food && game.stage !== "butterfly" ? <div className="absolute inset-0 flex items-center justify-center text-[11px]">{food.type === "apple" ? "🍎" : "🍌"}</div> : null}
                      {isButterflySpot ? (
                        <div className={`absolute inset-0 flex items-center justify-center text-[14px] transition-transform ${butterflyPulse ? "scale-125" : "scale-100"}`}>
                          {x === 11 && y === 11 ? "🦋" : ""}
                        </div>
                      ) : null}
                    </PixelCell>
                  );
                })}
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-zinc-400">
                <span className="rounded-full bg-zinc-800 px-3 py-1">每 10 秒 Agent 自主决策移动 1 次</span>
                <span className="rounded-full bg-zinc-800 px-3 py-1">地图最多 {MAX_FOODS} 个水果</span>
                <span className="rounded-full bg-zinc-800 px-3 py-1">苹果：+10 经验 / 回购 0.15 BNB</span>
                <span className="rounded-full bg-zinc-800 px-3 py-1">香蕉：+15 经验 / 回购 0.3 BNB</span>
              </div>

              <Card className="mt-6 rounded-3xl border-zinc-800 bg-zinc-900/80">
                <CardHeader><CardTitle className="text-lg">事件日志</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {game.events.map((item, index) => (
                      <div key={`${item}-${index}`} className="rounded-2xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-300">{item}</div>
                    ))}
                  </div>
                  {game.chips_burned ? (
                    <div className="mt-4 rounded-2xl border border-orange-500/30 bg-orange-500/10 p-4 text-sm text-orange-200">
                      <div className="mb-1 flex items-center gap-2 font-semibold"><Flame className="h-4 w-4" />筹码已全部销毁</div>
                      破茧成蝶已触发。后续可以继续扩展成第二阶段、空投阶段，或者新的回购与销毁循环。
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card className="rounded-3xl border-zinc-800 bg-zinc-900/80">
              <CardHeader><CardTitle className="text-lg">核心数据面板</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4"><div className="text-xs text-zinc-500">移动次数</div><div className="mt-1 text-2xl font-bold">{game.moves}</div></div>
                  <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4"><div className="text-xs text-zinc-500">累计回购</div><div className="mt-1 text-2xl font-bold text-yellow-300">{Number(game.buyback).toFixed(2)} BNB</div></div>
                  <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4"><div className="text-xs text-zinc-500">Agent 状态</div><div className="mt-1 text-xl font-bold">{game.stage === "butterfly" ? "已成蝶" : "决策中"}</div></div>
                  <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4"><div className="text-xs text-zinc-500">上次移动</div><div className="mt-1 text-xl font-bold">{game.last_move}</div></div>
                </div>

                <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
                  <div className="mb-2 flex items-center justify-between text-sm"><span className="text-zinc-400">经验值</span><span className="font-semibold text-fuchsia-300">{game.xp}/{game.xp_max}</span></div>
                  <Progress value={Math.round((game.xp / game.xp_max) * 100)} className="h-3" />
                  <div className="mt-2 text-xs text-zinc-500">经验达到 1000 后：全部筹码销毁，进入破茧成蝶阶段。</div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4"><div className="text-xs text-zinc-500">吃到苹果</div><div className="mt-1 flex items-center gap-2 text-xl font-bold text-red-300"><Apple className="h-4 w-4" /> {game.eaten_apples}</div></div>
                  <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4"><div className="text-xs text-zinc-500">吃到香蕉</div><div className="mt-1 flex items-center gap-2 text-xl font-bold text-yellow-300"><Banana className="h-4 w-4" /> {game.eaten_bananas}</div></div>
                </div>

                <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
                  <div className="flex items-center justify-between text-sm"><span className="text-zinc-400">下次 Agent 决策倒计时</span><span className="font-semibold text-emerald-300">{game.stage !== "butterfly" ? `${game.seconds_until_move}s` : "已停止"}</span></div>
                  <Progress value={game.stage !== "butterfly" ? ((10 - game.seconds_until_move) / 10) * 100 : 100} className="mt-2 h-3" />
                  <div className="mt-2 text-xs text-zinc-500">当前概念节奏：每 10 秒进行一次链上感应决策并移动 1 次</div>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-3xl border-zinc-800 bg-zinc-900/80">
              <CardHeader><CardTitle className="text-lg">Agent 运行控制</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className={`rounded-2xl border p-4 text-sm transition-all duration-500 ${game.seconds_until_move <= 10 && game.seconds_until_move > 7 ? "border-emerald-400/60 bg-emerald-500/15 text-emerald-100 shadow-lg shadow-emerald-500/10" : "border-zinc-800 bg-zinc-950 text-zinc-400"}`}><div className="font-medium">监听链上动态，形成决策输入</div></div>
                <div className={`rounded-2xl border p-4 text-sm transition-all duration-500 ${game.seconds_until_move <= 7 && game.seconds_until_move > 4 ? "border-cyan-400/60 bg-cyan-500/15 text-cyan-100 shadow-lg shadow-cyan-500/10" : "border-zinc-800 bg-zinc-950 text-zinc-400"}`}><div className="font-medium">解析交易数据，判断移动方向</div></div>
                <div className={`rounded-2xl border p-4 text-sm transition-all duration-500 ${game.seconds_until_move <= 4 && game.seconds_until_move >= 1 ? "border-fuchsia-400/60 bg-fuchsia-500/15 text-fuchsia-100 shadow-lg shadow-fuchsia-500/10" : "border-zinc-800 bg-zinc-950 text-zinc-400"}`}><div className="font-medium">执行行动指令，完成状态反馈</div></div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
