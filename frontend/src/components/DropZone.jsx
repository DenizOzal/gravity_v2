import { useRef, useState, useCallback } from 'react';

export default function DropZone({ accept, acceptLabel, onFileSelect, selectedFile, onRemoveFile }) {
    const [dragging, setDragging] = useState(false);
    const inputRef = useRef(null);

    const handleDragOver = useCallback((e) => {
        e.preventDefault();
        setDragging(true);
    }, []);

    const handleDragLeave = useCallback(() => {
        setDragging(false);
    }, []);

    const handleDrop = useCallback((e) => {
        e.preventDefault();
        setDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (file) onFileSelect(file);
    }, [onFileSelect]);

    const handleChange = useCallback((e) => {
        const file = e.target.files?.[0];
        if (file) onFileSelect(file);
        e.target.value = '';
    }, [onFileSelect]);

    const formatSize = (bytes) => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    const getFileIcon = (file) => {
        if (!file) return '📂';
        const ext = file.name.split('.').pop().toLowerCase();
        if (ext === 'pdf') return '📕';
        if (['docx', 'doc'].includes(ext)) return '📘';
        return '📄';
    };

    return (
        <div>
            <div
                id="drop-zone"
                className={`drop-zone${dragging ? ' dragging' : ''}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => inputRef.current?.click()}
                role="button"
                tabIndex={0}
                aria-label="Click or drag a file to upload"
                onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
            >
                <span className="drop-zone-icon">
                    {dragging ? '🎯' : '☁️'}
                </span>
                <p className="drop-zone-title">
                    {dragging ? 'Drop it here!' : 'Drop your file here'}
                </p>
                <p className="drop-zone-sub">or click to browse from your computer</p>
                <span className="drop-zone-badge">{acceptLabel} accepted</span>

                <input
                    id="file-input"
                    ref={inputRef}
                    type="file"
                    accept={accept}
                    className="file-input"
                    onChange={handleChange}
                    aria-label="File upload input"
                />

                <div onClick={(e) => e.stopPropagation()}>
                    <button
                        id="browse-btn"
                        className="browse-btn"
                        onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}
                        type="button"
                    >
                        📁 Browse Files
                    </button>
                </div>
            </div>

            {selectedFile && (
                <div className="selected-file" id="selected-file-info">
                    <span className="selected-file-icon">{getFileIcon(selectedFile)}</span>
                    <div className="selected-file-info">
                        <div className="selected-file-name">{selectedFile.name}</div>
                        <div className="selected-file-size">{formatSize(selectedFile.size)}</div>
                    </div>
                    <button
                        className="remove-file-btn"
                        onClick={onRemoveFile}
                        title="Remove file"
                        aria-label="Remove selected file"
                        type="button"
                    >
                        ✕
                    </button>
                </div>
            )}
        </div>
    );
}
