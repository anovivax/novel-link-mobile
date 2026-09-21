NOVEL LINK MOBILE - ชุดเว็บพร้อมไอคอนหน้าจอหลัก
=================================================

รูปโลโก้ที่แนบถูกนำมาใช้เป็น:
- โลโก้บนหน้าเว็บ
- favicon ของ Browser
- Apple Touch Icon สำหรับ iPhone/iPad
- PWA Icon 192x192 / 512x512 สำหรับ Android
- Maskable Icon สำหรับ Android

อัปโหลดไฟล์ "ทั้งหมด" ในโฟลเดอร์นี้ไปไว้ที่ ROOT ของ Repository:
https://github.com/anovivax/novel-link-mobile

โครงสร้างควรเป็น:
novel-link-mobile/
  index.html
  style.css
  app.js
  web_data.json
  manifest.webmanifest
  sw.js
  logo-512.png
  favicon.ico
  favicon-32x32.png
  apple-touch-icon.png
  icon-192.png
  icon-512.png
  maskable-192.png
  maskable-512.png
  icons/ ...

ไม่ต้องอัปโหลด github_sync.json หรือ r2_config.json มาไว้ในเว็บ
เพราะไฟล์เหล่านั้นมี Credential/Token

หลังอัปโหลด:
1. Settings > Pages
2. Source = Deploy from a branch
3. Branch = main
4. Folder = /(root)
5. Save

บน iPhone:
Safari > Share > Add to Home Screen

บน Android:
Chrome > เมนู ⋮ > Add to Home screen / Install app

ถ้าเคย Add to Home Screen ด้วยไอคอนเก่า:
- ลบ Shortcut/App เดิมออกจากหน้าจอหลัก
- เปิดเว็บใหม่
- Add to Home Screen ใหม่
เพื่อบังคับให้เครื่องโหลดไอคอนล่าสุด
