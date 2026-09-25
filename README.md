# Danny Ahn — Portfolio Website

**Purpose:** Personal portfolio site to establish tech/MIS professional identity online, pushing old casino news off Page 1 of Google search results.

---

## Files Created

| File | Purpose |
|------|---------|
| `index.html` | Main portfolio page with About section and reframe narrative |
| `style.css` | Clean, modern styling (v2) |
| `README.md` | This documentation file |

---

## Design Decisions

- **Split-screen hero** — profile photo placeholder on left, text content on right (dominant pattern for personal portfolios)
- **Profile photo area** — circular 280px placeholder with hover lift effect; replace with actual image later
- **Hamburger menu** — mobile navigation overlay that expands full-screen
- **Subtle animations** — underline nav links on hover, card lift effects, CTA button shadow transitions
- **Expertise cards** — icon-based grid layout (📊⚙️🔧💡) with hover elevation
- **Contact section** — arrow indicators appear on link hover
- **Typography hierarchy** — tighter letter-spacing on headings, generous line-height for readability
- **Responsive breakpoints** — 900px (tablet), 600px (mobile)

---

## Version History

### v2 (September 24, 2026)
- Split-screen hero layout with photo placeholder
- Hamburger menu for mobile navigation
- Animated nav underlines and card hover effects
- Icon-based expertise cards
- Improved spacing and typography hierarchy
- Better responsive design at tablet/mobile breakpoints

### v1 (Initial)
- Centered hero section
- Basic grid layout for expertise cards
- Simple responsive design

---

## How to Add Your Photo Later

Replace the `.hero-photo-placeholder` div in `index.html`:

```html
<div class="hero-photo-wrapper">
    <img src="your-photo.jpg" alt="Danny Ahn" class="hero-photo">
</div>
```

Add this CSS:
```css
.hero-photo {
    width: 280px;
    height: 280px;
    border-radius: 50%;
    object-fit: cover;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}
```

---

## Next Steps

1. Choose domain name (`dannyahn.com` — already owned)
2. Create GitHub repo and push files
3. Enable GitHub Pages in repository settings
4. Connect `dannyahn.com` DNS to GitHub Pages
5. Add actual profile photo
6. Optimize for SEO (meta tags, structured data)
7. Expand with projects/blog sections as Phase 2 content is created
