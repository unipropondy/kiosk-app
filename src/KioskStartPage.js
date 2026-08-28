import React, { useState } from "react";
import "./KioskStartPage.css";
import { BASE_URL } from "./Configs/api";

const API = `${BASE_URL}/api`;

export default function KioskStartPage({ onStart }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleStart = async (orderType) => {
    setError("");
    setLoading(true);
    try {
      // Generate a concurrency-safe sequential Kiosk Order Number from the backend.
      // No table assignment — the Kiosk is completely table-independent.
      const res = await fetch(`${API}/order/kiosk/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderType }),
      });

      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error || "Unable to start Kiosk session. Please try again.");
      }

      // Store the kiosk order number — no tableId/tableNo needed
      localStorage.setItem("kioskOrderId", data.orderNumber);
      localStorage.setItem("kioskOrderType", orderType);
      // Clear any leftover table info from previous sessions
      localStorage.removeItem("tableId");
      localStorage.removeItem("tableNo");
      localStorage.removeItem("orderId");

      const guestUser = { FullName: "Guest", UserId: "guest", UserName: "guest" };
      sessionStorage.setItem("isLoggedIn", "true");
      localStorage.setItem("qr_pos_user", JSON.stringify(guestUser));

      if (onStart) {
        onStart(guestUser);
      } else {
        window.location.reload();
      }
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="start-page-container">
      {/* Top Header */}
      <div className="start-page-header">
        <div className="sp-logo-area">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="#f97316" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2C17.52 2 22 6.48 22 12C22 17.52 17.52 22 12 22C6.48 22 2 17.52 2 12C2 6.48 6.48 2 12 2ZM12 4C7.58 4 4 7.58 4 12H12V4ZM12 20C16.42 20 20 16.42 20 12H12V20ZM14 14C14.55 14 15 13.55 15 13C15 12.45 14.55 12 14 12C13.45 12 13 12.45 13 13C13 13.55 13.45 14 14 14ZM16.5 16C17.05 16 17.5 15.55 17.5 15C17.5 14.45 17.05 14 16.5 14C15.95 14 15.5 14.45 15.5 15C15.5 15.55 15.95 16 16.5 16Z"/>
          </svg>
          <div className="sp-logo-text">
            <h2>Tasty Bites</h2>
            <p>Good Food. Great Moments.</p>
          </div>
        </div>
        <div className="sp-lang-selector">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
          <span>English</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="start-page-content">
        <div className="sp-hero-text">
          <h1>ORDER</h1>
          <h1 className="sp-hero-highlight">
            <span className="sp-spark left"></span>
            HERE
            <span className="sp-spark right"></span>
          </h1>
          <p>Fresh. Fast. Delicious.</p>
        </div>

        <div className="sp-cards-container">
          <div className="sp-card" onClick={() => handleStart("EAT_IN")}>
            <div className="sp-card-icon-wrap">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="3" y="10" width="18" height="4" rx="1"/>
                <path d="M6 14v6M18 14v6"/>
                <path d="M12 4v6"/>
                <circle cx="12" cy="4" r="1"/>
                <path d="M7 6h2M15 6h2"/>
              </svg>
            </div>
            <h3>EAT IN</h3>
            <p>Dine in and<br/>enjoy your meal</p>
            <div className="sp-card-btn">&rarr;</div>
          </div>

          <div className="sp-card" onClick={() => handleStart("TAKE_AWAY")}>
            <div className="sp-card-icon-wrap">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M6 8l-2 12h16l-2-12H6z"/>
                <path d="M8 8V6a4 4 0 0 1 8 0v2"/>
                <circle cx="12" cy="13" r="2" fill="#f97316" stroke="none"/>
              </svg>
            </div>
            <h3>TAKE AWAY</h3>
            <p>Grab your order<br/>and go</p>
            <div className="sp-card-btn">&rarr;</div>
          </div>
        </div>
      </div>

      {/* Footer Area */}
      <div className="start-page-footer">
        <div className="sp-footer-content">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
            <path d="M14 8V6a2 2 0 0 0-2-2H9.5a2.5 2.5 0 0 0-2.5 2.5V11"/>
            <path d="M14 8h1.5A2.5 2.5 0 0 1 18 10.5v1.28a2 2 0 0 1-.36 1.15l-3.28 4.75A2 2 0 0 1 12.72 19H9.5a3.5 3.5 0 0 1-3.5-3.5v-1"/>
          </svg>
          Tap to start your order
        </div>
      </div>

      {/* Loading Overlay */}
      {loading && (
        <div className="sp-loading-overlay">
          <div className="sp-spinner"></div>
          <div className="sp-loading-text">Preparing...</div>
        </div>
      )}
      {error && <div className="sp-error">{error}</div>}
    </div>
  );
}
