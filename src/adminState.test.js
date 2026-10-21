import test from "node:test";
import assert from "node:assert/strict";
import { ADMIN_ENTRY_PATH, ADMIN_OVERVIEW_SECTIONS, ADMIN_SECTIONS, DEFAULT_ADMIN_SECTION, beginAdminLoginEntry, buildAdminEditForm, buildAdminPayload, extractSavedRecord, getAdminDataPath, getAdminEntrySession, getAdminSection, getAdminSession, isAdminEntryPath, isAdminSessionInvalid, isKnownAdminPath, replaceAdminRecord, validateContactSettings } from "./adminState.js";
import { DEFAULT_CONTACT_SETTINGS } from "../shared/contactSettings.js";

test("maps the Overview dashboard to supported content and enquiries APIs only", () => {
  assert.deepEqual(ADMIN_OVERVIEW_SECTIONS, [
    "courses", "faculty", "results", "testimonials", "notices", "resources", "enquiries"
  ]);
  assert.deepEqual(ADMIN_OVERVIEW_SECTIONS.map(getAdminDataPath), [
    "/content/courses",
    "/content/faculty",
    "/content/results",
    "/content/testimonials",
    "/content/notices",
    "/content/resources",
    "/admin/enquiries"
  ]);
  assert.equal(getAdminDataPath("contact"), "/content/contact");
  assert.throws(() => getAdminDataPath("overview"), /Unsupported admin data section/);
});

test("validates contact settings and HTTPS map URLs", () => {
  assert.deepEqual(validateContactSettings(DEFAULT_CONTACT_SETTINGS), DEFAULT_CONTACT_SETTINGS);
  assert.throws(() => validateContactSettings({ ...DEFAULT_CONTACT_SETTINGS, email: "not-an-email" }), /valid email/);
  assert.throws(() => validateContactSettings({ ...DEFAULT_CONTACT_SETTINGS, mapUrl: "http://example.test/map" }), /HTTPS/);
  assert.throws(() => validateContactSettings({ ...DEFAULT_CONTACT_SETTINGS, extra: "unsupported" }), /unsupported fields/);
});

test("restores every admin section from its URL query parameter", () => {
  for (const section of ADMIN_SECTIONS) {
    assert.equal(getAdminSection(`?section=${encodeURIComponent(section)}`), section);
  }
});

test("defaults safely for a direct admin URL or an invalid saved section", () => {
  assert.equal(getAdminSection(""), DEFAULT_ADMIN_SECTION);
  assert.equal(getAdminSection("?section=invalid"), DEFAULT_ADMIN_SECTION);
  assert.equal(getAdminSection("?section="), DEFAULT_ADMIN_SECTION);
});

test("only recognizes the deliberate staff entry URL and its supported subsections", () => {
  assert.equal(ADMIN_ENTRY_PATH, "/staff-access");
  for (const section of ADMIN_SECTIONS) {
    const path = `/staff-access/${section}`;
    assert.equal(isAdminEntryPath(path), true);
    assert.equal(isKnownAdminPath(path), true);
    assert.equal(getAdminSection("", path), section);
  }
  for (const path of ["/admin", "/admin/", "/admin/login", "/admin/contact", "/admin/enquiries", "/admin/nested/path"]) {
    assert.equal(isAdminEntryPath(path), false);
    assert.equal(isKnownAdminPath(path), false);
  }
  assert.equal(isAdminEntryPath("/staff-access"), true);
  assert.equal(isAdminEntryPath("/staff-access/unknown"), true);
  assert.equal(isAdminEntryPath("/administrator"), false);
  assert.equal(isKnownAdminPath("/staff-access"), true);
  assert.equal(isKnownAdminPath("/staff-access/unknown"), false);
  assert.equal(isKnownAdminPath("/does-not-exist"), false);
  assert.equal(getAdminSection("?section=enquiries", "/staff-access/courses"), "enquiries");
});

