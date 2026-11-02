import html2canvas from "html2canvas-pro";
import { jsPDF } from "jspdf";

/**
 * Exports a DOM element to an authentic, high-quality A4 PDF document.
 * Supports Tailwind CSS v4 oklch colors natively via html2canvas-pro.
 *
 * @param {HTMLElement} element - The DOM element to capture
 * @param {string} filename - The target download filename (e.g., Document.pdf)
 */
export const downloadElementAsPdf = async (element, filename = "document.pdf") => {
  if (!element) {
    throw new Error("Target element to download not found");
  }

  // Generate crisp canvas with 2x scale for sharp print quality
  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    scrollY: 0,
    scrollX: 0,
    backgroundColor: "#ffffff",
    logging: false,
  });

  const imgData = canvas.toDataURL("image/jpeg", 0.98);

  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 8; // 8mm margin
  const printWidth = pageWidth - margin * 2;
  const printHeight = (canvas.height * printWidth) / canvas.width;

  // If the content exceeds single A4 page height, handle pagination cleanly
  if (printHeight <= pageHeight - margin * 2) {
    pdf.addImage(imgData, "JPEG", margin, margin, printWidth, printHeight);
  } else {
    // For single full receipt/certificate documents, scale down to fit single page if only slightly larger
    const maxAllowedHeight = pageHeight - margin * 2;
    const scaleFactor = maxAllowedHeight / printHeight;
    const fittedWidth = printWidth * Math.min(1, scaleFactor);
    const fittedHeight = printHeight * Math.min(1, scaleFactor);
    const horizontalOffset = margin + (printWidth - fittedWidth) / 2;

    pdf.addImage(
      imgData,
      "JPEG",
      horizontalOffset,
      margin,
      fittedWidth,
      fittedHeight
    );
  }

  pdf.save(filename);
};

