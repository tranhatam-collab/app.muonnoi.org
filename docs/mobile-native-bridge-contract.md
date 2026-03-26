# Mobile Native Bridge Contract

This contract defines the shared bridge between `apps/web` and Capacitor native shells.

## Global API

`window.MNNative`

- `isNative(): boolean`
- `platform(): "web" | "ios" | "android"`
- `pushEnable(): Promise<{ ok: boolean; reason?: string }>`
- `cameraPickPhoto(): Promise<{ ok: boolean; photo?: unknown; reason?: string }>`
- `biometricVerify(): Promise<{ ok: boolean; result?: unknown; reason?: string }>`
- `callStart(kind: "audio" | "video"): Promise<{ ok: boolean; reason?: string }>`

## Push Token Flow

When push registration succeeds, the bridge posts token payload to:

- `POST /api/mobile/push/register`

Payload:

```json
{
  "token": "<apns_or_fcm_token>",
  "platform": "ios|android",
  "source": "capacitor",
  "at": 0
}
```

Notes:

- Request uses `credentials: "include"` for session-based auth.
- Duplicate token sends are suppressed in local storage (`mn_push_token_sent`).
- Backend should accept idempotent token updates.
