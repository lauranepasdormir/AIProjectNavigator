/**
 * Enhanced health check middleware for production deployment
 * Now with detailed logging and robust request detection
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
  const healthCheckIndicators = [];

  // Check for explicit health check in query string
  if (req.query.healthCheck === 'true') {
    healthCheckIndicators.push('query parameter healthCheck=true');
    return true;
  }

  // Check for health check user agents
  if (req.headers['user-agent']) {
    const userAgent = req.headers['user-agent'].toLowerCase();
    const healthCheckAgents = [
      'deployment-check',
      'kube-probe',
      'curl',
      'wget',
      'health',
      'monitoring'
    ];
    
    for (const agent of healthCheckAgents) {
      if (userAgent.includes(agent)) {
        healthCheckIndicators.push(`user-agent contains "${agent}"`);
        return true;
      }
    }
  }

  // Check for Accept: application/json header
  if (req.headers.accept === 'application/json') {
    healthCheckIndicators.push('accept header is application/json');
    return true;
  }
  
  // If no Accept header at all, assume it's a health check
  if (!req.headers.accept) {
    healthCheckIndicators.push('no accept header present');
    return true;
  }
  
  // If Accept header doesn't include text/html, likely a health check
  if (req.headers.accept && !req.headers.accept.includes('text/html')) {
    healthCheckIndicators.push('accept header does not include text/html');
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
  const healthPaths = ['/', '/health', '/replit-deploy-health', '/healthz'];
  
  if (healthPaths.includes(req.path)) {
    const isHealth = isHealthCheck(req);
    if (isHealth) {
      // Add detailed debug logging for health checks
      console.log(`Health check detected for ${req.path}`);
      console.log(`- User-Agent: ${req.headers['user-agent'] || 'none'}`);
      console.log(`- Accept: ${req.headers.accept || 'none'}`);
      
      // Set headers explicitly for health check response
      res.setHeader('Content-Type', 'text/plain');
      res.setHeader('Cache-Control', 'no-cache, no-store');
      
      return res.status(200).send('OK');
    }
  }
  
  next();
}
