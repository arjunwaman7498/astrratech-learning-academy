import { useEffect, useState } from "react";
import { ArrowUpRight, LoaderCircle } from "lucide-react";
import { api } from "./api";
import { DEFAULT_CONTACT_SETTINGS } from "../shared/contactSettings";

export default function ContactSettingsEditor({ contact, loading, loaded, loadError, onRefresh, onSaved }) {
  const [form, setForm] = useState(contact);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    setForm(contact);
  }, [contact]);

  function update(field, value) {
    setForm(current => ({ ...current, [field]: value }));
    setFeedback(null);
  }

  async function save(event) {
    event.preventDefault();
    setBusy(true);
    setFeedback(null);
    try {
      const saved = await api("/admin/contact", {
        method: "PUT",
        body: JSON.stringify(form)
      });
      onSaved(saved);
      setFeedback({ type: "success", message: "Get in Touch settings saved." });
    } catch (error) {
      setFeedback({ type: "error", message: error.message });
    } finally {
      setBusy(false);
    }
  }

  return <div className="admin-workspace">
    <section className="admin-edit-card">
      <div className="admin-card-heading">
        <div><span className="eyebrow"><span/> PUBLIC WEBSITE</span><h2>Edit Get in Touch</h2></div>
      </div>
      <p className="body-copy">These details appear on the public contact page and in the website footer.</p>
      {loading ? <p className="form-status" role="status">Loading saved contact details…</p> :
        !loaded ? <div><p className="form-status" role="alert">{loadError || "Saved contact details could not be loaded."}</p><button type="button" className="plain-button" onClick={onRefresh}>Retry loading</button></div> :
        <form className="admin-content-form" onSubmit={save}>
          <label>Section heading *
            <input required maxLength="120" value={form.heading ?? DEFAULT_CONTACT_SETTINGS.heading}
              onChange={event => update("heading", event.target.value)}/>
          </label>
          <label>Subtitle / description *
            <textarea required rows="3" maxLength="500" value={form.description || ""}
              onChange={event => update("description", event.target.value)}/>
          </label>
          <div className="form-two">
            <label>Phone number
              <input type="tel" maxLength="30" value={form.phone || ""}
                onChange={event => update("phone", event.target.value)}/>
            </label>
            <label>Email address
              <input type="email" maxLength="160" value={form.email || ""}
                onChange={event => update("email", event.target.value)}/>
            </label>
          </div>
          <label>Full address *
            <textarea required rows="2" maxLength="300" value={form.address || ""}
              onChange={event => update("address", event.target.value)}/>
          </label>
          <label>Office hours
            <input maxLength="200" value={form.officeHours || ""}
              onChange={event => update("officeHours", event.target.value)}/>
          </label>
          <label>Map / embed URL (HTTPS)
            <input type="url" pattern="https://.*" maxLength="2000" placeholder="https://www.google.com/maps/embed?..."
              value={form.mapUrl || ""} onChange={event => update("mapUrl", event.target.value)}/>
          </label>
          <button className="btn btn-dark submit-btn" disabled={busy}>
            {busy ? <><LoaderCircle className="spin"/> Saving…</> : <>Save changes <ArrowUpRight size={16}/></>}
          </button>
          {feedback && <p className={`form-status ${feedback.type}`} role={feedback.type === "error" ? "alert" : "status"}>{feedback.message}</p>}
        </form>}
    </section>
  </div>;
}
