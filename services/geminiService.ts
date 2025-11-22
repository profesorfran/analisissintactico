import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import type { SentenceAnalysis } from "../types";

const MODEL_NAME = "gemini-2.5-flash";
const STORAGE_KEY = "ngle_gemini_api_key";

const PUBLIC_DEFAULT_API_KEY = "AIzaSyAHwqYuXGHK-PzkLgJ6y5kfnQCZ6WxaLmQ";

const resolvePublicFallbackKey = (): string | null => {
  const meta = typeof import.meta !== "undefined" ? (import.meta as any) : null;
  if (meta?.env?.VITE_PUBLIC_GEMINI_KEY) {
    return meta.env.VITE_PUBLIC_GEMINI_KEY as string;
  }
  if (typeof process !== "undefined") {
    return process.env.VITE_PUBLIC_GEMINI_KEY || process.env.PUBLIC_GEMINI_KEY || null;
  }
  return null;
};

const PUBLIC_FALLBACK_KEY = resolvePublicFallbackKey() || PUBLIC_DEFAULT_API_KEY;

let ai: GoogleGenAI | null = null;
let activeApiKey: string | null = null;

const isBrowser = typeof window !== "undefined";

const getStorage = (): Storage | null => {
  if (!isBrowser) {
    return null;
  }
  try {
    return window.localStorage;
  } catch (error) {
    console.error("localStorage no disponible:", error);
    return null;
  }
};

const setClient = (apiKey: string) => {
  ai = new GoogleGenAI({ apiKey });
  activeApiKey = apiKey;
};

const tryInitializeWithKey = (apiKey: string | null | undefined): boolean => {
  if (!apiKey) {
    return false;
  }
  try {
    setClient(apiKey);
    return true;
  } catch (error) {
    console.error("No se pudo inicializar el cliente de Gemini con la clave proporcionada:", error);
    return false;
  }
};

const initializeFromEnv = () => {
  if (ai) {
    return;
  }
  const envKey =
    (typeof process !== "undefined" &&
      (process.env.GEMINI_API_KEY || process.env.API_KEY || process.env.VITE_GEMINI_API_KEY)) ||
    undefined;
  if (tryInitializeWithKey(envKey)) {
    return;
  }
};

const initializeFromStorage = () => {
  if (!isBrowser || ai) {
    return;
  }
  const storage = getStorage();
  const storedKey = storage?.getItem(STORAGE_KEY);
  if (tryInitializeWithKey(storedKey)) {
    return;
  }
  if (storedKey) {
    storage?.removeItem(STORAGE_KEY);
  }
};

const initializeWithPublicFallback = () => {
  if (ai) {
    return;
  }
  if (!PUBLIC_FALLBACK_KEY) {
    return;
  }
  tryInitializeWithKey(PUBLIC_FALLBACK_KEY);
};

initializeFromEnv();
initializeFromStorage();
initializeWithPublicFallback();

export const getStoredApiKey = (): string | null => {
  return activeApiKey || getStorage()?.getItem(STORAGE_KEY) || null;
};

export const configureApiKey = (apiKey: string) => {
  const trimmedKey = apiKey.trim();
  if (!trimmedKey) {
    throw new Error("La clave API no puede estar vacía.");
  }
  setClient(trimmedKey);
  getStorage()?.setItem(STORAGE_KEY, trimmedKey);
};

export const clearStoredApiKey = () => {
  getStorage()?.removeItem(STORAGE_KEY);
  ai = null;
  activeApiKey = null;
  initializeFromEnv();
  initializeWithPublicFallback();
};

export const isApiKeyConfigured = (): boolean => {
  return !!ai;
};

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const parseGeminiResponse = (responseText: string): SentenceAnalysis | null => {
  let jsonStr = responseText.trim();
  const fenceRegex = /^```(?:json)?\s*\n?(.*?)\n?\s*```$/si;
  const match = jsonStr.match(fenceRegex);
  if (match && match[1]) {
    jsonStr = match[1].trim();
  }

  try {
    const parsedData = JSON.parse(jsonStr);
    const dataToValidate = Array.isArray(parsedData) ? parsedData[0] : parsedData;

    const isValidStructure = (elements: any[]): boolean => {
      if (!Array.isArray(elements)) return false;
      return elements.every((el) =>
        el &&
        typeof el.text === "string" &&
        typeof el.label === "string" &&
        (!el.children || (Array.isArray(el.children) && isValidStructure(el.children)))
      );
    };

    if (
      dataToValidate &&
      typeof dataToValidate.fullSentence === "string" &&
      typeof dataToValidate.classification === "string" &&
      Array.isArray(dataToValidate.structure) &&
      isValidStructure(dataToValidate.structure)
    ) {
      return dataToValidate as SentenceAnalysis;
    }

    console.error(
      "El JSON obtenido no coincide con el formato esperado:",
      JSON.stringify(dataToValidate, null, 2)
    );
    return null;
  } catch (error) {
    console.error("No se pudo analizar la respuesta JSON:", error);
    console.error("Cadena recibida:", jsonStr);
    return null;
  }
};

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

