import React, { useState, useEffect } from "react";
import "./LoginPage.css";
import { BASE_URL } from "./Configs/api";

const API = `${BASE_URL}/api`;

/* ══════════════════════════════════════════════════
   SVG Icons
══════════════════════════════════════════════════ */
const UserIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const PhoneIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
  </svg>
);

const LockIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);



const EyeIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const EyeOffIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
);

const AlertIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);

const CheckIcon = () => (
  <svg width="36" height="36" viewBox="0 0 24 24" fill="none"
    stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const ForkIcon = () => (
  <svg width="34" height="34" viewBox="0 0 24 24" fill="none"
    stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2" />
    <path d="M7 2v20" />
    <path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7" />
  </svg>
);

/* ══════════════════════════════════════════════════
   LoginPage Component
══════════════════════════════════════════════════ */
export default function LoginPage({ onLoginSuccess }) {
  const [tab, setTab] = useState("signin");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successUser, setSuccessUser] = useState("");
  const [showGiftModal, setShowGiftModal] = useState(false);
  const [signedUpUser, setSignedUpUser] = useState(null);
  const [showPromoImage, setShowPromoImage] = useState(false);
  const [promoImages, setPromoImages] = useState([]);
  const [currentSlide, setCurrentSlide] = useState(0);

  // Sign In fields
  const [siUsername, setSiUsername] = useState("");
  const [siPassword, setSiPassword] = useState("");
  const [siPromoCode, setSiPromoCode] = useState("");

  // Sign Up fields

  const [suUsername, setSuUsername] = useState("");
  const [suPhone, setSuPhone] = useState("");
  const [suPassword, setSuPassword] = useState("");
  const [suConfirm, setSuConfirm] = useState("");
  const [suPromoCode, setSuPromoCode] = useState("");

  // ================= PROMO IMAGES (CAROUSEL) =================

  useEffect(() => {
    const loadPromoImages = async () => {
      try {
        const res = await fetch(`${API}/auth/promo-image`);
        const data = await res.json();
        console.log("PROMO IMAGE RESPONSE:", data);
        if (data.success && data.promoImages && data.promoImages.length > 0) {
          setPromoImages(data.promoImages);
          setCurrentSlide(0);
          setShowPromoImage(true);
        }
      } catch (err) {
        console.error("Promo image loading error:", err);
      }
    };
    loadPromoImages();
  }, []);

  // Auto-advance carousel
  useEffect(() => {
    if (!showPromoImage || promoImages.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % promoImages.length);
    }, 3500);
    return () => clearInterval(timer);
  }, [showPromoImage, promoImages.length]);

  const switchTab = (t) => {
    setTab(t);
    setError("");
    setShowPass(false);
    setShowConfirmPass(false);
  };

  const assignTakeawayTable = async () => {
    const res = await fetch(`${API}/order/assign-takeaway-table`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const tableData = await res.json();

    if (!tableData.success) {
      throw new Error(tableData.message || "Unable to assign a new table.");
    }

    localStorage.setItem("tableId", tableData.tableId);
    localStorage.setItem("tableNo", tableData.tableNumber);
    localStorage.setItem("orderId", tableData.orderId);

    return tableData;
  };

  /* ── Sign In ─────────────────────────────────── */
  const handleSignIn = async (e) => {
    e.preventDefault();
    setError("");
    if (!siUsername.trim() || !siPassword.trim()) {
      setError("Please enter your username and password.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: siUsername.trim(),
          password: siPassword,
          promoCode: siPromoCode.trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        console.log("LOGIN RESPONSE:", data);

        try {
          await assignTakeawayTable();
        } catch (tableError) {
          setError(tableError.message || "Unable to assign a new table.");
          setLoading(false);
          return;
        }

        sessionStorage.setItem("isLoggedIn", "true");
        localStorage.setItem("qr_pos_user", JSON.stringify(data.user));

        if (data.user?.Promocode) {
          localStorage.setItem("promoCode", data.user.Promocode);
          localStorage.setItem("promoAmount", data.user.Promoamount || 0);
          localStorage.setItem(
            "availableCredit",
            data.user.AvailableCredit || 0
          );
        } else {
          localStorage.removeItem("promoCode");
          localStorage.removeItem("promoAmount");
          localStorage.removeItem("availableCredit");
        }
        setSuccessUser(data.user.FullName || data.user.UserName);
        setShowSuccess(true);
        setTimeout(() => {
          if (onLoginSuccess) onLoginSuccess(data.user);
        }, 1400);
      } else {
        setError(data.message || "Login failed. Please try again.");
      }
    } catch (err) {
      setError("Cannot connect to server. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  /* ── Sign Up ─────────────────────────────────── */
  const handleSignUp = async (e) => {
    e.preventDefault();
    setError("");
    if (!suUsername.trim() || !suPassword.trim()) {
      setError("Username and password are required.");
      return;
    }
    if (!suPhone.trim()) {
      setError("Phone number is required.");
      return;
    }
    if (suPassword !== suConfirm) {
      setError("Passwords do not match.");
      return;
    }
    if (suPassword.length < 4) {
      setError("Password must be at least 4 characters.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API}/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: suUsername.trim(),
          username: suUsername.trim(),
          password: suPassword,
          phone: suPhone.trim(),
          promoCode: suPromoCode.trim(),
        }),
      });
      const data = await res.json();
      console.log("LOGIN RESPONSE:", data);
      if (data.success) {
        localStorage.setItem("qr_pos_user", JSON.stringify(data.user));

        try {
          await assignTakeawayTable();
        } catch (tableError) {
          setError(tableError.message || "Unable to assign a new table.");
          setLoading(false);
          return;
        }

        if (data.user?.Promocode && data.user.Promocode.trim() !== "") {

          localStorage.setItem("promoCode", data.user.Promocode);
          localStorage.setItem("promoAmount", data.user.Promoamount || 0);
          localStorage.setItem("availableCredit", data.user.AvailableCredit || 0);

        } else {

          localStorage.removeItem("promoCode");
          localStorage.removeItem("promoAmount");
          localStorage.removeItem("availableCredit");

        }

        setSuccessUser(data.user.FullName || data.user.UserName || suUsername.trim());
        setSignedUpUser(data.user);
        setShowGiftModal(true);
      } else {
        setError(data.message || "Registration failed. Please try again.");
      }
    } catch (err) {
      setError("Cannot connect to server. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };



  return (
    <>

      {/* PROMO IMAGES CAROUSEL */}
      {showPromoImage && promoImages.length > 0 && (
        <div className="promo-image-overlay">
          <div className="promo-image-popup">

            {/* Close button */}
            <button
              type="button"
              className="promo-close-btn"
              onClick={() => setShowPromoImage(false)}
            >
              ×
            </button>

            {/* Slide counter */}
            {promoImages.length > 1 && (
              <div className="promo-slide-counter">
                {currentSlide + 1} / {promoImages.length}
              </div>
            )}

            {/* Image */}
            <img
              key={currentSlide}
              src={promoImages[currentSlide].PromoImage}
              alt={promoImages[currentSlide].PromoName || "Promotion"}
              className="promo-popup-image"
            />



            {/* Dot indicators */}
            {promoImages.length > 1 && (
              <div className="promo-dots">
                {promoImages.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    className={`promo-dot ${i === currentSlide ? "active" : ""}`}
                    onClick={() => setCurrentSlide(i)}
                    aria-label={`Slide ${i + 1}`}
                  />
                ))}
              </div>
            )}

          </div>
        </div>
      )}
      <div className="login-root">
        <div className="login-top-curve">
          {/* <div className="login-table-badge">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
             <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 0 1 0-5 2.5 2.5 0 0 1 0 5z"/>
          </svg>
          Table 30
        </div> */}
        </div>

        <div className="login-card">

          {/* Brand */}
          <div className="login-brand">
            <div className="login-logo-ring">
              <img src="https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=150&h=150" alt="Restaurant Logo" />
            </div>
            <div className="login-brand-name">Unipro POS</div>
          </div>

          {/* Tab Switcher */}
          <div className="login-tabs" role="tablist">
            <button
              id="tab-signin"
              className={`login-tab ${tab === "signin" ? "active" : ""}`}
              onClick={() => switchTab("signin")}
              role="tab"
              aria-selected={tab === "signin"}
            >
              Sign In
            </button>
            <button
              id="tab-signup"
              className={`login-tab ${tab === "signup" ? "active" : ""}`}
              onClick={() => switchTab("signup")}
              role="tab"
              aria-selected={tab === "signup"}
            >
              Sign Up
            </button>
          </div>

          {tab === "signin" && (
            <div className="login-heading">
              <div className="login-title">Hello</div>
              <div className="login-subtitle">Sign into your Account</div>
            </div>
          )}

          {/* ── SIGN IN FORM ────────────────────────── */}
          {tab === "signin" && (
            <form className="login-form" onSubmit={handleSignIn} key="signin">
              <div className="login-field">
                <label className="login-label" htmlFor="si-username">Email ID or Username*</label>
                <div className="login-input-wrap">
                  <span className="login-input-icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="2" y="4" width="20" height="16" rx="2" />
                      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                    </svg>
                  </span>
                  <input
                    id="si-username"
                    className="login-input"
                    type="text"
                    placeholder="valentino@gmail.com"
                    value={siUsername}
                    onChange={(e) => setSiUsername(e.target.value)}
                    autoComplete="username"
                    autoFocus
                  />
                </div>
              </div>

              <div className="login-field">
                <label className="login-label" htmlFor="si-password">Password*</label>
                <div className="login-input-wrap">
                  <span className="login-input-icon"><LockIcon /></span>
                  <input
                    id="si-password"
                    className="login-input"
                    type={showPass ? "text" : "password"}
                    placeholder="••••••••••••"
                    value={siPassword}
                    onChange={(e) => setSiPassword(e.target.value)}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    className="login-eye-btn"
                    onClick={() => setShowPass((v) => !v)}
                    aria-label={showPass ? "Hide password" : "Show password"}
                  >
                    {showPass ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                </div>
              </div>

              <div className="login-forgot-password">
                <a href="#forgot" onClick={(e) => e.preventDefault()}>Forgot your Password?</a>
              </div>

              {error && (
                <div className="login-error" role="alert">
                  <AlertIcon /> {error}
                </div>
              )}

              <button
                id="btn-signin"
                type="submit"
                className={`login-submit-btn ${loading ? "loading" : ""}`}
                disabled={loading}
              >
                {loading && <span className="login-spinner" />}
                Login
              </button>

              <div className="login-divider">or</div>

              <button
                type="button"
                className="login-guest-btn"
                onClick={async () => {
                  setError("");
                  setLoading(true);
                  try {
                    await assignTakeawayTable();
                    const guestUser = { FullName: "Guest", UserId: "guest", UserName: "guest" };
                    sessionStorage.setItem("isLoggedIn", "true");
                    localStorage.setItem("qr_pos_user", JSON.stringify(guestUser));
                    if (onLoginSuccess) {
                      onLoginSuccess(guestUser);
                    } else {
                      window.location.reload();
                    }
                  } catch (tableError) {
                    setError(tableError.message || "Unable to assign a new table.");
                  } finally {
                    setLoading(false);
                  }
                }}
              >
                <UserIcon /> Continue as Guest
              </button>

              <div className="login-footer-text">
                Don't have an account?{" "}
                <button
                  type="button"
                  onClick={() => switchTab("signup")}
                >
                  Register Now
                </button>
              </div>
            </form>
          )}

          {/* ── SIGN UP FORM ────────────────────────── */}
          {tab === "signup" && (
            <form className="login-form" onSubmit={handleSignUp} key="signup">
              <div className="login-field">
                <label className="login-label" htmlFor="su-username">Username *</label>
                <div className="login-input-wrap">
                  <span className="login-input-icon"><UserIcon /></span>
                  <input
                    id="su-username"
                    className="login-input"
                    type="text"
                    placeholder="Choose a username"
                    value={suUsername}
                    onChange={(e) => setSuUsername(e.target.value)}
                    autoComplete="username"
                  />
                </div>
              </div>

              <div className="login-field">
                <label className="login-label" htmlFor="su-phone">Phone Number *</label>
                <div className="login-input-wrap">
                  <span className="login-input-icon"><PhoneIcon /></span>
                  <input
                    id="su-phone"
                    className="login-input"
                    type="tel"
                    placeholder="Enter phone number"
                    value={suPhone}
                    onChange={(e) => setSuPhone(e.target.value)}
                    autoComplete="tel"
                  />
                </div>
              </div>

              <div className="login-field">
                <label className="login-label" htmlFor="su-password">Password *</label>
                <div className="login-input-wrap">
                  <span className="login-input-icon"><LockIcon /></span>
                  <input
                    id="su-password"
                    className="login-input"
                    type={showPass ? "text" : "password"}
                    placeholder="Create a password"
                    value={suPassword}
                    onChange={(e) => setSuPassword(e.target.value)}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className="login-eye-btn"
                    onClick={() => setShowPass((v) => !v)}
                    aria-label={showPass ? "Hide password" : "Show password"}
                  >
                    {showPass ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                </div>
              </div>

              <div className="login-field">
                <label className="login-label" htmlFor="su-confirm">Confirm Password *</label>
                <div className="login-input-wrap">
                  <span className="login-input-icon"><LockIcon /></span>
                  <input
                    id="su-confirm"
                    className="login-input"
                    type={showConfirmPass ? "text" : "password"}
                    placeholder="Re-enter your password"
                    value={suConfirm}
                    onChange={(e) => setSuConfirm(e.target.value)}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className="login-eye-btn"
                    onClick={() => setShowConfirmPass((v) => !v)}
                    aria-label={showConfirmPass ? "Hide password" : "Show password"}
                  >
                    {showConfirmPass ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                </div>
              </div>

              {/* Promo Code */}
              <div className="login-field">
                <label className="login-label" htmlFor="su-promo">
                  Promo Code
                </label>
                <div className="login-input-wrap">
                  <span className="login-input-icon">
                    <UserIcon />
                  </span>
                  <input
                    id="su-promo"
                    className="login-input"
                    type="text"
                    placeholder="Enter promo code"
                    value={suPromoCode}
                    onChange={(e) => setSuPromoCode(e.target.value)}
                  />
                </div>
              </div>

              {error && (
                <div className="login-error" role="alert">
                  <AlertIcon /> {error}
                </div>
              )}

              <button
                id="btn-signup"
                type="submit"
                className={`login-submit-btn ${loading ? "loading" : ""}`}
                disabled={loading}
              >
                {loading && <span className="login-spinner" />}
                Create Account
              </button>

              <div className="login-footer-text">
                Already have an account?{" "}
                <button type="button" onClick={() => switchTab("signin")}>
                  Sign In
                </button>
              </div>
            </form>
          )}

        </div>

        {/* Loading Overlay */}
        {loading && (
          <div className="login-loading-overlay" role="status" aria-live="polite">
            <div className="login-large-spinner" />
            <div className="login-loading-text">Processing...</div>
          </div>
        )}

        {/* Gift Modal */}
        {showGiftModal && (
          <div className="login-success-overlay" role="dialog" aria-modal="true">
            <div className="login-success-box" style={{ background: '#ffffff', border: '1px solid #e5e7eb', boxShadow: '0 25px 50px rgba(0,0,0,0.1)' }}>
              <div className="login-success-icon" style={{ background: 'linear-gradient(135deg, var(--theme-color), var(--theme-color-strong))', boxShadow: '0 0 0 12px var(--theme-color-soft)' }}>
                <CheckIcon />
              </div>
              <div className="login-success-title" style={{ color: '#1f2937' }}>Welcome!</div>
              <div className="login-success-sub" style={{ color: '#6b7280', fontSize: '15px', marginBottom: '16px' }}>
                As a new customer, you can receive a gift at the counter.
              </div>
              <button
                className="login-submit-btn"
                onClick={async () => {
                  console.log("SIGNUP USER:", signedUpUser);
                  try {
                    await assignTakeawayTable();
                  } catch (tableError) {
                    setError(tableError.message || "Unable to assign a new table.");
                    setShowGiftModal(false);
                    return;
                  }

                  // Login session create
                  sessionStorage.setItem("isLoggedIn", "true");
                  localStorage.setItem("qr_pos_user", JSON.stringify(signedUpUser));

                  if (signedUpUser?.Promocode) {
                    localStorage.setItem("promoCode", signedUpUser.Promocode);
                    localStorage.setItem("promoAmount", signedUpUser.Promoamount || 0);
                  } else {
                    localStorage.removeItem("promoCode");
                    localStorage.removeItem("promoAmount");
                  }

                  // Gift popup close
                  setShowGiftModal(false);

                  // Success popup
                  setShowSuccess(true);

                  setTimeout(() => {
                    if (onLoginSuccess) {
                      onLoginSuccess({
                        ...signedUpUser,
                        Promocode: localStorage.getItem("promoCode") || "",
                        Promoamount: Number(localStorage.getItem("promoAmount") || 0),
                        AvailableCredit: Number(localStorage.getItem("availableCredit") || 0),
                      });
                    }
                  }, 1400);
                }}
              >
                Awesome!
              </button>
            </div>
          </div>
        )}

        {/* Success Overlay */}
        {showSuccess && (
          <div className="login-success-overlay" role="status" aria-live="polite">
            <div className="login-success-box">
              <div className="login-success-icon">
                <CheckIcon />
              </div>
              <div className="login-success-title">Welcome, {successUser}!</div>
              <div className="login-success-sub">Redirecting to menu…</div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