test("direct /admin URLs never resolve to the admin login or panel, regardless of saved session", () => {
  const adminUrls = ["/admin", "/admin/", "/admin/login", "/admin/contact", "/admin/enquiries", "/admin/nested/section"];
  for (const hasSavedSession of [false, true]) {
    for (const path of adminUrls) {
      assert.equal(isAdminEntryPath(path), false, `admin entry must stay hidden at ${path} with session=${hasSavedSession}`);
      assert.equal(isKnownAdminPath(path), false, `admin UI must not render at ${path} with session=${hasSavedSession}`);
    }
  }

  for (const path of ["/", "/faculty", "/courses", "/contact", "/resources", "/notices"]) {
    assert.equal(isAdminEntryPath(path), false);
    assert.equal(isKnownAdminPath(path), false);
  }
});

test("restores an existing admin session from local storage on refresh", () => {
  const token = "valid.saved.admin.token";

  assert.equal(getAdminSession(token), token);
  assert.equal(getAdminSession(null), "");
  assert.equal(getAdminSession(""), "");
});

test("footer Admin Login entry always starts with the login form for every saved-token state", () => {
  const tokens = [
    ["valid saved JWT", "header.payload.valid-signature"],
    ["expired JWT", "header.payload.expired-signature"],
    ["no token", null]
  ];

  for (const [label, token] of tokens) {
    const values = new Map(token ? [["astratech_admin_token", token]] : []);
    const storage = {
      getItem: key => values.get(key) ?? null,
      removeItem: key => values.delete(key)
    };
    beginAdminLoginEntry(storage);

    assert.equal(getAdminEntrySession(storage, ADMIN_ENTRY_PATH), "", `${label} must show login first`);
    assert.equal(storage.getItem("astratech_admin_token"), null);
  }
});

test("refreshing a valid nested admin section preserves the saved session", () => {
  const values = new Map([["astratech_admin_token", "valid.saved.admin.token"]]);
  const storage = {
    getItem: key => values.get(key) ?? null,
    removeItem: key => values.delete(key)
  };

  assert.equal(getAdminEntrySession(storage, `${ADMIN_ENTRY_PATH}/contact`), "valid.saved.admin.token");
});

test("expires restored sessions only when a protected API rejects their credentials", () => {
  assert.equal(isAdminSessionInvalid(401), true);
  assert.equal(isAdminSessionInvalid(403), true);
  assert.equal(isAdminSessionInvalid(500), false);
  assert.equal(isAdminSessionInvalid(undefined), false);
});

test("maps Faculty role and biography to the required content fields", () => {
  const form = {
    name: "Asha Rao",
    role: "Science Educator",
    qualification: "M.Sc. Physics · 7 years",
    image: "https://example.test/asha.jpg",
    description: "Connects science concepts with practical examples.",
    featured: true
  };

  assert.deepEqual(buildAdminPayload("faculty", form), {
    ...form,
    title: "Science Educator"
  });
  assert.equal(form.title, undefined);
});

test("does not fabricate a Faculty title or biography when either is blank", () => {
  assert.throws(
    () => buildAdminPayload("faculty", { role: " ", description: "A real biography." }),
    /Faculty role and biography are required/
  );
  assert.throws(
    () => buildAdminPayload("faculty", { role: "Science Educator", description: " " }),
    /Faculty role and biography are required/
  );
});

test("maps Results learner label and supplied details to required content fields", () => {
  const form = {
    name: "Aarav M.",
    role: "Mathematics programme",
    year: "2026",
    score: "92%",
    featured: true
  };

  assert.deepEqual(buildAdminPayload("results", form), {
    ...form,
    title: "Aarav M.",
    description: "Programme/role: Mathematics programme. Score/achievement: 92%. Year: 2026."
  });
  assert.equal(form.title, undefined);
  assert.equal(form.description, undefined);
});

test("does not fabricate required Results content when learner details are blank", () => {
  for (const form of [
    { name: " ", role: "Mathematics programme", score: "92%" },
    { name: "Aarav M.", role: " ", score: "92%" },
    { name: "Aarav M.", role: "Mathematics programme", score: " " }
  ]) {
    assert.throws(
      () => buildAdminPayload("results", form),
      /Results learner label, programme\/role, and score\/achievement are required/
    );
  }
});

