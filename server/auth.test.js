import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { Writable } from "node:stream";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { v2 as cloudinary } from "cloudinary";
import { MAX_IMAGE_SIZE } from "./imageUpload.js";
import { DEFAULT_CONTACT_SETTINGS } from "../shared/contactSettings.js";

const adminEmail = "admin-test@example.test";
const adminPassword = "LocalTestPassword-Only";
const jwtSecret = "test-only-secret-with-at-least-32-characters";
process.env.ADMIN_EMAIL = adminEmail;
process.env.ADMIN_PASSWORD_HASH = await bcrypt.hash(adminPassword, 10);
process.env.JWT_SECRET = jwtSecret;
process.env.CLOUDINARY_CLOUD_NAME = "astrratech-test";
process.env.CLOUDINARY_API_KEY = "test-api-key";
process.env.CLOUDINARY_API_SECRET = "test-api-secret";

const { app, adminAuth, validateAdminConfiguration } = await import("./index.js");
let server;
let baseUrl;
const originalUploadStream = cloudinary.uploader.upload_stream;
let cloudinaryUploadCount = 0;

before(async () => {
  cloudinary.uploader.upload_stream = (options, callback) => {
    assert.equal(options.resource_type, "image");
    assert.equal(options.folder, "astratech-academy");
    assert.deepEqual(options.allowed_formats, ["jpg", "jpeg", "png", "webp", "gif", "bmp", "avif"]);
    return new Writable({
      write(_chunk, _encoding, done) {
        done();
      },
      final(done) {
        cloudinaryUploadCount += 1;
        callback(null, {
          secure_url: `https://res.cloudinary.com/astrratech-test/image/upload/v1/astratech-academy/image-${cloudinaryUploadCount}.png`
        });
        done();
      }
    });
  };
  server = app.listen(0, "127.0.0.1");
  await new Promise((resolve, reject) => {
    server.once("listening", resolve);
    server.once("error", reject);
  });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  if (server) await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  cloudinary.uploader.upload_stream = originalUploadStream;
});

async function uploadImage(bytes, mimeType = "image/png", filename = "photo.png", token = jwt.sign({ role: "admin" }, jwtSecret)) {
  const form = new FormData();
  form.append("image", new Blob([bytes], { type: mimeType }), filename);
  return fetch(`${baseUrl}/api/admin/images`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}` },
    body: form
  });
}

function runAdminAuth(authorization) {
  return new Promise(resolve => {
    const req = { headers: authorization ? { authorization } : {} };
    const res = {
      statusCode: 200,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(body) {
        resolve({ status: this.statusCode, body });
      }
    };
    adminAuth(req, res, () => resolve({ status: 200, role: req.admin.role }));
  });
}

test("accepts valid admin credentials and issues an eight-hour admin token", async () => {
  const response = await fetch(`${baseUrl}/api/admin/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: adminEmail, password: adminPassword })
  });
  const body = await response.json();

  assert.equal(response.status, 200);
  const payload = jwt.verify(body.token, jwtSecret);
  assert.equal(payload.role, "admin");
  assert.equal(payload.email, adminEmail);
  assert.equal(payload.exp - payload.iat, 8 * 60 * 60);
  assert.deepEqual(await runAdminAuth(`Bearer ${body.token}`), { status: 200, role: "admin" });
});

