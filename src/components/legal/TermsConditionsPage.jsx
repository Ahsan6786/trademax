import React, { useEffect, useRef } from 'react';
import {
  FileText,
  Shield,
  AlertTriangle,
  CheckCircle2,
  Lock,
  ExternalLink,
  HelpCircle,
  Clock,
  Scale
} from 'lucide-react';
import './PrivacyPolicyPage.css'; // Shared legal styling framework

export const TermsConditionsPage = ({ onNavigate, theme = 'dark', onBack, initialSection = 'terms' }) => {
  const refundSectionRef = useRef(null);

  useEffect(() => {
    document.title = initialSection === 'refund' 
      ? 'Cancellation & Refund Policy — TRADEMAX' 
      : 'Terms & Conditions — TRADEMAX';

    if (initialSection === 'refund' || window.location.hash === '#refund' || window.location.hash === '#refund-policy') {
      setTimeout(() => {
        if (refundSectionRef.current) {
          refundSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    } else {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    }
  }, [initialSection]);

  const scrollToRefund = (e) => {
    if (e) e.preventDefault();
    if (refundSectionRef.current) {
      refundSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

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
                className="tm-legal-tab"
                role="tab"
                aria-selected="false"
                onClick={() => onNavigate && onNavigate('privacy')}
              >
                Privacy Policy
              </button>
              <button
                type="button"
                className={`tm-legal-tab ${initialSection !== 'refund' ? 'active' : ''}`}
                role="tab"
                aria-selected={initialSection !== 'refund'}
                onClick={() => {
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              >
                Terms &amp; Conditions
              </button>
              <button
                type="button"
                className={`tm-legal-tab ${initialSection === 'refund' ? 'active' : ''}`}
                role="tab"
                aria-selected={initialSection === 'refund'}
                onClick={scrollToRefund}
              >
                Refund Policy
              </button>
            </div>
          </div>

          <div className="tm-legal-badge">
            <Scale size={14} />
            <span>TERMS OF SERVICE &amp; ACADEMIC AGREEMENT</span>
          </div>

          <h1 className="tm-legal-title">Terms &amp; Conditions</h1>
          <p className="tm-legal-lead">
            Please read these Terms and Conditions carefully. They govern your registration, course enrollment, access to curriculum materials, live classes, and institutional trading tools provided by TradeMax.
          </p>

          <div className="tm-legal-meta-row">
            <span className="tm-legal-meta-item">
              <strong>Last Updated:</strong> October 2026
            </span>
            <span className="tm-legal-meta-divider">•</span>
            <span className="tm-legal-meta-item">
              <strong>Applicable Laws:</strong> Indian Contract Act, 1872 &amp; IT Act, 2000
            </span>
            <span className="tm-legal-meta-divider">•</span>
            <span className="tm-legal-meta-item">
              <strong>Jurisdiction:</strong> Pune, Maharashtra, India
            </span>
          </div>
        </div>
      </div>

      {/* Main Content Body */}
      <main className="tm-legal-content-container">
        <div className="tm-legal-grid">
          {/* Table of Contents Sticky Sidebar */}
          <aside className="tm-legal-toc" aria-label="Terms of Service Sections">
            <div className="tm-legal-toc-card">
              <span className="tm-legal-toc-title">TABLE OF CONTENTS</span>
              <ul className="tm-legal-toc-list">
                <li><a href="#terms-1">1. Acceptance of Terms</a></li>
                <li><a href="#terms-2">2. Eligibility &amp; Registration</a></li>
                <li><a href="#terms-3">3. Account Security &amp; Prohibitions</a></li>
                <li><a href="#terms-4">4. Course Purchases &amp; UPI Payments</a></li>
                <li><a href="#terms-5">5. Course Access &amp; Live Classes</a></li>
                <li><a href="#terms-6">6. Intellectual Property &amp; Copyright</a></li>
                <li><a href="#terms-7">7. Cancellation &amp; Refund Policy</a></li>
                <li><a href="#terms-8">8. SEBI &amp; Educational Disclaimer</a></li>
                <li><a href="#terms-9">9. Limitation of Liability</a></li>
                <li><a href="#terms-10">10. Termination &amp; Suspension</a></li>
                <li><a href="#terms-11">11. Governing Law &amp; Jurisdiction</a></li>
              </ul>

              <div className="tm-legal-toc-box">
                <AlertTriangle size={16} className="tm-legal-toc-icon" />
                <p>
                  <strong>Notice:</strong> All enrollments are non-refundable by default. TradeMax is strictly an educational platform and does not provide financial advice.
                </p>
              </div>
            </div>
          </aside>

          {/* Article Sections */}
          <article className="tm-legal-article">
            {/* Section 1 */}
            <section id="terms-1" className="tm-legal-section">
              <h2 className="tm-section-heading">
                <span className="tm-section-num">01</span>
                <span>Acceptance of Terms</span>
              </h2>
              <p>
                These Terms and Conditions (&quot;Terms&quot;) constitute a legally binding agreement between you (the &quot;Student&quot;, &quot;User&quot;, or &quot;Subscriber&quot;) and <strong>TradeMax</strong> (&quot;TradeMax&quot;, &quot;we&quot;, &quot;us&quot;, or &quot;our&quot;), operating under <code>@trademax.mitwpu</code> in Pune, Maharashtra, India.
              </p>
              <p>
                By visiting our website, signing up for an account, enrolling in any training course, attending live sessions, or accessing educational materials, you agree to comply with and be bound by these Terms and our Privacy Policy. If you do not agree to these Terms, you must not access or use the platform.
              </p>
            </section>

            {/* Section 2 */}
            <section id="terms-2" className="tm-legal-section">
              <h2 className="tm-section-heading">
                <span className="tm-section-num">02</span>
                <span>Eligibility &amp; Account Registration</span>
              </h2>
              <ul className="tm-legal-list">
                <li><strong>Age Requirement:</strong> You must be at least 18 years of age, or have the express consent and supervision of a legal parent/guardian if a minor, to register an account or enroll in courses.</li>
                <li><strong>Accurate Information:</strong> You agree to provide true, current, and complete information during registration, including your genuine full name, email address, and mobile number.</li>
                <li><strong>Single-User Account:</strong> Every student account is granted strictly for individual personal use. You may not create shared accounts or register under false identities.</li>
              </ul>
            </section>

            {/* Section 3 */}
            <section id="terms-3" className="tm-legal-section">
              <h2 className="tm-section-heading">
                <span className="tm-section-num">03</span>
                <span>Account Security &amp; Prohibited Activities</span>
              </h2>
              <p>
                You are responsible for maintaining the confidentiality of your login credentials and for all activities that occur under your account. To maintain academic and technical integrity, you agree NOT to:
              </p>
              <ul className="tm-legal-list">
                <li><strong>Share Credentials:</strong> Share, sell, rent, lease, or transfer your login access to any third party or peer.</li>
                <li><strong>Rip, Record or Capture Content:</strong> Record, screenshot, download, rip, or redistribute video lectures, presentations, or live class feeds using any capture software or device.</li>
                <li><strong>Reverse Engineering &amp; Scraping:</strong> Use automated bots, crawlers, scrapers, or scripts to extract course materials, student data, or proprietary code from TradeMax servers.</li>
                <li><strong>Disruptive Conduct:</strong> Engage in abusive, harassing, defaming, or disruptive behavior during live webinar sessions, class chat rooms, or student discussion channels.</li>
                <li><strong>Unauthorized Commercial Use:</strong> Commercialize, resell, or publicly broadcast any curriculum, trading systems, or materials provided by TradeMax.</li>
              </ul>
              <div className="tm-highlight-box">
                <div className="tm-box-title">
                  <AlertTriangle size={18} color="#dc2626" />
                  <span>Consequences of Violation</span>
                </div>
                <p>
                  Any violation of account security or copyright provisions will lead to <strong>immediate, permanent termination</strong> of portal access without any refund, and will result in statutory legal proceedings under the <strong>Indian Copyright Act, 1957</strong> and the <strong>Information Technology Act, 2000</strong>.
                </p>
              </div>
            </section>

            {/* Section 4 */}
            <section id="terms-4" className="tm-legal-section">
              <h2 className="tm-section-heading">
                <span className="tm-section-num">04</span>
                <span>Course Purchases, Payments &amp; Manual Verification</span>
              </h2>
              <p>
                TradeMax utilizes an institutional manual payment verification workflow via UPI QR scan:
              </p>
              <ul className="tm-legal-list">
                <li><strong>Fee Payment:</strong> Course fees must be paid in full using any supported Indian UPI application (Google Pay, PhonePe, Paytm, BHIM, etc.) by scanning TradeMax’s official QR code.</li>
                <li><strong>Submission of Proof:</strong> After initiating the transaction, students must submit the authentic <strong>12-digit UPI transaction reference (UTR)</strong> and upload a clear screenshot of the successful transaction receipt.</li>
                <li><strong>Administrative Review:</strong> All payment claims undergo manual verification by the TradeMax administration to reconcile receipts against bank records before enrollment is approved and course access is unlocked.</li>
                <li><strong>Zero Tolerance for Forgery:</strong> Submitting fake, altered, borrowed, or recycled UTR numbers, or forged payment receipts constitutes fraud under the <strong>Bharatiya Nyaya Sanhita (BNS) / Indian Penal Code</strong> and Section 66D of the IT Act. Offenders will be permanently banned and reported to relevant authorities.</li>
              </ul>
            </section>

            {/* Section 5 */}
            <section id="terms-5" className="tm-legal-section">
              <h2 className="tm-section-heading">
                <span className="tm-section-num">05</span>
                <span>Course Access &amp; Live Classes</span>
              </h2>
              <ul className="tm-legal-list">
                <li><strong>Curriculum Duration:</strong> Access to recorded courses, study materials, and community features is granted for the specific enrollment tenure associated with the purchased course tier.</li>
                <li><strong>Live Classes &amp; Scheduling:</strong> Live sessions are conducted according to the published batch schedule. TradeMax reserves the right to reschedule sessions due to unforeseen logistical, technical, or faculty emergencies, with prior notice to enrolled students.</li>
                <li><strong>Technical Requirements:</strong> Students are responsible for securing stable internet connectivity, compatible browsers, and suitable devices to attend live classes and stream video lectures.</li>
              </ul>
            </section>

            {/* Section 6 */}
            <section id="terms-6" className="tm-legal-section">
              <h2 className="tm-section-heading">
                <span className="tm-section-num">06</span>
                <span>Intellectual Property &amp; Copyright</span>
              </h2>
              <p>
                All content published or delivered by TradeMax—including but not limited to video tutorials, course outlines, slide decks, algorithmic trading setups, proprietary indicators, technical analysis guides, graphics, website software, and the TradeMax logo—is the exclusive intellectual property of TradeMax and protected by the <strong>Copyright Act, 1957</strong> and trademark laws of India.
              </p>
              <p>
                You are granted a limited, personal, non-exclusive, non-transferable, revocable license strictly for private study. You may not copy, reproduce, broadcast, display, or create derivative works from TradeMax content without prior written permission.
              </p>
            </section>

            {/* Section 7: REFUND POLICY (High priority section) */}
            <section id="terms-7" ref={refundSectionRef} className="tm-legal-section">
              <h2 className="tm-section-heading">
                <span className="tm-section-num">07</span>
                <span>Cancellation &amp; Refund Policy</span>
              </h2>

              <div className="tm-highlight-box tm-box-neutral">
                <div className="tm-box-title">
                  <Lock size={18} color="#dc2626" />
                  <span>Default Non-Refundable Policy</span>
                </div>
                <p>
                  <strong>All course registrations, batch enrollments, and payments made to TradeMax are strictly non-refundable by default.</strong> Because course seats in each batch are limited and digital intellectual property and live class access are provisioned immediately upon approval, no general refunds, course cancellations, or transfers are permitted once a payment is made.
                </p>
              </div>

              <h3 style={{ fontSize: '17px', fontWeight: '800', margin: '20px 0 10px', color: 'var(--tm-text-primary, #FFFFFF)' }}>
                Exceptional Circumstances Considered for Refunds
              </h3>
              <p>
                Refunds will be considered <strong>only and exclusively</strong> when a verified, genuine issue occurs due to a direct fault on TradeMax’s part. Such qualifying circumstances are strictly limited to:
              </p>

              <div className="tm-legal-cards-group">
                <div className="tm-info-card">
                  <div className="tm-info-card-header">
                    <span className="tm-info-dot" />
                    <h3>1. Duplicate / Double Debits</h3>
                  </div>
                  <p>
                    Where a student is debited multiple times for the exact same batch registration due to a technical error, and TradeMax’s bank account confirms receipt of the duplicate funds.
                  </p>
                </div>

                <div className="tm-info-card">
                  <div className="tm-info-card-header">
                    <span className="tm-info-dot" />
                    <h3>2. Failed Course Access Provisioning</h3>
                  </div>
                  <p>
                    Where a student has made a successful, verified payment, but TradeMax is completely unable to grant access to the course portal or live batch, and the issue cannot be resolved by technical support.
                  </p>
                </div>

                <div className="tm-info-card">
                  <div className="tm-info-card-header">
                    <span className="tm-info-dot" />
                    <h3>3. Unresolvable Platform Technical Failure</h3>
                  </div>
                  <p>
                    Where a prolonged and verified technical defect originating solely on TradeMax’s servers permanently prevents the delivery of the educational service, and TradeMax is unable to rectify it within seven (7) working days.
                  </p>
                </div>
              </div>

              <h3 style={{ fontSize: '17px', fontWeight: '800', margin: '20px 0 10px', color: 'var(--tm-text-primary, #FFFFFF)' }}>
                Mandatory Review &amp; Approval Process
              </h3>
              <ul className="tm-legal-list">
                <li><strong>Time Window:</strong> Eligible refund requests must be formally submitted in writing within <strong>48 hours</strong> of the transaction or occurrence of the issue.</li>
                <li><strong>Evidence Required:</strong> The student must furnish the original bank debit statement, 12-digit UTR reference, payment screenshot, and a detailed description of the issue.</li>
                <li><strong>Administrative Discretion:</strong> Every refund request is reviewed on a case-by-case basis and is subject to the <strong>sole discretion and written approval of TradeMax Administration</strong>.</li>
                <li><strong>Ineligible Requests:</strong> No refunds will be provided for:
                  <ul>
                    <li>Change of mind, scheduling conflicts, or personal emergencies;</li>
                    <li>Failure to attend scheduled live classes or watch recorded lessons;</li>
                    <li>Dissatisfaction resulting from individual trading performance or capital loss in financial markets;</li>
                    <li>Accounts terminated due to copyright infringement or conduct violations.</li>
                  </ul>
                </li>
                <li><strong>Processing:</strong> Approved refunds will be credited back exclusively to the original bank account / UPI VPA from which the payment originated within 7–10 business days.</li>
              </ul>
            </section>

            {/* Section 8: SEBI & EDUCATIONAL DISCLAIMER */}
            <section id="terms-8" className="tm-legal-section">
              <h2 className="tm-section-heading">
                <span className="tm-section-num">08</span>
                <span>Educational Disclaimers &amp; SEBI Regulatory Notice</span>
              </h2>
              <div className="tm-highlight-box">
                <div className="tm-box-title">
                  <AlertTriangle size={18} color="#ef4444" />
                  <span>Mandatory Statutory Disclaimer</span>
                </div>
                <p>
                  <strong>1. Educational Purposes Only:</strong> TradeMax is an independent educational training initiative designed solely to impart financial literacy, technical analysis methodologies, risk management frameworks, and trading mindset concepts.
                </p>
                <p>
                  <strong>2. Not SEBI Registered Advisors:</strong> TradeMax, its mentors, instructors, affiliates, and representatives are <strong>NOT registered with the Securities and Exchange Board of India (SEBI)</strong> as Investment Advisers (RIA) or Research Analysts (RA).
                </p>
                <p>
                  <strong>3. No Financial Advice or Stock Tips:</strong> Nothing contained in our video lectures, live classes, chart walkthroughs, Telegram/WhatsApp communications, or portal materials should be construed as financial advice, investment advice, portfolio management, stock tips, buy/sell recommendations, or promises of guaranteed returns.
                </p>
                <p>
                  <strong>4. Capital Risk Disclosure:</strong> Trading and investing in equities, derivatives (futures and options), commodities, and foreign exchange involve significant financial risk, including the possible loss of principal capital. Past results shown in examples or case studies are purely illustrative and do not guarantee future profitability. You are solely responsible for all financial and trading decisions you execute.
                </p>
              </div>
            </section>

            {/* Section 9 */}
            <section id="terms-9" className="tm-legal-section">
              <h2 className="tm-section-heading">
                <span className="tm-section-num">09</span>
                <span>Limitation of Liability &amp; Indemnity</span>
              </h2>
              <p>
                To the maximum extent permitted by applicable Indian law:
              </p>
              <ul className="tm-legal-list">
                <li>TradeMax shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits, trading capital, data, or business opportunities arising out of your access to or use of the platform.</li>
                <li>TradeMax’s aggregate liability for all claims related to any course enrollment shall not exceed the actual fee paid by you for that specific course.</li>
                <li>You agree to indemnify and hold harmless TradeMax, its founders, mentors, and administrators against any claims, losses, or legal costs arising from your breach of these Terms, your unauthorized use of materials, or your personal trading activities.</li>
              </ul>
            </section>

            {/* Section 10 */}
            <section id="terms-10" className="tm-legal-section">
              <h2 className="tm-section-heading">
                <span className="tm-section-num">10</span>
                <span>Termination &amp; Suspension</span>
              </h2>
              <p>
                TradeMax reserves the right to temporarily suspend or permanently terminate your account and portal access without notice if:
              </p>
              <ul className="tm-legal-list">
                <li>You violate any provision of these Terms or the Privacy Policy;</li>
                <li>You engage in fraudulent payment claims, screen recording, or unauthorized distribution of course content;</li>
                <li>You engage in behavior detrimental to the learning environment or community.</li>
              </ul>
              <p>
                Upon termination, your license to access curriculum materials terminates immediately, and no refund shall be provided.
              </p>
            </section>

            {/* Section 11 */}
            <section id="terms-11" className="tm-legal-section">
              <h2 className="tm-section-heading">
                <span className="tm-section-num">11</span>
                <span>Governing Law &amp; Jurisdiction</span>
              </h2>
              <p>
                These Terms and Conditions shall be governed by, construed, and enforced in accordance with the laws of the Republic of India, without regard to conflict of law principles.
              </p>
              <p>
                Any dispute, controversy, or claim arising out of or relating to these Terms, course enrollments, or the TradeMax platform shall be subject to the <strong>exclusive jurisdiction of the competent courts situated in Pune, Maharashtra, India</strong>.
              </p>

              <div className="tm-grievance-card">
                <div className="tm-grievance-title">LEGAL COMMUNICATIONS &amp; DISPUTE DESK</div>
                <div className="tm-grievance-grid">
                  <div className="tm-grievance-item">
                    <span className="label">Organization:</span>
                    <strong>TradeMax</strong>
                  </div>
                  <div className="tm-grievance-item">
                    <span className="label">Jurisdiction:</span>
                    <strong>Pune, Maharashtra, India</strong>
                  </div>
                  <div className="tm-grievance-item">
                    <span className="label">Official Instagram:</span>
                    <a
                      href="https://www.instagram.com/trademax.mitwpu/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="tm-legal-ext-link"
                    >
                      @trademax.mitwpu <ExternalLink size={12} />
                    </a>
                  </div>
                  <div className="tm-grievance-item">
                    <span className="label">Contact Line:</span>
                    <a href="tel:8799026206" className="tm-legal-ext-link">
                      +91 8799026206
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

export default TermsConditionsPage;
