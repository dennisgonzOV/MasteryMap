import { ObjectStorageService } from "../integrations/s3_storage";

const objectStorageService = new ObjectStorageService();

const MAX_PDF_TEXT_LENGTH = 15000;

export async function extractTextFromPdfUrl(pdfObjectPath: string): Promise<string> {
  try {
    const { PDFParse } = await import('pdf-parse') as any;
    const buffer = await objectStorageService.downloadObjectToBuffer(pdfObjectPath);
    const parser = new PDFParse({ data: buffer });
    const pdfData = await parser.getText();
    let text = pdfData.text || '';
    if (text.length > MAX_PDF_TEXT_LENGTH) {
      text = text.substring(0, MAX_PDF_TEXT_LENGTH) + '\n\n[PDF content truncated due to length]';
    }
    return text;
  } catch (error) {
    console.error('Error extracting text from PDF:', error);
    throw new Error('Failed to extract text from PDF');
  }
}
