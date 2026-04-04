# ShieldRoute
### AI-Powered Parametric Income Insurance for Gig Delivery Workers

> Guidewire DEVTrails 2026 Hackathon Submission
> Built week by week — this README tracks the full vision across all phases.

---

## The Big Idea

Every day, 5 million+ delivery riders on Zomato and Swiggy across India wake up with zero income protection. They are gig workers — no employer, no safety net, no sick leave. When a monsoon hits, when an AQI alert goes out, when a city-wide strike shuts down streets, or when a platform server goes down — their earnings go to zero. Immediately. For the whole day.

ShieldRoute fixes this with **parametric microinsurance**: a weekly policy that monitors real-world disruption triggers and automatically pays riders the moment a threshold is crossed. No claim form. No assessor. No waiting. Just money in their UPI account within minutes.

The key differentiator is **Hyper-Local Zone Intelligence**. We don't price Mumbai as one city. We treat it as 8 distinct risk micro-zones — Dharavi, Kurla, Dadar, Andheri, Thane, Borivali, Bandra, Navi Mumbai — each with its own historical disruption frequency, weather exposure, and strike likelihood. A Bandra rider pays a genuinely lower premium than a Dharavi rider because the data proves they face less risk. This makes ShieldRoute the first parametric gig insurance product that is both **actuarially honest** and **genuinely affordable**.

---

## Who Is This For

**Primary user:** Food delivery partners (age 20–40, male, semi-urban) working on Zomato or Swiggy in Mumbai. They typically earn ₹5,000–₹15,000/week, work 40–60 hrs/week, and have little to no financial buffer. A single disrupted day can mean missing an EMI or skipping meals.

**Secondary user:** Insurers and risk managers (the Admin dashboard) who need real-time visibility into zone-level risk exposure, claims, fraud signals, and P&L.

---

## Why Parametric Insurance

Traditional insurance requires you to *prove* a loss. You file a claim, an agent visits, documents are verified, weeks pass. For a daily-wage gig worker, that process is useless.

Parametric insurance works differently: you agree upfront on a **measurable trigger** (e.g., rainfall > 15mm/hr in your zone). When the data says the trigger fired, you get paid. No proof. No inspection. No delay. The trigger IS the proof.

This model is well-suited for gig workers because:
- Disruptions are **objective and measurable** (weather data, AQI APIs, platform uptime)
- Losses are **predictable** (a Dharavi rider loses approximately ₹X per disrupted day)
- The population is **large enough** for risk pooling even at micro-zone granularity
- **Speed matters** — a rider needs money that day, not three weeks later

---

## The Zone Intelligence Model

Mumbai's 8 delivery micro-zones have meaningfully different risk profiles based on 12 months of disruption data:

| Zone | Disruption Days/Month | Weather Risk | Strike Risk | Outage Risk | Zone Multiplier | Risk Level |
|------|-----------------------|-------------|------------|------------|-----------------|------------|
| Navi Mumbai | 4 | 20% | 8% | 8% | 0.95x | Low |
| Bandra | 5 | 25% | 10% | 8% | 0.90x | Low |
| Thane | 7 | 30% | 12% | 10% | 1.05x | Medium |
| Andheri | 8 | 35% | 15% | 10% | 1.00x | Medium |
| Borivali | 8 | 32% | 14% | 10% | 1.00x | Medium |
| Dadar | 11 | 40% | 25% | 12% | 1.10x | High |
| Kurla | 12 | 45% | 20% | 12% | 1.15x | High |
| Dharavi | 14 | 55% | 30% | 15% | 1.20x | Critical |

These multipliers feed directly into premium calculation. Riders in safer zones pay less. Riders in riskier zones pay more, but also receive higher absolute payouts when triggered. The model is self-consistent and transparent.

---

## The 5 Parametric Triggers

