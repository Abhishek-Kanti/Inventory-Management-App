import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ref, get } from "firebase/database";
import { database } from "../firebase"; // Import shared Firebase initialization
import "./Home.css";

const Home = () => {
  const navigate = useNavigate();

  // State to hold the inventory data
  const [inventoryData, setInventoryData] = useState({
    totalItems: 0,
    categories: {
      others: 0,
      fruits: 0,
      dairy: 0,
      vegetables: 0,
    },
  });

  // State to manage error
  const [error, setError] = useState(null);

  // Function to fetch inventory data from Firebase
  const fetchInventoryData = async () => {
    try {
      const dbRef = ref(database, "/");
      const snapshot = await get(dbRef);
      if (snapshot.exists()) {
        const data = snapshot.val();
        let totalItems = 0;
        let categories = {
          others: 0,
          fruits: 0,
          dairy: 0,
          vegetables: 0,
        };

        // Loop through the categories in Firebase and calculate the totals
        for (const category in data) {
          if (data[category] && typeof data[category] === "object") {
            for (const type in data[category]) {
              const itemCount = parseInt(data[category][type]?.count || 0, 10); // Convert count to integer
              totalItems += itemCount;

              if (category === "others") categories.others += itemCount;
              if (category === "fruits") categories.fruits += itemCount;
              if (category === "dairy") categories.dairy += itemCount;
              if (category === "vegetables") categories.vegetables += itemCount;
            }
          }
        }

        // Set the inventory data to state
        setInventoryData({
          totalItems,
          categories,
        });
      } else {
        setError("No data available in the inventory.");
      }
    } catch (error) {
      setError("Error fetching inventory data: " + error.message);
      console.error("Error fetching inventory data from Firebase:", error);
    }
  };

  // Fetch inventory data when the component is mounted
  useEffect(() => {
    fetchInventoryData();
  }, []);

  // Redirect functions
  const handleRedirectToInventory = () => {
    navigate("/inventory");
  };

  const handleRedirectToFoodAnalyzer = () => {
    navigate("/food");
  };

  const handleRedirectToAIManager = () => {
    navigate("/ai-manager");
  };

  // Calculate percentage for each category
  const calculatePercentage = (categoryCount) => {
    return (categoryCount / inventoryData.totalItems) * 100;
  };

  // Calculate the start and end points for each category
  const getCategoryColorStyle = () => {
    const total = inventoryData.totalItems;
    const fruitsPercentage = calculatePercentage(inventoryData.categories.fruits);
    const dairyPercentage = calculatePercentage(inventoryData.categories.dairy);
    const vegetablesPercentage = calculatePercentage(inventoryData.categories.vegetables);
    const othersPercentage = calculatePercentage(inventoryData.categories.others);

    return {
      background: `conic-gradient(
        #4db8ff 0% ${fruitsPercentage}%, 
        #ff6600 ${fruitsPercentage}% ${fruitsPercentage + dairyPercentage}%, 
        #66ff66 ${fruitsPercentage + dairyPercentage}% ${fruitsPercentage + dairyPercentage + vegetablesPercentage}%, 
        #ffcc00 ${fruitsPercentage + dairyPercentage + vegetablesPercentage}% 100%
      )`,
    };
  };

  return (
    <div className="home">
      <header className="home-header">
        <h1>INVENTORY MANAGEMENT SYSTEM</h1>
        <div className="user-icon">A</div>
      </header>

      {error ? (
        <div className="error-message">{error}</div>
      ) : (
        <>
          <div
            className="inventory-summary button-card"
            onClick={handleRedirectToInventory}
          >
            <h2>Inventory</h2>
            <div className="circle-chart" style={getCategoryColorStyle()}>
              <p className="item-count">{inventoryData.totalItems}</p>
              <p className="item-label">Items</p>
            </div>
            <div className="legend">
              <div>
                <span className="dot others"></span> Others ({inventoryData.categories.others})
              </div>
              <div>
                <span className="dot fruits"></span> Fruits ({inventoryData.categories.fruits})
              </div>
              <div>
                <span className="dot dairy"></span> Dairy ({inventoryData.categories.dairy})
              </div>
              <div>
                <span className="dot vegetables"></span> Vegetables ({inventoryData.categories.vegetables})
              </div>
            </div>
          </div>

          <div className="additional-info">
            <div
              className="info-box button-card"
              onClick={handleRedirectToFoodAnalyzer}
            >
              <h3>AI Food Analyzer</h3>
              <img
                src="https://img.icons8.com/color/64/camera.png"
                alt="Sensor Data"
              />
            </div>

            <div
              className="info-box button-card"
              onClick={handleRedirectToAIManager}
            >
              <h3>AI INVENTORY MANAGER</h3>
              <img
                src="https://img.icons8.com/color/64/artificial-intelligence.png"
                alt="AI Inventory Manager"
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Home;
