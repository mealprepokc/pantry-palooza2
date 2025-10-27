# Store Asset Checklist

This folder is a staging area for assets required by the Google Play Store and Apple App Store listings. Place final production-ready files in the subfolders below before submitting builds.

```
store-assets/
├── apple-app-store/
│   ├── app-icon/
│   │   ├── AppIcon1024.png       # generated via scripts/generate-store-assets.js
│   │   └── README.md
│   ├── screenshots/
│   │   ├── iphone-65/
│   │   ├── iphone-61/
│   │   └── ipad-pro-3rd-gen/
│   └── marketing/
│       └── README.md
├── google-play-store/
│   ├── app-icon/
│   │   ├── PlayIcon512.png       # generated via scripts/generate-store-assets.js
│   │   └── README.md
│   ├── feature-graphic/
│   │   └── FeatureGraphic1024x500.png  # generated placeholder
│   ├── screenshots/
│   │   ├── phone/                # generated placeholder PNGs (replace with real captures when available)
│   │   └── tablet/
│   └── marketing/
│       └── README.md
└── README.md

## Requirements Summary

### Apple App Store
- **App Icon**: 1024×1024 PNG (no transparency). `AppIcon1024.png`
- **Screenshots**: At least 1–3 per display class (6.5" iPhone, 5.5" iPhone, 12.9" iPad). PNG or JPEG.
- **App Previews (optional)**: 1080p video (MP4/MOV).
- **Marketing assets**: Optional banners/posters for App Store Connect marketing.
- **Metadata**: App name, subtitle, promotional text, description, keywords, support URL, marketing URL, privacy policy URL.

### Google Play Store
- **App Icon**: 512×512 PNG. `PlayIcon512.png`
- **Feature Graphic**: 1024×500 PNG or JPEG.
- **Screenshots**: Minimum 2 per form factor (phone 16:9, 7" tablet, 10" tablet if applicable).
- **Promo Graphic (optional)**: 180×120.
- **Metadata**: Short description (80 chars), full description (4000 chars), contact email, privacy policy URL.

> ⚠️ Placeholder files were generated from the in-app icon using `scripts/generate-store-assets.js` and `scripts/generate-placeholder-screenshots.js`. Replace with production device captures before launch if possible.

## Metadata Checklist

A working draft of long/short descriptions, keywords, and required URLs lives in [`metadata.md`](./metadata.md). Update that file as messaging evolves and copy values into App Store Connect / Google Play Console during submission.
