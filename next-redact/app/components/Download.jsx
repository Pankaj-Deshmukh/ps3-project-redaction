'use client'

import { useRef } from "react";

function Download({ setDownloading, file }) {
  const downloadFileAtURL = () => {
    // Create a Blob URL for the file if it's a Blob or File object
    const fileURL = URL.createObjectURL(file);

    // Create an anchor tag and trigger the download
    const aTag = document.createElement("a");
    aTag.href = fileURL;
    aTag.setAttribute("download", "downloaded-file.pdf"); // You can change the file name here
    document.body.appendChild(aTag);
    aTag.click();
    document.body.removeChild(aTag);

    // Optionally revoke the Blob URL after download
    URL.revokeObjectURL(fileURL);
  };

  const popupRef = useRef(null);
  const handleClickOutside = (event) => {
    if (popupRef.current && !popupRef.current.contains(event.target)) {
      setDownloading(false);
    }
  };

  document.addEventListener("mousedown", handleClickOutside);

  return (
    <div className="font-sans text-center flex justify-center items-center w-screen h-screen bg-transparent absolute backdrop-blur-md z-50 top-0 left-0">
      <div ref={popupRef} className="container mx-auto my-10 p-6 max-w-md border rounded-lg shadow-lg bg-gray-50">
        <div className="status-icon my-2 text-3xl text-green-600">
          <span className="checkmark">✅</span>
        </div>
        <h2 className="text-gray-800 text-2xl font-semibold my-2">
          Congratulations🥳!
        </h2>
        <p className="text-gray-600 text-lg my-2">
          The file is available for download.
        </p>
        <div className="file-info flex items-center justify-center my-4 p-4 bg-white border rounded">
          <img
            src="https://upload.wikimedia.org/wikipedia/commons/8/87/PDF_file_icon.svg"
            alt="PDF Icon"
            className="w-12 h-12 mr-2"
          />
        </div>
        <div className="buttons flex justify-center gap-4 my-4">
          <button
            className="btn-download bg-blue-500 text-white py-2 px-4 rounded shadow transition-transform transform hover:bg-blue-700 hover:-translate-y-1 active:bg-red-600"
            onClick={downloadFileAtURL}
          >
            Download PDF
          </button>
          <button className="btn-back bg-blue-500 text-white py-2 px-4 rounded shadow transition-transform transform hover:bg-blue-700 hover:-translate-y-1 active:bg-red-600">
            Back To File
          </button>
        </div>
        <div className="review my-4">
          <button className="btn-review bg-green-500 text-white py-2 px-4 rounded shadow transition-transform transform hover:bg-green-600 hover:-translate-y-1 active:bg-green-700">
            Leave a review on our website
          </button>
        </div>
      </div>
    </div>
  );
}

export default Download;
