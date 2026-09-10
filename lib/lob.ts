import { ChildInfo } from '@/types'
import { createClient } from '@supabase/supabase-js'
import { MailAddress, buildLetterHtml } from '@/lib/letter-html'

const LOB_API_URL = 'https://api.lob.com/v1'

function getSupabaseAdmin() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

async function uploadHtmlToSupabase(html: string, fileName: string): Promise<string> {
  const supabase = getSupabaseAdmin()
  const buffer = Buffer.from(html, 'utf-8')
  const { error } = await supabase.storage
    .from('lob-letters')
    .upload(fileName, buffer, { contentType: 'text/html', upsert: true })
  if (error) throw new Error('Supabase upload error: ' + error.message)
  const { data } = supabase.storage.from('lob-letters').getPublicUrl(fileName)
  return data.publicUrl
}

export async function sendPhysicalLetter(
  toAddress: MailAddress,
  child: ChildInfo,
  letter: { content: string; childName: string; createdAt: string }
): Promise<{ id: string; expectedDelivery: string }> {
  const auth = Buffer.from(`${process.env.LOB_API_KEY}:`).toString('base64')
  const html = buildLetterHtml(child, letter.content, toAddress)
  const fileName = 'letter-' + child.name.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now() + '.html'
  const fileUrl = await uploadHtmlToSupabase(html, fileName)

  const response = await fetch(`${LOB_API_URL}/letters`, {
    method: 'POST',
    headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      description: `Santa's letter for ${child.name}`,
      to: toAddress,
      from: {
        name: 'Santa Claus — North Pole Post Office',
        address_line1: '1 North Pole Way',
        address_city: 'North Pole',
        address_state: 'AK',
        address_zip: '99705',
        address_country: 'US',
      },
      file: fileUrl,
      color: true,
      double_sided: false,
      mail_type: 'usps_first_class',
      use_type: 'operational',
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(`Lob API error: ${JSON.stringify(error)}`)
  }

  const data = await response.json()
  return { id: data.id, expectedDelivery: data.expected_delivery_date }
}

