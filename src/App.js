import React, { useState, useEffect, useRef } from "react";
// import axios from "axios";
import { io } from "socket.io-client";
import KioskStartPage from "./KioskStartPage";
import "./App.css";
import { BASE_URL } from "./Configs/api";
import { QRCodeSVG } from "qrcode.react";
import {
  Routes,
  Route
} from "react-router-dom";
import PullToRefresh from 'react-simple-pull-to-refresh';

import SettlementSuccess from "./SettlementSuccess";
import UniversalPrinter from "./components/UniversalPrinter";

function App() {

  const skipSaveRef = useRef(false);
  const deleteInProgressRef = useRef(false);
  const actionRef = useRef(""); // "INSERT", "UPDATE", "DELETE"
  const pendingSaveRef = useRef(null); // tracks in-flight saveCartToBackend promise
  const currentOrderIdRef = useRef(null); // always holds the latest orderId synchronously
  const [isLoggedIn, setIsLoggedIn] = useState(() => sessionStorage.getItem("isLoggedIn") === "true");

  const API = `${BASE_URL}/api`;
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState([]);
  const [serviceChargePercent, setServiceChargePercent] = useState(0);
  const [gstPercent, setGstPercent] = useState(0);
  const [isCartLoading, setIsCartLoading] = useState(false);
  const [paymentDone, setPaymentDone] = useState(false);
  const [kioskThankYouOrderId, setKioskThankYouOrderId] = useState(null);

  // Show the kiosk thank-you screen for 5s then reset to kiosk start page
  const showKioskThankYou = (orderId) => {
    setKioskThankYouOrderId(orderId);
    setTimeout(() => {
      // Clear all kiosk session data
      localStorage.removeItem("kioskOrderId");
      localStorage.removeItem("kioskOrderType");
      localStorage.removeItem("orderId");
      sessionStorage.removeItem("isLoggedIn");
      // Hard reload to Kiosk Start Page
      window.location.href = "/";
    }, 5000);
  };
  const [showCartPage, setShowCartPage] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [enableLogin, setEnableLogin] = useState(false);

  // Navigation states
  const [categories, setCategories] = useState([]);
  const [groups, setGroups] = useState([]);
  const [dishes, setDishes] = useState([]);
  // Cache: DishId → true (has modifiers) | false (no modifiers) | undefined (loading)
  const [dishModifiersCache, setDishModifiersCache] = useState({});

  const [activeCategory, setActiveCategory] = useState(null);
  const [activeGroup, setActiveGroup] = useState(null);
  const [tableNo, setTableNo] = useState("");
  const [tableId, setTableId] = useState("");
  // Kiosk mode: true when the user arrived via the Kiosk start page (no table)
  const [isKiosk, setIsKiosk] = useState(() => !!localStorage.getItem("kioskOrderId"));

  const [currentOrderId, setCurrentOrderId] = useState(null);

  const [showPaymentPopup, setShowPaymentPopup] = useState(false);
  const [showOnlinePayment, setShowOnlinePayment] = useState(false);
  const [showPayNowModal, setShowPayNowModal] = useState(false);
  const [showUpiModal, setShowUpiModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [enableKotQr, setEnableKotQr] = useState(0);
  const [enableCombo, setEnableCombo] = useState(0);
  const [showComboCustomizer, setShowComboCustomizer] = useState(false);
  const [comboConfig, setComboConfig] = useState(null);
  const [comboSelections, setComboSelections] = useState({});
  const [comboError, setComboError] = useState(null);
  const [comboLoading, setComboLoading] = useState(false);
  const [comboDishModifiers, setComboDishModifiers] = useState([]);
  const [selectedComboModifierIds, setSelectedComboModifierIds] = useState([]);
  const [comboQty, setComboQty] = useState(1);

  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [paynowUpiId, setPaynowUpiId] = useState('');
  const [upiUpiId, setUpiUpiId] = useState('');
  const [tempPaynowUpiId, setTempPaynowUpiId] = useState('');
  const [tempUpiUpiId, setTempUpiUpiId] = useState('');
  const DEFAULT_THEME_COLOR = "#f97316";
  const THEME_COLOR_OPTIONS = ["#f97316", "#3b82f6", "#10b981", "#8b5cf6", "#ef4444", "#ec4899"];
  const [themeColor, setThemeColor] = useState(() => localStorage.getItem("themeColor") || DEFAULT_THEME_COLOR);
  const [tempThemeColor, setTempThemeColor] = useState(() => localStorage.getItem("themeColor") || DEFAULT_THEME_COLOR);

  const hexToRgba = (hex, alpha) => {
    const normalizedHex = hex.replace('#', '');
    const safeHex = normalizedHex.length === 3
      ? normalizedHex.split('').map((char) => char + char).join('')
      : normalizedHex;

    const intValue = Number.parseInt(safeHex, 16);
    const red = (intValue >> 16) & 255;
    const green = (intValue >> 8) & 255;
    const blue = intValue & 255;

    return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
  };

  useEffect(() => {
    const nextTheme = themeColor || DEFAULT_THEME_COLOR;
    document.documentElement.style.setProperty("--theme-color", nextTheme);
    document.documentElement.style.setProperty("--theme-color-soft", hexToRgba(nextTheme, 0.12));
    document.documentElement.style.setProperty("--theme-color-strong", hexToRgba(nextTheme, 0.22));
    document.documentElement.style.setProperty("--theme-color-shadow", hexToRgba(nextTheme, 0.18));
    localStorage.setItem("themeColor", nextTheme);
  }, [themeColor]);

  useEffect(() => {
    setTempThemeColor(themeColor);
  }, [themeColor]);

  const handlePaymentSuccess = (msg) => {
    setCart((prev) => prev.map((item) => ({ ...item, status: "SENT" })));
    setShowPaymentPopup(false);
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(""), 3000);
  };


  // Modal states
  const [showModifier, setShowModifier] = useState(false);
  const [selectedDish, setSelectedDish] = useState(null);
  const [modifiers, setModifiers] = useState([]);
  const [selectedModifierIds, setSelectedModifierIds] = useState([]);

  // Custom Mod states
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [customItemName, setCustomItemName] = useState("");
  const [customItemPrice, setCustomItemPrice] = useState("");
  const [customMods, setCustomMods] = useState([]);

  useEffect(() => {

    const fetchQRs = async () => {
      try {
        const res = await fetch(`${API}/paymodes/qrs`);
        const data = await res.json();

        if (data.paynow) {
          setPaynowUpiId(data.paynow);
          setTempPaynowUpiId(data.paynow);
        }
        if (data.upi) { setUpiUpiId(data.upi); setTempUpiUpiId(data.upi); }
      } catch (err) {
        console.log("FETCH QRS ERROR:", err);
      }
    };
    fetchQRs();

    const loadAppSettings = async () => {
      try {
        const res = await fetch(`${API}/app-settings`);
        const data = await res.json();

        if (data.success) {
          setEnableLogin(Number(data.enableLogin) === 1);
        }
      } catch (err) {
        console.log(err);
      } finally {
        setLoading(false);
      }
    };

    loadAppSettings();

    const loadCompanySettings = async () => {
      try {
        const res = await fetch(`${API}/company/settings`);
        const data = await res.json();

        setServiceChargePercent(
          Number(data.ServiceChargePercentage || 0)
        );
        setGstPercent(
          Number(data.GSTPercentage || 0)
        );
        setEnableKotQr(
          Number(data.Enablekotqr || 0)
        );
        setEnableCombo(
          Number(data.EnableCombo || 0)
        );
      } catch (err) {
        console.log(err);
      }
    };

    loadCompanySettings();

    loadKitchens();

    const params = new URLSearchParams(window.location.search);

    const table = params.get("table");
    const tid = params.get("tableId");

    const oldTableId = localStorage.getItem("tableId");

    // Only clear session when the user scanned a DIFFERENT table's QR code.
    // If there's no tableId in the URL (e.g. takeaway login), leave the session intact.
    if (tid && oldTableId && oldTableId !== String(tid)) {
      sessionStorage.removeItem("isLoggedIn");
      localStorage.removeItem("qr_pos_user");
      localStorage.removeItem("promoCode");
      localStorage.removeItem("promoAmount");
      localStorage.removeItem("availableCredit");
      setIsLoggedIn(false);
    }

    if (table) {
      setTableNo(table);
    }

    if (tid) {
      localStorage.setItem("tableId", tid);
      setTableId(tid);
      loadCart(tid);
    }

  }, []);

  useEffect(() => {
    // Allow save when: (a) in kiosk mode, OR (b) a table is assigned (tableNo is set)
    if (!isKiosk && !tableNo) return;

    // ✅ FIX: Do not save cart after payment is completed
    if (paymentDone) return;

    if (skipSaveRef.current) {
      skipSaveRef.current = false;
      return;
    }

    // Track the in-flight save so Refresh can wait for it
    const savePromise = saveCartToBackend();
    pendingSaveRef.current = savePromise;
    savePromise.finally(() => {
      if (pendingSaveRef.current === savePromise) {
        pendingSaveRef.current = null;
      }
    });

  }, [cart, paymentDone]);

  const activeGroupRef = useRef(activeGroup);
  useEffect(() => {
    activeGroupRef.current = activeGroup;
  }, [activeGroup]);

  // Real-time Sync Effect
  useEffect(() => {
    if (!tableId) return;

    // Connect to the base URL (not /api)
    const socket = io(BASE_URL);

    socket.on("connect", () => {
      console.log("Connected to real-time sync server");
      socket.emit("join_table", { tableId });
    });

    socket.on("cart_updated", async (data) => {
      if (data && data.tableId && String(data.tableId).toLowerCase() === String(tableId).toLowerCase()) {
        console.log("Real-time sync: cart updated on another device");
        // Wait for any in-flight local saves to finish first to avoid race conditions
        if (pendingSaveRef.current) {
          try { await pendingSaveRef.current; } catch (_) { }
        }
        await loadCart(tableId);
      }
    });

    socket.on("order_closed", (data) => {
      if (data && data.tableId && String(data.tableId).toLowerCase() === String(tableId).toLowerCase()) {
        console.log("Real-time sync: order closed on another device");
        window.location.reload();
      }
    });

    socket.on("menu_updated", async () => {
      console.log("Real-time sync: menu updated in database");
      await loadKitchens();
      if (activeGroupRef.current) {
        await loadDishes(activeGroupRef.current);
      }
    });

    return () => {
      socket.emit("leave_table", { tableId });
      socket.disconnect();
    };
  }, [tableId]);

  const loadKitchens = async () => {
    try {
      const res = await fetch(`${API}/kitchens`);
      const data = await res.json();

      const safeData = Array.isArray(data) ? data : [];
      setCategories(safeData);

      if (safeData.length > 0) {
        setActiveCategory(safeData[0].CategoryId);
        loadGroups(safeData[0].CategoryId);
      }
    } catch (err) {
      console.log(err);
    }
  };

  const loadGroups = async (categoryId) => {
    try {
      const res = await fetch(`${API}/dishgroups/${categoryId}`);
      const data = await res.json();

      setGroups(data);

      if (data.length > 0) {
        setActiveGroup(data[0].DishGroupId);
        loadDishes(data[0].DishGroupId);
      }
    } catch (err) {
      console.log(err);
    }
  };

  const loadDishes = async (groupId) => {
    try {
      const res = await fetch(`${API}/dishes/group/${groupId}`);
      const data = await res.json();
      console.log(JSON.stringify(data, null, 2));
      setDishes(data);
    } catch (err) {
      console.log(err);
    }
  };

  const filteredItems = dishes.filter((dish) =>
    dish.Name?.toLowerCase().includes(search.toLowerCase())
  );

  // When dishes change, pre-fetch modifier status for all of them in parallel
  useEffect(() => {
    if (!dishes || dishes.length === 0) return;
    const controller = new AbortController();
    const fetchAll = async () => {
      const results = await Promise.all(
        dishes.map(async (dish) => {
          // Skip combo dishes — they always open the customizer
          if (Number(dish.IsCombo) === 1) return { id: dish.DishId, hasMods: true };
          try {
            const res = await fetch(`${API}/modifiers/${dish.DishId}`, { signal: controller.signal });
            if (!res.ok) return { id: dish.DishId, hasMods: false };
            const mods = await res.json();
            return { id: dish.DishId, hasMods: Array.isArray(mods) && mods.length > 0 };
          } catch {
            return { id: dish.DishId, hasMods: false };
          }
        })
      );
      const cache = {};
      results.forEach(({ id, hasMods }) => { cache[id] = hasMods; });
      setDishModifiersCache(prev => ({ ...prev, ...cache }));
    };
    fetchAll();
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dishes]);

  // const openModifiers = async (dish) => {
  //   console.log("Clicked");

  //   if (Number(enableCombo) === 1 && Number(dish.IsCombo) === 1) {
  //     openComboCustomizer(dish);
  //     return;
  //   }

  //   try {
  //     const res = await fetch(`${API}/modifiers/${dish.DishId}`);
  //     const mods = await res.json();

  //     if (mods && mods.length > 0) {
  //       setSelectedDish(dish);
  //       setModifiers(mods);
  //       setSelectedModifierIds([]);
  //       setCustomMods([]);
  //       setShowModifier(true);
  //     } else {
  //       addToCartSimple(dish);
  //     }
  //   } catch (err) {
  //     console.log(err);
  //     addToCartSimple(dish);
  //   }
  // };

  const openModifiers = async (dish) => {
    // Combo
    if (Number(enableCombo) === 1 && Number(dish.IsCombo) === 1) {
      openComboCustomizer(dish);
      return;
    }

    try {
      const res = await fetch(`${API}/modifiers/${dish.DishId}`);

      if (!res.ok) {
        addToCartSimple(dish);
        return;
      }

      const mods = await res.json();
      console.log("Modifiers:", mods);

      if (Array.isArray(mods) && mods.length > 0) {
        setSelectedDish(dish);
        setModifiers(mods);
        setSelectedModifierIds([]);
        setCustomMods([]);
        setComboQty(1); // Reset quantity for modifier screen
        setShowModifier(true);
      } else {
        addToCartSimple(dish);
      }
    } catch (err) {
      console.log(err);
      addToCartSimple(dish);
    }
  };

  const openComboCustomizer = async (dish) => {
    console.log("Inside Combo");
    setSelectedDish(dish);
    setComboLoading(true);
    setComboError(null);
    setComboSelections({});
    setComboDishModifiers([]);
    setSelectedComboModifierIds([]);
    setComboQty(1);
    setShowComboCustomizer(true);
    console.log("Modal opened");
    try {
      const [res, modRes] = await Promise.all([
        fetch(`${API}/combo/config/${dish.DishId}`),
        fetch(`${API}/modifiers/${dish.DishId}`).catch(() => null)
      ]);

      if (modRes && modRes.ok) {
        const modData = await modRes.json();
        if (Array.isArray(modData)) {
          setComboDishModifiers(modData);
        }
      }

      if (!res.ok) throw new Error("Failed to load combo options.");
      const payload = await res.json();
      if (payload.success && payload.data) {
        const config = payload.data;
        setComboConfig(config);

        // Auto-select defaults
        const initialSelections = {};
        (config.groups || []).forEach((group) => {
          let defaults = (group.options || []).filter(o => o.isDefault).map(o => o.dishId);
          if (!group.isMultiSelect || group.maxSelection === 1) {
            defaults = defaults.slice(0, 1);
          }
          if (defaults.length === 0 && group.minSelection > 0 && group.options && group.options.length > 0) {
            defaults = [group.options[0].dishId];
          }
          initialSelections[group.comboGroupId] = defaults;
        });
        setComboSelections(initialSelections);
      } else {
        throw new Error(payload.error || "Failed to load combo config.");
      }
    } catch (err) {
      console.error("Combo config fetch error:", err);
      setComboError(err.message || "Something went wrong.");
    } finally {
      setComboLoading(false);
    }
  };

  const handleSelectComboOption = (groupId, option, isMulti, maxSelect) => {
    setComboError(null);
    setComboSelections((prev) => {
      const current = prev[groupId] || [];
      if (current.includes(option.dishId)) {
        return {
          ...prev,
          [groupId]: current.filter((id) => id !== option.dishId)
        };
      } else {
        if (isMulti) {
          if (current.length >= maxSelect) {
            return prev;
          }
          return {
            ...prev,
            [groupId]: [...current, option.dishId]
          };
        } else {
          return {
            ...prev,
            [groupId]: [option.dishId]
          };
        }
      }
    });
  };

  const handleToggleComboModifier = (modId) => {
    setSelectedComboModifierIds((prev) =>
      prev.includes(modId)
        ? prev.filter((id) => id !== modId)
        : [...prev, modId]
    );
  };

  const calculateComboTotal = () => {
    if (!comboConfig) return 0;

    let totalSurcharge = 0;
    (comboConfig.groups || []).forEach(group => {
      const selectedIds = comboSelections[group.comboGroupId] || [];
      const selectedOptions = (group.options || []).filter(o => selectedIds.includes(o.dishId));
      selectedOptions.forEach(opt => {
        totalSurcharge += (Number(opt.surcharge) || 0) + (Number(opt.dishPrice) || 0);
      });
    });

    const chosenModifiers = comboDishModifiers
      .filter(m => selectedComboModifierIds.includes(String(m.ModifierID || m.ModifierId || "")));
    const modifierPriceTotal = chosenModifiers.reduce((sum, m) => sum + (Number(m.Price) || 0), 0);

    return (Number(comboConfig.basePrice) || 0) + totalSurcharge + modifierPriceTotal;
  };

  const handleAddComboToCart = () => {
    if (!comboConfig || !selectedDish) return;

    // Validate minimum selections
    for (const group of comboConfig.groups) {
      const selectedIds = comboSelections[group.comboGroupId] || [];
      const effectiveMin = group.options && group.options.length > 0 ? group.minSelection : 0;
      if (selectedIds.length < effectiveMin) {
        setComboError(`Please pick at least ${group.minSelection} choice(s) for "${group.groupName}"`);
        return;
      }
    }

    // Build selected modifiers list
    const chosenModifiers = comboDishModifiers
      .filter(m => selectedComboModifierIds.includes(String(m.ModifierID || m.ModifierId || "")))
      .map(m => ({
        ModifierID: String(m.ModifierID || m.ModifierId || ""),
        ModifierName: m.ModifierName,
        Price: Number(m.Price || 0),
        qty: 1,
      }));

    // Build the selection details payload
    const chosenSelections = comboConfig.groups.map(group => {
      const selectedIds = comboSelections[group.comboGroupId] || [];
      const selectedOptions = group.options.filter(o => selectedIds.includes(o.dishId));
      return {
        groupId: group.comboGroupId,
        groupName: group.groupName,
        items: selectedOptions.map(o => ({
          dishId: o.dishId,
          name: o.name,
          surcharge: o.surcharge,
          dishPrice: o.dishPrice || 0,
          KitchenTypeCode: o.KitchenTypeCode,
          KitchenTypeName: o.KitchenTypeName,
          PrinterIP: o.PrinterIP,
        }))
      };
    });

    // Sum surcharges and dish prices
    let totalSurcharge = 0;
    chosenSelections.forEach(grp => {
      grp.items.forEach(opt => {
        totalSurcharge += (Number(opt.surcharge) || 0) + (Number(opt.dishPrice) || 0);
      });
    });

    const modifierPriceTotal = chosenModifiers.reduce((sum, m) => sum + (Number(m.Price) || 0), 0);
    const finalPrice = (Number(comboConfig.basePrice) || 0) + totalSurcharge + modifierPriceTotal;
    console.log("chosenModifiers:", chosenModifiers);
    const newCartItem = {
      ...selectedDish,
      cartId: crypto.randomUUID(),
      qty: comboQty,
      isCombo: true,
      price: finalPrice,
      Price: finalPrice,
      basePrice: comboConfig.basePrice,
      comboSelections: chosenSelections,
      selectedMods: chosenModifiers,
      modifiers: chosenModifiers,
      status: "NEW"
    };

    // actionRef.current = "INSERT";
    // setCart(prev => [...prev, newCartItem]);
    // setShowComboCustomizer(false);
    actionRef.current = "INSERT";

    setCart(prev => {
      const existing = prev.find(item =>
        (item.DishId || item.id) === (selectedDish.DishId || selectedDish.id) &&
        (item.comboSelections || []).length === 0 &&
        JSON.stringify(item.selectedMods || []) === JSON.stringify(chosenModifiers) &&
        item.status !== "SENT"
      );

      if (existing) {
        return prev.map(item =>
          item === existing
            ? {
              ...item,
              qty: (item.qty || 1) + comboQty,
              status: "NEW"
            }
            : item
        );
      }

      return [...prev, newCartItem];
    });

    setShowComboCustomizer(false);
  };

  const handleAddBaseComboDirectly = () => {
    if (!selectedDish) return;

    const chosenModifiers = comboDishModifiers
      .filter(m => selectedComboModifierIds.includes(String(m.ModifierID || m.ModifierId || "")))
      .map(m => ({
        ModifierID: String(m.ModifierID || m.ModifierId || ""),
        ModifierName: m.ModifierName,
        Price: Number(m.Price || 0),
        qty: 1,
      }));

    const modifierPriceTotal = chosenModifiers.reduce((sum, m) => sum + (Number(m.Price) || 0), 0);
    const finalPrice = Number(selectedDish.Price || selectedDish.price || 0) + modifierPriceTotal;
    console.log("chosenModifiers:", chosenModifiers);
    const newCartItem = {
      ...selectedDish,
      cartId: crypto.randomUUID(),
      qty: comboQty,
      isCombo: true,
      price: finalPrice,
      Price: finalPrice,
      selectedMods: chosenModifiers,
      modifiers: chosenModifiers,
      comboSelections: [],
      status: "NEW"
    };

    // actionRef.current = "INSERT";
    // setCart(prev => [...prev, newCartItem]);
    // setShowComboCustomizer(false);
    actionRef.current = "INSERT";

    setCart(prev => {
      const existing = prev.find(item =>
        (item.DishId || item.id) === (selectedDish.DishId || selectedDish.id) &&
        (item.comboSelections || []).length === 0 &&
        JSON.stringify(item.selectedMods || []) === JSON.stringify(chosenModifiers) &&
        item.status !== "SENT"
      );

      if (existing) {
        return prev.map(item =>
          item === existing
            ? {
              ...item,
              qty: (item.qty || 1) + comboQty,
              status: "NEW"
            }
            : item
        );
      }

      return [...prev, newCartItem];
    });

    setShowComboCustomizer(false);
  };

  const loadModifiers = async (dishId) => {
    try {
      const res = await fetch(`${API}/modifiers/${dishId}`);
      const data = await res.json();

      const hasOpen = data.some(
        (m) =>
          m.ModifierName?.toUpperCase() === "OPEN"
      );

      if (!hasOpen) {
        data.push({
          ModifierID: "open",
          ModifierName: "OPEN",
          Price: 0,
        });
      }

      setModifiers(data);
    } catch (err) {
      console.log(err);
    }
  };
  const addToCartSimple = async (dish) => {
    actionRef.current = "INSERT";
    setCart((prev) => {

      // const existing = prev.find(
      //   (item) =>
      //     (item.DishId || item.id) === dish.DishId
      // );

      console.log("Clicked DishId:", dish.DishId);

      prev.forEach((x) => {
        console.log(
          "Cart DishId:", x.DishId,
          "id:", x.id,
          "status:", x.status
        );
      });

      const existing = prev.find(
        (item) =>
          (item.DishId || item.id) === dish.DishId &&
          item.status !== "SENT"
      );

      // already exists
      if (existing) {
        return prev.map((item) =>
          (item.DishId || item.id) === dish.DishId
            ? {
              ...item,
              qty: (item.qty || 1) + 1,
              status: "NEW",
            }
            : item
        );
      }

      // new item
      return [
        ...prev,
        {
          ...dish,
          cartId: crypto.randomUUID(),

          qty: 1,

          selectedMods: [],

          finalPrice: Number(dish.Price || 0),
          status: "NEW",
        }
      ];
    });

  };

  const increaseQty = (index) => {
    actionRef.current = "UPDATE";
    setCart((prev) =>

      prev.map((item, i) =>

        i === index
          ? {
            ...item,
            qty: Number(item.qty || 1) + 1,
          }
          : item
      )
    );
  };

  const decreaseQty = async (index) => {
    const item = cart[index];
    if (!item) return;

    let currentQty = Number(item.qty);
    if (isNaN(currentQty)) currentQty = 1;

    // qty = 1 → delete from DB
    if (currentQty <= 1) {

      // ✅ Set skipSaveRef BEFORE setCart so the useEffect does NOT fire
      // saveCartToBackend automatically — preventing a race with the delete API
      skipSaveRef.current = true;
      deleteInProgressRef.current = true;
      actionRef.current = "DELETE";

      // Optimistic UI update: reliably remove by exact index
      if (cart.length === 1) {
        setCurrentOrderId(null);
        currentOrderIdRef.current = null;
      }
      setCart((prev) => {
        const newCart = [...prev];
        newCart.splice(index, 1);
        return newCart;
      });

      try {
        let actualLineItemId = item.lineItemId || item.OrderDetailId;

        // If no DB ID in state, fetch once from DB to find it
        if (!actualLineItemId && tableId) {
          try {
            const cartRes = await fetch(`${API}/order/cart/${tableId}`);
            const cartData = await cartRes.json();
            const match = cartData?.items?.find(b =>
              String(b.id || b.DishId || b.dishId) === String(item.DishId || item.id)
            );
            if (match) {
              actualLineItemId = match.lineItemId || match.OrderDetailId;
            }
          } catch (e) {
            console.log("Fetch lineItemId error:", e);
          }
        }

        if (actualLineItemId) {
          await fetch(`${API}/order/delete-cart-item`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              tableId: tableId,
              lineItemId: actualLineItemId,
            }),
          });
          console.log("DELETE ITEM: sent delete for", actualLineItemId);
        } else {
          console.warn("DELETE ITEM: no lineItemId found, skipping DB delete");
        }

      } catch (err) {
        console.log("DELETE ITEM ERROR:", err);
      } finally {
        deleteInProgressRef.current = false;
      }

      return;
    }

    // decrease qty
    actionRef.current = "UPDATE";
    setCart((prev) => {
      const newCart = [...prev];
      newCart[index] = { ...newCart[index], qty: currentQty - 1 };
      return newCart;
    });

  };

  // Online payment flow using YeahPay demo

  const handlePayOnline = async () => {
    // Calculate total amount inside the function/

    //OLD PROCESS---------------------------
    // const totalAmount = cart.reduce((s, i) =>
    //   s + (Number(i.Price || i.price || 0) * Number(i.qty || 1)), 0
    // ).toFixed(2);

    // console.log("Opening payment for amount:", totalAmount);
    // console.log("POS Order ID:", currentOrderId);

    //NEW PROCESS---------------------------

    // const eligibleAmount = cart.reduce(
    //   (sum, item) =>
    //     Number(item.isServiceCharge || 0) === 1
    //       ? sum +
    //       Number(item.Price || item.price || 0) *
    //       Number(item.qty || 1)
    //       : sum,
    //   0
    // );

    // Service Charge
    // const serviceCharge =
    //   eligibleAmount * (serviceChargePercent / 100);

    // Cart Subtotal
    // const subTotal = cart.reduce(
    //   (sum, item) =>
    //     sum +
    //     Number(item.Price || item.price || 0) *
    //     Number(item.qty || 1),
    //   0
    // );

    // const promoAmount = Number(localStorage.getItem("promoAmount") || 0);

    // GST Calculation
    // const beforeGST = subTotal + serviceCharge;

    // const gstAmount =
    //   beforeGST * (gstPercent / 100);

    // Final Total
    // const grandTotal = subTotal + serviceCharge + gstAmount;

    // const totalAmount = (
    //   grandTotal - promoAmount
    // ).toFixed(2);
    const paymentAmount = totalAmount;

    console.log("Payment Amount:", paymentAmount);

    console.log("Subtotal:", subTotal);
    // console.log("Eligible:", eligibleAmount);
    console.log("Service Charge:", serviceCharge);
    console.log("Grand Total:", totalAmount);

    // 👇 Continue with your existing payment logic
    console.log("Opening payment for amount:", totalAmount);
    console.log("POS Order ID:", currentOrderId);
    // Pass the real POS orderId as posOrderId so we can use it on success
    // (YeahPay generates its own orderId which does NOT match our DB OrderNumber)
    const demoUrl = `https://yeahpay-demo-production.up.railway.app?amount=${totalAmount}&orderId=${currentOrderId}&posOrderId=${encodeURIComponent(currentOrderId)}&from=pos`;

    const paymentWindow = window.open(demoUrl, '_blank', 'width=500,height=700');

    if (!paymentWindow) {
      alert("Popup blocked! Please allow popups for this site.");
      return;
    }

    // Capture the POS orderId at time of opening (closure)
    const posOrderIdAtOpen = currentOrderId;

    // Listen for payment success message
    const handleMessage = (event) => {
      if (event.data.type === 'YEAHPAY_PAYMENT_SUCCESS') {
        console.log("Payment success message received:", event.data);

        // Remove event listener
        window.removeEventListener('message', handleMessage);

        // Use the real POS orderId (posOrderId from event, or fallback to captured one)
        // The YeahPay demo may send back posOrderId if it forwards it; otherwise use our captured value
        const realPosOrderId = event.data.posOrderId || posOrderIdAtOpen;
        console.log("Using POS OrderId for DB update:", realPosOrderId);

        // Complete the order using the real POS orderId
        completeOrder(realPosOrderId, totalAmount);

        // Close the payment window
        if (paymentWindow) paymentWindow.close();
      }
    };

    window.addEventListener('message', handleMessage);
  };

  // const completeOrder = async (orderId, amount) => {
  //     try {
  //         const res = await fetch(`${API}/sales/save`, {
  //             method: "POST",
  //             headers: { "Content-Type": "application/json" },
  //             body: JSON.stringify({
  //                 orderId: orderId,
  //                 tableNo: tableNo,
  //                 tableId: tableId,
  //                 subTotal: parseFloat(amount),
  //                 totalAmount: parseFloat(amount),
  //                 paymentMethod: "ONLINE",
  //                 items: cart.map((item) => ({
  //                     id: item.DishId || item.id,
  //                     name: item.Name || item.name,
  //                     qty: Number(item.qty || 1),
  //                     price: Number(item.Price || item.price || 0)
  //                 }))
  //             })
  //         });

  //         const data = await res.json();
  //         if (data.success) {
  //             // Clear cart
  //             setCart([]);
  //             // Show success message
  //             handlePaymentSuccess(`Payment Successful! Amount: S$${amount}`);
  //             // Redirect to settlement success
  //             setTimeout(() => {
  //                 window.location.href = `/settlement-success?tableId=${tableId}&table=${tableNo}&orderId=${orderId}`;
  //             }, 1500);
  //         } else {
  //             alert(data.error || "Payment Failed");
  //         }
  //     } catch (err) {
  //         console.log("COMPLETE ORDER ERROR:", err);
  //         alert("Server Error: " + err.message);
  //     }
  // };

  const completeOrder = async (posOrderId, amount) => {
    try {
      console.log("[completeOrder] Using POS orderId:", posOrderId, "Amount:", amount);
      const promoAmount = Number(localStorage.getItem("promoAmount") || 0);
      const res = await fetch(`${API}/order/complete-online-payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: posOrderId,
          // For kiosk orders, omit tableNo and tableId — they are table-independent
          tableNo: isKiosk ? null : tableNo,
          tableId: isKiosk ? null : tableId,
          kioskOrderType: isKiosk ? localStorage.getItem("kioskOrderType") : undefined,
          totalAmount: parseFloat(amount),
          paymentMethod: "ONLINE",
          promoAmount,
          cart: cart
        })
      });

      const data = await res.json();
      console.log("UNIFIED COMPLETE PAYMENT RESPONSE:", data);

      if (!data.success) {
        alert(data.error || "Settlement Failed");
        return;
      }

      setPaymentDone(true);
      handlePaymentSuccess(`Payment Successful! Amount: S$${amount}`);

      // For kiosk: clear the session after payment
      if (isKiosk) {
        localStorage.removeItem("kioskOrderId");
        localStorage.removeItem("kioskOrderType");
      }

      setTimeout(() => {
        if (isKiosk) {
          // Kiosk: show thank-you screen for 5s then reset
          showKioskThankYou(posOrderId);
        } else {
          window.location.href =
            `/settlement-success?tableId=${tableId}&table=${tableNo}&orderId=${posOrderId}`;
        }
      }, 1000);

    } catch (err) {
      console.log("COMPLETE ORDER ERROR:", err);
      alert("Server Error: " + err.message);
    }
  };


  const saveCartToBackend = async () => {
    console.log("SAVE CART CALLED");
    if (paymentDone) {
      console.log("[saveCart] Skipped — payment already done.");
      setIsCartLoading(false);
      return;
    }
    setIsCartLoading(true);
    try {
      const payload = {
        isKiosk: isKiosk,
        tableId: isKiosk ? undefined : tableId,
        orderId: currentOrderId,
        userId: "00000000-0000-0000-0000-000000000000",
        kioskOrderType: isKiosk ? localStorage.getItem("kioskOrderType") : undefined,
        items: cart.map((item) => ({
          id: item.DishId || item.id,
          name: item.Name || item.name,
          qty: item.qty || 1,
          price: item.Price || item.price || 0,
          modifiers: (item.selectedMods || [])
            .filter((m) =>
              /^[0-9a-fA-F-]{36}$/.test(m.ModifierID || m.ModifierId)
            )
            .map((m) => ({
              ModifierId: m.ModifierID || m.ModifierId,
              ModifierName: m.ModifierName,
              Price: m.Price || 0,
              qty: 1,
            })),
          comboSelections: item.comboSelections || [],
          lineItemId:
            item.status === "NEW"
              ? null
              : (item.lineItemId || item.OrderDetailId || null),
          note: item.note || "",
          status: "NEW",
        })),
      };

      console.log("SAVE PAYLOAD:", JSON.stringify(payload, null, 2));

      const res = await fetch(`${API}/order/save-cart`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      console.log("SAVE CART:", data);

      if (data.orderId) {
        setCurrentOrderId(data.orderId);
        currentOrderIdRef.current = data.orderId;
        // Keep kioskOrderId in sync for kiosk sessions
        if (isKiosk) {
          localStorage.setItem("kioskOrderId", data.orderId);
        }
      }

      // For kiosk sessions: do a lightweight cart refresh by order number
      if (isKiosk && currentOrderId && actionRef.current === "INSERT") {
        try {
          const ordNo = data.orderId || currentOrderId;
          const cartRes = await fetch(`${API}/order/cart/kiosk/${ordNo}`);
          const cartData = await cartRes.json();
          if (cartData && cartData.items) {
            setCart(prev => {
              let changed = false;
              const updatedCart = prev.map(item => {
                if (!item.OrderDetailId && !item.lineItemId) {
                  const match = cartData.items.find(b =>
                    (b.id || b.DishId) === (item.DishId || item.id)
                  );
                  if (match && (match.OrderDetailId || match.lineItemId)) {
                    changed = true;
                    return {
                      ...item,
                      OrderDetailId: match.OrderDetailId || match.lineItemId,
                      lineItemId: match.OrderDetailId || match.lineItemId
                    };
                  }
                }
                return item;
              });
              if (changed) { skipSaveRef.current = true; return updatedCart; }
              return prev;
            });
          }
        } catch (syncErr) {
          console.log("Kiosk cart sync error:", syncErr);
        }
        return; // skip table-based sync below
      }

      if (tableId && !isKiosk && !deleteInProgressRef.current) {
        if (actionRef.current === "UPDATE") {
          try {
            await new Promise(r => setTimeout(r, 600));
            const cartRes = await fetch(`${API}/order/cart/${tableId}`);
            const cartData = await cartRes.json();

            if (cartData && cartData.items) {
              skipSaveRef.current = true;
              setCart(prev => {
                let changed = false;
                const updatedCart = prev.map(item => {
                  const match = cartData.items.find(b =>
                    (b.OrderDetailId || b.lineItemId) &&
                    (b.OrderDetailId || b.lineItemId) === (item.OrderDetailId || item.lineItemId)
                  );
                  if (match) {
                    const newQty = match.qty || match.Quantity || item.qty;
                    if (
                      newQty !== item.qty ||
                      match.OrderDetailId !== item.OrderDetailId
                    ) {
                      changed = true;
                      return {
                        ...item,
                        qty: newQty,
                        OrderDetailId: match.OrderDetailId || item.OrderDetailId,
                        lineItemId: match.OrderDetailId || match.lineItemId || item.lineItemId,
                      };
                    }
                  }
                  return item;
                });
                if (changed) {
                  skipSaveRef.current = true;
                  return updatedCart;
                }
                return prev;
              });
            }
          } catch (syncErr) {
            console.log("Refresh GET error:", syncErr);
          }
        } else if (actionRef.current === "INSERT") {
          try {
            const cartRes = await fetch(`${API}/order/cart/${tableId}`);
            const cartData = await cartRes.json();

            if (cartData && cartData.items) {
              setCart(prev => {
                let changed = false;
                const updatedCart = prev.map(item => {
                  if (!item.OrderDetailId && !item.lineItemId) {
                    const match = cartData.items.find((b) => {
                      const dbModKey = (b.modifiers || [])
                        .map((m) => m.ModifierId || m.ModifierID)
                        .sort()
                        .join("-");

                      const itemModKey = (item.selectedMods || [])
                        .map((m) => m.ModifierID || m.ModifierId)
                        .sort()
                        .join("-");

                      return (
                        (b.id || b.DishId || b.dishId) === (item.DishId || item.id) &&
                        dbModKey === itemModKey
                      );
                    });
                    if (match && (match.OrderDetailId || match.lineItemId)) {
                      changed = true;
                      return {
                        ...item,
                        OrderDetailId: match.OrderDetailId || match.lineItemId,
                        lineItemId: match.OrderDetailId || match.lineItemId
                      };
                    }
                  }
                  return item;
                });

                if (changed) {
                  skipSaveRef.current = true;
                  return updatedCart;
                }
                return prev;
              });
            }
          } catch (syncErr) {
            console.log("Silent ID sync error:", syncErr);
          }
        }
      }

    } catch (err) {
      console.log("SAVE CART ERROR:", err);
    } finally {
      setIsCartLoading(false);
    }
  };


  const placeOrder = async () => {
    setIsCartLoading(true);
    try {
      if (pendingSaveRef.current) {
        try { await pendingSaveRef.current; } catch (_) { }
      }

      const newItems = cart.filter(item => item.status === "NEW");

      const payload = {
        isKiosk: isKiosk,
        tableId: isKiosk ? undefined : tableId,
        orderId: currentOrderId,
        userId: "00000000-0000-0000-0000-000000000000",
        kioskOrderType: isKiosk ? localStorage.getItem("kioskOrderType") : undefined,
        items: newItems.map((item) => ({
          id: item.DishId || item.id,
          name: item.Name || item.name,
          qty: item.qty || 1,
          price: item.Price || item.price || 0,
          modifiers: (item.selectedMods || [])
            .filter((m) =>
              /^[0-9a-fA-F-]{36}$/.test(m.ModifierID || m.ModifierId)
            )
            .map((m) => ({
              ModifierId: m.ModifierID || m.ModifierId,
              ModifierName: m.ModifierName,
              Price: m.Price || 0,
              qty: 1,
            })),
          comboSelections: item.comboSelections || [],
          lineItemId: item.lineItemId || item.OrderDetailId || null,
          note: item.note || "",
          status: "NEW",
        })),
      };

      const res = await fetch(`${API}/order/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      console.log("ORDER SEND:", data);

      if (data.success) {
        setCart(prev =>
          prev.map(item => ({ ...item, status: "SENT" }))
        );
        if (data.orderId) {
          setCurrentOrderId(data.orderId);
          currentOrderIdRef.current = data.orderId;
          if (isKiosk) {
            localStorage.setItem("kioskOrderId", data.orderId);
          }
        }

        const totalAmount =
          cart.reduce((s, i) => s + (Number(i.Price || i.price || 0) * Number(i.qty || 1)), 0).toFixed(2);
        setShowPaymentPopup(true);
      }
      else {
        alert(data.error || "This order has already been placed by another customer. Your cart has been refreshed.");
      }

    } catch (err) {
      console.log("PLACE ORDER ERROR:", err);
      alert("Server Error");
    } finally {
      setIsCartLoading(false);
    }
  };

  const loadCart = async (tableIdParam) => {
    try {
      let url;
      // For kiosk sessions, fetch by order number, not by tableId
      if (isKiosk && currentOrderId) {
        url = `${API}/order/cart/kiosk/${currentOrderId}`;
      } else if (tableIdParam) {
        url = `${API}/order/cart/${tableIdParam}`;
      } else {
        return; // nothing to load
      }

      const res = await fetch(url);
      const data = await res.json();

      console.log("LOAD CART API RESPONSE BEFORE setCart:", data);
      console.log("LOAD CART RESPONSE:", data);
      console.log("CurrentOrderId From API:", data.currentOrderId);
      console.log("Items:", data.items);
      console.log("LOAD CART:", data);

      console.log("LOAD CART ITEMS:", JSON.stringify(data.items, null, 2));

      if (data.items) {
        const fromDB = data.items.map((item) => ({
          ...item,
          isServiceCharge: Number(item.isServiceCharge || 0),
          lineItemId: item.OrderDetailId || item.lineItemId,
          cartId: item.OrderDetailId || crypto.randomUUID(),
          selectedMods: item.modifiers || [],
          comboSelections:
            item.comboSelections ||
            (item.ComboDetailsJSON
              ? JSON.parse(item.ComboDetailsJSON)
              : []),
        }));

        skipSaveRef.current = true;
        setCart(prev => {
          const dbIds = new Set(
            fromDB.map(i => i.OrderDetailId || i.lineItemId).filter(Boolean)
          );
          const localOnly = prev.filter(
            item =>
              !item.OrderDetailId &&
              !item.lineItemId &&
              item.status === "NEW"
          );
          return [...fromDB, ...localOnly];
        });
      }

      if (data.currentOrderId !== undefined) {
        setCurrentOrderId(data.currentOrderId);
        currentOrderIdRef.current = data.currentOrderId;
      }

    } catch (err) {
      console.log("LOAD CART ERROR:", err);
    }
  };

  const toggleModifier = (mod) => {
    if (mod.ModifierName.toUpperCase() === "OPEN") {
      setShowCustomModal(true);
      return;
    }

    setSelectedModifierIds((prev) => {
      if (prev.includes(mod.ModifierID)) {
        return prev.filter((id) => id !== mod.ModifierID);
      } else {
        return [...prev, mod.ModifierID];
      }
    });
  };

  const addCustomMod = () => {
    if (!customItemName.trim()) return;
    const newId = `custom-${Date.now()}`;
    const newMod = {
      ModifierID: newId,
      ModifierName: customItemName,
      Price: parseFloat(customItemPrice) || 0,
    };

    setCustomMods((prev) => [...prev, newMod]);
    setSelectedModifierIds((prev) => [...prev, newId]);

    setShowCustomModal(false);
    setCustomItemName("");
    setCustomItemPrice("");
  };

  const addWithModifiers = () => {
    console.count("ADD WITH MODIFIERS");
    if (!selectedDish) return;
    actionRef.current = "INSERT";

    const allAvailable = [...modifiers, ...customMods];

    const selectedMods = allAvailable.filter((m) =>
      selectedModifierIds.includes(m.ModifierID)
    );

    const extra = selectedMods.reduce(
      (sum, m) => sum + Number(m.Price || 0),
      0
    );

    const finalPrice =
      Number(selectedDish.Price || 0) +
      Number(extra);

    setCart((prev) => {

      // same dish + same modifiers (and not sent yet)
      const existing = prev.find((item) => {
        const itemDishId = item.DishId || item.id;
        const selectedDishId = selectedDish.DishId || selectedDish.id;

        const itemModKey = (item.selectedMods || [])
          .map((m) => m.ModifierID || m.ModifierId)
          .sort()
          .join("-");

        const selectedModKey = selectedMods
          .map((m) => m.ModifierID || m.ModifierId)
          .sort()
          .join("-");

        return (
          itemDishId === selectedDishId &&
          item.status !== "SENT" &&
          itemModKey === selectedModKey
        );
      });

      // increase qty
      if (existing) {
        return prev.map((item) =>
          item === existing
            ? {
              ...item,
              qty: (item.qty || 1) + comboQty,
              status: "NEW",
            }
            : item
        );
      }

      const modKey = selectedMods
        .map((m) => m.ModifierID || m.ModifierId)
        .sort()
        .join("-");

      // new cart item
      return [
        ...prev,
        {
          ...selectedDish,

          cartId: crypto.randomUUID(),

          qty: comboQty,

          selectedMods,

          finalPrice,
          Price: finalPrice,
          price: finalPrice,

          modifierKey: modKey,

          status: "NEW",
        },
      ];
    });

    setShowModifier(false);
  };

  const saveUpiId = async (type, upiId) => {
    if (type === 'paynow') {
      setPaynowUpiId(upiId);
    } else if (type === 'upi') {
      setUpiUpiId(upiId);
    }
    try {
      await fetch(`${API}/paymodes/update-qr`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payMode: type, upiId: upiId })
      });
    } catch (err) {
      console.log("SAVE UPI ID ERROR:", err);
    }
  };

  // SVGs for Icons
  const SettingsIcon = ({ color = '#333' }) => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"></circle>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
    </svg>
  );

  const BackIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
  );

  const SearchIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
  );

  const CartIcon = () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={themeColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
  );

  const ForkKnifeIcon = () => (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"></path><path d="M7 2v20"></path><path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"></path></svg>
  );

  const BurgerDrinkIcon = () => (
    <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke={themeColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8h1a4 4 0 0 1 0 8h-1"></path>
      <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"></path>
      <line x1="6" y1="1" x2="6" y2="4"></line>
      <line x1="10" y1="1" x2="10" y2="4"></line>
      <line x1="14" y1="1" x2="14" y2="4"></line>
    </svg>
  );

  const GPayBrand = () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 'bold', fontSize: '12px', color: '#5f6368' }}>
      <span style={{ display: 'flex' }}>
        <svg width="14" height="14" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" /><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.16v2.84C3.99 20.53 7.7 23 12 23z" /><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.16C1.43 8.55 1 10.22 1 12s.43 3.45 1.16 4.93l3.68-2.84z" /><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.16 7.07l3.68 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /></svg>
      </span>
      Pay
    </div>
  );

  const MastercardBrand = () => (
    <svg width="28" height="18" viewBox="0 0 24 16">
      <circle cx="8" cy="8" r="8" fill="#EB001B" />
      <circle cx="16" cy="8" r="8" fill="#F79E1B" fillOpacity="0.8" />
    </svg>
  );

  const UnionPayBrand = () => (
    <div style={{ background: '#fff', border: '1px solid #ccc', borderRadius: '4px', padding: '1px 3px', fontSize: '6px', fontWeight: 'bold', display: 'flex', flexDirection: 'column', lineHeight: 1.1, alignItems: 'center', width: '30px' }}>
      <span style={{ color: '#d9251c', transform: 'scale(0.9)' }}>UnionPay</span>
      <span style={{ color: '#004f9e', transform: 'scale(0.9)' }}>银联</span>
    </div>
  );

  const ApplePayBrand = () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '2px', fontWeight: 'bold', fontSize: '13px', color: '#000' }}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M16.36 14.08c-.03-2.92 2.39-4.32 2.5-4.39-1.36-1.99-3.46-2.25-4.21-2.28-1.78-.18-3.48 1.05-4.4 1.05-.92 0-2.31-1.02-3.8-1-1.95.03-3.76 1.13-4.76 2.87-2.03 3.53-.52 8.75 1.45 11.59.96 1.39 2.08 2.94 3.6 2.89 1.46-.06 2.02-.95 3.79-.95 1.76 0 2.27.95 3.82.92 1.57-.03 2.54-1.42 3.49-2.81 1.1-1.61 1.55-3.17 1.57-3.25-.03-.01-2.99-1.15-3.05-4.64zM13.88 5.76c.8-.97 1.34-2.32 1.19-3.66-1.16.05-2.58.78-3.41 1.76-.73.86-1.35 2.24-1.18 3.55 1.3.1 2.6-.66 3.4-1.65z" /></svg>
      Pay
    </div>
  );

  const VisaBrand = () => (
    <div style={{ color: '#1434CB', fontWeight: '900', fontStyle: 'italic', fontSize: '15px', letterSpacing: '-1px' }}>VISA</div>
  );

  const AmexBrand = () => (
    <div style={{ background: '#2671B9', color: '#fff', fontSize: '6px', fontWeight: 'bold', padding: '2px', borderRadius: '2px', lineHeight: 1.1, width: '28px', textAlign: 'center' }}>
      AMERICAN<br />EXPRESS
    </div>
  );

  const CashBrand = () => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <svg width="24" height="20" viewBox="0 0 40 30" fill="none">
        <rect x="2" y="4" width="28" height="16" rx="2" fill="#2ECC71" />
        <circle cx="16" cy="12" r="3" fill="#27AE60" />
        <circle cx="26" cy="20" r="6" fill="#F1C40F" stroke="#F39C12" strokeWidth="1" />
        <circle cx="32" cy="16" r="5" fill="#F1C40F" stroke="#F39C12" strokeWidth="1" />
      </svg>
    </div>
  );

  const VoucherBrand = () => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <svg width="24" height="16" viewBox="0 0 40 30" fill="none">
        <rect x="4" y="6" width="30" height="16" fill="#FFF1E6" stroke="#FF9F43" strokeWidth="1" strokeDasharray="3 2" />
        <rect x="14" y="6" width="6" height="16" fill="#FF9F43" />
        <text x="12" y="16" fontSize="6" fill="#d35400" fontWeight="bold">VOUCHER</text>
      </svg>
    </div>
  );

  const NetsBrand = () => (
    <div style={{ color: '#E51937', fontWeight: '900', fontStyle: 'italic', fontSize: '12px', letterSpacing: '-1px' }}>NETS</div>
  );

  const PayNowBrand = () => (
    <div style={{ color: '#7B1FA2', fontWeight: '900', fontSize: '10px', display: 'flex', flexDirection: 'column', lineHeight: 0.9, alignItems: 'center' }}>
      <span>PAY</span>
      <span>N<span style={{ color: '#E51937' }}>O</span>W</span>
    </div>
  );

  const JcbBrand = () => (
    <div style={{ display: 'flex', gap: '1px', fontWeight: 'bold', fontSize: '10px' }}>
      <div style={{ background: '#005BBB', color: '#fff', padding: '1px 2px', borderRadius: '1px' }}>J</div>
      <div style={{ background: '#E3000F', color: '#fff', padding: '1px 2px', borderRadius: '1px' }}>C</div>
      <div style={{ background: '#008C36', color: '#fff', padding: '1px 2px', borderRadius: '1px' }}>B</div>
    </div>
  );

  const WechatBrand = () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#1AAD19', fontSize: '12px', fontWeight: 'bold' }}>
      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
        <path d="M8.5 13.5c-3.5 0-6.3-2.3-6.3-5.2 0-2.9 2.8-5.2 6.3-5.2 3.5 0 6.3 2.3 6.3 5.2 0 2.9-2.8 5.2-6.3 5.2-.6 0-1.1-.1-1.6-.2l-2.1 1.1.5-1.9c-1.7-1-2.9-2.5-2.9-4.2zm6.7-1.1c.3.1.6.1.8.1 2.5 0 4.5-1.7 4.5-3.8 0-2.1-2-3.8-4.5-3.8-.2 0-.4 0-.6.1-.1-1.3-.8-2.5-1.9-3.3 1.1-.5 2.4-.8 3.7-.8 4.2 0 7.6 2.8 7.6 6.3 0 3.5-3.4 6.3-7.6 6.3-.7 0-1.4-.1-2.1-.3l-2.5 1.3.6-2.2c-2.1-1.2-3.5-3-3.5-5.1 0-1 .3-2 .8-2.9 1.3 1.3 3 2.3 4.7 3.1z"/>
      </svg>
      WeChat Pay
    </div>
  );

  const EzlinkBrand = () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '2px', color: '#004B87', fontWeight: 'bold', fontSize: '14px', fontStyle: 'italic' }}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <circle cx="12" cy="12" r="10" fill="#004B87"/>
        <path d="M8 8h8v2H10v2h5v2h-5v2h8v2H8V8z" fill="#fff"/>
      </svg>
      ezlink
    </div>
  );


  // const handleRefresh = async () => {
  //   await loadKitchens();
  //   if (tableId) {
  //     await loadCart(tableId);
  //   }
  // };

  // const totalAmount
  //   = cart.reduce((s, i) => s +
  //     (Number(i.Price || i.price || 0) *
  //       Number(i.qty || 1)), 0).toFixed(2);

  // return (

  const handleRefresh = async () => {
    await loadKitchens();
    if (tableId) {
      await loadCart(tableId);
    }
  };

  const handleLogout = () => {
    setCart([]);
    setCurrentOrderId(null);
    currentOrderIdRef.current = null;

    sessionStorage.removeItem("isLoggedIn");

    localStorage.removeItem("tableId");
    localStorage.removeItem("tableNo");
    localStorage.removeItem("orderId");
    localStorage.removeItem("kioskOrderId");
    localStorage.removeItem("kioskOrderType");
    localStorage.removeItem("qr_pos_user");
    localStorage.removeItem("promoCode");
    localStorage.removeItem("promoAmount");
    localStorage.removeItem("availableCredit");

    setIsKiosk(false);
    setIsLoggedIn(false);
  };

  // Subtotal — sum of all cart items
  const subTotal = cart.reduce(
    (sum, item) =>
      sum +
      Number(item.Price || item.price || 0) *
      Number(item.qty || 1),
    0
  );

  // Service Charge Calculation — applied to full subtotal
  const serviceChargeEligibleTotal = cart.reduce(
    (sum, item) =>
      Number(item.isServiceCharge || 0) === 1
        ? sum +
        Number(item.Price || item.price || 0) *
        Number(item.qty || 1)
        : sum,
    0
  );

  const serviceCharge =
    serviceChargeEligibleTotal * (serviceChargePercent / 100);

  // GST Calculation
  const beforeGST = subTotal + serviceCharge;

  const gstAmount =
    beforeGST * (gstPercent / 100);

  const promoAmount = Number(localStorage.getItem("promoAmount") || 0);

  const totalAmount = Math.max(
    0,
    subTotal + serviceCharge + gstAmount - promoAmount
  ).toFixed(2);

  console.log("Cart:", cart);
  console.log("Eligible Total:", serviceChargeEligibleTotal);
  console.log("Service Charge %:", serviceChargePercent);
  console.log("Service Charge:", serviceCharge);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!isLoggedIn) {
    return (
      <KioskStartPage
        onStart={(user) => {
          // Check if the session was started via the Kiosk start page
          const storedKioskOrderId = localStorage.getItem("kioskOrderId");
          if (storedKioskOrderId) {
            // KIOSK mode: use the generated sequential order number, no tableId
            setIsKiosk(true);
            setCurrentOrderId(storedKioskOrderId);
            currentOrderIdRef.current = storedKioskOrderId;
            // Clear any stale table info
            setTableId("");
            setTableNo("");
          } else {
            // Legacy table-based mode
            const storedTableId = localStorage.getItem("tableId");
            const storedTableNo = localStorage.getItem("tableNo");
            const storedOrderId = localStorage.getItem("orderId");
            if (storedTableId) setTableId(storedTableId);
            if (storedTableNo) setTableNo(storedTableNo);
            if (storedOrderId) {
              setCurrentOrderId(storedOrderId);
              currentOrderIdRef.current = storedOrderId;
            }
          }
          // Flip the login flag — triggers re-render without a page reload
          setIsLoggedIn(true);
        }}
      />
    );
  }

  return (

    <Routes>

      <Route
        path="/"
        element={

          // <div className="pos-app">
          // Pull-to-refresh removed – it was intercepting touch events and blocking smooth scrolling.
          <div className="pos-app">

            {/* ── Kiosk Thank You Screen ── */}
            {kioskThankYouOrderId && (
              <div style={{
                position: 'fixed', inset: 0, zIndex: 999999,
                background: 'linear-gradient(160deg, #f97316 0%, #ea580c 60%, #c2410c 100%)',
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                gap: '32px'
              }}>
                {/* THANKS Y'ALL */}
                <div style={{ textAlign: 'center' }}>
                  <div style={{
                    fontSize: 'clamp(48px, 10vw, 96px)',
                    fontWeight: '900',
                    color: '#fff',
                    letterSpacing: '-1px',
                    lineHeight: 1,
                    textShadow: '0 4px 24px rgba(0,0,0,0.2)'
                  }}>
                    THANKS Y'ALL
                  </div>
                  <div style={{
                    fontSize: 'clamp(20px, 4vw, 34px)',
                    fontWeight: '600',
                    color: 'rgba(255,255,255,0.88)',
                    marginTop: '8px',
                    fontStyle: 'italic'
                  }}>
                    Chicken's on the way!
                  </div>
                </div>

                {/* Order Number Circle */}
                <div style={{
                  width: 'clamp(180px, 35vw, 280px)',
                  height: 'clamp(180px, 35vw, 280px)',
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.92)',
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 12px 48px rgba(0,0,0,0.18)',
                  gap: '4px'
                }}>
                  <div style={{
                    fontSize: 'clamp(14px, 2.5vw, 20px)',
                    color: '#ea580c',
                    fontWeight: '700',
                    letterSpacing: '0.5px',
                    textTransform: 'uppercase'
                  }}>
                    Your order no.
                  </div>
                  <div style={{
                    fontSize: 'clamp(64px, 14vw, 110px)',
                    fontWeight: '900',
                    color: '#ea580c',
                    lineHeight: 1,
                    letterSpacing: '-2px'
                  }}>
                    {String(kioskThankYouOrderId).replace(/\D/g, '').slice(-4) || kioskThankYouOrderId}
                  </div>
                </div>

                {/* Collect receipt */}
                <div style={{
                  fontSize: 'clamp(18px, 3.5vw, 28px)',
                  fontWeight: '700',
                  color: 'rgba(255,255,255,0.9)',
                  letterSpacing: '0.3px'
                }}>
                  Please collect your receipt
                </div>
              </div>
            )}

            {isCartLoading && (
              <div className="modal-overlay" style={{ zIndex: 99999, flexDirection: 'column', cursor: 'wait' }}>
                <div style={{ width: '50px', height: '50px', border: '5px solid rgba(255,255,255,0.3)', borderTop: `5px solid ${themeColor}`, borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                <div style={{ color: '#fff', marginTop: '16px', fontSize: '18px', fontWeight: 'bold' }}>Loading...</div>
                <style>
                  {`
              @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
            `}
                </style>
              </div>
            )}

            {/* ── Kiosk Header ── */}
            {/* {!showCartPage && (
              <div className="kiosk-menu-header">
               
              </div>
            )} */}

            <div className="kiosk-app-container">
              {/* Left Sidebar */}
              {!showCartPage && (
                <div className="kiosk-sidebar">
                  {/* <div className="sidebar-header">
                    <div className="sidebar-logo-icon">
                      <BurgerDrinkIcon />
                    </div>
                    <h2>Restaurant</h2>
                  </div> */}

                  <div className="sidebar-cat-list">
                    {(Array.isArray(categories) ? categories : []).map((cat) => (
                      <button
                        key={cat.CategoryId}
                        className={`sidebar-cat-item ${activeCategory === cat.CategoryId ? "active" : ""}`}
                        onClick={() => {
                          setActiveCategory(cat.CategoryId);
                          loadGroups(cat.CategoryId);
                        }}
                      >
                        <div className="cat-item-icon">
                          <ForkKnifeIcon />
                        </div>
                        <span className="cat-item-name">{cat.KitchenTypeName}</span>
                      </button>
                    ))}
                    {/* ADD LOGOUT BUTTON HERE */}
                    <div className="sidebar-logout">
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="sidebar-logout-btn"
                      >
                        <svg
                          width="22"
                          height="22"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                          <polyline points="16 17 21 12 16 7" />
                          <line x1="21" y1="12" x2="9" y2="12" />
                        </svg>
                        {/* <span>Logout</span> */}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Main Content Area */}
              <div className="kiosk-main-content">

                {!showCartPage && (
                  <div className="hero-banner-container">
                    <div className="hero-banner">
                      <div className="hero-icon">
                        <div className="hero-icon-circle">
                          <ForkKnifeIcon />
                        </div>
                      </div>
                      <div className="hero-text">
                        <h2>{categories.find(c => c.CategoryId === activeCategory)?.KitchenTypeName || 'Special Offers'}</h2>
                        <p>Savor the rich and authentic flavors of {categories.find(c => c.CategoryId === activeCategory)?.KitchenTypeName || 'our kitchen'}.</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Dish Group Sub-Row */}
                {!showCartPage && groups.length > 0 && (
                  <div className="kiosk-group-tab-bar outline-style">
                    <div className="group-pills-scroll">
                      {groups.map((group) => (
                        <button
                          key={group.DishGroupId}
                          className={`kiosk-group-pill outline-style ${activeGroup === group.DishGroupId ? "active" : ""}`}
                          onClick={() => {
                            setActiveGroup(group.DishGroupId);
                            loadDishes(group.DishGroupId);
                          }}
                        >
                          {group.DishGroupName}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Dish List — horizontal rows */}
                {!showCartPage && (
                  <div className="new-kiosk-dish-grid card-style">
                    {filteredItems.map((dish) => (
                      <div
                        className={`new-kiosk-dish-item card-style ${dish.IsSoldOut ? "sold-out" : ""}`}
                        key={dish.DishId}
                        onClick={() => {
                          if (!dish.IsSoldOut) openModifiers(dish);
                        }}
                      >
                        <div className="dish-card-heart">
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
                        </div>
                        <div className="new-kiosk-dish-img">
                          {dish.HasImage ? (
                            <img
                              src={`${API}/image/${dish.Image}`}
                              alt={dish.Name}
                            />
                          ) : (
                            <div className="dish-placeholder">
                              <ForkKnifeIcon />
                            </div>
                          )}
                        </div>
                        <div className="new-kiosk-dish-info">
                          <div className="new-kiosk-dish-name">{dish.Name}</div>
                          <div className="new-kiosk-dish-desc">
                            {dish.Description || "Delicious dish served with love."}
                          </div>
                          <div className="new-kiosk-dish-price">
                            ${Number(dish.Price || 0).toFixed(2)}
                          </div>
                          {dish.IsSoldOut && (
                            <div className="sold-out-badge">Sold Out</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>



            {/* Floating Dark View Cart Bar */}
            {cart.length > 0 && !showCartPage && (
              <div className="kiosk-floating-cart-bar" onClick={() => setShowCartPage(true)}>
                <div className="cart-bar-left">
                  <button
                    className="cart-bar-clear-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      setCart([]);
                      setCurrentOrderId(null);
                      currentOrderIdRef.current = null;
                      sessionStorage.removeItem("isLoggedIn");
                      localStorage.removeItem("tableId");
                      localStorage.removeItem("tableNo");
                      localStorage.removeItem("orderId");
                      localStorage.removeItem("kioskOrderId");
                      localStorage.removeItem("kioskOrderType");
                      setIsKiosk(false);
                      setIsLoggedIn(false);
                    }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}>
                      <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6M14 11v6" />
                    </svg>
                    Clear
                  </button>
                </div>
                <div className="cart-bar-center">
                  <span className="cart-bar-count">{cart.length} Item{cart.length !== 1 ? 's' : ''}</span>
                  <span className="cart-bar-price">${Number(totalAmount).toFixed(2)}</span>
                </div>
                <div className="cart-bar-right">
                  <button className="cart-bar-btn">View Cart &rarr;</button>
                </div>
              </div>
            )}

            {/* Right Side: Cart Sidebar */}
            {showCartPage && (
              <div className="cart-sidebar">
                {cart.length === 0 ? (
                  <div className="empty-cart-state">
                    <div className="empty-icon-wrap">
                      <BurgerDrinkIcon />
                    </div>
                    <h3>Empty Cart</h3>
                    <p>Select delicious dishes from the menu to start this order.</p>
                    <button
                      className="back-btn"
                      onClick={() => setShowCartPage(false)}
                      style={{ marginTop: '24px' }}
                    >
                      &larr; Back to Menu
                    </button>
                  </div>
                ) : (
                  <div className="cart-items-container">
                    <div className="cart-items-list">
                      {cart.map((item, index) => (
                        <div
                          key={index}
                          className="cart-item"
                          style={{
                            background: item.IsServiceCharge ? "#FFF3F3" : "#fff",
                            border: item.IsServiceCharge
                              ? "2px solid #FFA8A8"
                              : "1px solid #E5E7EB",
                            borderRadius: "16px",
                            marginBottom: "12px",
                            padding: "12px",
                          }}
                        >

                          <div className="ci-info">

                            <div className="ci-name">

                              <div className="ci-title">
                                {item.Name || item.name}
                              </div>

                              {item.selectedMods?.length > 0 && (
                                <div className="ci-mods">
                                  {item.selectedMods
                                    .map((m) => m.ModifierName)
                                    .join(", ")}
                                </div>
                              )}

                              {item.comboSelections?.length > 0 && (
                                <div className="ci-mods">
                                  {item.comboSelections.map((group, index) => (
                                    <div key={index} style={{ marginTop: "4px" }}>
                                      <div style={{ color: themeColor, fontWeight: "600" }}>
                                        {group.groupName}:
                                      </div>

                                      {group.items?.map((option, idx) => (
                                        <div
                                          key={idx}
                                          style={{
                                            marginLeft: "12px",
                                            color: "#666",
                                            fontSize: "13px",
                                          }}
                                        >
                                          ↳ {option.name}
                                          {((option.surcharge || 0) + (option.dishPrice || 0)) > 0 && (
                                            <> (+${((option.surcharge || 0) + (option.dishPrice || 0)).toFixed(2)})</>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  ))}
                                </div>
                              )}

                            </div>

                            <div className="qty-controls">

                              <button
                                className="qty-btn"
                                onClick={() => decreaseQty(index)}
                                disabled={
                                  (item.status && item.status !== "NEW") ||
                                  isCartLoading
                                }
                                style={{ opacity: ((item.status && item.status !== "NEW") || isCartLoading) ? 0.5 : 1 }}
                              >
                                -
                              </button>

                              <span className="qty-text">
                                {item.qty || 1}
                              </span>

                              <button
                                className="qty-btn"
                                onClick={() => increaseQty(index)}
                                disabled={
                                  (item.status && item.status !== "NEW") ||
                                  isCartLoading
                                }
                                style={{ opacity: ((item.status && item.status !== "NEW") || isCartLoading) ? 0.5 : 1 }}
                              >
                                +
                              </button>

                            </div>

                          </div>

                          <div className="ci-price">
                            $
                            {(
                              Number(item.Price || item.price || 0) *
                              Number(item.qty || 1)
                            ).toFixed(2)}
                          </div>

                        </div>
                      ))}
                    </div>
                    {/* <div className="cart-footer">
                          <div className="cart-total-row">
                            <span>Total</span>
                            <span>${cart
                              .reduce(
                                (s, i) =>
                                  s +
                                  (
                                    Number(i.Price || i.price || 0) *
                                    Number(i.qty || 1)
                                  ),
                                0
                              )
                              .toFixed(2)}</span>
                          </div>
                          <button
                            className="checkout-btn"
                            onClick={placeOrder}
                          >
                            Place Order
                          </button>
                        </div> */}
                    <div className="cart-footer">

                      <div className="cart-total-row">
                        <span>Subtotal</span>
                        <span>${subTotal.toFixed(2)}</span>
                      </div>


                      {serviceCharge > 0 && (
                        <div className="cart-total-row">
                          <span>Service Charge ({serviceChargePercent}%)</span>
                          <span>${serviceCharge.toFixed(2)}</span>
                        </div>
                      )}

                      {gstAmount > 0 && (
                        <div className="cart-total-row">
                          <span>GST ({gstPercent}%)</span>
                          <span>${gstAmount.toFixed(2)}</span>
                        </div>
                      )}

                      <div className="cart-total-row">
                        <strong>Total</strong>
                        <strong>${totalAmount}</strong>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
                        <button
                          className="checkout-btn"
                          onClick={placeOrder}
                          disabled={!cart.some(item => item.status === "NEW")}
                          style={{ margin: 0 }}
                        >
                          Checkout
                        </button>

                        <button
                          className="back-btn"
                          onClick={() => setShowCartPage(false)}
                        >
                          &larr; Back to Menu
                        </button>
                      </div>

                    </div>
                  </div>
                )}
              </div>
            )}

            {/* COMBO CUSTOMIZER FULL-SCREEN */}
            {showComboCustomizer && selectedDish && (
              <div className="full-screen-combo-container">
                <button className="combo-close-btn" onClick={() => setShowComboCustomizer(false)}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>

                <div className="combo-scroll-area">
                  <div className="combo-header-img">
                    {selectedDish.HasImage ? (
                      <img src={`${API}/image/${selectedDish.Image}`} alt={selectedDish.Name || selectedDish.name} />
                    ) : (
                      <div className="combo-placeholder-img">
                        <span style={{fontSize: '48px'}}>🍔</span>
                      </div>
                    )}
                  </div>

                  <div className="combo-dish-info">
                    <h1 className="combo-dish-title">{selectedDish.Name || selectedDish.name}</h1>
                    <div className="combo-dish-price">${Number(selectedDish.Price || selectedDish.price || 0).toFixed(2)}</div>
                    {selectedDish.Description && (
                      <p className="combo-dish-desc">{selectedDish.Description}</p>
                    )}
                  </div>

                  <div className="combo-selections-area">
                    {comboLoading ? (
                      <div className="loading-container" style={{ textAlign: 'center', padding: '40px' }}>
                        <div className="spinner" style={{ display: 'inline-block', width: '30px', height: '30px', border: '3px solid #ccc', borderTopColor: themeColor, borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                        <p style={{ marginTop: '10px', color: '#666' }}>Loading combo options...</p>
                      </div>
                    ) : comboError && !comboConfig ? (
                      <div className="error-container" style={{ textAlign: 'center', padding: '40px', color: 'red' }}>
                        <p>{comboError}</p>
                        <button className="btn-retry" onClick={() => openComboCustomizer(selectedDish)} style={{ background: themeColor, color: 'white', border: 'none', padding: '8px 16px', borderRadius: '8px' }}>Retry</button>
                      </div>
                    ) : (
                      <div className="combo-groups">
                        {(comboConfig?.groups || []).map((group) => {
                          const selectedIds = comboSelections[group.comboGroupId] || [];
                          return (
                            <div key={group.comboGroupId} className="combo-group-section">
                              <div className="group-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#1f2937' }}>{group.groupName}</h3>
                                <span className="group-pick-badge" style={{ fontSize: '13px', color: '#6b7280', fontWeight: '500', background: 'none' }}>
                                  Select {group.minSelection === group.maxSelection ? group.minSelection : `${group.minSelection} to ${group.maxSelection}`}
                                </span>
                              </div>
                              <div className="options-grid-2col">
                                {(group.options || []).map((option) => {
                                  const isSelected = selectedIds.includes(option.dishId);
                                  return (
                                    <div
                                      key={option.mappingId}
                                      className={`option-card-row ${isSelected ? 'selected' : ''}`}
                                      onClick={() => handleSelectComboOption(group.comboGroupId, option, group.isMultiSelect, group.maxSelection)}
                                      style={{
                                        borderColor: isSelected ? themeColor : '#e5e7eb',
                                      }}
                                    >
                                      <div className="option-radio-circle" style={{ borderColor: isSelected ? themeColor : '#d1d5db' }}>
                                        {isSelected && <div className="option-radio-dot" style={{ backgroundColor: themeColor }}></div>}
                                      </div>
                                      <div className="option-row-info">
                                        <div className="option-name" style={{ color: '#111827' }}>{option.name}</div>
                                        <div className="option-price" style={{ color: '#6b7280' }}>
                                          {((Number(option.surcharge) || 0) + (Number(option.dishPrice) || 0)) > 0 
                                            ? `+$${((Number(option.surcharge) || 0) + (Number(option.dishPrice) || 0)).toFixed(2)}` 
                                            : '$0.00'}
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}

                        {comboDishModifiers.length > 0 && (
                          <div className="combo-group-section">
                            <div className="group-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#1f2937' }}>Modifiers (Optional)</h3>
                            </div>
                            <div className="options-grid-2col">
                              {comboDishModifiers.map((m) => {
                                const isSelected = selectedComboModifierIds.includes(String(m.ModifierID || m.ModifierId || ""));
                                return (
                                  <div
                                    key={m.ModifierID}
                                    className={`option-card-row ${isSelected ? 'selected' : ''}`}
                                    onClick={() => handleToggleComboModifier(String(m.ModifierID || m.ModifierId || ""))}
                                    style={{
                                      borderColor: isSelected ? themeColor : '#e5e7eb',
                                    }}
                                  >
                                    <div className="option-checkbox-square" style={{ borderColor: isSelected ? themeColor : '#d1d5db', backgroundColor: isSelected ? themeColor : 'transparent' }}>
                                      {isSelected && <span style={{ color: 'white', fontSize: '12px' }}>✓</span>}
                                    </div>
                                    <div className="option-row-info">
                                      <div className="option-name" style={{ color: '#111827' }}>{m.ModifierName}</div>
                                      <div className="option-price" style={{ color: '#6b7280' }}>
                                        {m.Price > 0 ? `+$${Number(m.Price).toFixed(2)}` : '$0.00'}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                        
                        {comboError && (
                          <div className="combo-inline-error">{comboError}</div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="combo-fixed-bottom-bar">
                  <div className="combo-qty-controls">
                    <button 
                      className="combo-qty-btn" 
                      onClick={() => setComboQty(Math.max(1, comboQty - 1))}
                    >-</button>
                    <span className="combo-qty-val">{comboQty}</span>
                    <button 
                      className="combo-qty-btn" 
                      onClick={() => setComboQty(comboQty + 1)}
                    >+</button>
                  </div>
                  <button 
                    className="combo-add-btn" 
                    onClick={handleAddComboToCart}
                    style={{ background: themeColor }}
                  >
                    Add to Cart ${(calculateComboTotal() * comboQty).toFixed(2)}
                  </button>
                </div>
              </div>
            )}

            {/* MODIFIER FULL-SCREEN */}
            {showModifier && selectedDish && (
              <div className="full-screen-combo-container">
                <button className="combo-close-btn" onClick={() => setShowModifier(false)}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>

                <div className="combo-scroll-area">
                  <div className="combo-header-img">
                    {selectedDish.HasImage ? (
                      <img src={`${API}/image/${selectedDish.Image}`} alt={selectedDish.Name || selectedDish.name} />
                    ) : (
                      <div className="combo-placeholder-img">
                        <span style={{fontSize: '48px'}}>🍔</span>
                      </div>
                    )}
                  </div>

                  <div className="combo-dish-info">
                    <h1 className="combo-dish-title">{selectedDish.Name || selectedDish.name}</h1>
                    <div className="combo-dish-price">${Number(selectedDish.Price || selectedDish.price || 0).toFixed(2)}</div>
                    {selectedDish.Description && (
                      <p className="combo-dish-desc">{selectedDish.Description}</p>
                    )}
                  </div>

                  <div className="combo-selections-area">
                    <div className="combo-group-section">
                      <div className="group-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#1f2937' }}>Modifiers</h3>
                      </div>
                      
                      <div className="options-grid-2col">
                        {modifiers.map((m) => {
                          const isSelected = selectedModifierIds.includes(m.ModifierID);
                          const isCustomOpen = m.ModifierName.toUpperCase() === "OPEN";
                          return (
                            <div
                              key={m.ModifierID}
                              className={`option-card-row ${isSelected ? 'selected' : ''}`}
                              onClick={() => toggleModifier(m)}
                              style={{
                                borderColor: isSelected ? themeColor : '#e5e7eb',
                              }}
                            >
                              <div className="option-checkbox-square" style={{ borderColor: isSelected ? themeColor : '#d1d5db', backgroundColor: isSelected ? themeColor : 'transparent' }}>
                                {isSelected && <span style={{ color: 'white', fontSize: '12px' }}>✓</span>}
                              </div>
                              <div className="option-row-info">
                                <div className="option-name" style={{ color: '#111827' }}>{m.ModifierName}</div>
                                {!isCustomOpen && (
                                  <div className="option-price" style={{ color: '#6b7280' }}>
                                    {m.Price > 0 ? `+$${Number(m.Price).toFixed(2)}` : '$0.00'}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}

                        {customMods.map((m) => {
                          const isSelected = selectedModifierIds.includes(m.ModifierID);
                          return (
                            <div
                              key={m.ModifierID}
                              className={`option-card-row ${isSelected ? 'selected' : ''}`}
                              onClick={() => toggleModifier(m)}
                              style={{
                                borderColor: isSelected ? themeColor : '#e5e7eb',
                              }}
                            >
                              <div className="option-checkbox-square" style={{ borderColor: isSelected ? themeColor : '#d1d5db', backgroundColor: isSelected ? themeColor : 'transparent' }}>
                                {isSelected && <span style={{ color: 'white', fontSize: '12px' }}>✓</span>}
                              </div>
                              <div className="option-row-info">
                                <div className="option-name" style={{ color: '#111827' }}>{m.ModifierName} (Custom)</div>
                                <div className="option-price" style={{ color: '#6b7280' }}>
                                  {m.Price > 0 ? `+$${Number(m.Price).toFixed(2)}` : '$0.00'}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="combo-fixed-bottom-bar">
                  <div className="combo-qty-controls">
                    <button 
                      className="combo-qty-btn" 
                      onClick={() => setComboQty(Math.max(1, comboQty - 1))}
                    >-</button>
                    <span className="combo-qty-val">{comboQty}</span>
                    <button 
                      className="combo-qty-btn" 
                      onClick={() => setComboQty(comboQty + 1)}
                    >+</button>
                  </div>
                  <button 
                    className="combo-add-btn" 
                    onClick={addWithModifiers}
                    style={{ background: themeColor }}
                  >
                    Add to Cart ${(() => {
                      const allAvailable = [...modifiers, ...customMods];
                      const selectedMods = allAvailable.filter((m) =>
                        selectedModifierIds.includes(m.ModifierID)
                      );
                      const extra = selectedMods.reduce(
                        (sum, m) => sum + Number(m.Price || 0),
                        0
                      );
                      const basePrice = Number(selectedDish.Price || 0);
                      return ((basePrice + extra) * comboQty).toFixed(2);
                    })()}
                  </button>
                </div>

                {/* CUSTOM ITEM SUB-MODAL */}
                {showCustomModal && (
                  <div className="modal-overlay sub-modal-overlay" style={{ zIndex: 100001 }}>
                    <div className="custom-item-modal" onClick={(e) => e.stopPropagation()}>
                      <h3 className="custom-modal-title">Add Custom Item</h3>

                      <div className="input-group">
                        <label className="input-label">Item Name *</label>
                        <input
                          type="text"
                          className="custom-input"
                          placeholder="Enter item name"
                          value={customItemName}
                          onChange={(e) => setCustomItemName(e.target.value)}
                          autoFocus
                        />
                      </div>

                      <div className="input-group">
                        <label className="input-label">Price (Optional)</label>
                        <input
                          type="number"
                          className="custom-input"
                          placeholder="Enter price"
                          value={customItemPrice}
                          onChange={(e) => setCustomItemPrice(e.target.value)}
                        />
                      </div>

                      <div className="custom-modal-actions">
                        <button
                          className="btn-cancel"
                          onClick={() => setShowCustomModal(false)}
                        >
                          Cancel
                        </button>
                        <button className="btn-add" onClick={addCustomMod}>
                          Add Item
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
            {showPaymentPopup && (
              <div className="full-screen-payment">
                <button
                  className="full-screen-close"
                  onClick={() => setShowPaymentPopup(false)}
                >
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
                
                <div className="full-screen-payment-content">
                  <h1 className="payment-total-text">TOTAL: ${subTotal}</h1>
                  <h2 className="payment-choose-text">Choose your payment mode</h2>
                  
                  <div className="payment-options-row">
                    {/* Card 1 */}
                    <div className="payment-mode-card" onClick={() => {
                        setShowPaymentPopup(false);
                        handlePayOnline();
                      }}>
                      <div className="payment-mode-icons grid-icons">
                        <MastercardBrand />
                        <VisaBrand />
                        <AmexBrand />
                        <JcbBrand />
                      </div>
                      <div className="payment-mode-label">Credit/Debit<br/>Card</div>
                    </div>

                    {/* Card 2 */}
                    <div className="payment-mode-card" onClick={() => {
                        setShowPaymentPopup(false);
                        handlePayOnline();
                      }}>
                      <div className="payment-mode-icons single-icon">
                        <WechatBrand />
                      </div>
                      <div className="payment-mode-label">WeChat Pay</div>
                    </div>

                    {/* Card 3 */}
                    <div className="payment-mode-card" onClick={async () => {
                        try {
                          await fetch(`${API}/order/mark-sent`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ orderId: currentOrderId })
                          });

                          await fetch(`${API}/order/payment-status`, {
                            method: "POST",
                            headers: {
                              "Content-Type": "application/json"
                            },
                            body: JSON.stringify({
                              tableId: tableId,
                              paymentStatus: 0
                            })
                          });

                        } catch (e) {
                          console.error(e);
                        }
                        setShowPaymentPopup(false);

                        const finalOrderId = currentOrderIdRef.current || currentOrderId;
                        if (isKiosk) {
                          // Kiosk: show thank-you screen for 5s then reset
                          showKioskThankYou(finalOrderId);
                        } else {
                          window.location.href = `/settlement-success?tableId=${tableId}&table=${tableNo}&orderId=${finalOrderId}`;
                        }

                      }}>
                      <div className="payment-mode-icons split-icons">
                        <CashBrand />
                        <EzlinkBrand />
                      </div>
                      <div className="payment-mode-label">Cash/EZ Link</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {successMessage && (
              <div className="modal-overlay" style={{ zIndex: 10000 }}>
                <div className="success-modal">
                  <div className="success-icon">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                  </div>
                  <h2 className="success-title">Success!</h2>
                  <p className="success-text">{successMessage}</p>
                </div>
              </div>
            )}

            {showOnlinePayment && (
              <div className="modal-overlay" style={{ zIndex: 10001, padding: 0 }}>
                <div className="pos-app" style={{ width: '100vw', height: '100dvh', background: '#fdfbf7', display: 'flex', flexDirection: 'column', borderRadius: 0 }}>

                  <div className="pos-header" style={{ borderBottom: '1px solid #eee', background: 'white' }}>
                    <button className="icon-btn" onClick={() => setShowOnlinePayment(false)}>
                      <BackIcon />
                    </button>
                    <div style={{ flex: 1, textAlign: 'center', fontSize: '18px', fontWeight: 'bold' }}>
                      Checkout
                    </div>
                    <div style={{ width: '48px' }}></div>
                  </div>

                  <div style={{ flex: 1, display: 'flex', gap: '20px', padding: '20px', overflowY: 'auto', flexWrap: 'wrap', alignContent: 'flex-start' }}>
                    {/* Left Side: Payment Method */}
                    <div style={{ flex: '1 1 300px', background: 'white', borderRadius: '20px', padding: '20px', boxShadow: '0 4px 15px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                      <h3 style={{ margin: '0', textTransform: 'uppercase', fontSize: '12px', color: '#666', letterSpacing: '0.5px' }}>Select Payment Method</h3>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '10px' }}>
                        {/* <div style={{ padding: '20px 10px', border: '2px solid #f97316', borderRadius: '12px', textAlign: 'center', background: '#fff5eb', color: '#f97316', fontWeight: 'bold', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
                <MastercardBrand /> <span style={{ fontSize: '12px' }}>Credit Card</span>
              </div> */}
                        <div
                          style={{ padding: '20px 10px', border: '1px solid #eee', borderRadius: '12px', textAlign: 'center', color: '#666', fontWeight: 'bold', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', cursor: 'pointer' }}
                          onClick={() => setShowPayNowModal(true)}
                        >
                          <PayNowBrand /> <span style={{ fontSize: '12px' }}>PayNow</span>
                        </div>
                        {/* <div
                    style={{ padding: '20px 10px', border: '1px solid #eee', borderRadius: '12px', textAlign: 'center', color: '#666', fontWeight: 'bold', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', cursor: 'pointer' }}
                    onClick={() => setShowUpiModal(true)}
                  >
                    <GPayBrand /> <span style={{ fontSize: '12px' }}>GPay / UPI</span>
                  </div> */}
                      </div>

                      <div style={{ flex: 1 }}></div>

                      {/* <button
                  className="checkout-btn"
                  style={{ height: '56px', fontSize: '18px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', marginTop: '20px' }}
                  // onClick={() => {
                  //   setShowOnlinePayment(false);
                  //   handlePaymentSuccess("Online Payment Successful!");
                  // }}
                  onClick={async () => {

                    try {
                      console.log("CURRENT ORDER ID:", currentOrderId);
                      const res = await fetch(`${API}/sales/save`, {
                        method: "POST",
                        headers: {
                          "Content-Type": "application/json",
                        },
                        body: JSON.stringify({

                          orderId:
                            currentOrderId &&
                              currentOrderId !== "null"
                              ? currentOrderId
                              : "00000000-0000-0000-0000-000000000000",

                          tableNo: tableNo,

                          tableId: tableId,

                          subTotal: Number(totalAmount),


                          totalAmount: Number(totalAmount),

                          paymentMethod: "PAYNOW",

                          items: cart.map((item) => ({

                            id: item.DishId || item.id,

                            name: item.Name || item.name,

                            qty: Number(item.qty || 1),

                            price: Number(item.Price || item.price || 0),

                          })),

                        }),
                      });

                      const data = await res.json();

                      console.log("PAYMENT PROCESS:", data);

                      if (data.success) {

                    setShowOnlinePayment(false);

                    handlePaymentSuccess(
                      `Payment Successful! TXN: ${data.transactionId}`
                    );

                    // KOT PRINT is now handled by backend


                    // ✅ Open SettlementSuccess Screen
                    setTimeout(() => {

                      window.location.href =
                        `/settlement-success?tableId=${tableId}&table=${tableNo}&orderId=${currentOrderId}`;

                    }, 1000);

                  } else {

                    alert(data.error || "Payment Failed");

                  }

                    } catch (err) {

                      console.log("PAYMENT ERROR:", err);

                      alert("Server Error");

                    }

                  }}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                  Complete Settlement
                </button>*/}
                      <button
                        className="checkout-btn"
                        style={{ height: '56px', fontSize: '18px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', marginTop: '20px' }}
                        onClick={handlePayOnline}
                      >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                        Complete Settlement
                      </button>
                    </div>

                    {/* Right Side: Summary */}
                    <div style={{ flex: '1 1 300px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                      <div style={{ background: 'white', borderRadius: '20px', padding: '20px', boxShadow: '0 4px 15px rgba(0,0,0,0.04)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px', alignItems: 'center' }}>
                          <span style={{ color: '#666', fontWeight: 'bold', textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.5px' }}>Amount Due</span>
                          <span style={{ fontSize: '28px', fontWeight: '900', color: themeColor }}>${totalAmount}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px' }}>
                          <span style={{ color: '#666', fontWeight: '600' }}>Subtotal</span>
                          <span style={{ fontWeight: 'bold', color: '#1f2937' }}>${totalAmount}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                          <span style={{ color: '#666', fontWeight: '600' }}>GST</span>
                          <span style={{ fontWeight: 'bold', color: '#1f2937' }}>$0.00</span>
                        </div>
                      </div>

                      <div style={{ flex: 1, background: 'white', borderRadius: '20px', padding: '20px', boxShadow: '0 4px 15px rgba(0,0,0,0.04)', overflowY: 'auto' }}>
                        <h3 style={{ margin: '0 0 15px 0', textTransform: 'uppercase', fontSize: '11px', color: '#666', letterSpacing: '0.5px' }}>Order Items</h3>
                        {cart.map((item, idx) => (
                          <div key={idx} style={{ display: 'flex', padding: '12px 0', borderBottom: '1px solid #f3f4f6' }}>
                            <div style={{ width: '30px', color: themeColor, fontWeight: '900', fontSize: '13px' }}>{item.qty}x</div>
                            <div style={{ flex: 1, fontWeight: '600', color: '#1f2937', fontSize: '13px' }}>
                              {item.Name || item.name}
                              {item.selectedMods?.length > 0 && (
                                <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                                  {item.selectedMods.map((m) => m.ModifierName).join(", ")}
                                </div>
                              )}
                            </div>
                            <div style={{ fontWeight: 'bold', color: '#1f2937', fontSize: '13px' }}>
                              ${(Number(item.Price || item.price || 0) * Number(item.qty || 1)).toFixed(2)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {showPayNowModal && (
              <div className="modal-overlay" style={{ zIndex: 10002 }}>
                <div style={{ width: '100%', maxWidth: '320px', backgroundColor: '#fff', borderRadius: '20px', overflow: 'hidden', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ padding: '16px' }}>
                    {/* Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <div>
                        <div style={{ fontSize: '16px', fontWeight: '800', color: '#1f2937' }}>PayNow QR Payment</div>
                        {/* <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>AL-HAZIMA RESTAURANT PTE LTD</div> */}
                      </div>
                      <button
                        style={{ border: 'none', background: '#F1F5F9', borderRadius: '10px', padding: '6px', cursor: 'pointer', display: 'flex' }}
                        onClick={() => setShowPayNowModal(false)}
                      >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1f2937" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                      </button>
                    </div>

                    {/* Amount Box */}
                    <div style={{ backgroundColor: '#F0F9FF', padding: '10px', borderRadius: '12px', alignItems: 'center', marginBottom: '16px', border: '1px solid #BAE6FD', display: 'flex', flexDirection: 'column' }}>
                      <div style={{ fontSize: '11px', color: '#0369A1', fontWeight: '600', marginBottom: '2px' }}>Please Transfer Exactly</div>
                      <div style={{ fontSize: '22px', fontWeight: '900', color: '#0284C7' }}>${totalAmount}</div>
                    </div>

                    {/* Dynamic QR */}
                    <div style={{ alignItems: 'center', marginBottom: '16px', display: 'flex', flexDirection: 'column' }}>
                      <div style={{ width: '150px', height: '150px', backgroundColor: '#fff', borderRadius: '16px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', justifyContent: 'center', alignItems: 'center', overflow: 'hidden', border: '1px solid #f0f0f0', display: 'flex' }}>
                        <img
                          src={
                            paynowUpiId?.startsWith("data:")
                              ? paynowUpiId
                              : paynowUpiId?.startsWith("/9j/")
                                ? `data:image/jpeg;base64,${paynowUpiId}`
                                : `data:image/png;base64,${paynowUpiId}`
                          }
                          alt="PayNow QR"
                          style={{
                            width: "130px",
                            height: "130px",
                            objectFit: "contain"
                          }}
                        />
                      </div>
                      <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '8px', fontWeight: '500', textAlign: 'center' }}>
                        Scan this QR and pay {totalAmount} exactly
                      </div>
                      <div style={{ fontSize: '10px', color: '#9ca3af', marginTop: '2px' }}>
                        Scan using PayNow / UPI App
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <button
                      style={{ width: '100%', display: 'flex', backgroundColor: '#22c55e', padding: '12px', borderRadius: '12px', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '10px', border: 'none', cursor: 'pointer' }}
                      onClick={() => {
                        setShowPayNowModal(false);
                        setShowOnlinePayment(false);
                        completeOrder(currentOrderId, totalAmount);
                      }}
                    >
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                      <span style={{ color: '#fff', fontSize: '15px', fontWeight: '800' }}>Payment Received</span>
                    </button>

                    <button
                      style={{ width: '100%', padding: '6px', alignItems: 'center', display: 'flex', justifyContent: 'center', border: 'none', background: 'transparent', cursor: 'pointer' }}
                      onClick={() => setShowPayNowModal(false)}
                    >
                      <span style={{ color: '#ef4444', fontSize: '13px', fontWeight: '600' }}>Cancel Transaction</span>
                    </button>

                  </div>
                </div>
              </div>
            )}

            {showUpiModal && (
              <div className="modal-overlay" style={{ zIndex: 10002 }}>
                <div style={{ width: '100%', maxWidth: '320px', backgroundColor: '#fff', borderRadius: '20px', overflow: 'hidden', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ padding: '16px' }}>
                    {/* Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <div>
                        <div style={{ fontSize: '16px', fontWeight: '800', color: '#1f2937' }}>UPI QR Payment</div>
                        <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>AL-HAZIMA RESTAURANT PTE LTD</div>
                      </div>
                      <button
                        style={{ border: 'none', background: '#F1F5F9', borderRadius: '10px', padding: '6px', cursor: 'pointer', display: 'flex' }}
                        onClick={() => setShowUpiModal(false)}
                      >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1f2937" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                      </button>
                    </div>

                    {/* Amount Box */}
                    <div style={{ backgroundColor: '#F8FAFC', padding: '10px', borderRadius: '12px', alignItems: 'center', marginBottom: '16px', border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column' }}>
                      <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600', marginBottom: '2px' }}>Total Amount to Collect</div>
                      <div style={{ fontSize: '22px', fontWeight: '900', color: themeColor }}>${totalAmount}</div>
                    </div>

                    {/* QR Code Container */}
                    {/* <div style={{ alignItems: 'center', marginBottom: '10px', display: 'flex', flexDirection: 'column' }}>
                <div style={{ width: '160px', height: '160px', padding: '10px', backgroundColor: '#fff', borderRadius: '16px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                  <QRCodeSVG value={`upi://pay?pa=${upiUpiId || 'merchant@upi'}&pn=Merchant&am=${totalAmount}&cu=INR`} size={140} />
                </div>
                <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '8px', fontWeight: '500', textAlign: 'center' }}>
                  Ask customer to scan with any UPI App
                </div>
                {upiUpiId && <div style={{ fontSize: '10px', color: '#9ca3af', marginTop: '2px' }}>UPI: {upiUpiId}</div>}
              </div> */}

                    {/* Action Buttons */}
                    <button
                      style={{ width: '100%', display: 'flex', backgroundColor: '#22c55e', padding: '12px', borderRadius: '12px', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '10px', border: 'none', cursor: 'pointer' }}
                      onClick={() => {
                        setShowUpiModal(false);
                        setShowOnlinePayment(false);
                        completeOrder(currentOrderId, totalAmount);
                      }}
                    >
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                      <span style={{ color: '#fff', fontSize: '15px', fontWeight: '800' }}>Payment Received</span>
                    </button>

                    <button
                      style={{ width: '100%', padding: '6px', alignItems: 'center', display: 'flex', justifyContent: 'center', border: 'none', background: 'transparent', cursor: 'pointer' }}
                      onClick={() => setShowUpiModal(false)}
                    >
                      <span style={{ color: '#ef4444', fontSize: '13px', fontWeight: '600' }}>Cancel Transaction</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {showSettingsModal && (
              <div className="modal-overlay" style={{ zIndex: 10003 }}>
                <div className="modal-content" style={{ maxWidth: '420px', display: 'flex', flexDirection: 'column' }}>
                  <div className="modal-header">
                    <h2 className="modal-title">Appearance Settings</h2>
                    <button className="modal-close" onClick={() => setShowSettingsModal(false)}>&times;</button>
                  </div>
                  <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

                    <div style={{ border: '1px solid #eee', borderRadius: '12px', padding: '16px' }}>
                      <h3 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#333' }}>Theme Color</h3>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
                        {THEME_COLOR_OPTIONS.map((color) => (
                          <button
                            key={color}
                            type="button"
                            aria-label={`Select theme color ${color}`}
                            onClick={() => setTempThemeColor(color)}
                            style={{
                              width: '30px',
                              height: '30px',
                              borderRadius: '50%',
                              border: tempThemeColor === color ? '2px solid #111827' : '2px solid #e5e7eb',
                              background: color,
                              cursor: 'pointer',
                              boxShadow: tempThemeColor === color ? '0 0 0 3px rgba(17,24,39,0.08)' : 'none'
                            }}
                          />
                        ))}
                      </div>
                      <label htmlFor="theme-color-picker" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', fontSize: '13px', color: '#374151', fontWeight: '600' }}>
                        Custom color
                        <input
                          id="theme-color-picker"
                          aria-label="Theme color"
                          type="color"
                          value={tempThemeColor}
                          onChange={(e) => setTempThemeColor(e.target.value)}
                          style={{ width: '56px', height: '36px', border: '1px solid #ddd', borderRadius: '8px', background: '#fff', padding: '2px', cursor: 'pointer' }}
                        />
                      </label>
                    </div>

                  </div>
                  <div className="modal-footer" style={{ display: 'flex', gap: '10px' }}>
                    <button className="btn-cancel" onClick={() => setShowSettingsModal(false)}>Cancel</button>
                    <button className="btn-add" style={{ flex: 1 }} onClick={() => {
                      setThemeColor(tempThemeColor);
                      setShowSettingsModal(false);
                    }}>Save Settings</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        }
      />

      <Route
        path="/settlement-success"
        element={<SettlementSuccess />}
      />

    </Routes>
  );
}

export default App;