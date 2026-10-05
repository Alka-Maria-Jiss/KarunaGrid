/**
 * Utility to sanitize and format user-facing notification messages.
 * Strips internal technical IDs (e.g., "#50", "Home visit #50 for...") so notifications
 * read cleanly and compassionately for healthcare users without clutter.
 */
export function cleanNotificationMessage(message) {
  if (!message || typeof message !== 'string') return '';
  return message
    .replace(/(Home visit|visit request|visit|request|consultation|report|prescription|plan|assignment)\s*#\d+\s*/gi, '$1 ')
    .replace(/#\d+\s*/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}
