/**
 * Mortgage Calculator Service
 * 
 * Port of Python MortgageCalculatorService to TypeScript.
 * Maintains exact calculation parity with the original implementation.
 * 
 * @module mortgage-calculator
 */

import type {
  MortgageInputs,
  MortgageCalculationResponse,
  AmortizationEntry,
  ScenarioComparison
} from '@/types/mortgage';

/**
 * Main mortgage calculator service class
 * Handles all mortgage-related calculations including amortization schedules,
 * PMI calculations, and scenario comparisons.
 */
export class MortgageCalculatorService {
  private inputs: MortgageInputs;
  private _amortizationData: {
    amortization: AmortizationEntry[];
    totalInterest: number;
    totalPMI: number;
    payoffMonths: number;
    pmiMonths: number;
  } | null = null;
  private _basePayment: number | null = null;
  private _currentBalance: number | null = null;
  private _standardLoan: number | null = null;

  constructor(inputs: MortgageInputs) {
    this.inputs = inputs;
  }

  /**
   * Main calculation method that returns all mortgage calculation results
   */
  calculate(): MortgageCalculationResponse {
    return {
      monthlyPayment: this.monthlyPayment,
      principal: this.actualLoanAmount,
      totalPayment: this.actualLoanAmount + this.totalInterest,
      totalInterest: this.totalInterest,
      payoffMonths: this.payoffMonths,
      savings: this.savings,
      pmiMonths: this.pmiMonths,
      pmiAmount: this.totalPMI,
      amortization: this.amortization,
      monthsSincePurchase: this.monthsSincePurchase,
      currentBalance: this.currentBalance
    };
  }

  /**
   * Calculate comparison scenarios with different extra payment amounts
   */
  calculateScenarioComparison(extraPaymentAmounts: number[] = [50, 100, 200, 500]): ScenarioComparison[] {
    const scenarios: ScenarioComparison[] = [];
    
    for (const extraAmount of extraPaymentAmounts) {
      // Calculate scenario with extra payment
      const scenarioInputs = { ...this.inputs, extraPayment: extraAmount };
      const scenarioCalculator = new MortgageCalculatorService(scenarioInputs);
      const scenarioResult = scenarioCalculator.calculate();

      // Calculate base scenario without extra payment
      const baseInputs = { ...this.inputs, extraPayment: 0 };
      const baseCalculator = new MortgageCalculatorService(baseInputs);
      const baseResult = baseCalculator.calculate();

      scenarios.push({
        extraPayment: extraAmount,
        monthsSaved: baseResult.payoffMonths - scenarioResult.payoffMonths,
        interestSaved: baseResult.totalInterest - scenarioResult.totalInterest,
        newPayoffTime: scenarioResult.payoffMonths
      });
    }

    return scenarios;
  }

  // Getters for calculated properties

  get actualLoanAmount(): number {
    return this.inputs.loanAmount;
  }

  get monthlyRate(): number {
    return this.inputs.interestRate / 100 / 12;
  }

  get paymentsPerYear(): number {
    return this.inputs.paymentFrequency === 'biweekly' ? 26 : 12;
  }

  get paymentRate(): number {
    return this.inputs.interestRate / 100 / this.paymentsPerYear;
  }

  get numberOfPayments(): number {
    return this.inputs.loanTerm * this.paymentsPerYear;
  }

  get monthsSincePurchase(): number {
    if (!this.inputs.purchaseDate) {
      return 0;
    }

    const purchaseDate = new Date(this.inputs.purchaseDate);
    const today = new Date();
    
    const months = (today.getFullYear() - purchaseDate.getFullYear()) * 12 + 
                   (today.getMonth() - purchaseDate.getMonth());
    
    return Math.max(0, months);
  }

  get needPMI(): boolean {
    return this.loanToValue > 0.8;
  }

  get loanToValue(): number {
    const homeValue = this.inputs.homeValue;
    return homeValue > 0 ? this.actualLoanAmount / homeValue : 0;
  }

