import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import nodemailer from "nodemailer";
import { ENQUIRY_CONFIRMATION, sendEnquiryNotifications, validateEnquiryInput, validateEnquiryUpdate } from "./enquiryWorkflow.js";

const jwtSecret = "enquiry-test-secret-with-at-least-32-characters";
process.env.ADMIN_EMAIL = "admin-enquiry@example.test";
process.env.ADMIN_PASSWORD_HASH = await bcrypt.hash("EnquiryTestPassword", 10);
process.env.JWT_SECRET = jwtSecret;
for (const key of ["SMTP_HOST", "SMTP_USER", "SMTP_PASS", "SMTP_FROM", "ENQUIRY_NOTIFICATION_EMAIL"]) delete process.env[key];
const { app, Enquiry } = await import("./index.js");
let server;
let baseUrl;

before(async () => {
  server = app.listen(0, "127.0.0.1");
  await new Promise((resolve, reject) => {
    server.once("listening", resolve);
    server.once("error", reject);
  });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  if (server) await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
});

function adminHeaders() {
  return { authorization: `Bearer ${jwt.sign({ role: "admin" }, jwtSecret)}` };
}

test("validates public enquiry fields and optional email", () => {
  const valid = validateEnquiryInput({
    name: "  Sam Student ",
    phone: "+1 (555) 123-4567",
    email: "sam@example.test",
    course: "Mathematics",
    message: "Please share more details."
  });
  assert.deepEqual(valid.errors, []);
  assert.deepEqual(valid.enquiry, {
    name: "Sam Student",
    phone: "+1 (555) 123-4567",
    email: "sam@example.test",
    course: "Mathematics",
    message: "Please share more details."
  });
  assert.ok(validateEnquiryInput(null).errors.length);
  assert.ok(validateEnquiryInput({ name: 123, phone: "5551234567", course: "Math" }).errors.length);
  assert.ok(validateEnquiryInput({ name: "", phone: "123", email: "bad", course: "" }).errors.length >= 3);
  assert.ok(validateEnquiryInput({ name: "Valid Name", phone: "123456789", email: "", course: "Math", message: "x".repeat(1501) }).errors.length);
});

test("validates allowed enquiry statuses, follow-up dates, and private notes", () => {
  const valid = validateEnquiryUpdate({
    status: "Follow-up",
    followUpAt: "2026-10-20T10:30:00.000Z",
    internalNotes: " Call the parent tomorrow. "
  });
  assert.deepEqual(valid.errors, []);
  assert.equal(valid.update.status, "Follow-up");
  assert.equal(valid.update.followUpAt.toISOString(), "2026-10-20T10:30:00.000Z");
  assert.equal(valid.update.internalNotes, "Call the parent tomorrow.");
  assert.ok(validateEnquiryUpdate({ status: "Unknown" }).errors.length);
  assert.ok(validateEnquiryUpdate({ followUpAt: "not a date" }).errors.length);
  assert.ok(validateEnquiryUpdate({ internalNotes: "x".repeat(3001) }).errors.length);
  assert.ok(validateEnquiryUpdate({ internalNotes: "x", name: "attempted overwrite" }).errors.length);
});

test("admin enquiry reads and updates require admin authentication", async () => {
  for (const [url, method] of [
    ["/api/admin/enquiries", "GET"],
    ["/api/admin/enquiries/507f1f77bcf86cd799439011", "PUT"]
  ]) {
    const response = await fetch(`${baseUrl}${url}`, {
      method,
      headers: method === "PUT" ? { "content-type": "application/json" } : {}
    });
    assert.equal(response.status, 401);
  }
});

test("creates an enquiry and returns confirmation only after persistence", async () => {
  const originalCreate = Enquiry.create;
  const originalCreateTransport = nodemailer.createTransport;
  const previousMailEnv = Object.fromEntries(
    ["SMTP_HOST", "SMTP_PORT", "SMTP_FROM", "ENQUIRY_NOTIFICATION_EMAIL"].map(key => [key, process.env[key]])
  );
  let saved;
  Enquiry.create = async document => {
    saved = { ...document, _id: new mongoose.Types.ObjectId(), createdAt: new Date() };
    return saved;
  };
  process.env.SMTP_HOST = "smtp.example.test";
  process.env.SMTP_PORT = "587";
  process.env.SMTP_FROM = "academy@example.test";
  process.env.ENQUIRY_NOTIFICATION_EMAIL = "admin@example.test";
  nodemailer.createTransport = () => ({
    sendMail: async () => {
      throw Object.assign(new Error("Credentials must not be logged"), { code: "ECONNECTION" });
    }
  });
  try {
    const response = await fetch(`${baseUrl}/api/enquiries`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: "Sam Student",
        phone: "5551234567",
        email: "sam@example.test",
        course: "Mathematics",
        message: "Please call."
      })
    });
    assert.equal(response.status, 201);
    assert.deepEqual(await response.json(), { message: ENQUIRY_CONFIRMATION, id: saved._id.toString() });
    assert.equal(saved.status, "New");
    assert.equal(saved.sample, false);
    assert.equal(saved.internalNotes, "");

    const invalid = await fetch(`${baseUrl}/api/enquiries`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "A", phone: "123", email: "invalid", course: "" })
    });
    assert.equal(invalid.status, 400);
  } finally {
    Enquiry.create = originalCreate;
    nodemailer.createTransport = originalCreateTransport;
    for (const [key, value] of Object.entries(previousMailEnv)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});

