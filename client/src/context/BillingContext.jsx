import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
export const api = axios.create({ baseURL: API_URL, timeout: 15000 });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('billingo_token');
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

const BillingContext = createContext(null);

export const useBilling = () => {
  const context = useContext(BillingContext);
  if (!context) throw new Error('useBilling must be used within BillingProvider');
  return context;
};

export const BillingProvider = ({ children }) => {
  const [token, setToken] = useState(() => localStorage.getItem('billingo_token'));
  const [user, setUser] = useState(null);
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [bills, setBills] = useState([]);
  const [cart, setCart] = useState([]);
  const [printerPort, setPrinterPort] = useState(null);
  const [loading, setLoading] = useState(false);

  const logout = useCallback(() => {
    localStorage.removeItem('billingo_token');
    setToken(null);
    setUser(null);
    setItems([]);
    setCategories([]);
    setBills([]);
    setCart([]);
  }, []);

  const login = useCallback((newToken, newUser) => {
    localStorage.setItem('billingo_token', newToken);
    setToken(newToken);
    setUser(newUser);
  }, []);

  const signIn = useCallback(async (credentials, mode) => {
    const response = await api.post(`/auth/${mode}`, credentials);
    login(response.data.token, response.data.user);
    return response.data.user;
  }, [login]);

  const fetchMe = useCallback(async () => {
    if (!token) return;
    try {
      const response = await api.get('/auth/me');
      setUser(response.data.user);
    } catch (error) {
      if (error.response?.status === 401 || error.response?.status === 404) logout();
      else console.error('Unable to load account profile', error);
    }
  }, [token, logout]);

  const fetchItems = useCallback(async () => {
    if (!token) return;
    const response = await api.get('/items');
    setItems(response.data);
  }, [token]);

  const fetchCategories = useCallback(async () => {
    if (!token) return;
    const response = await api.get('/categories');
    setCategories(response.data);
  }, [token]);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    Promise.all([fetchMe(), fetchItems(), fetchCategories()])
      .catch((error) => console.error('Unable to load billing data', error))
      .finally(() => setLoading(false));
  }, [token, fetchMe, fetchItems, fetchCategories]);

  const updateProfile = async (payload) => {
    const response = await api.put('/auth/profile', payload);
    setUser(response.data.user);
    return response.data.user;
  };

  const addItem = async (payload) => {
    const response = await api.post('/items', payload);
    setItems((current) => [...current, response.data]);
    await fetchCategories();
    return response.data;
  };

  const editItem = async (id, payload) => {
    const response = await api.put(`/items/${id}`, payload);
    setItems((current) => current.map((item) => (item._id === id ? response.data : item)));
    await fetchCategories();
    return response.data;
  };

  const deleteItem = async (id) => {
    await api.delete(`/items/${id}`);
    setItems((current) => current.filter((item) => item._id !== id));
  };

  const addCategory = async (payload) => {
    const response = await api.post('/categories', payload);
    setCategories((current) => current.some((category) => category._id === response.data._id)
      ? current
      : [...current, response.data]);
    return response.data;
  };

  const deleteCategory = async (id) => {
    await api.delete(`/categories/${id}`);
    const deleted = categories.find((category) => category._id === id);
    setCategories((current) => current.filter((category) => category._id !== id));
    if (deleted) {
      setItems((current) => current.filter(
        (item) => !(item.visibleIn === deleted.visibleIn && item.category === deleted.name)
      ));
    }
  };

  const bulkUpload = async (file) => {
    const form = new FormData();
    form.append('file', file);
    const response = await api.post('/items/bulk-upload', form);
    await Promise.all([fetchItems(), fetchCategories()]);
    return response.data;
  };

  const setItemQty = (item, qty) => {
    setCart((current) => {
      const exists = current.find((entry) => entry.itemId === item._id);
      if (exists?.qty === qty) return current.filter((entry) => entry.itemId !== item._id);
      const next = {
        itemId: item._id,
        name: item.name,
        category: item.category,
        visibleIn: item.visibleIn,
        unit: item.unit,
        price: Number(item.price),
        qty,
      };
      return exists
        ? current.map((entry) => (entry.itemId === item._id ? next : entry))
        : [...current, next];
    });
  };

  const clearCart = () => setCart([]);
  const cartTotal = useMemo(
    () => Math.round(cart.reduce(
      (sum, item) => sum + Math.round(item.price * item.qty * 100) / 100,
      0
    ) * 100) / 100,
    [cart]
  );

  const saveBill = async (format) => {
    if (!cart.length) throw new Error('Add at least one item before saving a bill');
    const response = await api.post('/bills', {
      items: cart.map((item) => ({
        ...item,
        amount: Math.round(item.price * item.qty * 100) / 100,
      })),
      totalAmount: cartTotal,
      format,
    });
    return response.data;
  };

  const fetchBills = useCallback(async (filters = {}) => {
    const response = await api.get('/bills', { params: filters });
    setBills(response.data);
    return response.data;
  }, []);

  const value = {
    isAuthed: Boolean(token),
    user,
    login,
    signIn,
    logout,
    updateProfile,
    items,
    fetchItems,
    categories,
    fetchCategories,
    addCategory,
    deleteCategory,
    addItem,
    editItem,
    deleteItem,
    bulkUpload,
    bills,
    fetchBills,
    saveBill,
    cart,
    setItemQty,
    clearCart,
    cartTotal,
    printerPort,
    setPrinterPort,
    loading,
  };

  return <BillingContext.Provider value={value}>{children}</BillingContext.Provider>;
};
