import * as React from 'react';
/** Drag-and-drop video upload target — the entry point to Vault's core upload flow. */
export interface FileDropzoneProps {
  state?: 'idle' | 'dragging' | 'uploading' | 'error';
  /** Shown in mono type while uploading */
  fileName?: string;
  /** 0-100, shown while state="uploading" */
  progress?: number;
  errorText?: string;
  /** Accepted file types, as on a native input. Defaults to video/*. */
  accept?: string;
  multiple?: boolean;
  disabled?: boolean;
  /**
   * Receives files from a drop and from the browse dialog alike. The component
   * owns its file input, so consumers never wire their own.
   */
  onFiles?: (files: File[]) => void;
  /** Optional hook fired before the browse dialog opens. */
  onBrowse?: () => void;
  style?: React.CSSProperties;
}
export declare function FileDropzone(props: FileDropzoneProps): JSX.Element;
