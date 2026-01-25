/**
 * Client-side PDF generation utility
 *
 * Uses html2pdf.js to convert HTML elements to PDF files.
 * This runs entirely in the browser, no server-side processing required.
 */

interface PdfOptions {
  /** Filename for the downloaded PDF (without .pdf extension) */
  filename?: string;
  /** Page margin in mm */
  margin?: number;
  /** Image quality (0-1) for JPEG compression */
  imageQuality?: number;
  /** Scale factor for html2canvas */
  scale?: number;
  /** Page format */
  format?: "a4" | "letter" | "legal";
  /** Page orientation */
  orientation?: "portrait" | "landscape";
}

interface Html2PdfInternalOptions {
  margin: number;
  filename: string;
  image: { type: string; quality: number };
  html2canvas: { scale: number; useCORS: boolean; letterRendering: boolean };
  jsPDF: { unit: string; format: string; orientation: string };
}

/**
 * Generate a PDF from an HTML element
 *
 * @param element - The HTML element to convert to PDF
 * @param options - PDF generation options
 * @returns Promise that resolves when PDF is downloaded
 *
 * @example
 * ```typescript
 * const previewElement = document.getElementById('report-preview');
 * await generatePdf(previewElement, {
 *   filename: 'spending-report-2024',
 *   format: 'a4',
 *   orientation: 'portrait'
 * });
 * ```
 */
export async function generatePdf(
  element: HTMLElement,
  options: PdfOptions = {}
): Promise<void> {
  const {
    filename = "report",
    margin = 10,
    imageQuality = 0.98,
    scale = 2,
    format = "a4",
    orientation = "portrait",
  } = options;

  // Dynamically import html2pdf.js to avoid SSR issues
  const html2pdf = (await import("html2pdf.js")).default;

  const pdfOptions: Html2PdfInternalOptions = {
    margin,
    filename: `${filename}.pdf`,
    image: { type: "jpeg", quality: imageQuality },
    html2canvas: {
      scale,
      useCORS: true,
      letterRendering: true,
    },
    jsPDF: {
      unit: "mm",
      format,
      orientation,
    },
  };

  await html2pdf().set(pdfOptions as any).from(element).save();
}

/**
 * Generate PDF as a Blob (for preview or programmatic use)
 *
 * @param element - The HTML element to convert to PDF
 * @param options - PDF generation options
 * @returns Promise resolving to a Blob containing the PDF
 */
export async function generatePdfBlob(
  element: HTMLElement,
  options: PdfOptions = {}
): Promise<Blob> {
  const {
    margin = 10,
    imageQuality = 0.98,
    scale = 2,
    format = "a4",
    orientation = "portrait",
  } = options;

  const html2pdf = (await import("html2pdf.js")).default;

  const pdfOptions: Html2PdfInternalOptions = {
    margin,
    filename: "temp.pdf",
    image: { type: "jpeg", quality: imageQuality },
    html2canvas: {
      scale,
      useCORS: true,
      letterRendering: true,
    },
    jsPDF: {
      unit: "mm",
      format,
      orientation,
    },
  };

  return html2pdf().set(pdfOptions as any).from(element).outputPdf("blob");
}

/**
 * Generate HTML string for download
 *
 * @param element - The HTML element to export
 * @param title - Document title
 * @returns Complete HTML document as string
 */
export function generateHtmlExport(element: HTMLElement, title: string): string {
  const styles = `
    <style>
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
        max-width: 800px;
        margin: 0 auto;
        padding: 40px 20px;
        background: #fff;
        color: #1a1a1a;
        line-height: 1.6;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        margin: 20px 0;
      }
      th, td {
        padding: 12px;
        text-align: left;
        border-bottom: 1px solid #e5e5e5;
      }
      th {
        background: #f5f5f5;
        font-weight: 600;
      }
      .text-right { text-align: right; }
      .text-green { color: #16a34a; }
      .text-red { color: #dc2626; }
      .summary-card {
        background: #f9fafb;
        border: 1px solid #e5e5e5;
        border-radius: 8px;
        padding: 20px;
        margin: 20px 0;
      }
      h1 { font-size: 24px; margin-bottom: 8px; }
      h2 { font-size: 18px; margin-top: 32px; margin-bottom: 16px; }
      .subtitle { color: #666; font-size: 14px; margin-bottom: 24px; }
      @media print {
        body { padding: 0; }
      }
    </style>
  `;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  ${styles}
</head>
<body>
  ${element.innerHTML}
</body>
</html>`;
}

/**
 * Download HTML as a file
 *
 * @param element - The HTML element to export
 * @param filename - Filename (without .html extension)
 * @param title - Document title
 */
export function downloadHtml(
  element: HTMLElement,
  filename: string,
  title: string
): void {
  const html = generateHtmlExport(element, title);
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = `${filename}.html`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Download content as Markdown
 *
 * @param content - Markdown content string
 * @param filename - Filename (without .md extension)
 */
export function downloadMarkdown(content: string, filename: string): void {
  const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = `${filename}.md`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
