'use client';

export default function PrintButton() {
  return (
    <button type="button" className="rp-button" onClick={() => window.print()}>
      Save as PDF
    </button>
  );
}
