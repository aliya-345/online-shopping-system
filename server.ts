import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import fs from "fs/promises";
import { z } from "zod";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
const DB_FILE = path.join(__dirname, "db.json");
const JWT_SECRET = process.env.JWT_SECRET || "default-secret-key";

// --- Database Helpers ---
async function readDb() {
  try {
    const data = await fs.readFile(DB_FILE, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    return {
      users: [],
      products: [],
      carts: {},
      orders: [],
      reviews: []
    };
  }
}

async function writeDb(data: any) {
  await fs.writeFile(DB_FILE, JSON.stringify(data, null, 2));
}

// --- Middleware ---
const authenticate = async (req: any, res: any, next: any) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    (req as any).user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: "Invalid token" });
  }
};

const isAdmin = (req: any, res: any, next: any) => {
  if ((req as any).user?.role !== "admin") return res.status(403).json({ error: "Forbidden: Admin only" });
  next();
};

const isCustomer = (req: any, res: any, next: any) => {
  if ((req as any).user?.role !== "customer") return res.status(403).json({ error: "Forbidden: Customers only" });
  next();
};

async function startServer() {
  const app = express();
  app.use(express.json());
  app.use(cors());

  // --- Auth APIs ---
  app.post("/api/auth/register", async (req, res) => {
    const { name, email, password, role } = req.body;
    const db = await readDb();
    if (db.users.find((u: any) => u.email === email)) {
      return res.status(400).json({ error: "User already exists" });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = {
      id: Date.now().toString(),
      name,
      email,
      password: hashedPassword,
      role: role || "customer"
    };
    db.users.push(newUser);
    await writeDb(db);
    res.status(201).json({ message: "User registered" });
  });

  app.post("/api/auth/login", async (req, res) => {
    const { email, password } = req.body;
    const db = await readDb();
    const user = db.users.find((u: any) => u.email === email);
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role, name: user.name }, JWT_SECRET, { expiresIn: "1d" });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  });

  // --- Product APIs ---
  app.get("/api/products", async (req, res) => {
    const { q } = req.query;
    const db = await readDb();
    let products = db.products;

    if (q && typeof q === "string") {
      const search = q.toLowerCase();
      products = products.filter((p: any) => 
        p.name.toLowerCase().includes(search) || 
        p.category.toLowerCase().includes(search) ||
        p.description.toLowerCase().includes(search)
      );
    }

    res.json(products);
  });

  app.post("/api/products", authenticate, isAdmin, async (req, res) => {
    const { name, category, price, stock, description, image } = req.body;
    
    // Basic validation
    if (!name || !price || !image) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    
    if (!image.startsWith("http")) {
      return res.status(400).json({ error: "Invalid image URL" });
    }

    const db = await readDb();
    const product = { 
      id: Date.now().toString(),
      name, 
      category, 
      price, 
      stock, 
      description, 
      image 
    };
    db.products.push(product);
    await writeDb(db);
    res.status(201).json(product);
  });

  app.put("/api/products/:id", authenticate, isAdmin, async (req, res) => {
    const { image } = req.body;
    
    if (image && !image.startsWith("http")) {
      return res.status(400).json({ error: "Invalid image URL" });
    }

    const db = await readDb();
    const index = db.products.findIndex((p: any) => p.id === req.params.id);
    if (index === -1) return res.status(404).json({ error: "Product not found" });
    db.products[index] = { ...db.products[index], ...req.body };
    await writeDb(db);
    res.json(db.products[index]);
  });

  app.delete("/api/products/:id", authenticate, isAdmin, async (req, res) => {
    const db = await readDb();
    db.products = db.products.filter((p: any) => p.id !== req.params.id);
    await writeDb(db);
    res.status(204).send();
  });

  // --- Cart APIs ---
  app.get("/api/cart", authenticate, async (req: any, res: any) => {
    const db = await readDb();
    const cart = db.carts[(req as any).user.id] || [];
    res.json(cart);
  });

  app.post("/api/cart", authenticate, async (req: any, res: any) => {
    const { productId, quantity } = req.body;
    const db = await readDb();
    const product = db.products.find((p: any) => p.id === productId);
    if (!product) return res.status(404).json({ error: "Product not found" });
    if (product.stock < quantity) return res.status(400).json({ error: "Insufficient stock" });

    const cart = db.carts[(req as any).user.id] || [];
    const itemIndex = cart.findIndex((item: any) => item.productId === productId);

    if (itemIndex > -1) {
      cart[itemIndex].quantity += quantity;
    } else {
      cart.push({ productId, quantity, name: product.name, price: product.price, image: product.image });
    }

    db.carts[(req as any).user.id] = cart;
    await writeDb(db);
    res.json(cart);
  });

  app.put("/api/cart/:productId", authenticate, async (req: any, res: any) => {
    const { quantity } = req.body;
    const db = await readDb();
    const cart = db.carts[(req as any).user.id] || [];
    const itemIndex = cart.findIndex((item: any) => item.productId === req.params.productId);
    if (itemIndex === -1) return res.status(404).json({ error: "Item not found in cart" });

    const product = db.products.find((p: any) => p.id === req.params.productId);
    if (product && product.stock < quantity) return res.status(400).json({ error: "Insufficient stock" });

    cart[itemIndex].quantity = quantity;
    db.carts[(req as any).user.id] = cart;
    await writeDb(db);
    res.json(cart);
  });

  app.delete("/api/cart/:productId", authenticate, async (req: any, res: any) => {
    const db = await readDb();
    let cart = db.carts[(req as any).user.id] || [];
    cart = cart.filter((item: any) => item.productId !== req.params.productId);
    db.carts[(req as any).user.id] = cart;
    await writeDb(db);
    res.json(cart);
  });

  // --- Review APIs ---
  app.get("/api/reviews/:productId", async (req: any, res: any) => {
    const db = await readDb();
    const reviews = db.reviews.filter((r: any) => r.productId === req.params.productId);
    res.json(reviews);
  });

  app.post("/api/reviews", authenticate, isCustomer, async (req: any, res: any) => {
    const { productId, rating, comment } = req.body;
    const db = await readDb();
    const review = {
      id: Date.now().toString(),
      userId: (req as any).user.id,
      userName: (req as any).user.name,
      productId,
      rating,
      comment,
      createdAt: new Date().toISOString()
    };
    db.reviews.push(review);
    await writeDb(db);
    res.status(201).json(review);
  });

  // --- Order APIs ---
  app.post("/api/orders", authenticate, async (req: any, res: any) => {
    const db = await readDb();
    const cart = db.carts[(req as any).user.id];
    if (!cart || cart.length === 0) return res.status(400).json({ error: "Cart is empty" });

    // Validate stock and update
    for (const item of cart) {
      const product = db.products.find((p: any) => p.id === item.productId);
      if (!product || product.stock < item.quantity) {
        return res.status(400).json({ error: `Insufficient stock for ${product?.name || 'unknown product'}` });
      }
      product.stock -= item.quantity;
    }

    const order = {
      id: Date.now().toString(),
      userId: (req as any).user.id,
      items: cart,
      total: cart.reduce((sum: number, item: any) => sum + item.price * item.quantity, 0),
      status: "pending",
      createdAt: new Date().toISOString()
    };

    db.orders.push(order);
    db.carts[(req as any).user.id] = []; // Clear cart
    await writeDb(db);
    res.status(201).json(order);
  });

  app.get("/api/orders", authenticate, async (req: any, res: any) => {
    const db = await readDb();
    const orders = db.orders.filter((o: any) => o.userId === (req as any).user.id);
    res.json(orders);
  });

  app.delete("/api/orders/:id", authenticate, async (req: any, res: any) => {
    const db = await readDb();
    const orderIndex = db.orders.findIndex((o: any) => o.id === req.params.id);
    
    if (orderIndex === -1) {
      return res.status(404).json({ error: "Order not found" });
    }

    const order = db.orders[orderIndex];
    const user = (req as any).user;

    // Authorization: Admin can delete any, Customer can delete only their own
    if (user.role !== "admin" && order.userId !== user.id) {
      return res.status(403).json({ error: "Forbidden: You can only delete your own orders" });
    }

    db.orders.splice(orderIndex, 1);
    await writeDb(db);
    res.status(204).send();
  });

  // --- Vite Middleware ---
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
