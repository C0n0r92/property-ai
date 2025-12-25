/**
 * Animated Progress Bar Component
 *
 * Smooth animated progress bars with dark theme styling.
 */

import React, { useEffect, useState } from 'react';

interface AnimatedProgressBarProps {
  progress: number; // 0-100
  height?: string;
  backgroundColor?: string;
  progressColor?: string;
  duration?: number;
  delay?: number;
  showLabel?: boolean;
  label?: string;
  className?: string;
}

export const AnimatedProgressBar: React.FC<AnimatedProgressBarProps> = ({
  progress,
  height = "h-3",
  backgroundColor = "bg-[var(--border)]",
  progressColor = "bg-gradient-to-r from-blue-500 to-emerald-500",
  duration = 1000,
  delay = 0,
  showLabel = false,
  label,
  className = ""
}) => {
  const [animatedProgress, setAnimatedProgress] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsAnimating(true);
      setAnimatedProgress(Math.max(1, progress)); // Minimum 1% for visibility
    }, delay);

    return () => clearTimeout(timer);
  }, [progress, delay]);

  return (
    <div className={`w-full ${className}`}>
      {showLabel && (
        <div className="flex justify-between text-sm text-[var(--foreground-secondary)] mb-2">
          <span>{label}</span>
          <span>{progress.toFixed(1)}%</span>
        </div>
      )}

      <div className={`relative w-full ${backgroundColor} rounded-full ${height} overflow-hidden`}>
        <div
          className={`${height} ${progressColor} rounded-full transition-all ease-out`}
          style={{
            width: `${animatedProgress}%`,
            transitionDuration: isAnimating ? `${duration}ms` : '0ms',
          }}
        />

        {/* Glow effect during animation */}
        {isAnimating && animatedProgress < progress && (
          <div
            className="absolute top-0 left-0 h-full w-full bg-gradient-to-r from-transparent via-blue-400/20 to-transparent animate-pulse"
            style={{
              animationDuration: `${duration * 1.2}ms`,
              animationIterationCount: 1
            }}
          />
        )}
      </div>
    </div>
  );
};

// Specialized component for equity progress
export const EquityProgressBar: React.FC<{
  equityPercentage: number;
  delay?: number;
}> = ({ equityPercentage, delay = 0 }) => {
  return (
    <AnimatedProgressBar
      progress={equityPercentage}
      progressColor="bg-gradient-to-r from-emerald-500 to-blue-500"
      showLabel={true}
      label="Equity Built"
      delay={delay}
      className="mb-4"
    />
  );
};

// Specialized component for loan progress
export const LoanProgressBar: React.FC<{
  progressPercentage: number;
  delay?: number;
}> = ({ progressPercentage, delay = 0 }) => {
  return (
    <AnimatedProgressBar
      progress={progressPercentage}
      progressColor="bg-gradient-to-r from-blue-500 to-purple-500"
      showLabel={true}
      label="Loan Progress"
      delay={delay}
      className="mb-4"
    />
  );
};

