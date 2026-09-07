Single-line text input — the base for text, search, email, password, number, and URL fields.

```jsx
<Input label="Folder path" icon="folder" placeholder="/marketing/q3-launch" />
```

Pass any native `type` (`text`, `email`, `password`, `search`, `number`). Shows `error` in red instead of `helperText` when both are set. `trailing` accepts a node (e.g. an `IconButton` clear/eye-toggle).
