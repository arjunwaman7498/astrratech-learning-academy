import React, { useMemo, useState } from "react";
import { Mail, Phone, Search } from "lucide-react";
import { api } from "./api";
import "./enquiryInbox.css";

const statuses = ["New", "Contacted", "Follow-up", "Admitted", "Not Interested"];
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function toLocalDateTime(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

export default function EnquiryInbox({ enquiries, loading, onRefresh, onUpdated }) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All statuses");
  const [courseFilter, setCourseFilter] = useState("All courses");
  const [openId, setOpenId] = useState("");
  const [status, setStatus] = useState("New");
  const [followUpAt, setFollowUpAt] = useState("");
  const [internalNotes, setInternalNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");

  const courses = useMemo(
    () => [...new Set(enquiries.map(enquiry => enquiry.course).filter(Boolean))].sort(),
    [enquiries]
  );
  const filtered = useMemo(() => {
    const search = query.trim().toLowerCase();
    return enquiries.filter(enquiry => {
      const enquiryStatus = enquiry.status || "New";
      const matchesStatus = statusFilter === "All statuses" || enquiryStatus === statusFilter;
      const matchesCourse = courseFilter === "All courses" || enquiry.course === courseFilter;
      const matchesQuery = !search || [
        enquiry.name, enquiry.phone, enquiry.email, enquiry.course, enquiry.message
      ].some(value => String(value || "").toLowerCase().includes(search));
      return matchesStatus && matchesCourse && matchesQuery;
    });
  }, [enquiries, query, statusFilter, courseFilter]);

  function openDetails(enquiry) {
    setOpenId(enquiry._id);
    setStatus(enquiry.status || "New");
    setFollowUpAt(toLocalDateTime(enquiry.followUpAt));
    setInternalNotes(enquiry.internalNotes || "");
    setFeedback("");
    setError("");
  }

  async function save(enquiry) {
    setSaving(true);
    setFeedback("");
    setError("");
    try {
      const saved = await api(`/admin/enquiries/${enquiry._id}`, {
        method: "PUT",
        body: JSON.stringify({
          status,
          followUpAt: followUpAt ? new Date(followUpAt).toISOString() : null,
          internalNotes
        })
      });
      onUpdated(saved);
      setFeedback("Enquiry updated.");
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSaving(false);
    }
  }

  return <section className="admin-list-card enquiries-card">
    <div className="admin-card-heading">
      <div><span className="eyebrow"><span/> ENQUIRY INBOX</span><h2>{enquiries.length} enquiries</h2></div>
      <button type="button" className="icon-button" onClick={onRefresh} aria-label="Refresh Enquiries" disabled={loading} aria-busy={loading}>
        {loading ? "…" : "↻"}
      </button>
    </div>
    <div className="enquiry-filters">
      <label className="enquiry-search"><span className="sr-only">Search enquiries</span><Search size={15}/><input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search name, contact, course…"/></label>
      <label><span className="sr-only">Filter by status</span><select value={statusFilter} onChange={event => setStatusFilter(event.target.value)}><option>All statuses</option>{statuses.map(value => <option key={value}>{value}</option>)}</select></label>
      <label><span className="sr-only">Filter by course</span><select value={courseFilter} onChange={event => setCourseFilter(event.target.value)}><option>All courses</option>{courses.map(value => <option key={value}>{value}</option>)}</select></label>
    </div>
    {loading && enquiries.length === 0 ? <p className="empty-state">Loading enquiries…</p> :
      filtered.length === 0 ? <p className="empty-state">{enquiries.length ? "No enquiries match these filters." : "No enquiries received yet."}</p> :
        <div className="enquiry-list">{filtered.map(enquiry => {
          const enquiryStatus = statuses.includes(enquiry.status) ? enquiry.status : "New";
          const phoneHref = String(enquiry.phone || "").replace(/[^\d+]/g, "");
          const validPhone = (phoneHref.match(/\d/g) || []).length >= 7;
          const validEmail = emailPattern.test(enquiry.email || "");
          const isOpen = openId === enquiry._id;
          return <article className="enquiry-entry enquiry-card" key={enquiry._id}>
            <div className="enquiry-card-header">
              <div><strong>{enquiry.name}</strong><small>{enquiry.course} · {new Date(enquiry.createdAt).toLocaleString()}</small></div>
              <span className={`enquiry-status status-${enquiryStatus.toLowerCase().replace(/[^a-z]+/g, "-")}`}>{enquiryStatus}</span>
            </div>
            <p className="enquiry-message-preview">{enquiry.message || "No message provided."}</p>
            <div className="enquiry-contact-actions">
              <span>{enquiry.phone}</span>
              {validPhone && <a href={`tel:${phoneHref}`}><Phone size={14}/> Call</a>}
              {validEmail && <a href={`mailto:${enquiry.email}`}><Mail size={14}/> Email</a>}
              <button type="button" className="plain-button" onClick={() => isOpen ? setOpenId("") : openDetails(enquiry)}>{isOpen ? "Hide details" : "View details"}</button>
            </div>
            {isOpen && <div className="enquiry-detail">
              {enquiry.email && <p><strong>Email:</strong> {enquiry.email}</p>}
              <p><strong>Full message:</strong><br/>{enquiry.message || "No message provided."}</p>
              <p><strong>Submitted:</strong> {new Date(enquiry.createdAt).toLocaleString()}</p>
              {enquiry.followUpAt && <p><strong>Follow-up:</strong> {new Date(enquiry.followUpAt).toLocaleString()}</p>}
              <label>Status<select value={status} onChange={event => setStatus(event.target.value)}>{statuses.map(value => <option key={value}>{value}</option>)}</select></label>
              <label>Follow-up date and time<input type="datetime-local" value={followUpAt} onChange={event => setFollowUpAt(event.target.value)}/></label>
              <label>Internal notes<textarea rows="3" maxLength="3000" value={internalNotes} onChange={event => setInternalNotes(event.target.value)} placeholder="Notes for the academy team only"/></label>
              <button type="button" className="btn btn-dark enquiry-save" disabled={saving} onClick={() => save(enquiry)}>{saving ? "Saving…" : "Save enquiry updates"}</button>
              {feedback && <p className="enquiry-feedback" role="status">{feedback}</p>}
              {error && <p className="enquiry-error" role="alert">{error}</p>}
            </div>}
          </article>;
        })}</div>}
  </section>;
}
