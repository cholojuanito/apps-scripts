class DriveService {
  private config: DriveConfig;

  constructor(config: DriveConfig) {
    this.config = config;
  }

  /**
   * Creates the complete folder structure for organizing HSA receipts
   */
  createFolderStructure(row: HSAReceiptRow, fileType: FileType): FolderStructure {
    const rootFolder = this.getRootFolder();
    const yearFolder = this.getOrCreateFolder(rootFolder, row.year.toString());
    const statusFolder = this.getOrCreateFolder(
      yearFolder, 
      row.paidOut ? PayoutStatus.PAID_OUT : PayoutStatus.TO_BE_PAID_OUT
    );
    const typeFolder = this.getOrCreateFolder(
      statusFolder, 
      fileType === FileType.RECEIPT ? 'receipts' : 'invoices'
    );

    return {
      rootFolder,
      yearFolder,
      statusFolder,
      typeFolder
    };
  }

  /**
   * Generates filename based on row data and file type
   */
  generateFilename(row: HSAReceiptRow, fileType: FileType, extension: string): string {
    const dateStr = Utilities.formatDate(row.paymentDate, Session.getScriptTimeZone(), 'yyyy-MM-dd');
    const patientName = row.patient.toLowerCase().replace(/\s+/g, '-');
    const companyName = row.company.toLowerCase().replace(/\s+/g, '-');
    const serviceName = row.service.toLowerCase().replace(/\s+/g, '-');
    
    return `${dateStr}_${patientName}_${fileType}_${companyName}_${serviceName}.${extension}`;
  }

  /**
   * Uploads a file to the appropriate Drive folder
   */
  uploadFile(uploadData: FileUploadData, fileType: FileType): GoogleAppsScript.Drive.File {
    const folderStructure = this.createFolderStructure(uploadData.row, fileType);
    const extension = this.getFileExtension(uploadData.filename);
    const generatedFilename = this.generateFilename(uploadData.row, fileType, extension);
    
    // Convert base64 to blob
    const blob = Utilities.newBlob(
      Utilities.base64Decode(uploadData.content),
      uploadData.mimeType,
      generatedFilename
    );

    const file = folderStructure.typeFolder.createFile(blob);
    
    console.log(`File uploaded: ${file.getName()} to ${folderStructure.typeFolder.getName()}`);
    return file;
  }

  /**
   * Moves a file when row data changes (e.g., paid out status changes)
   */
  moveFile(file: GoogleAppsScript.Drive.File, oldRow: HSAReceiptRow, newRow: HSAReceiptRow, fileType: FileType): GoogleAppsScript.Drive.File {
    // Check if the file needs to be moved or renamed
    const oldStructure = this.createFolderStructure(oldRow, fileType);
    const newStructure = this.createFolderStructure(newRow, fileType);
    
    const oldExtension = this.getFileExtension(file.getName());
    const newFilename = this.generateFilename(newRow, fileType, oldExtension);
    
    // Move to new folder if path changed
    if (oldStructure.typeFolder.getId() !== newStructure.typeFolder.getId()) {
      file.getParents().next().removeFile(file);
      newStructure.typeFolder.addFile(file);
      console.log(`File moved from ${oldStructure.typeFolder.getName()} to ${newStructure.typeFolder.getName()}`);
    }
    
    // Rename if filename changed
    if (file.getName() !== newFilename) {
      file.setName(newFilename);
      console.log(`File renamed to ${newFilename}`);
    }

    return file;
  }

  /**
   * Gets or creates the root folder for HSA receipts
   */
  private getRootFolder(): GoogleAppsScript.Drive.Folder {
    // Try to find in "Computers/My Computers" first if specified
    if (this.config.computersFolderName) {
      try {
        const computersFolder = this.findFolderByPath(this.config.computersFolderName);
        if (computersFolder) {
          return this.getOrCreateFolderPath(computersFolder, this.config.basePath);
        }
      } catch (e) {
        console.warn(`Could not access ${this.config.computersFolderName}, falling back to regular Drive`);
      }
    }

    // Fallback to regular Drive root
    const driveRoot = DriveApp.getRootFolder();
    return this.getOrCreateFolderPath(driveRoot, this.config.basePath);
  }

  /**
   * Gets or creates a folder by name within a parent folder
   */
  private getOrCreateFolder(parentFolder: GoogleAppsScript.Drive.Folder, name: string): GoogleAppsScript.Drive.Folder {
    const folders = parentFolder.getFoldersByName(name);
    if (folders.hasNext()) {
      return folders.next();
    }
    return parentFolder.createFolder(name);
  }

  /**
   * Gets or creates a folder path within a parent folder
   */
  private getOrCreateFolderPath(parentFolder: GoogleAppsScript.Drive.Folder, path: string): GoogleAppsScript.Drive.Folder {
    const pathParts = path.split('/').filter(part => part.length > 0);
    let currentFolder = parentFolder;
    
    for (const part of pathParts) {
      currentFolder = this.getOrCreateFolder(currentFolder, part);
    }
    
    return currentFolder;
  }

  /**
   * Finds a folder by path from Drive root
   */
  private findFolderByPath(path: string): GoogleAppsScript.Drive.Folder | null {
    try {
      const pathParts = path.split('/').filter(part => part.length > 0);
      let currentFolder = DriveApp.getRootFolder();
      
      for (const part of pathParts) {
        const folders = currentFolder.getFoldersByName(part);
        if (!folders.hasNext()) {
          return null;
        }
        currentFolder = folders.next();
      }
      
      return currentFolder;
    } catch (e) {
      console.error(`Error finding folder ${path}: ${e instanceof Error ? e.message : String(e)}`);
      return null;
    }
  }

  /**
   * Extracts file extension from filename
   */
  private getFileExtension(filename: string): string {
    const lastDot = filename.lastIndexOf('.');
    return lastDot === -1 ? '' : filename.substring(lastDot + 1).toLowerCase();
  }

  /**
   * Finds existing files for a given row (for file management)
   */
  findExistingFiles(row: HSAReceiptRow): GoogleAppsScript.Drive.File[] {
    const files: GoogleAppsScript.Drive.File[] = [];
    
    // Search in both receipt and invoice folders, and both paid/unpaid statuses
    for (const fileType of [FileType.RECEIPT, FileType.INVOICE]) {
      for (const isPaidOut of [false, true]) {
        const searchRow = { ...row, paidOut: isPaidOut };
        try {
          const structure = this.createFolderStructure(searchRow, fileType);
          const folderFiles = structure.typeFolder.getFiles();
          
          while (folderFiles.hasNext()) {
            const file = folderFiles.next();
            const filename = file.getName();
            
            // Check if filename matches the pattern for this row
            if (this.isFileForRow(filename, row)) {
              files.push(file);
            }
          }
        } catch (e) {
          // Folder might not exist yet
          continue;
        }
      }
    }
    
    return files;
  }

  /**
   * Checks if a filename belongs to a specific row based on pattern matching
   */
  private isFileForRow(filename: string, row: HSAReceiptRow): boolean {
    const dateStr = Utilities.formatDate(row.paymentDate, Session.getScriptTimeZone(), 'yyyy-MM-dd');
    const patientName = row.patient.toLowerCase().replace(/\s+/g, '-');
    const companyName = row.company.toLowerCase().replace(/\s+/g, '-');
    const serviceName = row.service.toLowerCase().replace(/\s+/g, '-');
    
    const expectedPattern = `${dateStr}_${patientName}_`;
    return filename.toLowerCase().startsWith(expectedPattern) &&
           filename.toLowerCase().includes(`_${companyName}_`) &&
           filename.toLowerCase().includes(`_${serviceName}`);
  }
}