
import React, { useState, useCallback } from 'react';
import { ClipboardIcon } from './icons/ClipboardIcon';
import { CheckIcon } from './icons/CheckIcon';

interface UrlResultProps {
  shortUrl: string;
}

export const UrlResult: React.FC<UrlResultProps> = ({ shortUrl }) => {
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(shortUrl).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000); // Reset after 2 seconds
    });
  }, [shortUrl]);

  return (
    <div className="bg-brand-gray-dark border border-brand-gray-light p-4 rounded-lg flex items-center justify-between gap-4 animate-fade-in">
      <a 
        href={shortUrl} 
        target="_blank" 
        rel="noopener noreferrer"
        className="text-lg font-mono text-brand-purple-light hover:underline truncate"
      >
        {shortUrl}
      </a>
      <button
        onClick={handleCopy}
        className="flex-shrink-0 bg-brand-gray-light hover:bg-brand-purple text-white font-bold p-2 rounded-lg transition-colors duration-200"
        aria-label="Copy to clipboard"
      >
        {isCopied ? (
          <CheckIcon className="h-5 w-5 text-green-400" />
        ) : (
          <ClipboardIcon className="h-5 w-5" />
        )}
      </button>
    </div>
  );
};
