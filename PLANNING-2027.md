# 2027 Planning Notes

## Spanish-language letters

*Recorded 2026-09-24.*

### Current state

- **The letter body already generates in Spanish.** The `/create` form offers 12 languages, including Español (`app/create/page.tsx`), and pre-selects one when the visitor's browser language matches. The prompt in `app/api/generate/route.ts` then instructs the model to write the whole letter in that language. The code is saved in `letters.language`.
- **Nothing else uses the language.** All four places a letter appears are hard-coded in English:
  - the on-screen letter (`app/preview/page.tsx`)
  - the free-letter email (`lib/resend.ts`)
  - the premium PDF (`lib/pdf.ts`)
  - the posted letter (`lib/letter-html.ts`)

  The English parts are the greeting ("Dear {name},"), the sign-off, headings, the date format and stamps such as "NICE LIST APPROVED". A Spanish letter therefore arrives as a Spanish body inside an English frame. The PDF also only recognises a closing "P.S.", so a Spanish "P.D." loses its styling.
- **Spanish greetings need the child's gender,** which the form doesn't collect: "Querido Mateo" but "Querida Sofía".
- **No demand so far.** Of 24 letters as of 2026-09-24, none was in a language other than English. That includes all 17 real letters from visitors, even though the dropdown is offered to everyone.

### Fix scope

1. Put the English frame strings in one lookup table keyed by language code, and have all four places read from it using `letters.language`. That table also covers the date format and the P.D. check.
2. For non-English letters, have the model write the greeting itself, which avoids needing gender on the form.
3. Later: translate the surrounding emails (the free letter and the Day 3/7/14 sequence), the upgrade page and the checkout copy.

### Test demand before or alongside the fix

No one has yet completed a letter in another language, so demand is untested. Consider a Spanish-language SEO post or an outreach wave first, or run one alongside the fix.
