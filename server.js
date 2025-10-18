const express = require("express");
const axios = require("axios");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

// EUIPO API configuration
const EUIPO_BASE_URL = "https://api.euipo.europa.eu/trademark-search";
const EUIPO_AUTH_URL = "https://auth.euipo.europa.eu/oidc/accessToken";
const CLIENT_ID = process.env.KEY;
const CLIENT_SECRET = process.env.SECRET;

// Store access token in memory (in production, use proper token management)
let accessToken = null;
let tokenExpiry = null;

// OAuth2 Client Credentials Flow
async function getAccessToken() {
  try {
    // Check if token is still valid (with 5 minute buffer)
    if (accessToken && tokenExpiry && Date.now() < tokenExpiry - 300000) {
      return accessToken;
    }

    const response = await axios.post(
      EUIPO_AUTH_URL,
      "grant_type=client_credentials&scope=uid",
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${Buffer.from(
            `${CLIENT_ID}:${CLIENT_SECRET}`
          ).toString("base64")}`,
        },
      }
    );

    accessToken = response.data.access_token;
    // Set expiry time (assuming expires_in is in seconds)
    tokenExpiry = Date.now() + response.data.expires_in * 1000;

    console.log("Access token obtained successfully");
    return accessToken;
  } catch (error) {
    console.error(
      "Error obtaining access token:",
      error.response?.data || error.message
    );
    throw new Error("Failed to authenticate with EUIPO API");
  }
}

// Search trademarks
async function searchTrademarks(query, options = {}) {
  try {
    const token = await getAccessToken();

    const params = new URLSearchParams();
    if (query) params.append("query", query);
    if (options.page !== undefined) params.append("page", options.page);
    if (options.size !== undefined) params.append("size", options.size);
    if (options.sort) params.append("sort", options.sort);
    if (options.fields) params.append("fields", options.fields);

    const response = await axios.get(
      `${EUIPO_BASE_URL}/trademarks?${params.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "X-IBM-Client-Id": CLIENT_ID,
          Accept: "application/json",
        },
      }
    );

    return response.data;
  } catch (error) {
    console.error(
      "Error searching trademarks:",
      error.response?.data || error.message
    );
    throw error;
  }
}

// Routes
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// API endpoint for trademark search
app.get("/api/search", async (req, res) => {
  try {
    const { name, query, page = 0, size = 10 } = req.query;

    // Handle both old 'name' parameter and new 'query' parameter for backward compatibility
    let searchQuery;

    if (query && query.trim() !== "") {
      // New wildcard search with RSQL patterns
      searchQuery = query.trim();
    } else if (name && name.trim() !== "") {
      // Legacy simple name search
      searchQuery = `wordMarkSpecification.verbalElement==*${name.trim()}*`;
    } else {
      return res
        .status(400)
        .json({ error: "Name or query parameter is required" });
    }

    console.log("Search query:", searchQuery);

    const results = await searchTrademarks(searchQuery, {
      page: parseInt(page),
      size: parseInt(size),
      sort: "applicationDate:desc",
    });

    res.json(results);
  } catch (error) {
    console.error("Search error:", error);

    if (error.response?.status === 401) {
      res.status(401).json({ error: "Authentication failed" });
    } else if (error.response?.status === 400) {
      res.status(400).json({ error: "Invalid search query" });
    } else if (error.response?.status === 429) {
      res.status(429).json({ error: "Rate limit exceeded" });
    } else {
      res.status(500).json({ error: "Internal server error" });
    }
  }
});

// Get trademark details by application number
app.get("/api/trademark/:applicationNumber", async (req, res) => {
  try {
    const { applicationNumber } = req.params;
    const token = await getAccessToken();

    const response = await axios.get(
      `${EUIPO_BASE_URL}/trademarks/${applicationNumber}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "X-IBM-Client-Id": CLIENT_ID,
          Accept: "application/json",
        },
      }
    );

    res.json(response.data);
  } catch (error) {
    console.error("Error fetching trademark details:", error);

    if (error.response?.status === 404) {
      res.status(404).json({ error: "Trademark not found" });
    } else if (error.response?.status === 401) {
      res.status(401).json({ error: "Authentication failed" });
    } else {
      res.status(500).json({ error: "Internal server error" });
    }
  }
});

// Get trademark image endpoints
app.get("/api/trademark/:applicationNumber/image", async (req, res) => {
  try {
    const { applicationNumber } = req.params;
    const token = await getAccessToken();

    const response = await axios.get(
      `${EUIPO_BASE_URL}/trademarks/${applicationNumber}/image`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "X-IBM-Client-Id": CLIENT_ID,
        },
        responseType: "arraybuffer",
      }
    );

    // Set appropriate content type based on response
    const contentType = response.headers["content-type"] || "image/jpeg";
    res.set("Content-Type", contentType);
    res.send(response.data);
  } catch (error) {
    console.error("Error fetching trademark image:", error);

    if (error.response?.status === 404) {
      res.status(404).json({ error: "Image not found" });
    } else if (error.response?.status === 401) {
      res.status(401).json({ error: "Authentication failed" });
    } else {
      res.status(500).json({ error: "Internal server error" });
    }
  }
});

app.get(
  "/api/trademark/:applicationNumber/image/thumbnail",
  async (req, res) => {
    try {
      const { applicationNumber } = req.params;
      const token = await getAccessToken();

      const response = await axios.get(
        `${EUIPO_BASE_URL}/trademarks/${applicationNumber}/image/thumbnail`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "X-IBM-Client-Id": CLIENT_ID,
          },
          responseType: "arraybuffer",
        }
      );

      // Set appropriate content type based on response
      const contentType = response.headers["content-type"] || "image/jpeg";
      res.set("Content-Type", contentType);
      res.send(response.data);
    } catch (error) {
      console.error("Error fetching trademark thumbnail:", error);

      if (error.response?.status === 404) {
        res.status(404).json({ error: "Thumbnail not found" });
      } else if (error.response?.status === 401) {
        res.status(401).json({ error: "Authentication failed" });
      } else {
        res.status(500).json({ error: "Internal server error" });
      }
    }
  }
);

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "OK", timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(
    `🛡️  OBP - Online Brand Protection server running on http://localhost:${PORT}`
  );
  console.log(
    `🌐 Brand protection platform ready for trademark intelligence analysis`
  );
  console.log("EUIPO API credentials:", {
    CLIENT_ID: CLIENT_ID ? "✅ Configured" : "❌ Missing",
    CLIENT_SECRET: CLIENT_SECRET ? "✅ Configured" : "❌ Missing",
  });
});