| # | Trigger | Threshold | What Happens | Typical Income Impact |
|---|---------|-----------|--------------|----------------------|
| 1 | Heavy Rain | > 15mm/hr rainfall in zone | Platform orders drop sharply, roads flood | 60–100% day's earnings lost |
| 2 | Severe Pollution | AQI > 300 in zone | Health advisory issued, order volumes collapse | 40–80% earnings lost |
| 3 | Extreme Heat | > 42°C ambient temperature | Rider safety advisory, customer orders drop | 30–60% earnings lost |
| 4 | Platform Outage | > 30 consecutive minutes of app downtime | Zero orders possible during window | 100% during outage window |
| 5 | Civil Disruption | Active curfew or declared strike | Complete work stoppage | 100% day's earnings lost |

When any trigger fires, the claim lifecycle begins automatically — no rider action required.

---

## Premium Formula

```
Weekly Premium = Base x Zone x Hours x Platform x RiskScore x Plan

Base = avg_weekly_earnings x 0.018

Zone multiplier:      Dharavi=1.20, Kurla=1.15, Dadar=1.10, Thane=1.05,
                      Andheri=1.00, Borivali=1.00, NaviMumbai=0.95, Bandra=0.90

Hours multiplier:     < 30 hrs/week = 0.85x
                      30–50 hrs/week = 1.00x
                      > 50 hrs/week  = 1.10x

Platform multiplier:  Zomato = 1.00x   |   Swiggy = 1.05x

Risk score multiplier: score < 65 = 0.90x
                       score 65–75 = 1.00x
                       score > 75  = 1.10x

Plan multiplier:      Basic = 0.85x  |  Standard = 1.00x  |  Premium = 1.20x

Result: rounded to nearest ₹5, capped at min ₹49 / max ₹249 per week
```

**Coverage:**
- Coverage per disruption day = avg_weekly_earnings / 6 (6 working days)
- Max weekly claim cap = min(avg_weekly_earnings x 0.7, ₹2,000)
- Plan coverage rate: Basic = 70%, Standard = 85%, Premium = 100%

**Worked Example — Dharavi, Swiggy, ₹7,000/week, 50hrs, Risk Score 78, Standard plan:**
```
Base:             7000 x 0.018          = ₹126.00
Zone (Dharavi):   x 1.20                = ₹151.20
Hours (50hrs):    x 1.00                = ₹151.20
Platform (Swiggy):x 1.05                = ₹158.76
Risk (score 78):  x 1.10                = ₹174.64
Plan (Standard):  x 1.00                = ₹174.64
Rounded:                                = ₹175/week

Coverage/day:     7000 / 6              = ₹1,167
At 85% (Standard):                      = ₹992/disrupted day
Weekly cap:       min(7000 x 0.7, 2000) = ₹2,000
```

---

## The Three Plans

| Plan | Triggers Covered | Coverage Rate | Use Case |
|------|-----------------|---------------|----------|
| Basic | Weather only (Rain) | 70% of daily coverage | First-time users, low-risk zones |
| Standard | Rain + Pollution + Heat | 85% of daily coverage | Most riders — best value |
| Premium | All 5 triggers | 100% of daily coverage | High-risk zones, full protection |

---

## Auto-Claim Flow

This is where ShieldRoute earns trust. The entire claim lifecycle is automated:

```
Trigger threshold crossed
        |
        v (10 seconds)
Claim auto-created with ID
        |
        v (5 seconds)
Status: Processing -> Approved
        |
        v (5 seconds)
Status: Approved -> Paid
        |
        v
"₹XXX credited to UPI: XXXX@upi"
```

The rider receives a push notification at each stage. They never open a form. They never call a helpline. The system does it all.

---

## Application Structure

The project is organized as a monorepo with separate `client` and `server` directories for production-ready development.

```
shieldroute/
├── client/                # React Frontend (Vite)
│   ├── src/
│   │   ├── pages/         # Landing, Onboarding, Dashboard, Admin
│   │   ├── components/    # Reusable UI components
│   │   ├── context/       # Global App State
│   │   ├── utils/         # Premium Calculation Engine
│   │   ├── data/          # Mock data and constants
│   │   └── types/         # TypeScript definitions
│   └── package.json       # Frontend dependencies
├── server/                # Express Backend (Node.js)
│   ├── src/
│   │   ├── routes/        # API Endpoints (Auth, Policy, Claims)
│   │   ├── controllers/   # Business Logic
│   │   └── index.ts       # Server Entry Point
│   ├── prisma/            # Database Schema & Migrations
│   └── package.json       # Backend dependencies
└── package.json           # Root scripts for monorepo management
```

