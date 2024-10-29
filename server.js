const express = require('express');
const Printer = require('node-printer');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 3000;

// Configure multer for file uploads
const upload = multer({ dest: 'tmp/' }); // Temporary storage location

// Middleware to handle JSON requests
app.use(express.json());

// Endpoint to print a PDF
app.post('/print', upload.single('file'), (req, res) => {
    const printerName = 'EPSON-L3110-Series'; // Replace with your printer name

    // Check if a file was uploaded
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }

    const filePath = path.join(__dirname, req.file.path); // Path to the uploaded file

    // Get available printers list
    const availablePrinters = Printer.list();

    // Check if the specified printer exists
    if (!availablePrinters.includes(printerName)) {
        return res.status(400).json({ error: 'Printer not found' });
    }

    // Create a new Printer from available devices
    const printer = new Printer(printerName);

    // Read the file buffer
    fs.readFile(filePath, (err, fileBuffer) => {
        if (err) {
            return res.status(500).json({ error: 'Error reading file' });
        }

        // Print from a buffer
        const jobFromBuffer = printer.printBuffer(fileBuffer);

        // Listen for events from the job
        jobFromBuffer.once('sent', () => {
            jobFromBuffer.on('completed', () => {
                console.log(`Job ${jobFromBuffer.identifier} has been printed`);
                jobFromBuffer.removeAllListeners();
                
                // Optionally delete the uploaded file after printing
                fs.unlink(filePath, (unlinkErr) => {
                    if (unlinkErr) {
                        console.error('Failed to delete temporary file:', unlinkErr);
                    }
                });

                res.json({ message: `Job ${jobFromBuffer.identifier} has been printed` });
            });
        });
        
        // Handle job errors
        jobFromBuffer.on('error', (error) => {
            console.error('Print job error:', error);
            res.status(500).json({ error: 'Failed to print job' });
        });
    });
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
