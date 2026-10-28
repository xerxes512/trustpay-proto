# TrustPay Investor Prototype

## What TrustPay is
TrustPay is a **proposed** Nigerian transaction coordination platform for phone and electronics vendors and their buyers. A vendor shares an offer link, both sides agree terms, and the transaction follows recorded stages: payment record, dispatch, delivery confirmation, a three-hour inspection window, then completion or dispute review.

## What the prototype demonstrates
Landing page, How It Works, vendor and buyer dashboards, a 3-step create-transaction form with a shareable link, the buyer offer page (accept / request changes / decline), locked accepted terms, a payment stage, dispatch, delivery confirmation, a countdown that survives refresh, problem reporting, dispute review states, and an investor overview.

## What is simulated
Payment confirmation, dispatch, delivery, completion checks, evidence and dispute outcomes. These are triggered from the **Demonstration controls** panel on each transaction page. Everything is sample data stored in your browser.

## What is NOT implemented
Real payments, holding of funds, payouts, refunds, identity or business verification, delivery-provider links, real accounts or login, a real dispute team, a backend or database, file uploads (attachment names only are listed).

## Files
- `index.html` – page shell
- `styles.css` – design system (palette from the brief)
- `state.js` – transaction data, allowed status changes, business rules (no screen code)
- `app.js` – screens and navigation
- `assets/logo.svg` – replaceable logo
- `README.md` – this file

Why `state.js` is separate: it keeps the rules apart from the visuals, so a real server can later replace it.

## Run it on a computer
Unzip the folder and double-click `index.html`. It opens in your browser. No installation needed.

## Preview on an iPhone
1. Easiest: upload the folder to a free static host (GitHub Pages, Netlify Drop, or Cloudflare Pages) and open the link in Safari.
2. Or open the files from the Files app. Safari may not run local scripts reliably, so hosting is more dependable.
Links created inside the prototype only work in the same browser, because data is stored locally.

## Reset sample data
Scroll to the footer and tap **Reset demonstration**, then confirm.

## Known limitations
- Data lives in `localStorage`, which is not secure and is per device.
- Rules are checked in the browser only. A real product must enforce them on a server.
- The inspection countdown uses the device clock.
- No desktop sidebar (shared top navigation is used at every size).
- Not tested on a physical iPhone or Android phone, only a phone-sized browser window.
- Dispute stage "Closed" is available after "Resolved".
- Inter font loads from Google Fonts when online; a system font is used otherwise.

## Recommended next steps
Test on real phones, interview vendors, get legal advice on payments and fund handling, choose a payment provider, build a backend with real login and a database, add audit logging, then run a small controlled pilot.

## Moving to a laptop and GitHub
Copy the folder to your laptop. Create a free GitHub account, make a new repository, and use "Add file > Upload files" to drag the folder contents in. Turn on GitHub Pages in the repository settings to get a public link.

## Glossary
- **Frontend**: what users see and tap in the browser.
- **Backend**: the server side that stores data and enforces rules. Not built yet.
- **Database**: where a backend keeps records permanently.
- **API**: a defined way for programs to talk to each other, such as to a payment provider.
- **localStorage**: a small store inside your browser. Not secure, cleared if you clear browser data.
- **Payment integration**: connecting to a licensed payment provider so real money can move. Not built.
