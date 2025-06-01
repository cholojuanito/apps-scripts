// TypeScript interfaces for HSA Receipt Uploader

interface HSAReceiptRow {
  paymentDate: Date;
  patient: string;
  service: string;
  cost: number;
  company: string;
  hsaApproved: boolean;
  receiptUploaded: boolean;
  paidOut: boolean;
  rowIndex: number;
  year: number;
}

interface FileUploadData {
  filename: string;
  content: string; // Base64 encoded file content
  mimeType: string;
  row: HSAReceiptRow;
}

// Serializable version for client-server communication
interface SerializableHSAReceiptRow {
  paymentDate: string; // ISO string instead of Date
  patient: string;
  service: string;
  cost: number;
  company: string;
  hsaApproved: boolean;
  receiptUploaded: boolean;
  paidOut: boolean;
  rowIndex: number;
  year: number;
}

interface DriveConfig {
  rootFolderName: string;
  basePath: string; // "financial/hsa-receipts"
  computersFolderName?: string; // "Computers/My Computers"
}

interface FolderStructure {
  rootFolder: GoogleAppsScript.Drive.Folder;
  yearFolder: GoogleAppsScript.Drive.Folder;
  statusFolder: GoogleAppsScript.Drive.Folder; // "paid-out" or "to-be-paid-out"
  typeFolder: GoogleAppsScript.Drive.Folder; // "receipts" or "invoices"
}

enum FileType {
  RECEIPT = 'receipt',
  INVOICE = 'invoice'
}

enum PayoutStatus {
  PAID_OUT = 'paid-out',
  TO_BE_PAID_OUT = 'to-be-paid-out'
}

// Column indices in the spreadsheet (0-based)
enum ColumnIndex {
  PAYMENT_DATE = 0,
  PATIENT = 1,
  SERVICE = 2,
  COST = 3,
  COMPANY = 4,
  HSA_APPROVED = 5,
  RECEIPT_UPLOADED = 6,
  PAID_OUT = 7
}