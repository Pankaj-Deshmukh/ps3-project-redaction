'use client'
import { Upload } from "lucide-react";
import { useState } from "react";
import Navbar from "./Navbar"; // Import the Navbar component

const UploadPage = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [preview, setPreview] = useState(null);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];

    if (file && !allowedTypes.includes(file.type)) {
      setError("Please upload a valid file (JPEG, PNG, PDF, DOCX).");
      setSelectedFile(null);
      setPreview(null);
      return;
    }

    if (file) {
      setSelectedFile(file);
      setError(null);
      if (file.type.startsWith("image/")) {
        const previewUrl = URL.createObjectURL(file);
        setPreview(<img src={previewUrl} alt="Preview" className="max-h-64 mx-auto rounded-lg" />);
      } else if (file.type === "application/pdf") {
        const previewUrl = URL.createObjectURL(file);
        setPreview(<embed src={previewUrl} type="application/pdf" className="w-full h-64 mx-auto rounded-lg" />);
      } else {
        setPreview(<div className="text-gray-600">{file.name}</div>);
      }
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    handleFileChange({ target: { files: [file] } });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedFile) {
      setError("Please select a file!");
      return;
    }

    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      const res = await fetch("http://127.0.0.1:8000/api/upload/", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Something went wrong.");
      }

      setResponse(data.result);
    } catch (error) {
      console.error("Error:", error);
      setError(error.message || "Failed to connect to the server. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Navbar /> {/* Use the Navbar component */}
      <div className="max-w-2xl mx-auto py-16 px-4">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-6">Upload and Redact Files</h1>
          <p className="text-gray-600 mb-8">
            Upload an image or document (PDF, DOCX) to analyze it using our system.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-6"
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
            <input
              type="file"
              accept="image/*,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={handleFileChange}
              className="hidden"
              id="file-upload"
            />
            <label
              htmlFor="file-upload"
              className="cursor-pointer flex flex-col items-center"
            >
              <Upload className="h-12 w-12 text-gray-400 mb-3" />
              <span className="text-sm text-gray-600">
                Click to upload or drag and drop
              </span>
              <span className="text-xs text-gray-500 mt-1">
                PNG, JPG, PDF, DOCX up to 10MB
              </span>
            </label>
          </div>

          {preview && (
            <div className="mt-4">
              {preview}
            </div>
          )}

          <button
            type="submit"
            className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            disabled={loading || !selectedFile}
          >
            {loading ? "Uploading..." : "Upload File"}
          </button>
        </form>

        {error && (
          <div className="mt-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        {response && !error && (
          <div className="mt-6 p-4 bg-green-50 border border-green-200 text-green-700 rounded-lg">
            Response: {response}
          </div>
        )}
      </div>
    </>
  );
};

export default UploadPage;
