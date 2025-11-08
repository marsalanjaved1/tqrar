// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

/**
 * Context manager for tracking notebook state and providing context to the AI Assistant
 */

import { INotebookTracker, NotebookPanel } from '@jupyterlab/notebook';
import { IContext } from './types';

/**
 * Options for creating a ContextManager
 */
export interface IContextManagerOptions {
  /**
   * The notebook tracker to monitor
   */
  notebookTracker: INotebookTracker;
}

/**
 * ContextManager class for tracking notebook state
 * 
 * This class monitors the active notebook and provides context information
 * to the AI Assistant, including the active notebook ID, list of open notebooks,
 * and kernel status.
 */
export class ContextManager {
  private _notebookTracker: INotebookTracker;
  private _activeNotebook: NotebookPanel | null = null;
  private _lastUpdateTime: number = 0;

  /**
   * Create a new ContextManager
   * 
   * @param options - Configuration options
   */
  constructor(options: IContextManagerOptions) {
    this._notebookTracker = options.notebookTracker;
    this._setupTracking();
  }

  /**
   * Set up notebook tracking by listening to the currentChanged signal
   * 
   * This method connects to the notebook tracker's currentChanged signal
   * to track when the active notebook changes.
   */
  private _setupTracking(): void {
    // Listen to notebook changes
    this._notebookTracker.currentChanged.connect(
      (_sender: INotebookTracker, notebook: NotebookPanel | null) => {
        this._activeNotebook = notebook;
        this._lastUpdateTime = Date.now();
      }
    );

    // Set initial active notebook
    this._activeNotebook = this._notebookTracker.currentWidget;
    this._lastUpdateTime = Date.now();
  }

  /**
   * Get the currently active notebook panel
   * 
   * @returns The active NotebookPanel or null if no notebook is active
   */
  getActiveNotebook(): NotebookPanel | null {
    return this._activeNotebook;
  }

  /**
   * Get the ID of the currently active notebook
   * 
   * @returns The active notebook ID or null if no notebook is active
   */
  getActiveNotebookId(): string | null {
    return this._activeNotebook?.id ?? null;
  }

  /**
   * Get all open notebook panels
   * 
   * @returns Array of all open NotebookPanel instances
   */
  getOpenNotebooks(): NotebookPanel[] {
    // Use filter to get all notebooks (filter with always-true predicate)
    return this._notebookTracker.filter(() => true);
  }

  /**
   * Get the current context for the AI Assistant
   * 
   * This method returns a context object containing:
   * - Active notebook ID
   * - List of open notebooks with IDs, paths, and names
   * - Kernel status for the active notebook
   * 
   * The context is updated within 500ms of notebook switches as tracked
   * by the _lastUpdateTime property.
   * 
   * @returns IContext object with current notebook and kernel state
   */
  getContext(): IContext {
    const openNotebooks = this.getOpenNotebooks().map(notebook => ({
      id: notebook.id,
      path: notebook.context.path,
      name: notebook.title.label
    }));

    // Get kernel status from active notebook if available
    let kernelStatus: string | undefined;
    if (this._activeNotebook?.sessionContext?.session?.kernel) {
      kernelStatus = this._activeNotebook.sessionContext.session.kernel.status;
    }

    return {
      activeNotebookId: this.getActiveNotebookId(),
      openNotebooks,
      kernelStatus
    };
  }

  /**
   * Get the time (in milliseconds) since the last context update
   * 
   * This can be used to verify that context updates happen within 500ms
   * of notebook switches.
   * 
   * @returns Milliseconds since last update
   */
  getTimeSinceLastUpdate(): number {
    return Date.now() - this._lastUpdateTime;
  }

  /**
   * Dispose of the context manager and clean up resources
   */
  dispose(): void {
    // The signal connections will be automatically cleaned up
    // when the tracker is disposed
    this._activeNotebook = null;
  }
}
