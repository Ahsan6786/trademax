import React, { useEffect } from 'react';
import { Shield, Lock, FileText, ArrowUpRight, CheckCircle2, AlertTriangle, ExternalLink } from 'lucide-react';
import './PrivacyPolicyPage.css';

export const PrivacyPolicyPage = ({ onNavigate, theme = 'dark', onBack }) => {
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    document.title = 'Privacy Policy — TRADEMAX';
  }, []);

  return (
    <div className={`tm-legal-page tm-theme-${theme}`}>
      {/* Page Hero Header */}
      <div className="tm-legal-hero">
        <div className="tm-legal-hero-inner">
          <div className="tm-legal-hero-nav">
            {/* Quick Document Navigation Switcher */}
            <div className="tm-legal-tab-switcher" role="tablist" aria-label="Legal documents">
              <button
                type="button"
                className="tm-legal-tab active"
                role="tab"
                aria-selected="true"
              >
                Privacy Policy
              </button>
              <button
                type="button"
                className="tm-legal-tab"
                role="tab"
                aria-selected="false"
                onClick={() => onNavigate && onNavigate('terms')}
              >
                Terms &amp; Conditions
              </button>
              <button
                type="button"
                className="tm-legal-tab"
                role="tab"
                aria-selected="false"
                onClick={() => onNavigate && onNavigate('refund')}
              >
                Refund Policy
              </button>
            </div>
          </div>

          <div className="tm-legal-badge">
            <Shield size={14} />
            <span>LEGAL &amp; DATA PROTECTION</span>
          </div>

          <h1 className="tm-legal-title">Privacy Policy</h1>
          <p className="tm-legal-lead">
            TradeMax is committed to protecting the privacy, confidentiality, and integrity of your personal and academic information. This policy describes how we collect, process, store, and safeguard your data.
          </p>

          <div className="tm-legal-meta-row">
            <span className="tm-legal-meta-item">
              <strong>Effective Date:</strong> October 2026
            </span>
            <span className="tm-legal-meta-divider">•</span>
            <span className="tm-legal-meta-item">
              <strong>Jurisdiction:</strong> Pune, Maharashtra, India
            </span>
            <span className="tm-legal-meta-divider">•</span>
            <span className="tm-legal-meta-item">
              <strong>Statutory Compliance:</strong> IT Act 2000 &amp; DPDP Act 2023
            </span>
          </div>
        </div>
      </div>

      {/* Main Content Body */}
      <main className="tm-legal-content-container">
        <div className="tm-legal-grid">
          {/* Table of Contents Sticky Sidebar */}
          <aside className="tm-legal-toc" aria-label="Privacy Policy Sections">
            <div className="tm-legal-toc-card">
              <span className="tm-legal-toc-title">ON THIS PAGE</span>
              <ul className="tm-legal-toc-list">
                <li><a href="#section-1">1. Institutional Scope</a></li>
                <li><a href="#section-2">2. Information We Collect</a></li>
                <li><a href="#section-3">3. How We Use Your Data</a></li>
                <li><a href="#section-4">4. Payment &amp; UTR Verification</a></li>
                <li><a href="#section-5">5. Storage &amp; Cloud Security</a></li>
                <li><a href="#section-6">6. Cookies &amp; Local Storage</a></li>
                <li><a href="#section-7">7. Third-Party Disclosures</a></li>
                <li><a href="#section-8">8. Your Privacy Rights</a></li>
                <li><a href="#section-9">9. Retention &amp; Erasure</a></li>
                <li><a href="#section-10">10. Grievance Redressal</a></li>
              </ul>

              <div className="tm-legal-toc-box">
                <Lock size={16} className="tm-legal-toc-icon" />
                <p>
                  TradeMax never sells or monetizes student data. Your transaction proofs are stored on encrypted AWS infrastructure.
                </p>
              </div>
            </div>
          </aside>

          {/* Article Sections */}
          <article className="tm-legal-article">
            {/* Section 1 */}
            <section id="section-1" className="tm-legal-section">
              <h2 className="tm-section-heading">
                <span className="tm-section-num">01</span>
                <span>Institutional Scope &amp; Applicable Laws</span>
              </h2>
              <p>
                This Privacy Policy applies to the TradeMax platform, official website, student portal, and associated educational services operated under the banner of <strong>TradeMax</strong> (official social handle: <code>@patil_trader01</code>), situated in Pune, Maharashtra, India.
              </p>
              <p>
                We process personal information in compliance with applicable Indian legislations, including:
              </p>
              <ul className="tm-legal-list">
                <li>The <strong>Information Technology Act, 2000</strong> (IT Act) and amendments thereto;</li>
                <li>The <strong>Information Technology (Reasonable Security Practices and Procedures and Sensitive Personal Data or Information) Rules, 2011</strong> (SPDI Rules);</li>
                <li>The principles established under the <strong>Digital Personal Data Protection Act, 2023</strong> (DPDP Act).</li>
              </ul>
              <p>
                By registering an account, enrolling in a course, or utilizing our trading education terminal, you acknowledge that you have read and understood this Privacy Policy.
              </p>
            </section>

            {/* Section 2 */}
            <section id="section-2" className="tm-legal-section">
              <h2 className="tm-section-heading">
                <span className="tm-section-num">02</span>
                <span>Information We Collect</span>
              </h2>
              <p>
                We collect only the minimum necessary data required to deliver educational courses, verify manual payments, and maintain portal security:
              </p>
              
              <div className="tm-legal-cards-group">
                <div className="tm-info-card">
                  <div className="tm-info-card-header">
                    <span className="tm-info-dot" />
                    <h3>A. Account &amp; Profile Information</h3>
                  </div>
                  <p>
                    When creating a student account or enrolling, we collect your <strong>full name</strong>, <strong>email address</strong>, <strong>mobile / WhatsApp number</strong>, academic affiliation (e.g. college or batch), and self-declared trading experience level.
                  </p>
                </div>

                <div className="tm-info-card">
                  <div className="tm-info-card-header">
                    <span className="tm-info-dot" />
                    <h3>B. Account Authentication Credentials</h3>
                  </div>
                  <p>
                    Passwords are never stored in plain text. All student credentials are cryptographically hashed using salted <strong>bcrypt</strong> before being stored in the database. TradeMax staff cannot read your password.
                  </p>
                </div>

                <div className="tm-info-card">
                  <div className="tm-info-card-header">
                    <span className="tm-info-dot" />
                    <h3>C. Payment Verification Data</h3>
                  </div>
                  <p>
                    For course purchases completed via official UPI QR scan, we collect your submitted <strong>12-digit UPI transaction reference / UTR number</strong>, <strong>claimed amount</strong>, <strong>submission timestamp</strong>, and <strong>uploaded screenshot</strong> of your successful payment receipt.
                  </p>
                </div>

                <div className="tm-info-card">
                  <div className="tm-info-card-header">
                    <span className="tm-info-dot" />
                    <h3>D. Technical &amp; Device Information</h3>
                  </div>
                  <p>
                    To secure our servers and detect anomalous activity, we record standard server access logs including IP addresses, browser types, device operating systems, and session tokens. If you subscribe to browser push notifications, we store the standard browser <strong>Web Push VAPID endpoint</strong> and public keys.
                  </p>
                </div>
              </div>
            </section>

            {/* Section 3 */}
            <section id="section-3" className="tm-legal-section">
              <h2 className="tm-section-heading">
                <span className="tm-section-num">03</span>
                <span>How We Use Your Information</span>
              </h2>
              <p>
                We use collected information solely for legitimate educational and administrative purposes:
              </p>
              <ul className="tm-legal-list">
                <li><strong>Enrollment Verification:</strong> Reconciling submitted UPI transaction receipts with bank statements to approve course registrations and grant portal access.</li>
                <li><strong>Educational Service Delivery:</strong> Providing access to curriculum modules, recorded video lectures, downloadable resource materials, and live interactive webinar links.</li>
                <li><strong>Operational Communication:</strong> Sending class schedules, batch commencement announcements, verification status notices, and administrative alerts.</li>
                <li><strong>Web Push Notifications:</strong> Delivering opt-in market motivation quotes, batch reminders, and live class links directly to your mobile or desktop browser (can be toggled on/off at any time in Student Settings).</li>
                <li><strong>Security &amp; Fraud Prevention:</strong> Preventing account sharing, unauthorized course redistribution, and fraudulent payment claims.</li>
                <li><strong>Statutory Compliance:</strong> Maintaining audit records in accordance with Indian tax and financial documentation requirements.</li>
              </ul>
            </section>

            {/* Section 4 */}
            <section id="section-4" className="tm-legal-section">
              <h2 className="tm-section-heading">
                <span className="tm-section-num">04</span>
                <span>Payment Details &amp; Financial Security</span>
              </h2>
              <div className="tm-highlight-box tm-box-neutral">
                <div className="tm-box-title">
                  <CheckCircle2 size={18} color="#16a34a" />
                  <span>TradeMax Never Collects Your Banking Credentials</span>
                </div>
                <p>
                  All course payments are conducted externally through your own banking or UPI applications (Google Pay, PhonePe, Paytm, BHIM, or bank apps) by scanning the official QR code.
                </p>
                <p>
                  <strong>TradeMax NEVER asks for, collects, or stores:</strong>
                </p>
                <ul>
                  <li>Your UPI MPIN or banking passwords;</li>
                  <li>Debit or credit card numbers, expiry dates, or CVV codes;</li>
                  <li>One-Time Passwords (OTPs) sent by your bank.</li>
                </ul>
                <p>
                  We solely collect student-uploaded transaction receipts and 12-digit UTR references to verify that payment has been credited to TradeMax’s designated account.
                </p>
              </div>
            </section>

            {/* Section 5 */}
            <section id="section-5" className="tm-legal-section">
              <h2 className="tm-section-heading">
                <span className="tm-section-num">05</span>
                <span>Data Storage, Security &amp; Cloud Infrastructure</span>
              </h2>
              <p>
                TradeMax implements reasonable technical, administrative, and physical security measures as required by Rule 8 of the Information Technology (SPDI) Rules, 2011:
              </p>
              <ul className="tm-legal-list">
                <li><strong>Encrypted Transmission:</strong> All communications between your browser and our servers are encrypted using modern Transport Layer Security (TLS 1.3 / HTTPS).</li>
                <li><strong>Secure Cloud Storage:</strong> Uploaded payment receipt screenshots are stored in secure Amazon Web Services (AWS S3) buckets with encrypted object storage and strict access controls.</li>
                <li><strong>Session Protection:</strong> Student portal sessions are protected using digitally signed JSON Web Tokens (JWT) stored in browser storage, expiring automatically to prevent unauthorized session hijacking.</li>
                <li><strong>Restricted Administration:</strong> Payment claims and student records are accessible solely by authenticated, authorized TradeMax administrators.</li>
              </ul>
            </section>

            {/* Section 6 */}
            <section id="section-6" className="tm-legal-section">
              <h2 className="tm-section-heading">
                <span className="tm-section-num">06</span>
                <span>Cookies &amp; Local Storage</span>
              </h2>
              <p>
                TradeMax uses browser <code>localStorage</code> and essential cookies strictly to provide core portal functionality. We do not use third-party behavioral advertising cookies:
              </p>
              <div className="tm-table-wrap">
                <table className="tm-legal-table">
                  <thead>
                    <tr>
                      <th>Storage Key</th>
                      <th>Purpose</th>
                      <th>Type</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td><code>tm_token</code> &amp; <code>tm_user</code></td>
                      <td>Maintains authenticated student session across portal pages.</td>
                      <td>Essential</td>
                    </tr>
                    <tr>
                      <td><code>tm_theme</code></td>
                      <td>Remembers your preference between Day Mode and Night Mode.</td>
                      <td>Functional</td>
                    </tr>
                    <tr>
                      <td><code>tm_has_seen_welcome</code></td>
                      <td>Prevents repetitive onboarding animations on subsequent logins.</td>
                      <td>Functional</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            {/* Section 7 */}
            <section id="section-7" className="tm-legal-section">
              <h2 className="tm-section-heading">
                <span className="tm-section-num">07</span>
                <span>Third-Party Services &amp; Disclosures</span>
              </h2>
              <p>
                TradeMax has a strict policy: <strong>We do not sell, rent, lease, or monetize your personal information to any third parties or marketing brokers.</strong>
              </p>
              <p>
                We engage trusted service providers only for operational execution under strict confidentiality:
              </p>
              <ul className="tm-legal-list">
                <li><strong>Amazon Web Services (AWS):</strong> Cloud storage provider for storing uploaded payment verification receipts.</li>
                <li><strong>Web Push Service Providers:</strong> Browser standards (Google FCM, Mozilla Autopush, Apple WebPush) used to dispatch student notifications.</li>
                <li><strong>Law Enforcement &amp; Legal Compliance:</strong> We may disclose personal data if required by applicable Indian law, court order, or formal investigation by government or law enforcement agencies.</li>
              </ul>
            </section>

            {/* Section 8 */}
            <section id="section-8" className="tm-legal-section">
              <h2 className="tm-section-heading">
                <span className="tm-section-num">08</span>
                <span>Your Privacy Rights &amp; Choices</span>
              </h2>
              <p>
                Under applicable Indian laws and the DPDP Act 2023, you have the following rights regarding your personal information:
              </p>
              <ul className="tm-legal-list">
                <li><strong>Right to Access:</strong> You can view your account profile, enrolled courses, and payment verification history directly within the Student Portal.</li>
                <li><strong>Right to Correction:</strong> You can update your profile details and password in the Account Settings page at any time.</li>
                <li><strong>Right to Withdraw Consent for Push Notifications:</strong> You can disable motivation, course, and announcement push notifications at any time via the Student Settings page or your browser permissions.</li>
                <li><strong>Right to Account Erasure:</strong> You may request the deletion of your student account by submitting a written request to our grievance desk, subject to statutory retention requirements for financial transaction records.</li>
              </ul>
            </section>

            {/* Section 9 */}
            <section id="section-9" className="tm-legal-section">
              <h2 className="tm-section-heading">
                <span className="tm-section-num">09</span>
                <span>Data Retention Policy</span>
              </h2>
              <p>
                We retain your account profile and educational progress for the active duration of your student enrollment. Financial verification records (including UPI UTR numbers and payment receipt copies) are retained for up to 7 years in compliance with Indian statutory accounting and audit regulations. Following the expiration of required retention periods, data is securely deleted or anonymized.
              </p>
            </section>

            {/* Section 10 */}
            <section id="section-10" className="tm-legal-section">
              <h2 className="tm-section-heading">
                <span className="tm-section-num">10</span>
                <span>Grievance Redressal &amp; Contact Details</span>
              </h2>
              <p>
                In accordance with the Information Technology Act, 2000 and Rules made thereunder, if you have any questions, feedback, or grievances concerning this Privacy Policy, please contact our designated coordinator:
              </p>
              
              <div className="tm-grievance-card">
                <div className="tm-grievance-title">TRADEMAX ADMINISTRATION &amp; GRIEVANCE DESK</div>
                <div className="tm-grievance-grid">
                  <div className="tm-grievance-item">
                    <span className="label">Institution:</span>
                    <strong>TradeMax</strong>
                  </div>
                  <div className="tm-grievance-item">
                    <span className="label">Location:</span>
                    <strong>Pune, Maharashtra, India</strong>
                  </div>
                  <div className="tm-grievance-item">
                    <span className="label">Official Telegram:</span>
                    <a
                      href="https://t.me/trademaxchallenge"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="tm-legal-ext-link"
                    >
                      @trademaxchallenge <ExternalLink size={12} />
                    </a>
                  </div>
                  <div className="tm-grievance-item">
                    <span className="label">Official Instagram:</span>
                    <a
                      href="https://www.instagram.com/patil_trader01?cplk=MTUwcXZjMnplNnJ5Nw%3D%3D&utm_source=qr"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="tm-legal-ext-link"
                    >
                      @patil_trader01 <ExternalLink size={12} />
                    </a>
                  </div>
                  <div className="tm-grievance-item">
                    <span className="label">Admissions Helpline:</span>
                    <a href="tel:+916352461137" className="tm-legal-ext-link">
                      6352461137
                    </a>
                  </div>
                </div>
              </div>
            </section>
          </article>
        </div>
      </main>
    </div>
  );
};

export default PrivacyPolicyPage;
