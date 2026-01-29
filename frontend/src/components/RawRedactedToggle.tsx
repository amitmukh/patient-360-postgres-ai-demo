'use client';

interface RawRedactedToggleProps {
  showRaw: boolean;
  onToggle: (value: boolean) => void;
  disabled: boolean;
}

export function RawRedactedToggle({ showRaw, onToggle, disabled }: RawRedactedToggleProps) {
  return (
    <div className={`p-3 rounded-lg border ${disabled ? 'bg-gray-50 border-gray-200' : 'bg-white border-gray-200'}`}>
      <div className="flex items-center justify-between">
        <div>
          <label className="text-sm font-medium text-gray-700">
            View Mode
          </label>
          <p className="text-xs text-gray-500">
            {disabled
              ? 'Raw view disabled by administrator'
              : showRaw
                ? 'Showing original text with PHI'
                : 'Showing PHI-redacted text'}
          </p>
        </div>

        <button
          onClick={() => onToggle(!showRaw)}
          disabled={disabled}
          className={`
            relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent 
            transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
            ${showRaw ? 'bg-red-500' : 'bg-green-500'}
          `}
          role="switch"
          aria-checked={showRaw}
        >
          <span className="sr-only">Toggle raw view</span>
          <span
            className={`
              pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 
              transition duration-200 ease-in-out
              ${showRaw ? 'translate-x-5' : 'translate-x-0'}
            `}
          />
        </button>
      </div>

      {/* Status Indicator */}
      <div className="mt-2 flex items-center gap-2">
        {showRaw && !disabled ? (
          <>
            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
            <span className="text-xs text-red-600 font-medium">⚠️ Raw View - PHI Visible</span>
          </>
        ) : (
          <>
            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
            <span className="text-xs text-green-600 font-medium">✓ PHI-Redacted View</span>
          </>
        )}
      </div>

      {/* Info Box */}
      {!disabled && (
        <div className="mt-2 p-2 bg-gray-50 rounded text-xs text-gray-600">
          <strong>Governance Note:</strong> PHI redaction uses Azure AI Language with{' '}
          <code className="bg-gray-200 px-1 rounded">domain=&apos;phi&apos;</code> to redact only 
          Protected Health Information, not general PII.
        </div>
      )}
    </div>
  );
}