test("admin can read enquiries and persist status, follow-up, and notes", async () => {
  const originalFind = Enquiry.find;
  const originalFindByIdAndUpdate = Enquiry.findByIdAndUpdate;
  const recordId = "507f1f77bcf86cd799439011";
  let saved = { _id: recordId, name: "Sam Student", email: "sam@example.test", course: "Math", status: "New" };
  Enquiry.find = () => ({ sort: () => ({ lean: async () => [saved] }) });
  Enquiry.findByIdAndUpdate = async (_id, update, options) => {
    assert.equal(String(_id), recordId);
    assert.equal(options.runValidators, true);
    saved = { ...saved, ...update.$set };
    return saved;
  };
  try {
    const listResponse = await fetch(`${baseUrl}/api/admin/enquiries`, { headers: adminHeaders() });
    assert.equal(listResponse.status, 200);
    assert.equal((await listResponse.json())[0].name, "Sam Student");

    const updateResponse = await fetch(`${baseUrl}/api/admin/enquiries/${recordId}`, {
      method: "PUT",
      headers: { ...adminHeaders(), "content-type": "application/json" },
      body: JSON.stringify({
        status: "Admitted",
        followUpAt: "2026-10-20T10:30:00.000Z",
        internalNotes: "Verified enrollment."
      })
    });
    assert.equal(updateResponse.status, 200);
    const updated = await updateResponse.json();
    assert.equal(updated.status, "Admitted");
    assert.equal(new Date(updated.followUpAt).toISOString(), "2026-10-20T10:30:00.000Z");
    assert.equal(updated.internalNotes, "Verified enrollment.");

    const invalidResponse = await fetch(`${baseUrl}/api/admin/enquiries/${recordId}`, {
      method: "PUT",
      headers: { ...adminHeaders(), "content-type": "application/json" },
      body: JSON.stringify({ status: "Forged status" })
    });
    assert.equal(invalidResponse.status, 400);
  } finally {
    Enquiry.find = originalFind;
    Enquiry.findByIdAndUpdate = originalFindByIdAndUpdate;
  }
});

test("email notification delivery failures do not throw or lose enquiry confirmation", async () => {
  const errors = [];
  const result = await sendEnquiryNotifications({
    name: "Sam Student",
    phone: "5551234567",
    email: "sam@example.test",
    course: "Mathematics",
    message: "Please call."
  }, {
    env: {
      SMTP_HOST: "smtp.example.test",
      SMTP_PORT: "587",
      SMTP_FROM: "academy@example.test",
      ENQUIRY_NOTIFICATION_EMAIL: "admin@example.test"
    },
    createTransport: () => ({
      sendMail: async () => {
        throw Object.assign(new Error("Credentials must not be logged"), { code: "ECONNECTION" });
      }
    }),
    logger: message => errors.push(message)
  });
  assert.deepEqual(result, { configured: true, failures: 2 });
  assert.equal(errors.length, 2);
  assert.ok(errors.every(message => !message.includes("Credentials")));
});

test("sends admin notification without student confirmation when no valid email was supplied", async () => {
  const sent = [];
  const result = await sendEnquiryNotifications({
    name: "Sam Student", phone: "5551234567", email: "", course: "Mathematics", message: ""
  }, {
    env: {
      SMTP_HOST: "smtp.example.test",
      SMTP_FROM: "academy@example.test",
      ENQUIRY_NOTIFICATION_EMAIL: "admin@example.test"
    },
    createTransport: () => ({ sendMail: async message => sent.push(message) }),
    logger: () => assert.fail("No notification error expected")
  });
  assert.deepEqual(result, { configured: true, failures: 0 });
  assert.equal(sent.length, 1);
  assert.equal(sent[0].to, "admin@example.test");
});
