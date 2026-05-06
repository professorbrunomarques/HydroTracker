import { GoogleGenAI } from "@google/genai";
import { ExtractionResult } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function extractDataFromText(text: string): Promise<ExtractionResult> {
  const prompt = `
    Você é um assistente especializado em extração de dados de planilhas de consumo de água de condomínios.
    Extraia os dados do texto abaixo, que pertence ao condomínio "Stories Residence".
    
    REGRAS DE EXTRAÇÃO:
    1. Identifique as unidades (ex: 1-101, 2-305).
    2. Extraia a "Leitura Anterior" e a "Leitura Atual" para cada unidade.
    3. Se encontrar o nome do condomínio, endereço ou período (mês de referência), inclua-os no objeto de metadados.
    4. Ignore unidades sem leitura ou com dados claramente inválidos.
    
    SAÍDA ESPERADA:
    Um objeto JSON com:
    - "metadata": { "condominium": string, "address": string, "referenceMonth": string }
    - "units": [ { "unit": string, "previousReading": number, "currentReading": number } ]
    
    Retorne APENAS o JSON válido.
    
    TEXTO DO PDF:
    ${text}
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json",
      },
    });

    const responseText = response.text || "";
    
    // Robust JSON extraction
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Não foi possível identificar dados estruturados no PDF. Verifique se o conteúdo está nítido.");
    }
    
    try {
      return JSON.parse(jsonMatch[0]) as ExtractionResult;
    } catch (e) {
      throw new Error("Erro ao processar o formato dos dados extraídos.");
    }
  } catch (error: any) {
    console.error("Gemini error:", error);
    if (error.message?.includes("fetch")) {
      throw new Error("Erro de conexão com o serviço de análise. Verifique sua internet.");
    }
    // Propagate the specific extraction errors
    if (error.message?.includes("identificar") || error.message?.includes("formato")) {
        throw error;
    }
    throw new Error("Ocorreu um erro na Inteligência Artificial ao analisar os dados.");
  }
}
