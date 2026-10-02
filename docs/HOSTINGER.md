# Putting DoNext on Hostinger

DoNext is just files, so it works on **every Hostinger plan** (Single, Premium, Business, Cloud). You don't need Node.js hosting or a database.

## 1. Build the files on your PC

From the project folder:

```powershell
npm install
npm run build
```

This creates the folder `client\dist`. Everything inside it is your website.

**Want a folder instead of a subdomain** (e.g. `dewantech.com/donext`)? Before building, create `client\.env` containing `VITE_BASE_PATH=/donext/`.

## 2. Create the subdomain (recommended)

In hPanel, go to **Websites → your site → Domains → Subdomains** and create `donext` (giving `donext.dewantech.com`). Note its folder, usually `public_html/donext`.

Make sure **SSL** is active for it (hPanel → **Security → SSL**). Hostinger provides free SSL.

## 3. Upload

1. In hPanel, open **File Manager** and go to the subdomain's folder.
2. Upload **everything inside** `client\dist`: `index.html`, `assets`, `icons`, `sw.js`, `manifest.webmanifest` and the rest. Don't upload the `dist` folder itself.
   - Tip: zip the contents of `dist` first, upload the zip, then right-click it → **Extract**.
3. In the same folder, create a file named **`.htaccess`** with this content:

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

If you used a folder such as `/donext/` instead of a subdomain, change `RewriteBase /` to `RewriteBase /donext/`, and `/index.html [L]` to `/donext/index.html [L]`.

## 4. Check it

Open `https://donext.dewantech.com` and check:
- [ ] Create your profile and add a task.
- [ ] Open `https://donext.dewantech.com/people` directly. It loads, which shows the `.htaccess` is working.
- [ ] On your phone, **Add to Home Screen**, then open it in airplane mode. It works.
- [ ] The microphone works in Chrome, Edge or Safari.

## 5. Updating later

Run `npm run build` again, then upload the new contents of `client\dist`, replacing the old files. Users' tasks are stored on their own devices, so updating the website never deletes them.
