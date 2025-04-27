/**
 * Health check middleware for production deployment
 * Handles all health check endpoints needed for Replit deployment
 */

import type { Request, Response, NextFunction } from "express";

/**
 * Determine if a request is a health check
 * Health checks are identified by:
 * - Non-browser Accept headers (application/json)
 * - Special User-Agent strings
 * - Query parameters
 */
export function isHealthCheck(req: Request): boolean {
  // Check for explicit health check in query string
  if (req.query.healthCheck === 'true') {
    return true;
  }

  // Check for health check user agents
  if (req.headers['user-agent']) {
    const userAgent = req.headers['user-agent'].toLowerCase();
    if (
      userAgent.includes('deployment-check') ||
      userAgent.includes('kube-probe') ||
      userAgent.includes('curl') ||
      userAgent.includes('wget') ||
      userAgent.includes('health') ||
      userAgent.includes('monitoring')
    ) {
      return true;
    }
  }

  // Check for Accept: application/json header without Accept: text/html
  if (
    req.headers.accept === 'application/json' || 
    (req.headers.accept && 
     req.headers.accept.includes('application/json') && 
     !req.headers.accept.includes('text/html'))
  ) {
    return true;
  }

  // If no Accept header at all, assume it's a health check
  if (!req.headers.accept) {
    return true;
  }

  return false;
}

/**
 * Middleware to handle health check endpoints
 * Responds with "OK" for all health check endpoints
 */
export function healthCheckMiddleware(req: Request, res: Response, next: NextFunction) {
  // Health check paths that should always respond with "OK"
  const healthPaths = ['/', '/health', '/replit-deploy-health'];
  
  if (healthPaths.includes(req.path) && isHealthCheck(req)) {
    console.log(`Health check detected for ${req.path} from ${req.headers['user-agent'] || 'unknown'}`);
    return res.status(200).send('OK');
  }
  
  next();
}