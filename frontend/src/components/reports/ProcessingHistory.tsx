/**
 * ProcessingHistory - Historial de procesamiento de documentos.
 * 
 * Muestra un listado de las últimas búsquedas/procesamiento con sus resultados.
 */

import React from 'react';

interface ProcessingItem {
  id: string;
  documentName: string;
  codesSearched: number;
  codesFound: number;
  timestamp: Date | string;
  status: 'success' | 'partial' | 'error';
}

interface ProcessingHistoryProps {
  /** Lista de items de procesamiento */
  items: ProcessingItem[];
  /** Número máximo de items a mostrar */
  maxItems?: number;
  /** Callback al hacer click en un item */
  onItemClick?: (item: ProcessingItem) => void;
  /** Mostrar encabezado */
  showHeader?: boolean;
  /** Texto cuando no hay items */
  emptyMessage?: string;
}

const statusConfig = {
  success: {
    bg: 'bg-green-100 dark:bg-green-900/20',
    text: 'text-green-700 dark:text-green-400',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    ),
    label: 'Completo',
  },
  partial: {
    bg: 'bg-yellow-100 dark:bg-yellow-900/20',
    text: 'text-yellow-700 dark:text-yellow-400',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
    label: 'Parcial',
  },
  error: {
    bg: 'bg-red-100 dark:bg-red-900/20',
    text: 'text-red-700 dark:text-red-400',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      </svg>
    ),
    label: 'Error',
  },
};

function formatTimestamp(timestamp: Date | string): string {
  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  
  // Menos de 1 minuto
  if (diff < 60000) {
    return 'Hace un momento';
  }
  
  // Menos de 1 hora
  if (diff < 3600000) {
    const mins = Math.floor(diff / 60000);
    return `Hace ${mins} minuto${mins > 1 ? 's' : ''}`;
  }
  
  // Menos de 24 horas
  if (diff < 86400000) {
    const hours = Math.floor(diff / 3600000);
    return `Hace ${hours} hora${hours > 1 ? 's' : ''}`;
  }
  
  // Más de 24 horas
  return date.toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getStatus(codesSearched: number, codesFound: number): 'success' | 'partial' | 'error' {
  if (codesFound === 0) return 'error';
  if (codesFound === codesSearched) return 'success';
  return 'partial';
}

const ProcessingHistory: React.FC<ProcessingHistoryProps> = ({
  items,
  maxItems = 10,
  onItemClick,
  showHeader = true,
  emptyMessage = 'No hay procesamiento reciente',
}) => {
  const displayItems = items.slice(0, maxItems);
  
  if (items.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
        {showHeader && (
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
            Historial de Procesamiento
          </h3>
        )}
        <div className="text-center text-gray-500 dark:text-gray-400 py-8">
          <svg
            className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <p>{emptyMessage}</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
      {showHeader && (
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Historial de Procesamiento
          </h3>
        </div>
      )}
      
      <ul className="divide-y divide-gray-200 dark:divide-gray-700">
        {displayItems.map((item) => {
          const status = item.status || getStatus(item.codesSearched, item.codesFound);
          const config = statusConfig[status];
          const successRate = item.codesSearched > 0 
            ? (item.codesFound / item.codesSearched * 100).toFixed(0)
            : '0';
          
          return (
            <li
              key={item.id}
              className={`
                px-4 py-3 
                hover:bg-gray-50 dark:hover:bg-gray-700/50
                ${onItemClick ? 'cursor-pointer' : ''}
                transition-colors
              `}
              onClick={() => onItemClick?.(item)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  {/* Icono de documento */}
                  <div className={`p-2 rounded-lg ${config.bg}`}>
                    <svg
                      className={`w-5 h-5 ${config.text}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                  </div>
                  
                  {/* Info del documento */}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {item.documentName}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {item.codesFound}/{item.codesSearched} códigos • {successRate}%
                    </p>
                  </div>
                </div>
                
                {/* Estado y timestamp */}
                <div className="flex flex-col items-end gap-1 ml-4">
                  <span
                    className={`
                      inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium
                      ${config.bg} ${config.text}
                    `}
                  >
                    {config.icon}
                    {config.label}
                  </span>
                  <span className="text-xs text-gray-400">
                    {formatTimestamp(item.timestamp)}
                  </span>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
      
      {items.length > maxItems && (
        <div className="px-4 py-2 bg-gray-50 dark:bg-gray-700/50 text-center">
          <button className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
            Ver todos ({items.length})
          </button>
        </div>
      )}
    </div>
  );
};

export default ProcessingHistory;
