import React, { useState } from "react";
import "./Food.css";
import { initializeApp } from "firebase/app";
import { getDatabase, ref, set } from "firebase/database";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyB-L2pj_4XVH9y7VBYOSAsTsT8p4cveHZY",
  authDomain: "foodai-7ebf0.firebaseapp.com",
  databaseURL: "https://foodai-7ebf0-default-rtdb.firebaseio.com",
  projectId: "foodai-7ebf0",
  storageBucket: "foodai-7ebf0.firebasestorage.app",
  messagingSenderId: "1802738846",
  appId: "1:1802738846:web:f6985b95b8487ce3c7ef8f",
  measurementId: "G-QJWXCZ7Y56"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

const Food = () => {
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false); // Track loading state

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(file);
      setImagePreview(URL.createObjectURL(file));
    } else {
      alert("No file selected. Please choose an image.");
    }
  };

  const handleCameraCapture = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      const videoElement = document.createElement("video");
      videoElement.srcObject = stream;
      videoElement.play();

      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");

      videoElement.addEventListener("canplay", () => {
        canvas.width = videoElement.videoWidth;
        canvas.height = videoElement.videoHeight;
        context.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(
          (blob) => {
            setImage(blob);
            setImagePreview(canvas.toDataURL("image/jpeg"));
            stream.getTracks().forEach((track) => track.stop());
          },
          "image/jpeg"
        );
      });
    } catch (error) {
      console.error("Error accessing camera:", error);
      alert("Unable to access camera. Please check permissions.");
    }
  };

  const getLocation = () => {
    return new Promise((resolve, reject) => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(resolve, reject);
      } else {
        reject(new Error("Geolocation is not supported by this browser."));
      }
    });
  };

  const getCityFromCoordinates = async (latitude, longitude) => {
    try {
      const response = await fetch(
        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
      );
      const data = await response.json();
      return data.city || "Unknown City";
    } catch (error) {
      console.error("Error fetching city:", error);
      return "Unknown City";
    }
  };

  const analyzeFood = async () => {
    if (!image) {
      alert("Please upload or capture an image first.");
      return;
    }

    setIsLoading(true); // Start loading

    try {
      // Get location information
      const location = await getLocation();
      const { latitude, longitude } = location.coords;
      const city = await getCityFromCoordinates(latitude, longitude);

      // Upload the image to Cloudinary
      const formData = new FormData();
      formData.append("file", image);
      formData.append("upload_preset", "food123");

      const uploadResponse = await fetch(
        `https://api.cloudinary.com/v1_1/dmf3jzijx/image/upload`,
        {
          method: "POST",
          body: formData,
        }
      );

      if (!uploadResponse.ok) {
        throw new Error("Image upload failed. Unable to create a valid link.");
      }

      const uploadData = await uploadResponse.json();
      const imageUrl = uploadData.secure_url;
      if (!imageUrl || !imageUrl.startsWith("http")) {
        throw new Error("Invalid image URL generated. Please try again.");
      }

      // Prepare JSON payload for FastAPI
      const payload = {
        image: imageUrl,
        location: city,
      };

      // Call FastAPI for food analysis
      const response = await fetch(
        "https://foodapi-sa0l.onrender.com/direct_img",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error(
            "The analysis endpoint was not found. Please check the backend URL."
          );
        } else if (response.status === 500) {
          throw new Error(
            "The server encountered an error. Please try again later."
          );
        } else {
          throw new Error("Unexpected server error.");
        }
      }

      const data = await response.json();

      if (!data.response || !data.meta_data) {
        throw new Error("Analysis failed. No result returned.");
      }

      // Extract relevant information from the response
      const {
        category,
        type,
        count,
        temperature,
        humidity,
        exp_date,
      } = data.meta_data;

      const summary = {
        category,
        type,
        count,
        temperature,
        humidity,
        exp_date,
        analysis: data.response,
      };

      // Display the result in a concise format
      setResult(summary);
      setError(null);
    } catch (error) {
      console.error("Error during upload or analysis:", error);

      setError(
        error.message.includes("Image upload failed")
          ? "Error uploading the image. Please ensure the image is valid and try again."
          : error.message.includes("Invalid image URL")
          ? "Image link generation failed. Please try uploading the image again."
          : error.message.includes("Geolocation")
          ? "Unable to fetch location. Please ensure location services are enabled."
          : error.message.includes("Failed to analyze")
          ? "Error analyzing food. Please try again."
          : error.message.includes("The analysis endpoint")
          ? "Analysis service is unavailable. Please contact support."
          : "An unknown error occurred. Please try again."
      );

      setResult(null);
    } finally {
      setIsLoading(false); // Stop loading
    }
  };

  const resetAnalysis = () => {
    setImage(null);
    setImagePreview(null);
    setResult(null);
    setError(null);
  };

  const addToInventory = () => {
    if (result) {
      // Convert category, type, and other fields to lowercase
      const category = (result.category || "Others").toLowerCase();
      const type = (result.type || "Unknown").toLowerCase();
      const count = result.count || 0;
      const expDate = result.exp_date || "";
  
      const dbRef = ref(database, `${category}/${type}`);
      set(dbRef, { count, exp_date: expDate })
        .then(() => {
          alert("Food item added to inventory!");
        })
        .catch((error) => {
          console.error("Error adding to inventory:", error);
          alert("Failed to add food item to inventory. Please try again.");
        });
    } else {
      alert("No analysis result to add to inventory.");
    }
  };
  

  return (
    <div className="food-container">
      <div className="food-header">
        <h1 className="food-title">AI Food Analyzer</h1>
      </div>
      <p className="food-description">
        Upload or capture food photos to check for spoilage. Our AI ensures
        quality by detecting signs of freshness or decay.
      </p>
      <div className="upload-container">
        <input
          className="file-input"
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
        />
        <button className="analyze-button" onClick={handleCameraCapture}>
          📷 Capture from Camera
        </button>
      </div>
      <button
        className="analyze-button analyze-large"
        onClick={analyzeFood}
        disabled={isLoading} // Disable button when loading
      >
        🔍 Analyze
      </button>

      {isLoading && (
        <div className="dot-loader">
          <span></span>
          <span></span>
          <span></span>
        </div>
      )}

      {error && <p className="error-message">{error}</p>}
      {result && (
        <div className="analysis-result">
          <div className="image-preview-container">
            <img
              className="image-preview-large"
              src={imagePreview}
              alt="Analyzed food"
            />
          </div>
          <div className="result-container">
            <p className="result-text">🧪 Analysis Summary:</p>
            <ul className="result-details">
              <li>📋 Category: {result.category}</li>
              <li>🍌 Type: {result.type}</li>
              <li>🔢 Count: {result.count}</li>
              <li>🌡️ Temperature: {result.temperature}</li>
              <li>💧 Humidity: {result.humidity}</li>
              <li>📅 Estimated Expiry: {result.exp_date}</li>
            </ul>

            {result.analysis && (
              <div className="original-response">
                <p className="result-text">📝 Detailed Analysis:</p>
                <ul className="analysis-points">
                  {result.analysis
                    .split("\n")
                    .filter((point) => point.trim() !== "")
                    .map((point, index) => (
                      <li key={index}>{point.trim()}</li>
                    ))}
                </ul>
              </div>
            )}
          </div>
          <button className="add-to-inventory-button" onClick={addToInventory}>
            ➕ Add to Inventory
          </button>
        </div>
      )}
      <button className="reset-button" onClick={resetAnalysis}>
        🔄 Reset
      </button>
    </div>
  );
};

export default Food;
