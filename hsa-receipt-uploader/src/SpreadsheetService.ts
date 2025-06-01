class SpreadsheetService {
  private spreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet;

  constructor(spreadsheetId?: string) {
    if (spreadsheetId) {
      this.spreadsheet = SpreadsheetApp.openById(spreadsheetId);
    } else {
      this.spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
      console.log(`Using spreadsheet ${this.spreadsheet.getName()}`);
    }
  }

  /**
   * Gets HSA receipt data from a specific row
   */
  getRowData(sheetName: string, rowIndex: number): HSAReceiptRow | null {
    try {
      const sheet = this.spreadsheet.getSheetByName(sheetName);
      if (!sheet) {
        throw new Error(`Sheet ${sheetName} not found`);
      }

      const range = sheet.getRange(rowIndex, 1, 1, 8); // Get all 8 columns
      const values = range.getValues()[0];

      if (!values[ColumnIndex.PAYMENT_DATE]) {
        return null; // Empty row
      }

      const paymentDate = new Date(values[ColumnIndex.PAYMENT_DATE]);
      const year = paymentDate.getFullYear();

      return {
        paymentDate,
        patient: values[ColumnIndex.PATIENT]?.toString() || '',
        service: values[ColumnIndex.SERVICE]?.toString() || '',
        cost: parseFloat(values[ColumnIndex.COST]?.toString().replace(/[$,]/g, '') || '0'),
        company: values[ColumnIndex.COMPANY]?.toString() || '',
        hsaApproved: this.parseBooleanCell(values[ColumnIndex.HSA_APPROVED]),
        receiptUploaded: this.parseBooleanCell(values[ColumnIndex.RECEIPT_UPLOADED]),
        paidOut: this.parseBooleanCell(values[ColumnIndex.PAID_OUT]),
        rowIndex,
        year
      };
    } catch (error) {
      console.error(`Error getting row data: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }
  }

  /**
   * Updates the "Receipt Uploaded" status for a row
   */
  markReceiptUploaded(sheetName: string, rowIndex: number, uploaded: boolean = true): void {
    try {
      const sheet = this.spreadsheet.getSheetByName(sheetName);
      if (!sheet) {
        throw new Error(`Sheet ${sheetName} not found`);
      }

      const cell = sheet.getRange(rowIndex, ColumnIndex.RECEIPT_UPLOADED + 1);
      cell.setValue(uploaded ? 'Yes' : 'No');
      
      console.log(`Updated receipt uploaded status for row ${rowIndex} to ${uploaded ? 'Yes' : 'No'}`);
    } catch (error) {
      console.error(`Error updating receipt uploaded status: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Gets the active cell information when user right-clicks
   */
  getActiveRowInfo(): { sheetName: string; rowIndex: number; row: HSAReceiptRow | null } | null {
    try {
      const activeSheet = this.spreadsheet.getActiveSheet();
      const activeRange = this.spreadsheet.getActiveRange();
      
      if (!activeSheet || !activeRange) {
        console.log('No active sheet or range found')
        return null;
      }

      const sheetName = activeSheet.getName();
      const rowIndex = activeRange.getRow();

      // Skip if it's the header row or the "Totals" sheet
      if (rowIndex <= 1 || sheetName === 'Totals') {
        console.log('Skipping header row or "Totals" sheet')
        return null;
      }

      const row = this.getRowData(sheetName, rowIndex);
      
      return {
        sheetName,
        rowIndex,
        row
      };
    } catch (error) {
      console.error(`Error getting active row info: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }
  }

  /**
   * Parses boolean values from spreadsheet cells
   */
  private parseBooleanCell(value: any): boolean {
    if (typeof value === 'boolean') {
      return value;
    }
    if (typeof value === 'string') {
      return value.toLowerCase() === 'yes' || value.toLowerCase() === 'true';
    }
    return false;
  }
}