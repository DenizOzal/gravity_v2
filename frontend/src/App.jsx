import { useState, useCallback } from 'react';
import './index.css';
import ModeToggle, { MODES } from './components/ModeToggle';
import DropZone from './components/DropZone';
import ProgressBar from './components/ProgressBar';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001';

const CONVERSION_STEPS = [
  'Uploading file…',
  'Analyzing document structure…',
  'Converting content…',
  'Finalising output…',
];

function buildSteps(progress) {
  const perStep = 100 / CONVERSION_STEPS.length;
  return CONVERSION_STEPS.map((label, i) => {
    const stepStart = i * perStep;
    const stepEnd = (i + 1) * perStep;
    return {
      label,
      done: progress >= stepEnd,
      active: progress >= stepStart && progress < stepEnd,
    };
  });
}

export default function App() {
  const [mode, setMode] = useState('pdf_to_word');
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState('idle'); // idle | converting | done | error
  const [progress, setProgress] = useState(0);
  const [downloadUrl, setDownloadUrl] = useState(null);
  const [downloadName, setDownloadName] = useState('');
  const [error, setError] = useState('');

  const currentMode = MODES.find((m) => m.id === mode);

  const handleModeChange = useCallback((newMode) => {
    setMode(newMode);
    setFile(null);
    setStatus('idle');
    setProgress(0);
    setDownloadUrl(null);
    setError('');
  }, []);

  const handleFileSelect = useCallback((f) => {
    setFile(f);
    setStatus('idle');
    setError('');
    setDownloadUrl(null);
  }, []);

  const handleRemoveFile = useCallback(() => {
    setFile(null);
    setStatus('idle');
    setError('');
    setDownloadUrl(null);
  }, []);

  const handleConvert = useCallback(async () => {
    if (!file) return;

    setStatus('converting');
    setProgress(0);
    setError('');
    setDownloadUrl(null);

    // Simulate multi-step progress animation
    const totalMs = 2000; // base 2s before request resolves (visual only)
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 75) { clearInterval(interval); return 75; }
        return prev + 5;
      });
    }, totalMs / 15);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('mode', mode);

      const response = await fetch(`${API_BASE}/convert`, {
        method: 'POST',
        body: formData,
      });

      clearInterval(interval);

      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: 'Conversion failed' }));
        throw new Error(data.error || 'Conversion failed');
      }

      // Animate to 100%
      setProgress(95);
      await new Promise((r) => setTimeout(r, 300));
      setProgress(100);
      await new Promise((r) => setTimeout(r, 300));

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);

      // Determine output filename
      const base = file.name.replace(/\.[^.]+$/, '');
      const ext = mode === 'pdf_to_word' ? 'docx' : 'pdf';
      setDownloadUrl(url);
      setDownloadName(`${base}.${ext}`);
      setStatus('done');
    } catch (err) {
      clearInterval(interval);
      setError(err.message);
      setStatus('error');
      setProgress(0);
    }
  }, [file, mode]);

  const handleReset = useCallback(() => {
    if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    setFile(null);
    setStatus('idle');
    setProgress(0);
    setDownloadUrl(null);
    setDownloadName('');
    setError('');
  }, [downloadUrl]);

  const isConverting = status === 'converting';

  return (
    <>
      <div className="bg-orbs" aria-hidden="true" />
      <div className="app-wrapper">
        {/* Header */}
        <header className="header">
          <div className="header-logo">
            <div className="header-logo-icon">⚡</div>
            <h1 className="header-title">DocShift</h1>
          </div>
          <p className="header-subtitle">Instant, lossless PDF ↔ Word conversion</p>
        </header>

        {/* Main Card */}
        <main className="main-card" role="main">
          <ModeToggle activeMode={mode} onModeChange={handleModeChange} />

          <DropZone
            accept={currentMode.accept}
            acceptLabel={currentMode.acceptLabel}
            onFileSelect={handleFileSelect}
            selectedFile={file}
            onRemoveFile={handleRemoveFile}
          />

          {/* Error */}
          {status === 'error' && (
            <div className="error-section" role="alert" id="error-message">
              <span className="error-icon">⚠️</span>
              <span className="error-text">{error}</span>
            </div>
          )}

          {/* Progress */}
          {isConverting && (
            <ProgressBar progress={progress} steps={buildSteps(progress)} />
          )}

          {/* Result */}
          {status === 'done' && downloadUrl && (
            <div className="result-section" id="result-section">
              <span className="result-icon">🎉</span>
              <p className="result-title">Conversion Complete!</p>
              <p className="result-sub">Your file is ready to download.</p>
              <a
                id="download-btn"
                className="download-btn"
                href={downloadUrl}
                download={downloadName}
              >
                ⬇️ Download {downloadName}
              </a>
              <br />
              <button className="reset-btn" onClick={handleReset} type="button" id="convert-another-btn">
                🔄 Convert another file
              </button>
            </div>
          )}

          {/* Convert Button */}
          {status !== 'done' && (
            <button
              id="convert-btn"
              className="convert-btn"
              onClick={handleConvert}
              disabled={!file || isConverting}
              type="button"
              aria-busy={isConverting}
            >
              {isConverting ? (
                <>⏳ Converting…</>
              ) : (
                <>{currentMode.icon} Convert {currentMode.label}</>
              )}
            </button>
          )}
        </main>

        <footer className="footer">
          Files are processed locally · No data is stored on any server
        </footer>
      </div>
    </>
  );
}
