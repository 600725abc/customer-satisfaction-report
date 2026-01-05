
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { AnalysisResult } from "../types";

// Use import.meta.env for Vite, with fallback to process.env for compatibility
const API_KEY = (import.meta as any).env?.VITE_GEMINI_API_KEY ||
  (typeof process !== 'undefined' && process.env?.VITE_GEMINI_API_KEY) ||
  (typeof process !== 'undefined' && process.env?.API_KEY) ||
  '';

// Trying gemini-2.0-flash-exp as alternative
const MODEL_NAME = 'gemini-2.0-flash-exp';

export const analyzeReviews = async (text: string): Promise<AnalysisResult> => {
  if (!API_KEY) {
    console.error("Gemini Service: API Key is missing!");
    throw new Error('API Key is not configured. Please set VITE_GEMINI_API_KEY environment variable.');
  }

  const genAI = new GoogleGenerativeAI(API_KEY);
  const model = genAI.getGenerativeModel({
    model: MODEL_NAME,
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: {
        type: SchemaType.OBJECT,
        properties: {
          summary: { type: SchemaType.STRING },
          sentimentTrend: {
            type: SchemaType.ARRAY,
            items: {
              type: SchemaType.OBJECT,
              properties: {
                date: { type: SchemaType.STRING },
                score: { type: SchemaType.NUMBER },
                label: { type: SchemaType.STRING }
              },
              required: ['date', 'score', 'label']
            }
          },
          keywords: {
            type: SchemaType.ARRAY,
            items: {
              type: SchemaType.OBJECT,
              properties: {
                text: { type: SchemaType.STRING },
                value: { type: SchemaType.NUMBER },
                sentiment: { type: SchemaType.STRING }
              },
              required: ['text', 'value', 'sentiment']
            }
          },
          actionableItems: {
            type: SchemaType.ARRAY,
            items: {
              type: SchemaType.OBJECT,
              properties: {
                title: { type: SchemaType.STRING },
                description: { type: SchemaType.STRING },
                impact: { type: SchemaType.STRING }
              },
              required: ['title', 'description', 'impact']
            }
          },
          overallStats: {
            type: SchemaType.OBJECT,
            properties: {
              positive: { type: SchemaType.NUMBER },
              neutral: { type: SchemaType.NUMBER },
              negative: { type: SchemaType.NUMBER },
              averageScore: { type: SchemaType.NUMBER }
            },
            required: ['positive', 'neutral', 'negative', 'averageScore']
          }
        },
        required: ['summary', 'sentimentTrend', 'keywords', 'actionableItems', 'overallStats']
      }
    }
  });

  const prompt = `Analyze the following customer reviews and provide a detailed sentiment report in JSON format.
    The reviews may or may not have dates. If they don't have dates, use a logical sequence of dates starting from today backwards.
    
    CRITICAL RULES:
    1. Overall stats (positive, neutral, negative) MUST sum exactly to 100.
    2. Score for trend points should be between -1.0 and 1.0.
    3. Average score should be the mean of all sentiment scores (-1.0 to 1.0).
    4. actionableItems MUST contain EXACTLY 3 items, no more, no less.
    5. actionableItems MUST be sorted by urgency - the most critical issue that needs immediate attention should be FIRST.
    6. Each actionableItem's "impact" field MUST be one of: "High", "Medium", or "Low" - representing urgency level.

    Reviews:
    ${text}`;

  const result = await model.generateContent(prompt);
  const response = result.response;
  return JSON.parse(response.text()) as AnalysisResult;
};

export const chatWithAI = async function* (history: { role: 'user' | 'model', parts: { text: string }[] }[], message: string) {
  if (!API_KEY) {
    throw new Error('API Key is not configured.');
  }
  const genAI = new GoogleGenerativeAI(API_KEY);
  const model = genAI.getGenerativeModel({
    model: MODEL_NAME
  });

  // Prepend system instruction as first exchange in history for better model compatibility
  const systemPrompt = "You are a Customer Sentiment Analyst expert. Analyze trends, suggest complex business strategies, and answer questions based on customer feedback data. Be professional, data-driven, and insightful.";

  const fullHistory = [
    { role: 'user' as const, parts: [{ text: `System: ${systemPrompt}` }] },
    { role: 'model' as const, parts: [{ text: 'Understood. I am ready to help you analyze customer sentiment data and provide strategic insights.' }] },
    ...history
  ];

  const chat = model.startChat({
    history: fullHistory
  });

  const result = await chat.sendMessageStream(message);

  for await (const chunk of result.stream) {
    const chunkText = chunk.text();
    yield chunkText;
  }
};
