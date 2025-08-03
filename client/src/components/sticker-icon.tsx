
import React from 'react';

interface StickerIconProps {
  level: 'red' | 'yellow' | 'blue' | 'green';
  size?: number;
  className?: string;
}

export default function StickerIcon({ level, size = 24, className = "" }: StickerIconProps) {
  const getStickerSVG = (level: string) => {
    const commonProps = {
      width: size,
      height: size,
      viewBox: "0 0 24 24",
      className: className
    };

    switch (level) {
      case 'red':
        return (
          <svg {...commonProps}>
            <defs>
              <radialGradient id="redGradient" cx="0.5" cy="0.3" r="0.8">
                <stop offset="0%" stopColor="#ff6b6b" />
                <stop offset="100%" stopColor="#e53e3e" />
              </radialGradient>
            </defs>
            <circle cx="12" cy="12" r="10" fill="url(#redGradient)" stroke="#c53030" strokeWidth="1"/>
            <circle cx="12" cy="12" r="6" fill="#ff8a80" opacity="0.3"/>
            <path d="M8 12 L11 15 L16 9" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        );
      
      case 'yellow':
        return (
          <svg {...commonProps}>
            <defs>
              <radialGradient id="yellowGradient" cx="0.5" cy="0.3" r="0.8">
                <stop offset="0%" stopColor="#ffd93d" />
                <stop offset="100%" stopColor="#f6ad55" />
              </radialGradient>
            </defs>
            <circle cx="12" cy="12" r="10" fill="url(#yellowGradient)" stroke="#d69e2e" strokeWidth="1"/>
            <circle cx="12" cy="12" r="6" fill="#ffe066" opacity="0.4"/>
            <path d="M8 12 L11 15 L16 9" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        );
      
      case 'blue':
        return (
          <svg {...commonProps}>
            <defs>
              <radialGradient id="blueGradient" cx="0.5" cy="0.3" r="0.8">
                <stop offset="0%" stopColor="#4299e1" />
                <stop offset="100%" stopColor="#3182ce" />
              </radialGradient>
            </defs>
            <circle cx="12" cy="12" r="10" fill="url(#blueGradient)" stroke="#2c5282" strokeWidth="1"/>
            <circle cx="12" cy="12" r="6" fill="#90cdf4" opacity="0.3"/>
            <path d="M8 12 L11 15 L16 9" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        );
      
      case 'green':
        return (
          <svg {...commonProps}>
            <defs>
              <radialGradient id="greenGradient" cx="0.5" cy="0.3" r="0.8">
                <stop offset="0%" stopColor="#48bb78" />
                <stop offset="100%" stopColor="#38a169" />
              </radialGradient>
            </defs>
            <circle cx="12" cy="12" r="10" fill="url(#greenGradient)" stroke="#2f855a" strokeWidth="1"/>
            <circle cx="12" cy="12" r="6" fill="#9ae6b4" opacity="0.3"/>
            <path d="M8 12 L11 15 L16 9" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        );
      
      default:
        return (
          <svg {...commonProps}>
            <circle cx="12" cy="12" r="10" fill="#e2e8f0" stroke="#a0aec0" strokeWidth="1"/>
            <path d="M8 12 L11 15 L16 9" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        );
    }
  };

  return getStickerSVG(level);
}
