import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import dns from "node:dns";
import { createHmac, randomBytes } from "node:crypto";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";
import multer from "multer";
import { getValidatedImageType, hasCloudinaryConfiguration, imageUpload, uploadImageToCloudinary } from "./imageUpload.js";
import { ENQUIRY_STATUSES, ENQUIRY_CONFIRMATION, sendEnquiryNotifications, validateEnquiryInput, validateEnquiryUpdate } from "./enquiryWorkflow.js";
import { DEFAULT_CONTACT_SETTINGS, validateContactSettings } from "../shared/contactSettings.js";

const isMainModule = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMainModule) dotenv.config();

export function validateAdminConfiguration(env = process.env) {
  const errors = [];
  const email = typeof env.ADMIN_EMAIL === "string" ? env.ADMIN_EMAIL.trim() : "";
  const passwordHash = typeof env.ADMIN_PASSWORD_HASH === "string" ? env.ADMIN_PASSWORD_HASH : "";
  const jwtSecret = typeof env.JWT_SECRET === "string" ? env.JWT_SECRET : "";
  const bcryptHash = /^\$2[aby]\$(\d{2})\$[./A-Za-z0-9]{53}$/.exec(passwordHash);

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push("ADMIN_EMAIL must be a valid email address.");
  if (!bcryptHash || Number(bcryptHash[1]) < 10) errors.push("ADMIN_PASSWORD_HASH must be a bcrypt hash with a cost of at least 10.");
  if (jwtSecret.trim().length < 32) errors.push("JWT_SECRET must be at least 32 characters.");
  return errors;
}

const LOCAL_MONGODB_URI = "mongodb://127.0.0.1:27017/astratech_academy";

function safeMongoErrorDetails(error) {
  const errorType = typeof error?.name === "string" && /^[A-Za-z][A-Za-z0-9]{0,39}$/.test(error.name)
    ? error.name
    : "Error";
  const errorCode = typeof error?.code === "string" && /^[A-Z0-9_]{1,40}$/.test(error.code)
    ? error.code
    : undefined;
  return { errorType, ...(errorCode ? { errorCode } : {}) };
}

export function getMongoConnectionUri(env = process.env) {
  const uri = typeof env.MONGODB_URI === "string" ? env.MONGODB_URI.trim() : "";
  if (uri) return uri;
  if (env.NODE_ENV === "production") {
    throw new Error("MONGODB_URI is required when NODE_ENV=production.");
  }
  return LOCAL_MONGODB_URI;
}

export function createHealthHandlers(connection = mongoose.connection) {
  async function readiness(_req, res) {
    if (connection.readyState !== 1 || !connection.db) {
      return res.status(503).json({ status: "unavailable", database: "disconnected" });
    }
    try {
      await connection.db.command({ ping: 1 }, { maxTimeMS: 2000 });
      return res.json({ status: "ok", database: "connected" });
    } catch {
      return res.status(503).json({ status: "unavailable", database: "disconnected" });
    }
  }

  function liveness(_req, res) {
    return res.json({ status: "ok" });
  }

  return { readiness, liveness };
}

