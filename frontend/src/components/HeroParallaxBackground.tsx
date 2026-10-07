'use client';

import React, { useState, useEffect, useRef } from 'react';
import { HeroConfig } from '@/context/SettingsContext';

interface HeroParallaxBackgroundProps {
  config: HeroConfig;
  className?: string;
  isInteractivePreview?: boolean;
}

export default function HeroParallaxBackground({
  config,
  className = '',
  isInteractivePreview = false,
}: HeroParallaxBackgroundProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [mouseOffset, setMouseOffset] = useState({ x: 0, y: 0 });
  const [scrollY, setScrollY] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const images = config?.images && config.images.length > 0
    ? config.images.filter((url) => typeof url === 'string' && url.trim().length > 0)
    : [
        'https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?q=80&w=2069&auto=format&fit=crop',
      ];

  const transitionDuration = Math.max(2, config?.transitionDuration || 6);
  const fadeSpeed = config?.fadeSpeed || 1.5;
  const imageOpacity = config?.opacity !== undefined ? config.opacity : 0.4;
  const overlayColor = config?.overlayColor || '#030712';
  const overlayOpacity = config?.overlayOpacity !== undefined ? config.overlayOpacity : 0.7;
  const enableParallax = config?.enableParallax !== false;
  const enableKenBurns = config?.enableKenBurns !== false;

  // Auto-play / Carousel timer
  useEffect(() => {
    if (images.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % images.length);
    }, transitionDuration * 1000);

    return () => clearInterval(interval);
  }, [images.length, transitionDuration]);

  // Keep index in bounds if images array size changes
  useEffect(() => {
    if (currentIndex >= images.length) {
      setCurrentIndex(0);
    }
  }, [images.length, currentIndex]);

  // Mouse Parallax listener
  useEffect(() => {
    if (!enableParallax) {
      setMouseOffset({ x: 0, y: 0 });
      return;
    }

    const handleMouseMove = (e: MouseEvent) => {
      if (typeof window === 'undefined') return;
      const { innerWidth, innerHeight } = window;
      const x = (e.clientX / innerWidth - 0.5) * 28; // -14px to +14px
      const y = (e.clientY / innerHeight - 0.5) * 28; // -14px to +14px
      setMouseOffset({ x, y });
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [enableParallax]);

  // Scroll Parallax listener
  useEffect(() => {
    if (!enableParallax || isInteractivePreview) return;

    const handleScroll = () => {
      if (typeof window === 'undefined') return;
      setScrollY(window.scrollY * 0.35); // parallax scroll damping
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [enableParallax, isInteractivePreview]);

  if (!config?.enabled) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className={`absolute inset-0 pointer-events-none overflow-hidden select-none z-0 ${className}`}
    >
      {/* ─── 1. CAPA DE IMÁGENES CON PARALLAX Y TRANSICIÓN TIPO NETFLIX ─── */}
      <div
        className="absolute -inset-10 w-[calc(100%+80px)] h-[calc(100%+80px)] transition-transform duration-300 ease-out will-change-transform"
        style={{
          transform: enableParallax
            ? `translate3d(${-mouseOffset.x}px, ${-mouseOffset.y + scrollY * 0.5}px, 0px)`
            : 'none',
        }}
      >
        {images.map((imgUrl, idx) => {
          const isActive = idx === currentIndex;
          return (
            <div
              key={`${imgUrl}-${idx}`}
              className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-all"
              style={{
                backgroundImage: `url("${imgUrl}")`,
                opacity: isActive ? imageOpacity : 0,
                transitionDuration: `${fadeSpeed}s`,
                transitionProperty: 'opacity, transform',
                transform: isActive && enableKenBurns ? 'scale(1.06)' : 'scale(1.0)',
                filter: 'saturate(1.2) contrast(1.1)',
              }}
            />
          );
        })}
      </div>

      {/* ─── 2. CAPA FRONTAL DE COLOR CONFIGURABLE ─── */}
      <div
        className="absolute inset-0 transition-all duration-500"
        style={{
          backgroundColor: overlayColor,
          opacity: overlayOpacity,
        }}
      />

      {/* ─── 3. GRADIENTE CINEMATOGRÁFICO DE DEGRADADO (NETFLIX STYLE) ─── */}
      {/* Degradado superior para suavizar la navbar */}
      <div
        className="absolute inset-x-0 top-0 h-44 bg-gradient-to-b pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(to bottom, ${overlayColor} 0%, rgba(3,7,18,0.7) 40%, transparent 100%)`,
        }}
      />

      {/* Radial vignette para enfocar el centro del banner y botones */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse at 50% 35%, transparent 20%, ${overlayColor} 90%)`,
          opacity: 0.85,
        }}
      />

      {/* Degradado inferior pronunciado para fundir el hero perfectamente con el catálogo */}
      <div
        className="absolute inset-x-0 bottom-0 h-72 bg-gradient-to-t pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(to top, ${overlayColor} 0%, ${overlayColor} 40%, rgba(3,7,18,0.85) 70%, transparent 100%)`,
        }}
      />

      {/* Glows ambientales sutiles */}
      <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-red-600/15 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute top-1/4 -left-20 w-[450px] h-[400px] bg-purple-600/10 rounded-full blur-[140px] pointer-events-none" />
    </div>
  );
}
