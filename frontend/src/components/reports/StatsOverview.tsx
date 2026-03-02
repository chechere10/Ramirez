/**
 * StatsOverview - Panel de estadísticas generales.
 * 
 * Muestra un resumen completo de las estadísticas del sistema.
 */

import React from 'react';
import StatsCard from './StatsCard';
import ResultsChart from './ResultsChart';

interface Stats {
  /** Total de documentos procesados */
  totalDocuments: number;
  /** Total de códigos buscados */
  totalCodes: number;
  /** Total de códigos encontrados */
  totalFound: number;
  /** Total de códigos no encontrados */
  totalNotFound: number;
  /** Tiempo promedio de procesamiento (ms) */
  avgProcessingTime?: number;
  /** Documentos procesados hoy */
  todayDocuments?: number;
  /** Variación vs período anterior */
  change?: number;
}

interface StatsOverviewProps {
  /** Estadísticas a mostrar */
  stats: Stats;
  /** Layout de las tarjetas */
  layout?: 'grid' | 'horizontal' | 'compact';
  /** Mostrar gráfico */
  showChart?: boolean;
  /** Título del panel */
  title?: string;
}

const StatsOverview: React.FC<StatsOverviewProps> = ({
  stats,
  layout = 'grid',
  showChart = true,
  title = 'Resumen de Estadísticas',
}) => {
  const successRate = stats.totalCodes > 0 
    ? (stats.totalFound / stats.totalCodes * 100) 
    : 0;
  
  const gridClasses = {
    grid: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4',
    horizontal: 'flex flex-wrap gap-4',
    compact: 'grid grid-cols-2 lg:grid-cols-4 gap-2',
  };
  
  return (
    <div className="space-y-6">
      {title && (
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          {title}
        </h2>
      )}
      
      <div className={gridClasses[layout]}>
        <StatsCard
          title="Documentos Procesados"
          value={stats.totalDocuments}
          subtitle={stats.todayDocuments ? `${stats.todayDocuments} hoy` : undefined}
          color="blue"
          icon={
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          }
        />
        
        <StatsCard
          title="Códigos Encontrados"
          value={stats.totalFound}
          subtitle={`de ${stats.totalCodes} buscados`}
          color="green"
          icon={
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          }
        />
        
        <StatsCard
          title="No Encontrados"
          value={stats.totalNotFound}
          color="red"
          icon={
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          }
        />
        
        <StatsCard
          title="Tasa de Éxito"
          value={successRate}
          format="percent"
          color={successRate >= 80 ? 'green' : successRate >= 50 ? 'yellow' : 'red'}
          change={stats.change}
          icon={
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
          }
        />
      </div>
      
      {showChart && stats.totalCodes > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ResultsChart
            found={stats.totalFound}
            notFound={stats.totalNotFound}
            type="donut"
            title="Distribución de Resultados"
          />
          <ResultsChart
            found={stats.totalFound}
            notFound={stats.totalNotFound}
            type="progress"
            title="Progreso de Búsqueda"
          />
        </div>
      )}
      
      {stats.avgProcessingTime !== undefined && (
        <div className="text-sm text-gray-500 dark:text-gray-400 text-center">
          Tiempo promedio de procesamiento: {(stats.avgProcessingTime / 1000).toFixed(2)}s
        </div>
      )}
    </div>
  );
};

export default StatsOverview;
