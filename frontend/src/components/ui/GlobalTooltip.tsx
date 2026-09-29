'use client';

import React, { useEffect, useState, useRef } from 'react';

interface Coords {
  x: number;
  y: number;
  arrowX: number;
  placement: 'top' | 'bottom';
  ready: boolean;
}

/**
 * Convierte cualquier texto descriptivo de tooltip a UNA SOLA PALABRA
 * según el requerimiento exacto del usuario:
 * "SOLO DEBEN INDICAR QUE OPCION ES EJEMPLO, ELIMINAR, ACTUALIZAR, EDITAR. EN UNA SOLA PALABRA"
 */
function toSingleWordAction(rawText: string): string {
  if (!rawText) return '';
  const text = rawText.trim();
  const lower = text.toLowerCase();

  if (lower.includes('eliminar') || lower.includes('borrar') || lower.includes('trash') || lower.includes('delete')) {
    return 'Eliminar';
  }
  if (lower.includes('editar') || lower.includes('modificar') || lower.includes('edit')) {
    return 'Editar';
  }
  if (
    lower.includes('actualizar') ||
    lower.includes('recargar') ||
    lower.includes('refrescar') ||
    lower.includes('reload') ||
    lower.includes('refresh')
  ) {
    return 'Actualizar';
  }
  if (lower.includes('copiado')) {
    return '¡Copiado!';
  }
  if (lower.includes('copiar') || lower.includes('copy')) {
    return 'Copiar';
  }
  if (lower.includes('bloquear') || lower.includes('suspender')) {
    return 'Bloquear';
  }
  if (lower.includes('reactivar') || lower.includes('activar')) {
    return 'Reactivar';
  }
  if (
    lower.includes('detalle') ||
    lower.includes('perfil') ||
    lower.includes('ver') ||
    lower.includes('view') ||
    lower.includes('ojo')
  ) {
    return 'Ver';
  }
  if (lower.includes('imprimir') || lower.includes('print')) {
    return 'Imprimir';
  }
  if (
    lower.includes('exportar') ||
    lower.includes('descargar') ||
    lower.includes('export') ||
    lower.includes('download')
  ) {
    return 'Exportar';
  }
  if (lower.includes('whatsapp') || lower.includes('chatear')) {
    return 'WhatsApp';
  }
  if (lower.includes('aviso') || lower.includes('recordatorio') || lower.includes('notificar')) {
    return 'Aviso';
  }
  if (lower.includes('recuperar')) {
    return 'Recuperar';
  }
  if (lower.includes('cerrar sesión') || lower.includes('logout') || lower.includes('salir')) {
    return 'Salir';
  }
  if (lower.includes('guardar') || lower.includes('save')) {
    return 'Guardar';
  }
  if (lower.includes('cancelar')) {
    return 'Cancelar';
  }
  if (lower.includes('filtrar') || lower.includes('filtro')) {
    return 'Filtrar';
  }
  if (lower.includes('limpiar')) {
    return 'Limpiar';
  }
  if (lower.includes('abrir')) {
    return 'Abrir';
  }

  // Si no encaja en las anteriores, extraer la primera palabra limpia
  const firstWord = text.split(/\s+/)[0].replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ¡!]/g, '');
  if (firstWord.length > 0) {
    return firstWord.charAt(0).toUpperCase() + firstWord.slice(1).toLowerCase();
  }
  return text;
}

