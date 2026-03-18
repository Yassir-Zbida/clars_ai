import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service — Clars.ai',
  description: 'Terms and conditions governing your use of Clars.ai.',
};

const css = `
/* ─── DESIGN TOKENS ─────────────────────────────── */
:root {
  --bg:           hsl(0 0% 0%);
  --fg:           hsl(0 0% 96%);
  --card:         hsl(0 0% 7%);
  --card-el:      hsl(0 0% 13.3%);
  --primary:      hsl(84 76% 55%);
  --primary-dim:  hsl(84 76% 40%);
  --primary-glow: hsla(84, 76%, 55%, 0.18);
  --primary-fg:   hsl(0 0% 0%);
  --secondary:    hsl(0 0% 13.3%);
  --muted:        hsl(0 0% 13.3%);
  --muted-fg:     hsl(0 0% 62%);
  --border:       hsl(0 0% 20%);
  --surface:      hsl(0 0% 6.7%);
  --radius:       0.5rem;
}

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

body {
  font-family: 'DM Sans', system-ui, sans-serif;
  background: var(--bg);
  color: var(--fg);
  line-height: 1.65;
  overflow-x: hidden;
  -webkit-font-smoothing: antialiased;
}

/* ─── BUTTONS ─── */
.cl-btn-primary {
  display: inline-flex; align-items: center; gap: 8px;
  background: var(--primary); color: var(--primary-fg);
  padding: 13px 26px; border-radius: var(--radius);
  font-size: 14px; font-weight: 700; text-decoration: none; border: none; cursor: pointer;
  transition: background .2s, transform .2s, box-shadow .2s;
}
.cl-btn-primary:hover {
  background: hsl(84, 76%, 62%); transform: translateY(-2px);
  box-shadow: 0 8px 32px var(--primary-glow);
}
.cl-btn-ghost {
  display: inline-flex; align-items: center; gap: 8px;
  background: transparent; color: var(--fg);
  padding: 12px 22px; border-radius: var(--radius);
  font-size: 14px; font-weight: 500; text-decoration: none;
  border: 1px solid var(--border); cursor: pointer;
  transition: border-color .2s, color .2s;
}
.cl-btn-ghost:hover { border-color: var(--primary); color: var(--primary); }

/* ─── NAV ─── */
.cl-nav {
  position: fixed; top: 0; left: 0; right: 0; z-index: 999;
  background: hsla(0, 0%, 0%, 0.7);
  backdrop-filter: blur(24px);
  border-bottom: 1px solid var(--border);
  transition: background .3s, transform .5s cubic-bezier(0.16,1,0.3,1);
  will-change: transform;
}
.cl-nav--hidden {
  transform: translateY(-110%);
  pointer-events: none;
}
.cl-nav-inner {
  max-width: 1280px; margin: 0 auto; padding: 0 28px;
  display: flex; align-items: center; justify-content: space-between;
  height: 64px; gap: 32px;
}
.cl-nav-logo { display: flex; align-items: center; gap: 10px; text-decoration: none; }
.cl-nav-links { display: flex; align-items: center; gap: 4px; }
.cl-nav-links a {
  font-size: 15px; font-weight: 500; color: var(--muted-fg);
  text-decoration: none; padding: 8px 16px; border-radius: 6px;
  transition: color .2s;
}
.cl-nav-links a:hover, .cl-nav-links a.active { color: var(--primary); }
.cl-nav-actions { display: flex; align-items: center; gap: 10px; }
.cl-nav-actions .cl-btn-primary { padding: 9px 18px; font-size: 13px; }
.cl-nav-actions .cl-btn-ghost   { padding: 8px 18px;  font-size: 13px; }

/* ─── CONTAINER ─── */
.cl-container { max-width: 1280px; margin: 0 auto; padding: 0 28px; }

/* ─── FOOTER ─── */
.cl-footer { overflow: hidden; background: var(--bg); }
.cl-footer-card {
  margin: 0;
  background: hsl(0,0%,9%);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 40px 48px;
  display: flex; align-items: center; justify-content: space-between;
  gap: 32px; flex-wrap: wrap;
}
.cl-footer-card-left h4 {
  font-size: 20px; font-weight: 800; letter-spacing: -.4px;
  margin-bottom: 10px; color: var(--fg);
}
.cl-footer-card-left p {
  font-size: 14px; color: var(--muted-fg); line-height: 1.65;
  max-width: 380px;
}
.cl-footer-chat-btn {
  display: flex; align-items: center; gap: 14px;
  background: hsl(0,0%,13%);
  border: 1px solid var(--border);
  border-radius: 12px; padding: 14px 18px;
  text-decoration: none;
  transition: border-color .2s, background .2s;
  flex-shrink: 0;
}
.cl-footer-chat-btn:hover {
  border-color: hsla(84,76%,55%,0.4);
  background: hsl(0,0%,16%);
}
.cl-footer-chat-icon {
  width: 42px; height: 42px; border-radius: 10px;
  background: var(--primary);
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.cl-footer-chat-icon i { font-size: 20px; color: #000; }
.cl-footer-chat-text { display: flex; flex-direction: column; gap: 2px; }
.cl-footer-chat-text strong { font-size: 14px; font-weight: 700; color: var(--fg); }
.cl-footer-chat-text span   { font-size: 12px; color: var(--muted-fg); }
.cl-footer-chat-arrow {
  width: 32px; height: 32px; border-radius: 50%;
  background: var(--primary-glow); border: 1px solid hsla(84,76%,55%,0.25);
  display: flex; align-items: center; justify-content: center;
}
.cl-footer-chat-arrow i { font-size: 16px; color: var(--primary); }
.cl-footer-bottom {
  display: grid; grid-template-columns: 1fr auto auto;
  gap: 48px; align-items: start;
  padding: 36px 0 48px;
  border-top: 1px solid var(--border);
  margin-top: 48px;
}
.cl-footer-copy { font-size: 15px; color: hsl(0,0%,70%); line-height: 1.5; font-weight: 500; }
.cl-footer-nav-col { display: flex; flex-direction: column; gap: 2px; }
.cl-footer-nav-col a, .cl-footer-social-col a {
  font-size: 15px; color: hsl(0,0%,65%);
  text-decoration: none; padding: 5px 0;
  transition: color .15s; display: flex; align-items: center; gap: 8px;
}
.cl-footer-nav-col a:hover, .cl-footer-social-col a:hover { color: var(--fg); }
.cl-footer-social-col { display: flex; flex-direction: column; gap: 2px; }
.cl-footer-social-col a i { font-size: 15px; }
@media(max-width:768px) {
  .cl-footer-card { flex-direction: column; padding: 28px 24px; }
  .cl-footer-bottom { grid-template-columns: 1fr; gap: 28px; }
}
@media(max-width:640px) {
  .cl-nav-links { display: none; }
  .cl-nav-actions .cl-btn-ghost { display: none; }
}

/* ─── TERMS CONTENT ─── */
.pp-page {
  max-width: 1280px; margin: 0 auto;
  padding: 112px 28px 96px;
}
.pp-header {
  margin-bottom: 56px;
  border-bottom: 1px solid var(--border);
  padding-bottom: 48px;
}
.pp-title {
  font-size: clamp(24px, 3vw, 32px);
  font-weight: 800; letter-spacing: -.5px; line-height: 1.15;
  margin-bottom: 16px;
}
.pp-title em { font-style: normal; color: var(--primary); }
.pp-meta { font-size: 14px; color: var(--muted-fg); }
.pp-meta strong { color: var(--fg); font-weight: 600; }
.pp-intro {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 28px 32px;
  font-size: 15px; color: hsl(0,0%,75%); line-height: 1.8;
  margin-bottom: 64px;
}
.pp-section { margin-bottom: 52px; }
.pp-section-num {
  font-size: 22px; font-weight: 800; letter-spacing: -.4px;
  color: var(--primary); margin-bottom: 10px;
}
.pp-section h2 {
  font-size: 22px; font-weight: 800; letter-spacing: -.4px;
  margin-bottom: 20px; line-height: 1.2;
}
.pp-section h3 {
  font-size: 15px; font-weight: 700; color: var(--fg);
  margin: 28px 0 12px;
}
.pp-section p {
  font-size: 15px; color: hsl(0,0%,72%); line-height: 1.8;
  margin-bottom: 14px;
}
.pp-section p:last-child { margin-bottom: 0; }
.pp-list {
  list-style: none; padding: 0;
  display: flex; flex-direction: column; gap: 10px;
  margin: 16px 0;
}
.pp-list li {
  display: flex; align-items: flex-start; gap: 12px;
  font-size: 15px; color: hsl(0,0%,72%); line-height: 1.75;
}
.pp-list li::before {
  content: '';
  width: 6px; height: 6px; border-radius: 50%;
  background: var(--primary); flex-shrink: 0; margin-top: 9px;
}
.pp-divider { border: none; border-top: 1px solid var(--border); margin: 0 0 52px; }
`;

