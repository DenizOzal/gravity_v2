export default function ProgressBar({ progress, steps }) {
    return (
        <div className="progress-section" role="status" aria-live="polite">
            <div className="progress-header">
                <span className="progress-label">Converting your file…</span>
                <span className="progress-pct" id="progress-pct">{progress}%</span>
            </div>
            <div className="progress-track" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
                <div className="progress-fill" style={{ width: `${progress}%` }} />
            </div>
            {steps && steps.length > 0 && (
                <div className="progress-steps">
                    {steps.map((step, i) => (
                        <div key={i} className={`progress-step${step.active ? ' active' : ''}${step.done ? ' done' : ''}`}>
                            <span className={`step-dot${step.active && !step.done ? ' spin' : ''}`} />
                            {step.label}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
