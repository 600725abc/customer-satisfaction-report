
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { AnalysisResult } from "../types";

// Use import.meta.env for Vite, with fallback to process.env for compatibility
const API_KEY = (import.meta as any).env?.VITE_GEMINI_API_KEY ||
  (typeof process !== 'undefined' && process.env?.VITE_GEMINI_API_KEY) ||
  (typeof process !== 'undefined' && process.env?.API_KEY) ||
  '';

// Fallback to gemini-pro if flash is causing 404s
const MODEL_NAME = 'gemini-pro';

// Debug helper to check what the API key can actually access
async function logAvailableModels(genAI: GoogleGenerativeAI) {
  try {
    // Note: listModels might not be available in browser-side SDK directly in some versions,
    // but if it is, this helps. If it fails, we catch the error.
    // The client SDK usually doesn't expose listModels directly to avoid leaking info,
    // but some versions do. If this fails, we just ignore it.
    console.log("Attempting to list available models...");
    // @ts-ignore - accessing internal or potentially unexposed method for debug
    if (genAI.getGenerativeModel) {
      console.log("Checking model access for:", MODEL_NAME);
    }
  } catch (e) {
    console.log("Could not list models (expected in browser env):", e);
  }
}

export const analyzeReviews = async (text: string): Promise<AnalysisResult> => {
  if (!API_KEY) {
    console.error("Gemini Service: API Key is missing!");
    throw new Error('API Key is not configured. Please set VITE_GEMINI_API_KEY environment variable.');
  }

  const genAI = new GoogleGenerativeAI(API_KEY);

  // Debug log
  await logAvailableModels(genAI);

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
    model: MODEL_NAME,
    systemInstruction: "You are a Customer Sentiment Analyst expert. Analyze trends, suggest complex business strategies, and answer questions based on customer feedback data. Be professional, data-driven, and insightful."
  });

  const chat = model.startChat({
    history: history
  });

  const result = await chat.sendMessageStream(message);

  for await (const chunk of result.stream) {
    const chunkText = chunk.text();
    yield chunkText;
  }
};
