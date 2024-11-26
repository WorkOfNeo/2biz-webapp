// UploadCSVModal.tsx

import React, { useState } from 'react';

interface UploadCSVModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadComplete: () => void;
}

const UploadCSVModal: React.FC<UploadCSVModalProps> = ({
  isOpen,
  onClose,
  onUploadComplete,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [delimiter, setDelimiter] = useState<string>(';'); // Default to ';'

  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      alert('Please select a CSV file to upload.');
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('delimiter', delimiter || ';'); // Add delimiter to form data

      const response = await fetch('/api/uploadCsv', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        alert('CSV file uploaded successfully!');
        onUploadComplete(); // Notify parent component
        onClose();
      } else {
        const errorData = await response.json();
        alert(`Error uploading CSV file: ${errorData.error}`);
      }
    } catch (error) {
      console.error('Upload Error:', error);
      alert('There was an error uploading the CSV file.');
    } finally {
      setIsUploading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
      <div className="bg-white rounded-lg p-6 w-96">
        <h2 className="text-xl font-bold mb-4">Upload CSV File</h2>
        <input
          type="file"
          accept=".csv"
          onChange={handleFileChange}
          className="mb-4 w-full"
        />
        <input
          type="text"
          value={delimiter}
          onChange={(e) => setDelimiter(e.target.value)}
          placeholder="Delimiter (default is ;)"
          className="mb-4 w-full p-2 border rounded"
        />
        {selectedFile && (
          <p className="mb-4 text-sm">
            Selected file: <strong>{selectedFile.name}</strong>
          </p>
        )}
        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="mr-2 bg-gray-300 text-gray-700 px-4 py-2 rounded-md"
            disabled={isUploading}
          >
            Cancel
          </button>
          <button
            onClick={handleUpload}
            className="bg-blue-500 text-white px-4 py-2 rounded-md"
            disabled={isUploading}
          >
            {isUploading ? 'Uploading...' : 'Upload'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default UploadCSVModal;