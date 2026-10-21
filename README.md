# Astrratech Learning Academy — Premium React + MongoDB Atlas Website

A responsive coaching-academy website prototype based on the provided `Academy Website Requirements` handoff. It uses **sample/demo content only**. Brand name, contact details, faculty, results and testimonials are fictional placeholders.

## Stack
- React + Vite
- React Router
- Framer Motion for subtle motion and scroll reveals, with reduced-motion support
- Lucide React icons
- Express API
- MongoDB Atlas via Mongoose
- JWT admin sessions and bcrypt dependency available for extending auth

## Included requirements checklist
- [x] Home page with requested section sequence: header, hero, trust points, courses, why choose us, results, faculty, testimonials, resources/notices, admissions/FAQ preview, final CTA and footer
- [x] About Us
- [x] Courses listing and course detail cards/links
- [x] Faculty / Teachers
- [x] Results, Awards & Achievements (clearly labelled sample data)
- [x] Admissions page and steps
- [x] Resources / Study Materials
- [x] Student Testimonials (clearly labelled sample content)
- [x] News / Events / Notices
- [x] Careers
- [x] FAQs
- [x] Contact Us and enquiry form
- [x] Privacy Policy and Terms/Refund placeholder
- [x] Responsive mobile/tablet/desktop layouts
- [x] Hover/focus states, gentle animations, reduced-motion support
- [x] Enquiry form validation and success/error feedback
- [x] Backend endpoint to save demo enquiries to MongoDB
- [x] Admin login and dashboard to create/edit/delete courses, faculty, results, testimonials, notices and resources
- [x] Admin-editable Get in Touch heading, description, phone, email, address, office hours and map embed
- [x] Admin enquiry inbox
- [x] MongoDB collections auto-seeded with sample content when empty
- [x] README and environment example

## Run locally
Requirements: Node.js 18+ and npm.

1. Extract the ZIP and open the folder in VS Code.
2. Install packages:
   ```bash
   npm install
   ```
3. Copy `.env.example` to `.env`.
4. Set your MongoDB Atlas connection string in `MONGODB_URI`.
5. Set `ADMIN_EMAIL`, a random `JWT_SECRET` of at least 32 characters, and `ADMIN_PASSWORD_HASH` in `.env`. The password hash must be bcrypt with a cost of at least 10. The server will refuse to start when these authentication settings are missing or invalid.
   - Generate the hash locally with the installed `bcryptjs` package (`bcrypt.hash(password, 12)`) in a trusted Node.js environment. Put the hash in `ADMIN_PASSWORD_HASH`; use the original plaintext password at the admin login form.
   - If `.env` currently has `ADMIN_PASSWORD`, create a bcrypt hash for the intended login password, replace that setting with `ADMIN_PASSWORD_HASH`, and remove `ADMIN_PASSWORD`. Do not put the plaintext password in the hash setting. Existing sessions signed with the old fallback secret will need to sign in again.
6. In MongoDB Atlas, create a database user, allow your development IP in Network Access, and use the cluster connection string. Do not commit `.env`.
7. Create a Cloudinary account and add its cloud name, API key, and API secret as `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET`. Keep the API secret private and configure these variables in your deployment environment as well as local `.env`.
8. Start frontend and API:
   ```bash
   npm run dev
   ```
9. Open `http://localhost:5173`.
10. Admin: open the unlinked `http://localhost:5173/staff-access` entry and sign in using `ADMIN_EMAIL` and the password corresponding to `ADMIN_PASSWORD_HASH`. `/admin` and nested `/admin/...` URLs show the not-found page; admin API endpoints continue to require a valid admin token.

If `MONGODB_URI` is not set, the server tries local MongoDB at `mongodb://127.0.0.1:27017/astratech_academy`. The website uses built-in sample fallback data if the API/database is unavailable, but CRUD and enquiries require a working database connection.

## Admin image uploads
Admins can enter an image URL or upload JPEG, PNG, WebP, GIF, BMP, or AVIF images (maximum 5 MB). Uploaded files are checked against their MIME type and file signature before being sent to Cloudinary. The existing content `image` field stores Cloudinary's permanent HTTPS URL, so images remain available across server restarts and deployments. SVG uploads are not accepted.

Cloudinary credentials are read from `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET`. Configure them in local `.env` and in the hosting provider's secret environment settings. No uploaded image bytes are stored on the application server.

## Enquiry notifications
SMTP email notifications are optional. To enable an admin notification and an automatic student confirmation when an enquiry includes a valid email, configure `SMTP_HOST`, `SMTP_PORT` (usually `587`), `SMTP_SECURE` (`true` for implicit TLS, otherwise `false`), `SMTP_FROM`, and `ENQUIRY_NOTIFICATION_EMAIL` in local `.env` and in the deployment environment. If your SMTP provider requires authentication, also configure `SMTP_USER` and `SMTP_PASS`. When `ENQUIRY_NOTIFICATION_EMAIL` is omitted, the configured `ADMIN_EMAIL` is used. Keep credentials in environment secrets; do not commit `.env`. Email failures are logged without exposing credentials and do not undo a saved enquiry.

The authenticated admin Enquiry inbox supports text search, status/course filters, click-to-call/email, follow-up date/time, private internal notes, and persisted status updates. Public enquiry submissions receive a success confirmation only after MongoDB has saved the enquiry.

## API overview
- `GET /api/health`
- `GET /api/content/:collection`
- `GET /api/content/contact`
- `PUT /api/admin/contact` (admin token required)
- `POST /api/enquiries`
- `POST /api/admin/login`
- `POST /api/admin/images` (admin token required; multipart field `image`, maximum 5 MB; returns a permanent Cloudinary HTTPS URL)
- `GET /api/admin/enquiries` (admin token required)
- `PUT /api/admin/enquiries/:id` (admin token required; status, follow-up, and internal notes)
- `POST /api/admin/:collection` (admin token required)
- `PUT /api/admin/:collection/:id` (admin token required)
- `DELETE /api/admin/:collection/:id` (admin token required)

Collections: `courses`, `faculty`, `results`, `testimonials`, `notices`, `resources`.

## Before production deployment
- Replace all sample data with approved content; sample outcomes and testimonials must not be presented as real.
- Update privacy and refund policies with the academy's approved wording.
- Replace placeholder contact details and validate phone/WhatsApp/email destinations.
- Configure MongoDB Atlas network access with least privilege and a strong database password.
- Rotate the configured admin password and JWT secret periodically; use HTTPS and secure hosting. Consider rate limiting, audit logs, password reset, stronger validation and security headers before public launch.
- Configure `CLIENT_URL` for the deployed frontend origin.
- Test every route, mobile layout, form submission, admin CRUD, accessibility, loading speed and broken links.
- Run focused backend auth tests with `npm test`.
- Resources have individual view pages and support view/download links when an approved file URL is supplied. The current resource schema/admin form does not store a file URL, so real downloads remain unavailable until an approved file-storage field and workflow are added.
- Enquiries are saved to the database, but no real email/CRM/WhatsApp notification integration is configured because the approved destination was not supplied.
- Phone and WhatsApp header links are intentionally not invented; replace placeholders once approved.

## Note
This is a complete runnable project scaffold, not a claim that it has already been installed, tested against your Atlas cluster or deployed. Atlas credentials are never included in this ZIP.
