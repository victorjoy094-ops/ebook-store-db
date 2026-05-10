import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Flutterwave Initialize Payment
  app.post("/api/payments/initialize", async (req, res) => {
    try {
      const { amount, email, name, tx_ref, book_id, type, referral_id } = req.body;
      
      const response = await axios.post(
        "https://api.flutterwave.com/v3/payments",
        {
          tx_ref: tx_ref || `jmbooks-${Date.now()}`,
          amount,
          currency: "USD",
          redirect_url: `${process.env.APP_URL}/payment-success`,
          meta: {
            book_id,
            user_id: email,
            type, // 'purchase' or 'subscription'
            referral_id
          },
          customer: {
            email,
            name
          },
          customizations: {
            title: "JM Books",
            description: type === 'subscription' ? "Monthly Subscription" : "Book Purchase",
            logo: "https://ais-dev-3yp7dq4oqka24hlauuq5m4-321817892267.europe-west3.run.app/logo.png"
          }
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}`
          }
        }
      );

      res.json(response.data);
    } catch (error: any) {
      console.error("Flutterwave error:", error.response?.data || error.message);
      res.status(500).json({ error: error.response?.data || "Payment initialization failed" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*all", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
