import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Download,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Maximize,
  Minimize,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  ExternalLink,
  ShieldCheck,
  FileText,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import './PdfViewerModal.css';

export const PdfViewerModal = ({
  isOpen,
  onClose,
  title = 'Course Document',
  fileName = 'material.pdf',
  fileSize,
  viewUrl,
  downloadUrl,
  loading = false,
  error = null,
  onRetry,
  onDownload,
  theme = 'dark',
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageInput, setPageInput] = useState('1');
  const [zoomLevel, setZoomLevel] = useState(100);
  const [fitWidth, setFitWidth] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const containerRef = useRef(null);
  const iframeRef = useRef(null);

  // Reset page and zoom when a new document opens
  useEffect(() => {
    if (isOpen) {
      setCurrentPage(1);
      setPageInput('1');
      setZoomLevel(100);
      setFitWidth(false);
      setIframeLoaded(false);
    }
  }, [isOpen, viewUrl]);

  // Sync page input field when currentPage changes
  useEffect(() => {
    setPageInput(String(currentPage));
  }, [currentPage]);

  // Fullscreen change listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Keyboard shortcut controls
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (document.fullscreenElement) {
          document.exitFullscreen?.().catch(() => {});
        } else {
          onClose();
        }
      } else if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        handleZoomIn();
      } else if (e.key === '-' || e.key === '_') {
        e.preventDefault();
        handleZoomOut();
      } else if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        handleNextPage();
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        handlePrevPage();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, zoomLevel, currentPage, fitWidth]);

  if (!isOpen) return null;

  // Zoom handlers
  const handleZoomIn = () => {
    setFitWidth(false);
    setZoomLevel((prev) => Math.min(300, prev + 25));
  };

  const handleZoomOut = () => {
    setFitWidth(false);
    setZoomLevel((prev) => Math.max(50, prev - 25));
  };

  const handleResetZoom = () => {
    setFitWidth(false);
    setZoomLevel(100);
  };

  const handleToggleFitWidth = () => {
    setFitWidth((prev) => !prev);
  };

  // Page handlers
  const handleNextPage = () => {
    setCurrentPage((prev) => prev + 1);
  };

  const handlePrevPage = () => {
    setCurrentPage((prev) => Math.max(1, prev - 1));
  };

  const handlePageInputSubmit = (e) => {
    e.preventDefault();
    const parsed = parseInt(pageInput, 10);
    if (!isNaN(parsed) && parsed >= 1) {
      setCurrentPage(parsed);
    } else {
      setPageInput(String(currentPage));
    }
  };

  // Fullscreen handler
  const handleToggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      if (containerRef.current.requestFullscreen) {
        containerRef.current.requestFullscreen().catch(() => {});
      } else if (containerRef.current.webkitRequestFullscreen) {
        containerRef.current.webkitRequestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      }
    }
  };

  // Download handler
  const handleTriggerDownload = () => {
    if (onDownload) {
      onDownload();
      return;
    }
    const targetUrl = downloadUrl || viewUrl;
    if (!targetUrl) return;

    const link = document.createElement('a');
    link.href = targetUrl;
    link.download = fileName || 'material.pdf';
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Construct PDF Open Parameters hash string
  const pdfParams = `#page=${currentPage}&zoom=${fitWidth ? 'FitH' : zoomLevel}&view=${fitWidth ? 'FitH' : 'Fit'}&navpanes=0&toolbar=1`;
  const constructedSrc = viewUrl ? `${viewUrl}${viewUrl.includes('#') ? '' : pdfParams}` : '';

  return (
    <div
      className={`tm-pdf-modal-backdrop tm-theme-${theme}`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={containerRef}
        className={`tm-pdf-modal-container ${isFullscreen ? 'is-fullscreen' : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header & Controls Toolbar */}
        <div className="tm-pdf-modal-header">
          {/* Metadata Section */}
          <div className="tm-pdf-modal-meta">
            <span className="tm-pdf-badge-tag">
              <FileText size={12} /> PDF
            </span>
            <h3 className="tm-pdf-modal-title" title={title || fileName}>
              {title || fileName}
            </h3>
            {fileSize && <span className="tm-pdf-size-pill">{fileSize}</span>}
          </div>

          {/* Controls: Page & Zoom */}
          <div className="tm-pdf-controls-group">
            {/* Page Navigation */}
            <button
              type="button"
              className="tm-pdf-btn-icon"
              onClick={handlePrevPage}
              disabled={currentPage <= 1 || loading}
              title="Previous Page (Left Arrow)"
            >
              <ChevronLeft size={16} />
            </button>

            <form onSubmit={handlePageInputSubmit} className="tm-pdf-page-display">
              <span>Page</span>
              <input
                type="text"
                value={pageInput}
                onChange={(e) => setPageInput(e.target.value)}
                onBlur={handlePageInputSubmit}
                className="tm-pdf-page-input"
                title="Type page number and press Enter"
              />
            </form>

            <button
              type="button"
              className="tm-pdf-btn-icon"
              onClick={handleNextPage}
              disabled={loading}
              title="Next Page (Right Arrow)"
            >
              <ChevronRight size={16} />
            </button>

            <div className="tm-pdf-control-divider" />

            {/* Zoom Controls */}
            <button
              type="button"
              className="tm-pdf-btn-icon"
              onClick={handleZoomOut}
              disabled={zoomLevel <= 50 || loading}
              title="Zoom Out (-)"
            >
              <ZoomOut size={15} />
            </button>

            <span
              className="tm-pdf-zoom-label"
              onClick={handleResetZoom}
              title="Click to reset zoom to 100%"
            >
              {fitWidth ? 'Fit' : `${zoomLevel}%`}
            </span>

            <button
              type="button"
              className="tm-pdf-btn-icon"
              onClick={handleZoomIn}
              disabled={zoomLevel >= 300 || loading}
              title="Zoom In (+)"
            >
              <ZoomIn size={15} />
            </button>

            <button
              type="button"
              className={`tm-pdf-btn-icon ${fitWidth ? 'active' : ''}`}
              onClick={handleToggleFitWidth}
              title="Fit to Width"
            >
              <Maximize2 size={14} />
            </button>

            <button
              type="button"
              className="tm-pdf-btn-icon"
              onClick={handleResetZoom}
              title="Reset Zoom to 100%"
            >
              <RotateCcw size={13} />
            </button>
          </div>

          {/* Actions: Download, Fullscreen, External, Close */}
          <div className="tm-pdf-modal-actions">
            <button
              type="button"
              className="tm-pdf-btn-download"
              onClick={handleTriggerDownload}
              title="Download PDF to device"
            >
              <Download size={14} />
              <span>Download</span>
            </button>

            <button
              type="button"
              className="tm-pdf-btn-icon"
              onClick={handleToggleFullscreen}
              title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen (F)'}
            >
              {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
            </button>

            {viewUrl && (
              <a
                href={viewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="tm-pdf-btn-icon"
                title="Open PDF in new tab"
              >
                <ExternalLink size={15} />
              </a>
            )}

            <button
              type="button"
              className="tm-pdf-btn-close"
              onClick={onClose}
              title="Close Viewer (Esc)"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Viewer Body / Content */}
        <div className="tm-pdf-modal-body">
          {loading ? (
            <div className="tm-pdf-state-box">
              <RefreshCw size={32} className="tm-pdf-spinner" />
              <h4>Loading Protected PDF Document...</h4>
              <p>Authorizing secure stream from AWS S3...</p>
            </div>
          ) : error ? (
            <div className="tm-pdf-state-box">
              <AlertCircle size={36} color="#ef4444" />
              <h4>Unable to Preview PDF</h4>
              <p>{error}</p>
              <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
                {onRetry && (
                  <button
                    type="button"
                    onClick={onRetry}
                    className="tm-btn-outline-xs"
                    style={{ padding: '6px 14px' }}
                  >
                    Retry
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleTriggerDownload}
                  className="tm-pdf-btn-download"
                >
                  <Download size={14} />
                  <span>Download File Directly</span>
                </button>
              </div>
            </div>
          ) : viewUrl ? (
            <iframe
              ref={iframeRef}
              key={constructedSrc}
              src={constructedSrc}
              title={title || fileName}
              className="tm-pdf-iframe"
              onLoad={() => setIframeLoaded(true)}
            />
          ) : (
            <div className="tm-pdf-state-box">
              <AlertCircle size={32} />
              <p>No preview stream available for this file.</p>
            </div>
          )}
        </div>

        {/* Bottom Status Bar */}
        <div className="tm-pdf-modal-footer">
          <span className="tm-pdf-footer-pill">
            <ShieldCheck size={14} />
            <span>Encrypted TradeMax S3 Stream (15-min signed token)</span>
          </span>
          <span className="tm-pdf-footer-hint">
            <span>Use +/- to zoom · Arrow keys to change page · Esc to close</span>
          </span>
        </div>
      </div>
    </div>
  );
};
