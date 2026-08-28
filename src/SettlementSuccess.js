import React, { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { BASE_URL } from "./Configs/api";
import "./SettlementSuccess.css";

// Status definitions
const STATUS_STEPS = [
  {
    code: 2,
    label: "Order Preparing",
    message: "Your order is being prepared and will be ready soon.",
    emoji: "🍲",
    color: "#f97316",
  },
  {
    code: 3,
    label: "Order Ready",
    message: "Your order is ready. Please collect it.",
    emoji: "✅",
    color: "#22c55e",
  },
  {
    code: 4,
    label: "Completed",
    message: "Thank you! Your order has been completed.",
    emoji: "✔️",
    color: "#6366f1",
  },
];

function getActiveStep(statusCode) {
  const code = Number(statusCode);
  if (code >= 4) return 2; // Completed
  if (code === 3) return 1; // Ready
  return 0; // Preparing (1 or 2)
}

const STATUS_LABEL_MAP = { 1: "NEW", 2: "PREPARING", 3: "READY", 4: "COMPLETED" };
const STATUS_COLOR_MAP = { 1: "#94a3b8", 2: "#f97316", 3: "#22c55e", 4: "#6366f1" };

function SettlementSuccess() {
  const API = `${BASE_URL}/api`;
  const [searchParams] = useSearchParams();
  const [orderNumber, setOrderNumber] = useState("");
  const [statusCode, setStatusCode] = useState(2); // default: preparing

  // Order Details popup state
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  const [orderItems, setOrderItems] = useState([]);
  const [itemsLoading, setItemsLoading] = useState(false);

  const tableId = searchParams.get("tableId") || "";
  const tableNo = searchParams.get("table") || "";

  // Apply saved theme color
  useEffect(() => {
    const saved = localStorage.getItem("themeColor");
    if (saved) {
      const hex = saved.replace('#', '');
      const safeHex = hex.length === 3 ? hex.split('').map(c => c + c).join('') : hex;
      const int = Number.parseInt(safeHex, 16);
      const r = (int >> 16) & 255, g = (int >> 8) & 255, b = int & 255;
      const rgba = (a) => `rgba(${r}, ${g}, ${b}, ${a})`;

      document.documentElement.style.setProperty("--theme-color", saved);
      document.documentElement.style.setProperty("--theme-color-soft", rgba(0.12));
      document.documentElement.style.setProperty("--theme-color-strong", rgba(0.22));
      document.documentElement.style.setProperty("--theme-color-shadow", rgba(0.18));
    }
  }, []);

  const goToOrderPage = () => {
    const targetUrl = tableId || tableNo
      ? `/?tableId=${encodeURIComponent(tableId)}&table=${encodeURIComponent(tableNo)}`
      : "/";
    window.location.href = targetUrl;
  };

  const loadOrderDetails = useCallback(async () => {
    try {
      const orderId = searchParams.get("orderId") || new URLSearchParams(window.location.search).get("orderId");
      if (!orderId) return;

      const res = await fetch(`${API}/order/order-details/${orderId}`);
      const data = await res.json();

      if (Array.isArray(data) && data.length > 0) {
        if (data[0].OrderNumber) setOrderNumber(data[0].OrderNumber);

        // Get the highest StatusCode among all items
        const maxStatus = Math.max(...data.map(d => Number(d.StatusCode || 2)));
        setStatusCode(maxStatus);
      }
    } catch (err) {
      console.log(err);
    }
  }, [API, searchParams]);

  useEffect(() => {
    loadOrderDetails();

    // Poll every 10 seconds for live status updates
    const interval = setInterval(loadOrderDetails, 10000);
    return () => clearInterval(interval);
  }, [loadOrderDetails]);

  const loadOrderItems = useCallback(async () => {
    const orderId =
      searchParams.get("orderId") ||
      new URLSearchParams(window.location.search).get("orderId");

    console.log("ORDER ID:", orderId);

    if (!orderId) return;

    setItemsLoading(true);

    try {
      const res = await fetch(`${API}/order/order-items/${orderId}`);
      const data = await res.json();

      console.log("ORDER ITEMS API:", data);

      if (data.success) {
        setOrderItems(data.items || []);
      }
    } catch (err) {
      console.log(err);
    } finally {
      setItemsLoading(false);
    }
  }, [API, searchParams]);

  const handleOpenOrderDetails = () => {
    setShowOrderDetails(true);
    loadOrderItems();
  };

  const orderSuffix = String(orderNumber || "").replace(/\D/g, "").slice(-4) || "----";
  const activeStep = getActiveStep(statusCode);
  const currentStatus = STATUS_STEPS[activeStep];

  const grandTotal = orderItems.reduce((sum, item) => sum + Number(item.LineTotal || 0), 0);

  const isValidStatus = [2, 3, 4].includes(Number(statusCode));

  return (
    <div className="confirmation-screen">
      <div className="confirmation-card">
        <div className="confirmation-banner">Order Confirmation</div>

        {isValidStatus && (
          <div className="confirmation-order-label">
            Order No: <span>{orderSuffix}</span>
          </div>
        )}

        {tableNo && (
          <div style={{
            fontSize: "clamp(22px, 2vw, 32px)",
            fontWeight: "800",
            color: "#454545",
            marginTop: isValidStatus ? "-5px" : "15px",
            marginBottom: "15px"
          }}>
            Takeaway: <span style={{ color: "var(--theme-color)", fontSize: "1.3em", fontWeight: "900" }}>{tableNo}</span>
          </div>
        )}

        {isValidStatus && (
          <>
            {/* Order Details Icon Button */}
            <button
              className="order-details-icon-btn"
              onClick={handleOpenOrderDetails}
              title="View Order Details"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
                <rect x="9" y="3" width="6" height="4" rx="1" />
                <line x1="9" y1="12" x2="15" y2="12" />
                <line x1="9" y1="16" x2="13" y2="16" />
              </svg>
              <span>Order Details</span>
            </button>

            {/* Status Badge */}
            <div className="status-badge" style={{ borderColor: currentStatus.color }}>
              <div className="status-badge-icon">{currentStatus.emoji}</div>
              <div className="status-badge-text">
                <div className="status-badge-title" style={{ color: currentStatus.color }}>
                  {currentStatus.label}
                </div>
                <div className="status-badge-msg">{currentStatus.message}</div>
              </div>
            </div>

            {/* Step Tracker */}
            <div className="status-tracker">
              {STATUS_STEPS.map((step, idx) => {
                const isDone = idx < activeStep;
                const isActive = idx === activeStep;
                return (
                  <React.Fragment key={step.code}>
                    <div className={`status-step ${isActive ? "active" : ""} ${isDone ? "done" : ""}`}>
                      <div className="step-circle" style={
                        isDone
                          ? { background: step.color, borderColor: step.color }
                          : isActive
                            ? { background: "#fff", borderColor: step.color, boxShadow: `0 0 0 4px ${step.color}33` }
                            : {}
                      }>
                        {isDone ? (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        ) : (
                          <span style={{ color: isActive ? step.color : "#ccc", fontSize: "18px" }}>{step.emoji}</span>
                        )}
                      </div>
                      <div className="step-label" style={{ color: isActive ? step.color : isDone ? "#888" : "#bbb" }}>
                        {step.label}
                      </div>
                    </div>
                    {idx < STATUS_STEPS.length - 1 && (
                      <div className={`step-connector ${idx < activeStep ? "filled" : ""}`} />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </>
        )}

        <div className="confirmation-subtitle">
          {isValidStatus ? "Thank you for ordering" : "Please confirm the order"}
        </div>
        <button className="return-order-btn" onClick={goToOrderPage}>
          Return to Order
        </button>
      </div>

      {/* Order Details Popup */}
      {showOrderDetails && (
        <div className="od-overlay" onClick={() => setShowOrderDetails(false)}>
          <div className="od-modal" onClick={e => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="od-header">
              <div className="od-header-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
                  <rect x="9" y="3" width="6" height="4" rx="1" />
                  <line x1="9" y1="12" x2="15" y2="12" />
                  <line x1="9" y1="16" x2="13" y2="16" />
                </svg>
              </div>
              <div>
                <div className="od-title">Order Details</div>
                {orderNumber && <div className="od-subtitle">Order #{String(orderNumber).replace(/\D/g, "").slice(-4)}</div>}
              </div>
              <button className="od-close-btn" onClick={() => setShowOrderDetails(false)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <div className="od-body">
              {itemsLoading ? (
                <div className="od-loading">
                  <div className="od-spinner" />
                  <p>Loading your order…</p>
                </div>
              ) : orderItems.length === 0 ? (
                <div className="od-empty">
                  <div style={{ fontSize: "48px" }}>🍽️</div>
                  <p>No items found for this order.</p>
                </div>
              ) : (
                <>
                  {/* Column Headers */}
                  <div className="od-col-header">
                    <span className="od-col-name">Item</span>
                    <span className="od-col-qty">Qty</span>
                    <span className="od-col-price">Price</span>
                    <span className="od-col-total">Total</span>
                  </div>

                  {/* Items list */}
                  <div className="od-items-list">
                    {orderItems.map((item, idx) => {
                      const statusLabel = STATUS_LABEL_MAP[item.StatusCode] || "PREPARING";
                      const statusColor = STATUS_COLOR_MAP[item.StatusCode] || "#94a3b8";
                      return (
                        <div key={item.OrderDetailId || idx} className="od-item-row">
                          <div className="od-item-name-wrap">
                            <span className="od-item-name">{item.DishName}</span>
                            {item.Remarks && <span className="od-item-note">📝 {item.Remarks}</span>}
                            <span className="od-item-status" style={{ background: statusColor + "22", color: statusColor, border: `1px solid ${statusColor}55` }}>
                              {statusLabel}
                            </span>
                          </div>
                          <span className="od-col-qty">×{item.Quantity}</span>
                          <span className="od-col-price">${Number(item.PricePerUnit).toFixed(2)}</span>
                          <span className="od-col-total">${Number(item.LineTotal).toFixed(2)}</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Grand Total */}
                  <div className="od-grand-total">
                    <span>Grand Total</span>
                    <span>${grandTotal.toFixed(2)}</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SettlementSuccess;