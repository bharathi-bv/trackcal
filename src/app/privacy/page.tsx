import type { Metadata } from "next";
import Link from "next/link";
import type { CSSProperties } from "react";

export const metadata: Metadata = {
  title: "Privacy Statement | CitaCal",
  description:
    "How CitaCal collects, uses, stores, and protects personal data.",
};

const sectionHeadingStyle: CSSProperties = {
  fontSize: 20,
  fontWeight: 800,
  color: "#1A1A2E",
  margin: "0 0 10px",
  letterSpacing: "-0.01em",
};

const paragraphStyle: CSSProperties = {
  fontSize: 14,
  lineHeight: 1.75,
  color: "#454560",
  margin: "0 0 12px",
};

const listStyle: CSSProperties = {
  margin: "0 0 14px 18px",
  color: "#454560",
  fontSize: 14,
  lineHeight: 1.7,
};

const sectionStyle: CSSProperties = {
  borderTop: "1px solid rgba(200,198,230,0.35)",
  paddingTop: 24,
  marginTop: 24,
};

export default function PrivacyPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background:
          "linear-gradient(135deg, #dce8f8 0%, #e8eef7 60%, #d8e4f4 100%)",
        padding: "32px 20px 64px",
      }}
    >
      <div
        style={{
          maxWidth: 860,
          margin: "0 auto",
          background: "#FFFFFF",
          borderRadius: 18,
          border: "1px solid rgba(200,198,230,0.42)",
          boxShadow: "0 10px 34px rgba(60,50,120,0.11)",
          padding: "30px 28px",
        }}
      >
        <header style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 12, color: "#7B6CF6", fontWeight: 700 }}>
            CitaCal Legal
          </div>
          <h1
            style={{
              fontSize: 34,
              lineHeight: 1.1,
              margin: "6px 0 10px",
              color: "#1A1A2E",
              letterSpacing: "-0.02em",
            }}
          >
            Privacy Statement
          </h1>
          <p style={{ ...paragraphStyle, marginBottom: 0 }}>
            Effective date: March 11, 2026
          </p>
        </header>

        <section style={sectionStyle}>
          <h2 style={sectionHeadingStyle}>1. Overview</h2>
          <p style={paragraphStyle}>
            This Privacy Statement explains how CitaCal, operated by Vivekananda Bharathi,
            Chennai, India (&quot;CitaCal&quot;, &quot;we&quot;, &quot;us&quot;, or &quot;our&quot;), collects, uses, stores,
            and shares personal data when you use our scheduling platform, booking pages,
            dashboard, and related services.
          </p>
          <p style={paragraphStyle}>
            CitaCal serves users worldwide. We comply with applicable privacy laws including
            India&apos;s Information Technology Act 2000, the Digital Personal Data Protection Act
            2023 (DPDP Act), and, where applicable to our users, the EU General Data Protection
            Regulation (GDPR) and other regional privacy frameworks.
          </p>
          <p style={paragraphStyle}>
            By using CitaCal, you acknowledge this Privacy Statement. If you do not agree,
            please do not use the service.
          </p>
        </section>

        <section style={sectionStyle}>
          <h2 style={sectionHeadingStyle}>2. Who This Applies To</h2>
          <p style={paragraphStyle}>
            This statement covers two categories of individuals:
          </p>
          <ul style={listStyle}>
            <li>
              <strong>Users (account holders):</strong> People who sign up for CitaCal to create
              scheduling pages, manage bookings, and access the dashboard. CitaCal is the data
              controller for user data.
            </li>
            <li>
              <strong>Invitees (bookers):</strong> People who book meetings through a CitaCal
              scheduling page created by an account holder. For invitee data, the account holder
              is the data controller and CitaCal acts as a data processor on their behalf. Invitees
              should contact the account holder (the person whose booking page they used) with
              questions about their data.
            </li>
          </ul>
        </section>

        <section style={sectionStyle}>
          <h2 style={sectionHeadingStyle}>3. Data We Collect</h2>
          <p style={paragraphStyle}>We may collect the following categories of personal data:</p>
          <ul style={listStyle}>
            <li>
              <strong>Account data:</strong> Name, email address, authentication identifiers,
              and profile settings provided during registration.
            </li>
            <li>
              <strong>Booking data:</strong> Attendee name, attendee email, optional custom
              fields, event details, meeting metadata, and booking status.
            </li>
            <li>
              <strong>Attribution and analytics data:</strong> UTM parameters (utm_source,
              utm_medium, utm_campaign, utm_term, utm_content) and advertising click identifiers
              (including gclid, li_fat_id, fbclid, ttclid, and msclkid when present in booking
              page URLs), booking conversion events, and referral source information.
            </li>
            <li>
              <strong>Integration data:</strong> Calendar account connections (Google, Microsoft),
              selected calendar IDs, OAuth tokens and refresh tokens required to provide calendar
              sync functionality, and Zoom account credentials where configured.
            </li>
            <li>
              <strong>Technical data:</strong> IP address, browser and device information,
              and identifiers stored in cookies or browser local storage used for session
              management, attribution continuity, and security purposes.
            </li>
          </ul>
        </section>

        <section style={sectionStyle}>
          <h2 style={sectionHeadingStyle}>4. How We Use Data</h2>
          <ul style={listStyle}>
            <li>Provide, maintain, operate, and secure the CitaCal service.</li>
            <li>Create and manage bookings and calendar events on behalf of account holders.</li>
            <li>Preserve and report attribution information associated with bookings.</li>
            <li>Operate integrations including calendar sync, video conferencing, and webhooks.</li>
            <li>Send transactional communications related to your account or bookings.</li>
            <li>Prevent abuse, fraud, spam, and unauthorized access.</li>
            <li>Comply with legal obligations and enforce our Terms of Service.</li>
            <li>Improve and develop the service using aggregated and anonymized data.</li>
          </ul>
          <p style={paragraphStyle}>
            We do not use your data to serve third-party advertising, and we do not sell
            personal data to any third party.
          </p>
        </section>

        <section style={sectionStyle}>
          <h2 style={sectionHeadingStyle}>5. Legal Bases for Processing</h2>
          <p style={paragraphStyle}>
            Where required by applicable law (including GDPR for EU/EEA users and the DPDP Act
            for Indian users), we process personal data on one or more of the following bases:
          </p>
          <ul style={listStyle}>
            <li><strong>Performance of a contract:</strong> Processing necessary to provide the service you have signed up for.</li>
            <li><strong>Legitimate interests:</strong> Processing for security, fraud prevention, product improvement, and service communications, where our interests do not override your rights.</li>
            <li><strong>Consent:</strong> Where you have given explicit consent, such as for optional features or marketing communications.</li>
            <li><strong>Legal compliance:</strong> Processing required to meet our obligations under applicable law.</li>
          </ul>
        </section>

        <section style={sectionStyle}>
          <h2 style={sectionHeadingStyle}>6. Sharing and Sub-Processors</h2>
          <p style={paragraphStyle}>
            We do not sell personal data. We share data only with service providers (&quot;sub-processors&quot;)
            who process data on our behalf under appropriate data processing terms. Current
            sub-processors include:
          </p>
          <ul style={listStyle}>
            <li><strong>Clerk</strong> — identity and authentication</li>
            <li><strong>Supabase</strong> — database and data storage</li>
            <li><strong>Vercel</strong> — application hosting and infrastructure</li>
            <li><strong>Google</strong> — Google Calendar integration and Google OAuth</li>
            <li><strong>Microsoft</strong> — Outlook Calendar integration and Microsoft OAuth</li>
            <li><strong>Zoom</strong> — video meeting creation (where configured)</li>
            <li><strong>Analytics and ad platforms</strong> — configured by the account holder (e.g. Google Analytics, Mixpanel) to receive attribution events</li>
          </ul>
          <p style={paragraphStyle}>
            We may also disclose personal data where required by law, court order, or
            governmental authority.
          </p>
          <p style={paragraphStyle}>
            If you are an EU/EEA business and require a Data Processing Agreement (DPA)
            to use CitaCal in compliance with GDPR, please contact us at{" "}
            <a href="mailto:support@citacal.com" style={{ color: "#7B6CF6" }}>
              support@citacal.com
            </a>{" "}
            and we will provide one on request.
          </p>
        </section>

        <section style={sectionStyle}>
          <h2 style={sectionHeadingStyle}>7. Cookies and Local Storage</h2>
          <p style={paragraphStyle}>
            CitaCal uses cookies and browser local storage to operate sessions, preserve
            attribution data across the booking flow (stored under the key{" "}
            <code style={{ fontSize: 13, background: "#f4f4f8", padding: "1px 5px", borderRadius: 4 }}>citacal_utm</code>{" "}
            with a 30-day expiry), remember preferences, and support security controls.
          </p>
          <p style={paragraphStyle}>
            You can control cookies through your browser settings. Disabling cookies may affect
            session management. Disabling local storage may affect attribution features.
          </p>
        </section>

        <section style={sectionStyle}>
          <h2 style={sectionHeadingStyle}>8. Data Retention</h2>
          <p style={paragraphStyle}>
            We retain personal data only as long as necessary to provide the service, meet
            legal obligations, resolve disputes, and enforce agreements:
          </p>
          <ul style={listStyle}>
            <li>Account data is retained for the duration of your account and for up to 90 days after deletion.</li>
            <li>Booking data is retained for as long as your account is active, or as required by law.</li>
            <li>Attribution data (UTM parameters, click IDs) stored in browser local storage expires after 30 days.</li>
            <li>OAuth tokens are retained only as long as the integration is active.</li>
          </ul>
        </section>

        <section style={sectionStyle}>
          <h2 style={sectionHeadingStyle}>9. Security</h2>
          <p style={paragraphStyle}>
            We use reasonable technical and organizational safeguards to protect personal data,
            including encrypted data transmission (TLS), access controls, and authentication
            security. No method of transmission or storage is completely secure, and we cannot
            guarantee absolute security.
          </p>
          <p style={paragraphStyle}>
            In the event of a personal data breach that is likely to result in a risk to your
            rights, we will notify affected users and, where required, the appropriate supervisory
            authority within the timeframe required by applicable law.
          </p>
        </section>

        <section style={sectionStyle}>
          <h2 style={sectionHeadingStyle}>10. Your Rights</h2>
          <p style={paragraphStyle}>
            Depending on your location, you may have the following rights regarding your
            personal data:
          </p>
          <ul style={listStyle}>
            <li><strong>Access:</strong> Request a copy of the personal data we hold about you.</li>
            <li><strong>Correction:</strong> Request correction of inaccurate or incomplete data.</li>
            <li><strong>Deletion:</strong> Request erasure of your personal data, subject to legal retention requirements.</li>
            <li><strong>Restriction:</strong> Request that we limit processing of your data in certain circumstances.</li>
            <li><strong>Portability:</strong> Receive your data in a structured, machine-readable format.</li>
            <li><strong>Objection:</strong> Object to processing based on legitimate interests.</li>
            <li><strong>Withdraw consent:</strong> Where processing is based on consent, withdraw it at any time without affecting prior processing.</li>
          </ul>
          <p style={paragraphStyle}>
            To exercise any of these rights, contact us at{" "}
            <a href="mailto:support@citacal.com" style={{ color: "#7B6CF6" }}>
              support@citacal.com
            </a>
            . We will respond within 30 days of receiving your request. We may need to verify
            your identity before processing your request.
          </p>
          <p style={paragraphStyle}>
            If you are an EU/EEA resident and believe we have not addressed your concern,
            you have the right to lodge a complaint with your local data protection supervisory
            authority.
          </p>
        </section>

        <section style={sectionStyle}>
          <h2 style={sectionHeadingStyle}>11. International Data Transfers</h2>
          <p style={paragraphStyle}>
            CitaCal is operated from India and uses infrastructure providers (Vercel, Supabase,
            Clerk) that may process data in the United States or other countries. Where your
            data is transferred outside your home country, we rely on appropriate safeguards
            such as standard contractual clauses, adequacy decisions, or our sub-processors&apos;
            own compliance frameworks to protect your data.
          </p>
        </section>

        <section style={sectionStyle}>
          <h2 style={sectionHeadingStyle}>12. Children&apos;s Privacy</h2>
          <p style={paragraphStyle}>
            CitaCal is not directed to children under 18 and we do not knowingly collect
            personal data from minors. If we become aware that we have collected personal
            data from a minor, we will delete it promptly. Please contact us at
            support@citacal.com if you believe a minor&apos;s data has been submitted.
          </p>
        </section>

        <section style={sectionStyle}>
          <h2 style={sectionHeadingStyle}>13. Changes to This Statement</h2>
          <p style={paragraphStyle}>
            We may update this Privacy Statement from time to time. For material changes, we
            will notify you by email or by posting a prominent notice within the service at
            least 14 days before the changes take effect. We will revise the effective date
            at the top of this page.
          </p>
        </section>

        <section style={sectionStyle}>
          <h2 style={sectionHeadingStyle}>14. Grievance Officer</h2>
          <p style={paragraphStyle}>
            In accordance with the Information Technology Act, 2000, the IT (Intermediary
            Guidelines and Digital Media Ethics Code) Rules, 2021, and the Digital Personal
            Data Protection Act, 2023, the designated Grievance Officer is:
          </p>
          <p style={paragraphStyle}>
            <strong>Name:</strong> Vivekananda Bharathi<br />
            <strong>Email:</strong>{" "}
            <a href="mailto:support@citacal.com" style={{ color: "#7B6CF6" }}>
              support@citacal.com
            </a><br />
            <strong>Response time:</strong> Complaints will be acknowledged within 48 hours
            and resolved within 30 days of receipt.
          </p>
        </section>

        <section style={sectionStyle}>
          <h2 style={sectionHeadingStyle}>15. Contact</h2>
          <p style={paragraphStyle}>
            Privacy questions can be sent to{" "}
            <a href="mailto:support@citacal.com" style={{ color: "#7B6CF6" }}>
              support@citacal.com
            </a>
            .
          </p>
          <p style={{ ...paragraphStyle, marginBottom: 0 }}>
            You may also review our{" "}
            <Link href="/terms" style={{ color: "#7B6CF6" }}>
              Terms of Service
            </Link>
            .
          </p>
        </section>
      </div>
    </main>
  );
}