  get pmiRate(): number {
    return this.needPMI ? (this.inputs.pmiRate || 0.5) / 100 : 0;
  }

  get monthlyPMI(): number {
    return this.needPMI ? (this.actualLoanAmount * this.pmiRate) / 12 : 0;
  }

  get basePayment(): number {
    if (this._basePayment === null) {
      if (this.inputs.paymentFrequency === 'biweekly') {
        // Calculate monthly payment first, then divide by 2
        const monthlyPaymentCalc = 
          this.actualLoanAmount * 
          (this.monthlyRate * Math.pow(1 + this.monthlyRate, this.inputs.loanTerm * 12)) / 
          (Math.pow(1 + this.monthlyRate, this.inputs.loanTerm * 12) - 1);
        
        this._basePayment = monthlyPaymentCalc / 2;
      } else {
        this._basePayment = 
          this.actualLoanAmount * 
          (this.monthlyRate * Math.pow(1 + this.monthlyRate, this.numberOfPayments)) / 
          (Math.pow(1 + this.monthlyRate, this.numberOfPayments) - 1);
      }
    }
    return this._basePayment;
  }

  get currentBalance(): number {
    if (this._currentBalance === null) {
      this._currentBalance = this._calculateCurrentBalance();
    }
    return this._currentBalance;
  }

  private _calculateCurrentBalance(): number {
    if (this.monthsSincePurchase <= 0) {
      return this.actualLoanAmount;
    }

    let tempBalance = this.actualLoanAmount;
    const periodsElapsed = this.inputs.paymentFrequency === 'biweekly'
      ? Math.floor(this.monthsSincePurchase * 26 / 12)
      : this.monthsSincePurchase;

    for (let i = 0; i < periodsElapsed; i++) {
      if (tempBalance <= 0.01) {
        break;
      }
      
      const interestPayment = tempBalance * this.paymentRate;
      let principalPayment = this.basePayment - interestPayment;
      principalPayment = Math.min(principalPayment, tempBalance);
      tempBalance -= principalPayment;
    }

    return Math.max(0, tempBalance);
  }

  get oneTimePaymentPeriod(): number {
    if (!this.inputs.oneTimePaymentDate || !this.inputs.oneTimePayment) {
      return -1;
    }

    const oneTimeDate = new Date(this.inputs.oneTimePaymentDate);
    const purchaseDate = new Date(this.inputs.purchaseDate);

    const daysDiff = (oneTimeDate.getTime() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24);
    const periodLength = this.inputs.paymentFrequency === 'biweekly' ? 14 : 30.44;
    
    return Math.floor(daysDiff / periodLength);
  }

