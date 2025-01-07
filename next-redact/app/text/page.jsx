"use client"
/*
John Doe, SSN: 123-45-6789, has an email john.doe@example.com and a phone number +1 (123) 456-7890.
He also uses a credit card 1234 5678 9012 3456. Here's a custom-sensitive ID: ABC12345.
*/
import { useEffect, useState } from 'react';

// Card Components
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

const TextRedactor = () => {
  const [inputText, setInputText] = useState('');
  const [redactedText, setRedactedText] = useState('');
  const [selectedPatterns, setSelectedPatterns] = useState({
    email: true,
    phone: true,
    creditCard: true,
    ssn: true,
    customPattern: false
  });
  const [customPattern, setCustomPattern] = useState('');
  const [customReplacement, setCustomReplacement] = useState('[REDACTED]');
  const [customPatternError, setCustomPatternError] = useState('');

  const patterns = {
    email: {
      regex: /[\w-\.]+@([\w-]+\.)+[\w-]{2,4}/g,
      replacement: '[EMAIL]'
    },
    phone: {
      regex: /(\+\d{1,3}[\s-])?\(?\d{3}\)?[\s-]?\d{3}[\s-]?\d{4}/g,
      replacement: '[PHONE]'
    },
    creditCard: {
      regex: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g,
      replacement: '[CREDIT CARD]'
    },
    ssn: {
      regex: /\b\d{3}[-]?\d{2}[-]?\d{4}\b/g,
      replacement: '[SSN]'
    }
  };

  const validateRegex = (pattern) => {
    try {
      new RegExp(pattern);
      return true;
    } catch (e) {
      return false;
    }
  };

  const handleRedaction = () => {
    let result = inputText;
    setCustomPatternError('');

    // Apply selected pattern redactions
    Object.entries(patterns).forEach(([key, pattern]) => {
      if (selectedPatterns[key]) {
        result = result.replace(pattern.regex, pattern.replacement);
      }
    });

    // Apply custom pattern if enabled and valid
    if (selectedPatterns.customPattern && customPattern) {
      if (validateRegex(customPattern)) {
        try {
          const regex = new RegExp(customPattern, 'g');
          const replacement = customReplacement || '[REDACTED]';
          result = result.replace(regex, replacement);
        } catch (error) {
          setCustomPatternError('Error applying pattern: ' + error.message);
        }
      } else {
        setCustomPatternError('Invalid regex pattern');
      }
    }

    setRedactedText(result);
  };

  useEffect(() => {
    handleRedaction();
  }, [inputText, selectedPatterns, customPattern, customReplacement]);

  const handleCustomPatternChange = (value) => {
    setCustomPattern(value);
    if (value && !validateRegex(value)) {
      setCustomPatternError('Invalid regex pattern');
    } else {
      setCustomPatternError('');
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(redactedText);
  };

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Text Redaction Tool</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Controls Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={selectedPatterns.email}
                onChange={(e) => setSelectedPatterns(prev => ({ ...prev, email: e.target.checked }))}
                className="rounded border-gray-300"
              />
              <span>Email Addresses</span>
            </label>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={selectedPatterns.phone}
                onChange={(e) => setSelectedPatterns(prev => ({ ...prev, phone: e.target.checked }))}
                className="rounded border-gray-300"
              />
              <span>Phone Numbers</span>
            </label>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={selectedPatterns.creditCard}
                onChange={(e) => setSelectedPatterns(prev => ({ ...prev, creditCard: e.target.checked }))}
                className="rounded border-gray-300"
              />
              <span>Credit Cards</span>
            </label>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={selectedPatterns.ssn}
                onChange={(e) => setSelectedPatterns(prev => ({ ...prev, ssn: e.target.checked }))}
                className="rounded border-gray-300"
              />
              <span>SSN</span>
            </label>
          </div>

          {/* Custom Pattern Section */}
          <div className="space-y-4">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={selectedPatterns.customPattern}
                onChange={(e) => setSelectedPatterns(prev => ({ ...prev, customPattern: e.target.checked }))}
                className="rounded border-gray-300"
              />
              <span>Custom Pattern</span>
            </label>
            {selectedPatterns.customPattern && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <input
                      type="text"
                      placeholder="Enter regex pattern (e.g., \w+@example\.com)"
                      value={customPattern}
                      onChange={(e) => handleCustomPatternChange(e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${customPatternError ? 'border-red-500' : ''
                        }`}
                    />
                    {customPatternError && (
                      <p className="text-sm text-red-500">{customPatternError}</p>
                    )}
                  </div>
                  <input
                    type="text"
                    placeholder="Replacement text (default: [REDACTED])"
                    value={customReplacement}
                    onChange={(e) => setCustomReplacement(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="text-sm text-gray-600">
                  Example patterns:
                  <ul className="list-disc pl-5 space-y-1">
                    <li>\b\w+\b - Matches whole words</li>
                    <li>\d{6} - Matches 6 digit numbers</li>
                    <li>[A-Z]{2}\d{4} - Matches 2 uppercase letters followed by 4 digits</li>
                  </ul>
                </div>
              </div>
            )}
          </div>

          {/* Text Areas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="block text-sm font-medium">Input Text</label>
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Enter text to redact..."
                className="w-full h-64 p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="block text-sm font-medium">Redacted Output</label>
                <button
                  onClick={handleCopy}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  Copy to Clipboard
                </button>
              </div>
              <textarea
                value={redactedText}
                readOnly
                className="w-full h-64 p-3 bg-gray-50 border rounded-lg"
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TextRedactor;
