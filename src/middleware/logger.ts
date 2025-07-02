import { Request, Response, NextFunction } from 'express';

// Enhanced request logging middleware
export const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
  const startTime = Date.now();
  const { method, url, ip } = req;
  const userAgent = req.get('User-Agent') || 'Unknown';

  // Log request start
  console.log(`📨 ${method} ${url} - ${ip} - ${new Date().toISOString()}`);

  // Override res.end to log response
  const originalEnd = res.end;
  res.end = function(chunk?: any, encoding?: any): any {
    const duration = Date.now() - startTime;
    const statusCode = res.statusCode;
    const statusEmoji = getStatusEmoji(statusCode);
    
    console.log(
      `${statusEmoji} ${method} ${url} - ${statusCode} - ${duration}ms - ${ip}`
    );

    // Log detailed info for errors or in development
    if (statusCode >= 400 || process.env.NODE_ENV === 'development') {
      const contentLength = res.get('Content-Length') || '0';
      console.log(`Response: ${contentLength} bytes | User-Agent: ${userAgent.substring(0, 50)}`);
      
      if (statusCode >= 500) {
        console.log(`Server Error: ${method} ${url}`);
      }
    }

    // Call original end method
    return originalEnd.call(this, chunk, encoding);
  };

  next();
};

// Get appropriate emoji for status code
const getStatusEmoji = (statusCode: number): string => {
  if (statusCode >= 200 && statusCode < 300) return '✅';
  if (statusCode >= 300 && statusCode < 400) return '🔄';
  if (statusCode >= 400 && statusCode < 500) return '⚠️';
  if (statusCode >= 500) return '❌';
  return '📝';
};

// Log server startup info
export const logServerInfo = (port: string | number, environment: string = 'development'): void => {
  console.log('\n' + '='.repeat(50));
  console.log('SUPPORT API SERVER STARTED');
  console.log('='.repeat(50));
  console.log(`Port: ${port}`);
  console.log(`Environment: ${environment}`);
  console.log(`Started at: ${new Date().toISOString()}`);
  console.log(`Node.js: ${process.version}`);
  console.log('='.repeat(50) + '\n');
}; 