import "server-only";
import { GoogleGenAI } from "@google/genai";

export function getGemini() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Gemini is not configured.");
  return new GoogleGenAI({ apiKey });
}
export function getGeminiModel() {
  const model = process.env.GEMINI_MODEL;
  if (!model) throw new Error("Choose GEMINI_MODEL in .env.local before making AI calls.");
  return model;
}
