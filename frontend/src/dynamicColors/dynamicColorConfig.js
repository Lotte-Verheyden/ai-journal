// Time-based dynamic color configuration
// Easily modify these settings to change the background throughout the day

// OVERRIDE FOR TESTING - Set to null to use current time, or set to hour (0-23) to test specific time
export const DYNAMIC_COLOR_TIME_OVERRIDE = null; // Change this to test: null, 5, 9, 14, 18, 23, etc.

export const DYNAMIC_COLOR_CONFIG = {
  // Time ranges are in 24-hour format (0-23)
  timeRanges: [
    {
      name: 'day',
      startHour: 7,
      endHour: 17,
      background: {
        top: '#2F96E4',
        middle: '#89C5EF',
        bottom: '#B9EBFF'
      },
      accentColor: '#B9EBFF'
    },
    {
      name: 'sunset',
      startHour: 17,
      endHour: 20,
      background: {
        top: '#B886D9',
        middle: '#E191A9',
        bottom: '#FFE8B9'
      },
      accentColor: '#FFE8B9'
    },
    {
      name: 'night',
      startHour: 20,
      endHour: 7,
      background: {
        top: '#3A1953',
        middle: '#633B80',
        bottom: '#A35A3B'
      },
      accentColor: '#C1A2FF'
    }
  ],
  
  // Default background (fallback)
  default: {
    top: '#3A1953',
    middle: '#633B80',
    bottom: '#A35A3B',
    accentColor: '#C1A2FF'
  }
};

/**
 * Get current time-based dynamic color configuration
 * @returns {Object} The current time range configuration with background and accent colors
 */
export function getCurrentDynamicColors() {
  const now = new Date();
  // Use override if set, otherwise use current time
  const currentHour = DYNAMIC_COLOR_TIME_OVERRIDE !== null ? DYNAMIC_COLOR_TIME_OVERRIDE : now.getHours();
  
  // Find the matching time range
  for (const range of DYNAMIC_COLOR_CONFIG.timeRanges) {
    if (range.startHour <= range.endHour) {
      // Normal range (doesn't wrap around midnight)
      if (currentHour >= range.startHour && currentHour < range.endHour) {
        return range;
      }
    } else {
      // Wrapping range (e.g., 20-5, which means 20:00 to 05:00)
      if (currentHour >= range.startHour || currentHour < range.endHour) {
        return range;
      }
    }
  }
  
  // Return default if no range matches
  return DYNAMIC_COLOR_CONFIG.default;
}

/**
 * Generate CSS background string from dynamic color configuration
 * @param {Object} background - Background configuration object with top, middle, bottom colors
 * @returns {string} CSS linear gradient string
 */
export function generateDynamicColorCSS(background) {
  return `linear-gradient(to bottom, ${background.top} 0%, ${background.middle} 65%, ${background.bottom} 100%)`;
}

/**
 * Set time override for testing dynamic colors (for easy testing)
 * @param {number|null} hour - Hour to override (0-23) or null for current time
 */
export function setDynamicColorTimeOverride(hour) {
  if (hour === null || (hour >= 0 && hour <= 23)) {
    // Note: This won't work in a real app since modules are immutable
    // But it's useful for development - just change DYNAMIC_COLOR_TIME_OVERRIDE directly
    console.log(`To test time ${hour}:00, change DYNAMIC_COLOR_TIME_OVERRIDE to ${hour} in dynamicColorConfig.js`);
    console.log('Available test times:');
    console.log('  5-7: Dawn (pink)');
    console.log('  8-11: Morning (blue-pink)');
    console.log('  12-16: Afternoon (orange)');
    console.log('  17-19: Evening (pink-peach)');
    console.log('  20-4: Night (purple)');
    console.log('  null: Use current time');
  } else {
    console.error('Invalid hour. Use 0-23 or null for current time.');
  }
}
