import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  X,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Maximize,
  Minimize,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
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
  streamUrl,
  viewUrl,
  theme = 'dark',
}) => {
  const [pdfDoc, setPdfDoc] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [numPages, setNumPages] = useState(0);
  const [pageInput, setPageInput] = useState('1');
  const [zoomLevel, setZoomLevel] = useState(100);
  const [fitWidth, setFitWidth] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [loadingDoc, setLoadingDoc] = useState(false);
  const [renderingPage, setRenderingPage] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  const containerRef = useRef(null);
  const bodyRef = useRef(null);
  const canvasRef = useRef(null);
  const renderTaskRef = useRef(null);

  // Helper to ensure PDF.js script is loaded
  const ensurePdfJsLoaded = useCallback(() => {
    return new Promise((resolve, reject) => {
      if (window.pdfjsLib) {
        if (!window.pdfjsLib.GlobalWorkerOptions.workerSrc) {
          window.pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdfjs/pdf.worker.min.js';
        }
        return resolve(window.pdfjsLib);
      }

      const existingScript = document.querySelector('script[src="/pdfjs/pdf.min.js"]');
      if (existingScript) {
        existingScript.addEventListener('load', () => {
          window.pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdfjs/pdf.worker.min.js';
          resolve(window.pdfjsLib);
        });
        existingScript.addEventListener('error', () => reject(new Error('Failed to load local PDF.js engine')));
        return;
      }

      const script = document.createElement('script');
      script.src = '/pdfjs/pdf.min.js';
      script.async = true;
      script.onload = () => {
        if (window.pdfjsLib) {
          window.pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdfjs/pdf.worker.min.js';
          resolve(window.pdfjsLib);
        } else {
          reject(new Error('PDF.js library failed to initialize'));
        }
      };
      script.onerror = () => reject(new Error('Failed to load PDF viewer script'));
      document.body.appendChild(script);
    });
  }, []);

  // Fetch PDF binary data & load document into PDF.js
  const loadPdfDocument = useCallback(async () => {
    const fetchTarget = streamUrl || viewUrl;
    if (!fetchTarget) {
      setErrorMsg('No PDF source URL provided.');
      return;
    }

    try {
      setLoadingDoc(true);
      setErrorMsg(null);
      setPdfDoc(null);
      setNumPages(0);
      setCurrentPage(1);

      const pdfjs = await ensurePdfJsLoaded();

      const token = localStorage.getItem('tm_token');
      const res = await fetch(fetchTarget, {
        headers: {
          Accept: 'application/pdf, application/octet-stream, */*',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: 'include',
      });

      if (!res.ok) {
        let errDetails = `HTTP ${res.status}`;
        try {
          const jsonErr = await res.json();
          if (jsonErr.error) errDetails = jsonErr.error;
        } catch {}
        throw new Error(`Failed to retrieve PDF document (${errDetails}).`);
      }

      const arrayBuffer = await res.arrayBuffer();
      if (!arrayBuffer || arrayBuffer.byteLength === 0) {
        throw new Error('Received empty PDF data from storage.');
      }

      const loadingTask = pdfjs.getDocument({
        data: arrayBuffer,
        cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/cmaps/',
        cMapPacked: true,
      });

      const loadedDoc = await loadingTask.promise;
      setPdfDoc(loadedDoc);
      setNumPages(loadedDoc.numPages);
      setCurrentPage(1);
      setPageInput('1');
    } catch (err) {
      console.error('[PDF.js Document Load Error]:', err);
      setErrorMsg(err.message || 'Unable to load PDF document.');
    } finally {
      setLoadingDoc(false);
    }
  }, [streamUrl, viewUrl, ensurePdfJsLoaded]);

  // Load document whenever modal opens
  useEffect(() => {
    if (isOpen) {
      loadPdfDocument();
      setZoomLevel(100);
      setFitWidth(false);
    } else {
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
        renderTaskRef.current = null;
      }
      setPdfDoc(null);
    }
  }, [isOpen, loadPdfDocument]);

  // Render active page onto canvas
  const renderCurrentPage = useCallback(async () => {
    if (!pdfDoc || !canvasRef.current) return;

    try {
      setRenderingPage(true);
      const page = await pdfDoc.getPage(currentPage);
      const canvas = canvasRef.current;
      if (!canvas) return;
      const context = canvas.getContext('2d');

      // Cancel previous render if still in-flight
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
        renderTaskRef.current = null;
      }

      // Calculate scale (fitWidth vs manual zoomLevel)
      let targetScale = zoomLevel / 100;
      if (fitWidth && bodyRef.current) {
        const availableWidth = bodyRef.current.clientWidth - 48; // padding
        const unscaledViewport = page.getViewport({ scale: 1 });
        if (unscaledViewport.width > 0 && availableWidth > 0) {
          targetScale = availableWidth / unscaledViewport.width;
        }
      }

      // Device Pixel Ratio for ultra-crisp vector typography
      const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
      const viewport = page.getViewport({ scale: targetScale * dpr });

      canvas.width = viewport.width;
      canvas.height = viewport.height;
      canvas.style.width = `${viewport.width / dpr}px`;
      canvas.style.height = `${viewport.height / dpr}px`;

      const renderContext = {
        canvasContext: context,
        viewport,
      };

      const renderTask = page.render(renderContext);
      renderTaskRef.current = renderTask;

      await renderTask.promise;
      renderTaskRef.current = null;
    } catch (err) {
      if (err?.name !== 'RenderingCancelledException') {
        console.error('[PDF.js Page Render Error]:', err);
      }
    } finally {
      setRenderingPage(false);
    }
  }, [pdfDoc, currentPage, zoomLevel, fitWidth]);

  useEffect(() => {
    if (pdfDoc) {
      renderCurrentPage();
    }
  }, [pdfDoc, currentPage, zoomLevel, fitWidth, renderCurrentPage]);

  // Sync page input field
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

  // Keyboard controls
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
        setFitWidth(false);
        setZoomLevel((prev) => Math.min(300, prev + 25));
      } else if (e.key === '-' || e.key === '_') {
        e.preventDefault();
        setFitWidth(false);
        setZoomLevel((prev) => Math.max(50, prev - 25));
      } else if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        if (numPages && currentPage < numPages) {
          setCurrentPage((prev) => prev + 1);
        }
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        if (currentPage > 1) {
          setCurrentPage((prev) => prev - 1);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentPage, numPages, onClose]);

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

  // Page navigation handlers
  const handleNextPage = () => {
    if (numPages && currentPage < numPages) {
      setCurrentPage((prev) => prev + 1);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage((prev) => prev - 1);
    }
  };

  const handlePageInputSubmit = (e) => {
    e.preventDefault();
    const parsed = parseInt(pageInput, 10);
    if (!isNaN(parsed) && parsed >= 1 && (!numPages || parsed <= numPages)) {
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
        {/* Header & Controls Toolbar (NO DOWNLOAD BUTTONS) */}
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

          {/* Controls: Page Navigation & Zoom */}
          <div className="tm-pdf-controls-group">
            {/* Page Navigation */}
            <button
              type="button"
              className="tm-pdf-btn-icon"
              onClick={handlePrevPage}
              disabled={currentPage <= 1 || loadingDoc}
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
              <span className="tm-pdf-total-pages">
                of {numPages || '...'}
              </span>
            </form>

            <button
              type="button"
              className="tm-pdf-btn-icon"
              onClick={handleNextPage}
              disabled={!numPages || currentPage >= numPages || loadingDoc}
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
              disabled={zoomLevel <= 50 || loadingDoc}
              title="Zoom Out (-)"
            >
              <ZoomOut size={15} />
            </button>

            <span
              className="tm-pdf-zoom-label"
              onClick={handleResetZoom}
              title="Click to reset zoom to 100%"
            >
              {fitWidth ? 'Fit Width' : `${zoomLevel}%`}
            </span>

            <button
              type="button"
              className="tm-pdf-btn-icon"
              onClick={handleZoomIn}
              disabled={zoomLevel >= 300 || loadingDoc}
              title="Zoom In (+)"
            >
              <ZoomIn size={15} />
            </button>

            <button
              type="button"
              className={`tm-pdf-btn-icon ${fitWidth ? 'active' : ''}`}
              onClick={handleToggleFitWidth}
              title={fitWidth ? 'Exit Fit to Width' : 'Fit to Width'}
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

          {/* Actions: Fullscreen & Close (DOWNLOAD REMOVED) */}
          <div className="tm-pdf-modal-actions">
            <button
              type="button"
              className="tm-pdf-btn-icon"
              onClick={handleToggleFullscreen}
              title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen (F)'}
            >
              {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
            </button>

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

        {/* Viewer Body: PDF.js Canvas Page */}
        <div ref={bodyRef} className="tm-pdf-modal-body">
          {loadingDoc ? (
            <div className="tm-pdf-state-box">
              <RefreshCw size={36} className="tm-pdf-spinner" />
              <h4>Loading Protected PDF Document...</h4>
              <p>Fetching and decoding document pages securely in TradeMax...</p>
            </div>
          ) : errorMsg ? (
            <div className="tm-pdf-state-box">
              <AlertCircle size={36} color="#ef4444" />
              <h4>Unable to Render PDF</h4>
              <p>{errorMsg}</p>
              <button
                type="button"
                onClick={loadPdfDocument}
                className="tm-btn-primary"
                style={{ marginTop: 8 }}
              >
                Retry Loading
              </button>
            </div>
          ) : (
            <div className="tm-pdf-canvas-container">
              {renderingPage && (
                <div className="tm-pdf-render-overlay">
                  <RefreshCw size={24} className="tm-pdf-spinner" />
                </div>
              )}
              <canvas ref={canvasRef} className="tm-pdf-canvas" />
            </div>
          )}
        </div>

        {/* Bottom Status Bar */}
        <div className="tm-pdf-modal-footer">
          <span className="tm-pdf-footer-pill">
            <ShieldCheck size={14} />
            <span>Protected TradeMax Course Material · In-App Canvas Rendering</span>
          </span>
          <span className="tm-pdf-footer-hint">
            <span>Page {currentPage} of {numPages || 1} · Zoom: {fitWidth ? 'Fit' : `${zoomLevel}%`} · Use +/- to zoom · Arrows to change page</span>
          </span>
        </div>
      </div>
    </div>
  );
};
