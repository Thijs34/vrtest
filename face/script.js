const video = document.getElementById('video');
let isCameraActive = false; // Initially set the flag to false

// Load models asynchronously
async function loadModels() {
  await Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
    faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
    faceapi.nets.faceRecognitionNet.loadFromUri('/models'),
    faceapi.nets.faceExpressionNet.loadFromUri('/models'),
    faceapi.nets.ageGenderNet.loadFromUri('/models')
  ]);
  loadVideo();
}

loadModels();

function loadVideo() {
  navigator.mediaDevices.getUserMedia({ 
    video: { 
      aspectRatio: 0.75 // This will give you a 4:3 aspect ratio similar to an ID photo
    }, 
    audio: false 
  })
  .then((cameraStream) => {
    video.srcObject = cameraStream;
    return new Promise((resolve) => {
      video.onloadedmetadata = () => {
        resolve(video);
      };
    });
  })
  .catch((err) => {
    console.error(err);
  });
}

document.getElementById('start').addEventListener('click', startScanning);

async function startScanning() {
  isCameraActive = true; // Set the flag to true when the scanning starts

  const canvas = faceapi.createCanvasFromMedia(video);
  document.body.append(canvas);
  const displaySize = { width: video.width, height: video.height };
  faceapi.matchDimensions(canvas, displaySize);

  const detectFaces = async () => {
    if (!isCameraActive) {
      // Clear the canvas when the camera is not active
      canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
      return; // Stop detection if camera is frozen
    }

    const detections = await faceapi
      .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks()
      .withFaceExpressions()
      .withAgeAndGender();

    const resizedDetections = faceapi.resizeResults(detections, displaySize);
    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
    faceapi.draw.drawDetections(canvas, resizedDetections);
    faceapi.draw.drawFaceLandmarks(canvas, resizedDetections);
    faceapi.draw.drawFaceExpressions(canvas, resizedDetections);

    // Extract data from detections
    const detection = resizedDetections[0]; // Assuming only one face detected
    if (detection) {
      const { age, gender, expressions } = detection;

      // Determine the dominant emotion
      const maxEmotion = Object.keys(expressions).reduce((a, b) => (
        expressions[a] > expressions[b] ? a : b
      ));

      // Prepare data to send to server
      const data = {
        age: Math.round(age),
        gender,
        emotion: maxEmotion
      };

      // Store data in local storage (optional)
      localStorage.setItem('latestData', JSON.stringify(data));

      // Draw age, gender, and emotion labels
      const box = detection.detection.box;
      const label = `${Math.round(detection.age)} years old ${detection.gender}`;
      const drawBox = new faceapi.draw.DrawBox(box, { label });
      drawBox.draw(canvas);

      // Update ID card
      document.getElementById('idCard').style.display = 'block';
      document.getElementById('age').innerText = `Age: ${Math.round(detection.age)}`;
      document.getElementById('gender').innerText = `Gender: ${detection.gender}`;
      document.getElementById('emotion').innerText = `Emotion: ${maxEmotion}`;
    }

    // Use requestIdleCallback to schedule the next detection
    window.requestIdleCallback(detectFaces);
  };

  // Wait for the first detection
  await detectFaces();

  // Start the timer after the first detection
  setTimeout(() => {
    isCameraActive = false; // Stop face detection after 5 seconds

    // Add a delay before sending data to server
    setTimeout(sendDataToServer, 500); // Delay of 2 seconds
  }, 7000);
}


// Function to send data to server
function sendDataToServer() {
  const latestData = JSON.parse(localStorage.getItem('latestData'));
  if (latestData) {
    // Capture a frame from the video stream
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext('2d');
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const picture = canvas.toDataURL('image/png');

    // Include the picture in the data sent to the server
    latestData.picture = picture;

    fetch('/storeData', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(latestData)
    })
    .then(response => {
      if (response.ok) {
        console.log('Data sent to server successfully.');
      } else {
        console.error('Failed to send data to server.');
      }
    })
    .catch(error => {
      console.error('Error sending data to server:', error);
    });
  }
}

// Function to initialize ID card with empty data
function initializeIdCard() {
  document.getElementById('idCard').style.display = 'block';
  document.getElementById('age').innerText = `Age: `;
  document.getElementById('gender').innerText = `Gender: `;
  document.getElementById('emotion').innerText = `Emotion: `;
}

// Call the function when the site loads
window.onload = initializeIdCard;
