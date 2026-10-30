# Email

Transactional, lifecycle and launch emails. Email clients are not browsers, so the rules below come first and the landing-page instincts second.

## Workflow

1. **One job, one action.** Write the subject, the preheader and the single thing the reader should do before designing anything.
2. **Pull 2-3 references** from [reallygoodemails.com](https://reallygoodemails.com), filtered by email type (welcome, receipt, digest, launch). Say what you take from each.
3. **Build** with `react-email`, or hand-written tables when the project doesn't use React.
4. **Check deliverability and compliance** with `email-best-practices`, and send with `resend`.
5. **Test** in Gmail, Apple Mail and Outlook for Windows, in light and dark mode, with images off.

## Direction

An email can have a point of view inside the constraints. Not a cream card with a serif headline and a table. Commit to one move: a full-width color band, a huge number in the system font, a reply-style plain note from a person. Say in one line why this email could only come from this product.

## Rules

- One column, 600 px wide at most. Lay out with tables: classic Outlook renders with Word, so no flex or grid.
- Inline CSS. `<style>` is only for dark mode and media queries.
- System font stack. A web font is a progressive enhancement, never required.
- A preheader that adds to the subject instead of repeating it.
- One primary action: a padded link styled as a button, at least 44 px tall. Never a picture of a button.
- No words inside images. Every image has `alt`, `width` and `height`, and the email still makes sense with images blocked.
- Declare `color-scheme`, and give a transparent logo a version that works on dark.
- Include a plain-text part. Stay under 102 KB: Gmail clips anything longer.
- Transactional: the fact first (order number, amount, date), then what to do. No promotions in a receipt.
- Marketing: a working unsubscribe link and a postal address.
- The house rules still apply: no gradient text, no em dashes, no invented numbers.