---

## Tech Stack

| Layer | Choice | Why |
|-------|--------|-----|
| Frontend | React 19 + Vite 8 | Fast HMR, modern bundling |
| Backend | Node.js + Express | Lightweight, scalable API |
| Database | Prisma + PostgreSQL | Type-safe ORM with production-ready cloud DB support |
| Language | TypeScript 5 | Type safety across all data flows |
| Styling | TailwindCSS v4 | Utility-first, custom theme |

---

## Running Locally

```bash
cd shieldroute
npm install
npm run dev
```

Open `http://localhost:5173`

Pages:
- `/` — Landing page
- `/onboard` — 4-step onboarding flow
- `/dashboard` — Rider dashboard (requires onboarding first)
- `/policy` — Rider policy details
- `/claims` — Rider claims history
- `/admin-login` — Admin login page
- `/admin` — Insurer intelligence center (protected route)

Backend API:
- `http://localhost:4000/health`

---

## Deploying (Netlify + Render)

This repo is now deployment-ready with:
- `netlify.toml` for frontend hosting on Netlify
- `render.yaml` for backend hosting on Render

### 1) Deploy Backend on Render

1. Push this repo to GitHub.
2. In Render, create service from `render.yaml` (Blueprint deploy).
3. Set required secrets in Render:
        - `DATABASE_URL`
        - `JWT_SECRET`
4. Optional production providers:
        - Twilio: `OTP_PROVIDER=twilio` + `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_PHONE`
        - Razorpay: `PAYMENT_PROVIDER=razorpay` + `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`
5. Keep `OTP_PROVIDER=mock` and `PAYMENT_PROVIDER=mock` for demo mode.
6. Verify backend: `https://<your-render-service>/health`

### 2) Deploy Frontend on Netlify

1. Connect same GitHub repo in Netlify.
2. Netlify auto-picks settings from `netlify.toml`:
        - Base dir: `client`
        - Build command: `npm run build`
        - Publish dir: `dist`
3. Set frontend env vars:
        - `VITE_API_BASE_URL=https://<your-render-service>`
        - `VITE_ADMIN_USERNAME=<admin-user>`
        - `VITE_ADMIN_PASSWORD=<admin-password>`
4. Add your Netlify domain into Render CORS vars:
        - `FRONTEND_URL=https://<your-netlify-site>`
        - optional `FRONTEND_URLS` for extra domains (comma-separated)

### 3) SPA Routing

Frontend deep-link routing (`/dashboard`, `/claims`, `/admin`) is handled via:
- `client/public/_redirects`
- `netlify.toml` redirects

---

## Phase Roadmap

### Phase 1 — Prototype (Current, Week 1)

**Status: Complete**

The full UI prototype with mocked data and simulated real-time behavior. Every screen is designed and functional. The premium engine is live. The auto-claim flow runs on a 15-second simulation interval.

What's real in Phase 1:
- Complete UI for all 4 pages
- Premium calculation engine (exact formula)
- AI risk scoring per zone
- 4-step onboarding with form validation
- Auto-claim lifecycle simulation (Processing → Approved → Paid)
- Admin insurer dashboard with fraud flags, forecast, P&L

What's mocked:
- Trigger values (simulated randomly every 15s)
- Weather/AQI/temperature data (hardcoded)
- UPI payouts (displayed but not real)
- Historical disruption data (hardcoded zone stats)

---

### Phase 2 — Real Data Integration (Week 2–3)

Connect the prototype to live data sources and real payment rails.

**Weather & Trigger APIs**
- Integrate India Meteorological Department (IMD) API for real-time rainfall by pin code
- OpenWeatherMap / AQI.in for live AQI and temperature per Mumbai zone
- Build a lightweight Node.js trigger monitor service that polls every 5 minutes and emits events when thresholds are crossed

**Payment Integration**
- Razorpay UPI Autopay for weekly premium collection (auto-debit mandate)
- Razorpay Payout API for instant claim disbursement to rider UPI IDs
- Webhook handlers for payment confirmation → claim status update

