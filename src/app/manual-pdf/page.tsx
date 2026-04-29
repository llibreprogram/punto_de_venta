"use client"
import { useEffect, useState } from 'react';
import { marked } from 'marked';

export default function ManualPdfPage() {
  const [htmlContent, setHtmlContent] = useState('');

  useEffect(() => {
    fetch('/api/manual-content')
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
        }
        h1, h2, h3, h4 { color: #1a2a6c; margin-top: 1.5em; }
        p { margin: 1em 0; line-height: 1.6; }
        table { border-collapse: collapse; width: 100%; margin: 20px 0; }
        th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
        th { background-color: #f8f9fa; }
        blockquote { border-left: 5px solid #1a2a6c; padding-left: 20px; color: #444; font-style: italic; margin: 20px 0; background: #f9f9f9; padding: 10px 20px; }
        hr { border: 0; border-top: 1px solid #eee; margin: 40px 0; }
      `}} />
      <div className="no-print mb-8 p-4 bg-blue-50 border border-blue-200 rounded-lg flex justify-between items-center">
        <p className="m-0 text-blue-800 font-medium">
          Vista previa del manual. Presiona <strong>Ctrl + P</strong> para guardar como PDF.
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
