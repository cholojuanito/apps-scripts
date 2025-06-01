# HSA Receipt Uploader

A Google Apps Script web application for managing HSA receipts with automatic file organization in Google Drive.

## Features

- **Web App Interface**: Easy-to-use upload interface accessible from Google Sheets
- **Automatic File Organization**: Files are organized in Drive folders by year, payout status, and type
- **Smart File Naming**: Files are automatically renamed with a consistent format
- **Dynamic File Management**: Files are moved/renamed when spreadsheet data changes
- **Spreadsheet Integration**: Works with your existing HSA tracking spreadsheet

## File Organization Structure

Files are organized in Google Drive with the following structure:
```
financial/hsa-receipts/
├── paid-out/
│   ├── 2022/
│   │   ├── receipts/
│   │   └── invoices/
│   └── 2023/
│       ├── receipts/
│       └── invoices/
└── to-be-paid-out/
    ├── 2022/
    │   ├── receipts/
    │   └── invoices/
    └── 2023/
        ├── receipts/
        └── invoices/
```

## File Naming Convention

Files are automatically named using this format:
`yyyy-mm-dd_patient-name_receipt-or-invoice_company-name_service-name.extension`

Example: `2022-10-02_john_receipt_family-medicine_copay.pdf`

## Setup Instructions

### 1. Install clasp globally
```bash
npm install -g @google/clasp
```

### 2. Install project dependencies
```bash
cd hsa-receipt-uploader
npm install
```

### 3. Build the project
```bash
npm run build
```

### 4. Login to Google Apps Script CLI
```bash
clasp login
```

### 5. Create container-bound script in your spreadsheet

Since this is a container-bound script (attached to your spreadsheet), you need to create it directly in Google Sheets:

1. **Open your HSA tracking spreadsheet** in Google Sheets
2. Click **Extensions > Apps Script**
3. This creates a new container-bound Apps Script project
4. **Copy the script ID** from the URL (it will look like: `https://script.google.com/d/SCRIPT_ID_HERE/edit`)

### 6. Clone the existing script project
```bash
clasp clone SCRIPT_ID_HERE
```

This will create a `.clasp.json` file with your script ID.

### 7. Copy the built files to the cloned project

The `clasp clone` command creates a separate folder. You need to copy your built files:

```bash
# Copy built files to the cloned project directory
cp dist/* /path/to/cloned/project/
cp appsscript.json /path/to/cloned/project/
```

Alternatively, update your `.clasp.json` to point to the `dist` directory:
```json
{
  "scriptId": "YOUR_SCRIPT_ID",
  "rootDir": "./dist"
}
```

### 8. Push project changes
```bash
npm run build && npm run push
```
If you make changes to the appsscript.json file you will need to use `clasp push -f` to force the update. A likely indicator this is an issue is when `npm run push` hangs for a while.

### 10. Set up triggers and permissions

In the Google Apps Script editor:
1. Go to "Triggers" in the left sidebar
2. Add a trigger for `onEdit` function:
   - Choose function: `onEdit`
   - Event source: From spreadsheet
   - Event type: On edit
3. Add a trigger for `onOpen` function:
   - Choose function: `onOpen`
   - Event source: From spreadsheet
   - Event type: On open

### 11. Deploy as web app

1. Click "Deploy" > "New deployment"
2. Choose type: "Web app"
3. Set execute as: "Me"
4. Set access: "Anyone with Google account" (or more restrictive as needed)
5. Click "Deploy"

## Usage

### Uploading Receipts

1. **Select a row** in your HSA spreadsheet (any year sheet, not the Totals sheet)
2. **Right-click** or use the "HSA Receipts" menu > "Upload Receipt"
3. **Choose file type**: Receipt or Invoice
4. **Select file**: PDF, JPG, or PNG
5. **Click Upload**: File will be automatically organized and the "Receipt Uploaded" column updated

### Menu Options

The script adds an "HSA Receipts" menu to your spreadsheet with:
- **Upload Receipt**: Opens the upload dialog
- **Refresh File Organization**: Utility to reorganize existing files

### Automatic File Management

When you change data in the spreadsheet, files are automatically:
- **Moved** between paid-out/to-be-paid-out folders when "Paid Out" status changes
- **Renamed** when patient, company, service, or date information changes

## Configuration

You can modify the Drive folder structure by editing the `DRIVE_CONFIG` in `src/Code.ts`:

```typescript
const DRIVE_CONFIG: DriveConfig = {
  rootFolderName: 'HSA Receipts',
  basePath: 'financial/hsa-receipts',
  computersFolderName: 'Computers/My Computers' // Optional
};
```

## Development Commands

- `npm run build` - Compile TypeScript to JavaScript
- `npm run watch` - Watch for changes and auto-compile
- `npm run push` - Push to Google Apps Script (requires clasp login)
- `npm run deploy` - Build and push to Google Apps Script
- `npm run open` - Open the script in Google Apps Script editor

## Troubleshooting

### Permission Issues
- Ensure the script has permissions to access Drive and Sheets
- Check that you've authorized the necessary OAuth scopes

### File Upload Issues
- Verify file types are supported (PDF, JPG, PNG)
- Check file size limits (Google Apps Script has upload size limits)

### Folder Access Issues
- If using "Computers/My Computers", ensure it's accessible
- The script will fall back to regular Drive root if needed

### clasp Issues
- Make sure you're using the global clasp installation
- Ensure you've logged in with `clasp login`
- For container-bound scripts, you must create the script in Sheets first, then clone it

### Debug Logging
Check the Google Apps Script editor's execution log for detailed error messages.