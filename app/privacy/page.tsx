export default function PrivacyPage() {
    return (
      <main style={{ minHeight: '100vh', background: '#fdf6e3', fontFamily: 'Georgia, serif', color: '#2c1a0e', padding: '60px 24px 100px' }}>
        <div style={{ maxWidth: 780, margin: '0 auto' }}>
  
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <a href="/" style={{ textDecoration: 'none', fontFamily: "'Playfair Display', Georgia, serif", fontSize: 22, color: '#6B0F0F', letterSpacing: '0.05em' }}>
              SantasLetter.ai
            </a>
            <div style={{ height: 2, background: 'linear-gradient(90deg, transparent, #c8922a 30%, #d4aa5a 50%, #c8922a 70%, transparent)', margin: '16px 0 0' }} />
          </div>
  
          <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 32, color: '#6B0F0F', fontWeight: 400, marginBottom: 8 }}>Privacy Policy</h1>
          <p style={{ fontSize: 13, color: 'rgba(44,26,14,0.5)', marginBottom: 40, fontStyle: 'italic' }}>Last updated: April 17, 2026</p>
  
          <p style={{ fontSize: 15, lineHeight: 1.85, marginBottom: 24 }}>
            SantasLetter.ai (&ldquo;we&rdquo;, &ldquo;us&rdquo;, or &ldquo;our&rdquo;) is committed to protecting the privacy of the families who use our service. This Privacy Policy explains how we collect, use, and safeguard your information when you visit santasletter.ai.
          </p>
  
          {[
            {
              title: '1. Information We Collect',
              content: `We collect information you provide directly to us, including:
  
  • Email address (required to deliver your free letter and any paid products)
  • Child information you enter into the letter form: first name, age, interests, and behaviour notes you choose to share
  • Payment information processed securely through Stripe — we never store card details
  • Shipping address when you order a physical letter (processed via Lob.com)
  
  We also collect limited technical data automatically: IP address, browser type, and pages visited, used solely for security and performance purposes.`
            },
            {
              title: '2. How We Use Your Information',
              content: `We use the information we collect to:
  
  • Generate and deliver your personalised Santa letter
  • Send your purchased PDF or physical letter
  • Send transactional emails related to your order
  • Improve our service and troubleshoot issues
  • Comply with legal obligations
  
  We do not use your information for advertising, and we do not sell your data to third parties under any circumstances.`
            },
            {
              title: '3. Children\'s Privacy (COPPA)',
              content: `SantasLetter.ai is designed for parents and guardians to create letters on behalf of children. We do not knowingly collect personal information directly from children under the age of 13.
  
  All information about a child (name, age, interests) is entered by a parent or guardian and is used solely to generate that child's personalised letter. We do not store child information beyond what is necessary to fulfil your order.
  
  If you believe we have inadvertently collected information from a child without parental consent, please contact us immediately at privacy@santasletter.ai and we will delete it promptly.`
            },
            {
              title: '4. Data Sharing',
              content: `We share your information only with trusted service providers necessary to operate our service:
  
  • Stripe — payment processing
  • Anthropic — AI letter generation (letter content only, no personal identifiers)
  • Resend — transactional email delivery
  • Lob.com — physical letter printing and mailing (shipping address only)
  • Supabase — secure data storage
  • Vercel — website hosting
  
  All service providers are contractually required to protect your data and may not use it for their own purposes.`
            },
            {
              title: '5. Data Retention',
              content: `We retain your email address and order history for as long as necessary to provide our service and comply with legal obligations. Letter content and child information is retained only as long as needed to fulfil your order.
  
  You may request deletion of your data at any time by emailing privacy@santasletter.ai.`
            },
            {
              title: '6. Your Rights (California Residents)',
              content: `Under the California Consumer Privacy Act (CCPA), California residents have the right to:
  
  • Know what personal information we collect and how it is used
  • Request deletion of your personal information
  • Opt out of the sale of personal information (we do not sell data)
  • Non-discrimination for exercising these rights
  
  To exercise any of these rights, contact us at privacy@santasletter.ai.`
            },
            {
              title: '7. Cookies',
              content: `We use minimal cookies necessary to operate the website, including session storage to remember your letter as you navigate between pages. We do not use advertising or tracking cookies.`
            },
            {
              title: '8. Security',
              content: `We implement industry-standard security measures to protect your information, including HTTPS encryption, secure payment processing via Stripe, and access controls on our databases. No method of transmission over the internet is 100% secure, but we take every reasonable precaution to protect your data.`
            },
            {
              title: '9. Changes to This Policy',
              content: `We may update this Privacy Policy from time to time. We will notify you of significant changes by updating the date at the top of this page. Continued use of our service after changes constitutes acceptance of the updated policy.`
            },
            {
              title: '10. Contact Us',
              content: `If you have any questions about this Privacy Policy or how we handle your data, please contact us at:
  
  privacy@santasletter.ai
  
  SantasLetter.ai
  California, United States`
            },
          ].map(({ title, content }) => (
            <div key={title} style={{ marginBottom: 36 }}>
              <h2 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 20, color: '#6B0F0F', fontWeight: 400, marginBottom: 12 }}>{title}</h2>
              <div style={{ height: 1, background: 'rgba(200,146,42,0.3)', marginBottom: 14 }} />
              {content.split('\n').map((line, i) => (
                <p key={i} style={{ fontSize: 14, lineHeight: 1.85, marginBottom: line.trim() === '' ? 8 : 6, color: '#2c1a0e' }}>{line}</p>
              ))}
            </div>
          ))}
  
          <div style={{ marginTop: 60, paddingTop: 24, borderTop: '1px solid rgba(200,146,42,0.3)', textAlign: 'center' }}>
            <a href="/terms" style={{ color: '#6B0F0F', fontSize: 13, marginRight: 24, textDecoration: 'none' }}>Terms of Service</a>
            <a href="/" style={{ color: '#6B0F0F', fontSize: 13, textDecoration: 'none' }}>← Back to SantasLetter.ai</a>
          </div>
  
        </div>
      </main>
    )
  }