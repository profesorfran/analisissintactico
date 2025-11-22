import React, { useState, useCallback } from "react";
import { SentenceInput } from "./components/SentenceInput";
import { SentenceGenerator } from "./components/SentenceGenerator";
import { AnalysisDisplay } from "./components/AnalysisDisplay";
import { LoadingSpinner } from "./components/LoadingSpinner";
import { ErrorMessage } from "./components/ErrorMessage";
import { ApiKeyModal } from "./components/ApiKeyModal";
import {
  analyzeSentence,
  generateSentenceText,
  isApiKeyConfigured,
  configureApiKey,
  clearStoredApiKey,
  getStoredApiKey,
} from "./services/geminiService";
import type { SentenceAnalysis } from "./types";

type AppMode = "analyze" | "generate";

const App: React.FC = () => {
  const apiKeyAvailable = isApiKeyConfigured();

  const [mode, setMode] = useState<AppMode>("analyze");
  const [apiConfigured, setApiConfigured] = useState<boolean>(apiKeyAvailable);
  const [showApiKeyModal, setShowApiKeyModal] = useState<boolean>(!apiKeyAvailable);

  const [analysisResult, setAnalysisResult] = useState<SentenceAnalysis | null>(null);
  const [generatedSentence, setGeneratedSentence] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) {
      setError("Por favor, ingresa una oración para analizar.");
      setAnalysisResult(null);
      return;
    }
    setIsLoading(true);
    setError(null);
    setAnalysisResult(null);
    try {
      const result = await analyzeSentence(trimmed);
      if (result) {
        setAnalysisResult(result);
      } else {
        setError(
          "No se pudo obtener un análisis válido. La respuesta del modelo llegó vacía o con un formato inesperado. Revisa la consola para más detalles."
        );
      }
    } catch (e: any) {
      console.error("Error durante el análisis:", e);
      setError(e?.message || "Ocurrió un error al analizar la oración.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleGenerate = useCallback(async (criteria: string) => {
    const trimmed = criteria.trim();
    if (!trimmed) {
      setError("Por favor, describe los criterios para generar la oración.");
      setGeneratedSentence(null);
      return;
    }
    setIsLoading(true);
    setError(null);
    setGeneratedSentence(null);
    setAnalysisResult(null);

    try {
      const text = await generateSentenceText(trimmed);
      if (text) {
        setGeneratedSentence(text);
      } else {
        setError("No se pudo generar la oración. Inténtalo de nuevo.");
      }
    } catch (e: any) {
      console.error("Error durante la generación:", e);
      setError(e?.message || "Ocurrió un error al generar la oración.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleSwitchMode = (newMode: AppMode) => {
    setMode(newMode);
    setError(null);
    if (newMode === "generate") {
      setAnalysisResult(null);
    } else {
      setGeneratedSentence(null);
    }
  };

  const handleOpenApiKeyModal = () => {
    setShowApiKeyModal(true);
  };

  const handleSaveApiKey = (apiKey: string) => {
    try {
      configureApiKey(apiKey);
      setApiConfigured(true);
      setShowApiKeyModal(false);
      setError(null);
    } catch (e: any) {
      console.error("No se pudo guardar la clave API:", e);
      setError(e?.message || "No fue posible guardar la clave API proporcionada.");
    }
  };

  const handleClearApiKey = () => {
    clearStoredApiKey();
    setApiConfigured(false);
    setShowApiKeyModal(true);
  };

  const storedApiKey = getStoredApiKey();

  return (
    <div className="container mx-auto p-4 md:p-8 max-w-screen-xl w-full">
      <header className="relative text-center mb-8 md:mb-12">
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-sky-400 tracking-tight">
          Analizador Sintáctico (NGLE)
        </h1>
        <p className="text-slate-300 mt-3 text-md sm:text-lg">
          Aplicación desarrollada por Francisco David Sánchez Valencia, profesor de Lengua y Literatura.
        </p>
        <p className="text-slate-400 mt-2 text-sm sm:text-base">
          Introduce una oración o genera una con IA para obtener su análisis sintáctico detallado.
        </p>

        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={handleOpenApiKeyModal}
            className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white text-sm font-semibold rounded-md shadow-md transition"
          >
            {apiConfigured ? "Gestionar clave API" : "Configurar clave API"}
          </button>

          {apiConfigured && (
            <button
              type="button"
              onClick={handleClearApiKey}
              className="px-4 py-2 bg-slate-600 hover:bg-slate-500 text-white text-sm font-semibold rounded-md shadow-md transition"
            >
              Quitar clave local
            </button>
          )}
        </div>
      </header>

      {!apiConfigured && (
        <div className="mb-6">
          <ErrorMessage message={'CONFIGURACIÓN REQUERIDA: La clave API de Gemini no está configurada. Pulsa en "Configurar clave API" para añadirla.'} />
        </div>
      )}

      <main className="bg-slate-800 shadow-2xl rounded-xl p-4 sm:p-6 md:p-8">
        <div className="flex space-x-4 border-b border-slate-700 mb-6">
          <button
            onClick={() => handleSwitchMode("analyze")}
            className={`pb-3 px-4 font-medium text-sm sm:text-base transition-colors duration-200 ${
              mode === "analyze"
                ? "text-sky-400 border-b-2 border-sky-400"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Analizar oración
          </button>
          <button
            onClick={() => handleSwitchMode("generate")}
            className={`pb-3 px-4 font-medium text-sm sm:text-base transition-colors duration-200 ${
              mode === "generate"
                ? "text-teal-400 border-b-2 border-teal-400"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Generar oración
          </button>
        </div>

        {mode === "analyze" ? (
          <SentenceInput onAnalyze={handleAnalyze} isLoading={isLoading} disabled={!apiConfigured} />
        ) : (
          <SentenceGenerator
            onGenerate={handleGenerate}
            isLoading={isLoading}
            disabled={!apiConfigured}
            generatedSentence={generatedSentence}
          />
        )}

        {isLoading && <LoadingSpinner />}
        {error && !isLoading && <ErrorMessage message={error} />}

        {analysisResult && mode === "analyze" && !isLoading && !error && (
          <AnalysisDisplay result={analysisResult} />
        )}

        {!isLoading && !error && !analysisResult && !generatedSentence && apiConfigured && (
          <div className="mt-8 p-6 bg-slate-700/50 rounded-lg text-center text-slate-400">
            {mode === "analyze" ? (
              <>
                <p className="text-lg">Esperando una oración para analizar...</p>
                <p className="text-sm mt-2">Ejemplo: El libro que me prestaste ayer es muy interesante.</p>
              </>
            ) : (
              <>
                <p className="text-lg">Describe la oración que quieres que cree la IA.</p>
                <p className="text-sm mt-2">Luego podrás copiarla para analizarla.</p>
              </>
            )}
          </div>
        )}
      </main>
      <footer className="text-center mt-10 md:mt-16 text-slate-500 text-xs sm:text-sm">
        <p>Potenciado por Gemini API. Análisis basado en la Nueva Gramática de la Lengua Española.</p>
        <p>&copy; {new Date().getFullYear()} Francisco David Sánchez Valencia</p>
      </footer>

      {showApiKeyModal && (
        <ApiKeyModal
          onSave={handleSaveApiKey}
          onClose={() => setShowApiKeyModal(false)}
          currentApiKey={storedApiKey}
        />
      )}
    </div>
  );
};

export default App;
