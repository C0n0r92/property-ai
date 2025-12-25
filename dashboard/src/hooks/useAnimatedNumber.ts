/**
 * Animation hooks for smooth number transitions
 */

import { useState, useEffect, useRef } from 'react';

interface UseAnimatedNumberOptions {
  duration?: number;
  delay?: number;
  easing?: (t: number) => number;
}

export const useAnimatedNumber = (
  targetValue: number,
  options: UseAnimatedNumberOptions = {}
) => {
  const {
    duration = 1000,
    delay = 0,
    easing = (t: number) => t * t * (3 - 2 * t) // Smooth step easing
  } = options;

  const [currentValue, setCurrentValue] = useState(targetValue);
  const [isAnimating, setIsAnimating] = useState(false);
  const animationRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const startValueRef = useRef(0);

  useEffect(() => {
    // Always set the target value, even if it's 0
    if (Math.abs(targetValue) < 0.01) {
      setCurrentValue(targetValue);
      setIsAnimating(false);
      return;
    }

    const startAnimation = () => {
      setIsAnimating(true);
      startTimeRef.current = performance.now();
      startValueRef.current = currentValue;

      const animate = (currentTime: number) => {
        if (!startTimeRef.current) return;

        const elapsed = currentTime - startTimeRef.current;
        const progress = Math.min(elapsed / duration, 1);
        const easedProgress = easing(progress);

        const newValue = startValueRef.current + (targetValue - startValueRef.current) * easedProgress;
        setCurrentValue(newValue);

        if (progress < 1) {
          animationRef.current = requestAnimationFrame(animate);
        } else {
          setCurrentValue(targetValue);
          setIsAnimating(false);
        }
      };

      animationRef.current = requestAnimationFrame(animate);
    };

    // Start animation after delay
    const timeoutId = setTimeout(startAnimation, delay);

    return () => {
      clearTimeout(timeoutId);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [targetValue, duration, delay, easing]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  return { value: currentValue, isAnimating };
};

// Hook for animating percentages
export const useAnimatedPercentage = (
  targetValue: number,
  options: UseAnimatedNumberOptions = {}
) => {
  const { value, isAnimating } = useAnimatedNumber(targetValue, options);
  return {
    value: Math.max(0, Math.min(100, value)), // Clamp between 0-100
    isAnimating
  };
};

// Hook for currency values with formatting
export const useAnimatedCurrency = (
  targetValue: number,
  currency: string = 'EUR',
  options: UseAnimatedNumberOptions = {}
) => {
  const { value, isAnimating } = useAnimatedNumber(targetValue, options);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IE', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(Math.round(amount));
  };

  return {
    value: formatCurrency(value),
    rawValue: value,
    isAnimating
  };
};
