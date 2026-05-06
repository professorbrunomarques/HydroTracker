import * as pdfjsLib from 'pdfjs-dist';

// Use a known stable worker from unpkg for version 5+ (ESM)
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

export async function extractTextFromPdf(file: File): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = '';

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const strings = content.items.map((item: any) => item.str);
      fullText += strings.join(' ') + '\n';
    }

    return fullText;
  } catch (error: any) {
    console.error("PDF Parsing error:", error);
    if (error.name === 'PasswordException') {
      throw new Error('O PDF está protegido por senha.');
    }
    if (error.name === 'InvalidPDFException') {
      throw new Error('O arquivo selecionado não é um PDF válido ou está corrompido.');
    }
    throw new Error('Falha ao ler o conteúdo do PDF. Tente outro arquivo.');
  }
}

export function calculateConsumption(previous: number, current: number): Array<{ consumption: number; value: number }> {
    const consumption = Math.max(0, current - previous);
    let value = 0;

    if (consumption === 0) {
        value = 0;
    } else if (consumption <= 15) {
        value = consumption * 14.82;
    } else {
        value = consumption * 32.62;
    }

    return [{ consumption, value }];
}
