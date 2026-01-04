
export interface SentimentPoint {
  date: string;
  score: number; // -1 to 1
  label: string;
}

export interface Keyword {
  text: string;
  value: number;
  sentiment: 'positive' | 'negative' | 'neutral';
}

export interface ActionableItem {
  title: string;
  description: string;
  impact: 'High' | 'Medium' | 'Low';
}

export interface AnalysisResult {
  summary: string;
  sentimentTrend: SentimentPoint[];
  keywords: Keyword[];
  actionableItems: ActionableItem[];
  overallStats: {
    positive: number;
    neutral: number;
    negative: number;
    averageScore: number;
  };
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  isThinking?: boolean;
}
