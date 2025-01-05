"use client"
import axios from 'axios';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Download from '../components/Download';
import PageThumbnail from '../components/PageThumbnail';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';

const highlightRedactedText = (text = '', patterns = []) => {
  if (!text || !patterns.length) {
      return [{ text: text || '', highlighted: false }];
  }
  let segments = [{ text, highlighted: false }];
  patterns.forEach(pattern => {
      if (!pattern || typeof pattern !== 'string') return;
      segments = segments.flatMap(segment => {
          if (segment.highlighted || !segment.text) {
              return [segment];
          }
          try {
              // Convert pattern to lowercase and escape special characters
              const escapedPattern = pattern.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
              const regex = new RegExp(`\\b${escapedPattern}\\b`, 'gi');
              const parts = [];
              let lastIndex = 0;
              let match;

              while ((match = regex.exec(segment.text)) !== null) {
                  // Add non-matching text before this match
                  if (match.index > lastIndex) {
                      parts.push({
                          text: segment.text.slice(lastIndex, match.index),
                          highlighted: false
                      });
                  }
                  // Add the matched text
                  parts.push({
                      text: match[0],
                      highlighted: true
                  });
                  lastIndex = regex.lastIndex;
              }
              // Add any remaining text after the last match
              if (lastIndex < segment.text.length) {
                  parts.push({
                      text: segment.text.slice(lastIndex),
                      highlighted: false
                  });
              }

              return parts.length ? parts : [segment];
          } catch (error) {
              console.error('Error processing pattern:', pattern, error);
              return [segment];
          }
      });
  });

  return segments;
};

