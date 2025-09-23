import { getCurrentDynamicColors, generateDynamicColorCSS, setDynamicColorTimeOverride, DYNAMIC_COLOR_TIME_OVERRIDE, DYNAMIC_COLOR_CONFIG } from './dynamicColorConfig.js';

/**
 * Manages dynamic color application and time-based updates
 */
class DynamicColorManager {
  constructor() {
    this.updateInterval = null;
    this.isInitialized = false;
    this.timeOverride = null; // Runtime override
  }

  /**
   * Initialize the dynamic color manager
   */
  init() {
    if (this.isInitialized) return;
    
    this.applyCurrentDynamicColor();
    this.startPeriodicUpdate();
    this.isInitialized = true;
  }

  /**
   * Apply the current time-appropriate dynamic color
   */
  applyCurrentDynamicColor() {
    // Use runtime override if set, otherwise use config override, otherwise current time
    const effectiveOverride = this.timeOverride !== null ? this.timeOverride : DYNAMIC_COLOR_TIME_OVERRIDE;
    
    // Temporarily override the getCurrentDynamicColors function
    const originalGetCurrentDynamicColors = getCurrentDynamicColors;
    const getCurrentDynamicColorsWithOverride = () => {
      if (effectiveOverride !== null) {
        const now = new Date();
        const currentHour = effectiveOverride;
        
        // Find the matching time range (copied from dynamicColorConfig.js)
        for (const range of DYNAMIC_COLOR_CONFIG.timeRanges) {
          if (range.startHour <= range.endHour) {
            if (currentHour >= range.startHour && currentHour < range.endHour) {
              return range;
            }
          } else {
            if (currentHour >= range.startHour || currentHour < range.endHour) {
              return range;
            }
          }
        }
        return DYNAMIC_COLOR_CONFIG.default;
      }
      return originalGetCurrentDynamicColors();
    };
    
    const timeRange = getCurrentDynamicColorsWithOverride();
    const background = timeRange.background || timeRange; // Handle both old and new structure
    const backgroundCSS = generateDynamicColorCSS(background);
    
    // Apply to body element
    document.body.style.backgroundImage = backgroundCSS;
    // Use bottom color as fallback
    document.body.style.backgroundColor = background.bottom || '#1a1a2e';
    
    // Set CSS custom property for accent color
    document.documentElement.style.setProperty('--accent-color', timeRange.accentColor || '#C1A2FF');
    document.documentElement.style.setProperty('--background-color-top', background.top || '#1a1a2e');
    
    // Store current background for debugging
    const timeInfo = effectiveOverride !== null ? ` (override: ${effectiveOverride}:00)` : ` (current time)`;
    console.log(`Applied linear gradient background: ${backgroundCSS}${timeInfo}`);
  }

  /**
   * Start periodic updates (check every minute)
   */
  startPeriodicUpdate() {
    this.updateInterval = setInterval(() => {
      // Only update if no runtime override is set
      if (this.timeOverride === null) {
        this.applyCurrentDynamicColor();
      }
    }, 60000); // Update every minute
  }

  /**
   * Stop periodic updates
   */
  stop() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    this.isInitialized = false;
  }

  /**
   * Force update dynamic color (useful for testing)
   */
  forceUpdate() {
    this.applyCurrentDynamicColor();
  }

  /**
   * Get current dynamic color info (for debugging)
   * @returns {Object} Current background configuration and CSS
   */
  getCurrentDynamicColorInfo() {
    return {
      background: getCurrentDynamicColors(),
      css: generateDynamicColorCSS(getCurrentDynamicColors()),
      time: new Date().toLocaleTimeString()
    };
  }

  /**
   * Set runtime time override
   * @param {number|null} hour - Hour to override (0-23) or null for current time
   */
  setTimeOverride(hour) {
    this.timeOverride = hour;
    this.applyCurrentDynamicColor();
    console.log(`Set time override to ${hour}:00`);
  }

  /**
   * Clear runtime time override
   */
  clearTimeOverride() {
    this.timeOverride = null;
    this.applyCurrentDynamicColor();
    console.log('Cleared time override, using current time');
  }

  /**
   * Test function - simulate different times (for development/testing)
   * @param {number} hour - Hour to test (0-23)
   */
  testTime(hour) {
    this.setTimeOverride(hour);
  }
}

// Create singleton instance
export const dynamicColorManager = new DynamicColorManager();

// Expose testing functions globally for easy console access
if (typeof window !== 'undefined') {
  // @ts-ignore
  window.dynamicColorManager = dynamicColorManager;
  // @ts-ignore
  window.testTime = (hour) => {
    dynamicColorManager.setTimeOverride(hour);
  };
  // @ts-ignore
  window.resetTime = () => {
    dynamicColorManager.clearTimeOverride();
  };
  
  console.log('Dynamic color testing commands available:');
  console.log('  testTime(5) - Test dawn (5 AM)');
  console.log('  testTime(9) - Test morning (9 AM)');
  console.log('  testTime(14) - Test afternoon (2 PM)');
  console.log('  testTime(18) - Test evening (6 PM)');
  console.log('  testTime(23) - Test night (11 PM)');
  console.log('  resetTime() - Reset to current time');
  console.log('  dynamicColorManager.getCurrentDynamicColorInfo() - See current background');
}