export default function GlobalTooltip() {
  const [displayText, setDisplayText] = useState<string>('');
  const [visible, setVisible] = useState<boolean>(false);
  const [coords, setCoords] = useState<Coords>({
    x: 0,
    y: 0,
    arrowX: 0,
    placement: 'top',
    ready: false,
  });

  const tooltipRef = useRef<HTMLDivElement>(null);
  const activeTargetRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    // 1. Erradicar y sanitizar cualquier atributo "title" nativo en el DOM para impedir el tooltip feo del SO
    const sanitizeTitles = () => {
      try {
        const elements = document.querySelectorAll('[title]');
        elements.forEach((el) => {
          const t = el.getAttribute('title');
          if (t && t.trim()) {
            el.setAttribute('data-tooltip', t.trim());
            el.removeAttribute('title');
          }
        });
      } catch (e) {
        // safe
      }
    };

    sanitizeTitles();

    const observer = new MutationObserver(() => {
      sanitizeTitles();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['title'],
    });

    // 2. Escucha de eventos con captura de fase para adelantarse al navegador
    const handleMouseOver = (e: MouseEvent) => {
      const target = (e.target as HTMLElement | null)?.closest?.(
        '[data-tooltip], [title], [data-original-title]'
      ) as HTMLElement | null;

      if (!target) return;

      if (target.hasAttribute('title')) {
        const raw = target.getAttribute('title') || '';
        if (raw.trim()) {
          target.setAttribute('data-tooltip', raw.trim());
        }
        target.removeAttribute('title');
      }

      const raw =
        target.getAttribute('data-tooltip') ||
        target.getAttribute('data-original-title') ||
        '';

      const singleWord = toSingleWordAction(raw);
      if (!singleWord) {
        setVisible(false);
        activeTargetRef.current = null;
        return;
      }

      activeTargetRef.current = target;
      setDisplayText(singleWord);
      setVisible(true);
      setCoords((prev) => ({ ...prev, ready: false }));
    };

    const handleMouseOut = (e: MouseEvent) => {
      const related = e.relatedTarget as HTMLElement | null;
      if (activeTargetRef.current && (!related || !activeTargetRef.current.contains(related))) {
        activeTargetRef.current = null;
        setVisible(false);
      }
    };

    const handleWindowEvents = () => {
      if (activeTargetRef.current && visible) {
        reposition();
      }
    };

    const handleDismiss = () => {
      setVisible(false);
    };

    document.addEventListener('mouseover', handleMouseOver, true);
    document.addEventListener('mouseout', handleMouseOut, true);
    window.addEventListener('scroll', handleWindowEvents, true);
    window.addEventListener('resize', handleWindowEvents, true);
    document.addEventListener('pointerdown', handleDismiss, true);

    return () => {
      observer.disconnect();
      document.removeEventListener('mouseover', handleMouseOver, true);
      document.removeEventListener('mouseout', handleMouseOut, true);
      window.removeEventListener('scroll', handleWindowEvents, true);
      window.removeEventListener('resize', handleWindowEvents, true);
      document.removeEventListener('pointerdown', handleDismiss, true);
    };
  }, [visible]);

  // 3. Posicionamiento con medición exacta y Clamping al marco de la ventana
  const reposition = () => {
    const target = activeTargetRef.current;
    const tip = tooltipRef.current;
    if (!target || !tip) return;

    const targetRect = target.getBoundingClientRect();
    const tipRect = tip.getBoundingClientRect();

    const windowWidth = document.documentElement.clientWidth || window.innerWidth;
    const margin = 12; // Margen de seguridad con el marco de la ventana

    // Centro del ícono
    const targetCenterX = targetRect.left + targetRect.width / 2;

    // Centro ideal del tooltip
    const idealLeft = targetCenterX - tipRect.width / 2;

    // CLAMPING: NO SALIRSE NUNCA DEL MARCO DE LA VENTANA
    const minLeft = margin;
    const maxLeft = Math.max(margin, windowWidth - tipRect.width - margin);
    const clampedLeft = Math.max(minLeft, Math.min(idealLeft, maxLeft));

    // Flecha indicadora apuntando directamente al centro del ícono
    const arrowX = Math.max(12, Math.min(targetCenterX - clampedLeft, tipRect.width - 12));

    // SIEMPRE SOBRE EL ÍCONO
    let placement: 'top' | 'bottom' = 'top';
    let top = targetRect.top - tipRect.height - 8;

    // Si toca el tope absoluto de la ventana, conmutar hacia abajo
    if (top < margin) {
      top = targetRect.bottom + 8;
      placement = 'bottom';
    }

    setCoords({
      x: Math.round(clampedLeft),
      y: Math.round(top),
      arrowX: Math.round(arrowX),
      placement,
      ready: true,
    });
  };

  useEffect(() => {
    if (visible && displayText) {
      const raf = requestAnimationFrame(() => {
        reposition();
      });
      return () => cancelAnimationFrame(raf);
    }
  }, [visible, displayText]);

  if (!displayText) return null;

  return (
    <div
      ref={tooltipRef}
      role="tooltip"
      aria-hidden={!visible}
      style={{
        position: 'fixed',
        top: `${coords.y}px`,
        left: `${coords.x}px`,
        zIndex: 999999,
        pointerEvents: 'none',
        visibility: coords.ready && visible ? 'visible' : 'hidden',
        opacity: coords.ready && visible ? 1 : 0,
        transform: coords.ready && visible ? 'translateY(0) scale(1)' : 'translateY(2px) scale(0.96)',
      }}
      className="transition-[opacity,transform] duration-120 ease-out select-none"
    >
      {/* Contenedor del Tooltip: Idéntico al mockup del usuario (Fondo oscuro puro, bordes redondeados y flecha nítida) */}
      <div className="relative bg-[#18181b] text-white text-[12px] font-medium px-3 py-1.5 rounded-lg shadow-[0_10px_20px_rgba(0,0,0,0.6)] whitespace-nowrap tracking-normal">
        {displayText}

        {/* Flecha hacia abajo (Sobre el ícono) */}
        {coords.placement === 'top' ? (
          <div
            style={{ left: `${coords.arrowX}px` }}
            className="absolute top-full -translate-x-1/2 w-0 h-0 border-x-[6px] border-x-transparent border-t-[6px] border-t-[#18181b]"
          />
        ) : (
          <div
            style={{ left: `${coords.arrowX}px` }}
            className="absolute bottom-full -translate-x-1/2 w-0 h-0 border-x-[6px] border-x-transparent border-b-[6px] border-b-[#18181b]"
          />
        )}
      </div>
    </div>
  );
}
