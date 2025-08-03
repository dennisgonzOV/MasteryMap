
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
        // Emerging - Rising sun design
        return (
          <svg {...commonProps}>
            <defs>
              <radialGradient id={`redGradient${size}`} cx="0.5" cy="0.6" r="0.7">
                <stop offset="0%" stopColor="#ff7979" />
                <stop offset="50%" stopColor="#e74c3c" />
                <stop offset="100%" stopColor="#c0392b" />
              </radialGradient>
              <linearGradient id={`redShine${size}`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#ffffff" opacity="0.3" />
                <stop offset="100%" stopColor="#ffffff" opacity="0" />
              </linearGradient>
            </defs>
            <circle cx="12" cy="12" r="11" fill={`url(#redGradient${size})`} stroke="#8b0000" strokeWidth="1"/>
            <circle cx="12" cy="12" r="11" fill={`url(#redShine${size})`} />
            
            {/* Sun rays pattern */}
            <g transform="translate(12,12)">
              {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => (
                <g key={i} transform={`rotate(${angle})`}>
                  <rect x="-0.5" y="-8" width="1" height="2" fill="#fff" opacity="0.8" rx="0.5"/>
                </g>
              ))}
            </g>
            
            {/* Central star */}
            <path d="M12 5 L13.5 9.5 L18 9.5 L14.5 12.5 L16 17 L12 14 L8 17 L9.5 12.5 L6 9.5 L10.5 9.5 Z" 
                  fill="white" opacity="0.9" strokeWidth="0.5" stroke="#c0392b"/>
          </svg>
        );
      
      case 'yellow':
        // Developing - Lightning bolt energy
        return (
          <svg {...commonProps}>
            <defs>
              <radialGradient id={`yellowGradient${size}`} cx="0.3" cy="0.3" r="0.8">
                <stop offset="0%" stopColor="#f39c12" />
                <stop offset="40%" stopColor="#f1c40f" />
                <stop offset="100%" stopColor="#d68910" />
              </radialGradient>
              <filter id={`yellowGlow${size}`}>
                <feGaussianBlur stdDeviation="1" result="coloredBlur"/>
                <feMerge> 
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>
            <circle cx="12" cy="12" r="11" fill={`url(#yellowGradient${size})`} stroke="#b7950b" strokeWidth="1"/>
            
            {/* Zigzag energy pattern */}
            <g transform="translate(12,12)" filter={`url(#yellowGlow${size})`}>
              <path d="M-6,-6 L-2,-2 L-6,2 L-2,6 M2,-6 L6,-2 L2,2 L6,6" 
                    stroke="white" strokeWidth="2" fill="none" opacity="0.7" strokeLinecap="round"/>
            </g>
            
            {/* Lightning bolt */}
            <path d="M10 6 L15 6 L12 12 L14 12 L9 18 L11 11 L8 11 Z" 
                  fill="white" stroke="#d68910" strokeWidth="0.5"/>
          </svg>
        );
      
      case 'blue':
        // Proficient - Shield with check
        return (
          <svg {...commonProps}>
            <defs>
              <linearGradient id={`blueGradient${size}`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#3498db" />
                <stop offset="50%" stopColor="#2980b9" />
                <stop offset="100%" stopColor="#1f4e79" />
              </linearGradient>
              <radialGradient id={`blueShield${size}`} cx="0.5" cy="0.3" r="0.8">
                <stop offset="0%" stopColor="#ffffff" opacity="0.2" />
                <stop offset="100%" stopColor="#ffffff" opacity="0" />
              </radialGradient>
            </defs>
            <circle cx="12" cy="12" r="11" fill={`url(#blueGradient${size})`} stroke="#1b4f72" strokeWidth="1"/>
            
            {/* Shield shape */}
            <path d="M12 4 L17 7 L17 13 Q17 16 12 19 Q7 16 7 13 L7 7 Z" 
                  fill="white" opacity="0.9" stroke="#2980b9" strokeWidth="1"/>
            <path d="M12 4 L17 7 L17 13 Q17 16 12 19 Q7 16 7 13 L7 7 Z" 
                  fill={`url(#blueShield${size})`}/>
            
            {/* Check mark */}
            <path d="M9 11.5 L11 13.5 L15 9.5" 
                  stroke="#2980b9" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        );
      
      case 'green':
        // Applying - Trophy/achievement design
        return (
          <svg {...commonProps}>
            <defs>
              <radialGradient id={`greenGradient${size}`} cx="0.4" cy="0.3" r="0.8">
                <stop offset="0%" stopColor="#2ecc71" />
                <stop offset="50%" stopColor="#27ae60" />
                <stop offset="100%" stopColor="#196f3d" />
              </radialGradient>
              <linearGradient id={`greenShine${size}`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#ffffff" opacity="0.4" />
                <stop offset="50%" stopColor="#ffffff" opacity="0.1" />
                <stop offset="100%" stopColor="#ffffff" opacity="0" />
              </linearGradient>
            </defs>
            <circle cx="12" cy="12" r="11" fill={`url(#greenGradient${size})`} stroke="#0e5e2a" strokeWidth="1"/>
            <circle cx="12" cy="12" r="11" fill={`url(#greenShine${size})`} />
            
            {/* Simplified trophy design */}
            <path d="M8 8 L8 12 Q8 14 12 14 Q16 14 16 12 L16 8 Z" 
                  fill="white" opacity="0.9" stroke="#27ae60" strokeWidth="1"/>
            <rect x="10" y="14" width="4" height="2" fill="white" opacity="0.9"/>
            <rect x="9" y="16" width="6" height="1" fill="white" opacity="0.9"/>
            
            {/* Star on trophy */}
            <path d="M12 9.5 L12.5 10.5 L13.5 10.5 L12.8 11.2 L13 12.2 L12 11.7 L11 12.2 L11.2 11.2 L10.5 10.5 L11.5 10.5 Z" 
                  fill="#27ae60"/>
            
            {/* Simple achievement rays */}
            <g transform="translate(12,12)" opacity="0.6">
              {[0, 60, 120, 180, 240, 300].map((angle, i) => (
                <g key={i} transform={`rotate(${angle})`}>
                  <rect x="-0.5" y="-10" width="1" height="2" fill="#ffffff" rx="0.5"/>
                </g>
              ))}
            </g>
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
