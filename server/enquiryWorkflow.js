import nodemailer from "nodemailer";

export const ENQUIRY_STATUSES = ["New", "Contacted", "Follow-up", "Admitted", "Not Interested"];
export const ENQUIRY_CONFIRMATION = "Thank you for contacting Astrratech Learning Academy! Your enquiry has been received successfully. Our team will contact you soon to discuss course details and answer your questions.";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const stringValue = (value, fallback = "") => typeof value === "string" ? value.trim() : fallback;

export function validateEnquiryInput(body = {}) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { errors: ["Enquiry must be submitted as an object."], enquiry: null };
  }
  const errors = [];
  for (const key of ["name", "phone", "email", "course", "message"]) {
    if (Object.hasOwn(body, key) && typeof body[key] !== "string") {
      errors.push(`${key} must be text.`);
    }
  }
  const name = stringValue(body.name);
  const phone = stringValue(body.phone);
  const email = stringValue(body.email);
  const course = stringValue(body.course);
  const message = stringValue(body.message);

  if (name.length < 2 || name.length > 100) errors.push("Name must be between 2 and 100 characters.");
  if (phone.length > 30 || !/^(?=(?:\D*\d){7,})[0-9+().\s-]+$/.test(phone)) errors.push("Enter a valid phone number.");
  if (email.length > 160 || (email && !emailPattern.test(email))) errors.push("Enter a valid email address.");
  if (!course || course.length > 140) errors.push("Course is required and must be at most 140 characters.");
  if (message.length > 1500) errors.push("Message must be at most 1500 characters.");

  return {
    errors,
    enquiry: { name, phone, email, course, message }
  };
}

export function validateEnquiryUpdate(body = {}) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { errors: ["Enquiry update must be an object."], update: null };
  }

  const update = {};
  const errors = [];
  const allowedKeys = new Set(["status", "followUpAt", "internalNotes"]);
  if (Object.keys(body).some(key => !allowedKeys.has(key))) {
    errors.push("Enquiry update contains unsupported fields.");
  }
  if (Object.hasOwn(body, "status")) {
    if (!ENQUIRY_STATUSES.includes(body.status)) errors.push("Choose a valid enquiry status.");
    else update.status = body.status;
  }
  if (Object.hasOwn(body, "followUpAt")) {
    if (body.followUpAt === null || body.followUpAt === "") update.followUpAt = null;
    else if (typeof body.followUpAt !== "string" || !Number.isFinite(Date.parse(body.followUpAt))) {
      errors.push("Enter a valid follow-up date and time.");
    } else {
      update.followUpAt = new Date(body.followUpAt);
    }
  }
  if (Object.hasOwn(body, "internalNotes")) {
    if (typeof body.internalNotes !== "string" || body.internalNotes.length > 3000) {
      errors.push("Internal notes must be text and at most 3000 characters.");
    } else {
      update.internalNotes = body.internalNotes.trim();
    }
  }
  if (!Object.keys(update).length && !errors.length) errors.push("Provide enquiry fields to update.");
  return { errors, update };
}

export async function sendEnquiryNotifications(enquiry, {
  env = process.env,
  createTransport = nodemailer.createTransport,
  logger = console.error
} = {}) {
  const configuredKeys = ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASS", "SMTP_FROM", "ENQUIRY_NOTIFICATION_EMAIL"];
  const hasAnyConfiguration = configuredKeys.some(key => stringValue(env[key]));
  const host = stringValue(env.SMTP_HOST);
  const from = stringValue(env.SMTP_FROM);
  const adminEmail = stringValue(env.ENQUIRY_NOTIFICATION_EMAIL || env.ADMIN_EMAIL);
  if (!host && !hasAnyConfiguration) return { configured: false, failures: 0 };
  if (!host || !from || !adminEmail || !emailPattern.test(adminEmail) ||
      (!!env.SMTP_USER !== !!env.SMTP_PASS) ||
      (env.SMTP_PORT && !/^\d+$/.test(env.SMTP_PORT))) {
    logger("Enquiry email notifications are configured incompletely; email was not sent.");
    return { configured: false, failures: 1 };
  }

  let transport;
  try {
    transport = createTransport({
      host,
      port: Number(env.SMTP_PORT || 587),
      secure: stringValue(env.SMTP_SECURE).toLowerCase() === "true",
      ...(env.SMTP_USER ? { auth: { user: env.SMTP_USER, pass: env.SMTP_PASS } } : {})
    });
  } catch {
    logger("Enquiry email transport could not be configured.");
    return { configured: true, failures: 2 };
  }

  const messages = [{
    purpose: "admin notification",
    to: adminEmail,
    subject: "New Astrratech Learning Academy enquiry",
    text: [
      "A new enquiry was received.",
      `Name: ${enquiry.name}`,
      `Phone: ${enquiry.phone}`,
      `Email: ${enquiry.email || "Not provided"}`,
      `Course: ${enquiry.course}`,
      `Message: ${enquiry.message || "Not provided"}`
    ].join("\n")
  }];
  if (enquiry.email && emailPattern.test(enquiry.email)) {
    messages.push({
      purpose: "student confirmation",
      to: enquiry.email,
      subject: "We received your enquiry",
      text: ENQUIRY_CONFIRMATION
    });
  }

  const results = await Promise.all(messages.map(async message => {
    try {
      await transport.sendMail({ from, ...message });
      return true;
    } catch (error) {
      const code = typeof error?.code === "string" ? ` (${error.code})` : "";
      logger(`Enquiry ${message.purpose} email failed${code}.`);
      return false;
    }
  }));
  return { configured: true, failures: results.filter(result => !result).length };
}
