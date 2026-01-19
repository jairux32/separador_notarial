
import { GoogleGenAI, Type } from "@google/genai";
import { GeminiAnalysisResult } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Función auxiliar para limpiar respuestas JSON de LLMs que incluyen Markdown
 */
const cleanJsonString = (str: string): string => {
  // Eliminar bloques de código markdown ```json ... ``` o ``` ... ```
  let cleaned = str.replace(/```json/g, "").replace(/```/g, "");
  
  // Buscar el primer corchete '[' y el último ']' para aislar el array
  const firstBracket = cleaned.indexOf('[');
  const lastBracket = cleaned.lastIndexOf(']');
  
  if (firstBracket !== -1 && lastBracket !== -1) {
    cleaned = cleaned.substring(firstBracket, lastBracket + 1);
  }
  
  return cleaned.trim();
};

/**
 * Busca múltiples códigos alfanuméricos en un texto y sugiere la segmentación.
 */
export const discoverActsInText = async (text: string): Promise<any[]> => {
  if (!text || text.trim().length < 10) return [];
  
  try {
    const model = "gemini-1.5-flash";
    // Prompt optimizado para ser tolerante a fallos
    const prompt = `
      Analiza el siguiente texto OCR sucio de un libro notarial.
      Tu misión única es extraer metadatos de Actos Notariales.

      BUSCA PATRONES QUE SE PAREZCAN A ESTO (Código 17 chars):
      Año(4) + Notaría(7) + Letra(1) + Secuencial(5)
      Ejemplo ideal: 20241701001P00123
      
      IMPORTANTE: El OCR puede confundir:
      - '0' (cero) con 'O' (letra)
      - '1' (uno) con 'I' (letra) o '|'
      - '8' con 'B'
      
      Si ves algo como "2O24..." corrígelo a "2024...".
      
      Devuelve SOLO un array JSON con los actos encontrados.
      Si no encuentras nada seguro, devuelve un array vacío [].

      TEXTO OCR:
      ${text.substring(0, 20000)}
    `;

    const response = await ai.models.generateContent({
      model: model,
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              code: { type: Type.STRING, description: "Código corregido de 17 caracteres" },
              type: { type: Type.STRING, description: "Tipo de acto (ej. Compraventa)" },
              grantors: { type: Type.STRING, description: "Nombres de personas encontradas cerca" },
              date: { type: Type.STRING, description: "Fecha encontrada" }
            },
            required: ["code", "type"]
          }
        }
      }
    });

    const cleanText = cleanJsonString(response.text || "[]");
    const result = JSON.parse(cleanText);
    return Array.isArray(result) ? result : [];
  } catch (error) {
    console.error("Discovery error (Gemini):", error);
    return [];
  }
};

export const analyzeNotarialText = async (text: string): Promise<GeminiAnalysisResult> => {
  try {
    const model = "gemini-1.5-flash";
    const prompt = `
      Analiza este texto notarial. Extrae: código (17 chars), tipo de acto, otorgantes y fecha.
      Devuelve JSON puro.
      Texto: "${text.substring(0, 5000)}"
    `;
    const response = await ai.models.generateContent({
      model: model,
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json"
      }
    });
    
    const cleanText = cleanJsonString(response.text || "{}");
    const parsed = JSON.parse(cleanText);
    
    return {
      code: parsed.code || "",
      type: parsed.type || "Desconocido",
      grantors: parsed.grantors || "No detectado",
      date: parsed.date || "",
      confidence: parsed.confidence || 0.8
    };
  } catch (error) {
    console.error("Analysis error:", error);
    return { code: "", type: "Error de análisis", grantors: "", date: "", confidence: 0 };
  }
};
