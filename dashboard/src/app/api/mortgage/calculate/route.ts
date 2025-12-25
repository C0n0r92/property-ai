/**
 * Mortgage Calculation API Route
 * POST /api/mortgage/calculate
 *
 * Calculates mortgage payments, amortization schedule, and financial metrics.
 * Public endpoint - no authentication required.
 */

import { NextRequest, NextResponse } from 'next/server';
import { calculateMortgage } from '@/lib/mortgage-calculator';
import {
  validateCalculationRequest,
  getValidationErrors,
  formatValidationErrors
} from '@/lib/mortgage/validation';
import { ERROR_MESSAGES } from '@/lib/mortgage/constants';

/**
 * POST /api/mortgage/calculate
 *
 * Calculate mortgage payments and amortization schedule
 *
 * Request body: MortgageInputs
 * Response: MortgageCalculationResponse
 */
export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();

    // Validate input
    const validation = validateCalculationRequest(body);
    if (!validation.success) {
      const errors = getValidationErrors(validation);
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: errors,
          message: formatValidationErrors(errors)
        },
        { status: 400 }
      );
    }

    const inputs = validation.data;

    // Perform calculation
    const result = calculateMortgage(inputs);

    // Return successful response
    return NextResponse.json(result, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'private, max-age=300' // Cache for 5 minutes
      }
    });

  } catch (error) {
    console.error('Mortgage calculation error:', error);

    // Handle specific error types
    if (error instanceof Error) {
      return NextResponse.json(
        {
          error: 'Calculation failed',
          message: error.message,
          type: 'CALCULATION_ERROR'
        },
        { status: 400 }
      );
    }

    // Generic error response
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: ERROR_MESSAGES.calculationFailed,
        type: 'SERVER_ERROR'
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/mortgage/calculate
 *
 * Health check for calculation endpoint
 */
export async function GET() {
  return NextResponse.json(
    {
      status: 'healthy',
      message: 'Mortgage calculation API is operational',
      timestamp: new Date().toISOString()
    },
    { status: 200 }
  );
}