test("replaces an edited Result with its saved title and description", () => {
  const original = {
    _id: "result-1",
    title: "Old learner",
    name: "Old learner",
    role: "Science programme",
    score: "80%",
    description: "Programme/role: Science programme. Score/achievement: 80%."
  };
  const saved = {
    ...original,
    title: "New learner",
    name: "New learner",
    role: "Mathematics programme",
    score: "95%",
    description: "Programme/role: Mathematics programme. Score/achievement: 95%."
  };

  assert.deepEqual(replaceAdminRecord([original], saved), [saved]);
});

test("maps testimonial display name and actual quote to required content fields", () => {
  const form = {
    name: "Samira K.",
    role: "Parent",
    quote: "The supportive lessons helped my child grow in confidence.",
    featured: true
  };

  assert.deepEqual(buildAdminPayload("testimonials", form), {
    ...form,
    title: "Samira K.",
    description: "The supportive lessons helped my child grow in confidence."
  });
  assert.equal(form.title, undefined);
  assert.equal(form.description, undefined);
});

test("rejects blank or oversized testimonial names and quotes", () => {
  for (const form of [
    { name: " ", quote: "A real quote." },
    { name: "Samira K.", quote: " " },
    { name: "x".repeat(141), quote: "A real quote." },
    { name: "Samira K.", quote: "x".repeat(1201) }
  ]) {
    assert.throws(
      () => buildAdminPayload("testimonials", form),
      /Testimonial display name and quote are required|Testimonial display name or quote is too long/
    );
  }
});

test("loads current and legacy testimonial fields for editing", () => {
  const defaults = { name: "", role: "", quote: "", featured: false };
  assert.deepEqual(buildAdminEditForm("testimonials", {
    title: "Legacy display name",
    description: "Legacy testimonial quote.",
    role: "Student",
    featured: true
  }, defaults), {
    name: "Legacy display name",
    role: "Student",
    quote: "Legacy testimonial quote.",
    featured: true
  });
  assert.deepEqual(buildAdminEditForm("testimonials", {
    name: "Current name",
    title: "Current name",
    quote: "Current quote.",
    description: "Current quote."
  }, defaults), {
    name: "Current name",
    role: "",
    quote: "Current quote.",
    featured: false
  });
});

test("replaces an edited testimonial in the admin list", () => {
  const saved = {
    _id: "testimonial-1",
    title: "Updated learner",
    name: "Updated learner",
    role: "Student",
    quote: "The updated quote.",
    description: "The updated quote.",
    featured: true
  };
  assert.deepEqual(replaceAdminRecord([{ _id: saved._id, title: "Old learner" }], saved), [saved]);
});

test("extracts the saved record from direct and wrapped API responses", () => {
  const record = { _id: "record-1", title: "Saved" };

  assert.equal(extractSavedRecord(record), record);
  assert.equal(extractSavedRecord({ item: record }), record);
  assert.equal(extractSavedRecord({ data: { item: record } }), record);
  assert.equal(extractSavedRecord({ data: record }), record);
  assert.throws(() => extractSavedRecord({ message: "Saved" }), /did not include the saved record/);
});

test("replaces an edited admin record by ID without adding a duplicate", () => {
  const original = { _id: "faculty-1", name: "Old name" };
  const other = { _id: "faculty-2", name: "Other faculty" };
  const duplicate = { _id: "faculty-1", name: "Older duplicate" };
  const updated = {
    _id: "faculty-1",
    name: "Updated name",
    role: "Updated role",
    qualification: "Updated qualification",
    image: "https://example.test/faculty.jpg",
    featured: true
  };

  const result = replaceAdminRecord([original, other, duplicate], { data: { item: updated } });

  assert.deepEqual(result, [updated, other]);
  assert.equal(result.filter(record => record._id === original._id).length, 1);
});

test("adds the returned record if it is missing from the current admin list", () => {
  const updated = { _id: "faculty-1", name: "Updated name" };

  assert.deepEqual(replaceAdminRecord([], updated), [updated]);
});