export function createAdminLoginThrottle({
  now = Date.now,
  failureThreshold = 5,
  windowMs = 15 * 60 * 1000,
  baseDelayMs = 1000,
  maxDelayMs = 15 * 60 * 1000,
  maxEntries = 20000,
  keySecret = process.env.JWT_SECRET || randomBytes(32).toString("hex")
} = {}) {
  const attempts = new Map();
  const cleanupIntervalMs = 60 * 1000;
  let lastCleanupAt = 0;
  const keyFor = (scope, value) => createHmac("sha256", keySecret)
    .update(`${scope}\0${value}`)
    .digest("hex");

  function prune(currentTime, force = false) {
    if (!force && currentTime - lastCleanupAt < cleanupIntervalMs && attempts.size < maxEntries) return;
    lastCleanupAt = currentTime;
    for (const [key, state] of attempts) {
      if (state.blockedUntil <= currentTime && state.windowStartedAt + windowMs <= currentTime) {
        attempts.delete(key);
      }
    }
    while (attempts.size >= maxEntries) {
      const oldest = attempts.keys().next();
      if (oldest.done) break;
      attempts.delete(oldest.value);
    }
  }

  function stateFor(key, currentTime, create = false) {
    let state = attempts.get(key);
    if (state && state.windowStartedAt + windowMs <= currentTime && state.blockedUntil <= currentTime) {
      attempts.delete(key);
      state = null;
    }
    if (!state && create) {
      prune(currentTime);
      state = {
        failures: 0,
        windowStartedAt: currentTime,
        blockedUntil: 0,
        lastSeenAt: currentTime,
        lastThrottleLogUntil: 0
      };
      attempts.set(key, state);
    }
    if (state) state.lastSeenAt = currentTime;
    return state;
  }

  return {
    check(ipAddress, account) {
      const currentTime = now();
      prune(currentTime);
      let retryAfterMs = 0;
      for (const [scope, value] of [["ip", ipAddress], ["account", account]]) {
        const state = stateFor(keyFor(scope, value), currentTime);
        if (state?.blockedUntil > currentTime) {
          const remaining = state.blockedUntil - currentTime;
          retryAfterMs = Math.max(retryAfterMs, remaining);
          if (state.lastThrottleLogUntil !== state.blockedUntil) {
            state.lastThrottleLogUntil = state.blockedUntil;
            console.warn("Admin login temporarily throttled.", {
              scope,
              retryAfterSeconds: Math.ceil(remaining / 1000)
            });
          }
        }
      }
      return retryAfterMs;
    },
    failed(ipAddress, account) {
      const currentTime = now();
      for (const [scope, value] of [["ip", ipAddress], ["account", account]]) {
        const state = stateFor(keyFor(scope, value), currentTime, true);
        state.failures += 1;
        if (state.failures >= failureThreshold) {
          const exponent = Math.min(state.failures - failureThreshold, 20);
          const delay = Math.min(baseDelayMs * (2 ** exponent), maxDelayMs);
          state.blockedUntil = currentTime + delay;
          if (state.failures === failureThreshold || state.failures % 10 === 0) {
            console.warn("Repeated admin login failures.", {
              scope,
              failureCount: state.failures
            });
          }
        }
      }
    },
    succeeded(ipAddress, account) {
      attempts.delete(keyFor("ip", ipAddress));
      attempts.delete(keyFor("account", account));
    }
  };
}

const adminLoginThrottle = createAdminLoginThrottle();
const app = express();
const PORT = process.env.PORT || 5000;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
app.use(cors({ origin: process.env.CLIENT_URL ? process.env.CLIENT_URL.split(",") : true }));
app.use(express.json({ limit: "1mb" }));

mongoose.connection.on("disconnected", () => {
  console.error("MongoDB disconnected; readiness checks will fail.");
});
mongoose.connection.on("reconnected", () => {
  console.info("MongoDB reconnected; readiness checks will resume.");
});
mongoose.connection.on("error", error => {
  console.error("MongoDB connection error.", {
    ...safeMongoErrorDetails(error)
  });
});

const itemSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 140 },
  slug: { type: String, trim: true },
  category: { type: String, default: "General" },
  description: { type: String, required: true, maxlength: 1200 },
  downloadUrl: { type: String, trim: true, maxlength: 2000, default: "" },
  duration: { type: String, default: "" },
  icon: { type: String, default: "✦" },
  image: { type: String, default: "" },
  name: { type: String, default: "" },
  role: { type: String, default: "" },
  qualification: { type: String, default: "" },
  year: { type: String, default: "" },
  score: { type: String, default: "" },
  quote: { type: String, default: "" },
  type: { type: String, default: "Notice" },
  date: { type: String, default: "" },
  featured: { type: Boolean, default: false },
  sample: { type: Boolean, default: false }
}, { timestamps: true, strict: true });

