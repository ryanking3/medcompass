"use client";

import { Document, Page, pdfjs } from "react-pdf";

pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();

type PdfContinuousViewerProps = {
  file: string;
  pages: number[];
  zoom: number;
  renderError: string;
  onLoadSuccess: (metadata: { numPages: number }) => void;
  onLoadError: (message: string) => void;
  onPageRenderError: (message: string) => void;
  registerPageRef: (pageNumber: number, element: HTMLDivElement | null) => void;
};

export default function PdfContinuousViewer({ file, pages, zoom, renderError, onLoadSuccess, onLoadError, onPageRenderError, registerPageRef }: PdfContinuousViewerProps) {
  return (
    <>
      <Document
        className="pdf-document"
        file={file}
        loading={<div className="reader-loading reader-inline"><div /><h1>Rendering your PDF</h1><p>Preparing the page canvas and selectable text layer.</p></div>}
        error={<div className="reader-loading reader-error reader-inline"><span>!</span><h1>Couldn’t render this PDF</h1><p>{renderError || "The browser could not render this PDF preview. You can still open it in a new tab."}</p></div>}
        onLoadSuccess={onLoadSuccess}
        onLoadError={(loadError) => onLoadError(loadError.message || "The PDF renderer failed to load this file.")}
      >
        {pages.map((pageNumber) => (
          <div
            key={pageNumber}
            id={`pdf-page-${pageNumber}`}
            className="pdf-page-wrap"
            ref={(element) => registerPageRef(pageNumber, element)}
          >
            <span className="pdf-page-label">Page {pageNumber}</span>
            <Page
              className="pdf-page"
              pageNumber={pageNumber}
              scale={zoom / 100}
              loading={<div className="reader-page-loading">Loading page {pageNumber}…</div>}
              onRenderError={(pageError) => onPageRenderError(pageError.message || `Page ${pageNumber} could not be rendered.`)}
              renderAnnotationLayer
              renderTextLayer
            />
          </div>
        ))}
      </Document>
      <style jsx>{`
        :global(.pdf-document) {
          display: grid;
          justify-items: center;
          gap: 28px;
        }

        .pdf-page-wrap {
          display: grid;
          justify-items: center;
          gap: 8px;
          scroll-margin-top: 18px;
        }

        .pdf-page-label {
          color: #6a7670;
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: .08em;
        }

        :global(.pdf-page) {
          overflow: hidden;
          background: #fffefa;
          box-shadow: 0 10px 28px rgba(28, 44, 39, .16);
        }

        :global(.pdf-page canvas),
        :global(.pdf-page .react-pdf__Page__textContent),
        :global(.pdf-page .react-pdf__Page__annotations) {
          border-radius: 1px;
        }

        .reader-page-loading {
          padding: 34px;
          color: #66756f;
          font-size: 12px;
        }

        .reader-loading {
          display: grid;
          place-items: center;
          align-content: center;
          padding: 30px;
          text-align: center;
        }

        .reader-inline {
          min-height: 420px;
        }

        .reader-loading > div {
          width: 30px;
          height: 30px;
          border: 3px solid #b9d0be;
          border-top-color: #437967;
          border-radius: 50%;
          animation: spin 900ms linear infinite;
        }

        .reader-loading h1 {
          margin: 17px 0 7px;
          color: #314340;
          font: 24px Georgia, serif;
          font-weight: 500;
        }

        .reader-loading p {
          max-width: 300px;
          margin: 0;
          color: #687771;
          font-size: 12px;
          line-height: 1.5;
        }

        .reader-error > span {
          display: grid;
          place-items: center;
          width: 42px;
          height: 42px;
          border-radius: 50%;
          color: #9c4b4b;
          background: #fae8e7;
          font: 22px Georgia, serif;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
}
