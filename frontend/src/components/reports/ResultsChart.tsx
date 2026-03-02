/**
 * ResultsChart - Gráfico de resultados de búsqueda.
 * 
 * Muestra un gráfico de barras/donut con códigos encontrados vs no encontrados.
 */

import React from 'react';

interface ResultsChartProps {
  /** Número de códigos encontrados */
  found: number;
  /** Número de códigos no encontrados */
  notFound: number;
  /** Tipo de gráfico */
  type?: 'bar' | 'donut' | 'progress';
  /** Mostrar leyenda */
  showLegend?: boolean;
  /** Alto del componente */
  height?: number;
  /** Título opcional */
  title?: string;
}

const ResultsChart: React.FC<ResultsChartProps> = ({
  found,
  notFound,
  type = 'donut',
  showLegend = true,
  height = 200,
  title,
}) => {
  const total = found + notFound;
  const foundPercent = total > 0 ? (found / total) * 100 : 0;
  const notFoundPercent = total > 0 ? (notFound / total) * 100 : 0;
  
  // Colores
  const foundColor = '#22c55e'; // green-500
  const notFoundColor = '#ef4444'; // red-500
  
  const renderDonutChart = () => {
    const size = Math.min(height, 180);
    const center = size / 2;
    const radius = size * 0.4;
    const strokeWidth = size * 0.15;
    const circumference = 2 * Math.PI * radius;
    const foundDash = (foundPercent / 100) * circumference;
    
    return (
      <div className="flex flex-col items-center">
        <svg width={size} height={size} className="transform -rotate-90">
          {/* Fondo (no encontrados) */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={notFoundColor}
            strokeWidth={strokeWidth}
            className="opacity-80"
          />
          {/* Encontrados */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={foundColor}
            strokeWidth={strokeWidth}
            strokeDasharray={`${foundDash} ${circumference}`}
            className="transition-all duration-500"
          />
        </svg>
        {/* Centro con porcentaje */}
        <div
          className="absolute flex flex-col items-center justify-center"
          style={{ width: size, height: size }}
        >
          <span className="text-2xl font-bold text-gray-900 dark:text-white">
            {foundPercent.toFixed(0)}%
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            encontrados
          </span>
        </div>
      </div>
    );
  };
  
  const renderBarChart = () => (
    <div className="flex flex-col gap-3 w-full">
      <div>
        <div className="flex justify-between text-sm mb-1">
          <span className="text-gray-600 dark:text-gray-300">Encontrados</span>
          <span className="font-medium text-green-600">{found}</span>
        </div>
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-green-500 rounded-full transition-all duration-500"
            style={{ width: `${foundPercent}%` }}
          />
        </div>
      </div>
      <div>
        <div className="flex justify-between text-sm mb-1">
          <span className="text-gray-600 dark:text-gray-300">No encontrados</span>
          <span className="font-medium text-red-600">{notFound}</span>
        </div>
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-red-500 rounded-full transition-all duration-500"
            style={{ width: `${notFoundPercent}%` }}
          />
        </div>
      </div>
    </div>
  );
  
  const renderProgressChart = () => (
    <div className="w-full">
      <div className="flex justify-between text-sm mb-2">
        <span className="text-gray-600 dark:text-gray-300">
          {found} de {total} códigos encontrados
        </span>
        <span className="font-medium text-gray-900 dark:text-white">
          {foundPercent.toFixed(1)}%
        </span>
      </div>
      <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden flex">
        <div
          className="h-full bg-green-500 transition-all duration-500 flex items-center justify-end pr-2"
          style={{ width: `${foundPercent}%` }}
        >
          {foundPercent > 15 && (
            <span className="text-xs text-white font-medium">{found}</span>
          )}
        </div>
        <div
          className="h-full bg-red-500 transition-all duration-500 flex items-center justify-start pl-2"
          style={{ width: `${notFoundPercent}%` }}
        >
          {notFoundPercent > 15 && (
            <span className="text-xs text-white font-medium">{notFound}</span>
          )}
        </div>
      </div>
    </div>
  );
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
      {title && (
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
          {title}
        </h3>
      )}
      
      <div className="relative flex justify-center" style={{ minHeight: type === 'donut' ? height : 'auto' }}>
        {type === 'donut' && renderDonutChart()}
        {type === 'bar' && renderBarChart()}
        {type === 'progress' && renderProgressChart()}
      </div>
      
      {showLegend && type !== 'bar' && (
        <div className="flex justify-center gap-6 mt-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span className="text-sm text-gray-600 dark:text-gray-300">
              Encontrados ({found})
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <span className="text-sm text-gray-600 dark:text-gray-300">
              No encontrados ({notFound})
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResultsChart;