const Course = mongoose.model("Course", itemSchema);
const Faculty = mongoose.model("Faculty", itemSchema);
const Notice = mongoose.model("Notice", itemSchema);
const Result = mongoose.model("Result", itemSchema);
const Testimonial = mongoose.model("Testimonial", itemSchema);
const Resource = mongoose.model("Resource", itemSchema);
const contactSettingsSchema = new mongoose.Schema({
  _id: { type: String, default: "contact" },
  heading: { type: String, required: true, trim: true, maxlength: 120 },
  description: { type: String, required: true, trim: true, maxlength: 500 },
  phone: { type: String, trim: true, maxlength: 30, default: "" },
  email: { type: String, trim: true, maxlength: 160, default: "" },
  address: { type: String, trim: true, maxlength: 300, default: "" },
  officeHours: { type: String, trim: true, maxlength: 200, default: "" },
  mapUrl: { type: String, trim: true, maxlength: 2000, default: "" }
}, { timestamps: true, strict: true, versionKey: false });
const ContactSettings = mongoose.model("ContactSettings", contactSettingsSchema);
const Enquiry = mongoose.model("Enquiry", new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  phone: { type: String, required: true, trim: true, maxlength: 30 },
  email: { type: String, trim: true, maxlength: 160, default: "" },
  course: { type: String, required: true, maxlength: 140 },
  message: { type: String, maxlength: 1500, default: "" },
  status: { type: String, enum: ENQUIRY_STATUSES, default: "New" },
  followUpAt: { type: Date, default: null },
  internalNotes: { type: String, maxlength: 3000, default: "" },
  sample: { type: Boolean, default: false }
}, { timestamps: true }));

