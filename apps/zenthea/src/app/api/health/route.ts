/**
 * Health Check Endpoint
 * 
 * Used by ALB and ECS health checks to verify application is running.
 * Returns 200 OK if the application is healthy.
 */

import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  try {
    // Basic health check - can be extended to check database connectivity, etc.
    return NextResponse.json(
      {
        status: 'ok',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'unknown',
      },
      { status: 200 }
    )
  } catch (error) {
    // If health check fails, return 503 Service Unavailable
    return NextResponse.json(
      {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    )
  }
}
