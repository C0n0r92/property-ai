/**
 * Mortgage Scenarios API Route
 * GET, POST /api/mortgage/scenarios
 *
 * CRUD operations for mortgage calculation scenarios.
 * Requires authentication for all operations.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { calculateMortgage } from '@/lib/mortgage-calculator';
import {
  validateMortgageScenario,
  validateCalculationRequest,
  getValidationErrors,
  formatValidationErrors
} from '@/lib/mortgage/validation';
import { ERROR_MESSAGES } from '@/lib/mortgage/constants';

/**
 * GET /api/mortgage/scenarios
 *
 * Retrieve user's saved mortgage scenarios
 *
 * Query parameters:
 * - limit: number (default: 20, max: 100)
 * - offset: number (default: 0)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const offset = Math.max(parseInt(searchParams.get('offset') || '0'), 0);

    // Fetch scenarios
    const { data: scenarios, error: fetchError, count } = await supabase
      .from('mortgage_scenarios')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (fetchError) {
      console.error('Error fetching scenarios:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch scenarios' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      scenarios: scenarios || [],
      total: count || 0,
      limit,
      offset
    }, { status: 200 });

  } catch (error) {
    console.error('GET scenarios error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/mortgage/scenarios
 *
 * Create a new mortgage scenario
 *
 * Request body: { name: string, inputs: MortgageInputs }
 * Response: MortgageScenario
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Parse request body
    const { name, inputs, results } = await request.json();

    // Validate inputs
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Scenario name is required' },
        { status: 400 }
      );
    }

    if (!inputs) {
      return NextResponse.json(
        { error: 'Scenario inputs are required' },
        { status: 400 }
      );
    }

    if (!results) {
      return NextResponse.json(
        { error: 'Scenario results are required' },
        { status: 400 }
      );
    }

    // Validate mortgage inputs
    const inputValidation = validateCalculationRequest(inputs);
    if (!inputValidation.success) {
      const errors = getValidationErrors(inputValidation);
      return NextResponse.json(
        {
          error: 'Invalid scenario inputs',
          details: errors,
          message: formatValidationErrors(errors)
        },
        { status: 400 }
      );
    }

    // Use the provided results instead of recalculating (more efficient and consistent)

    // Create scenario
    const scenarioData = {
      user_id: user.id,
      name: name.trim(),
      inputs: inputValidation.data,
      results,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data: scenario, error: insertError } = await supabase
      .from('mortgage_scenarios')
      .insert(scenarioData)
      .select()
      .single();

    if (insertError) {
      console.error('Database insertion error:', insertError);
      return NextResponse.json(
        { error: 'Failed to save scenario' },
        { status: 500 }
      );
    }

    return NextResponse.json(scenario, { status: 201 });

  } catch (error) {
    console.error('POST scenario error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

