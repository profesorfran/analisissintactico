import React, { useState } from "react";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import type { SentenceAnalysis, SyntacticElement } from "../types";
import { TreeNode } from "./TreeNode";

interface AnalysisDisplayProps {
  result: SentenceAnalysis;
}

const countNodes = (elements: SyntacticElement[]): number => {
  let count = 0;
  for (const el of elements) {
    count += 1;
    if (el.children) {
      count += countNodes(el.children);
    }
  }
  return count;
};

export const AnalysisDisplay: React.FC<AnalysisDisplayProps> = ({ result }) => {
  const [isDownloading, setIsDownloading] = useState(false);
  const totalNodes = countNodes(result.structure);

  let density: "normal" | "compact" | "super-compact" = "normal";
  let rootNodeGapClass = "gap-1";

  if (totalNodes >= 30) {
    density = "super-compact";
    rootNodeGapClass = "gap-px";
  } else if (totalNodes >= 15) {
    density = "compact";
    rootNodeGapClass = "gap-0.5";
  }

  const handleDownloadPDF = async () => {
    const element = document.getElementById("analysis-capture-target");
    if (!element) return;

    setIsDownloading(true);

    try {
      const clone = element.cloneNode(true) as HTMLElement;
      clone.style.position = "fixed";
      clone.style.top = "0";
      clone.style.left = "-10000px";
      clone.style.width = "fit-content";
      clone.style.height = "auto";
      clone.style.maxWidth = "none";
      clone.style.margin = "0";
      clone.style.zIndex = "-1000";

      const scrollableContainer = clone.querySelector(".overflow-x-auto");
      if (scrollableContainer instanceof HTMLElement) {
        scrollableContainer.style.overflow = "visible";
        scrollableContainer.style.width = "auto";
        scrollableContainer.style.maxWidth = "none";
        scrollableContainer.style.display = "block";
      }

      document.body.appendChild(clone);

      const width = clone.scrollWidth + 40;
      const height = clone.scrollHeight + 40;

      const canvas = await html2canvas(clone, {
        scale: 2,
        backgroundColor: "#1e293b",
        logging: false,
        useCORS: true,
        width,
        height,
        windowWidth: width,
        windowHeight: height,
        x: 0,
        y: 0,
      });

      document.body.removeChild(clone);

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("l", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      const margin = 10;
      const availableWidth = pageWidth - margin * 2;
      const availableHeight = pageHeight - margin * 2;

      const imgProps = pdf.getImageProperties(imgData);
      const imgRatio = imgProps.width / imgProps.height;
      const pageRatio = availableWidth / availableHeight;

      let finalWidth: number;
      let finalHeight: number;

      if (imgRatio > pageRatio) {
        finalWidth = availableWidth;
        finalHeight = finalWidth / imgRatio;
      } else {
        finalHeight = availableHeight;
        finalWidth = finalHeight * imgRatio;
      }

      const xPos = margin + (availableWidth - finalWidth) / 2;
      const yPos = margin + (availableHeight - finalHeight) / 2;

      pdf.addImage(imgData, "PNG", xPos, yPos, finalWidth, finalHeight);

      const cleanFileName = result.fullSentence
        .slice(0, 30)
        .replace(/[^a-z0-9]/gi, "_")
        .toLowerCase();

      pdf.save(`analisis_${cleanFileName || "oracion"}.pdf`);
    } catch (error) {
      console.error("Error generando el PDF:", error);
      alert("Hubo un error al generar el PDF. Por favor, inténtalo de nuevo.");
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="mt-6 p-4 md:p-6 bg-slate-700/50 rounded-lg shadow-inner">
      <div className="flex justify-end mb-4">
        <button
          onClick={handleDownloadPDF}
          disabled={isDownloading}
          className="flex items-center gap-2 px-4 py-2 bg-slate-600 hover:bg-slate-500 text-slate-100 text-sm font-medium rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title="Descargar análisis en PDF"
        >
          {isDownloading ? (
            <>
              <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Generando PDF...
            </>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
              Descargar PDF
            </>
          )}
        </button>
      </div>

      <div id="analysis-capture-target" className="p-4 bg-slate-800 rounded-md border border-slate-600">
        <div className="relative mb-6 pb-4 border-b border-slate-600 rounded-md p-3 -m-3">
          <div className="flex items-center mb-1">
            <h2 className="text-lg sm:text-xl font-semibold text-sky-300">Oración analizada:</h2>
          </div>
          <p className="text-md sm:text-lg text-slate-200">{result.fullSentence}</p>
        </div>

        <div className="mb-6 pb-4 border-b border-slate-600">
          <h2 className="text-lg sm:text-xl font-semibold text-sky-300 mb-1">Clasificación:</h2>
          <p className="text-sm sm:text-md text-slate-300">{result.classification}</p>
        </div>

        <div className="mb-4">
          <h2 className="text-lg sm:text-xl font-semibold text-sky-300 mb-3">Estructura sintáctica:</h2>
          <div className="overflow-x-auto pb-4 -mx-1 px-1">
            <div className={`flex flex-row flex-nowrap justify-start items-end p-1 min-w-max ${rootNodeGapClass}`}>
              {result.structure.map((element, index) => (
                <TreeNode key={`root-${index}-${element.label}-${element.text.slice(0, 5)}`} element={element} level={0} density={density} />
              ))}
            </div>
          </div>
        </div>

        <div className="mt-8 pt-4 border-t border-slate-700 text-center text-xs text-slate-500">
          Generado por Analizador Sintáctico (NGLE)
        </div>
      </div>
    </div>
  );
};
