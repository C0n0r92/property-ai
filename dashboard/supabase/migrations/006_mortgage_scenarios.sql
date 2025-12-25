-- Migration: Mortgage Calculator Scenarios
-- Description: Create table for storing user mortgage calculation scenarios
-- Date: 2025-12-25

-- Create mortgage_scenarios table
CREATE TABLE IF NOT EXISTS mortgage_scenarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  inputs JSONB NOT NULL,
  results JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_name_length CHECK (char_length(name) > 0 AND char_length(name) <= 100),
  CONSTRAINT valid_inputs CHECK (
    inputs ? 'loanAmount' AND 
    inputs ? 'interestRate' AND 
    inputs ? 'loanTerm' AND
    inputs ? 'homeValue' AND
    inputs ? 'downPayment'
  ),
  CONSTRAINT valid_results CHECK (
    results ? 'monthlyPayment' AND
    results ? 'totalInterest' AND
    results ? 'payoffMonths'
  )
);

-- Create indexes for performance
CREATE INDEX idx_mortgage_scenarios_user_id ON mortgage_scenarios(user_id);
CREATE INDEX idx_mortgage_scenarios_created_at ON mortgage_scenarios(created_at DESC);
CREATE INDEX idx_mortgage_scenarios_updated_at ON mortgage_scenarios(updated_at DESC);

-- Create trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_mortgage_scenarios_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_mortgage_scenarios_updated_at
  BEFORE UPDATE ON mortgage_scenarios
  FOR EACH ROW
  EXECUTE FUNCTION update_mortgage_scenarios_updated_at();

-- Enable Row Level Security
ALTER TABLE mortgage_scenarios ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Policy: Users can view their own scenarios
CREATE POLICY "Users can view own mortgage scenarios"
  ON mortgage_scenarios
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own scenarios
CREATE POLICY "Users can insert own mortgage scenarios"
  ON mortgage_scenarios
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own scenarios
CREATE POLICY "Users can update own mortgage scenarios"
  ON mortgage_scenarios
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own scenarios
CREATE POLICY "Users can delete own mortgage scenarios"
  ON mortgage_scenarios
  FOR DELETE
  USING (auth.uid() = user_id);

-- Add comment to table
COMMENT ON TABLE mortgage_scenarios IS 'Stores user-created mortgage calculation scenarios for comparison and future reference';
COMMENT ON COLUMN mortgage_scenarios.inputs IS 'JSONB containing all mortgage input parameters (loanAmount, interestRate, loanTerm, etc.)';
COMMENT ON COLUMN mortgage_scenarios.results IS 'JSONB containing calculated results (monthlyPayment, totalInterest, payoffMonths, etc.)';

