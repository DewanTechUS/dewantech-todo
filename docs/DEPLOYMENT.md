# Putting DoNext on your website

DoNext is a **static web app**: after `npm run build`, the `client/dist/` folder contains plain files (HTML, JavaScript, CSS, icons). There's no server or database to run. Any web host can serve it, including every Hostinger plan and free hosts like Netlify, Cloudflare Pages or GitHub Pages.

HTTPS is required. Installing the app, offline mode and the microphone only work over HTTPS (or on `localhost`).

> Using Hostinger? Follow [HOSTINGER.md](HOSTINGER.md) for click-by-click steps.

---

## 1. Choose the address

| Option | Example | Build setting |
| --- | --- | --- |
| **Subdomain** (recommended) | `https://donext.dewantech.com` | default (`VITE_BASE_PATH=/`) |
| **Folder on your main site** | `https://dewantech.com/donext/` | `VITE_BASE_PATH=/donext/` |

For the folder option, create `client/.env` containing:

```ini
VITE_BASE_PATH=/donext/
```

## 2. Build

```bash
npm install
npm run build
```

Upload the **contents** of `client/dist/`: `index.html`, `assets/`, `icons/`, `sw.js`, `manifest.webmanifest` and the other files.

## 3. Upload, then add the page-refresh rule

DoNext has pages such as `/people` and `/data`. The host must send any unknown address back to `index.html`, so refreshing those pages works.

**Apache / Hostinger / cPanel:** upload this `.htaccess` next to `index.html`.

For a **subdomain** (app at the root):

```apache
RewriteEngine On
RewriteBase /
RewriteRule ^index\.html$ - [L]
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule . /index.html [L]

<IfModule mod_headers.c>
  <FilesMatch "^(index\.html|sw\.js|manifest\.webmanifest)$">
    Header set Cache-Control "no-cache"
  </FilesMatch>
  Header always set X-Content-Type-Options "nosniff"
  Header always set Referrer-Policy "strict-origin-when-cross-origin"
  Header always set X-Frame-Options "DENY"
</IfModule>
```

For a **folder**, replace both `/` paths with your folder: `RewriteBase /donext/` and `RewriteRule . /donext/index.html [L]`.

**Nginx:**

```nginx
location / {
    try_files $uri $uri/ /index.html;
}
location = /sw.js { add_header Cache-Control "no-cache"; }
```

**Netlify / Cloudflare Pages:** build command `npm run build`, publish directory `client/dist`. Add a file `client/public/_redirects` containing `/* /index.html 200`.

## 4. Check it

- [ ] The site opens over **https://**.
- [ ] Create a profile, add a task, then refresh the page. The task is still there.
- [ ] Open `/people` directly, and refresh. The page loads.
- [ ] Turn on airplane mode, then reload. The app still opens with your tasks.
- [ ] On your phone, **Add to Home Screen** (iPhone: Share menu; Android: ⋮ → Install app).
- [ ] Tap the microphone in **New task**. It asks for permission and types what you say.

## 5. Link it from dewantech.com

Add a menu item or button on your main site that links to the app's address.

## Updating

Run `npm run build` again and upload the new `client/dist/` contents, replacing the old files. Installed copies pick up the update automatically the next time they're opened. **Users' tasks aren't affected:** they live on each user's device, not on your website.
