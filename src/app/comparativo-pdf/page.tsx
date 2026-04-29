"use client"
import { useEffect, useState } from 'react';
import { marked } from 'marked';

export default function ComparativoPdfPage() {
  const [htmlContent, setHtmlContent] = useState('');

  useEffect(() => {
    fetch('/api/comparativo-content')
      .then(res => res.json())
      .then(data => {
        setHtmlContent(marked(data.content) as string);
      });
  }, []);

  return (
    <div className="bg-white min-h-screen p-8 max-w-4xl mx-auto print:p-0">
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          .no-print { display: none; }
          body { padding: 0; margin: 0; }
          table { page-break-inside: avoid; }
        }
        h1 { color: #1a2a6c; margin-top: 1em; font-size: 1.6em; }
        h2 { color: #1a2a6c; margin-top: 1.5em; font-size: 1.3em; border-bottom: 2px solid #e2e8f0; padding-bottom: 0.3em; }
        h3 { color: #2d3748; margin-top: 1.2em; font-size: 1.1em; }
        p { margin: 0.8em 0; line-height: 1.6; }
        table { border-collapse: collapse; width: 100%; margin: 16px 0; font-size: 0.9em; }
        th, td { border: 1px solid #ddd; padding: 10px 12px; text-align: left; }
        th { background-color: #f0f4ff; font-weight: 600; }
        td:first-child { font-weight: 500; }
        blockquote { border-left: 4px solid #1a2a6c; padding: 12px 16px; color: #444; margin: 16px 0; background: #f7fafc; border-radius: 0 6px 6px 0; }
        blockquote p { margin: 0; }
        hr { border: 0; border-top: 1px solid #e2e8f0; margin: 32px 0; }
        ul { padding-left: 20px; }
        li { margin: 4px 0; line-height: 1.5; }
        strong { color: #1a2a6c; }
      `}} />
      <div className="no-print mb-8 p-4 bg-blue-50 border border-blue-200 rounded-lg flex justify-between items-center">
        <p className="m-0 text-blue-800 font-medium">
          Comparativo POS LLibre vs Loyverse. Presiona <strong>Ctrl + P</strong> para guardar como PDF.
        </p>
        <button 
          onClick={() => window.print()}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
        >
          Imprimir / Guardar PDF
        </button>
      </div>
      <div 
        className="prose max-w-none"
        dangerouslySetInnerHTML={{ __html: htmlContent }} 
      />
    </div>
  );
}
