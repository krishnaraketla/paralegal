# Bug Report: ONLYOFFICE Document Switching Fails
**bug_id** : 001
**Date:** 2025-11-27  
**Status:** RESOLVED  
**Severity:** Critical  

---

## Summary

When switching between documents in the Paralegal app, only the first document would load properly. Subsequent documents would show a skeleton loader indefinitely, with ONLYOFFICE never firing its `onDocumentReady` event.

---

## Symptoms

1. First document opens correctly ✅
2. Switch to second document → shows skeleton loader forever ❌
3. ONLYOFFICE `onAppReady` and `onDocumentReady` events never fire for subsequent documents
4. No errors in console (silent failure)
5. WebSocket connections appeared healthy
6. Backend API responses were successful

---

## Root Cause

The **ONLYOFFICE JavaScript SDK has persistent global state** that survives:
- React component unmount/remount
- Calling `destroyEditor()` on the editor instance
- Changing the DOM element ID
- Using different document keys
- Waiting for cleanup delays

When the React component tried to create a new ONLYOFFICE editor instance after destroying the old one, the SDK's internal state would prevent proper initialization.

---

## Attempted Fixes (Did NOT Work)

### 1. Unique Editor IDs
```tsx
const editorId = useMemo(() => `docEditor-${document.id}-${Date.now()}`, [document.id])
```
**Result:** Failed - ONLYOFFICE SDK still retained global state

### 2. Cleanup Effect with destroyEditor()
```tsx
useEffect(() => {
  return () => {
    if (editorInstance?.destroyEditor) {
      editorInstance.destroyEditor()
    }
  }
}, [editorId])
```
**Result:** Failed - Cleanup ran but SDK state persisted

### 3. Mount Delay (100ms → 500ms)
```tsx
useEffect(() => {
  const timer = setTimeout(() => setMounted(true), 500)
  return () => clearTimeout(timer)
}, [])
```
**Result:** Failed - Even with longer delays, SDK state persisted

### 4. Unique Document Keys (Backend)
```python
document_key = f"{doc_id}__{session_key}" if session_key else doc_id
```
**Result:** Failed - SDK caches at a level beyond the document key

### 5. Force DOM Recreation with React Key
```tsx
<div className="editor-wrapper" key={editorId}>
```
**Result:** Failed - SDK state exists outside the React tree

---

## Working Solution: Iframe Isolation

The only reliable fix was to **completely isolate each ONLYOFFICE instance in its own iframe**. When the iframe is destroyed, its entire JavaScript context is destroyed with it.

### Architecture

```
┌─────────────────────────────────────┐
│  React App (DocumentEditor.tsx)     │
│                                     │
│  ┌─────────────────────────────┐   │
│  │  iframe (editor.html)        │   │
│  │  ┌───────────────────────┐  │   │
│  │  │  ONLYOFFICE Editor    │  │   │
│  │  └───────────────────────┘  │   │
│  └─────────────────────────────┘   │
│         ↕ postMessage               │
└─────────────────────────────────────┘
```

### Implementation

**1. Created `/public/editor.html`**
- Standalone HTML page that hosts ONLYOFFICE
- Dynamically loads ONLYOFFICE API script
- Listens for `INIT_EDITOR` message from parent
- Sends events back via `postMessage`

**2. Updated `DocumentEditor.tsx`**
- Renders an iframe instead of the ONLYOFFICE React component
- Uses `useState` for iframe key to force recreation on document change
- Communicates via `postMessage` API
- Guards against duplicate config loading

### Key Code Changes

**DocumentEditor.tsx (After)**
```tsx
const [iframeKey, setIframeKey] = useState(() => `iframe-${document.id}-${Date.now()}`)

// Reset iframe when document changes
useEffect(() => {
  configLoadedRef.current = false
  setIframeKey(`iframe-${document.id}-${Date.now()}`)
}, [document.id])

return (
  <iframe
    key={iframeKey}  // Forces complete destruction/recreation
    ref={iframeRef}
    src="/editor.html"
  />
)
```

**editor.html**
```html
<script>
window.addEventListener('message', function(event) {
  if (event.data.type === 'INIT_EDITOR') {
    // Load ONLYOFFICE API and create editor
    new DocsAPI.DocEditor('editor-container', config)
  }
})
</script>
```

---

## Alternative Workaround

A simpler but worse UX solution was to **force page reload** when switching documents:

```tsx
sessionStorage.setItem('pendingDocument', JSON.stringify(doc))
window.location.reload()
```

This was kept as a backup but the iframe solution provides better UX.

---

## Files Changed

- `frontend/public/editor.html` (NEW)
- `frontend/src/components/DocumentEditor.tsx` (REWRITTEN)
- `frontend/src/App.tsx` (simplified props)
- `backend/app/routers/onlyoffice.py` (added session_key support)

---

## Lessons Learned

1. **Third-party SDKs may have hidden global state** that survives React lifecycle
2. **Iframe isolation** is a powerful technique for sandboxing problematic JavaScript
3. **postMessage API** enables clean communication between isolated contexts
4. **Always test document switching** in document editor applications
5. **Verbose logging** is essential for debugging silent failures

---

## References

- ONLYOFFICE Document Editor React component: `@onlyoffice/document-editor-react`
- postMessage API: https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage

