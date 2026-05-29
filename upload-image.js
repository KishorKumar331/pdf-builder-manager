const fs = require('fs');
const path = require('path');

const uploadImage = async (filename, folderName) => {
    try {
        const filePath = path.join(__dirname, 'public', filename);
        if (!fs.existsSync(filePath)) {
            console.error(`Error: File ${filename} not found in public/ folder`);
            return;
        }

        // Read image and convert to base64
        const imageData = fs.readFileSync(filePath, { encoding: 'base64' });

        // Prepare request body
        const body = {
            file_path: folderName, // Jo v pdf name rkhna bo dal dena (sun-rise)
            image_data: imageData // Send raw base64 string
        };

        console.log(`📤 Uploading ${filename} as ${folderName}...`);

        const response = await fetch('https://sg76vqy4vi.execute-api.ap-south-1.amazonaws.com/profile/resources', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });

        const data = await response.json();
        
        if (response.ok) {
            console.log('✅ Upload successful!');
            console.log(JSON.stringify(data, null, 2));
        } else {
            console.error('❌ Upload failed with status:', response.status);
            console.error(JSON.stringify(data, null, 2));
        }

    } catch (error) {
        console.error('❌ Error during upload:', error.message);
    }
};

// Usage (edit filename and folder/path name)
// Example: node upload-image.js budget.png sun-rise
const args = process.argv.slice(2);
if (args.length < 2) {
    console.log('Usage: node upload-image.js <filename_in_public> <destination_name>');
} else {
    uploadImage(args[0], args[1]);
}