test("rejects invalid admin credentials without returning authentication data", async () => {
  const response = await fetch(`${baseUrl}/api/admin/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: adminEmail, password: "incorrect" })
  });
  const body = await response.json();

  assert.equal(response.status, 401);
  assert.deepEqual(body, { message: "Email or password is incorrect." });
  assert.equal("token" in body, false);
});

test("rejects expired tokens on protected admin routes", async () => {
  const expiredToken = jwt.sign({ role: "admin" }, jwtSecret, { expiresIn: -1 });
  const response = await runAdminAuth(`Bearer ${expiredToken}`);

  assert.equal(response.status, 401);
  assert.deepEqual(response.body, { message: "Session expired. Please sign in again." });
});

test("rejects requests without valid admin authorization", async () => {
  const responses = await Promise.all([
    runAdminAuth(),
    runAdminAuth(jwt.sign({ role: "admin" }, jwtSecret)),
    runAdminAuth("Bearer invalid-token"),
    runAdminAuth(`Bearer ${jwt.sign({ role: "user" }, jwtSecret)}`)
  ]);

  assert.deepEqual(responses.map(response => response.status), [401, 401, 401, 403]);
});

test("protects every admin API route against missing, invalid, expired, and non-admin tokens", async () => {
  const expiredToken = jwt.sign({ role: "admin" }, jwtSecret, { expiresIn: -1 });
  const nonAdminToken = jwt.sign({ role: "user" }, jwtSecret);
  const cases = [
    ["missing", undefined, 401],
    ["malformed", "Bearer invalid.token.value", 401],
    ["expired", `Bearer ${expiredToken}`, 401],
    ["non-admin", `Bearer ${nonAdminToken}`, 403]
  ];
  const routes = [
    ["GET", "/api/admin/enquiries"],
    ["PUT", "/api/admin/enquiries/test-id"],
    ["POST", "/api/admin/images"],
    ["POST", "/api/admin/courses"],
    ["PUT", "/api/admin/contact"],
    ["PUT", "/api/admin/courses/test-id"],
    ["DELETE", "/api/admin/courses/test-id"]
  ];

  for (const [name, authorization, expectedStatus] of cases) {
    for (const [method, route] of routes) {
      const headers = authorization ? { authorization } : {};
      if (route !== "/api/admin/images" && method !== "GET" && method !== "DELETE") {
        headers["content-type"] = "application/json";
      }
      const response = await fetch(`${baseUrl}${route}`, {
        method,
        headers,
        ...(headers["content-type"] ? { body: "{}" } : {})
      });
      assert.equal(response.status, expectedStatus, `${name} token should be rejected for ${method} ${route}`);
    }
  }
});

test("requires bcrypt credentials and a strong JWT secret in configuration", () => {
  assert.deepEqual(validateAdminConfiguration({
    ADMIN_EMAIL: "admin@example.test",
    ADMIN_PASSWORD_HASH: "plaintext",
    JWT_SECRET: "short"
  }), [
    "ADMIN_PASSWORD_HASH must be a bcrypt hash with a cost of at least 10.",
    "JWT_SECRET must be at least 32 characters."
  ]);
});

test("requires admin authentication before accepting image uploads", async () => {
  const response = await uploadImage(Buffer.from("not an image"), "image/png", "file.png", "");

  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), { message: "Admin sign-in required." });
});

test("stores validated image uploads in Cloudinary and returns permanent HTTPS URLs", async () => {
  const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p6sAAAAASUVORK5CYII=", "base64");
  const response = await uploadImage(png, "image/png", "../../faculty-photo.png");
  const result = await response.json();

  assert.equal(response.status, 201);
  assert.equal(result.image, "https://res.cloudinary.com/astrratech-test/image/upload/v1/astratech-academy/image-1.png");
});

test("rejects signature/MIME mismatches and unsanitized SVG uploads", async () => {
  const spoofed = await uploadImage(Buffer.from("this is not a png"), "image/png", "portrait.png");
  assert.equal(spoofed.status, 400);
  assert.match((await spoofed.json()).message, /invalid image/i);

  const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');
  const svgResponse = await uploadImage(svg, "image/svg+xml", "image.svg");
  assert.equal(svgResponse.status, 400);
  assert.match((await svgResponse.json()).message, /invalid image/i);
});

test("rejects uploads larger than the configured limit", async () => {
  const oversizedImage = Buffer.alloc(MAX_IMAGE_SIZE + 1);
  const response = await uploadImage(oversizedImage, "image/png", "large.png");

  assert.equal(response.status, 413);
  assert.deepEqual(await response.json(), { message: "Image must be 5 MB or smaller." });
});

test("rejects valid image uploads when Cloudinary credentials are missing", async () => {
  const cloudinaryValues = ["CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET"]
    .map(key => [key, process.env[key]]);
  for (const [key] of cloudinaryValues) delete process.env[key];

  try {
    const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p6sAAAAASUVORK5CYII=", "base64");
    const response = await uploadImage(png);
    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), { message: "Cloudinary image storage is not configured." });
  } finally {
    for (const [key, value] of cloudinaryValues) process.env[key] = value;
  }
});

test("persists Cloudinary URLs on create, edit, removal, and public content refresh", async () => {
  const Faculty = mongoose.model("Faculty");
  const originalCreate = Faculty.create;
  const originalFindByIdAndUpdate = Faculty.findByIdAndUpdate;
  const originalFind = Faculty.find;
  let storedFaculty;
  Faculty.create = async item => (storedFaculty = { ...item, _id: "faculty-cloudinary-test" });
  Faculty.findByIdAndUpdate = async (_id, update) => (storedFaculty = { ...storedFaculty, ...update });
  Faculty.find = () => ({
    sort: () => ({
      lean: async () => [storedFaculty]
    })
  });


  try {
    const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p6sAAAAASUVORK5CYII=", "base64");
    const initialUpload = await uploadImage(png);
    const initialImage = (await initialUpload.json()).image;
    const token = jwt.sign({ role: "admin" }, jwtSecret);
    const createdResponse = await fetch(`${baseUrl}/api/admin/faculty`, {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify({
        title: "Science Educator",
        name: "Asha Rao",
        role: "Science Educator",
        qualification: "M.Sc. Physics",
        description: "Connects concepts with practical examples.",
        image: initialImage
      })
    });
    assert.equal(createdResponse.status, 201);
    assert.equal((await createdResponse.json()).image, initialImage);

    const replacementUpload = await uploadImage(png);
    const replacementImage = (await replacementUpload.json()).image;
    const updatedResponse = await fetch(`${baseUrl}/api/admin/faculty/faculty-cloudinary-test`, {
      method: "PUT",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify({ image: replacementImage })
    });
    assert.equal(updatedResponse.status, 200);
    assert.equal((await updatedResponse.json()).image, replacementImage);

    const refreshedResponse = await fetch(`${baseUrl}/api/content/faculty`);
    assert.equal(refreshedResponse.status, 200);
    assert.equal((await refreshedResponse.json())[0].image, replacementImage);

    const removedResponse = await fetch(`${baseUrl}/api/admin/faculty/faculty-cloudinary-test`, {
      method: "PUT",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify({ image: "" })
    });
    assert.equal(removedResponse.status, 200);
    assert.equal((await removedResponse.json()).image, "");
  } finally {
    Faculty.create = originalCreate;
    Faculty.findByIdAndUpdate = originalFindByIdAndUpdate;
    Faculty.find = originalFind;
  }
});

test("loads and saves public contact settings with admin authentication and validation", async () => {
  const ContactSettings = mongoose.model("ContactSettings");
  const originalFindById = ContactSettings.findById;
  const originalFindByIdAndUpdate = ContactSettings.findByIdAndUpdate;
  const token = jwt.sign({ role: "admin" }, jwtSecret);
  let storedSettings = null;

  ContactSettings.findById = id => ({
    lean: async () => id === "contact" ? storedSettings : null
  });
  ContactSettings.findByIdAndUpdate = (id, update, options) => {
    assert.equal(id, "contact");
    assert.equal(options.upsert, true);
    return {
      lean: async () => {
        storedSettings = { _id: id, ...update.$set };
        return storedSettings;
      }
    };
  };

  try {
    const defaultsResponse = await fetch(`${baseUrl}/api/content/contact`);
    assert.equal(defaultsResponse.status, 200);
    assert.deepEqual(await defaultsResponse.json(), DEFAULT_CONTACT_SETTINGS);

    const unauthorizedResponse = await fetch(`${baseUrl}/api/admin/contact`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(DEFAULT_CONTACT_SETTINGS)
    });
    assert.equal(unauthorizedResponse.status, 401);

    const invalidResponse = await fetch(`${baseUrl}/api/admin/contact`, {
      method: "PUT",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify({ ...DEFAULT_CONTACT_SETTINGS, mapUrl: "http://example.test/map" })
    });
    assert.equal(invalidResponse.status, 400);

    const updatedSettings = {
      ...DEFAULT_CONTACT_SETTINGS,
      heading: "Talk with our team",
      phone: "+91 98765 43210",
      email: "team@example.test",
      address: "12 Learning Road, Pune",
      officeHours: "Weekdays, 9 AM–5 PM",
      mapUrl: "https://www.google.com/maps/embed?query=Pune"
    };
    const updateResponse = await fetch(`${baseUrl}/api/admin/contact`, {
      method: "PUT",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify(updatedSettings)
    });
    assert.equal(updateResponse.status, 200);
    assert.deepEqual(await updateResponse.json(), updatedSettings);

    const publicResponse = await fetch(`${baseUrl}/api/content/contact`);
    assert.equal(publicResponse.status, 200);
    assert.deepEqual(await publicResponse.json(), updatedSettings);
  } finally {
    ContactSettings.findById = originalFindById;
    ContactSettings.findByIdAndUpdate = originalFindByIdAndUpdate;
  }
});
