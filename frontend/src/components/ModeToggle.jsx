const MODES = [
    { id: 'pdf_to_word', label: 'PDF → Word', icon: '📄', accept: '.pdf', acceptLabel: 'PDF' },
    { id: 'word_to_pdf', label: 'Word → PDF', icon: '📝', accept: '.docx,.doc', acceptLabel: 'DOCX / DOC' },
];

export { MODES };

export default function ModeToggle({ activeMode, onModeChange }) {
    return (
        <div className="mode-toggle" role="tablist" aria-label="Conversion mode">
            {MODES.map((m) => (
                <button
                    key={m.id}
                    id={`mode-btn-${m.id}`}
                    role="tab"
                    aria-selected={activeMode === m.id}
                    className={`mode-btn${activeMode === m.id ? ' active' : ''}`}
                    onClick={() => onModeChange(m.id)}
                >
                    <span className="btn-icon">{m.icon}</span>
                    {m.label}
                </button>
            ))}
        </div>
    );
}
