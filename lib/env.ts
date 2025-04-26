/**
 * Safely retrieves an API key from environment variables
 * @param key - The environment variable name
 * @param defaultValue - Default value if the key doesn't exist
 * @returns The API key value or default value
 */
export function getApiKey(key: string, defaultValue: string): string {
  if (typeof process === 'undefined' || !process.env) {
    return defaultValue;
  }
  
  const value = process.env[key] || defaultValue;
  return value.trim();
} 