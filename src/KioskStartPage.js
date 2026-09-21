import React, { useState } from "react";
import "./KioskStartPage.css";
import { BASE_URL } from "./Configs/api";

const API = `${BASE_URL}/api`;

const readJsonResponse = async (res) => {
  const contentType = res.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    throw new Error(`Server route unavailable (${res.status}). Please restart or redeploy the backend.`);
  }
  return res.json();
};

export default function KioskStartPage({ onStart }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [showCustomerPopup, setShowCustomerPopup] = useState(false);
  const [selectedService, setSelectedService] = useState("");
  const [carNumber, setCarNumber] = useState("");
  const [customerName, setCustomerName] = useState("");

  const [customerData, setCustomerData] = useState(null);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [searchingCustomer, setSearchingCustomer] = useState(false);
  const [showCustomerListPopup, setShowCustomerListPopup] = useState(false);
  const [popupSearch, setPopupSearch] = useState("");
  const searchCustomer = async () => {
    console.log("SEARCH CLICKED");

    try {
      setError("");
      setSearchingCustomer(true);

      // Always fetch ALL active customers from the backend
      const url = `${API}/order/kiosk/customers`;
      console.log("API URL:", url);

      const res = await fetch(url);
      const data = await res.json();

      console.log("API STATUS:", res.status);
      console.log("API RESPONSE:", data);

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Unable to search customer.");
      }

      let allCustomers = data.customers || [];

      // Always show the full list — no client-side filtering
      setCustomerData(allCustomers);
      setPopupSearch(""); // clear popup filter each time
      setShowCustomerListPopup(true);

    } catch (error) {
      console.error("CUSTOMER SEARCH ERROR:", error);
      alert(error.message || "Unable to search customer");
    } finally {
      setSearchingCustomer(false);
    }
  };

  const chooseService = async (orderType) => {
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`${API}/order/kiosk/tables`);
      const data = await readJsonResponse(res);
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Unable to load service tables.");
      }
      if (!Array.isArray(data.tables) || data.tables.length === 0) {
        throw new Error("No available service tables found.");
      }

      const selectedTable = data.tables[0];
      await handleStart(orderType, selectedTable);
    } catch (err) {
      setError(err.message || "Unable to load service tables.");
    } finally {
      setLoading(false);
    }
  };

  const handleStart = async (orderType, table) => {
    setError("");
    try {
      // Generate a concurrency-safe sequential Kiosk Order Number from the backend.
      // No table assignment — the Kiosk is completely table-independent.
      const res = await fetch(`${API}/order/kiosk/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderType,
          tableId: table.TableId,
          tableNo: table.TableNo,
        }),
      });

      const data = await readJsonResponse(res);

      if (!data.success) {
        throw new Error(data.error || "Unable to start Kiosk session. Please try again.");
      }

      // Store the selected service table for the next screen.
      localStorage.setItem("kioskOrderId", data.orderNumber);
      localStorage.setItem("kioskOrderType", orderType);
      localStorage.setItem("tableId", table.TableId);
      localStorage.setItem("tableNo", table.TableNo);
      localStorage.removeItem("orderId");
      localStorage.removeItem("returnToKioskStart");

      let currentUser = null;
      try {
        currentUser = JSON.parse(localStorage.getItem("qr_pos_user") || "null");
      } catch (_) {
        currentUser = null;
      }
      const guestUser = currentUser || { FullName: "Guest", UserId: "guest", UserName: "guest" };
      sessionStorage.setItem("isLoggedIn", "true");
      localStorage.setItem("qr_pos_user", JSON.stringify(guestUser));

      if (onStart) {
        onStart(guestUser, { tableId: table.TableId, tableNo: table.TableNo });
      } else {
        window.location.reload();
      }
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
    }
  };

  return (
    <div className="start-page-container" style={{ backgroundImage: "url('/car_wash_bg.jpg')" }}>
      {/* Top Header */}
      <div className="start-page-header">
        <div className="sp-logo-area">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="#f97316" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2C17.52 2 22 6.48 22 12C22 17.52 17.52 22 12 22C6.48 22 2 17.52 2 12C2 6.48 6.48 2 12 2ZM12 4C7.58 4 4 7.58 4 12H12V4ZM12 20C16.42 20 20 16.42 20 12H12V20ZM14 14C14.55 14 15 13.55 15 13C15 12.45 14.55 12 14 12C13.45 12 13 12.45 13 13C13 13.55 13.45 14 14 14ZM16.5 16C17.05 16 17.5 15.55 17.5 15C17.5 14.45 17.05 14 16.5 14C15.95 14 15.5 14.45 15.5 15C15.5 15.55 15.95 16 16.5 16Z" />
          </svg>
          <div className="sp-logo-text">
            <h2>Island <span>Car Wash</span></h2>
            <p>Clean Cars. Happier Journeys.</p>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="start-page-content">
        <div className="sp-hero-text">
          <h1 className="sp-hero-highlight">
            <span className="sp-spark left"></span>
            WELCOME
            <span className="sp-spark right"></span>
          </h1>
          <p>Clean. Shine. Drive.</p>
        </div>

        <div className="sp-cards-container">
          <div
            className="sp-card"
            onClick={() => {
              setSelectedService("CAR_WASH");
              setShowCustomerPopup(true);
            }}
          >
            <div className="sp-card-icon-wrap">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M6 10h12l1.5 4v5H4.5v-5L6 10Z" />
                <path d="M8 10V7h8v3M7 19v2M17 19v2M7 14h.01M17 14h.01" />
                <path d="M9 4h6M10 2h4" />
              </svg>
            </div>
            <h3>CAR WASH</h3>
            <p>Give your car<br />a fresh clean</p>
            <div className="sp-card-btn">&rarr;</div>
          </div>

          <div
            className="sp-card"
            onClick={() => {
              setSelectedService("DETAILING");
              setShowCustomerPopup(true);
            }}
          >
            <div className="sp-card-icon-wrap">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M5 14h14l-1.5 5h-11L5 14Z" />
                <path d="M7 14l1.5-5h7l1.5 5M8 19v2M16 19v2M8 15h.01M16 15h.01" />
                <path d="m8 5 1-2M12 5V2M16 5l-1-2" />
              </svg>
            </div>
            <h3>DETAILING</h3>
            <p>Premium care<br />for your car</p>
            <div className="sp-card-btn">&rarr;</div>
          </div>
        </div>
      </div>

      {/* Footer Area */}
      <div className="start-page-footer">
        <div className="sp-footer-content">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
            <path d="M9 3v7M6 3v4a3 3 0 0 0 6 0V3M9 10v11M17 3v18M17 3a4 4 0 0 0-4 4v5h4" />
          </svg>
          Tap to start your service
        </div>
      </div>

      {/* 👇 CUSTOMER POPUP - இங்கே paste பண்ணு */}
      {showCustomerPopup && (
        <div className="customer-popup-overlay">
          <div className="customer-popup">

            <button
              className="customer-popup-close"
              onClick={() => setShowCustomerPopup(false)}
            >
              ×
            </button>

            <h2>Customer Entry</h2>

            <label>Car Number</label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
              <input
                type="text"
                value={carNumber}
                onChange={(e) => {
                  const value = e.target.value.toUpperCase();
                  setCarNumber(value);
                  setCustomerData(null);
                }}
                placeholder="Enter car number"
                style={{ width: '100%', paddingRight: '100px', marginBottom: '0' }}
              />
              <button
                type="button"
                onClick={searchCustomer}
                disabled={searchingCustomer}
                style={{
                  position: 'absolute',
                  right: '6px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  height: 'calc(100% - 12px)',
                  maxHeight: '36px',
                  padding: '0 16px',
                  background: '#f97316',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxSizing: 'border-box'
                }}
              >
                {searchingCustomer ? "..." : "Search"}
              </button>
            </div>

            <label>Customer Name</label>
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Enter customer name"
              style={{ width: '100%', marginBottom: '20px' }}
            />            {/* Customer Search Result Popup */}
            {showCustomerListPopup && (
              <div className="customer-list-overlay">
                <div className="customer-list-popup">

                  <button
                    className="customer-list-close"
                    onClick={() => setShowCustomerListPopup(false)}
                  >
                    ×
                  </button>

                  <h2>Choose Customer</h2>

                  {/* Search filter inside popup */}
                  <div style={{ marginBottom: '16px' }}>
                    <input
                      type="text"
                      value={popupSearch}
                      onChange={(e) => setPopupSearch(e.target.value.toUpperCase())}
                      placeholder="Search by car number..."
                      autoFocus
                      style={{
                        width: '100%',
                        boxSizing: 'border-box',
                        padding: '12px 16px',
                        border: '1.5px solid #f97316',
                        borderRadius: '10px',
                        fontSize: '15px',
                        outline: 'none',
                        letterSpacing: '0.5px'
                      }}
                    />
                  </div>

                  <div className="customer-table">

                    {/* Header */}
                    <div className="customer-table-header">
                      <div>Customer Name</div>
                      <div>Car Number</div>
                    </div>

                    {/* Customer Rows — filtered by popupSearch */}
                    {(() => {
                      const filtered = Array.isArray(customerData)
                        ? customerData.filter((c) =>
                            popupSearch.trim() === '' ||
                            (c.CarNumber || '').toUpperCase().includes(popupSearch.trim())
                          )
                        : [];

                      if (filtered.length === 0) {
                        return (
                          <div style={{ padding: '20px', textAlign: 'center', color: '#888', fontSize: '15px' }}>
                            No customer found.
                          </div>
                        );
                      }

                      return filtered.map((customer) => (
                        <div
                          key={customer.CustomerVehicleId}
                          className="customer-table-row"
                          onClick={() => {
                            setSelectedCustomer(customer);
                            setCustomerData(customer);
                            setCustomerName(customer.CustomerName || "");
                            setCarNumber(customer.CarNumber || "");
                            // Do NOT save kioskCustomer here — saved only after payment success
                            setShowCustomerListPopup(false);
                          }}
                        >
                          <div>{customer.CustomerName || "-"}</div>
                          <div>{customer.CarNumber || "-"}</div>
                        </div>
                      ));
                    })()}
                  </div>

                </div>
              </div>
            )}

            <button
              onClick={() => {
                if (!carNumber.trim()) {
                  alert("Please enter car number");
                  return;
                }

                // Save car number and customer name temporarily for post-payment upsert
                localStorage.setItem("kioskCarNumber", carNumber.trim());
                localStorage.setItem("kioskCustomerName", customerName.trim());

                // Do NOT save kioskCustomer here — it will be saved after payment success

                if (customerData && !Array.isArray(customerData)) {
                  // Save the dish already assigned to this car (for auto-add on ordering screen)
                  if (customerData.DefaultDishId) {
                    localStorage.setItem(
                      "kioskDefaultDishId",
                      String(customerData.DefaultDishId)
                    );
                  }
                }

                setShowCustomerPopup(false);
                chooseService(selectedService);
              }}
            >
              Continue
            </button>

          </div>
        </div>
      )}


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
