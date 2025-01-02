'use client'
import multer from 'multer';
import { NextResponse } from 'next/server';
import * as pdfjsLib from 'pdfjs-dist';

const upload = multer({ dest: './public/uploads' });

export async function POST(req) {
  return new Promise((resolve, reject) => {
    upload.single('file')(req, null, async (err) => {
      if (err) return reject(new NextResponse('File upload error', { status: 400 }));

      const pdfPath = req.file.path;

      try {
        const pdf = await pdfjsLib.getDocument(pdfPath).promise;
        const numPages = pdf.numPages;
        const pagesText = [];

        for (let pageNum = 1; pageNum <= numPages; pageNum++) {
          const page = await pdf.getPage(pageNum);
          const content = await page.getTextContent();
          const pageText = content.items.map(item => item.str).join(' ');
          pagesText.push(pageText);
        }

        resolve(new NextResponse(JSON.stringify(pagesText), { status: 200 }));
      } catch (error) {
        reject(new NextResponse('Error extracting text from PDF', { status: 500 }));
      }
    });
  });
}
