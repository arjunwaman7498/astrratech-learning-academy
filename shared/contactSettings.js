export const DEFAULT_CONTACT_SETTINGS = {
  heading: "Get in touch",
  description: "Send us an enquiry to learn more about our programmes.",
  phone: "",
  email: "",
  address: "",
  officeHours: "",
  mapUrl: ""
};

export function validateContactSettings(settings) {
  const fields = Object.keys(DEFAULT_CONTACT_SETTINGS);
  if (!settings || typeof settings !== "object" || Array.isArray(settings) ||
      Object.keys(settings).some(key => !fields.includes(key))) {
    throw new Error("Contact settings contain unsupported fields.");
  }
  const values = {};
  for (const field of fields) {
    if (typeof settings[field] !== "string") {
      throw new Error(`Contact ${field} must be text.`);
    }
    values[field] = settings[field].trim();
  }
  if (!values.heading || values.heading.length > 120) {
    throw new Error("Heading is required and must be at most 120 characters.");
  }
  if (!values.description || values.description.length > 500) {
    throw new Error("Description is required and must be at most 500 characters.");
  }
  if (values.phone.length > 30 ||
      (values.phone && !/^(?=(?:\D*\d){7,})[0-9+().\s-]+$/.test(values.phone))) {
    throw new Error("Enter a valid phone number of at most 30 characters.");
  }
  if (values.email.length > 160 ||
      (values.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email))) {
    throw new Error("Enter a valid email address of at most 160 characters.");
  }
  if (values.address.length > 300) {
    throw new Error("Address must be at most 300 characters.");
  }
  if (values.officeHours.length > 200) {
    throw new Error("Office hours must be at most 200 characters.");
  }
  if (values.mapUrl.length > 2000) {
    throw new Error("Map URL must be at most 2000 characters.");
  }
  if (values.mapUrl) {
    try {
      if (new URL(values.mapUrl).protocol !== "https:") throw new Error();
    } catch {
      throw new Error("Map URL must be a valid HTTPS URL.");
    }
  }
  return values;
}