**Platform Outage Detection**
- Monitor Zomato/Swiggy public status pages via scraper or third-party uptime API
- Detect consecutive downtime > 30 minutes and trigger the outage claim event

**Authentication**
- OTP-based phone login (Twilio SMS or MSG91)
- Session management with JWT stored in httpOnly cookie

**Database**
- PostgreSQL for policies, claims, riders, and zone risk tables
- Redis for real-time trigger state (current values per zone, last updated)

**Notifications**
- WhatsApp Business API (WATI) for claim status messages in Hindi + English
- SMS fallback via MSG91

---

### Phase 3 — Intelligence Layer (Week 4–5)

Upgrade the static risk model with adaptive ML and build out the full insurer toolset.

**Dynamic Premium Repricing**
- Weekly automated repricing: if a zone's realized loss ratio > 60%, increase that zone's multiplier by 5–10% for the following week
- Store pricing history per zone — build a feedback loop between payouts and premiums
- Seasonal monsoon adjustment: multiply base premium by 1.15–1.40 during June–September based on historical rainfall patterns

**Fraud Detection ML**
- GPS validation at claim time: rider's last known location must be within the claimed zone polygon (using Google Maps Geocoding API)
- Claim frequency model: flag riders who file > 1 claim per 24 hours
- Temporal anomaly: ML classifier trained on claim-filing timestamps relative to trigger end time (suspiciously fast = higher fraud score)
- Network graph: detect coordinated fraud rings where multiple linked accounts claim simultaneously from the same zone

**Predictive Risk Forecast**
- 7-day disruption probability model per zone using historical disruption patterns + IMD weather forecast
- Outputs the "Next 7 Days" bar chart in Admin with real predictions instead of mock data
- Alert system: auto-notify underwriters when predicted weekly loss ratio > 50%

**Rider Loyalty Engine**
- Claim-free weeks accumulate loyalty points → 5% premium discount after 4 consecutive clean weeks
- Referral rewards: ₹50 account credit per referred rider who completes onboarding

---

### Phase 4 — Scale & Compliance (Week 6+)

**Regulatory**
- Apply for IRDAI Regulatory Sandbox (Microinsurance category)
- Partner with a licensed insurer as underwriter (e.g., Bajaj Allianz, ICICI Lombard)
- Draft policy wordings compliant with IRDAI microinsurance regulations 2015

**Geographic Expansion**
- Bengaluru: 6 zones (Koramangala, Whitefield, Indiranagar, Jayanagar, HSR, Yeshwanthpur)
- Delhi NCR: 6 zones (Connaught Place, Noida, Gurgaon, Laxmi Nagar, Rohini, Dwarka)
- Each city gets its own disruption history model and zone risk table

**Mobile App**
- React Native app for rider-side (onboarding, policy, real-time trigger alerts, claims)
- Push notifications via Firebase Cloud Messaging
- Offline-first architecture: cached policy + claim data accessible without internet

**Reinsurance**
- Catastrophic event pooling: monsoon season excess-of-loss reinsurance layer
- Partner with a global reinsurer (SwissRe, MunichRe) for aggregate loss protection above ₹1Cr/month

**B2B Channel**
- White-label API for Zomato/Swiggy to offer ShieldRoute as an in-app benefit
- Platform-branded "Income Shield" product powered by ShieldRoute infrastructure
- Revenue share model: platform takes 15% of premiums for distribution

---

## Business Model

| Stream | Details |
|--------|---------|
| Premium Revenue | ₹49–₹249/week per rider, net of reinsurance |
| Platform Distribution Fee | 15% of GWP paid to Zomato/Swiggy for in-app access |
| Insurer SaaS License | Monthly fee for Admin dashboard + fraud detection API |
| Data Licensing | Anonymized zone disruption data sold to urban planners, logistics firms |

**Unit Economics (Steady State):**
- Average weekly premium: ₹130/rider
- Average loss ratio target: < 40%
- CAC via platform channel: ~₹80/rider
- LTV at 6-month retention: ₹130 x 0.60 x 26 weeks = ₹2,028

---

## Team

Built for Guidewire DEVTrails 2026.

---

*ShieldRoute — because gig work shouldn't mean income insecurity.*