const DocumentRedactor = () => {
  const [pages, setPages] = useState([]);
  const [redactedPages, setRedactedPages] = useState([]);
  const [selectedPage, setSelectedPage] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [customRedactions, setCustomRedactions] = useState([]);
  const [error, setError] = useState('');
  const [showRedacted, setShowRedacted] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [downloading, setDownloading] =  useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [redactedFile, setRedactedFile] = useState(null);
  const [words, setWords] = useState([]);

  const router = useRouter();
  useEffect(() => {
    const PDFpreprocess = async() => {
      try{
        const fileBase64 = sessionStorage.getItem("file");
        if (!fileBase64) {
            console.error("No file found in sessionStorage");
            router.push("/upload");
            return;
        }
        const byteCharacters = atob(fileBase64.split(',')[1]);
        const byteArrays = [];
        for (let offset = 0; offset < byteCharacters.length; offset += 1024) {
          const slice = byteCharacters.slice(offset, offset + 1024);
          const byteNumbers = new Array(slice.length);
          for (let i = 0; i < slice.length; i++) {
            byteNumbers[i] = slice.charCodeAt(i);
          }
          byteArrays.push(new Uint8Array(byteNumbers));
        }
        const blob = new Blob(byteArrays, { type: 'application/pdf' });
        setUploadedFile(blob);
        const formData = new FormData();
        formData.append('file', blob, 'uploaded-file.pdf');
        const res = await axios.post("http://127.0.0.1:5000/api/PDFpreprocess", formData);
        setPages(res.data.pages);
        setWords([...new Set(res.data.entites)]);
        setTimeout(() => {
          setPageLoading(false);
        }, 2000);
      }
      catch(err){
        console.error(err);
      }
    };
    PDFpreprocess();
  }, []);

  useEffect(() => {
    if (pages && pages.length > 0) {
      setRedactedPages(new Array(pages.length).fill(''));
    }
  }, [pages]);

  const handleRedaction = async () => {
    try {
        setIsLoading(true);
        setError('');

        const newRedactedPages = pages.map(page => {
            if (!page) return '';

            let processedText = page;
            words.forEach(pattern => {
                if (!pattern) return;
                try {
                    const escapedPattern = pattern.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                    const regex = new RegExp(`\\b${escapedPattern}\\b|${escapedPattern}\\b${escapedPattern}`, 'gi');

                    processedText = processedText.replace(regex, match => '█'.repeat(match.length));
                } catch (error) {
                    console.error('Error applying pattern:', pattern, error);
                }
            });
            return processedText;
        });

        setRedactedPages(newRedactedPages);
        setShowRedacted(true);
    } catch (err) {
        setError('Error processing document. Please try again.');
        console.error('Redaction error:', err);
    } finally {
        setIsLoading(false);
    }
};

  const addCustomRedaction = () => {
    if (searchTerm.trim()) {
      setCustomRedactions([...customRedactions, searchTerm]);
      setWords([...words, searchTerm]);
      setSearchTerm('');
      setShowRedacted(false);
    }
  };

  const removeCustomRedaction = (index) => {
    setCustomRedactions(customRedactions.filter((_, i) => i !== index));
    setWords(words.filter((_, i) => i !== index));
    setShowRedacted(false);
  };

  const renderPage = () => {
    const currentPage = pages[selectedPage] || '';

    if (showRedacted) {
      return redactedPages[selectedPage] || '';
    }

    try {
      const segments = highlightRedactedText(currentPage, words);

      return (
        <div>
          {segments.map((segment, index) => (
            <span
              key={index}
              className={segment.highlighted ? 'bg-yellow-200 px-1 rounded' : ''}
            >
              {segment.text}
            </span>
          ))}
        </div>
      );
    } catch (error) {
      console.error('Error rendering page:', error);
      return currentPage;
    }
  };

  const getRedactedPDF = async () => {
    const formData = new FormData();
    formData.append("file", uploadedFile);
    words.forEach((word) => formData.append("words", word));
    try {
      const response = await axios.post("http://127.0.0.1:5000/redact_pdf", formData, {
        responseType: "blob",
      });

      setRedactedFile(new Blob([response.data]));
    } catch (error) {
      console.error("Error redacting PDF:", error);
      alert("An error occurred while processing the PDF.");
    } finally {
      setIsLoading(false);
    }
    setDownloading(true);
  };
  if(pageLoading){
    return <div className='flex h-screen w-screen justify-center items-center'><div className="loader"></div></div>
  }
  return (
    <div className="w-full h-screen max-h-screen flex flex-col p-4 bg-gray-50">
      {downloading && <Download file={redactedFile} setDownloading={setDownloading} />}
      <div className="mb-4">
        <div className="flex items-center gap-4 mb-4">
          <Input
            placeholder="Search for text to redact..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1"
          />
          <Button onClick={addCustomRedaction}>
            <span className="flex items-center">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              Add
            </span>
          </Button>
        </div>

        {words.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4 h-8 overflow-hidden transition-all duration-500 hover:h-fit">
            {words.map((term, index) => (
              <div
                key={index}
                className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full flex items-center gap-2"
              >
                <span>{term}</span>
                <button
                  onClick={() => removeCustomRedaction(index)}
                  className="text-blue-600 hover:text-blue-800"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex-1 flex gap-4 min-h-0">
        <div className="w-48 overflow-y-auto border rounded-lg bg-white p-2 space-y-2">
          {pages.map((content, index) => (
            <PageThumbnail
              key={index}
              content={showRedacted ? redactedPages[index] : content}
              pageNumber={index}
              isSelected={selectedPage === index}
              onClick={() => setSelectedPage(index)}
            />
          ))}
        </div>
        <div className="flex-1 border rounded-lg bg-white p-6 overflow-y-auto">
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="space-y-2">
              <h3 className="font-semibold">
                Document Preview - Page {selectedPage + 1}
                {showRedacted ? ' (Redacted)' : ' (Highlighted)'}
              </h3>
              <div className="border rounded p-4 whitespace-pre-wrap min-h-[600px] bg-white">
                {renderPage()}
              </div>
            </div>

            <div className="flex justify-end gap-4">
              <Button
                variant="outline"
                onClick={() => setShowRedacted(!showRedacted)}
                disabled={!redactedPages.some(page => page) || isLoading}
              >
                <span className="flex items-center">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  {showRedacted ? 'Show Highlights' : 'Preview Redacted'}
                </span>
              </Button>
              <Button
                variant="outline"
                onClick={getRedactedPDF}
                disabled={!redactedPages.some(page => page) || isLoading}
              >
                <span className="flex items-center">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download Redacted
                </span>
              </Button>
              <Button onClick={handleRedaction} disabled={isLoading}>
                {isLoading ? 'Processing...' : 'Redact'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocumentRedactor;
