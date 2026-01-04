
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { AnalysisResult } from "../types";

// Try multiple environment variable names for compatibility
const API_KEY = process.env.VITE_GEMINI_API_KEY || process.env.API_KEY || process.env.GEMINI_API_KEY || '';

const MODEL_NAME = 'gemini-2.0-flash';

export const analyzeReviews = async (text: string): Promise<AnalysisResult> => {
  if (!API_KEY) {
    throw new Error('API Key is not configured. Please set VITE_GEMINI_API_KEY environment variable.');
  }
  const ai = new GoogleGenAI({ apiKey: API_KEY });

  const response = await ai.models.generateContent({
    model: MODEL_NAME,
    contents: `Analyze the following customer reviews and provide a detailed sentiment report in JSON format.
    The reviews may or may not have dates. If they don't have dates, use a logical sequence of dates starting from today backwards.
    
    CRITICAL RULES:
    1. Overall stats (positive, neutral, negative) MUST sum exactly to 100.
    2. Score for trend points should be between -1.0 and 1.0.
    3. Average score should be the mean of all sentiment scores (-1.0 to 1.0).

    Reviews:
    ${text}
    `,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          summary: { type: Type.STRING },
          sentimentTrend: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                date: { type: Type.STRING },
                score: { type: Type.NUMBER },
                label: { type: Type.STRING }
              },
              required: ['date', 'score', 'label']
            }
          },
          keywords: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                text: { type: Type.STRING },
                value: { type: Type.NUMBER },
                sentiment: { type: Type.STRING }
              },
              required: ['text', 'value', 'sentiment']
            }
          },
          actionableItems: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                description: { type: Type.STRING },
                impact: { type: Type.STRING }
              },
              required: ['title', 'description', 'impact']
            }
          },
          overallStats: {
            type: Type.OBJECT,
            properties: {
              positive: { type: Type.NUMBER },
              neutral: { type: Type.NUMBER },
              negative: { type: Type.NUMBER },
              averageScore: { type: Type.NUMBER }
            },
            required: ['positive', 'neutral', 'negative', 'averageScore']
          }
        },
        required: ['summary', 'sentimentTrend', 'keywords', 'actionableItems', 'overallStats']
      }
    }
  });

  return JSON.parse(response.text || '{}') as AnalysisResult;
};

export const chatWithAI = async function* (history: { role: 'user' | 'model', parts: { text: string }[] }[], message: string) {
  if (!API_KEY) {
    throw new Error('API Key is not configured.');
  }
  const ai = new GoogleGenAI({ apiKey: API_KEY });

  const responseStream = await ai.models.generateContentStream({
    model: MODEL_NAME,
    contents: [
      ...history,
      { role: 'user', parts: [{ text: message }] }
    ],
    config: {
      systemInstruction: "You are a Customer Sentiment Analyst expert. Analyze trends, suggest complex business strategies, and answer questions based on customer feedback data. Be professional, data-driven, and insightful."
    }
  });

  for await (const chunk of responseStream) {
    const c = chunk as GenerateContentResponse;
    yield c.text;
  }
};
