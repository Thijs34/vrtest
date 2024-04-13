const express = require('express');
const app = express();
const path = require('path');
const fs = require('fs');

// Serve static files from the main folder
app.use(express.static(path.join(__dirname, '/')));

// Increase the limit for incoming JSON payloads
app.use(express.json({ limit: '50mb' })); // Middleware to parse JSON bodies

app.get('/', function(req, res) {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Endpoint to receive and store data
// Endpoint to receive and store data
app.post('/storeData', function(req, res) {
    const { age, gender, emotion, picture } = req.body;
  
    // Convert base64 image to binary
    const base64Data = picture.replace(/^data:image\/png;base64,/, '');
    const imgFileName = `${Date.now()}.png`;
    const imgFilePath = path.join(__dirname, 'images', imgFileName);
  
    // Save image to file
    fs.writeFileSync(imgFilePath, base64Data, 'base64', (err) => {
      if (err) {
        console.error('Error saving image:', err);
        res.sendStatus(500); // Respond with error status
        return;
      }
    });
  
    // Read existing data from JSON file, if file exists
    let existingData = [];
    const dataFilePath = path.join(__dirname, 'data.json');
    try {
      if (fs.existsSync(dataFilePath)) {
        const data = fs.readFileSync(dataFilePath);
        existingData = JSON.parse(data);
      }
    } catch (err) {
      console.error('Error reading existing data:', err);
    }
  
    // Append new data to existing data
    const newData = { age, gender, emotion, picture: `images/${imgFileName}` };
    existingData.push(newData);
  
    // Write updated data back to JSON file
    try {
      fs.writeFileSync(dataFilePath, JSON.stringify(existingData, null, 2));
      console.log('Data successfully stored in data.json');
      res.sendStatus(200); // Respond with success status
    } catch (err) {
      console.error('Error storing data:', err);
      res.sendStatus(500); // Respond with error status
    }
  });
  

// Start the server on port 3000
app.listen(3000, function() {
  console.log('Server is running on http://localhost:3000');
});
