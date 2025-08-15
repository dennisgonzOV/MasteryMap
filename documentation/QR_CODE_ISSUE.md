# QR Code Issue in Student Portfolio

## Problem Description

The QR code functionality in the student portfolio is not working because the `qrcode` library was removed during a dependency cleanup, but the feature is still expected to work according to the documentation and tests.

## Current State

- The QR code section shows a loading state indefinitely
- The `qrcode` library is not installed in the project
- Both client-side and server-side QR code generation are disabled
- Tests expect QR code functionality to work

## Root Cause

The QR code generation code was commented out in `client/src/pages/student/portfolio.tsx` with the note "Removed due to dependency cleanup", but the feature is still referenced in:

- Documentation (`features.md`, `requirements.md`)
- Tests (`tests/e2e/portfolio.spec.ts`, `tests/api/portfolio.test.ts`)
- Database schema (`shared/schema.ts`)

## Solution

### Option 1: Install QR Code Library (Recommended)

```bash
npm install qrcode @types/qrcode
```

Then uncomment and fix the QR code generation code in `client/src/pages/student/portfolio.tsx`:

```typescript
// Generate QR code for portfolio sharing
useEffect(() => {
  if (isAuthenticated && user) {
    const generateQRCode = async () => {
      try {
        const QRCode = await import("qrcode");
        const portfolioUrl = `${window.location.origin}/portfolio/student/${user.id}`;
        const dataUrl = await QRCode.toDataURL(portfolioUrl, {
          width: 200,
          margin: 2,
          color: {
            dark: "#1F2937", // Dark gray
            light: "#FFFFFF", // White
          },
        });
        setQrCodeDataUrl(dataUrl);
        setQrCodeError("");
      } catch (error) {
        console.error("Error generating QR code:", error);
        setQrCodeError("QR code generation unavailable");
      }
    };

    generateQRCode();
  }
}, [isAuthenticated, user]);
```

### Option 2: Server-Side QR Code Generation

Install the library and implement server-side QR code generation in the portfolio controller:

```typescript
// In server/domains/portfolio/portfolio.controller.ts
import QRCode from "qrcode";

// Generate QR code for portfolio sharing
router.get("/qr-code", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const portfolioUrl = `${req.protocol}://${req.get(
      "host"
    )}/portfolio/student/${userId}`;

    const qrCodeDataUrl = await QRCode.toDataURL(portfolioUrl, {
      width: 200,
      margin: 2,
      color: {
        dark: "#1F2937",
        light: "#FFFFFF",
      },
    });

    res.json({
      portfolioUrl,
      qrCodeUrl: qrCodeDataUrl,
    });
  } catch (error) {
    console.error("Error generating QR code:", error);
    res.status(500).json({ message: "Failed to generate QR code" });
  }
});
```

### Option 3: Remove QR Code Feature

If QR code functionality is not needed, remove all references to it:

- Remove QR code section from portfolio UI
- Update documentation to remove QR code references
- Update tests to remove QR code expectations
- Remove QR code fields from database schema

## Current Implementation

The current implementation shows a placeholder with an error message when the QR code library is not available, and provides a clear indication that the library needs to be installed.

## Recommendation

Install the `qrcode` library and implement Option 1 (client-side generation) as it's the simplest solution and matches the original implementation.