  private _calculateAmortizationAndTotals(): {
    amortization: AmortizationEntry[];
    totalInterest: number;
    totalPMI: number;
    payoffMonths: number;
    pmiMonths: number;
  } {
    if (this._amortizationData !== null) {
      return this._amortizationData;
    }

    let balance = this.actualLoanAmount;
    let period = 0;
    let totalInterest = 0;
    let totalPMI = 0;
    let pmiMonths = 0;
    const amortization: AmortizationEntry[] = [];
    let cumulativeInterest = 0;
    let cumulativePrincipal = 0;

    while (balance > 0.01 && period < this.numberOfPayments + 120) {
      period++;
      const interestPayment = balance * this.paymentRate;
      let principalPayment = this.basePayment - interestPayment;

      // Add extra payment logic
      const periodsElapsed = this.inputs.paymentFrequency === 'biweekly'
        ? Math.floor(this.monthsSincePurchase * 26 / 12)
        : this.monthsSincePurchase;

      if (this.inputs.extraPaymentStartsNow && period > periodsElapsed && this.monthsSincePurchase > 0) {
        const extraPerPeriod = this.inputs.paymentFrequency === 'biweekly'
          ? this.inputs.extraPayment / 2
          : this.inputs.extraPayment;
        principalPayment += extraPerPeriod;
      } else if (!this.inputs.extraPaymentStartsNow) {
        const extraPerPeriod = this.inputs.paymentFrequency === 'biweekly'
          ? this.inputs.extraPayment / 2
          : this.inputs.extraPayment;
        principalPayment += extraPerPeriod;
      }

      // Add one-time payment
      if (period === this.oneTimePaymentPeriod && this.inputs.oneTimePayment > 0) {
        principalPayment += this.inputs.oneTimePayment;
      }

      principalPayment = Math.min(principalPayment, balance);

      // Calculate PMI
      const currentLTV = balance / this.inputs.homeValue;
      const currentPMI = currentLTV > 0.8 ? this.monthlyPMI : 0;
      if (currentPMI > 0) {
        pmiMonths++;
      }

      balance -= principalPayment;
      totalInterest += interestPayment;
      totalPMI += currentPMI;
      cumulativeInterest += interestPayment;
      cumulativePrincipal += principalPayment;

      // Convert period to month for display
      const displayMonth = this.inputs.paymentFrequency === 'biweekly'
        ? Math.ceil(period * 12 / 26.0)
        : period;

      amortization.push({
        month: displayMonth,
        payment: interestPayment + principalPayment,
        principal: principalPayment,
        interest: interestPayment,
        balance: Math.max(0, balance),
        pmi: currentPMI,
        cumulativeInterest: cumulativeInterest,
        cumulativePrincipal: cumulativePrincipal
      });
    }

    this._amortizationData = {
      amortization,
      totalInterest,
      totalPMI,
      payoffMonths: this.inputs.paymentFrequency === 'biweekly'
        ? Math.ceil(period * 12 / 26.0)
        : period,
      pmiMonths: Math.ceil(
        pmiMonths * (this.inputs.paymentFrequency === 'biweekly' ? 12 / 26.0 : 1)
      )
    };

    return this._amortizationData;
  }

  private _calculateStandardLoanForComparison(): number {
    if (this._standardLoan !== null) {
      return this._standardLoan;
    }

    let standardBalance = this.actualLoanAmount;
    let standardTotalInterest = 0;
    let standardPeriod = 0;

    while (standardBalance > 0.01 && standardPeriod < this.numberOfPayments) {
      standardPeriod++;
      const standardInterestPayment = standardBalance * this.paymentRate;
      let standardPrincipalPayment = this.basePayment - standardInterestPayment;
      standardPrincipalPayment = Math.min(standardPrincipalPayment, standardBalance);

      standardBalance -= standardPrincipalPayment;
      standardTotalInterest += standardInterestPayment;
    }

    this._standardLoan = standardTotalInterest;
    return this._standardLoan;
  }

  get amortization(): AmortizationEntry[] {
    return this._calculateAmortizationAndTotals().amortization;
  }

  get totalInterest(): number {
    return this._calculateAmortizationAndTotals().totalInterest;
  }

  get totalPMI(): number {
    return this._calculateAmortizationAndTotals().totalPMI;
  }

  get payoffMonths(): number {
    return this._calculateAmortizationAndTotals().payoffMonths;
  }

  get pmiMonths(): number {
    return this._calculateAmortizationAndTotals().pmiMonths;
  }

  get savings(): number {
    return this._calculateStandardLoanForComparison() - this.totalInterest;
  }

  get monthlyPayment(): number {
    return this.inputs.paymentFrequency === 'biweekly'
      ? this.basePayment * 26 / 12
      : this.basePayment;
  }
}

/**
 * Convenience function to calculate mortgage without instantiating the class
 */
export function calculateMortgage(inputs: MortgageInputs): MortgageCalculationResponse {
  const calculator = new MortgageCalculatorService(inputs);
  return calculator.calculate();
}

/**
 * Convenience function for scenario comparison
 */
export function compareScenarios(inputs: MortgageInputs, extraPaymentAmounts?: number[]): ScenarioComparison[] {
  const calculator = new MortgageCalculatorService(inputs);
  return calculator.calculateScenarioComparison(extraPaymentAmounts);
}

