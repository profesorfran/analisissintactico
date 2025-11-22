
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import type { SentenceAnalysis } from '../types';

let ai: GoogleGenAI | null = null;

// Attempt to initialize AI client if API_KEY is present in the environment
if (process.env.API_KEY) {
  try {
    ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  } catch (e) {
    console.error("Failed to initialize Gemini Client. The API key might be malformed.", e);
    ai = null; // Ensure ai is null if initialization fails.
  }
}

/**
 * Checks if the Gemini API has been configured and initialized.
 * @returns {boolean} True if the API is ready, false otherwise.
 */
export const isApiKeyConfigured = (): boolean => {
  return !!ai;
};


const MODEL_NAME = "gemini-2.5-flash";

// Helper function for retries with exponential backoff
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

function parseGeminiResponse(responseText: string): SentenceAnalysis | null {
  let jsonStr = responseText.trim();
  // Regex to remove markdown fences (```json ... ``` or ``` ... ```)
  const fenceRegex = /^```(?:json)?\s*\n?(.*?)\n?\s*```$/si;
  const match = jsonStr.match(fenceRegex);
  if (match && match[1]) {
    jsonStr = match[1].trim();
  }

  try {
    const parsedData = JSON.parse(jsonStr);
    
    // Handle case where model returns an array [ { ... } ] instead of { ... }
    const dataToValidate = Array.isArray(parsedData) ? parsedData[0] : parsedData;

    // Basic validation of structure format
    const isValidStructure = (elements: any[]): boolean => {
      if (!Array.isArray(elements)) return false;
      return elements.every(el => 
        typeof el.text === 'string' &&
        typeof el.label === 'string' &&
        (!el.children || (Array.isArray(el.children) && isValidStructure(el.children)))
      );
    };

    if (dataToValidate && 
        typeof dataToValidate.fullSentence === 'string' && 
        typeof dataToValidate.classification === 'string' && 
        Array.isArray(dataToValidate.structure) &&
        isValidStructure(dataToValidate.structure)
    ) {
       return dataToValidate as SentenceAnalysis;
    }
    console.error("Parsed JSON does not match expected SentenceAnalysis structure or is invalid:", JSON.stringify(dataToValidate, null, 2));
    return null;
  } catch (e) {
    console.error("Failed to parse JSON response:", e);
    console.error("Problematic JSON string that failed to parse:", jsonStr);
    return null;
  }
}

const ONE_SHOT_EXAMPLE = `
Ejemplo de formato JSON esperado para la oración "Juan come manzanas":
{
  "fullSentence": "Juan come manzanas",
  "classification": "Oración simple, predicativa, activa, transitiva",
  "structure": [
    {
      "text": "Juan",
      "label": "SN Sujeto",
      "children": [
        { "text": "Juan", "label": "N (N)" }
      ]
    },
    {
      "text": "come manzanas",
      "label": "SV - Predicado verbal",
      "children": [
        { "text": "come", "label": "V (N)" },
        {
          "text": "manzanas",
          "label": "SN - CD",
          "children": [
             { "text": "manzanas", "label": "N (N)" }
          ]
        }
      ]
    }
  ]
}
`;

