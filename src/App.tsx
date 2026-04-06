import React, { useState, useEffect } from "react";
import { 
  ShoppingCart, 
  User as UserIcon, 
  LogOut, 
  Plus, 
  Trash2, 
  Star, 
  Package, 
  LayoutDashboard, 
  ShoppingBag,
  ChevronRight,
  Search,
  X,
  AlertCircle,
  CheckCircle2
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

// --- Types ---
interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  description: string;
  image: string;
}

interface CartItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  role: "admin" | "customer";
}

interface Review {
  id: string;
  userId: string;
  userName: string;
  productId: string;
  rating: number;
  comment: string;
  createdAt: string;
}

// --- API Helper ---
const API_URL = "/api";

const api = {
  get: async (path: string, token?: string) => {
    const res = await fetch(`${API_URL}${path}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  post: async (path: string, body: any, token?: string) => {
    const res = await fetch(`${API_URL}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  put: async (path: string, body: any, token?: string) => {
    const res = await fetch(`${API_URL}${path}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  delete: async (path: string, token?: string) => {
    const res = await fetch(`${API_URL}${path}`, {
      method: "DELETE",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) throw new Error(await res.text());
    return res.status === 204 ? null : res.json();
  },
};

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem("token"));
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [view, setView] = useState<"home" | "cart" | "admin" | "auth" | "orders">("home");
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState<{ message: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    const savedUser = localStorage.getItem("user");
    if (savedUser && token) {
      setUser(JSON.parse(savedUser));
    }
    fetchProducts();
    setLoading(false);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchProducts(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    if (token) {
      fetchCart();
    } else {
      setCart([]);
    }
  }, [token]);

  const showNotification = (message: string, type: "success" | "error" = "success") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const fetchProducts = async (q?: string) => {
    try {
      const path = q ? `/products?q=${encodeURIComponent(q)}` : "/products";
      const data = await api.get(path);
      setProducts(data);
    } catch (err) {
      console.error("Failed to fetch products", err);
    }
  };

  const fetchCart = async () => {
    try {
      const data = await api.get("/cart", token!);
      setCart(data);
    } catch (err) {
      console.error("Failed to fetch cart", err);
    }
  };

  const handleLogin = (userData: User, userToken: string) => {
    setUser(userData);
    setToken(userToken);
    localStorage.setItem("token", userToken);
    localStorage.setItem("user", JSON.stringify(userData));
    setView("home");
    showNotification(`Welcome back, ${userData.name}!`);
  };

  const handleLogout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setView("home");
    showNotification("Logged out successfully");
  };

  const addToCart = async (productId: string) => {
    if (!token) {
      setView("auth");
      return;
    }
    try {
      await api.post("/cart", { productId, quantity: 1 }, token);
      fetchCart();
      showNotification("Added to cart");
    } catch (err: any) {
      try {
        const errorData = JSON.parse(err.message);
        showNotification(errorData.error || "Failed to add to cart", "error");
      } catch {
        showNotification("Failed to add to cart", "error");
      }
    }
  };

  const updateCartQuantity = async (productId: string, quantity: number) => {
    try {
      await api.put(`/cart/${productId}`, { quantity }, token!);
      fetchCart();
    } catch (err) {
      showNotification("Failed to update quantity", "error");
    }
  };

  const removeFromCart = async (productId: string) => {
    try {
      await api.delete(`/cart/${productId}`, token!);
      fetchCart();
      showNotification("Removed from cart");
    } catch (err) {
      showNotification("Failed to remove from cart", "error");
    }
  };

  const placeOrder = async () => {
    try {
      await api.post("/orders", {}, token!);
      fetchCart();
      fetchProducts();
      setView("orders");
      showNotification("Order placed successfully!");
    } catch (err: any) {
      try {
        const errorData = JSON.parse(err.message);
        showNotification(errorData.error || "Failed to place order", "error");
      } catch {
        showNotification("Failed to place order", "error");
      }
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Notification */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 20 }}
            exit={{ opacity: 0, y: -50 }}
            className={`fixed top-0 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-full shadow-lg flex items-center gap-2 ${
              notification.type === "success" ? "bg-emerald-500 text-white" : "bg-rose-500 text-white"
            }`}
          >
            {notification.type === "success" ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
            {notification.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navbar */}
      <nav className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-8">
              <h1 
                className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent cursor-pointer"
                onClick={() => setView("home")}
              >
                SwiftCart
              </h1>
              <div className="hidden md:flex items-center gap-6">
                <button onClick={() => setView("home")} className={`text-sm font-medium hover:text-indigo-600 transition-colors ${view === "home" ? "text-indigo-600" : "text-slate-600"}`}>Shop</button>
                {user?.role === "admin" && (
                  <button onClick={() => setView("admin")} className={`text-sm font-medium hover:text-indigo-600 transition-colors ${view === "admin" ? "text-indigo-600" : "text-slate-600"}`}>Admin</button>
                )}
                {user && (
                  <button onClick={() => setView("orders")} className={`text-sm font-medium hover:text-indigo-600 transition-colors ${view === "orders" ? "text-indigo-600" : "text-slate-600"}`}>Orders</button>
                )}
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="relative">
                <button 
                  onClick={() => setView("cart")}
                  className="p-2 text-slate-600 hover:bg-slate-100 rounded-full transition-colors relative"
                >
                  <ShoppingCart size={22} />
                  {cart.length > 0 && (
                    <span className="absolute top-0 right-0 bg-indigo-600 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full border-2 border-white">
                      {cart.reduce((s, i) => s + i.quantity, 0)}
                    </span>
                  )}
                </button>
              </div>

              {user ? (
                <div className="flex items-center gap-4">
                  <div className="hidden sm:flex flex-col items-end">
                    <span className="text-sm font-semibold">{user.name}</span>
                    <span className="text-xs text-slate-500 capitalize">{user.role}</span>
                  </div>
                  <button 
                    onClick={handleLogout}
                    className="p-2 text-slate-600 hover:bg-rose-50 hover:text-rose-600 rounded-full transition-colors"
                  >
                    <LogOut size={22} />
                  </button>
                </div>
              ) : (
                <button 
                  onClick={() => setView("auth")}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium text-sm"
                >
                  <UserIcon size={18} />
                  Sign In
                </button>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {view === "home" && (
          <div className="space-y-8">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-3xl font-bold tracking-tight">Featured Products</h2>
                <p className="text-slate-500 mt-1">Discover our curated collection of premium goods.</p>
              </div>
              <div className="relative max-w-md w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="text" 
                  placeholder="Search products..." 
                  className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </header>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} onAddToCart={() => addToCart(product.id)} />
              ))}
            </div>
          </div>
        )}

        {view === "cart" && (
          <CartView 
            cart={cart} 
            onUpdateQuantity={updateCartQuantity} 
            onRemove={removeFromCart} 
            onCheckout={placeOrder}
            onContinueShopping={() => setView("home")}
          />
        )}

        {view === "auth" && (
          <AuthView onLogin={handleLogin} onBack={() => setView("home")} />
        )}

        {view === "admin" && user?.role === "admin" && (
          <AdminDashboard 
            products={products} 
            token={token!} 
            onRefresh={fetchProducts} 
            showNotification={showNotification}
          />
        )}

        {view === "orders" && user && (
          <OrdersView token={token!} />
        )}
      </main>
    </div>
  );
}

// --- Sub-Components ---

const ProductCard: React.FC<{ product: Product; onAddToCart: () => void | Promise<void> }> = ({ product, onAddToCart }) => {
  const [imageError, setImageError] = useState(false);
  const fallbackImage = "https://images.unsplash.com/photo-1560393464-5c69a73c5770?w=800&q=80";

  useEffect(() => {
    setImageError(false);
  }, [product.image]);

  return (
    <motion.div 
      whileHover={{ y: -5 }}
      className="bg-white rounded-2xl border border-slate-200 overflow-hidden group shadow-sm hover:shadow-md transition-all"
    >
      <div className="aspect-square relative overflow-hidden bg-slate-100">
        <img 
          src={imageError ? fallbackImage : product.image} 
          alt={product.name}
          onError={() => setImageError(true)}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute top-3 right-3">
          <span className="px-2 py-1 bg-white/90 backdrop-blur-sm text-[10px] font-bold uppercase tracking-wider rounded-md border border-slate-100">
            {product.category}
          </span>
        </div>
      </div>
      <div className="p-5 space-y-3">
        <div>
          <h3 className="font-bold text-lg leading-tight group-hover:text-indigo-600 transition-colors line-clamp-1">{product.name}</h3>
          <p className="text-slate-500 text-sm mt-1 line-clamp-2">{product.description}</p>
        </div>
        <div className="flex items-center justify-between pt-2">
          <span className="text-xl font-bold text-slate-900">${product.price.toFixed(2)}</span>
          <button 
            onClick={onAddToCart}
            disabled={product.stock === 0}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
              product.stock > 0 
                ? "bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm hover:shadow-indigo-200" 
                : "bg-slate-100 text-slate-400 cursor-not-allowed"
            }`}
          >
            <Plus size={18} />
            {product.stock > 0 ? "Add to Cart" : "Out of Stock"}
          </button>
        </div>
        <div className="pt-2 border-t border-slate-50">
          <ReviewSection productId={product.id} />
        </div>
      </div>
    </motion.div>
  );
}

function CartView({ cart, onUpdateQuantity, onRemove, onCheckout, onContinueShopping }: any) {
  const total = cart.reduce((sum: number, item: any) => sum + item.price * item.quantity, 0);

  if (cart.length === 0) {
    return (
      <div className="max-w-2xl mx-auto py-20 text-center space-y-6">
        <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-300">
          <ShoppingBag size={48} />
        </div>
        <div>
          <h2 className="text-2xl font-bold">Your cart is empty</h2>
          <p className="text-slate-500 mt-2">Looks like you haven't added anything to your cart yet.</p>
        </div>
        <button 
          onClick={onContinueShopping}
          className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
        >
          Start Shopping
        </button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 space-y-4">
        <h2 className="text-2xl font-bold mb-6">Shopping Cart ({cart.length})</h2>
        {cart.map((item: any) => (
          <div key={item.productId} className="bg-white p-4 rounded-2xl border border-slate-200 flex gap-4 items-center">
            <img src={item.image} alt={item.name} className="w-20 h-20 object-cover rounded-xl bg-slate-100" referrerPolicy="no-referrer" />
            <div className="flex-1 min-w-0">
              <h3 className="font-bold truncate">{item.name}</h3>
              <p className="text-indigo-600 font-bold">${item.price.toFixed(2)}</p>
            </div>
            <div className="flex items-center gap-3 bg-slate-50 px-3 py-1 rounded-lg border border-slate-100">
              <button 
                onClick={() => onUpdateQuantity(item.productId, Math.max(1, item.quantity - 1))}
                className="text-slate-500 hover:text-indigo-600 font-bold text-lg"
              >-</button>
              <span className="w-8 text-center font-bold">{item.quantity}</span>
              <button 
                onClick={() => onUpdateQuantity(item.productId, item.quantity + 1)}
                className="text-slate-500 hover:text-indigo-600 font-bold text-lg"
              >+</button>
            </div>
            <button 
              onClick={() => onRemove(item.productId)}
              className="p-2 text-slate-400 hover:text-rose-500 transition-colors"
            >
              <Trash2 size={20} />
            </button>
          </div>
        ))}
      </div>
      <div className="space-y-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h3 className="text-lg font-bold">Order Summary</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-slate-500">
              <span>Subtotal</span>
              <span>${total.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-slate-500">
              <span>Shipping</span>
              <span className="text-emerald-600 font-medium">Free</span>
            </div>
            <div className="pt-4 border-t border-slate-100 flex justify-between text-lg font-bold">
              <span>Total</span>
              <span>${total.toFixed(2)}</span>
            </div>
          </div>
          <button 
            onClick={onCheckout}
            className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 flex items-center justify-center gap-2"
          >
            Checkout
            <ChevronRight size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}

function AuthView({ onLogin, onBack }: any) {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({ name: "", email: "", password: "", role: "customer" });
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      if (isLogin) {
        const data = await api.post("/auth/login", { email: formData.email, password: formData.password });
        onLogin(data.user, data.token);
      } else {
        await api.post("/auth/register", formData);
        setIsLogin(true);
      }
    } catch (err: any) {
      try {
        const errorData = JSON.parse(err.message);
        setError(errorData.error || "Authentication failed");
      } catch {
        setError("Authentication failed");
      }
    }
  };

  return (
    <div className="max-w-md mx-auto py-12">
      <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-xl space-y-8">
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-bold">{isLogin ? "Welcome Back" : "Create Account"}</h2>
          <p className="text-slate-500">{isLogin ? "Sign in to your account" : "Join our community today"}</p>
        </div>

        {error && (
          <div className="p-4 bg-rose-50 text-rose-600 rounded-xl text-sm font-medium flex items-center gap-2">
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div className="space-y-1">
              <label className="text-sm font-semibold text-slate-700">Full Name</label>
              <input 
                type="text" 
                required
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
          )}
          <div className="space-y-1">
            <label className="text-sm font-semibold text-slate-700">Email Address</label>
            <input 
              type="email" 
              required
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
              value={formData.email}
              onChange={e => setFormData({ ...formData, email: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-semibold text-slate-700">Password</label>
            <input 
              type="password" 
              required
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
              value={formData.password}
              onChange={e => setFormData({ ...formData, password: e.target.value })}
            />
          </div>
          {!isLogin && (
            <div className="space-y-1">
              <label className="text-sm font-semibold text-slate-700">I am a...</label>
              <select 
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                value={formData.role}
                onChange={e => setFormData({ ...formData, role: e.target.value })}
              >
                <option value="customer">Customer</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          )}
          <button className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 mt-4">
            {isLogin ? "Sign In" : "Register"}
          </button>
        </form>

        <div className="text-center">
          <button 
            onClick={() => setIsLogin(!isLogin)}
            className="text-sm font-semibold text-indigo-600 hover:text-indigo-700"
          >
            {isLogin ? "Don't have an account? Register" : "Already have an account? Sign In"}
          </button>
        </div>
      </div>
      <button 
        onClick={onBack}
        className="w-full mt-6 text-slate-500 font-medium hover:text-slate-700 transition-colors"
      >
        Back to Shop
      </button>
    </div>
  );
}

function AdminDashboard({ products, token, onRefresh, showNotification }: any) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: "", category: "", price: 0, stock: 0, description: "", image: "" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await api.put(`/products/${editingId}`, formData, token);
        showNotification("Product updated");
      } else {
        await api.post("/products", formData, token);
        showNotification("Product added");
      }
      setIsAdding(false);
      setEditingId(null);
      setFormData({ name: "", category: "", price: 0, stock: 0, description: "", image: "" });
      onRefresh();
    } catch (err: any) {
      try {
        const errorData = JSON.parse(err.message);
        showNotification(errorData.error || "Operation failed", "error");
      } catch {
        showNotification("Operation failed", "error");
      }
    }
  };

  const handleEdit = (p: Product) => {
    setFormData({ ...p });
    setEditingId(p.id);
    setIsAdding(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/products/${id}`, token);
      showNotification("Product deleted");
      setDeleteConfirmId(null);
      onRefresh();
    } catch (err) {
      showNotification("Delete failed", "error");
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold">Inventory Management</h2>
          <p className="text-slate-500">Manage your products and stock levels.</p>
        </div>
        <button 
          onClick={() => { setIsAdding(true); setEditingId(null); setFormData({ name: "", category: "", price: 0, stock: 0, description: "", image: "" }); }}
          className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
        >
          <Plus size={20} />
          Add Product
        </button>
      </div>

      {isAdding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white w-full max-w-2xl p-8 rounded-3xl shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex justify-between items-center">
              <h3 className="text-2xl font-bold">{editingId ? "Edit Product" : "Add New Product"}</h3>
              <button onClick={() => setIsAdding(false)} className="p-2 hover:bg-slate-100 rounded-full"><X size={24} /></button>
            </div>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-semibold">Name</label>
                <input type="text" required className="w-full px-4 py-2 rounded-lg border border-slate-200" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-semibold">Category</label>
                <input type="text" required className="w-full px-4 py-2 rounded-lg border border-slate-200" value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })} />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-semibold">Price ($)</label>
                <input type="number" step="0.01" required className="w-full px-4 py-2 rounded-lg border border-slate-200" value={isNaN(formData.price) ? "" : formData.price} onChange={e => setFormData({ ...formData, price: parseFloat(e.target.value) })} />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-semibold">Stock</label>
                <input type="number" required className="w-full px-4 py-2 rounded-lg border border-slate-200" value={isNaN(formData.stock) ? "" : formData.stock} onChange={e => setFormData({ ...formData, stock: parseInt(e.target.value) })} />
              </div>
              <div className="md:col-span-2 space-y-1">
                <label className="text-sm font-semibold">Image URL</label>
                <input type="url" required className="w-full px-4 py-2 rounded-lg border border-slate-200" value={formData.image} onChange={e => setFormData({ ...formData, image: e.target.value })} />
              </div>
              <div className="md:col-span-2 space-y-1">
                <label className="text-sm font-semibold">Description</label>
                <textarea required className="w-full px-4 py-2 rounded-lg border border-slate-200 h-24" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} />
              </div>
              <div className="md:col-span-2 pt-4">
                <button className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200">
                  {editingId ? "Update Product" : "Create Product"}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-4 text-sm font-bold text-slate-700">Product</th>
              <th className="px-6 py-4 text-sm font-bold text-slate-700">Category</th>
              <th className="px-6 py-4 text-sm font-bold text-slate-700">Price</th>
              <th className="px-6 py-4 text-sm font-bold text-slate-700">Stock</th>
              <th className="px-6 py-4 text-sm font-bold text-slate-700 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {products.map((p: Product) => (
              <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <img src={p.image} alt={p.name} className="w-10 h-10 rounded-lg object-cover bg-slate-100" referrerPolicy="no-referrer" />
                    <span className="font-semibold">{p.name}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-slate-600">{p.category}</td>
                <td className="px-6 py-4 text-sm font-bold">${p.price.toFixed(2)}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                    p.stock > 10 ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                  }`}>
                    {p.stock} in stock
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-2">
                    <button onClick={() => handleEdit(p)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"><LayoutDashboard size={18} /></button>
                    <button onClick={() => setDeleteConfirmId(p.id)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"><Trash2 size={18} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirmId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-md p-8 rounded-3xl shadow-2xl space-y-6"
            >
              <div className="text-center space-y-2">
                <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto">
                  <Trash2 size={32} />
                </div>
                <h3 className="text-2xl font-bold">Delete Product?</h3>
                <p className="text-slate-500">This action cannot be undone. Are you sure you want to remove this product?</p>
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={() => setDeleteConfirmId(null)}
                  className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => handleDelete(deleteConfirmId)}
                  className="flex-1 py-3 bg-rose-500 text-white rounded-xl font-bold hover:bg-rose-600 transition-all shadow-lg shadow-rose-200"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ReviewSection({ productId }: { productId: string }) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [token] = useState(localStorage.getItem("token"));
  const [user] = useState<User | null>(JSON.parse(localStorage.getItem("user") || "null"));

  useEffect(() => {
    fetchReviews();
  }, [productId]);

  const fetchReviews = async () => {
    try {
      const data = await api.get(`/reviews/${productId}`);
      setReviews(data);
    } catch (err) {
      console.error("Failed to fetch reviews", err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post("/reviews", { productId, rating, comment }, token!);
      setComment("");
      setShowForm(false);
      fetchReviews();
    } catch (err) {
      console.error("Failed to post review", err);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <Star className="text-amber-400 fill-amber-400" size={14} />
          <span className="text-xs font-bold">{reviews.length > 0 ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1) : "No reviews"}</span>
          <span className="text-[10px] text-slate-400">({reviews.length})</span>
        </div>
        {user?.role === "customer" && !showForm && (
          <button onClick={() => setShowForm(true)} className="text-[10px] font-bold text-indigo-600 hover:underline">Write Review</button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="space-y-2 p-3 bg-slate-50 rounded-xl border border-slate-100">
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map(s => (
              <button key={s} type="button" onClick={() => setRating(s)}>
                <Star className={s <= rating ? "text-amber-400 fill-amber-400" : "text-slate-300"} size={16} />
              </button>
            ))}
          </div>
          <textarea 
            required
            placeholder="Your thoughts..."
            className="w-full text-xs p-2 rounded-lg border border-slate-200 outline-none focus:border-indigo-500"
            value={comment}
            onChange={e => setComment(e.target.value)}
          />
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setShowForm(false)} className="text-[10px] font-bold text-slate-500">Cancel</button>
            <button type="submit" className="text-[10px] font-bold text-white bg-indigo-600 px-3 py-1 rounded-md">Post</button>
          </div>
        </form>
      )}

      <div className="space-y-3 max-h-40 overflow-y-auto pr-2 scrollbar-hide">
        {reviews.map(review => (
          <div key={review.id} className="space-y-1">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-bold">{review.userName}</span>
              <div className="flex gap-0.5">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className={i < review.rating ? "text-amber-400 fill-amber-400" : "text-slate-200"} size={8} />
                ))}
              </div>
            </div>
            <p className="text-[10px] text-slate-500 italic">"{review.comment}"</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function OrdersView({ token }: { token: string }) {
  const [orders, setOrders] = useState<any[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const data = await api.get("/orders", token);
      setOrders(data);
    } catch (err) {
      console.error("Failed to fetch orders", err);
    }
  };

  const handleDeleteOrder = async (id: string) => {
    try {
      await api.delete(`/orders/${id}`, token);
      setOrders(orders.filter(o => o.id !== id));
      setDeletingId(null);
    } catch (err) {
      console.error("Failed to delete order", err);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold">Order History</h2>
        <p className="text-slate-500">Track your recent purchases and status.</p>
      </div>

      {orders.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border border-slate-200">
          <Package className="mx-auto text-slate-200 mb-4" size={48} />
          <p className="text-slate-500">No orders found yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order: any) => (
            <div key={order.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Order ID: {order.id}</p>
                  <p className="text-sm text-slate-500">{new Date(order.createdAt).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="px-3 py-1 bg-indigo-50 text-indigo-600 text-xs font-bold rounded-full capitalize">
                    {order.status}
                  </span>
                  <button 
                    onClick={() => setDeletingId(order.id)}
                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap gap-4">
                {order.items.map((item: any) => (
                  <div key={item.productId} className="flex items-center gap-3">
                    <img src={item.image} alt={item.name} className="w-12 h-12 rounded-lg object-cover bg-slate-50" referrerPolicy="no-referrer" />
                    <div>
                      <p className="text-sm font-bold">{item.name}</p>
                      <p className="text-xs text-slate-500">Qty: {item.quantity}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="pt-4 border-t border-slate-50 flex justify-between items-center">
                <span className="text-sm font-medium text-slate-600">Total Amount</span>
                <span className="text-xl font-bold text-slate-900">${order.total.toFixed(2)}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deletingId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-md p-8 rounded-3xl shadow-2xl space-y-6"
            >
              <div className="text-center space-y-2">
                <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto">
                  <Trash2 size={32} />
                </div>
                <h3 className="text-2xl font-bold">Delete Order?</h3>
                <p className="text-slate-500">This action cannot be undone. Are you sure you want to remove this order from your history?</p>
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={() => setDeletingId(null)}
                  className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => handleDeleteOrder(deletingId)}
                  className="flex-1 py-3 bg-rose-500 text-white rounded-xl font-bold hover:bg-rose-600 transition-all shadow-lg shadow-rose-200"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
