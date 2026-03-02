/**
 * StatsCard - Tarjeta de estadística individual.
 * 
 * Muestra un valor con título, icono opcional y variación.
 */

import React from 'react';

interface StatsCardProps {
  /** Título de la estadística */
  title: string;
  /** Valor principal */
  value: number | string;
  /** Subtítulo o descripción adicional */
  subtitle?: string;
  /** Icono a mostrar */
  icon?: React.ReactNode;
  /** Variación respecto al período anterior */
  change?: number;
  /** Color del borde/acento */
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'purple';
  /** Formato del valor */
  format?: 'number' | 'percent' | 'currency';
  /** Tamaño de la tarjeta */
  size?: 'sm' | 'md' | 'lg';
}

const colorClasses = {
  blue: 'border-l-blue-500 bg-blue-50 dark:bg-blue-900/20',
  green: 'border-l-green-500 bg-green-50 dark:bg-green-900/20',
  yellow: 'border-l-yellow-500 bg-yellow-50 dark:bg-yellow-900/20',
  red: 'border-l-red-500 bg-red-50 dark:bg-red-900/20',
  purple: 'border-l-purple-500 bg-purple-50 dark:bg-purple-900/20',
};

const iconColorClasses = {
  blue: 'text-blue-500',
  green: 'text-green-500',
  yellow: 'text-yellow-500',
  red: 'text-red-500',
  purple: 'text-purple-500',
};

const sizeClasses = {
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
};

const valueSizeClasses = {
  sm: 'text-xl',
  md: 'text-2xl',
  lg: 'text-3xl',
};

function formatValue(value: number | string, format?: string): string {
  if (typeof value === 'string') return value;
  
  switch (format) {
    case 'percent':
      return `${value.toFixed(1)}%`;
    case 'currency':
      return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0,
      }).format(value);
    case 'number':
    default:
      return new Intl.NumberFormat('es-CO').format(value);
  }
}

const StatsCard: React.FC<StatsCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  change,
  color = 'blue',
  format = 'number',
  size = 'md',
}) => {
  const isPositiveChange = change && change > 0;
  const isNegativeChange = change && change < 0;
  
  return (
    <div
      className={`
        rounded-lg border-l-4 shadow-sm
        bg-white dark:bg-gray-800
        ${colorClasses[color]}
        ${sizeClasses[size]}
        transition-all hover:shadow-md
      `}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
            {title}
          </p>
          <p className={`font-bold text-gray-900 dark:text-white mt-1 ${valueSizeClasses[size]}`}>
            {formatValue(value, format)}
          </p>
          {subtitle && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {subtitle}
            </p>
          )}
          {change !== undefined && (
            <div className="flex items-center mt-2">
              {isPositiveChange && (
                <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                </svg>
              )}
              {isNegativeChange && (
                <svg className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
              )}
              <span
                className={`text-sm ml-1 ${
                  isPositiveChange
                    ? 'text-green-600 dark:text-green-400'
                    : isNegativeChange
                    ? 'text-red-600 dark:text-red-400'
                    : 'text-gray-500'
                }`}
              >
                {change > 0 ? '+' : ''}{change.toFixed(1)}%
              </span>
              <span className="text-xs text-gray-400 ml-1">vs anterior</span>
            </div>
          )}
        </div>
        {icon && (
          <div className={`p-2 rounded-full ${iconColorClasses[color]} bg-opacity-10`}>
            {icon}
          </div>
        )}
      </div>
    </div>
  );
};

export default StatsCard;
