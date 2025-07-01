# Discover Blair County Map - Handoff Documentation

Welcome to the admin and public mapping experience for Blair County. This project is built in **Next.js (App Router)** and designed to be easily embedded into other platforms such as WordPress via an iframe.

---

## 🚀 Getting Started (for Developers)

### 1. Install dependencies

```bash
npm install
```

### 2. Set environment variables

Create a `.env.local` file with the following:

```env
DATABASE_URL=your_postgres_connection_string
NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=your_mapbox_token
```

### 3. Run the project locally

```bash
npm run dev
```

---

## 🧩 Embedding the Map in WordPress

You can embed the public map using an iframe:

```html
<iframe
  src="https://your-deployed-site.com"
  width="100%"
  height="700"
  style="border:0;"
  allowfullscreen
  loading="lazy">
</iframe>
```

### Optional Category Filter for Specific Pages:

```html
<iframe src="https://your-deployed-site.com?category=Outdoor%20Recreation" ...>
</iframe>
```

This will filter the map to show only listings in that category.

---

## 🔍 Admin Panel

Accessible at:

```
https://your-deployed-site.com/admin
```

### Login

Simple password-protected login (stored in environment variables or local verification).

### Features

- Add/edit/delete listings
- Modal form with validation
- CSV export
- Category-aware filtering and icons

---

## 🗺️ Map Functionality

- Markers colored by category
- Icons matched to category types
- Search by name, category, or address (fuzzy search)
- Category filtering via buttons
- Responsive: mobile-friendly with adjusted controls

---

## 🗃️ Database Schema

### `locations` Table

| Field       | Type                           |
| ----------- | ------------------------------ |
| id          | SERIAL PRIMARY KEY             |
| name        | TEXT                           |
| description | TEXT                           |
| website     | TEXT                           |
| category    | TEXT (linked to category.name) |
| image       | TEXT (URL)                     |
| address     | TEXT                           |
| phone       | TEXT                           |
| latitude    | TEXT                           |
| longitude   | TEXT                           |

### `categories` Table

| Field | Type                    |
| ----- | ----------------------- |
| id    | SERIAL PRIMARY KEY      |
| name  | TEXT                    |
| icon  | TEXT (Lucide icon name) |

---

## 🔧 Customization Notes

- Marker shapes & icon matching handled in `MapWithSearch.tsx`
- Map category color palette: generated from hash of category string
- Category icons use Lucide React (editable in `/components/icons.ts`)

---

## 📤 Export CSV

From admin dashboard, click **Export CSV** to download all listings in `locations.csv` format.

---

## ✅ Done-for-You Checklist

- [x] Responsive public map with category filtering
- [x] Admin panel with modal editor + CSV export
- [x] Searchable listing system (name, address, category)
- [x] Category system using normalized DB table
- [x] iframe-ready deployment for WordPress handoff

---

## 🤝 Final Notes

Please ensure the hosting solution supports `Next.js` (e.g., Vercel, Netlify with SSR enabled, or self-hosted). If any content updates are needed in the future, they can be done directly from the admin panel.

If the WordPress developer needs to load the map filtered by category, they can append `?category=Category%20Name` to the iframe source URL.

For assistance, contact the original developer for API route details and advanced usage.
