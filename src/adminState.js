export const ADMIN_SECTIONS = [
  "overview",
  "contact",
  "courses",
  "faculty",
  "results",
  "testimonials",
  "notices",
  "resources",
  "enquiries"
];

export const DEFAULT_ADMIN_SECTION = "courses";
export const ADMIN_ENTRY_PATH = "/staff-access";
export const ADMIN_OVERVIEW_SECTIONS = ADMIN_SECTIONS.filter(section => !["overview", "contact"].includes(section));

export function isAdminEntryPath(pathname) {
  return pathname === ADMIN_ENTRY_PATH || pathname.startsWith(`${ADMIN_ENTRY_PATH}/`);
}

export function isKnownAdminPath(pathname) {
  if (pathname === ADMIN_ENTRY_PATH || pathname === `${ADMIN_ENTRY_PATH}/`) return true;
  if (!pathname.startsWith(`${ADMIN_ENTRY_PATH}/`)) return false;

  const section = pathname.slice(`${ADMIN_ENTRY_PATH}/`.length).replace(/\/+$/, "");
  return ADMIN_SECTIONS.includes(section);
}

export function getAdminDataPath(section) {
  if (section === "enquiries") return "/admin/enquiries";
  if (section === "contact") return "/content/contact";
  if (ADMIN_OVERVIEW_SECTIONS.includes(section)) return `/content/${section}`;
  throw new Error(`Unsupported admin data section: ${section}`);
}

export function getAdminSection(search, pathname = "") {
  const value = new URLSearchParams(search).get("section");
  if (value !== null) return ADMIN_SECTIONS.includes(value) ? value : DEFAULT_ADMIN_SECTION;
  if (pathname.startsWith(`${ADMIN_ENTRY_PATH}/`)) {
    const pathSection = pathname.slice(`${ADMIN_ENTRY_PATH}/`.length).replace(/\/+$/, "");
    if (ADMIN_SECTIONS.includes(pathSection)) return pathSection;
  }
  return DEFAULT_ADMIN_SECTION;
}

export function getAdminSession(token) {
  return typeof token === "string" && token.trim() ? token : "";
}

export function beginAdminLoginEntry(storage) {
  storage.removeItem("astratech_admin_token");
}

export function getAdminEntrySession(storage, pathname) {
  if (pathname === ADMIN_ENTRY_PATH || pathname === `${ADMIN_ENTRY_PATH}/`) {
    beginAdminLoginEntry(storage);
    return "";
  }
  return getAdminSession(storage.getItem("astratech_admin_token"));
}

export function isAdminSessionInvalid(status) {
  return status === 401 || status === 403;
}

export function extractSavedRecord(response) {
  const record = response?.item ?? response?.data?.item ?? response?.data ?? response;
  if (!record || typeof record !== "object" || Array.isArray(record) || record._id == null) {
    throw new Error("The server response did not include the saved record.");
  }
  return record;
}

export function replaceAdminRecord(records, updatedRecord) {
  updatedRecord = extractSavedRecord(updatedRecord);
  const updatedId = String(updatedRecord._id);
  let replaced = false;
  const nextRecords = [];

  for (const record of records) {
    if (String(record._id) !== updatedId) {
      nextRecords.push(record);
    } else if (!replaced) {
      nextRecords.push(updatedRecord);
      replaced = true;
    }
  }

  if (!replaced) nextRecords.unshift(updatedRecord);
  return nextRecords;
}

export function buildAdminEditForm(section, item, currentForm) {
  return Object.fromEntries(Object.keys(currentForm).map(key => {
    if (key === "name" && ["results", "testimonials"].includes(section)) {
      return [key, item.name ?? item.title ?? ""];
    }
    if (key === "quote" && section === "testimonials") {
      return [key, item.quote ?? item.description ?? ""];
    }
    return [key, item[key] ?? (key === "featured" ? false : "")];
  }));
}

export function buildAdminPayload(section, form) {
  if (section === "results") {
    const title = typeof form.name === "string" ? form.name.trim() : "";
    const role = typeof form.role === "string" ? form.role.trim() : "";
    const score = typeof form.score === "string" ? form.score.trim() : "";
    const year = typeof form.year === "string" ? form.year.trim() : "";
    if (!title || !role || !score) {
      throw new Error("Results learner label, programme/role, and score/achievement are required.");
    }
    if (title.length > 140 || role.length > 500 || score.length > 500 || year.length > 20) {
      throw new Error("One or more Results fields are too long.");
    }

    const description = [
      `Programme/role: ${role}.`,
      `Score/achievement: ${score}.`,
      year ? `Year: ${year}.` : ""
    ].filter(Boolean).join(" ");

    return { ...form, title, description };
  }

  if (section === "testimonials") {
    const title = typeof form.name === "string" ? form.name.trim() : "";
    const quote = typeof form.quote === "string" ? form.quote.trim() : "";
    if (!title || !quote) {
      throw new Error("Testimonial display name and quote are required.");
    }
    if (title.length > 140 || quote.length > 1200) {
      throw new Error("Testimonial display name or quote is too long.");
    }

    return { ...form, title, description: quote };
  }

  if (section !== "faculty") return form;

  const title = typeof form.role === "string" ? form.role.trim() : "";
  const description = typeof form.description === "string" ? form.description.trim() : "";
  if (!title || !description) {
    throw new Error("Faculty role and biography are required.");
  }

  return { ...form, title, description };
}
import { validateContactSettings } from "../shared/contactSettings.js";

export { validateContactSettings };