const collections = { courses: Course, faculty: Faculty, notices: Notice, results: Result, testimonials: Testimonial, resources: Resource };
export function validateContentInput(collection, body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return "Content must be submitted as an object.";
  }
  if (Object.hasOwn(body, "sample") && typeof body.sample !== "boolean") {
    return "Sample visibility must be a boolean.";
  }
  if (collection === "resources" && body.downloadUrl !== undefined) {
    if (typeof body.downloadUrl !== "string" || body.downloadUrl.length > 2000) {
      return "Resource URL must be text and at most 2000 characters.";
    }
    if (body.downloadUrl.trim()) {
      try {
        const url = new URL(body.downloadUrl);
        if (url.protocol !== "https:") throw new Error();
      } catch {
        if (!/^\/(?!\/)[^\\\s]*$/.test(body.downloadUrl.trim())) {
          return "Resource URL must be HTTPS or a site-relative path.";
        }
      }
    }
  }
  return null;
}
function serializeContactSettings(settings = {}) {
  return Object.fromEntries(Object.keys(DEFAULT_CONTACT_SETTINGS).map(key => [
    key,
    settings[key] ?? DEFAULT_CONTACT_SETTINGS[key]
  ]));
}
export function adminAuth(req, res, next) {
  const authorization = req.headers.authorization;
  const bearerToken = typeof authorization === "string" ? /^Bearer\s+(\S+)$/i.exec(authorization) : null;
  if (!bearerToken) return res.status(401).json({ message: "Admin sign-in required." });
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.trim().length < 32) return res.status(503).json({ message: "Admin authentication is not configured." });
  try {
    const payload = jwt.verify(bearerToken[1], secret);
    if (payload.role !== "admin") return res.status(403).json({ message: "Not authorized." });
    req.admin = payload;
    next();
  } catch { return res.status(401).json({ message: "Session expired. Please sign in again." }); }
}
const healthHandlers = createHealthHandlers();
app.get("/api/live", healthHandlers.liveness);
app.get("/api/ready", healthHandlers.readiness);
app.get("/api/health", healthHandlers.readiness);
app.get("/api/content/:collection", async (req, res) => {
  if (req.params.collection === "contact") {
    try {
      const settings = await ContactSettings.findById("contact").lean();
      return res.json(serializeContactSettings(settings || {}));
    } catch {
      return res.status(500).json({ message: "Could not load contact settings." });
    }
  }
  const Model = collections[req.params.collection];
  if (!Model) return res.status(404).json({ message: "Content type not found." });
  try { res.json(await Model.find({ sample: { $ne: true } }).sort({ createdAt: -1 }).lean()); }
  catch { res.status(500).json({ message: "Could not load content." }); }
});
app.post("/api/enquiries", async (req, res) => {
  const { errors, enquiry } = validateEnquiryInput(req.body);
  if (errors.length) return res.status(400).json({ message: errors.join(" ") });
  let savedEnquiry;
  try {
    savedEnquiry = await Enquiry.create({
      ...enquiry,
      status: "New",
      followUpAt: null,
      internalNotes: "",
      sample: false
    });
  } catch {
    res.status(500).json({ message: "Enquiry could not be saved. Please try again." });
    return;
  }
  try {
    await sendEnquiryNotifications(savedEnquiry);
  } catch (error) {
    console.error("Enquiry email notifications failed after saving the enquiry.", error?.code || "delivery error");
  }
  res.status(201).json({ message: ENQUIRY_CONFIRMATION, id: savedEnquiry._id });
});
app.post("/api/admin/login", async (req, res) => {
  const { email, password } = req.body || {};
  if (typeof email !== "string" || typeof password !== "string" ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ||
      email.trim().length > 254 || password.length === 0 ||
      Buffer.byteLength(password, "utf8") > 72) {
    return res.status(400).json({ message: "Enter a valid email address and a password of at most 72 bytes." });
  }
  const configErrors = validateAdminConfiguration();
  if (configErrors.length) return res.status(503).json({ message: "Admin authentication is not configured." });
  const account = email.trim().toLowerCase();
  const ipAddress = req.socket?.remoteAddress || "unknown";
  const retryAfterMs = adminLoginThrottle.check(ipAddress, account);
  if (retryAfterMs > 0) {
    return res
      .set("Retry-After", String(Math.ceil(retryAfterMs / 1000)))
      .status(429)
      .json({ message: "Too many sign-in attempts. Please wait before trying again." });
  }
  const adminEmail = process.env.ADMIN_EMAIL.trim();
  const passwordHash = process.env.ADMIN_PASSWORD_HASH;
  const jwtSecret = process.env.JWT_SECRET;
  let passwordMatches = false;
  try {
    passwordMatches = await bcrypt.compare(password, passwordHash);
  } catch {
    return res.status(500).json({ message: "Unable to authenticate right now." });
  }
  if (email.trim().toLowerCase() !== adminEmail.toLowerCase() || !passwordMatches) {
    adminLoginThrottle.failed(ipAddress, account);
    return res.status(401).json({ message: "Email or password is incorrect." });
  }
  adminLoginThrottle.succeeded(ipAddress, account);
  const token = jwt.sign({ email: adminEmail, role: "admin" }, jwtSecret, { expiresIn: "8h" });
  res.json({ token, email: adminEmail });
});
app.get("/api/admin/enquiries", adminAuth, async (_req, res) => {
  try { res.json(await Enquiry.find().sort({ createdAt: -1 }).lean()); }
  catch { res.status(500).json({ message: "Could not load enquiries." }); }
});
app.get("/api/admin/:collection", adminAuth, async (req, res) => {
  const Model = collections[req.params.collection];
  if (!Model) return res.status(404).json({ message: "Content type not found." });
  try { res.json(await Model.find().sort({ createdAt: -1 }).lean()); }
  catch { res.status(500).json({ message: "Could not load content." }); }
});
app.put("/api/admin/enquiries/:id", adminAuth, async (req, res) => {
  const { errors, update } = validateEnquiryUpdate(req.body);
  if (errors.length) return res.status(400).json({ message: errors.join(" ") });
  try {
    const enquiry = await Enquiry.findByIdAndUpdate(req.params.id, { $set: update }, {
      new: true,
      runValidators: true
    });
    if (!enquiry) return res.status(404).json({ message: "Enquiry not found." });
    res.json(enquiry);
  } catch (error) {
    res.status(400).json({ message: error.message || "Could not update enquiry." });
  }
});
app.post("/api/admin/images", adminAuth, (req, res, next) => {
  imageUpload.single("image")(req, res, error => {
    if (error instanceof multer.MulterError) {
      const status = error.code === "LIMIT_FILE_SIZE" ? 413 : 400;
      return res.status(status).json({
        message: error.code === "LIMIT_FILE_SIZE"
          ? "Image must be 5 MB or smaller."
          : "Upload one image file only."
      });
    }
    if (error) return res.status(400).json({ message: "Upload request could not be read." });
    next();
  });
}, async (req, res) => {
  if (!req.file) return res.status(400).json({ message: "Choose an image to upload." });
  try {
    getValidatedImageType(req.file);
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
  if (!hasCloudinaryConfiguration()) {
    return res.status(503).json({ message: "Cloudinary image storage is not configured." });
  }
  try {
    const image = await uploadImageToCloudinary(req.file.buffer);
    res.status(201).json({ image });
  } catch {
    res.status(502).json({ message: "Cloudinary could not store the uploaded image." });
  }
});
app.post("/api/admin/:collection", adminAuth, async (req, res) => {
  const Model = collections[req.params.collection];
  if (!Model) return res.status(404).json({ message: "Content type not found." });
  const validationError = validateContentInput(req.params.collection, req.body);
  if (validationError) return res.status(400).json({ message: validationError });
  try { const item = await Model.create({ ...req.body, sample: req.body.sample === true }); res.status(201).json(item); }
  catch (e) { res.status(400).json({ message: e.message || "Could not create item." }); }
});
app.put("/api/admin/contact", adminAuth, async (req, res) => {
  let settings;
  try {
    settings = validateContactSettings(req.body);
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
  try {
    const saved = await ContactSettings.findByIdAndUpdate(
      "contact",
      { $set: settings },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    ).lean();
    res.json(serializeContactSettings(saved || settings));
  } catch (error) {
    res.status(400).json({ message: error.message || "Could not update contact settings." });
  }
});
app.put("/api/admin/:collection/:id", adminAuth, async (req, res) => {
  const Model = collections[req.params.collection];
  if (!Model) return res.status(404).json({ message: "Content type not found." });
  const validationError = validateContentInput(req.params.collection, req.body);
  if (validationError) return res.status(400).json({ message: validationError });
  try {
    const item = await Model.findByIdAndUpdate(req.params.id, { ...req.body }, { new: true, runValidators: true });
    if (!item) return res.status(404).json({ message: "Item not found." });
    res.json(item);
  } catch (e) { res.status(400).json({ message: e.message || "Could not update item." }); }
});
app.delete("/api/admin/:collection/:id", adminAuth, async (req, res) => {
  const Model = collections[req.params.collection];
  if (!Model) return res.status(404).json({ message: "Content type not found." });
  try { const result = await Model.findByIdAndDelete(req.params.id); if (!result) return res.status(404).json({ message: "Item not found." }); res.json({ message: "Item deleted." }); }
  catch { res.status(400).json({ message: "Could not delete item." }); }
});

const clientDist = path.resolve(__dirname, "../dist");
app.use(express.static(clientDist));
app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api/")) return next();
  res.sendFile(path.join(clientDist, "index.html"), err => { if (err) res.status(404).send("Build the frontend first."); });
});

