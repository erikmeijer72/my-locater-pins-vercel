import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const getPlaceVibe = async (address: string) => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Geef een zeer korte, poëtische beschrijving van één zin over de omgeving van dit adres: ${address}`,
      config: {
        // maxOutputTokens removed to avoid conflicts with thinking budget in newer models
        temperature: 0.7,
      }
    });
    // Gebruik de .text eigenschap om de gegenereerde inhoud te benaderen.
    return response.text || "Een prachtige plek vastgelegd.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Een nieuwe herinnering toegevoegd aan de kaart.";
  }
};