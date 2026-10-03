# API Guide — ملك الخميس

## Endpoint

All actions go through a single endpoint:

```
POST /api/rpc
Content-Type: application/json
```

---

## Request Shape

```json
{
  "action": "<action name>",
  "auth": { "name": "هشام", "token": "<your token>" },
  "payload": { ... }
}
```

Public actions (like `login`) don't need `auth`.

---

## Step 1 — Get Your Token

Call `login` to get your auth token:

```bash
curl -X POST https://<your-domain>/api/rpc \
  -H "Content-Type: application/json" \
  -d '{
    "action": "login",
    "payload": {
      "name": "هشام",
      "password": "your_password"
    }
  }'
```

Response:

```json
{
  "result": {
    "profile": { "name": "هشام", "role": "user" },
    "token": "abc123...sha256hash..."
  }
}
```

Save the `token` value — use it in all subsequent requests as `auth.token`. It's a SHA-256 hash of your password and stays stable until you change your password.

---

## Voting Actions

### Vote on the Day (Thursday / Friday)

**Action:** `submitDayVote`

```bash
curl -X POST https://<your-domain>/api/rpc \
  -H "Content-Type: application/json" \
  -d '{
    "action": "submitDayVote",
    "auth": { "name": "هشام", "token": "<your token>" },
    "payload": {
      "weekId": "<week document id>",
      "userName": "هشام",
      "day": "الخميس"
    }
  }'
```

`day` must be one of:
- `"الخميس"`
- `"الجمعة"`
- `"الخميس والجمعة"`

**Rules:**
- You must have confirmed attendance first (`toggleAttendance`)
- You can't be marked absent
- The king cannot vote

---

### Vote on a Restaurant

**Action:** `submitRestaurantVote`

```bash
curl -X POST https://<your-domain>/api/rpc \
  -H "Content-Type: application/json" \
  -d '{
    "action": "submitRestaurantVote",
    "auth": { "name": "هشام", "token": "<your token>" },
    "payload": {
      "weekId": "<week document id>",
      "restaurant": "اسم المطعم"
    }
  }'
```

**Rules:**
- The restaurant name must be one of the 3 candidates the king nominated
- Your vote is **final** — it cannot be changed
- The king cannot vote
- Voting must be active

---

### Rate the Outing (1–5 stars)

**Action:** `submitRating`

```bash
curl -X POST https://<your-domain>/api/rpc \
  -H "Content-Type: application/json" \
  -d '{
    "action": "submitRating",
    "auth": { "name": "هشام", "token": "<your token>" },
    "payload": {
      "weekId": "<week document id>",
      "score": 4
    }
  }'
```

**Rules:**
- `score` must be an integer between 1 and 5
- Ratings must be open (enabled by the dean)
- You must have attended (not marked absent)
- You can only rate once per week

---

## Responses

**Success:**
```json
{ "result": true }
```

**Error:**
```json
{ "error": "رسالة الخطأ بالعربي" }
```

HTTP status will be `500` for errors, `401` for auth failures, `400` for unknown actions.