export async function startServer({
  env = process.env,
  connect = (uri, options) => mongoose.connect(uri, options),
  listen = port => new Promise((resolve, reject) => {
    const server = app.listen(port, () => resolve(server));
    server.once("error", reject);
  }),
  disconnect = () => mongoose.disconnect()
} = {}) {
  const uri = getMongoConnectionUri(env);
  try {
    await connect(uri, {
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000
    });
    return await listen(Number(env.PORT) || Number(PORT));
  } catch (error) {
    try {
      await disconnect();
    } catch (disconnectError) {
      console.error("Could not close the MongoDB connection after startup failed.", {
        ...safeMongoErrorDetails(disconnectError)
      });
    }
    throw error;
  }
}

if (isMainModule) {
  const configErrors = validateAdminConfiguration();
  if (configErrors.length) {
    console.error(`Server configuration error: ${configErrors.join(" ")}`);
    process.exitCode = 1;
  } else {
    dns.setServers(["8.8.8.8", "8.8.4.4"]);
    startServer()
      .then(() => console.log(`Astrratech Learning Academy API running on port ${PORT}`))
      .catch(error => {
        console.error("Server startup failed. Verify MONGODB_URI, database network access, and startup configuration.", {
          ...safeMongoErrorDetails(error)
        });
        process.exitCode = 1;
      });
  }
}

export { app, Enquiry };
