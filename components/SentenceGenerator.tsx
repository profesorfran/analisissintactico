
import React, { useState } from 'react';

interface SentenceGeneratorProps {
  onGenerate: (criteria: string) => void;
  isLoading: boolean;
  disabled: boolean;
  generatedSentence: string | null;
}

export const SentenceGenerator: React.FC<SentenceGeneratorProps> = ({ 
  onGenerate, 
  isLoading, 
  disabled, 
  generatedSentence 
}) => {
  const [criteria, setCriteria] = useState<string>('');
  const [copied, setCopied] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!disabled) {
      onGenerate(criteria);
      setCopied(false); // Reset copy state on new generation
    }
  };

  const handleCopy = () => {
    if (generatedSentence) {
      navigator.clipboard.writeText(generatedSentence);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="mb-6 md:mb-8">
      <div className="bg-slate-700/30 p-4 rounded-lg border border-slate-600 mb-4">
        <p className="text-slate-300 text-sm mb-2">
            Describe qué tipo de oración quieres. La IA la creará para que puedas copiarla.
        </p>
        <p className="text-slate-400 text-xs italic">
            Ejemplos: "Oración condicional con verbo en subjuntivo", "Oración con pasiva refleja y complemento agente", "Oración simple con vocativo".
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mb-6">
        <div className="flex flex-col sm:flex-row gap-3 items-stretch">
          <textarea
            value={criteria}
            onChange={(e) => setCriteria(e.target.value)}
            placeholder="Ej: Oración compuesta con una subordinada sustantiva de sujeto..."
            rows={3}
            className="flex-grow p-3 border border-slate-600 rounded-lg shadow-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-slate-700 text-slate-100 placeholder-slate-400 disabled:opacity-50 disabled:cursor-not-allowed resize-none transition-opacity"
            disabled={isLoading || disabled}
            aria-label="Criterios para generar la oración"
          />
          <button
            type="submit"
            disabled={isLoading || disabled || !criteria.trim()}
            className="w-full sm:w-auto px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-lg shadow-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-opacity-50 transition duration-150 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            style={{minHeight: 'calc(3 * 1.5rem + 2 * 0.75rem + 2px)'}}
          >
            {isLoading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Generando...
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-1 hidden sm:inline">
                   <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L1.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.25 12L17.437 9.154a4.5 4.5 0 00-3.09-3.09L11.5 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L18.25 12zm0 0l.813 2.846a4.5 4.5 0 003.09 3.09L24.75 12l-2.846-.813a4.5 4.5 0 00-3.09-3.09L18.25 12z" />
                </svg>
                <span>Generar</span>
              </>
            )}
          </button>
        </div>
      </form>

      {generatedSentence && (
        <div className="bg-slate-900/50 border border-teal-500/30 rounded-xl p-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h3 className="text-teal-400 font-semibold mb-3 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L1.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                </svg>
                Oración Generada:
            </h3>
            <div className="bg-slate-800 p-4 rounded-lg text-lg text-slate-100 shadow-inner mb-4 font-medium">
                {generatedSentence}
            </div>
            <div className="flex justify-end">
                <button
                    onClick={handleCopy}
                    className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                        copied 
                        ? 'bg-green-600 text-white' 
                        : 'bg-slate-700 hover:bg-slate-600 text-slate-200 hover:text-white border border-slate-600'
                    }`}
                >
                    {copied ? (
                        <>
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 mr-2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                            </svg>
                            ¡Copiado!
                        </>
                    ) : (
                        <>
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 mr-2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
                            </svg>
                            Copiar al portapapeles
                        </>
                    )}
                </button>
            </div>
        </div>
      )}
    </div>
  );
};
