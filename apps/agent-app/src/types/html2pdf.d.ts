declare module 'html2pdf.js' {
  interface Html2PdfOptions {
    margin?: number | number[];
    filename?: string;
    image?: { type: string; quality: number };
    html2canvas?: { scale: number; useCORS: boolean; allowTaint: boolean };
    jsPDF?: { orientation: string; unit: string; format: string };
  }

  interface Html2Pdf {
    set(options: Html2PdfOptions): Html2Pdf;
    from(element: HTMLElement | string): Html2Pdf;
    save(): Promise<void>;
  }

  function html2pdf(): Html2Pdf;

  export default html2pdf;
}
