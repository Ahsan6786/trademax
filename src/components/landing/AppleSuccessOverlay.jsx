import React, { useEffect } from 'react';

/**
 * AppleSuccessOverlay
 * Previously displayed a welcome popup with "Seats are limited" alert.
 * This popup has been removed as requested.
 */
export const AppleSuccessOverlay = ({ onContinue }) => {
  useEffect(() => {
    if (onContinue) {
      onContinue();
    }
  }, [onContinue]);

  return null;
};
