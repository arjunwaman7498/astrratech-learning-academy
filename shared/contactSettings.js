export const DEFAULT_CONTACT_SETTINGS = {
  heading: "We’re here to help you begin.",
  description: "Share a few details and a course you’re interested in. The current contact details below are placeholders.",
  phone: "+91 00000 00000",
  email: "hello@example.com",
  address: "Sample address, Pune, India",
  officeHours: "Monday–Saturday, 9:00 AM–6:00 PM",
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
  if (!values.address || values.address.length > 300) {
    throw new Error("Address is required and must be at most 300 characters.");
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
