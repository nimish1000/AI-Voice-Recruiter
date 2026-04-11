import * as pdfjsLib from 'pdfjs-dist';
import Tesseract from 'tesseract.js';

// Use the bundled worker from the package
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

/**
 * Extract text from PDF file on the client-side
 * Tries fast extraction first, then falls back to OCR
 */
export async function extractTextFromPDF(file: File): Promise<string> {
  try {
    console.log('📄 Starting PDF text extraction...');
    
    // Convert file to ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    
    // Load PDF
    const pdf = await pdfjsLib.getDocument({ data: uint8Array }).promise;
    let extractedText = '';
    
    // Try to extract text from each page
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      
      extractedText += pageText + ' ';
      console.log(`📄 Page ${pageNum}: ${pageText.length} characters`);
    }
    
    // If we got enough text, return it
    if (extractedText.trim().length > 50) {
      console.log(`✅ Text extraction successful: ${extractedText.length} characters`);
      return extractedText.trim();
    }
    
    // If not enough text, use OCR
    console.log('⚠️ Insufficient text extracted, starting OCR...');
    return await extractTextWithOCR(file);
    
  } catch (error) {
    console.error('❌ PDF extraction failed:', error);
    // Fallback to OCR
    return await extractTextWithOCR(file);
  }
}

/**
 * Extract text from PDF using OCR (for image-based PDFs)
 */
async function extractTextWithOCR(file: File): Promise<string> {
  try {
    console.log('🔍 Starting OCR processing (this may take 20-60 seconds)...');
    
    // Load PDF
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    const pdf = await pdfjsLib.getDocument({ data: uint8Array }).promise;
    
    let fullText = '';
    
    // Create Tesseract worker
    const worker = await Tesseract.createWorker('eng');
    
    // Process each page
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      console.log(`📄 OCR processing page ${pageNum} of ${pdf.numPages}...`);
      
      const page = await pdf.getPage(pageNum);
      const viewport = page.getViewport({ scale: 2.0 }); // Higher scale = better OCR
      
      // Create canvas
      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const context = canvas.getContext('2d');
      
      if (!context) {
        console.error('❌ Could not get canvas context');
        continue;
      }
      
      // Render PDF page to canvas
      await page.render({
        canvasContext: context,
        viewport: viewport,
        canvas: canvas
      }).promise;
      
      // Perform OCR on the canvas
      const { data: { text } } = await worker.recognize(canvas);
      fullText += text + ' ';
      
      console.log(`✅ Page ${pageNum} OCR complete: ${text.length} characters`);
    }
    
    // Terminate worker
    await worker.terminate();
    
    console.log(`✅ OCR complete: ${fullText.length} total characters`);
    return fullText.trim();
    
  } catch (error) {
    console.error('❌ OCR failed:', error);
    return '';
  }
}

/**
 * Extract text from TXT file
 */
export async function extractTextFromTXT(file: File): Promise<string> {
  return await file.text();
}
