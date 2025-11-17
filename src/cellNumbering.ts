/**
 * Cell numbering manager
 * Adds visual cell numbers to notebook cells for easy reference
 */

import { INotebookTracker } from '@jupyterlab/notebook';
import { Cell } from '@jupyterlab/cells';

export class CellNumberingManager {
  private _notebookTracker: INotebookTracker;
  private _isEnabled: boolean = true;

  constructor(notebookTracker: INotebookTracker) {
    this._notebookTracker = notebookTracker;
    this._setupTracking();
  }

  /**
   * Enable or disable cell numbering
   */
  setEnabled(enabled: boolean): void {
    this._isEnabled = enabled;
    if (enabled) {
      this._updateAllCells();
    } else {
      this._clearAllCells();
    }
  }

  /**
   * Get cell number for a specific cell
   */
  getCellNumber(cell: Cell): number | null {
    const notebook = this._notebookTracker.currentWidget?.content;
    if (!notebook) return null;

    const index = notebook.widgets.indexOf(cell);
    return index >= 0 ? index : null;
  }

  /**
   * Get cell by number
   */
  getCellByNumber(cellNumber: number): Cell | null {
    const notebook = this._notebookTracker.currentWidget?.content;
    if (!notebook) return null;

    return notebook.widgets[cellNumber] || null;
  }

  /**
   * Setup tracking for notebook changes
   */
  private _setupTracking(): void {
    // Update cell numbers when notebook changes
    this._notebookTracker.currentChanged.connect(() => {
      this._updateAllCells();
    });

    // Update when cells are added/removed/moved
    this._notebookTracker.widgetAdded.connect((sender, panel) => {
      const notebook = panel.content;
      
      notebook.model?.cells.changed.connect(() => {
        this._updateAllCells();
      });

      // Initial update
      this._updateAllCells();
    });
  }

  /**
   * Update cell numbers for all cells in current notebook
   */
  private _updateAllCells(): void {
    if (!this._isEnabled) return;

    const notebook = this._notebookTracker.currentWidget?.content;
    if (!notebook) return;

    notebook.widgets.forEach((cell, index) => {
      cell.node.setAttribute('data-cell-number', `[${index}]`);
    });
  }

  /**
   * Clear cell numbers from all cells
   */
  private _clearAllCells(): void {
    const notebook = this._notebookTracker.currentWidget?.content;
    if (!notebook) return;

    notebook.widgets.forEach(cell => {
      cell.node.removeAttribute('data-cell-number');
    });
  }
}
