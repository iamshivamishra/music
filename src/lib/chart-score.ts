export interface ChartScoreWeights {
  sales: number;
  plays: number;
  likes: number;
}

/** Windowed sales + lifetime plays/likes. Zero weekly sales still ranks via plays/likes. */
export const CHART_SCORE_WEIGHTS: ChartScoreWeights = {
  sales: 10,
  plays: 1,
  likes: 3,
};

export const CHART_WINDOW_DAYS = 7;
