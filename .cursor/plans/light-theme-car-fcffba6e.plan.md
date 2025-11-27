<!-- fcffba6e-9230-4a74-a9df-18aeadcded7e 1c44ca3d-55e1-40f2-81fa-9f804c5083ad -->
# Light Theme Card UI Redesign

## Key Changes

### 1. Fix Sidebar Scroll Isolation

Update [frontend/src/App.css](frontend/src/App.css) to:

- Set `.app` to `height: 100vh` and `overflow: hidden`
- Ensure `.main` fills remaining space with `overflow: hidden`
- Each section (editor, sidebar) scrolls independently

### 2. Light Theme Color Palette

Update [frontend/src/index.css](frontend/src/index.css) CSS variables:

- Background: soft gray (`#f5f5f7`) as page backdrop, white for cards
- Text: dark grays for primary/secondary text
- Borders: light gray (`#e5e5e5`)
- Accent: warm neutral tones (similar to the reference image)
- Clean, minimal scrollbar styling

### 3. Card Container Layout

Update [frontend/src/App.tsx](frontend/src/App.tsx) and [frontend/src/App.css](frontend/src/App.css):

- Wrap entire app content in a card container with `border-radius: 16px`
- Add subtle `box-shadow` for elevation
- Add margin/padding to show the background color around the card
- Header and main content live inside the card

### 4. Component Style Updates

Update individual component CSS files to match the light theme:

- [frontend/src/components/SpellcheckSidebar.css](frontend/src/components/SpellcheckSidebar.css): Light sidebar background
- [frontend/src/components/FileUpload.css](frontend/src/components/FileUpload.css): Light dropzone styling
- [frontend/src/components/DocumentEditor.css](frontend/src/components/DocumentEditor.css): Light editor background
- [frontend/src/components/SpellcheckItem.css](frontend/src/components/SpellcheckItem.css): Light item cards

## Visual Result

- Soft gray page background
- White card container with rounded corners and shadow
- Clean, airy light theme inspired by the reference image
- Independent scrolling for sidebar and editor

### To-dos

- [ ] Fix sidebar scroll isolation so page doesn't scroll with sidebar
- [ ] Update CSS variables in index.css for light theme colors
- [ ] Create card container wrapper with rounded corners and shadow
- [ ] Update component CSS files to match light theme