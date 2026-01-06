/**
 * Individual Mortgage Scenario API Route
 * PUT, DELETE /api/mortgage/scenarios/[id]
 *
 * Update or delete a specific mortgage scenario.
 * Requires authentication and ownership.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { calculateMortgage } from '@/lib/mortgage-calculator';
import {
  validateCalculationRequest,
  getValidationErrors,
  formatValidationErrors
} from '@/lib/mortgage/validation';
import { ERROR_MESSAGES } from '@/lib/mortgage/constants';

/**
 * PUT /api/mortgage/scenarios/[id]
 *
 * Update an existing mortgage scenario
 *
 * Request body: { name?: string, inputs?: MortgageInputs }
 * Response: MortgageScenario
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id } = await params;

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Verify scenario exists and belongs to user
    const { data: existingScenario, error: fetchError } = await supabase
      .from('mortgage_scenarios')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !existingScenario) {
      return NextResponse.json(
        { error: 'Scenario not found' },
        { status: 404 }
      );
    }

    // Parse request body
    const updates = await request.json();

    // Validate updates
    const updateData: any = {};

    if (updates.name !== undefined) {
      if (typeof updates.name !== 'string' || updates.name.trim().length === 0) {
        return NextResponse.json(
          { error: 'Invalid scenario name' },
          { status: 400 }
        );
      }
      updateData.name = updates.name.trim();
    }

    if (updates.inputs !== undefined) {
      const inputValidation = validateCalculationRequest(updates.inputs);
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

      // Recalculate results if inputs changed
      updateData.inputs = inputValidation.data;
      updateData.results = calculateMortgage(inputValidation.data);
    }

    // Update timestamp
    updateData.updated_at = new Date().toISOString();

    // Update scenario
    const { data: updatedScenario, error: updateError } = await supabase
      .from('mortgage_scenarios')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating scenario:', updateError);
      return NextResponse.json(
        { error: 'Failed to update scenario' },
        { status: 500 }
      );
    }

    return NextResponse.json(updatedScenario, { status: 200 });

  } catch (error) {
    console.error('PUT scenario error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/mortgage/scenarios/[id]
 *
 * Delete a mortgage scenario
 *
 * Response: { success: boolean }
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id } = await params;

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Delete scenario (RLS will prevent unauthorized access)
    const { error: deleteError } = await supabase
      .from('mortgage_scenarios')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (deleteError) {
      console.error('Error deleting scenario:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete scenario' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: true, message: 'Scenario deleted successfully' },
      { status: 200 }
    );

  } catch (error) {
    console.error('DELETE scenario error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}





