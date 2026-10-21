import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import dns from "node:dns";
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

const app = express();
const PORT = process.env.PORT || 5000;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
app.use(cors({ origin: process.env.CLIENT_URL ? process.env.CLIENT_URL.split(",") : true }));
app.use(express.json({ limit: "1mb" }));

const itemSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 140 },
  slug: { type: String, trim: true },
  category: { type: String, default: "General" },
  description: { type: String, required: true, maxlength: 1200 },
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
  sample: { type: Boolean, default: true }
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
  address: { type: String, required: true, trim: true, maxlength: 300 },
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

const seedData = {
  courses: [
    { title: "Foundation Programme", category: "FOUNDATION", duration: "12 weeks", icon: "✳", description: "Build confidence in essential concepts with guided lessons, deliberate practice and structured revision.", featured: true },
    { title: "Mathematics Mastery", category: "SUBJECT SUPPORT", duration: "10 weeks", icon: "∑", description: "Strengthen problem-solving skills and develop a clear approach to core mathematics topics.", featured: true },
    { title: "Science Explorers", category: "SUBJECT SUPPORT", duration: "12 weeks", icon: "⚗", description: "Connect scientific concepts with practical examples, clear explanations and active learning.", featured: true },
    { title: "Exam Preparation", category: "EXAM READINESS", duration: "16 weeks", icon: "◎", description: "Plan revision, practise question patterns and build a steady exam preparation routine.", featured: true },
    { title: "English & Communication", category: "SKILL BUILDING", duration: "8 weeks", icon: "Aa", description: "Improve reading, writing, grammar and communication through structured practice." },
    { title: "Personal Learning Support", category: "GUIDED LEARNING", duration: "Flexible", icon: "↗", description: "A supportive learning path shaped around individual goals and areas for improvement." }
  ],
  faculty: [
    { title: "Mathematics Mentor", name: "Dr. Aanya Mehta", role: "Mathematics Mentor", qualification: "M.Sc. Mathematics · 8 years", image: "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=800&q=85", description: "Makes challenging ideas feel approachable through clear explanations and practice.", featured: true },
    { title: "Science Educator", name: "Rohan Kulkarni", role: "Science Educator", qualification: "M.Sc. Physics · 7 years", image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=800&q=85", description: "Connects classroom concepts to practical examples and curiosity-led learning." },
    { title: "Language Coach", name: "Neha Sharma", role: "Language Coach", qualification: "M.A. English · 6 years", image: "https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=800&q=85", description: "Helps learners communicate with clarity, confidence and purpose." }
  ],
  notices: [
    { title: "Sample admissions are open", category: "Admissions", type: "Notice", date: "Demo notice", description: "Contact our team to discuss sample course options for the upcoming academic session.", featured: true },
    { title: "Weekly study planner", category: "Student support", type: "Resource", date: "Demo resource", description: "A sample planning guide to help learners organise weekly study goals." },
    { title: "Welcome orientation", category: "Community", type: "Event", date: "Demo event", description: "A placeholder event notice. Replace with an approved date before publishing." }
  ],
  results: [
  {
    title: "Foundation Programme Result",
    name: "Sample learner A",
    role: "Foundation programme",
    year: "2026",
    score: "92%",
    description: "Illustrative result for design preview only.",
    sample: true
  },
  {
    title: "Mathematics Mastery Result",
    name: "Sample learner B",
    role: "Mathematics mastery",
    year: "2026",
    score: "88%",
    description: "Illustrative result for design preview only.",
    sample: true
  },
  {
    title: "Exam Preparation Result",
    name: "Sample learner C",
    role: "Exam preparation",
    year: "2026",
    score: "95%",
    description: "Illustrative result for design preview only.",
    sample: true
  }
],
  testimonials: [
  {
    title: "Structured Learning",
    name: "Aarav M.",
    role: "Sample student",
    quote: "The structured lessons helped me break a big goal into smaller, manageable steps.",
    description: "Sample testimonial — not a real review.",
    sample: true
  },
  {
    title: "Supportive Learning",
    name: "Sana K.",
    role: "Sample student",
    quote: "I felt comfortable asking questions and could see where I needed more practice.",
    description: "Sample testimonial — not a real review.",
    featured: true,
    sample: true
  },
  {
    title: "Growing Confidence",
    name: "Riya V.",
    role: "Sample student",
    quote: "The learning plan gave me more confidence and helped me stay consistent.",
    description: "Sample testimonial — not a real review.",
    sample: true
  }
],
  resources: [
    { title: "A calmer study week", category: "Study guide", type: "PDF / Sample", description: "A demo study-planning resource. Replace this card with a real approved download before launch." },
    { title: "Getting ready for assessments", category: "Checklist", type: "Checklist", description: "A sample checklist for preparing materials, setting goals and planning revision." },
    { title: "How to ask better questions", category: "Learning tips", type: "Article", description: "A short sample article about curiosity, note-taking and asking for help." }
  ]
};

async function seedIfEmpty() {
  for (const [key, Model] of Object.entries({ courses: Course, faculty: Faculty, notices: Notice, results: Result, testimonials: Testimonial, resources: Resource })) {
    if (await Model.countDocuments() === 0) await Model.insertMany(seedData[key]);
  }
}
const collections = { courses: Course, faculty: Faculty, notices: Notice, results: Result, testimonials: Testimonial, resources: Resource };
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
app.get("/api/health", (_req, res) => res.json({ status: "ok", database: mongoose.connection.readyState === 1 ? "connected" : "disconnected" }));
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
  try { res.json(await Model.find().sort({ createdAt: -1 }).lean()); }
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
    return res.status(401).json({ message: "Email or password is incorrect." });
  }
  const token = jwt.sign({ email: adminEmail, role: "admin" }, jwtSecret, { expiresIn: "8h" });
  res.json({ token, email: adminEmail });
});
app.get("/api/admin/enquiries", adminAuth, async (_req, res) => {
  try { res.json(await Enquiry.find().sort({ createdAt: -1 }).lean()); }
  catch { res.status(500).json({ message: "Could not load enquiries." }); }
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
  try { const item = await Model.create({ ...req.body, sample: true }); res.status(201).json(item); }
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
  try {
    const item = await Model.findByIdAndUpdate(req.params.id, { ...req.body, sample: true }, { new: true, runValidators: true });
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

if (isMainModule) {
  const configErrors = validateAdminConfiguration();
  if (configErrors.length) {
    console.error(`Server configuration error: ${configErrors.join(" ")}`);
    process.exitCode = 1;
  } else {
    dns.setServers(["8.8.8.8", "8.8.4.4"]);
    mongoose.connect(process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/astratech_academy")
      .then(async () => { await seedIfEmpty(); console.log("MongoDB connected; demo content ready."); })
      .catch(err => console.error("MongoDB connection failed. Check MONGODB_URI in .env.", err.message));

    app.listen(PORT, () => console.log(`Astrratech Learning Academy API running at http://localhost:${PORT}`));
  }
}

export { app, Enquiry };
