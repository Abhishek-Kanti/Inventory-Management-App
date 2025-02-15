import React, { useState, useEffect, useRef } from 'react';
import './Chat.css';

const Chat = () => {
  const [messages, setMessages] = useState([
    { type: 'bot', text: 'Welcome to the AI Inventory Manager! How can I assist you today?' }
  ]);

  const [input, setInput] = useState('');
  const chatEndRef = useRef(null);

  const handleSendMessage = async () => {
    if (input.trim()) {
      const userMessage = { type: 'user', text: input };
      setMessages((prev) => [...prev, userMessage]);

      const requestData = {
        input,
        location: 'user-defined-location', // Replace with actual location if available
      };

      setInput('');

      try {
        const response = await fetch('https://foodapi-sa0l.onrender.com/ai_InventoryManeger', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestData),
        });

        if (!response.ok) {
          throw new Error(`Server error: ${response.status}`);
        }

        const data = await response.json();
        setMessages((prev) => [
          ...prev,
          { type: 'bot', text: data.response || 'Received a response, but it is empty.' },
        ]);
      } catch (error) {
        setMessages((prev) => [
          ...prev,
          { type: 'bot', text: `An error occurred: ${error.message}` },
        ]);
      }
    }
  };

  // Scroll to bottom on new message
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="chat-container">
      {/* Header with Background Image */}
      <header className="chat-header">
        <h1>AI INVENTORY MANAGER</h1>
      </header>

      {/* Description Below Header */}
      <p className="chat-description">
        This is your personal assistant for managing inventory and detecting food spoilage. 
        Ask any questions or give commands related to inventory management.
      </p>

      {/* Chat History Section */}
      <div className="chat-history">
        {messages.map((msg, index) => (
          <div key={index} className={`chat-bubble ${msg.type}`}>
            {msg.text}
          </div>
        ))}
        <div ref={chatEndRef} /> {/* Scroll to this div */}
      </div>

      {/* Input Section */}
      <div className="chat-input-area">
        <input
          type="text"
          className="chat-input"
          value={input}
          placeholder="Type your message here..."
          onChange={(e) => setInput(e.target.value)}
        />
        <button onClick={handleSendMessage}>Send</button>
      </div>
    </div>
  );
};

export default Chat;
