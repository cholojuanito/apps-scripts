# CLAUDE.md
## Repository Overview
This is a collection of Google Apps Scripts designed to help organize digital life.
## Project Structure
- Each Google Apps Script project lives in its own subdirectory (e.g., `hsa-receipt-uploader/`)
- Projects use TypeScript with strict mode enabled
- Output is compiled to `dist/` directory

## Google Apps Script Considerations
- Code is designed to run in the Google Apps Script environment
- Projects may interact with Google Workspace APIs (Drive, Gmail, Sheets, etc.)

# Bash commands
- npm run build: Build the project

# Code style
- Use ES modules if possible (import/export) syntax, not CommonJS (require)
- Destructure imports when possible (eg. import { foo } from 'bar')

# Workflow
- Be sure to typecheck when you’re done making a series of code changes
- Prefer running single tests, and not the whole test suite, for performance