const NGLE_ANALYSIS_RULES = `
**OBJETIVO GENERAL:**
Producir un árbol sintáctico que refleje la estructura gramatical según la NGLE.
**REGLA VISUAL IMPORTANTE:** En el nivel más alto (la base del árbol), el Sujeto y el Predicado deben estar al mismo nivel jerárquico en el array 'structure'.

**FORMATO JSON REQUERIDO:**
El objeto raíz debe tener:
- 'fullSentence': La oración completa (si generas una, colócala aquí).
- 'classification': Clasificación detallada de la oración.
- 'structure': Un array de elementos sintácticos (objetos con 'text', 'label' y opcionalmente 'children' recursivos).

${ONE_SHOT_EXAMPLE}

**GUÍA DE ETIQUETAS (NGLE):**
1.  **Nivel Oracional Principal:**
    *   'SN Sujeto': Sintagma Nominal Sujeto activo (solo si es un Sintagma Nominal estándar).
    *   'SN Sujeto paciente': Úsalo obligatoriamente si la oración es pasiva (perifrástica con ser + participio) o pasiva refleja (con 'se' y concordancia).
    *   Si el sujeto es una oración subordinada relativa (libre/semilibre): NO uses 'SN Sujeto'. Usa directamente la etiqueta de la oración (ej.: 'Oración - Subordinada Relativa Semilibre de Sujeto').
    *   'SV - Predicado verbal' o 'SV - Predicado nominal'.
    *   'ST': Sujeto tácito.

2.  **Sintagmas y Núcleos:**
    *   'SN', 'SAdj', 'SAdv', 'SPrep'.
    *   Dentro de cada sintagma, incluye etiquetas específicas para la función (p.ej. 'Det', 'N').

3.  **Coordinación y Yuxtaposición:**
    *   Usa 'Prop - Coordinada X' cuando sea necesario. Recuerda colocar el nexo como nodo independiente.

4.  **Subordinadas:**
    *   Nominales: 'Oración - Subordinada Sustantiva de ...'.
    *   Relativas: especifica si es Especificativa, Explicativa, Libre, Semilibre.
    *   Construcciones (adverbiales tradicionales): tiempo, lugar, modo, causa, finalidad, condición, concesión, consecutiva, comparativa, ilativa.
    *   Incluye el nexo dentro de la subordinada como primer hijo.

Proporciona SOLO el objeto JSON sin explicaciones adicionales.
`;

const ensureClient = (): GoogleGenAI => {
  if (!ai) {
    initializeFromStorage();
  }
  if (!ai) {
    initializeWithPublicFallback();
  }
  if (!ai) {
    throw new Error("La clave API de Gemini no está configurada. Configúrala antes de continuar.");
  }
  return ai;
};

const callGemini = async (prompt: string, expectJson: boolean = true): Promise<any> => {
  const client = ensureClient();

  const MAX_RETRIES = 3;
  let attempt = 0;
  let lastError: any = null;

  while (attempt < MAX_RETRIES) {
    try {
      const response: GenerateContentResponse = await client.models.generateContent({
        model: MODEL_NAME,
        contents: prompt,
        config: expectJson
          ? {
              responseMimeType: "application/json",
            }
          : undefined,
      });

      const responseText = response.text;
      if (!responseText) {
        lastError = new Error("La respuesta de Gemini llegó vacía.");
        throw lastError;
      }

      return expectJson ? parseGeminiResponse(responseText) : responseText;
    } catch (error: any) {
      lastError = error;
      console.error(`Intento ${attempt + 1} fallido:`, error);
      const message = String(error?.message || "").toLowerCase();
      const status = error?.status;

      if (message.includes("api key not valid") || (typeof status === "number" && status >= 400 && status < 500)) {
        throw lastError;
      }

      attempt += 1;
      if (attempt < MAX_RETRIES) {
        const waitTime = Math.pow(2, attempt) * 1000;
        console.log(`Reintentando en ${waitTime}ms...`);
        await delay(waitTime);
      }
    }
  }

  throw new Error(lastError?.message || "No se pudo obtener respuesta del servicio tras varios intentos.");
};

export const analyzeSentence = async (sentence: string): Promise<SentenceAnalysis | null> => {
  const prompt = `
Analiza sintácticamente la siguiente oración en español según la Nueva Gramática de la Lengua Española (NGLE) y proporciona la estructura en formato JSON. La oración es: '${sentence}'.

${NGLE_ANALYSIS_RULES}
`;
  return callGemini(prompt, true);
};

export const generateSentenceText = async (criteria: string): Promise<string | null> => {
  const prompt = `
Actúa como un experto profesor de lengua española.
Tu tarea es generar UNA (1) oración en español natural y gramaticalmente correcta que cumpla estrictamente con los siguientes requisitos: "${criteria}".

IMPORTANTE:
- Devuelve solamente el texto de la oración.
- No incluyas comillas, ni introducciones del tipo "Aquí tienes la oración:", ni explicaciones.
- El texto debe estar listo para copiarse y pegarse en un analizador sintáctico.
`;
  const text = await callGemini(prompt, false);
  return text ? text.trim() : null;
};