// Shared instructions for NGLE Analysis to ensure consistency between Analysis and Generation modes
const NGLE_ANALYSIS_RULES = `
**OBJETIVO GENERAL:**
Producir un árbol sintáctico que refleje la estructura gramatical según la NGLE.
**REGLA VISUAL IMPORTANTE:** En el nivel más alto (la base del árbol), el Sujeto y el Predicado deben estar al mismo nivel jerárquico en el array 'structure'.

**FORMATO JSON REQUERIDO:**
El objeto raíz debe tener:
- 'fullSentence': La oración completa (si generas una, ponla aquí).
- 'classification': Clasificación detallada de la oración.
- 'structure': Un array de elementos sintácticos (objetos con 'text', 'label' y opcionalmente 'children' recursivos).

${ONE_SHOT_EXAMPLE}

**GUÍA DE ETIQUETAS (NGLE):**

1.  **Nivel Oracional Principal:**
    *   'SN Sujeto': Sintagma Nominal Sujeto activo (SOLO si es un Sintagma Nominal estándar).
    *   'SN Sujeto paciente': Usar OBLIGATORIAMENTE si la oración es PASIVA (perifrástica con ser + participio) o PASIVA REFLEJA (con 'se' y concordancia).
    *   **SI EL SUJETO ES UNA ORACIÓN SUBORDINADA RELATIVA (Libre/Semilibre):** NO USAR 'SN Sujeto'. Usar directamente la etiqueta de la oración (ej: 'Oración - Subordinada Relativa Semilibre de Sujeto').
    *   'SV - Predicado verbal' o 'SV - Predicado nominal'.
    *   'ST': Sujeto Tácito.

2.  **Sintagmas y Núcleos:**
    *   'SN', 'SAdj', 'SAdv', 'SPrep'.
    *   Núcleos: 'N (N)', 'V (N)', 'Adj (N)', 'Adv (N)', 'Prep (N)'.
    *   'Det', 'nx' (nexo), 'Pron', 'Interj'.

3.  **Funciones:**
    *   'SN - CD', 'SN - CI', 'SN - Atrib', 'SN - CPred'.
    *   'SPrep - CD', 'SPrep - CI', 'SPrep - CRég', 'SPrep - CAg', 'SPrep - CN', 'SPrep - CAdj', 'SPrep - CAdv'.
    *   'SPrep - CC de [Lugar/Tiempo/Modo/etc.]'.

4.  **Oraciones Complejas (Subordinadas):**
    
    *   **Subordinadas Sustantivas:**
        *   'Oración - Subordinada Sustantiva de Sujeto', '... de CD', '... de Término', etc.

    *   **Subordinadas Relativas con Antecedente:**
        *   Etiqueta: 'Oración - Subordinada Relativa Especificativa (CN)' o 'Explicativa (CN)'.
        *   Deben ser hijas del SN antecedente.

    *   **Subordinadas Relativas LIBRES y SEMILIBRES (Sin antecedente):**
        *   **REGLA CRÍTICA (Sujeto):** Si funcionan como SUJETO, **NO las incluyas dentro de un nodo 'SN Sujeto'**. El nodo 'Oración - Subordinada Relativa Semilibre de Sujeto' (o Libre) debe ser hermano directo del 'SV - Predicado'.
        *   Estructura Libre (quien, donde...): 'Oración - Subordinada Relativa Libre de [Función]'.
        *   Estructura Semilibre (el que, la que, lo que...): 'Oración - Subordinada Relativa Semilibre de [Función]'.
        *   Ejemplo Sujeto: "Quien canta su mal espanta".
            *   Hijo 1: "Quien canta" -> 'Oración - Subordinada Relativa Libre de Sujeto' (NO dentro de SN).
            *   Hijo 2: "su mal espanta" -> 'SV - Predicado verbal'.

    *   **Subordinadas Construcciones (Antes Adverbiales):**
        *   Se denominan 'Construcciones' en la NGLE.
        *   **UBICACIÓN:** Deben estar SIEMPRE DENTRO del 'SV - Predicado verbal'.
        *   **Tipos:**
            *   'Oración - Subordinada Construcción de Tiempo' (o Temporal).
            *   'Oración - Subordinada Construcción de Lugar' (o Locativa).
            *   'Oración - Subordinada Construcción de Modo' (o Modal).
            *   'Oración - Subordinada Construcción Causal'.
            *   'Oración - Subordinada Construcción Final'.
            *   'Oración - Subordinada Construcción Condicional'.
            *   'Oración - Subordinada Construcción Concesiva'.
            *   'Oración - Subordinada Construcción Consecutiva' (Bimembre: cuantificador en principal + coda consecutiva).
            *   'Oración - Subordinada Construcción Comparativa' (Bimembre: cuantificador en principal + coda comparativa).
            *   'Oración - Subordinada Construcción Ilativa'.
        *   **Estructura:**
            *   El nexo ('nx') va DENTRO de la subordinada, como primer hijo.
            *   El resto es el predicado o estructura interna de la construcción.
            *   Si es bimembre (Comparativa/Consecutiva), el nexo (que, como) introduce el segundo segmento (la coda).

    *   **Subordinadas Superlativas:**
        *   'Oración - Subordinada Superlativa'. Estructura relativa compleja asociada a cuantificadores.

Proporciona SOLO el objeto JSON.
`;

async function callGemini(prompt: string, expectJson: boolean = true): Promise<any> {
  if (!ai) {
    throw new Error("La clave API de Gemini no ha sido configurada correctamente en el entorno de la aplicación.");
  }
  
  console.log("Gemini API Prompt length:", prompt.length);

  const MAX_RETRIES = 3;
  let attempt = 0;
  let lastError: any = null;

  while (attempt < MAX_RETRIES) {
    try {
      const response: GenerateContentResponse = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: prompt,
        config: expectJson ? {
          responseMimeType: "application/json",
        } : undefined,
      });

      const responseText = response.text;
      if (!responseText) {
          console.error("Gemini response text is empty on attempt " + (attempt + 1));
          lastError = new Error("Empty response from Gemini API.");
          attempt++;
          await delay(Math.pow(2, attempt) * 1000);
          continue;
      }
      
      if (expectJson) {
          return parseGeminiResponse(responseText);
      }
      return responseText;

    } catch (error: any) {
      lastError = error;
      console.error(`Attempt ${attempt + 1} failed:`, error);
      const errorMessage = String(error.message || error).toLowerCase();
      if (errorMessage.includes('api key not valid') || (error.status && error.status >= 400 && error.status < 500)) {
        throw lastError;
      }
      
      attempt++;
      if (attempt < MAX_RETRIES) {
        const backoffTime = Math.pow(2, attempt) * 1000;
        console.log(`Retrying in ${backoffTime}ms...`);
        await delay(backoffTime);
      }
    }
  }

  console.error("All Gemini API call retries failed.");
  if (lastError && lastError.message && lastError.message.toLowerCase().includes('api key not valid')) {
    throw new Error("La clave API de Gemini no es válida o ha caducado. Por favor, verifica tu configuración.");
  }
  throw new Error(lastError?.message || "No se pudo obtener una respuesta del servicio después de varios intentos.");
}

export const analyzeSentence = async (sentence: string): Promise<SentenceAnalysis | null> => {
  const prompt = `
Analiza sintácticamente la siguiente oración en español según los principios de la Nueva Gramática de la Lengua Española (NGLE) y proporciona la estructura en formato JSON. La oración es: '${sentence}'.

${NGLE_ANALYSIS_RULES}
`;
  return callGemini(prompt, true);
};

/**
 * Generates a sentence based on criteria without analyzing it.
 */
export const generateSentenceText = async (criteria: string): Promise<string | null> => {
  const prompt = `
Actúa como un experto profesor de lengua española.
Tu tarea es GENERAR UNA (1) oración en español natural y gramaticalmente correcta que cumpla estrictamente con los siguientes requisitos: "${criteria}".

IMPORTANTE:
- Devuelve SOLAMENTE el texto de la oración.
- NO incluyas comillas, ni introducciones tipo "Aquí tienes la oración:", ni explicaciones.
- El texto debe estar listo para ser copiado y pegado en un analizador sintáctico.
`;
  const text = await callGemini(prompt, false);
  return text ? text.trim() : null;
};
