import React from 'react';

interface DirhamIconProps {
  className?: string;
  size?: number;
}

export const DirhamIcon: React.FC<DirhamIconProps> = ({ className = "w-6 h-6", size = 24 }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={className}
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* New UAE Dirham Symbol Design */}
      <g transform="translate(15, 15)">
        {/* Main vertical line */}
        <line x1="35" y1="10" x2="35" y2="60" stroke="currentColor" strokeWidth="4" strokeLinecap="round"/>
        
        {/* Top horizontal line */}
        <line x1="20" y1="20" x2="50" y2="20" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
        
        {/* Bottom horizontal line */}
        <line x1="20" y1="50" x2="50" y2="50" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
        
        {/* Left vertical connector */}
        <line x1="25" y1="15" x2="25" y2="55" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
        
        {/* Decorative elements */}
        <circle cx="15" cy="35" r="3" fill="currentColor"/>
        <circle cx="55" cy="35" r="3" fill="currentColor"/>
      </g>
    </svg>
  );
};
