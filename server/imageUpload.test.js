import test from "node:test";
import assert from "node:assert/strict";
import { getValidatedImageType } from "./imageUpload.js";

const supportedSignatures = [
  ["image/jpeg", "jpg", Buffer.from([0xff, 0xd8, 0xff, 0x00])],
  ["image/png", "png", Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])],
  ["image/webp", "webp", Buffer.from("RIFF0000WEBP")],
  ["image/gif", "gif", Buffer.from("GIF89a")],
  ["image/bmp", "bmp", Buffer.from("BM")],
  ["image/avif", "avif", Buffer.from("0000ftypavif")]
];

test("recognizes supported image signatures and derives safe extensions", () => {
  for (const [mimetype, extension, buffer] of supportedSignatures) {
    assert.equal(getValidatedImageType({ mimetype, buffer }).extension, extension);
  }
});

test("rejects image MIME types that do not match their file signatures", () => {
  for (const [mimetype, , buffer] of supportedSignatures) {
    const differentMime = mimetype === "image/png" ? "image/jpeg" : "image/png";
    assert.throws(() => getValidatedImageType({ mimetype: differentMime, buffer }), /Unsupported or invalid image/);
  }
  assert.throws(
    () => getValidatedImageType({ mimetype: "image/svg+xml", buffer: Buffer.from("<svg/>") }),
    /Unsupported or invalid image/
  );
});
