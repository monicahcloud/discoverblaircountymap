🌐 Discover Blair County Map – Project Handoff
Welcome to the Discover Blair County Map project. This tool provides an interactive map showcasing categorized locations across Blair County, PA. It is designed to be embedded in websites like WordPress using a simple <iframe>, and managed through a built-in admin panel.

👩‍💻 Part 1: Developer Setup Guide
This section is for developers maintaining or deploying the project.

⚙️ Tech Stack
Framework: Next.js (App Router)
Styling: Tailwind CSS + shadcn/ui
Database: PostgreSQL (Neon)
Map Provider: Mapbox
Storage: Vercel Blob
Search: Fuse.js (fuzzy search)

🔧 Local Development

1. Install dependencies

   npm install

2. Set up environment variables
   Create .env.local:

DATABASE_URL=your_postgres_connection_string
NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=your_mapbox_token 3. Start the development server

npm run dev
📁 Directory Highlights
/app/components/MapWithSearch.tsx – the core map logic
/app/embed/map/page.tsx – embeddable iframe version
/app/admin – admin dashboard to manage listings
/api/locations – API for map data
/api/admin/categories – API for category metadata

🗺️ Database Schema
locations Table
Field Type
id SERIAL PRIMARY KEY
name TEXT
description TEXT
website TEXT
category TEXT (linked to category.name)
image TEXT (URL)
address TEXT
phone TEXT
latitude TEXT
longitude TEXT

categories Table
Field Type
id SERIAL PRIMARY KEY
name TEXT
icon TEXT (Lucide icon name)
color TEXT (hex or tailwind)

✅ Admin Panel
URL: https://your-deployed-site.com/admin

Add/edit/delete listings
Export data as CSV
Manage categories and icons
Requires simple login (password or Clerk/NextAuth)

🧠 Notes for Future Devs
Marker icons use Lucide icons
Category color and icon are configured via the DB
Supports fuzzy search by name, description, category, and address
Category filter and query param logic live in MapWithSearch.tsx

🧑‍💼 Part 2: WordPress Team Guide (No Code Required)
This map is fully embeddable and filterable by category. You do not need to edit or maintain the code.

🧩 Embedding the Map in WordPress
To add the map to a WordPress page, copy this HTML into a Custom HTML Block in the WordPress editor:

<iframe
  src="https://yourdomain.com/embed/map"
  width="100%"
  height="700"
  style="border: 0; overflow: hidden;"
  loading="lazy"
/>
🎯 Filter the Map by Category
To display only certain categories on specific pages (e.g., Lodging, Dining), you can add a category to the URL:

Examples:
Show only Lodging:

<iframe
  src="https://yourdomain.com/embed/map?category=Lodging"
  width="100%"
  height="700"
  style="border: 0; overflow: hidden;"
  loading="lazy"
/>
Show only Outdoor Recreation:

<iframe
  src="https://yourdomain.com/embed/map?category=Outdoor%20Recreation"
  width="100%"
  height="700"
  style="border: 0; overflow: hidden;"
  loading="lazy"
/>
✅ Note: For categories with multiple words, replace spaces with %20 in the URL.
Example: "Arts & Culture" → ?category=Arts%20%26%20Culture

🗂️ Available Categories
Your categories may include:

Lodging
Dining
Outdoor Recreation
Arts & Culture
Shopping
Family Fun

If you need to add or rename categories, this can be done via the Admin Panel.

🛠️ Need to update a listing?
Go to the admin panel at:

https://yourdomain.com/admin

There, you can:

Add new listings
Edit names, addresses, categories
Upload photos
Delete outdated entries

No developer help is needed for content updates.

✅ Final Handoff Summary
✔ Public-facing map
✔ Mobile-friendly design
✔ Search and category filtering
✔ Embed-ready with WordPress-compatible iframes
✔ Self-managed content via admin panel
