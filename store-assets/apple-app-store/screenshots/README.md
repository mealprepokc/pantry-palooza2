# Apple App Store Screenshots

Capture real screenshots from physical devices or simulators. Upload PNG or JPEG files into the folders below once captured.

```
store-assets/
  apple-app-store/
    screenshots/
      iphone-65/        # iPhone 14/15 Pro Max (6.5" / 6.7")
      iphone-61/        # iPhone 14/15 (6.1")
      ipad-pro-3rd-gen/ # 12.9" iPad Pro (3rd Gen or later)
```

## Requirements
- Resolution must match Apple guidelines:
  - **iPhone 6.5"**: 1284 × 2778 px
  - **iPhone 6.1"**: 1170 × 2532 px
  - **iPad Pro 12.9"**: 2048 × 2732 px
- Provide at least 3 screenshots per display class to maximize conversion.
- Avoid simulator status bars if possible (use `xcrun simctl status_bar booted clear` or manual editing).

## Suggested Scenes
1. Onboarding or login screen.
2. Library / ingredient input view.
3. Generated dishes screen with dish cards.
4. Saved dishes or shopping list (optional additional shots).

After capturing, name files sequentially (`01.png`, `02.png`, …) and place them in the appropriate folder.
