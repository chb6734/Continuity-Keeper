# Design Guidelines: Prescription-Based Care Continuity MVP

## Design Approach
**System-Based Approach** with modern healthcare aesthetic
- Primary inspiration: Linear's clarity + Stripe's restraint + healthcare professionalism
- Justification: Utility-focused healthcare tool requiring trust, efficiency, and clear information hierarchy
- Design system foundation: Clean, minimal system with strong emphasis on readability and data presentation

## Core Design Principles
1. **Medical Trust**: Professional, credible appearance that builds patient and clinician confidence
2. **Scan-First**: Information must be quickly digestible (clinicians reviewing in <2 minutes)
3. **Mobile-Priority**: Designed for waiting room use on phones
4. **Clarity Over Decoration**: Every element serves a functional purpose

## Typography
- **Primary Font**: Inter or similar modern sans-serif via Google Fonts CDN
- **Hierarchy**:
  - Headers: font-semibold to font-bold, text-2xl to text-4xl
  - Body text: font-normal, text-base to text-lg for readability
  - Labels/metadata: font-medium, text-sm
  - Critical info (medications, dates): font-semibold
  - Low-confidence markers: font-medium italic text-sm

## Layout System
- **Spacing Primitives**: Tailwind units of 2, 4, 6, and 8 for consistency
  - Component padding: p-4 to p-6
  - Section spacing: space-y-6 to space-y-8
  - Card margins: m-4
  - Tight spacing for related items: space-y-2
- **Container widths**: max-w-2xl for forms, max-w-4xl for data displays, max-w-prose for text content
- **Grid system**: Single column mobile-first, 2-column layouts for desktop data comparisons only where critical

## Component Library

### Navigation
- Clean top bar with hospital/clinic name display
- Back navigation with clear context labels
- Progress indicators for multi-step intake (steps 1/5, 2/5, etc.)

### Forms (Patient Intake)
- Large touch targets (min h-12) for mobile waiting room use
- Clear field labels above inputs
- Dropdown selectors with search for complaints/symptoms
- Date pickers with calendar interface
- Radio buttons and checkboxes with ample spacing (space-y-4)
- Text areas with character count for patient notes
- Prominent "Continue" and "Submit" buttons

### Data Display Cards (Clinician View)
- **Medication Timeline Card**: Horizontal timeline with medication blocks, date markers, duration bars
- **Course Summary Card**: Chronological progression with improvement/worsening indicators
- **Verification Alerts Card**: Amber-bordered sections for low-confidence OCR or conflicts
- **Expandable Sections**: Collapsed by default with clear expand/collapse indicators, smooth transitions

### Document Upload
- Large camera button and file upload zone
- Preview thumbnails after upload with delete option
- Processing state indicator during OCR
- "Photo captured" confirmation state

### QR Code Display
- Large, centered QR code (min 280px square)
- Clear expiry countdown timer
- "Regenerate Code" button below QR
- Simple instructions: "Show this to your clinician"

### Status Indicators
- **Confidence badges**: "Verified" (solid), "Needs Verification" (outlined amber)
- **Source labels**: Small pills showing "Patient Written", "OCR Extracted", "System"
- **Timeline markers**: Dots and connecting lines for medication periods

### Buttons
- Primary actions: Solid, prominent (h-12, px-6)
- Secondary actions: Outlined, subtle
- Destructive actions: Distinct treatment for delete/invalidate
- Camera/upload buttons: Icon + text, large touch area

## Specialized Components

### Medication Timeline (Clinician View)
- 30/90-day toggle buttons (segmented control style)
- Horizontal scrollable timeline with medication cards
- Each card shows: medication name (bold), dose, frequency, duration bar
- Date markers anchoring the timeline
- Overlap indicators for potential duplications

### Intake Summary Structure
- Hierarchical card layout
- Primary info always visible
- "Show details" expandable for raw text
- Clear visual separation between sections (border-t with space)

### Access Log Display
- Simple table: timestamp, action, code ID
- Most recent first
- Minimal styling to keep focus on medical content

## Animations
- **Minimal use only**:
  - Smooth transitions for expandable sections (duration-200)
  - Fade-in for success confirmations
  - QR code generation animation (subtle scale + fade)
- **No decorative animations** - maintain medical professionalism

## Mobile Optimization
- Bottom-fixed action buttons for easy thumb reach
- Large form inputs (h-12 minimum)
- Adequate spacing between interactive elements (min 44px touch targets)
- Sticky headers for context during scroll
- Swipeable timeline on mobile

## Images
This application does not require hero images or decorative photography. Visual elements are functional:
- **User-uploaded prescription photos**: Displayed as thumbnails in review, not stored long-term
- **QR codes**: Generated functional graphics
- **Icon usage**: Heroicons via CDN for UI elements (camera, calendar, alert, check, etc.)
- **No stock imagery**: Maintains professional medical tool aesthetic

## Accessibility
- High contrast text (WCAG AA minimum)
- Clear focus states on all interactive elements
- Semantic HTML for screen readers
- Proper ARIA labels for medical terminology
- Error messages with clear remediation steps
- Form validation that's announced to assistive tech

## Trust-Building Elements
- Professional terminology consistency
- Clear data source attribution throughout
- Visible security indicators (expiry timer, one-time use messaging)
- Clean, organized information architecture
- No marketing fluff - purely functional