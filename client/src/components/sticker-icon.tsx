
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
        // Emerging - Seedling with growth animation
        return (
          <svg {...commonProps}>
            <defs>
              <radialGradient id={`redGradient${size}`} cx="0.4" cy="0.3" r="0.9">
                <stop offset="0%" stopColor="#ff6b6b" />
                <stop offset="30%" stopColor="#e74c3c" />
                <stop offset="70%" stopColor="#c0392b" />
                <stop offset="100%" stopColor="#8b0000" />
              </radialGradient>
              <radialGradient id={`redCenterGlow${size}`} cx="0.5" cy="0.5" r="0.6">
                <stop offset="0%" stopColor="#ffffff" opacity="0.4" />
                <stop offset="100%" stopColor="#ffffff" opacity="0" />
              </radialGradient>
              <filter id={`redPulse${size}`}>
                <feGaussianBlur stdDeviation="0.5" result="coloredBlur"/>
                <feMerge> 
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>
            <circle cx="12" cy="12" r="11" fill={`url(#redGradient${size})`} stroke="#722F37" strokeWidth="1.5"/>
            <circle cx="12" cy="12" r="11" fill={`url(#redCenterGlow${size})`} />
            
            {/* Organic growth pattern - spiraling dots */}
            <g transform="translate(12,12)" filter={`url(#redPulse${size})`}>
              {[0, 1, 2, 3, 4, 5].map((i) => {
                const angle = i * 60 + 15;
                const radius = 3 + i * 1.2;
                const x = Math.cos(angle * Math.PI / 180) * radius;
                const y = Math.sin(angle * Math.PI / 180) * radius;
                return (
                  <circle key={i} cx={x} cy={y} r={0.8 + i * 0.2} fill="white" opacity={0.9 - i * 0.1}>
                    <animate attributeName="opacity" values="0.3;0.9;0.3" dur="2s" begin={`${i * 0.3}s`} repeatCount="indefinite"/>
                  </circle>
                );
              })}
            </g>
            
            {/* Central seedling icon */}
            <g transform="translate(12,12)">
              {/* Stem */}
              <rect x="-0.5" y="2" width="1" height="6" fill="white" opacity="0.9" rx="0.5"/>
              {/* First leaf */}
              <path d="M-0.5 3 Q-3 1 -2 4 Q-1 3 -0.5 3" fill="white" opacity="0.8"/>
              {/* Second leaf */}
              <path d="M0.5 1 Q3 -1 2 2 Q1 1 0.5 1" fill="white" opacity="0.8"/>
              {/* Growth sparkles */}
              <circle cx="-3" cy="0" r="0.5" fill="white" opacity="0.7">
                <animate attributeName="opacity" values="0;1;0" dur="1.5s" repeatCount="indefinite"/>
              </circle>
              <circle cx="3" cy="-2" r="0.3" fill="white" opacity="0.6">
                <animate attributeName="opacity" values="0;1;0" dur="1.8s" begin="0.5s" repeatCount="indefinite"/>
              </circle>
            </g>
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
        // Applying - Dynamic rocket ship with trail
        return (
          <svg {...commonProps}>
            <defs>
              <radialGradient id={`greenGradient${size}`} cx="0.3" cy="0.2" r="1.2">
                <stop offset="0%" stopColor="#48bb78" />
                <stop offset="30%" stopColor="#38a169" />
                <stop offset="70%" stopColor="#2f855a" />
                <stop offset="100%" stopColor="#1a202c" />
              </radialGradient>
              <linearGradient id={`greenTrail${size}`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#68d391" opacity="0.8" />
                <stop offset="50%" stopColor="#48bb78" opacity="0.4" />
                <stop offset="100%" stopColor="#2f855a" opacity="0.1" />
              </linearGradient>
              <filter id={`greenGlow${size}`}>
                <feGaussianBlur stdDeviation="1" result="coloredBlur"/>
                <feMerge> 
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>
            <circle cx="12" cy="12" r="11" fill={`url(#greenGradient${size})`} stroke="#1a365d" strokeWidth="1.5"/>
            
            {/* Dynamic trail effect */}
            <g transform="translate(12,12)" filter={`url(#greenGlow${size})`}>
              {[0, 1, 2, 3].map((i) => (
                <circle key={i} cx={2 + i * 1.5} cy={6 + i * 1.2} r={1.5 - i * 0.3} fill="#68d391" opacity={0.7 - i * 0.15}>
                  <animate attributeName="opacity" values="0.1;0.7;0.1" dur="1.2s" begin={`${i * 0.2}s`} repeatCount="indefinite"/>
                </circle>
              ))}
            </g>
            
            {/* Rocket body */}
            <g transform="translate(12,12)">
              {/* Main body */}
              <ellipse cx="0" cy="1" rx="2.5" ry="5" fill="white" opacity="0.95" stroke="#38a169" strokeWidth="0.8"/>
              {/* Nose cone */}
              <path d="M0 -4 L-1.5 -1 L1.5 -1 Z" fill="white" opacity="0.9"/>
              {/* Window */}
              <circle cx="0" cy="0" r="1.2" fill="#4fd1c7" opacity="0.8" stroke="white" strokeWidth="0.5"/>
              {/* Wings */}
              <path d="M-2.5 3 L-4 6 L-1.5 4.5 Z" fill="white" opacity="0.85"/>
              <path d="M2.5 3 L4 6 L1.5 4.5 Z" fill="white" opacity="0.85"/>
              {/* Exhaust flame */}
              <path d="M-1 6 Q0 9 1 6 Q0 7.5 -1 6" fill="#ffd93d" opacity="0.9">
                <animateTransform attributeName="transform" type="scale" values="1;1.2;1" dur="0.8s" repeatCount="indefinite"/>
              </path>
            </g>
            
            {/* Success stars orbiting */}
            <g transform="translate(12,12)">
              {[0, 120, 240].map((angle, i) => (
                <g key={i} transform={`rotate(${angle})`}>
                  <g transform="translate(0,-8)">
                    <animateTransform attributeName="transform" type="rotate" values={`${angle};${angle + 360}`} dur="3s" repeatCount="indefinite"/>
                    <path d="M0 0 L0.5 1.5 L2 1.5 L1 2.5 L1.5 4 L0 3 L-1.5 4 L-1 2.5 L-2 1.5 L-0.5 1.5 Z" 
                          fill="white" opacity="0.8" transform="scale(0.6)">
                      <animate attributeName="opacity" values="0.4;1;0.4" dur="2s" repeatCount="indefinite"/>
                    </path>
                  </g>
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
