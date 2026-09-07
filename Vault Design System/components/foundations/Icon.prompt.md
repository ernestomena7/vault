Renders one Lucide outline icon by name as inline SVG (path data copied in, not loaded from a URL), so it recolors via `color`/`currentColor` and renders correctly in screenshots and PPTX export.

```jsx
<Icon name="upload-cloud" size={20} color="var(--accent)" />
```

Only [Lucide](https://lucide.dev/icons) names already used in this system are registered in `Icon.jsx`'s `ICONS` map — adding a new icon means adding its path data there. Used inside Button, IconButton, StatusPill, FileDropzone, and nav items throughout this system.
