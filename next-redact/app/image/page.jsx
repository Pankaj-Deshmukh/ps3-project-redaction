"use client"
import { useState } from 'react';

// Inline Card Components
const Card = ({ className, children }) => (
  <div className={`rounded-lg border bg-card text-card-foreground shadow-sm ${className}`}>
    {children}
  </div>
);

const CardHeader = ({ className, children }) => (
  <div className={`flex flex-col space-y-1.5 p-6 ${className}`}>
    {children}
  </div>
);

const CardTitle = ({ className, children }) => (
  <h3 className={`text-2xl font-semibold leading-none tracking-tight ${className}`}>
    {children}
  </h3>
);

const CardContent = ({ className, children }) => (
  <div className={`p-6 pt-0 ${className}`}>
    {children}
  </div>
);

const ImageRedactor = () => {
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [originalImage, setOriginalImage] = useState(null);
  const [redactedImage, setRedactedImage] = useState(null);

  const handleImageUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setIsUploading(true);
    setRedactedImage(null);

    // Create object URL for preview
    setOriginalImage(URL.createObjectURL(file));

    // Prepare form data
    const formData = new FormData();
    formData.append('image', file);

    try {
      setIsProcessing(true);
      // Call the API route
      const response = await fetch('http://localhost:5000/api/redact_image', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Failed to process image');

      const blob = await response.blob();
      setRedactedImage(URL.createObjectURL(blob));
    } catch (error) {
      console.error('Error processing image:', error);
    } finally {
      setIsUploading(false);
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!redactedImage) return;

    const link = document.createElement('a');
    link.href = redactedImage;
    link.download = 'redacted-image.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="container mx-auto p-4 max-w-2xl">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Image Redaction Tool</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Upload Section */}
          <div className="flex flex-col items-center justify-center w-full">
            <label
              className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors"
            >
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <div className="w-12 h-12 mb-4 text-gray-500">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                </div>
                <p className="mb-2 text-sm text-gray-500">
                  <span className="font-semibold">Click to upload</span> or drag and drop
                </p>
                <p className="text-xs text-gray-500">PNG, JPG or JPEG (MAX. 10MB)</p>
              </div>
              <input
                type="file"
                className="hidden"
                accept="image/*"
                onChange={handleImageUpload}
                disabled={isProcessing}
              />
            </label>
          </div>

          {/* Preview Section */}
          {(originalImage || redactedImage) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {originalImage && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Original Image</p>
                  <img
                    src={originalImage}
                    alt="Original"
                    className="w-full h-48 object-cover rounded-lg"
                  />
                </div>
              )}
              {redactedImage && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Redacted Image</p>
                  <img
                    src={redactedImage}
                    alt="Redacted"
                    className="w-full h-48 object-cover rounded-lg"
                  />
                </div>
              )}
            </div>
          )}

          {/* Processing State */}
          {isProcessing && (
            <div className="flex items-center justify-center space-x-2">
              <div className="w-5 h-5 animate-spin">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                </svg>
              </div>
              <span className="text-sm">Processing image...</span>
            </div>
          )}

          {/* Download Button */}
          {redactedImage && (
            <button
              onClick={handleDownload}
              className="w-full flex items-center justify-center space-x-2 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <div className="w-5 h-5">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
              </div>
              <span>Download Redacted Image</span>
            </button>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ImageRedactor;
