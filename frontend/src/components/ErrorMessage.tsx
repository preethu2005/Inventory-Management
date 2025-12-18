import React from 'react';

interface ErrorMessageProps {
  error: string;
  onDismiss?: () => void;
}

export const ErrorMessage: React.FC<ErrorMessageProps> = ({ error, onDismiss }) => {
  return (
    <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded relative" role="alert">
      <span className="block sm:inline">{error}</span>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="absolute top-0 bottom-0 right-0 px-4 py-3"
          aria-label="Dismiss"
        >
          <span className="text-red-500 text-xl">&times;</span>
        </button>
      )}
    </div>
  );
};
