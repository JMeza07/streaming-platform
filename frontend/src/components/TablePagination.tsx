'use client';

import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface TablePaginationProps {
  currentPage: number;
  totalItems: number;
  itemsPerPage?: number;
  onPageChange: (newPage: number) => void;
  className?: string;
}

export default function TablePagination({
  currentPage,
  totalItems,
  itemsPerPage = 10,
  onPageChange,
  className = '',
}: TablePaginationProps) {
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;

  if (totalItems <= itemsPerPage && totalPages <= 1) {
    return null;
  }

  const startRecord = Math.min((currentPage - 1) * itemsPerPage + 1, totalItems);
  const endRecord = Math.min(currentPage * itemsPerPage, totalItems);

  // Generar páginas a mostrar con elipsis inteligente
  const getVisiblePages = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) {
        pages.push('ellipsis-start');
      }

      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (currentPage < totalPages - 2) {
        pages.push('ellipsis-end');
      }
      pages.push(totalPages);
    }

    return pages;
  };

  const visiblePages = getVisiblePages();

  return (
    <div
      className={`flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 bg-gray-950/80 border-t border-gray-800 text-xs text-gray-400 ${className}`}
    >
      <div className="flex items-center gap-2">
        <span>
          Mostrando <strong className="text-white font-medium">{startRecord}</strong> -{' '}
          <strong className="text-white font-medium">{endRecord}</strong> de{' '}
          <strong className="text-white font-medium">{totalItems}</strong> registros
        </span>
        <span className="text-gray-700 hidden sm:inline">|</span>
        <span className="hidden sm:inline">
          Página <strong className="text-gray-200">{currentPage}</strong> de{' '}
          <strong className="text-gray-200">{totalPages}</strong>
        </span>
      </div>

      <div className="flex items-center gap-1.5">
        {/* Botón Anterior */}
        <button
          type="button"
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage <= 1}
          className="px-2.5 py-1.5 rounded-xl bg-gray-900 hover:bg-gray-850 disabled:opacity-30 disabled:hover:bg-gray-900 disabled:cursor-not-allowed text-gray-300 hover:text-white border border-gray-800 transition flex items-center gap-1 cursor-pointer"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Anterior</span>
        </button>

        {/* Números de Página */}
        <div className="flex items-center gap-1">
          {visiblePages.map((p, idx) => {
            if (typeof p === 'string') {
              return (
                <span key={`${p}-${idx}`} className="px-1 text-gray-600 font-mono select-none">
                  •••
                </span>
              );
            }

            const isActive = p === currentPage;
            return (
              <button
                key={p}
                type="button"
                onClick={() => onPageChange(p)}
                className={`w-7 h-7 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  isActive
                    ? 'bg-red-600 text-white shadow-md shadow-red-900/40 border border-red-500/60'
                    : 'bg-gray-900 hover:bg-gray-800 text-gray-400 hover:text-white border border-gray-800'
                }`}
              >
                {p}
              </button>
            );
          })}
        </div>

        {/* Botón Siguiente */}
        <button
          type="button"
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage >= totalPages}
          className="px-2.5 py-1.5 rounded-xl bg-gray-900 hover:bg-gray-850 disabled:opacity-30 disabled:hover:bg-gray-900 disabled:cursor-not-allowed text-gray-300 hover:text-white border border-gray-800 transition flex items-center gap-1 cursor-pointer"
        >
          <span className="hidden sm:inline">Siguiente</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
