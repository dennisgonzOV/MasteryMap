
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
        // Emerging - Dynamic growing tree with animated elements
        return (
          <svg {...commonProps}>
            <defs>
              <radialGradient id={`redGradient${size}`} cx="0.3" cy="0.2" r="1.1">
                <stop offset="0%" stopColor="#ff6b6b" />
                <stop offset="20%" stopColor="#ff5722" />
                <stop offset="50%" stopColor="#e74c3c" />
                <stop offset="80%" stopColor="#c0392b" />
                <stop offset="100%" stopColor="#8b0000" />
              </radialGradient>
              <radialGradient id={`redCenterGlow${size}`} cx="0.5" cy="0.5" r="0.7">
                <stop offset="0%" stopColor="#ffffff" opacity="0.6" />
                <stop offset="60%" stopColor="#ffeb3b" opacity="0.2" />
                <stop offset="100%" stopColor="#ffffff" opacity="0" />
              </radialGradient>
              <filter id={`redPulse${size}`}>
                <feGaussianBlur stdDeviation="0.8" result="coloredBlur"/>
                <feMerge> 
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
              <linearGradient id={`redLeafGradient${size}`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#81c784" />
                <stop offset="50%" stopColor="#66bb6a" />
                <stop offset="100%" stopColor="#4caf50" />
              </linearGradient>
            </defs>
            
            {/* Outer ring pulse */}
            <circle cx="12" cy="12" r="11" fill={`url(#redGradient${size})`} stroke="#722F37" strokeWidth="1.5">
              <animate attributeName="r" values="10.5;11;10.5" dur="3s" repeatCount="indefinite"/>
            </circle>
            <circle cx="12" cy="12" r="11" fill={`url(#redCenterGlow${size})`} />
            
            {/* Floating growth particles around the tree */}
            <g transform="translate(12,12)" filter={`url(#redPulse${size})`}>
              {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
                const angle = i * 45 + (i % 2 * 22.5);
                const radius = 6 + (i % 3) * 1.5;
                const x = Math.cos(angle * Math.PI / 180) * radius;
                const y = Math.sin(angle * Math.PI / 180) * radius;
                return (
                  <g key={i}>
                    <circle cx={x} cy={y} r={0.6 + (i % 3) * 0.2} fill="#81c784" opacity={0.8}>
                      <animate attributeName="opacity" values="0.2;1;0.2" dur={`${2 + i * 0.2}s`} begin={`${i * 0.4}s`} repeatCount="indefinite"/>
                      <animateTransform attributeName="transform" type="translate" values={`0,0;0,-2;0,0`} dur={`${3 + i * 0.3}s`} begin={`${i * 0.2}s`} repeatCount="indefinite"/>
                    </circle>
                    {/* Tiny sparkle trails */}
                    <circle cx={x + 1} cy={y - 1} r="0.3" fill="white" opacity="0.6">
                      <animate attributeName="opacity" values="0;0.8;0" dur={`${1.5 + i * 0.1}s`} begin={`${i * 0.5}s`} repeatCount="indefinite"/>
                    </circle>
                  </g>
                );
              })}
            </g>
            
            {/* Central growing tree */}
            <g transform="translate(12,12)">
              {/* Tree trunk with texture */}
              <rect x="-0.8" y="3" width="1.6" height="5" fill="#8d6e63" opacity="0.9" rx="0.8">
                <animate attributeName="height" values="4;5;4.5" dur="4s" repeatCount="indefinite"/>
              </rect>
              <rect x="-0.5" y="3.5" width="1" height="4" fill="#a1887f" opacity="0.7" rx="0.5"/>
              
              {/* Dynamic growing branches */}
              <g>
                {/* Left branch */}
                <path d="M-0.5 4 Q-2.5 2 -3 3.5" stroke="#8d6e63" strokeWidth="1.2" fill="none" opacity="0.8">
                  <animate attributeName="opacity" values="0.3;0.8;0.5" dur="3s" repeatCount="indefinite"/>
                </path>
                {/* Right branch */}
                <path d="M0.5 3 Q2.5 1 3 2.5" stroke="#8d6e63" strokeWidth="1.2" fill="none" opacity="0.8">
                  <animate attributeName="opacity" values="0.5;0.8;0.3" dur="3s" begin="1s" repeatCount="indefinite"/>
                </path>
                
                {/* Animated leaves growing */}
                <ellipse cx="-3" cy="3" rx="1.2" ry="0.8" fill={`url(#redLeafGradient${size})`} opacity="0.9" transform="rotate(-30)">
                  <animateTransform attributeName="transform" type="rotate" values="-35;-25;-35" dur="2.5s" repeatCount="indefinite"/>
                  <animate attributeName="rx" values="1;1.4;1.2" dur="3s" repeatCount="indefinite"/>
                </ellipse>
                <ellipse cx="3" cy="2" rx="1" ry="0.7" fill={`url(#redLeafGradient${size})`} opacity="0.9" transform="rotate(25)">
                  <animateTransform attributeName="transform" type="rotate" values="20;30;25" dur="2.8s" begin="0.5s" repeatCount="indefinite"/>
                  <animate attributeName="rx" values="0.8;1.2;1" dur="3.5s" begin="0.5s" repeatCount="indefinite"/>
                </ellipse>
                
                {/* Top crown leaves */}
                <ellipse cx="-1" cy="1" rx="1.5" ry="1" fill={`url(#redLeafGradient${size})`} opacity="0.85" transform="rotate(-15)">
                  <animateTransform attributeName="transform" type="rotate" values="-20;-10;-15" dur="3.2s" repeatCount="indefinite"/>
                </ellipse>
                <ellipse cx="1" cy="0.5" rx="1.3" ry="0.9" fill={`url(#redLeafGradient${size})`} opacity="0.85" transform="rotate(15)">
                  <animateTransform attributeName="transform" type="rotate" values="10;20;15" dur="2.9s" begin="0.3s" repeatCount="indefinite"/>
                </ellipse>
                <ellipse cx="0" cy="-0.5" rx="1.1" ry="0.8" fill={`url(#redLeafGradient${size})`} opacity="0.9">
                  <animate attributeName="ry" values="0.7;1;0.8" dur="3.8s" repeatCount="indefinite"/>
                </ellipse>
              </g>
              
              {/* Magical growth sparkles */}
              <g>
                {[0, 1, 2, 3, 4].map((i) => {
                  const sparklePositions = [
                    {x: -4, y: -1}, {x: 4, y: -2}, {x: -2, y: -3}, {x: 2, y: -4}, {x: 0, y: -5}
                  ];
                  const pos = sparklePositions[i];
                  return (
                    <g key={i} transform={`translate(${pos.x}, ${pos.y})`}>
                      <path d="M0 0 L0.4 1.2 L1.5 1.2 L0.8 2 L1.2 3.2 L0 2.4 L-1.2 3.2 L-0.8 2 L-1.5 1.2 L-0.4 1.2 Z" 
                            fill="white" opacity="0.9" transform="scale(0.3)">
                        <animate attributeName="opacity" values="0.3;1;0.3" dur={`${1.8 + i * 0.4}s`} begin={`${i * 0.6}s`} repeatCount="indefinite"/>
                        <animateTransform attributeName="transform" type="scale" values="0.2;0.4;0.2" dur={`${2 + i * 0.3}s`} begin={`${i * 0.6}s`} repeatCount="indefinite"/>
                      </path>
                    </g>
                  );
                })}
              </g>
              
              {/* Growth energy waves */}
              <circle cx="0" cy="2" r="1" fill="none" stroke="white" strokeWidth="0.5" opacity="0.4">
                <animate attributeName="r" values="1;4;1" dur="4s" repeatCount="indefinite"/>
                <animate attributeName="opacity" values="0.6;0.1;0.6" dur="4s" repeatCount="indefinite"/>
              </circle>
              <circle cx="0" cy="2" r="2" fill="none" stroke="#81c784" strokeWidth="0.3" opacity="0.3">
                <animate attributeName="r" values="2;5;2" dur="5s" begin="1s" repeatCount="indefinite"/>
                <animate attributeName="opacity" values="0.4;0.05;0.4" dur="5s" begin="1s" repeatCount="indefinite"/>
              </circle>
            </g>
          </svg>
        );
      
      case 'yellow':
        // Developing - Dynamic lightning with energy waves
        return (
          <svg {...commonProps}>
            <defs>
              <radialGradient id={`yellowGradient${size}`} cx="0.3" cy="0.2" r="1.1">
                <stop offset="0%" stopColor="#ffd700" />
                <stop offset="20%" stopColor="#f39c12" />
                <stop offset="50%" stopColor="#f1c40f" />
                <stop offset="80%" stopColor="#d68910" />
                <stop offset="100%" stopColor="#b7950b" />
              </radialGradient>
              <radialGradient id={`yellowCenterGlow${size}`} cx="0.5" cy="0.5" r="0.8">
                <stop offset="0%" stopColor="#ffffff" opacity="0.4" />
                <stop offset="60%" stopColor="#ffd700" opacity="0.2" />
                <stop offset="100%" stopColor="#ffffff" opacity="0" />
              </radialGradient>
              <filter id={`yellowGlow${size}`}>
                <feGaussianBlur stdDeviation="1.2" result="coloredBlur"/>
                <feMerge> 
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
              <linearGradient id={`yellowLightning${size}`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="50%" stopColor="#ffd700" />
                <stop offset="100%" stopColor="#f39c12" />
              </linearGradient>
            </defs>
            
            {/* Animated outer ring */}
            <circle cx="12" cy="12" r="11" fill={`url(#yellowGradient${size})`} stroke="#b7950b" strokeWidth="1.5">
              <animate attributeName="r" values="10.8;11.2;10.8" dur="2.5s" repeatCount="indefinite"/>
            </circle>
            <circle cx="12" cy="12" r="11" fill={`url(#yellowCenterGlow${size})`} />
            
            {/* Energy wave circles */}
            <g transform="translate(12,12)">
              <circle cx="0" cy="0" r="3" fill="none" stroke="white" strokeWidth="0.8" opacity="0.6">
                <animate attributeName="r" values="2;7;2" dur="2s" repeatCount="indefinite"/>
                <animate attributeName="opacity" values="0.8;0.1;0.8" dur="2s" repeatCount="indefinite"/>
              </circle>
              <circle cx="0" cy="0" r="5" fill="none" stroke="#ffd700" strokeWidth="0.6" opacity="0.4">
                <animate attributeName="r" values="4;8;4" dur="2.8s" begin="0.7s" repeatCount="indefinite"/>
                <animate attributeName="opacity" values="0.6;0.05;0.6" dur="2.8s" begin="0.7s" repeatCount="indefinite"/>
              </circle>
            </g>
            
            {/* Dynamic energy particles */}
            <g transform="translate(12,12)" filter={`url(#yellowGlow${size})`}>
              {[0, 1, 2, 3, 4, 5].map((i) => {
                const angle = i * 60;
                const radius = 7 + (i % 2) * 1;
                const x = Math.cos(angle * Math.PI / 180) * radius;
                const y = Math.sin(angle * Math.PI / 180) * radius;
                return (
                  <circle key={i} cx={x} cy={y} r={0.8} fill="#ffd700" opacity="0.8">
                    <animate attributeName="opacity" values="0.3;1;0.3" dur={`${1.5 + i * 0.3}s`} begin={`${i * 0.2}s`} repeatCount="indefinite"/>
                    <animateTransform attributeName="transform" type="rotate" values={`0;360`} dur={`${4 + i * 0.5}s`} repeatCount="indefinite"/>
                  </circle>
                );
              })}
            </g>
            
            {/* Enhanced lightning bolt with glow */}
            <g filter={`url(#yellowGlow${size})`}>
              <path d="M10 5 L16 5 L12.5 11 L15 11 L8.5 19 L11 12 L7.5 12 Z" 
                    fill={`url(#yellowLightning${size})`} stroke="#ffd700" strokeWidth="0.8" opacity="0.95">
                <animate attributeName="opacity" values="0.8;1;0.8" dur="1.8s" repeatCount="indefinite"/>
              </path>
              {/* Lightning glow effect */}
              <path d="M10 5 L16 5 L12.5 11 L15 11 L8.5 19 L11 12 L7.5 12 Z" 
                    fill="none" stroke="white" strokeWidth="1.5" opacity="0.6">
                <animate attributeName="opacity" values="0.3;0.8;0.3" dur="1.8s" repeatCount="indefinite"/>
              </path>
            </g>
            
            {/* Electric sparks */}
            <g>
              {[0, 1, 2].map((i) => {
                const sparkPositions = [{x: 8, y: 6}, {x: 15, y: 8}, {x: 11, y: 16}];
                const pos = sparkPositions[i];
                return (
                  <g key={i} transform={`translate(${pos.x}, ${pos.y})`}>
                    <path d="M0 0 L1 2 L2 0 L1 -1 Z M-1 1 L0 -1 L-2 0 L-1 2 Z" 
                          fill="white" opacity="0.8" transform="scale(0.6)">
                      <animate attributeName="opacity" values="0;1;0" dur={`${1.2 + i * 0.4}s`} begin={`${i * 0.5}s`} repeatCount="indefinite"/>
                      <animateTransform attributeName="transform" type="rotate" values="0;180;360" dur={`${2 + i * 0.3}s`} repeatCount="indefinite"/>
                    </path>
                  </g>
                );
              })}
            </g>
          </svg>
        );
      
      case 'blue':
        // Proficient - Dynamic shield with protection aura
        return (
          <svg {...commonProps}>
            <defs>
              <radialGradient id={`blueGradient${size}`} cx="0.3" cy="0.2" r="1.1">
                <stop offset="0%" stopColor="#5dade2" />
                <stop offset="30%" stopColor="#3498db" />
                <stop offset="60%" stopColor="#2980b9" />
                <stop offset="100%" stopColor="#1b4f72" />
              </radialGradient>
              <radialGradient id={`blueShield${size}`} cx="0.5" cy="0.2" r="1">
                <stop offset="0%" stopColor="#ffffff" opacity="0.6" />
                <stop offset="40%" stopColor="#aed6f1" opacity="0.3" />
                <stop offset="100%" stopColor="#ffffff" opacity="0" />
              </radialGradient>
              <linearGradient id={`blueShieldMain${size}`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#ffffff" opacity="0.95" />
                <stop offset="50%" stopColor="#ebf3fd" opacity="0.9" />
                <stop offset="100%" stopColor="#d6eaf8" opacity="0.85" />
              </linearGradient>
              <filter id={`blueGlow${size}`}>
                <feGaussianBlur stdDeviation="1" result="coloredBlur"/>
                <feMerge> 
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>
            
            {/* Animated outer ring */}
            <circle cx="12" cy="12" r="11" fill={`url(#blueGradient${size})`} stroke="#1b4f72" strokeWidth="1.5">
              <animate attributeName="r" values="10.7;11.3;10.7" dur="3s" repeatCount="indefinite"/>
            </circle>
            
            {/* Protection aura rings */}
            <g transform="translate(12,12)">
              <circle cx="0" cy="0" r="4" fill="none" stroke="white" strokeWidth="0.6" opacity="0.5">
                <animate attributeName="r" values="3;8;3" dur="4s" repeatCount="indefinite"/>
                <animate attributeName="opacity" values="0.7;0.1;0.7" dur="4s" repeatCount="indefinite"/>
              </circle>
              <circle cx="0" cy="0" r="6" fill="none" stroke="#aed6f1" strokeWidth="0.4" opacity="0.4">
                <animate attributeName="r" values="5;9;5" dur="5s" begin="1s" repeatCount="indefinite"/>
                <animate attributeName="opacity" values="0.5;0.05;0.5" dur="5s" begin="1s" repeatCount="indefinite"/>
              </circle>
            </g>
            
            {/* Defensive particles orbiting */}
            <g transform="translate(12,12)" filter={`url(#blueGlow${size})`}>
              {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
                const angle = i * 45;
                const radius = 7.5 + (i % 2) * 0.8;
                const x = Math.cos(angle * Math.PI / 180) * radius;
                const y = Math.sin(angle * Math.PI / 180) * radius;
                return (
                  <g key={i}>
                    <animateTransform attributeName="transform" type="rotate" values={`0;360`} dur={`${6 + i * 0.5}s`} repeatCount="indefinite"/>
                    <circle cx={x} cy={y} r={0.6} fill="#aed6f1" opacity="0.8">
                      <animate attributeName="opacity" values="0.4;1;0.4" dur={`${2 + i * 0.2}s`} begin={`${i * 0.3}s`} repeatCount="indefinite"/>
                      <animate attributeName="r" values="0.4;0.8;0.4" dur={`${2.5 + i * 0.3}s`} begin={`${i * 0.2}s`} repeatCount="indefinite"/>
                    </circle>
                  </g>
                );
              })}
            </g>
            
            {/* Enhanced shield shape with subtle animation */}
            <g filter={`url(#blueGlow${size})`}>
              <path d="M12 4 L17 7 L17 13 Q17 16 12 19 Q7 16 7 13 L7 7 Z" 
                    fill={`url(#blueShieldMain${size})`} stroke="#2980b9" strokeWidth="1.2" opacity="0.95">
                <animate attributeName="opacity" values="0.9;1;0.9" dur="3s" repeatCount="indefinite"/>
              </path>
              <path d="M12 4 L17 7 L17 13 Q17 16 12 19 Q7 16 7 13 L7 7 Z" 
                    fill={`url(#blueShield${size})`}/>
              
              {/* Shield highlights */}
              <path d="M12 4 L15.5 6.5 L15.5 8.5" stroke="white" strokeWidth="1" fill="none" opacity="0.7" strokeLinecap="round"/>
              <path d="M12 4 L8.5 6.5 L8.5 8.5" stroke="white" strokeWidth="0.8" fill="none" opacity="0.6" strokeLinecap="round"/>
            </g>
            
            {/* Shield center glow effect */}
            <g>
              <circle cx="12" cy="11.5" r="2.5" fill="white" opacity="0.3">
                <animate attributeName="opacity" values="0.2;0.4;0.2" dur="3s" repeatCount="indefinite"/>
              </circle>
              <circle cx="12" cy="11.5" r="1.8" fill="#aed6f1" opacity="0.5">
                <animate attributeName="opacity" values="0.3;0.6;0.3" dur="2.5s" repeatCount="indefinite"/>
              </circle>
            </g>
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
