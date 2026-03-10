import type { Metadata } from "next";
import Link from "next/link";
import type { CSSProperties } from "react";

export const metadata: Metadata = {
  title: "Terms of Service | CitaCal",
  description:
    "Terms governing your use of CitaCal scheduling and attribution services.",
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

export default function TermsPage() {
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
            Terms of Service
          </h1>
          <p style={{ ...paragraphStyle, marginBottom: 0 }}>
            Effective date: March 11, 2026
          </p>
        </header>

        <section style={sectionStyle}>
          <h2 style={sectionHeadingStyle}>1. Acceptance of Terms</h2>
          <p style={paragraphStyle}>
            These Terms of Service (&quot;Terms&quot;) govern your use of CitaCal, operated
            by Vivekananda Bharathi, Chennai, India (&quot;CitaCal&quot;, &quot;we&quot;, &quot;us&quot;, or &quot;our&quot;).
            By creating an account, accessing booking pages, or using any CitaCal feature,
            you agree to be bound by these Terms. If you do not agree, do not use the service.
          </p>
        </section>

        <section style={sectionStyle}>
          <h2 style={sectionHeadingStyle}>2. Service Description</h2>
          <p style={paragraphStyle}>
            CitaCal provides scheduling pages, calendar integrations, attribution capture,
            booking analytics, and related workflow features. We may update, add, or remove
            features over time without notice, though we will endeavour to communicate
            material changes.
          </p>
        </section>

        <section style={sectionStyle}>
          <h2 style={sectionHeadingStyle}>3. Eligibility and Accounts</h2>
          <ul style={listStyle}>
            <li>You must be at least 18 years of age (or the age of legal majority in your jurisdiction) to create an account.</li>
            <li>You must provide accurate account information and keep it updated.</li>
            <li>You are responsible for safeguarding your login credentials.</li>
            <li>You are responsible for all activity under your account.</li>
            <li>You must promptly notify us at support@citacal.com if you suspect unauthorized account use.</li>
          </ul>
        </section>

        <section style={sectionStyle}>
          <h2 style={sectionHeadingStyle}>4. Acceptable Use</h2>
          <p style={paragraphStyle}>You agree not to:</p>
          <ul style={listStyle}>
            <li>Use CitaCal for unlawful, fraudulent, or abusive purposes.</li>
            <li>Interfere with platform security, availability, or integrity.</li>
            <li>Attempt to reverse engineer, scrape at scale, or misuse APIs beyond permitted usage.</li>
            <li>Upload or transmit malicious code, spam, or harmful content.</li>
            <li>Infringe intellectual property or privacy rights of others.</li>
            <li>Use CitaCal to send unsolicited communications or track individuals without lawful basis.</li>
          </ul>
        </section>

        <section style={sectionStyle}>
          <h2 style={sectionHeadingStyle}>5. User Data and Invitee Data</h2>
          <p style={paragraphStyle}>
            <strong>User data</strong> is data you provide as a CitaCal account holder — your name, email,
            calendar connections, settings, and bookings dashboard.
          </p>
          <p style={paragraphStyle}>
            <strong>Invitee data</strong> is data collected from individuals who book meetings through
            your CitaCal booking pages. As the account holder, you are the data controller for
            invitee data collected through your pages. You are responsible for ensuring you have
            a lawful basis to collect and use that data, and for providing appropriate notice to
            your invitees. CitaCal processes invitee data on your behalf as a data processor.
          </p>
          <p style={paragraphStyle}>
            As between you and CitaCal, you retain rights to your content and booking data.
            You grant us the rights needed to host, process, and transmit that data to operate
            the service. Our handling of personal data is described in our{" "}
            <Link href="/privacy" style={{ color: "#7B6CF6" }}>
              Privacy Statement
            </Link>
            .
          </p>
        </section>

        <section style={sectionStyle}>
          <h2 style={sectionHeadingStyle}>6. Attribution Features</h2>
          <p style={paragraphStyle}>
            CitaCal&apos;s core feature is preserving marketing attribution data (UTM parameters and
            advertising click identifiers such as gclid, fbclid, li_fat_id, ttclid, and msclkid)
            through the booking flow. You are responsible for ensuring your use of these attribution
            features complies with the terms of the relevant advertising platforms (Google Ads,
            Meta, LinkedIn, TikTok, Microsoft Ads) and applicable privacy laws, including obtaining
            any required consents from your booking page visitors.
          </p>
        </section>

        <section style={sectionStyle}>
          <h2 style={sectionHeadingStyle}>7. Integrations and Third Parties</h2>
          <p style={paragraphStyle}>
            CitaCal can connect with third-party services such as Google Calendar, Microsoft
            Outlook, Zoom, and webhook destinations. Your use of those services is also subject
            to their respective terms and policies. We are not responsible for third-party
            services, their availability, or outages outside our control.
          </p>
        </section>

        <section style={sectionStyle}>
          <h2 style={sectionHeadingStyle}>8. Fees and Pricing</h2>
          <p style={paragraphStyle}>
            CitaCal may offer free and paid features. If paid plans are introduced, applicable
            pricing and billing terms will be disclosed before charges apply. We will provide
            reasonable notice of any pricing changes.
          </p>
        </section>

        <section style={sectionStyle}>
          <h2 style={sectionHeadingStyle}>9. Intellectual Property</h2>
          <p style={paragraphStyle}>
            CitaCal and its underlying software, branding, and content are owned by CitaCal
            or its licensors and are protected by applicable intellectual property laws. These
            Terms grant a limited, revocable, non-exclusive, non-transferable right to use the
            service for its intended purposes.
          </p>
        </section>

        <section style={sectionStyle}>
          <h2 style={sectionHeadingStyle}>10. Disclaimer of Warranties</h2>
          <p style={paragraphStyle}>
            CitaCal is provided on an &quot;as is&quot; and &quot;as available&quot; basis. To the maximum extent
            permitted by applicable law, we disclaim all warranties, express or implied,
            including merchantability, fitness for a particular purpose, and non-infringement.
            We do not warrant that the service will be uninterrupted, error-free, or free of
            harmful components.
          </p>
        </section>

        <section style={sectionStyle}>
          <h2 style={sectionHeadingStyle}>11. Limitation of Liability</h2>
          <p style={paragraphStyle}>
            To the maximum extent permitted by applicable law, CitaCal will not be liable for
            indirect, incidental, special, consequential, or punitive damages, or for loss of
            profits, revenue, data, or goodwill arising from your use of the service.
          </p>
          <p style={paragraphStyle}>
            Our aggregate liability for any claims related to the service will not exceed the
            amounts paid by you to CitaCal in the 12 months immediately before the event giving
            rise to the claim, or INR 5,000 (whichever is greater).
          </p>
          <p style={paragraphStyle}>
            Nothing in these Terms limits liability that cannot be excluded under applicable law,
            including liability for death or personal injury caused by negligence, or for fraud.
          </p>
        </section>

        <section style={sectionStyle}>
          <h2 style={sectionHeadingStyle}>12. Suspension and Termination</h2>
          <p style={paragraphStyle}>
            We may suspend or terminate access if you violate these Terms, create legal risk,
            or misuse the service. We will endeavour to provide notice where reasonably practicable,
            except where immediate suspension is required to prevent harm. You may stop using the
            service and delete your account at any time by contacting us at support@citacal.com.
          </p>
        </section>

        <section style={sectionStyle}>
          <h2 style={sectionHeadingStyle}>13. Changes to Terms</h2>
          <p style={paragraphStyle}>
            We may modify these Terms from time to time. For material changes, we will provide
            at least 14 days&apos; notice by email or by posting a notice within the service. Your
            continued use after the effective date constitutes acceptance of the revised Terms.
          </p>
        </section>

        <section style={sectionStyle}>
          <h2 style={sectionHeadingStyle}>14. Governing Law and Disputes</h2>
          <p style={paragraphStyle}>
            These Terms are governed by the laws of India. Any disputes arising out of or in
            connection with these Terms shall be subject to the exclusive jurisdiction of the
            courts in Chennai, Tamil Nadu, India, without regard to conflict of law principles.
          </p>
          <p style={paragraphStyle}>
            If you are a consumer located in a jurisdiction that grants you mandatory local
            consumer protection rights, nothing in these Terms limits those rights.
          </p>
        </section>

        <section style={sectionStyle}>
          <h2 style={sectionHeadingStyle}>15. Grievance Officer</h2>
          <p style={paragraphStyle}>
            In accordance with the Information Technology Act, 2000 and the Information
            Technology (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021,
            the details of our Grievance Officer are:
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
          <h2 style={sectionHeadingStyle}>16. Contact</h2>
          <p style={paragraphStyle}>
            Questions about these Terms can be sent to{" "}
            <a href="mailto:support@citacal.com" style={{ color: "#7B6CF6" }}>
              support@citacal.com
            </a>
            .
          </p>
          <p style={{ ...paragraphStyle, marginBottom: 0 }}>
            You can also review our{" "}
            <Link href="/privacy" style={{ color: "#7B6CF6" }}>
              Privacy Statement
            </Link>
            .
          </p>
        </section>
      </div>
    </main>
  );
}