export default function TermsPage() {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: css }} />

      {/* ══ NAV ══ */}
      <nav className="cl-nav" id="main-nav">
        <div className="cl-nav-inner">
          <a href="/" className="cl-nav-logo">
            <img src="/logo.svg" alt="Clars.ai" className="h-8 w-auto" />
          </a>
          <div className="cl-nav-links">
            <a href="/#features">Features</a>
            <a href="/#how">How It Works</a>
            <a href="/#pricing">Pricing</a>
            <a href="/#faq">FAQ</a>
          </div>
          <div className="cl-nav-actions">
            <a href="/signup" className="cl-btn-primary"><i className="ri-arrow-right-up-line" /> Start Free</a>
          </div>
        </div>
      </nav>
      {/* Hide-on-scroll-down / reveal-on-scroll-up */}
      <script dangerouslySetInnerHTML={{ __html: `
        (function(){
          var nav = document.getElementById('main-nav');
          var lastY = 0, hidden = false, ticking = false;
          window.addEventListener('scroll', function(){
            if(!ticking){ requestAnimationFrame(function(){
              var y = window.scrollY;
              nav.style.background = y > 60 ? 'hsla(0,0%,4%,0.96)' : 'hsla(0,0%,0%,0.7)';
              if(y - lastY > 6 && !hidden && y > 80){
                hidden = true; nav.classList.add('cl-nav--hidden');
              } else if(lastY - y > 6 && hidden){
                hidden = false; nav.classList.remove('cl-nav--hidden');
              }
              lastY = y; ticking = false;
            }); ticking = true; }
          }, { passive: true });
        })();
      `}} />

      {/* ══ CONTENT ══ */}
      <main className="pp-page">

        <div className="pp-header">
          <h1 className="pp-title">Terms of <em>Service</em></h1>
          <p className="pp-meta">
            <strong>Last updated:</strong> March 20, 2026
          </p>
        </div>

        <div className="pp-intro">
          Please read these Terms of Service (&ldquo;Terms&rdquo;) carefully before using Clars.ai. By accessing or using our website and services (collectively, the &ldquo;Service&rdquo;), you agree to be bound by these Terms. If you do not agree, do not use the Service.
        </div>

        {/* 01 */}
        <div className="pp-section">
          <div className="pp-section-num">01</div>
          <h2>Acceptance of Terms</h2>
          <p>
            By creating an account or using the Service in any way, you confirm that you are at least 18 years old (or the age of majority in your jurisdiction), that you have read and understood these Terms, and that you agree to be bound by them.
          </p>
          <p>
            If you are using the Service on behalf of an organization, you represent that you have authority to bind that organization to these Terms.
          </p>
        </div>

        <hr className="pp-divider" />

        {/* 02 */}
        <div className="pp-section">
          <div className="pp-section-num">02</div>
          <h2>Use of the Service</h2>
          <p>You agree to use Clars.ai only for lawful purposes and in accordance with these Terms. You must not:</p>
          <ul className="pp-list">
            <li>Use the Service in any way that violates applicable laws or regulations</li>
            <li>Transmit any unsolicited or unauthorized advertising or spam</li>
            <li>Attempt to gain unauthorized access to any part of the Service or its infrastructure</li>
            <li>Interfere with or disrupt the integrity or performance of the Service</li>
            <li>Reverse engineer, decompile, or attempt to extract the source code of the Service</li>
            <li>Use the Service to store or transmit malicious code</li>
          </ul>
        </div>

        <hr className="pp-divider" />

        {/* 03 */}
        <div className="pp-section">
          <div className="pp-section-num">03</div>
          <h2>Your Account</h2>
          <p>
            You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You agree to notify us immediately of any unauthorized use of your account.
          </p>
          <p>
            We reserve the right to suspend or terminate accounts that violate these Terms or that we reasonably believe pose a risk to the Service or other users.
          </p>
        </div>

        <hr className="pp-divider" />

        {/* 04 */}
        <div className="pp-section">
          <div className="pp-section-num">04</div>
          <h2>Your Data &amp; Content</h2>
          <p>
            You retain ownership of all data and content you input into the Service, including contacts, deals, notes, and any other CRM data (&ldquo;Your Content&rdquo;).
          </p>
          <p>
            By using the Service, you grant Clars.ai a limited, non-exclusive license to process Your Content solely to provide and improve the Service. We do not claim ownership of Your Content and will not sell it to third parties.
          </p>
          <p>
            You are responsible for ensuring that Your Content complies with applicable laws and does not infringe any third-party rights.
          </p>
        </div>

        <hr className="pp-divider" />

        {/* 05 */}
        <div className="pp-section">
          <div className="pp-section-num">05</div>
          <h2>Subscriptions &amp; Billing</h2>
          <p>
            Certain features of the Service are available on a paid subscription basis. By subscribing, you agree to pay the applicable fees as described at the time of purchase.
          </p>
          <ul className="pp-list">
            <li>Subscriptions automatically renew unless cancelled before the renewal date</li>
            <li>You may cancel at any time; cancellation takes effect at the end of the current billing period</li>
            <li>Refunds are not provided for partial billing periods unless required by applicable law</li>
            <li>We reserve the right to change pricing with reasonable notice</li>
          </ul>
        </div>

        <hr className="pp-divider" />

        {/* 06 */}
        <div className="pp-section">
          <div className="pp-section-num">06</div>
          <h2>Intellectual Property</h2>
          <p>
            All rights, title, and interest in and to the Service (excluding Your Content) are and remain the exclusive property of Clars.ai and its licensors. Nothing in these Terms grants you a right to use Clars.ai&rsquo;s trademarks, logos, or branding without our prior written consent.
          </p>
        </div>

        <hr className="pp-divider" />

        {/* 07 */}
        <div className="pp-section">
          <div className="pp-section-num">07</div>
          <h2>Disclaimer of Warranties</h2>
          <p>
            The Service is provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo; without warranties of any kind, express or implied, including but not limited to warranties of merchantability, fitness for a particular purpose, or non-infringement.
          </p>
          <p>
            We do not warrant that the Service will be uninterrupted, error-free, or free of viruses or other harmful components.
          </p>
        </div>

        <hr className="pp-divider" />

        {/* 08 */}
        <div className="pp-section">
          <div className="pp-section-num">08</div>
          <h2>Limitation of Liability</h2>
          <p>
            To the fullest extent permitted by law, Clars.ai shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including loss of profits, data, or business opportunities, arising from your use of or inability to use the Service.
          </p>
          <p>
            Our total liability to you for any claim arising under these Terms shall not exceed the amount you paid to us in the twelve (12) months preceding the claim.
          </p>
        </div>

        <hr className="pp-divider" />

        {/* 09 */}
        <div className="pp-section">
          <div className="pp-section-num">09</div>
          <h2>Termination</h2>
          <p>
            Either party may terminate the relationship under these Terms at any time. Upon termination, your right to access the Service ceases immediately. You may request an export of Your Content before termination.
          </p>
          <p>
            We reserve the right to delete Your Content after a reasonable period following account termination.
          </p>
        </div>

        <hr className="pp-divider" />

        {/* 10 */}
        <div className="pp-section">
          <div className="pp-section-num">10</div>
          <h2>Changes to These Terms</h2>
          <p>
            We may update these Terms from time to time. If we make material changes, we will notify you by updating the &ldquo;Last updated&rdquo; date and, where appropriate, by notifying you via email or within the Service. Continued use of the Service after changes take effect constitutes acceptance of the revised Terms.
          </p>
        </div>

        <hr className="pp-divider" />

        {/* 11 */}
        <div className="pp-section">
          <div className="pp-section-num">11</div>
          <h2>Contact Us</h2>
          <p>
            If you have any questions about these Terms, please contact us at{' '}
            <a href="mailto:hello@clars.ai" style={{ color: 'var(--primary)', textDecoration: 'none' }}>
              hello@clars.ai
            </a>.
          </p>
        </div>

      </main>

      {/* ══ FOOTER ══ */}
      <footer className="cl-footer">
        <div className="cl-container">
          <div className="cl-footer-card">
            <div className="cl-footer-card-left">
              <h4>Would you like to talk to us?</h4>
              <p>We are moving fast, and your feedback is super important. Feel free to schedule a chat with our team =)</p>
            </div>
            <a href="/contact" className="cl-footer-chat-btn">
              <div className="cl-footer-chat-icon">
                <i className="ri-calendar-schedule-line" />
              </div>
              <div className="cl-footer-chat-text">
                <strong>Schedule a chat</strong>
                <span>with one of our founders</span>
              </div>
              <div className="cl-footer-chat-arrow">
                <i className="ri-arrow-right-s-line" />
              </div>
            </a>
          </div>

          <div className="cl-footer-bottom">
            <p className="cl-footer-copy">© 2026 Clars.ai</p>

            <nav className="cl-footer-nav-col">
              {[
                { label: 'Home',             href: '/' },
                { label: 'Features',         href: '/#features' },
                { label: 'Pricing',          href: '/#pricing' },
                { label: 'Log in',           href: '/login' },
                { label: 'Privacy Policy',   href: '/privacy' },
                { label: 'Terms of Service', href: '/terms' },
              ].map((l, i) => <a href={l.href} key={i}>{l.label}</a>)}
            </nav>

            <div className="cl-footer-social-col">
              {[
                { icon: 'ri-twitter-x-line', label: 'X / Twitter', href: '#' },
                { icon: 'ri-linkedin-line',  label: 'LinkedIn',    href: '#' },
                { icon: 'ri-instagram-line', label: 'Instagram',   href: '#' },
              ].map((s, i) => (
                <a href={s.href} key={i}><i className={s.icon} />{s.label}</a>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
