import React from 'react';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const Logo: React.FC<LogoProps> = ({ className = '', size = 'md' }) => {
  const sizes = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-20 h-20',
    xl: 'w-32 h-32'
  };

  return (
    <div className={`relative ${sizes[size]} ${className} group`}>
      <svg 
        viewBox="0 0 100 100" 
        className="w-full h-full overflow-visible"
        style={{ filter: 'drop-shadow(0 0 8px rgba(14, 165, 233, 0.5))' }}
      >
        <defs>
          <linearGradient id="halo-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="100%" stopColor="#6366f1" />
          </linearGradient>
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        
        {/* Chat Bubble Shape */}
        <path 
          d="M50 10 C25.147 10 5 27.909 5 50 C5 60.5 9.0 70.1 15.5 77.5 L10 90 L25 85 C31.5 88.5 39 90 50 90 C74.853 90 95 72.091 95 50 C95 27.909 74.853 10 50 10 Z" 
          fill="none" 
          stroke="url(#halo-gradient)" 
          strokeWidth="6" 
          strokeLinecap="round" 
          strokeLinejoin="round"
          className="animate-pulse-slow"
        />
        
        {/* Inner Glow Ring */}
        <path 
          d="M50 16 C29 16 12 31 12 50 C12 58 15 65 20 70 L20 75 L28 72 C33 76 41 78 50 78 C71 78 88 63 88 50 C88 31 71 16 50 16 Z" 
          fill="none" 
          stroke="#7dd3fc" 
          strokeWidth="1" 
          opacity="0.5"
        />

        {/* Text */}
        <text 
          x="50" 
          y="56" 
          textAnchor="middle" 
          dominantBaseline="middle" 
          fill="white" 
          fontSize="24" 
          fontWeight="bold" 
          className="font-sans tracking-wider"
          style={{ textShadow: '0 0 10px rgba(56, 189, 248, 0.8)' }}
        >
          Halo
        </text>
      </svg>
    </div>
  );
};