import React from 'react';

interface ResizeHandlesProps {
  isMinimized: boolean;
  onResizeStart: (e: React.MouseEvent, direction: 'nw' | 'ne' | 'sw' | 'se' | 'n' | 's' | 'e' | 'w') => void;
}

export function ResizeHandles({ isMinimized, onResizeStart }: ResizeHandlesProps) {
  if (isMinimized) return null;

  return (
    <>
      {/* Bottom-right resize handle */}
      <div
        className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize bg-transparent z-50"
        data-resize-handle="true"
        data-resize-direction="se"
        onMouseDown={(e) => {
          e.stopPropagation();
          e.preventDefault();
          onResizeStart(e, 'se');
        }}
      />
      {/* Bottom-left resize handle */}
      <div
        className="absolute bottom-0 left-0 w-4 h-4 cursor-sw-resize bg-transparent z-50"
        data-resize-handle="true"
        data-resize-direction="sw"
        onMouseDown={(e) => {
          e.stopPropagation();
          e.preventDefault();
          onResizeStart(e, 'sw');
        }}
      />
      {/* Top-right resize handle */}
      <div
        className="absolute top-0 right-0 w-4 h-4 cursor-ne-resize bg-transparent z-50"
        data-resize-handle="true"
        data-resize-direction="ne"
        onMouseDown={(e) => {
          e.stopPropagation();
          e.preventDefault();
          onResizeStart(e, 'ne');
        }}
      />
      {/* Top-left resize handle */}
      <div
        className="absolute top-0 left-0 w-4 h-4 cursor-nw-resize bg-transparent z-50"
        data-resize-handle="true"
        data-resize-direction="nw"
        onMouseDown={(e) => {
          e.stopPropagation();
          e.preventDefault();
          onResizeStart(e, 'nw');
        }}
      />
      {/* Right resize handle */}
      <div
        className="absolute top-1/2 right-0 w-2 h-12 cursor-e-resize bg-transparent transform -translate-y-1/2 z-50"
        data-resize-handle="true"
        data-resize-direction="e"
        onMouseDown={(e) => {
          e.stopPropagation();
          e.preventDefault();
          onResizeStart(e, 'e');
        }}
      />
      {/* Left resize handle */}
      <div
        className="absolute top-1/2 left-0 w-2 h-12 cursor-w-resize bg-transparent transform -translate-y-1/2 z-50"
        data-resize-handle="true"
        data-resize-direction="w"
        onMouseDown={(e) => {
          e.stopPropagation();
          e.preventDefault();
          onResizeStart(e, 'w');
        }}
      />
      {/* Bottom resize handle */}
      <div
        className="absolute bottom-0 left-1/2 w-12 h-2 cursor-s-resize bg-transparent transform -translate-x-1/2 z-50"
        data-resize-handle="true"
        data-resize-direction="s"
        onMouseDown={(e) => {
          e.stopPropagation();
          e.preventDefault();
          onResizeStart(e, 's');
        }}
      />
      {/* Top resize handle */}
      <div
        className="absolute top-0 left-1/2 w-12 h-2 cursor-n-resize bg-transparent transform -translate-x-1/2 z-50"
        data-resize-handle="true"
        data-resize-direction="n"
        onMouseDown={(e) => {
          e.stopPropagation();
          e.preventDefault();
          onResizeStart(e, 'n');
        }}
      />
    </>
  );
}
