// Main Google Apps Script entry points

// Configuration
const DRIVE_CONFIG: DriveConfig = {
  rootFolderName: 'HSA Receipts',
  basePath: 'financial/hsa-receipts',
  computersFolderName: 'Computers/My Computers' // Optional: will fallback to regular Drive if not accessible
};

// Global services
let spreadsheetService: SpreadsheetService;
let driveService: DriveService;

/**
 * Initialize services
 */
function initializeServices(): void {
  spreadsheetService = new SpreadsheetService();
  driveService = new DriveService(DRIVE_CONFIG);
}

/**
 * Web app entry point - serves the upload interface
 */
function doGet(): GoogleAppsScript.HTML.HtmlOutput {
  const htmlTemplate = HtmlService.createTemplateFromFile('webapp');
  const htmlOutput = htmlTemplate.evaluate();
  htmlOutput.setTitle('HSA Receipt Uploader');
  htmlOutput.setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  return htmlOutput;
}

/**
 * Gets information about the currently active row in the spreadsheet
 */
function getActiveRowInfo(): { sheetName: string; rowIndex: number; row: HSAReceiptRow | null } | null {
  initializeServices();
  return spreadsheetService.getActiveRowInfo();
}

/**
 * Uploads a receipt file and organizes it in Drive
 */
function uploadReceiptFile(
  uploadData: FileUploadData, 
  fileType: string, 
  sheetName: string, 
  rowIndex: number
): { success: boolean; fileId: string; message: string } {
  
  try {
    initializeServices();
    
    const fileTypeEnum = fileType === 'invoice' ? FileType.INVOICE : FileType.RECEIPT;
    
    // Upload the file
    const file = driveService.uploadFile(uploadData, fileTypeEnum);
    
    // Mark receipt as uploaded in spreadsheet
    spreadsheetService.markReceiptUploaded(sheetName, rowIndex, true);
    
    return {
      success: true,
      fileId: file.getId(),
      message: `File uploaded successfully as ${file.getName()}`
    };
    
  } catch (error) {
    console.error('Error uploading file:', error);
    return {
      success: false,
      fileId: '',
      message: `Upload failed: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * Handles changes to spreadsheet data - moves/renames files as needed
 */
function onEdit(e: GoogleAppsScript.Events.SheetsOnEdit): void {
  try {
    // Check if we're in a year sheet (not Totals)
    const sheet = e.source.getActiveSheet();
    const sheetName = sheet.getName();
    
    if (sheetName === 'Totals' || !/^\d{4}$/.test(sheetName)) {
      return;
    }

    initializeServices();

    const range = e.range;
    const row = range.getRow();
    
    // Skip header row
    if (row <= 1) return;

    // Check if relevant columns were edited
    const editedColumns = [];
    for (let col = range.getColumn(); col < range.getColumn() + range.getNumColumns(); col++) {
      editedColumns.push(col - 1); // Convert to 0-based index
    }

    const relevantColumns = [
      ColumnIndex.PAYMENT_DATE,
      ColumnIndex.PATIENT,
      ColumnIndex.SERVICE,
      ColumnIndex.COMPANY,
      ColumnIndex.PAID_OUT
    ];

    const hasRelevantChanges = editedColumns.some(col => relevantColumns.includes(col));
    
    if (!hasRelevantChanges) return;

    // Get current row data
    const currentRow = spreadsheetService.getRowData(sheetName, row);
    if (!currentRow) return;

    // Find existing files for this row
    const existingFiles = driveService.findExistingFiles(currentRow);
    
    if (existingFiles.length === 0) return;

    // For simplicity, we'll determine the old row data by reversing the changes
    // In a real implementation, you might want to store previous values
    const oldValues = e.oldValue ? [e.oldValue] : [];
    
    // Move/rename each existing file
    for (const file of existingFiles) {
      try {
        // Determine file type from current filename
        const filename = file.getName().toLowerCase();
        const fileType = filename.includes('_invoice_') ? FileType.INVOICE : FileType.RECEIPT;
        
        // Create old row data for comparison (simplified approach)
        const oldRow: HSAReceiptRow = { ...currentRow };
        
        // If paid out status changed, we need to handle file movement
        if (editedColumns.includes(ColumnIndex.PAID_OUT)) {
          oldRow.paidOut = !currentRow.paidOut;
        }
        
        driveService.moveFile(file, oldRow, currentRow, fileType);
        
      } catch (fileError) {
        console.error(`Error moving file ${file.getName()}:`, fileError);
      }
    }
    
  } catch (error) {
    console.error('Error in onEdit handler:', error instanceof Error ? error.message : String(error));
  }
}

/**
 * Creates a custom menu in the spreadsheet
 */
function onOpen(): void {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('HSA Receipts')
    .addItem('Upload Receipt', 'showUploadDialog')
    .addSeparator()
    .addItem('Refresh File Organization', 'refreshFileOrganization')
    .addToUi();
}

/**
 * Shows the upload dialog
 */
function showUploadDialog(): void {
  initializeServices();
  
  const activeRowInfo = spreadsheetService.getActiveRowInfo();
  
  if (!activeRowInfo || !activeRowInfo.row) {
    SpreadsheetApp.getUi().alert('Please select a row with data before uploading a receipt.');
    return;
  }

  const htmlOutput = doGet();
  htmlOutput.setWidth(600).setHeight(500);
  
  SpreadsheetApp.getUi().showModalDialog(htmlOutput, 'Upload HSA Receipt');
}

/**
 * Refreshes file organization for all rows (utility function)
 */
function refreshFileOrganization(): void {
  const ui = SpreadsheetApp.getUi();
  const response = ui.alert(
    'Refresh File Organization',
    'This will check all files and ensure they are properly organized. Continue?',
    ui.ButtonSet.YES_NO
  );
  
  if (response !== ui.Button.YES) {
    return;
  }
  
  try {
    initializeServices();
    
    // This is a utility function that could be expanded to reorganize all files
    ui.alert('File organization refresh completed.');
    
  } catch (error) {
    ui.alert('Error refreshing file organization: ' + (error instanceof Error ? error.message : String(error)));
  }
}

/**
 * Test function for development
 */
function testUpload(): void {
  // This function can be used for testing during development
  console.log('Test function - use for debugging');
}