
# 🍞 Breadcrumb

**Know what's happening on campus before you get there.**

Breadcrumb is an interactive, pixel-art campus map that helps University of Florida students discover what's happening around them, from free food and events to construction, crowds, and safety concerns.

Students can drop location-based reports called **Crumbs**, confirm or dispute other reports, and explore their campus in real time. Three independent confirmations turn a Crumb into a **Full Loaf**.

Built at **SwampHacks XII (2026)**.

## Tech Stack

| Category | Technologies |
|---|---|
| Web | Next.js, React, TypeScript, Tailwind CSS |
| Mobile | React Native, Expo |
| Backend & Database | Supabase, PostgreSQL, Node.js |
| Authentication | Auth0 |
| Maps | OpenStreetMap, custom pixel-art rendering |
| AI & Data | Groq, Gemini, Apify |

## Getting Started

### Prerequisites

- Node.js 24
- npm
- Git
- Expo Go (for mobile testing)

### 1. Clone the Repository

```bash
git clone https://github.com/andersonclara/breadcrumb.git
cd breadcrumb
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Create a `.env.local` file in the project root and configure the credentials required by your local setup.

Breadcrumb uses external services including Supabase, Auth0, Groq, and Gemini. Refer to the source code for the required environment variable names.

**Never commit API keys or environment files to GitHub.**

### 4. Run the Web App

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 5. Run the Mobile App

In a separate terminal, from the project root:

```bash
npm run dev:mobile
```

Follow the Expo CLI instructions to launch the app on a simulator or physical device.

## Project Structure

```text
breadcrumb/
├── apps/
│   └── mobile/       # React Native / Expo app
├── src/              # Next.js web app and shared logic
├── supabase/         # Database migrations and configuration
├── public/           # Static assets
└── package.json      # Project scripts and dependencies
```

## Team

Built by **Clara Anderson, Gael Garcia, Chelsey Chambers, and Siddharth Bandaru** at SwampHacks XII.

---

*Drop a Crumb. Spread the word. 🍞*
