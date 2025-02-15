import React, { useEffect, useState } from "react";
import "./Inventory.css";
import { ref, onValue } from "firebase/database";
import { database } from "../firebase"; // Import shared Firebase initialization

const Inventory = () => {
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const inventoryRef = ref(database, "/");

    const handleData = (snapshot) => {
      try {
        const data = snapshot.val();
        if (data) {
          const formattedInventory = Object.keys(data).map((category) => ({
            category,
            items: Object.keys(data[category]).map((itemName) => ({
              name: itemName,
              quantity: data[category][itemName].count,
              expiry: data[category][itemName].exp_date,
            })),
          }));
          setInventory(formattedInventory);
        } else {
          setInventory([]);
        }
      } catch (err) {
        setError("Failed to fetch data from Firebase: " + err.message);
      } finally {
        setLoading(false);
      }
    };

    onValue(
      inventoryRef,
      handleData,
      (error) => {
        setError("Error fetching data from Firebase: " + error.message);
        setLoading(false);
      }
    );

    return () => {
      setLoading(true);
      setError(null);
    };
  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div className="error-message">{error}</div>;
  }

  return (
    <div className="inventory-container">
      <div className="inventory-header">
        <h1>INVENTORY</h1>
      </div>
      <div className="inventory-content">
        <table className="inventory-table">
          <thead>
            <tr>
              <th>Type of Food</th>
              <th>Food Item</th>
              <th>Quantity</th>
              <th>Expiry Date</th>
            </tr>
          </thead>
          <tbody>
            {inventory.length > 0 ? (
              inventory.map((category) =>
                category.items.length > 0 ? (
                  category.items.map((item, index) => (
                    <tr key={`${category.category}-${index}`}>
                      {index === 0 && (
                        <td rowSpan={category.items.length}>
                          {category.category}
                        </td>
                      )}
                      <td>{item.name}</td>
                      <td>{item.quantity}</td>
                      <td>{item.expiry || "N/A"}</td>
                    </tr>
                  ))
                ) : (
                  <tr key={category.category}>
                    <td rowSpan="1">{category.category}</td>
                    <td colSpan="3">[empty]</td>
                  </tr>
                )
              )
            ) : (
              <tr>
                <td colSpan="4" style={{ textAlign: "center" }}>
                  No inventory data available.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Inventory;
