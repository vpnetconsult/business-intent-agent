import { readFileSync, existsSync } from 'fs';
import { logger } from './logger';

/**
 * Reads a secret from either a file or environment variable.
 * File-based secrets take precedence over environment variables.
 *
 * @param envVarName - The environment variable name (e.g., 'ANTHROPIC_API_KEY')
 * @param fileEnvVarName - The environment variable pointing to the file path (e.g., 'ANTHROPIC_API_KEY_FILE')
 * @returns The secret value, or undefined if not found
 */
export function readSecret(envVarName: string, fileEnvVarName?: string): string | undefined {
  // First, check if a file path is specified
  const filePath = fileEnvVarName ? process.env[fileEnvVarName] : undefined;

  if (filePath) {
    try {
      if (existsSync(filePath)) {
        const secret = readFileSync(filePath, 'utf-8').trim();
        logger.info({ source: 'file', path: filePath }, `Loaded secret from file: ${envVarName}`);
        return secret;
      } else {
        logger.warn({ path: filePath }, `Secret file not found: ${fileEnvVarName}`);
      }
    } catch (error) {
      logger.error({ err: error, path: filePath }, `Failed to read secret file: ${fileEnvVarName}`);
    }
  }

  // Fall back to environment variable
  const envValue = process.env[envVarName];
  if (envValue) {
    logger.info({ source: 'env' }, `Loaded secret from environment: ${envVarName}`);
    return envValue;
  }

  logger.warn({ envVar: envVarName, fileEnvVar: fileEnvVarName }, 'Secret not found in file or environment');
  return undefined;
}

/**
 * Reads a required secret from either a file or environment variable.
 * Throws an error if the secret is not found.
 *
 * @param envVarName - The environment variable name
 * @param fileEnvVarName - The environment variable pointing to the file path
 * @returns The secret value
 * @throws Error if the secret is not found
 */
export function readRequiredSecret(envVarName: string, fileEnvVarName?: string): string {
  const secret = readSecret(envVarName, fileEnvVarName);

  if (!secret) {
    const fileVarMsg = fileEnvVarName ? ` or ${fileEnvVarName}` : '';
    throw new Error(
      `Required secret not found: ${envVarName}${fileVarMsg}. ` +
      `Please set either the environment variable or file path.`
    );
  }

  return secret;
}
