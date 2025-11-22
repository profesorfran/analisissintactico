
import React, { useState, useCallback } from 'react';
import { SentenceInput } from './components/SentenceInput';
import { SentenceGenerator } from './components/SentenceGenerator';
import { AnalysisDisplay } from './components/AnalysisDisplay';
import { LoadingSpinner } from './components/LoadingSpinner';
import { ErrorMessage } from './components/ErrorMessage';
import { analyzeSentence, generateSentenceText, isApiKeyConfigured } from './services/geminiService';
import type { SentenceAnalysis } from './types';

const apiKeyAvailable = isApiKeyConfigured();

type AppMode = 'analyze' | 'generate';

const App: React.FC = () => {
  const [mode, setMode] = useState<AppMode>('analyze');
  
  const [analysisResult, setAnalysisResult] = useState<SentenceAnalysis | null>(null);
  const [generatedSentence, setGeneratedSentence] = useState<string | null>(null);
  
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = useCallback(async (text: string) => {
    if (!text.trim()) {
      setError("Por favor, ingresa una oración para analizar.");
      setAnalysisResult(null);
      return;
    }
    setIsLoading(true);
    setError(null);
    setAnalysisResult(null);
    try {
      const result = await analyzeSentence(text);
      if (result) {
        setAnalysisResult(result);
      } else {
        setError("No se pudo obtener un análisis válido. La respuesta del modelo podría estar vacía o malformada. Revisa la consola para más detalles.");
      }
    } catch (e: any) {
      console.error("Analysis error:", e);
      setError(e.message || "Ocurrió un error al analizar la oración.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleGenerate = useCallback(async (criteria: string) => {
    if (!criteria.trim()) {
      setError("Por favor, introduce los criterios para generar la oración.");
      setGeneratedSentence(null);
      return;
    }
    setIsLoading(true);
    setError(null);
    setGeneratedSentence(null);
    setAnalysisResult(null); // Clear previous analysis if any
    
    try {
      const text = await generateSentenceText(criteria);
      if (text) {
        setGeneratedSentence(text);
      } else {
        setError("No se pudo generar la oración. Inténtalo de nuevo.");
      }
    } catch (e: any) {
      console.error("Generation error:", e);
      setError(e.message || "Ocurrió un error al generar la oración.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleSwitchMode = (newMode: AppMode) => {
      setMode(newMode);
      setError(null);
      // We optionally clear results when switching, or keep them. 
      // Let's clear analysis when going to generate, but keep generated sentence when switching?
      // For simplicity, clear major outputs to avoid confusion.
      if (newMode === 'generate') {
          setAnalysisResult(null);
      } else {
          setGeneratedSentence(null);
      }
  };

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
      </header>

      {!apiKeyAvailable && (
        <div className="mb-6">
            <ErrorMessage message="CONFIGURACIÓN REQUERIDA: La clave API de Gemini no está configurada en esta aplicación. El análisis no funcionará." />
        </div>
      )}

      <main className="bg-slate-800 shadow-2xl rounded-xl p-4 sm:p-6 md:p-8">
        
        {/* Mode Toggles */}
        <div className="flex space-x-4 border-b border-slate-700 mb-6">
          <button
            onClick={() => handleSwitchMode('analyze')}
            className={`pb-3 px-4 font-medium text-sm sm:text-base transition-colors duration-200 ${
              mode === 'analyze' 
                ? 'text-sky-400 border-b-2 border-sky-400' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Analizar Oración
          </button>
          <button
            onClick={() => handleSwitchMode('generate')}
            className={`pb-3 px-4 font-medium text-sm sm:text-base transition-colors duration-200 ${
              mode === 'generate' 
                ? 'text-teal-400 border-b-2 border-teal-400' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Generar Oración
          </button>
        </div>

        {mode === 'analyze' ? (
          <SentenceInput onAnalyze={handleAnalyze} isLoading={isLoading} disabled={!apiKeyAvailable} />
        ) : (
          <SentenceGenerator 
            onGenerate={handleGenerate} 
            isLoading={isLoading} 
            disabled={!apiKeyAvailable} 
            generatedSentence={generatedSentence}
          />
        )}

        {isLoading && <LoadingSpinner />}
        {error && !isLoading && <ErrorMessage message={error} />}
        
        {analysisResult && mode === 'analyze' && !isLoading && !error && (
          <AnalysisDisplay result={analysisResult} />
        )}
        
        {!isLoading && !error && !analysisResult && !generatedSentence && apiKeyAvailable && (
          <div className="mt-8 p-6 bg-slate-700/50 rounded-lg text-center text-slate-400">
            {mode === 'analyze' ? (
              <>
                <p className="text-lg">Esperando una oración para analizar...</p>
                <p className="text-sm mt-2">Ejemplo: El libro que me prestaste ayer es muy interesante.</p>
              </>
            ) : (
              <>
                <p className="text-lg">Describe la oración que quieres que cree la IA.</p>
                <p className="text-sm mt-2">Podrás copiarla para analizarla después.</p>
              </>
            )}
          </div>
        )}
      </main>
      <footer className="text-center mt-10 md:mt-16 text-slate-500 text-xs sm:text-sm">
        <p>Potenciado por Gemini API. Análisis basado en la Nueva Gramática de la Lengua Española.</p>
        <p>&copy; {new Date().getFullYear()} Francisco David Sánchez Valencia</p>
      </footer>
    </div>
  );
};

export default App;
