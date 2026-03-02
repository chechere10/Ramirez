/**
 * ExportOptions - Opciones de exportación de resultados.
 * 
 * Panel para seleccionar formato y descargar los resultados de búsqueda.
 */

import React, { useState } from 'react';

interface ExportOptionsProps {
  /** Si hay datos disponibles para exportar */
  hasData: boolean;
  /** Callback al exportar */
  onExport: (format: string, options: ExportConfig) => void;
  /** Si está cargando */
  loading?: boolean;
  /** Formatos disponibles */
  formats?: string[];
}

interface ExportConfig {
  format: string;
  includeAnnotatedPdf: boolean;
  includeReport: boolean;
  csvSeparator: ',' | ';';
  csvFormat: 'simple' | 'detailed' | 'summary';
}

const ExportOptions: React.FC<ExportOptionsProps> = ({
  hasData,
  onExport,
  loading = false,
  formats = ['pdf', 'csv', 'zip'],
}) => {
  const [config, setConfig] = useState<ExportConfig>({
    format: 'zip',
    includeAnnotatedPdf: true,
    includeReport: true,
    csvSeparator: ';',
    csvFormat: 'simple',
  });
  
  const [expanded, setExpanded] = useState(false);
  
  const handleExport = () => {
    if (hasData && !loading) {
      onExport(config.format, config);
    }
  };
  
  const formatInfo = {
    pdf: {
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      label: 'PDF Anotado',
      description: 'Documento con códigos resaltados',
    },
    csv: {
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      ),
      label: 'CSV',
      description: 'Datos para Excel o análisis',
    },
    zip: {
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
        </svg>
      ),
      label: 'Paquete Completo',
      description: 'PDF + Reporte + CSV',
    },
  };
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Exportar Resultados
          </h3>
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            <svg
              className={`w-5 h-5 transition-transform ${expanded ? 'rotate-180' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      </div>
      
      {/* Formato selector */}
      <div className="p-4">
        <div className="grid grid-cols-3 gap-2 mb-4">
          {formats.map((format) => {
            const info = formatInfo[format as keyof typeof formatInfo];
            if (!info) return null;
            
            return (
              <button
                key={format}
                onClick={() => setConfig({ ...config, format })}
                disabled={!hasData}
                className={`
                  p-3 rounded-lg border-2 text-center transition-all
                  ${config.format === format
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-600 hover:border-gray-300'
                  }
                  ${!hasData ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                `}
              >
                <div className={`
                  w-8 h-8 mx-auto mb-2 flex items-center justify-center rounded-full
                  ${config.format === format
                    ? 'bg-blue-100 text-blue-600 dark:bg-blue-800 dark:text-blue-300'
                    : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                  }
                `}>
                  {info.icon}
                </div>
                <div className="text-sm font-medium text-gray-900 dark:text-white">
                  {info.label}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 hidden sm:block">
                  {info.description}
                </div>
              </button>
            );
          })}
        </div>
        
        {/* Opciones expandidas */}
        {expanded && (
          <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            {/* Opciones para ZIP */}
            {config.format === 'zip' && (
              <div className="space-y-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={config.includeAnnotatedPdf}
                    onChange={(e) => setConfig({ ...config, includeAnnotatedPdf: e.target.checked })}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Incluir PDF con anotaciones
                  </span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={config.includeReport}
                    onChange={(e) => setConfig({ ...config, includeReport: e.target.checked })}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Incluir reporte PDF separado
                  </span>
                </label>
              </div>
            )}
            
            {/* Opciones para CSV */}
            {(config.format === 'csv' || config.format === 'zip') && (
              <div className="space-y-3">
                <div>
                  <label className="text-sm text-gray-600 dark:text-gray-400 block mb-1">
                    Separador CSV
                  </label>
                  <select
                    value={config.csvSeparator}
                    onChange={(e) => setConfig({ ...config, csvSeparator: e.target.value as ',' | ';' })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value=";">Punto y coma (;) - Excel español</option>
                    <option value=",">Coma (,) - Estándar</option>
                  </select>
                </div>
                
                {config.format === 'csv' && (
                  <div>
                    <label className="text-sm text-gray-600 dark:text-gray-400 block mb-1">
                      Formato CSV
                    </label>
                    <select
                      value={config.csvFormat}
                      onChange={(e) => setConfig({ ...config, csvFormat: e.target.value as any })}
                      className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="simple">Simple - Una fila por código</option>
                      <option value="detailed">Detallado - Cada ocurrencia</option>
                      <option value="summary">Resumen - Estadísticas</option>
                    </select>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
        
        {/* Botón de exportar */}
        <button
          onClick={handleExport}
          disabled={!hasData || loading}
          className={`
            w-full mt-4 px-4 py-2.5 rounded-lg font-medium
            flex items-center justify-center gap-2
            transition-all
            ${hasData && !loading
              ? 'bg-blue-600 hover:bg-blue-700 text-white'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
            }
          `}
        >
          {loading ? (
            <>
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Exportando...
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Descargar {formatInfo[config.format as keyof typeof formatInfo]?.label || 'Archivo'}
            </>
          )}
        </button>
        
        {!hasData && (
          <p className="text-xs text-center text-gray-400 mt-2">
            Procesa un documento primero para habilitar la exportación
          </p>
        )}
      </div>
    </div>
  );
};

export default ExportOptions;
