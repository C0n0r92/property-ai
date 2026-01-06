/**
 * Mortgage Calculator Health Check API Route
 * GET /api/mortgage/health
 *
 * Health check endpoint for the mortgage calculator API.
 * Public endpoint - no authentication required.
 */

import { NextResponse } from 'next/server';

/**
 * GET /api/mortgage/health
 *
 * Health check for mortgage calculator API
 */
export async function GET() {
  try {
    // Basic health check - could be extended to test database connectivity, etc.
    const healthData = {
      status: 'healthy',
      service: 'mortgage-calculator-api',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development'
    };

    return NextResponse.json(healthData, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
      }
    });

  } catch (error) {
    console.error('Health check error:', error);

    return NextResponse.json(
      {
        status: 'unhealthy',
        error: 'Service is experiencing issues',
        timestamp: new Date().toISOString()
      },
      { status: 503 }
    );
  }
}





