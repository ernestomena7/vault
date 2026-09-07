Glass modal dialog for confirmations and short forms.

```jsx
<Dialog open title="Reject this video?" description="onboarding_v3.mp4 will be sent back to the uploader." footer={<><Button variant="secondary">Cancel</Button><Button variant="danger">Reject</Button></>} />
```

Mount inside a `position: relative` container — it fills that ancestor, not the viewport.
