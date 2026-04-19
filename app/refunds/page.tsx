export default function RefundsPage() {
    return (
      <main style={{ minHeight: '100vh', background: '#fdf6e3', fontFamily: 'Georgia, serif', color: '#2c1a0e', padding: '60px 24px 100px' }}>
        <div style={{ maxWidth: 780, margin: '0 auto' }}>
  
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <a href="/" style={{ textDecoration: 'none', fontFamily: "'Playfair Display', Georgia, serif", fontSize: 22, color: '#6B0F0F', letterSpacing: '0.05em' }}>SantasLetter.ai</a>
            <div style={{ height: 2, background: 'linear-gradient(90deg, transparent, #c8922a 30%, #d4aa5a 50%, #c8922a 70%, transparent)', margin: '16px 0 0' }} />
          </div>
  
          <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 32, color: '#6B0F0F', fontWeight: 400, marginBottom: 8 }}>Refunds & Delivery</h1>
          <p style={{ fontSize: 13, color: 'rgba(44,26,14,0.5)', marginBottom: 40, fontStyle: 'italic' }}>Last updated: April 19, 2026</p>
  
          {[
            {
              title: 'Digital Products — PDF Letters',
              content: `PDF letters are delivered instantly to your email address upon successful payment.
  
  Because digital products are delivered immediately, all PDF sales are final and non-refundable once the file has been sent to your inbox.
  
  If you did not receive your PDF within 10 minutes of purchase, please check your spam folder and then contact us at hello@santasletter.ai — we will resend it promptly.
  
  If a technical error on our end prevented delivery, we will resolve it immediately or issue a full refund.`,
            },
            {
              title: 'Physical Letters — Printing & Postage',
              content: `Physical letters are printed and dispatched within 1–2 business days of your order via USPS First Class Mail.
  
  Estimated delivery times:
  - United States: 5–10 business days
  - United Kingdom, Canada, Australia: 10–21 business days
  - Europe: 10–21 business days
  - Other international: 14–28 business days
  
  These are estimates and not guarantees. Delays caused by postal services, customs, or circumstances beyond our control are outside our responsibility.`,
            },
            {
              title: 'Christmas Delivery Guarantee',
              content: `We strongly recommend ordering physical letters by December 15 for delivery before Christmas Day.
  
  We cannot guarantee Christmas delivery for physical orders placed after December 15, due to postal service volumes during the holiday period. Digital PDFs are always delivered instantly regardless of the time of year.`,
            },
            {
              title: 'Physical Letter Refunds',
              content: `If your physical letter does not arrive within 14 days of your expected delivery date, please contact us at hello@santasletter.ai and we will arrange either a reprint and repost, or a full refund — your choice.
  
  If your letter arrives damaged, please send us a photo and we will reprint and repost at no charge.
  
  We are unable to offer refunds for letters that were delivered successfully to the correct address.`,
            },
            {
              title: 'Wrong Address',
              content: `Please double-check your shipping address at checkout. We are unable to reroute or refund orders that were dispatched to an address entered incorrectly by the customer.
  
  If you notice an error immediately after ordering, contact us at hello@santasletter.ai as quickly as possible and we will do our best to correct it before dispatch.`,
            },
            {
              title: 'Contact Us',
              content: `For any questions about your order, refund, or delivery, please contact us at:
  
  hello@santasletter.ai
  
  We aim to respond to all enquiries within 24 hours.`,
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
            <a href="/privacy" style={{ color: '#6B0F0F', fontSize: 13, marginRight: 24, textDecoration: 'none' }}>Privacy Policy</a>
            <a href="/terms" style={{ color: '#6B0F0F', fontSize: 13, marginRight: 24, textDecoration: 'none' }}>Terms of Service</a>
            <a href="/" style={{ color: '#6B0F0F', fontSize: 13, textDecoration: 'none' }}>← Back to SantasLetter.ai</a>
          </div>
  
        </div>
      </main>
    )
  }