# A. Authentication - Password & SSO

---

## A1. Check Password

### 1.1 มีการเช็คทั้งที่ FE และ BE

**Frontend** — `src/app/auth/register/page.tsx`

ใช้ Zod validate ก่อน submit:

```ts
const registerSchema = z.object({
  password: z
    .string()
    .min(15, 'รหัสผ่านต้องมีอย่างน้อย 15 ตัวอักษร')
    .max(128, 'รหัสผ่านของท่านมีจำนวนยาวเกินไป'),
})
```

**Backend** — `src/app/api/auth/register/route.ts`

ใช้ Zod validate อีกครั้งก่อนประมวลผล:

```ts
const registerBodySchema = z.object({
  password: z
    .string()
    .min(15, 'Password doesnt meet the security requirements')
    .max(128, 'Password is too long'),
})
```

---

### 1.2 ทำไมต้อง Check ทั้ง FE และ BE

**FE** — เพื่อ UX: แจ้ง error ทันทีโดยไม่ต้อง round-trip ไปที่ server ผู้ใช้เห็น feedback เร็วขึ้น

**BE** — เพื่อความปลอดภัย: FE validation ข้ามได้เสมอ เช่น ส่ง request ตรงผ่าน curl หรือ Postman โดยไม่ผ่านหน้าเว็บเลย ถ้า validate แค่ FE ก็ไม่มีความหมายในเชิง security

---

## A2. Password Policy (OWASP)

### 2.1 Length

| เงื่อนไข | ค่า | หลักฐานในโค้ด |
| --- | --- | --- |
| ไม่มี MFA → ขั้นต่ำ 15 ตัว | ✅ | `z.string().min(15)` ใน register schema |
| มี MFA → ขั้นต่ำ 8 ตัว | ไม่มี MFA ในระบบนี้ | — |
| รองรับ passphrase (64+ ตัว) | ✅ | `max(128)` รองรับ passphrase ยาวได้ถึง 128 ตัว |

---

### 2.2 Password Strength Meter

`src/frontend/components/PasswordStrengthMeter.tsx`

ใช้ library **zxcvbn** วัดความแข็งแกร่งของ password โดยให้คะแนน 0–4 พร้อมแสดง progress bar และข้อความ:

```text
0 = ไม่ปลอดภัย
1 = ความเสี่ยงสูง
2 = พอใช้
3 = แข็งแกร่ง
4 = แน่นหนามาก
```

---

### 2.3 Check Password Against Breach Database

`src/frontend/lib/pwnedPassword.ts`

ใช้ **Have I Been Pwned API** ตรวจสอบแบบ real-time ขณะพิมพ์ โดยใช้เทคนิค **k-Anonymity**:

1. hash password ด้วย SHA-1 (เพราะ Have I Been Pwned API ใช้ SHA-1 เป็น format มาตรฐาน)
2. ส่งแค่ 5 ตัวแรกของ hash ไปที่ API (ไม่ส่ง password จริง)
3. API คืน hash ที่ขึ้นต้นด้วย prefix นั้นทั้งหมด
4. เช็คฝั่ง client ว่า hash ของเราตรงกับรายการที่รั่วไหลหรือไม่

ถ้าพบ → แสดงจำนวนครั้งที่รั่วไหล และแนะนำให้เปลี่ยน password

---

### 2.4 Allow Usage of All Characters

ระบบไม่ได้บล็อก character พิเศษ, unicode, หรือ whitespace ใน password field ค่า `max(128)` เป็นขีดจำกัดเดียว

---

### 2.5 Error Message Safety

Login ใน `src/server/services/auth.service.ts` ใช้ generic error message เดียวกันทั้งกรณี email ไม่มีในระบบ และ password ผิด:

```ts
// ไม่บอกว่า email มีอยู่หรือไม่
if (!user || !user.passwordHash) {
  await recordFailedAttempt(ip, email)
  throw new AuthError()  // → "Invalid email or password"
}
const valid = await verifyPassword(user.passwordHash, password)
if (!valid) {
  await recordFailedAttempt(ip, email)
  throw new AuthError()  // → "Invalid email or password"
}
```

ป้องกัน **user enumeration attack** — attacker ไม่สามารถรู้ได้ว่า email นั้นมีอยู่ในระบบหรือไม่

---

### 2.6 Rate Limit Login

`src/server/auth/rateLimit.ts`

มี 2 เงื่อนไขอิสระต่อกัน:

| ประเภท | เงื่อนไข | ผล |
| --- | --- | --- |
| Per Email | ผิด 5 ครั้งภายใน 15 นาที | ล็อค account 15 นาที |
| Per IP | ผิดรวม 10 ครั้งภายใน 1 ชั่วโมง | ล็อค IP 1 ชั่วโมง |

---

## A3. Password Storage

### 3.1 ข้อมูลใน Database

เก็บแค่ `passwordHash` field ใน User model ไม่มี plaintext password เลย

ค่าที่เก็บเป็น Argon2id encoded string ที่รวมทุกอย่างไว้ในค่าเดียว:

```text
$argon2id$v=19$m=19456,t=2,p=1$<salt>$<hash>
```

ประกอบด้วย: algorithm, version, parameters (memory/time/parallelism), salt, และ hash

---

### 3.2 ทำไมใช้ Argon2

`src/server/auth/password.ts` ใช้ **Argon2id** ตาม OWASP Password Storage Cheat Sheet

เหตุผลที่เลือก Argon2id:

- **variant `id`** ผสมข้อดีของ Argon2i (ป้องกัน side-channel attack) และ Argon2d (ป้องกัน GPU brute-force)
- **Memory-hard** — ใช้ RAM 19 MiB ต่อการ hash 1 ครั้ง ทำให้ GPU ที่มี VRAM จำกัดไม่สามารถ crack ได้จำนวนมากพร้อมกัน
- **ปรับ parameters ได้** ตามความสามารถของ hardware ในอนาคต

ค่าที่ใช้เป็น OWASP minimum: `memoryCost: 19456 (19 MiB)`, `timeCost: 2`, `parallelism: 1`

**สเปค VPS ที่ใช้งานจริง (Nipa Cloud — Intel Xeon Cascadelake):**

| Resource | ค่า |
| --- | --- |
| CPU | Intel Xeon Processor (Cascadelake) — 1 core |
| RAM ทั้งหมด | 1.7 GiB |
| RAM ว่าง | ~1.1 GiB (available) |
| Swap | ไม่มี |

ทดสอบ Argon2id บน VPS จริง:

```bash
/usr/bin/time -v node -e "require('argon2').hash('test', {
  type: 2, memoryCost: 19456, timeCost: 2, parallelism: 1
}).then(() => process.exit())" 2>&1 | grep "Maximum resident"

# Maximum resident set size (kbytes): 1024
```

ผลคือ Node.js process ใช้ RAM จริงเพียง **~1 MiB** ในขณะ hash เนื่องจาก Argon2 allocate memory ภายใน native library โดยไม่นับรวมใน resident set ของ process แต่ยังคงใช้ 19 MiB จริงสำหรับการคำนวณ

ด้วย RAM ว่าง ~1.1 GiB รองรับ concurrent login ได้ประมาณ:

```text
1100 MiB ÷ 19 MiB ≈ 57 concurrent logins
```

ซึ่งเพียงพอสำหรับระบบนี้

---

### 3.3 Salt อัตโนมัติ

Argon2 สร้าง **cryptographically random salt** ให้อัตโนมัติทุกครั้งที่เรียก `argon2.hash()` ไม่ต้องสร้างเอง

ผลคือ user 2 คนที่ใช้ password เดียวกัน จะได้ hash ที่ต่างกันโดยสิ้นเชิง ทำให้ Rainbow Table attack ใช้ไม่ได้

---

## A4. SSO (Google OAuth)

### 4.1 ต้องทำอะไรที่ฝั่ง Google

1. เปิด **Google Cloud Console** → สร้าง Project
2. เปิดใช้งาน **Google Identity / OAuth 2.0**
3. ไปที่ **Credentials** → สร้าง **OAuth 2.0 Client ID** (ประเภท Web application)
4. เพิ่ม **Authorized redirect URIs**: `https://yourdomain.com/auth/callback`
5. คัดลอก **Client ID** และ **Client Secret** ไปใส่ใน `.env.local`

---

### 4.2 ดึงอะไรมาจาก Google

`src/app/auth/callback/route.ts`

ขอ scope 3 อย่างตอน redirect:

```ts
googleClient.createAuthorizationURL(state, codeVerifier, [
  'openid',   // ← ยืนยัน identity / ได้ sub (unique user ID)
  'email',    // ← ได้ email address
  'profile',  // ← ได้ชื่อ (name)
])
```

ดึงจาก ID token:

```ts
const claims = decodeIdToken(idToken) as {
  sub: string    // unique Google user ID
  email: string  // email
  name?: string  // ชื่อ-นามสกุล
}
```

---

### 4.3 ถ้าต้องการดึงชื่อ-นามสกุลจาก Google

ต้องทำ 2 อย่าง:

1. **ขอ scope `profile`** ตอนสร้าง authorization URL (ทำอยู่แล้ว)
2. **อ่านจาก `claims.name`** ใน ID token (ทำอยู่แล้ว)

```ts
const claims = decodeIdToken(idToken) as { name?: string }
// ใช้ claims.name ได้เลย
```

ถ้าต้องการแยก first/last name → ต้องเรียก **Google People API** (`given_name`, `family_name`) เพิ่มเติม ซึ่งระบบนี้ไม่ได้ทำเพราะใช้แค่ชื่อเต็ม

---

### 4.4 ต้องทำอะไรที่ฝั่ง Web Application

`src/app/api/auth/google/route.ts` และ `src/app/auth/callback/route.ts`

1. **Generate `state`** — random string ป้องกัน CSRF
2. **Generate `codeVerifier`** — สำหรับ PKCE
3. **Redirect ไป Google** พร้อม state และ code_challenge
4. **เก็บ state และ codeVerifier ใน httpOnly cookie** ชั่วคราว (10 นาที)
5. **รับ callback** จาก Google พร้อม `code` และ `state`
6. **ตรวจสอบ state** ต้องตรงกับที่เก็บไว้ ป้องกัน CSRF
7. **Exchange code → tokens** ด้วย codeVerifier (PKCE)
8. **Decode ID token** เพื่อดึง user info
9. **สร้างหรือ link account** ในฐานข้อมูล
10. **ออก JWT** และ set httpOnly cookie

---

### 4.5 Check Login ซ้ำกับ Google

`src/server/services/auth.service.ts` — `handleGoogleUser()`

ค้นหาตาม `googleId` ก่อน ถ้าไม่พบค้นหาตาม `email`:

```ts
// 1. หาจาก googleId ก่อน (เคย login ด้วย Google แล้ว)
let user = await User.findOne({ googleId })

// 2. ถ้าไม่เจอ หาจาก email (อาจสมัครด้วย email/password ก่อนแล้ว)
if (!user) {
  user = await User.findOne({ email })
  if (user) {
    // Link Google account เข้ากับ account เดิม
    user.googleId = googleId
    await user.save()
  }
}

// 3. ถ้าไม่มีเลย สร้าง account ใหม่
if (!user) {
  user = await User.create({ email, googleId, ... })
}
```

กรณีที่รองรับ:

- **เคย login Google แล้ว** → เจอจาก `googleId` → login ทันที
- **เคยสมัครด้วย email/password** → เจอจาก `email` → link Google เข้ากับ account เดิม
- **ใหม่ทั้งคู่** → สร้าง account ใหม่

---

## B. JWT

---

## B1. Follow Requirement

### 1.1 Check 3 Role

`src/server/auth/requireAuth.ts`

ระบบมี 3 role และ helper function สำหรับแต่ละ role:

```ts
export async function requireAuth(request)      // user, admin, owner (authenticated เท่านั้น)
export async function requireAdmin(request)     // admin หรือ owner
export async function requireAdminOnly(request) // admin เท่านั้น
export async function requireOwner(request)     // owner เท่านั้น
```

แต่ละ function อ่าน `access_token` จาก cookie → verify JWT → เช็ค `payload.role` ถ้าไม่ผ่านจะ throw `ForbiddenError` (HTTP 403)

---

### 1.2 UI ของแต่ละ Role ไม่ได้ Share กัน

`src/middleware.ts`

กำหนด path ที่ access ได้ต่อ role:

```ts
const pathsByRole: Record<string, string[]> = {
  owner: ['/home', '/price', '/calendar', '/map', '/admin-management', '/settings'],
  admin: ['/home', '/price', '/calendar', '/map', '/employees', '/departments', '/settings'],
  user: ['/home', '/calendar', '/settings', '/map'],
}
```

| Page | user | admin | owner |
| --- | --- | --- | --- |
| `/home` | ✅ | ✅ | ✅ |
| `/calendar` | ✅ | ✅ | ✅ |
| `/map` | ✅ | ✅ | ✅ |
| `/settings` | ✅ | ✅ | ✅ |
| `/employees` | ❌ | ✅ | ❌ |
| `/departments` | ❌ | ✅ | ❌ |
| `/price` | ❌ | ✅ (view only) | ✅ |
| `/admin-management` | ❌ | ❌ | ✅ |

Middleware ตรวจสอบทุก request ก่อนถึง page ถ้า role ไม่มีสิทธิ์ → redirect ไป `/home` ทันที ไม่แสดง UI ของ role อื่น

---

### 1.3 DB Access ของแต่ละ Role ต่างกัน

`src/server/services/`

| Resource | user | admin | owner |
| --- | --- | --- | --- |
| Work schedules | เห็นเฉพาะของตัวเอง (`userId` filter) | เห็นทั้งหมด | เห็นทั้งหมด |
| Employees | ❌ | CRUD + approve/reject | ❌ |
| Departments | ❌ | CRUD | ❌ |
| Products/Pricing | ❌ | อ่านอย่างเดียว | CRUD + toggle visibility |
| Admin users | ❌ | ❌ | สร้าง/ลบ admin |

---

## B2. Bonus Explain Design Concept

### 2.1 Design Concept ของ JWT กับแต่ละ Role

#### JWT คืออะไรในระบบนี้

JWT เป็น **signed token** — server สร้างและเซ็นด้วย secret key แล้วส่งให้ client เก็บ ทุกครั้งที่ client ส่ง request กลับมา server ไม่ต้อง query DB ว่า "คนนี้คือใคร" แต่ verify ลายเซ็นบน token แทน

```text
[Login] → server ออก JWT → client เก็บใน httpOnly cookie
[Request] → client ส่ง cookie → server verify JWT → อนุญาต/ปฏิเสธ
```

#### Payload ที่ฝังใน JWT

```json
{
  "sub": "6600abc123...",
  "email": "user@example.com",
  "role": "admin",
  "isApproved": true,
  "iat": 1712345678,
  "exp": 1712374478
}
```

ข้อมูลทั้งหมดที่ต้องการตัดสินใจ authorization **อยู่ใน token แล้ว** ไม่ต้อง query DB ทุก request — นี่คือ design ที่ทำให้ JWT stateless

#### Role กับ JWT ทำงานร่วมกัน 2 ชั้น

ชั้นที่ 1 — Middleware ปกป้อง page:

```text
request เข้า /employees
→ middleware อ่าน access_token cookie
→ verify JWT signature
→ อ่าน payload.role = "admin"
→ เช็ค pathsByRole["admin"] → มี /employees ✅ → ผ่าน

หาก role = "user" → ไม่มี /employees → redirect /home ทันที
```

ชั้นที่ 2 — API routes ปกป้อง data:

```text
PATCH /api/employees/:id
→ requireAdminOnly(request)
→ verify JWT → payload.role = "user"
→ role !== "admin" → throw ForbiddenError → 403
```

สองชั้นทำงานอิสระต่อกัน — ข้ามชั้น 1 ได้ด้วยวิธีใดก็ตาม ชั้น 2 ยังบล็อกอยู่

#### Trade-off ที่ยอมรับ

Role เก็บใน JWT ไม่ใช่ query DB ทุก request ผลคือถ้า owner เพิกถอนสิทธิ์ admin — JWT ตัวเก่ายังมี `role: "admin"` อยู่จนหมดอายุ (สูงสุด 8h) ระบบนี้ยอมรับ trade-off นี้เพราะ access token อายุสั้น และไม่ใช่ระบบที่ต้องการ revoke ทันที

---

## B3. การสร้าง JWT

### 3.1 JWT_SECRET ได้มาจากไหน

`src/server/auth/jwt.ts`

```ts
const ACCESS_SECRET  = new TextEncoder().encode(process.env.JWT_ACCESS_SECRET!)
const REFRESH_SECRET = new TextEncoder().encode(process.env.JWT_REFRESH_SECRET!)
```

- Secret อ่านจาก **environment variable** เท่านั้น ไม่ได้ hardcode ในโค้ด
- `TextEncoder().encode()` แปลง string เป็น `Uint8Array` ตามที่ `jose` library ต้องการ

สร้าง secret ด้วย **[jwtsecrets.com](https://jwtsecrets.com/)** เลือก **512 bits** — ได้ random string ที่มี 512 bits ซึ่งสูงกว่า OWASP minimum (256 bits สำหรับ HS256) มาก ทำให้ brute-force secret สามารถทำได้ยากมาก

**สร้าง JWT เมื่อไหร่/ที่ไหน:**

| เหตุการณ์ | ไฟล์ |
| --- | --- |
| Login สำเร็จ | `src/app/api/auth/login/route.ts` |
| Register สำเร็จ | `src/app/api/auth/register/route.ts` |
| Google OAuth callback | `src/app/auth/callback/route.ts` |
| Refresh token | `src/app/api/auth/refresh/route.ts` |

ทุก case เรียก `signAccessToken()` และ `signRefreshToken()` จาก `src/server/auth/jwt.ts`

---

### 3.2 Algorithm ที่ใช้และเหตุผล

```ts
.setProtectedHeader({ alg: 'HS256' })
```

ใช้ **HS256** (HMAC-SHA256) — symmetric algorithm

**ทำไมไม่ใช้ RS256:**

| | HS256 | RS256 |
| --- | --- | --- |
| Key | 1 secret key (sign + verify) | Private key (sign) + Public key (verify) |
| เหมาะกับ | Monolith / Single service | Microservices / Third-party token consumer |
| ความซับซ้อน | ต่ำ | สูง (ต้องจัดการ key pair) |

ระบบนี้เป็น Next.js monolith — ทั้ง sign และ verify อยู่ใน process เดียวกัน ไม่มี external service ที่ต้องอ่าน token โดยไม่รู้ secret HS256 จึงเหมาะสมและง่ายกว่า

**Access token อายุ 8 ชั่วโมง:**

เลือก 8h เพราะตรงกับ work shift ปกติ — user login ตอนเช้า token ยังใช้ได้ถึงสิ้นวัน โดยไม่ต้อง refresh บ่อย Refresh token อายุ 24h เผื่อกรณี shift ข้ามคืน

---

## B4. การส่ง Token

### 4.1 JWT ถูกส่งใน Cookie

`src/server/auth/session.ts`

```ts
response.cookies.set('access_token', accessToken, { ... })
response.cookies.set('refresh_token', refreshToken, { ... })
```

Token ถูก set ใน **HTTP response cookie** โดย server ไม่ได้ return token ใน JSON body และ frontend ไม่ได้เก็บใน `localStorage` หรือ `sessionStorage`

---

### 4.2 httpOnly และ Secure Flag

```ts
response.cookies.set('access_token', accessToken, {
  httpOnly: true,       // JavaScript ฝั่ง browser อ่านไม่ได้
  sameSite: 'lax',     // ป้องกัน CSRF cross-site request
  secure: IS_PROD,     // ส่งผ่าน HTTPS เท่านั้น (production)
  path: '/',
  maxAge: 8 * 60 * 60, // 8 ชั่วโมง
})
```

| Flag | ผล |
| --- | --- |
| `httpOnly: true` | JavaScript (`document.cookie`) อ่านค่า token ไม่ได้ ป้องกัน XSS ขโมย token |
| `secure: true` | Browser ส่ง cookie เฉพาะ HTTPS ป้องกัน token รั่วใน HTTP |
| `sameSite: 'lax'` | Cookie ไม่ถูกส่งใน cross-site POST request ลด CSRF risk |

---

### 4.3 ฝั่ง Client จะดู JWT ได้ยังไง

เนื่องจาก `httpOnly: true` — JavaScript ใน browser **อ่านค่า cookie ไม่ได้** (`document.cookie` จะไม่แสดง token)

วิธีดูค่า token สำหรับ developer:

1. เปิด **Browser DevTools** (F12)
2. ไปที่ **Application** → **Storage** → **Cookies** → เลือก domain
3. จะเห็น `access_token` และ `refresh_token` พร้อมค่า JWT

จากนั้น copy ค่า JWT ไปที่ **[jwt.io](https://jwt.io)** เพื่อ decode payload (ไม่ต้องรู้ secret เพราะ payload ไม่ได้โดน encrypt)

---

### 4.4 Decode Payload หน้าตาเป็นแบบไหน

JWT มี 3 ส่วน คั่นด้วย `.`:

```text
header.payload.signature
```

Decode payload ของ access token:

```json
{
  "sub": "6600abc123def456...",
  "email": "user@example.com",
  "role": "admin",
  "isApproved": true,
  "iat": 1712345678,
  "exp": 1712374478
}
```

| Field | ความหมาย |
| --- | --- |
| `sub` | MongoDB `_id` ของ user |
| `email` | email address |
| `role` | `user` / `admin` / `owner` |
| `isApproved` | สถานะ approval |
| `iat` | เวลาออก token (Unix timestamp) |
| `exp` | เวลาหมดอายุ (Unix timestamp) |

---

## B5. การ Verify Token

### 5.1 verify function อยู่ที่ไหน

มี 2 ที่:

**1. Middleware** — `src/middleware.ts`

```ts
const payload = await verifyAccessToken(token)
```

ตรวจสอบทุก request ที่เข้า protected page ก่อนถึง route handler

**2. API routes** — ผ่าน `src/server/auth/requireAuth.ts`

```ts
export async function requireAuth(request: NextRequest): Promise<AuthPayload> {
  const token = getTokenFromRequest(request)
  return await verifyAccessToken(token)  // ← verify ที่นี่
}
```

ทุก API route ที่ต้อง auth จะเรียก `requireAuth()` / `requireAdmin()` / `requireOwner()` ซึ่งล้วน verify JWT ทั้งนั้น

---

### 5.2 Verify ต่างกับ Decode ยังไง

`src/server/auth/jwt.ts` ใช้ `jwtVerify` จาก `jose`:

```ts
export async function verifyAccessToken(token: string): Promise<AuthPayload> {
  const { payload } = await jwtVerify(token, ACCESS_SECRET)
  return payload as AuthPayload
}
```

| | Decode | Verify |
| --- | --- | --- |
| ทำอะไร | อ่าน payload จาก base64 ล้วนๆ | ตรวจสอบ signature + expiry + secret |
| ต้องรู้ secret ไหม | ❌ | ✅ |
| ป้องกัน token ปลอมได้ไหม | ❌ | ✅ |
| ใช้ตรงไหน | DevTools / jwt.io เพื่อ debug | Backend ทุก request |

ถ้าใช้แค่ decode โดยไม่ verify — attacker สามารถแก้ role ใน payload แล้ว re-encode ส่งมาได้โดยที่ระบบยอมรับ การ verify ด้วย secret ทำให้ token ที่ถูกแก้ไขจะ fail ทันที

---

### 5.3 ถ้า Token หมดอายุหรือ Invalid

**บน Page (Middleware):**

```ts
} catch {
  // Token expired or invalid — attempt refresh
  const refreshToken = request.cookies.get('refresh_token')?.value
  if (refreshToken) {
    const refreshUrl = new URL('/api/auth/refresh', request.url)
    refreshUrl.searchParams.set('returnUrl', path)
    return NextResponse.redirect(refreshUrl)  // → พยายาม refresh ก่อน
  }
  return NextResponse.redirect(new URL('/auth/login', request.url))  // → login
}
```

ลำดับ:

1. access token invalid/expired → redirect ไป `/api/auth/refresh?returnUrl=<path>`
2. `/api/auth/refresh` verify refresh token → ออก access token ใหม่ → redirect กลับ `returnUrl`
3. ถ้า refresh token ก็ invalid → redirect ไป `/auth/login`

**บน API Routes:**

```ts
export function handleAuthError(error: unknown): Response {
  if (error instanceof AuthError) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (error instanceof ForbiddenError) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }
}
```

API route return **401** ถ้าไม่มี/invalid token และ **403** ถ้ามี token แต่ role ไม่มีสิทธิ์

---

## B6. Bonus Implement: Refresh Token Mechanism

### 6.1 กรณีไหนใช้ / ไม่ใช้ Refresh Token

Refresh token แก้ปัญหา **tension ระหว่าง security กับ UX**:

- access token อายุสั้น → ปลอดภัย แต่ถ้าหมดแล้วต้อง login ใหม่ทุกครั้ง → UX แย่
- access token อายุยาว → ไม่ต้อง login บ่อย แต่ถ้าถูกขโมยก็ใช้ได้นานมาก → ไม่ปลอดภัย

Refresh token แก้โดยแยก concern ออกเป็น 2 token:

| | Access Token | Refresh Token |
| --- | --- | --- |
| อายุ | สั้น (8h) | ยาวกว่า (24h) |
| ใช้ทำอะไร | ยืนยัน identity ทุก request | ขอ access token ใหม่เมื่อหมดอายุ |
| ส่งบ่อยแค่ไหน | ทุก request | เฉพาะตอน access token หมด |
| ถ้าถูกขโมย ความเสียหาย | 8h | จนกว่าจะ logout หรือ 24h |

**กรณีที่ควรใช้ Refresh Token:**

- ระบบที่ user ใช้งานต่อเนื่องนานกว่า access token อายุ (เช่น work shift 8h)
- ต้องการ UX ที่ไม่บังคับ login ซ้ำบ่อย
- ระบบที่ต้องการ revoke session ได้ (เก็บ hash ใน DB)

**กรณีที่ไม่จำเป็นต้องใช้:**

- Single-page app ที่ session สั้นมาก หรือ user ยอมรับ login บ่อยได้
- Public API ที่ใช้ API key แทน JWT
- ระบบที่ stateless อย่างสมบูรณ์และไม่ต้องการ revoke

---

### 6.2 การออกแบบอายุ Access Token และ Refresh Token

`src/server/auth/jwt.ts`

```ts
.setExpirationTime('8h')   // access token
.setExpirationTime('24h')  // refresh token
```

#### Access Token — 8 ชั่วโมง

เลือก 8h เพราะตรงกับ work shift ปกติ — user login ตอนเช้า token ยังใช้ได้ถึงสิ้นวันโดยไม่ต้อง refresh กลางคัน อายุสั้นพอที่ถ้าถูกขโมยความเสียหายจำกัด

#### Refresh Token — 24 ชั่วโมง

เลือก 24h เผื่อกรณี shift ข้ามคืน หรือ user เปิด browser ค้างข้ามวัน ยาวพอให้ middleware refresh access token ใหม่ได้โดยไม่ต้อง login ซ้ำ

`src/server/auth/session.ts` ตั้ง `maxAge` ของ cookie ให้ตรงกับ JWT expiry:

```ts
maxAge: 8 * 60 * 60,   // access_token cookie
maxAge: 24 * 60 * 60,  // refresh_token cookie
```

ทำให้ cookie หมดอายุพร้อมกับ JWT — browser จะลบ cookie ให้อัตโนมัติ

---

### 6.3 การเก็บ Refresh Token อย่างปลอดภัย

ระบบนี้ป้องกัน refresh token ใน 3 ชั้น:

#### ชั้นที่ 1 — httpOnly Cookie

`src/server/auth/session.ts`

```ts
response.cookies.set('refresh_token', refreshToken, {
  httpOnly: true,   // JavaScript อ่านไม่ได้ → ป้องกัน XSS ขโมย token
  secure: IS_PROD,  // ส่งผ่าน HTTPS เท่านั้น → ป้องกัน sniff บน HTTP
  sameSite: 'lax',  // ป้องกัน CSRF cross-site request
})
```

#### ชั้นที่ 2 — เก็บเฉพาะ Hash ใน Database

`src/server/services/auth.service.ts`

```ts
const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex')
// บันทึกใน DB: { refreshTokenHash: tokenHash, refreshTokenExpiresAt: expiresAt }
```

token จริงไม่ได้อยู่ใน DB — ถ้า DB รั่ว attacker ได้แค่ SHA-256 hash ซึ่งไม่สามารถ reverse กลับเป็น token ได้

#### ชั้นที่ 3 — Verify ทั้ง Hash และวันหมดอายุ

```ts
const user = await User.findOne({
  refreshTokenHash: tokenHash,
  refreshTokenExpiresAt: { $gt: new Date() },
})
```

ต้องผ่านทั้งสองเงื่อนไขพร้อมกัน — hash ตรง และยังไม่หมดอายุ ถ้า logout แล้ว hash ถูกล้าง แม้ attacker มี token ก็ refresh ไม่ได้

---

## C. Secure Communication

---

## C0. แสดง HTTPS ได้

ระบบใช้ **Let's Encrypt** ผ่าน Certbot เพื่อออก SSL/TLS certificate ให้ domain ทำให้ browser แสดงกุญแจเขียว (HTTPS)

```bash
sudo certbot certonly --standalone -d yourdomain.com -d www.yourdomain.com
```

Certificate ถูกเก็บที่ `/etc/letsencrypt/live/yourdomain.com/` และ Nginx โหลดขึ้นมาใช้งาน

---

## C1. About CA

### 1.1 CA คือใคร

**CA (Certificate Authority)** คือองค์กรที่ทำหน้าที่รับรองว่า certificate ที่ออกให้ domain นั้นถูกต้องและเชื่อถือได้

ระบบนี้ใช้ **Let's Encrypt** เป็น CA — เป็น CA สาธารณะที่ไม่มีค่าใช้จ่าย ดำเนินการโดย Internet Security Research Group (ISRG) และ browser ทุกตัวเชื่อถือ Let's Encrypt โดยค่าเริ่มต้น

ลำดับความเชื่อถือ (Chain of Trust):

```text
ISRG Root X1  (Root CA — ฝังอยู่ใน OS/browser)
    └── Let's Encrypt R11  (Intermediate CA)
            └── Certificate ของ yourdomain.com  (End-entity)
```

---

### 1.2 CA Signature Algorithm

Let's Encrypt ใช้ **ECDSA P-384** สำหรับ Intermediate CA (R11) และ **RSA 2048** สำหรับ Root CA (ISRG Root X1) เพื่อ backward compatibility กับ device รุ่นเก่า

ตรวจสอบได้ด้วย:

```bash
openssl s_client -connect yourdomain.com:443 2>/dev/null | openssl x509 -noout -text | grep "Signature Algorithm"
```

---

### 1.3 Public Key Algorithm

Certificate ของ domain ใช้ **ECDSA P-256** (EC 256-bit) — ให้ความปลอดภัยเทียบเท่า RSA 3072 แต่ขนาด key เล็กกว่ามาก ทำให้ TLS handshake เร็วกว่า

ตรวจสอบด้วย:

```bash
openssl s_client -connect yourdomain.com:443 2>/dev/null | openssl x509 -noout -text | grep "Public Key Algorithm" -A 2
```

---

### 1.4 กุญแจเขียวมีไว้ทำอะไร

กุญแจเขียว (🔒) ใน browser แสดงว่าการเชื่อมต่อนี้ผ่าน **HTTPS/TLS** ซึ่งให้ 3 สิ่ง:

| สิ่งที่ได้ | ความหมาย |
| --- | --- |
| **Encryption** | ข้อมูลระหว่าง browser กับ server ถูก encrypt — คนกลาง sniff ไม่ได้ |
| **Integrity** | ข้อมูลไม่ถูกแก้ไขระหว่างทาง — detect ได้ถ้ามีใครแก้ |
| **Authentication** | ยืนยันว่า server นี้คือ domain จริง ไม่ใช่ impersonator |

ในระบบนี้สำคัญมากเพราะ token ถูกส่งใน cookie — ถ้าไม่มี HTTPS cookie จะถูก sniff ได้ระหว่างทาง flag `secure: IS_PROD` ใน session.ts ป้องกันโดยไม่ให้ส่ง cookie บน HTTP เลย

---

## C2. Server เก็บ Private Key / Public Key ไว้ที่ไหน

### 2.1 Private Key

เก็บที่:

```text
/etc/letsencrypt/live/yourdomain.com/privkey.pem
```

ตั้งสิทธิ์โดย Certbot อัตโนมัติ:

```bash
ls -la /etc/letsencrypt/live/yourdomain.com/privkey.pem
# -rw-r----- root ssl-cert  ← 640 (root อ่านได้, ssl-cert group อ่านได้, อื่นๆ ไม่ได้)
```

Nginx อ่าน private key ผ่าน `nginx.conf`:

```nginx
ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
```

private key **ไม่ได้อยู่ใน source code** และไม่ได้ขึ้น Git

### 2.2 Public Key

Public key ฝังอยู่ใน **certificate** ที่เก็บที่:

```text
/etc/letsencrypt/live/yourdomain.com/fullchain.pem
```

```nginx
ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
```

`fullchain.pem` คือ certificate ของ domain + Intermediate CA chain รวมกัน — Nginx ส่งไปให้ browser ตอน TLS handshake browser ใช้ public key ใน certificate นี้ verify signature และทำ key exchange

---

## D. Secret Management

---

## D1. ไฟล์ ENV

### 1.1 สิทธิ์ไฟล์ .env ถูกต้อง

ตาม `docs/DEPLOY.md` หลังสร้าง `.env.local` บน VPS ตั้งสิทธิ์ทันที:

```bash
chmod 600 .env.local
```

ผล:

```bash
ls -la .env.local
# -rw------- root root  ← 600 (เจ้าของอ่าน/เขียนได้เท่านั้น)
```

---

### 1.2 Client Secret ของ SSO อยู่ใน .env

`src/server/auth/google.ts`

```ts
export const googleClient = new Google(
  process.env.GOOGLE_CLIENT_ID!,
  process.env.GOOGLE_CLIENT_SECRET!,
  process.env.GOOGLE_REDIRECT_URI!
)
```

ค่าจริงอยู่ใน `.env.local` เท่านั้น ไม่ได้ hardcode

---

### 1.3 ไม่มีการ Hardcode Client Secret

ค้นหาใน source code ทั้งหมดจะไม่พบ string ที่เป็น credential จริง — ทุก secret อ่านผ่าน `process.env.*` เสมอ

---

### 1.4 JWT Secret อยู่ใน .env และไม่มี Hardcode

`src/server/auth/jwt.ts`

```ts
const ACCESS_SECRET  = new TextEncoder().encode(process.env.JWT_ACCESS_SECRET!)
const REFRESH_SECRET = new TextEncoder().encode(process.env.JWT_REFRESH_SECRET!)
```

ค่าจริงอยู่ใน `.env.local` — ถ้าไม่มีตัวแปรนี้ `!` จะทำให้ TypeScript แจ้ง error ตอน compile

---

## D2. Private Key

### 2.1 สิทธิ์ไฟล์ Private Key ถูกต้อง

Certbot ตั้งสิทธิ์ให้อัตโนมัติ:

```bash
ls -la /etc/letsencrypt/live/yourdomain.com/
# privkey.pem   -rw-r----- (640)
# fullchain.pem -rw-r--r-- (644)
```

`privkey.pem` เข้าถึงได้เฉพาะ root และ ssl-cert group ซึ่ง Nginx run ด้วย user นั้น

### 2.2 Private Key ไม่อยู่ใน Source Code

TLS private key ถูกเก็บไว้ที่ `/etc/letsencrypt/` บน VPS เท่านั้น ไม่มีในโปรเจกต์ ไม่มีใน Git repository

---

## D3. ไม่นำ ENV ขึ้น Git

### 3.1 .env อยู่ใน .gitignore

`.gitignore`

```text
.env*
```

pattern `.env*` ครอบคลุม `.env`, `.env.local`, `.env.production` และทุก variant

### 3.2 git log ไม่เคยมี .env ขึ้นไป

```bash
git log --all --full-history -- "**/.env*"
# (ไม่มี output — ไม่เคยมี commit ที่รวม .env เลย)
```

---

## E. SQLi and XSS

---

## E1. SQL Injection

### 1.1 บอกได้ว่าจะเจอ SQLi เมื่อไร

**SQL Injection** เกิดขึ้นเมื่อ application นำ input จาก user ไป **ต่อสตริงเป็น SQL query** โดยตรง:

```ts
// ตัวอย่าง vulnerable code (ไม่ใช่ของระบบนี้)
const query = `SELECT * FROM users WHERE email = '${email}'`
// ถ้า email = "' OR '1'='1" → query กลายเป็น:
// SELECT * FROM users WHERE email = '' OR '1'='1'
// → คืนทุก row ในตาราง
```

ระบบนี้ใช้ **MongoDB ไม่ใช่ SQL database** จึงไม่เสี่ยง SQL Injection แต่เสี่ยง **NoSQL Injection** แทน เช่น ส่ง `{ "$gt": "" }` แทน string ปกติ

---

### 1.2 การป้องกัน — Mongoose ORM + Zod Validation

#### ชั้นที่ 1 — Mongoose (ORM)

`src/server/services/auth.service.ts`

```ts
const user = await User.findOne({ email: email.toLowerCase().trim() })
```

Mongoose รับ JavaScript object แล้ว build query ให้อัตโนมัติ ไม่มีการ concatenate string เป็น query เลย ทำให้ operator injection (`$gt`, `$where`) ถูก sanitize โดย Mongoose driver

#### ชั้นที่ 2 — Zod Validation

API routes ทุกตัวที่รับ input ใช้ Zod validate ก่อน:

```ts
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})
const parsed = loginSchema.safeParse(body)
if (!parsed.success) return NextResponse.json({ error: ... }, { status: 400 })
```

Zod บังคับให้ `email` เป็น string ที่มีรูปแบบ email จริงเท่านั้น — object ที่มี `$gt` จะ fail validation ก่อนถึง database

---

### 1.3 วิธีนั้นป้องกัน Injection ได้อย่างไร

Mongoose ใช้ **parameterized query** ในระดับ driver — ค่าที่ส่งเข้าไปถูกแยกออกจาก query structure เสมอ:

```text
User.findOne({ email: userInput })
        ↓
MongoDB driver ส่ง: { filter: { email: <value> } }
ไม่ใช่:           "db.users.find({ email: '" + userInput + "' })"
```

ถ้า `userInput` เป็น `{ "$gt": "" }` — Mongoose จะ serialize เป็น value ไม่ใช่ operator เพราะ Zod บังคับ type เป็น `string` ก่อน object นั้นจะผ่านมาไม่ได้เลย

---

### 1.4 ทดสอบด้วย `' OR '1'='1` ใน Login

เนื่องจากระบบใช้ MongoDB ไม่ใช่ SQL — input นี้จะถูกจัดการดังนี้:

1. Zod validate → `email` ต้องเป็น email format → `' OR '1'='1` ไม่ใช่ email → **400 Bad Request**
2. ถึงแม้ส่ง email format จริงมาพร้อม string แปลก → Mongoose ส่งค่าเป็น literal string ไปหาใน DB → `User.findOne({ email: "' OR '1'='1" })` → **ไม่เจอ user → 401**

ไม่มีทางที่ input นี้จะทำให้ได้ข้อมูลที่ไม่ควรได้

---

## E2. XSS (Cross-Site Scripting)

### 2.1 บอกได้ว่าจะเจอ XSS เมื่อไร

**XSS** เกิดขึ้นเมื่อ application นำ input จาก user ไป **render เป็น HTML/JavaScript** โดยไม่ escape:

```js
// ตัวอย่าง vulnerable code (ไม่ใช่ของระบบนี้) — vanilla JS ที่ไม่ใช้ framework
const userInput = "<script>steal(document.cookie)</script>"
document.getElementById('output').innerHTML = userInput
// → browser parse HTML → script ถูก execute ทันที
```

เสี่ยงทุกที่ที่แสดงข้อมูลจาก user เช่น ชื่อพนักงาน, รายละเอียดงาน, ชื่อแผนก

---

### 2.2 การป้องกัน

#### React Escaping (อัตโนมัติ)

React แปลงตัวอักษรพิเศษใน `{}` เป็น HTML entities อัตโนมัติก่อน render ทุกครั้ง:

| ตัวอักษร | กลายเป็น |
| --- | --- |
| `<` | `&lt;` |
| `>` | `&gt;` |
| `"` | `&quot;` |
| `&` | `&amp;` |

ตัวอย่าง — สมมติ attacker กรอกชื่อพนักงานเป็น:

```text
<script>alert('XSS')</script>
```

React render `{employee.name}` → browser ได้รับ:

```text
&lt;script&gt;alert('XSS')&lt;/script&gt;
```

browser อ่าน `&lt;` เป็นตัวอักษร `<` ธรรมดา ไม่ใช่ tag HTML → แสดงเป็นข้อความบนหน้าจอ ไม่ execute

#### httpOnly Cookie

แม้มี XSS สำเร็จ — `document.cookie` จะไม่เห็น `access_token` และ `refresh_token` เพราะ `httpOnly: true` ทำให้ขโมย session ผ่าน XSS ไม่ได้

---

### 2.3 วิธีนั้นป้องกัน XSS ได้อย่างไร

React ใช้ Virtual DOM — ก่อน render จริงจะแปลง `<`, `>`, `"`, `'`, `&` เป็น HTML entities เสมอ เว้นแต่ใช้ `dangerouslySetInnerHTML` ซึ่งระบบนี้ไม่ได้ใช้เลย

```text
input: <script>alert(1)</script>
         ↓ React escape
output: &lt;script&gt;alert(1)&lt;/script&gt;
         ↓ browser render
display: <script>alert(1)</script>  (ข้อความธรรมดา ไม่ execute)
```

---

### 2.4 ทดสอบด้วย Script

ลองพิมพ์ใน field ที่แสดงผล เช่น ชื่อพนักงาน หรือ detail งาน:

```text
<script>alert('XSS')</script>
```

ผลที่ได้: ข้อความนั้นจะแสดงเป็น text ตรงๆ บนหน้าจอ — alert ไม่ popup เพราะ React escape ให้อัตโนมัติ

ทดสอบเพิ่มเติม:

```text
<img src=x onerror="alert('XSS')">
```

ผลเดียวกัน — React render เป็น text ไม่ใช่ HTML tag จริง

---

## E3. Bonus CSRF

### 3.1 บอกได้ว่าจะเจอ CSRF เมื่อไร

**CSRF (Cross-Site Request Forgery)** เกิดขึ้นเมื่อ attacker หลอกให้ browser ของ victim ส่ง request ไปยัง server โดยที่ victim ไม่รู้ตัว เพราะ browser จะแนบ cookie ไปอัตโนมัติทุก request ไม่ว่าจะมาจากเว็บไหน

ตัวอย่างสถานการณ์:

```text
1. victim login ที่ myapp.com → มี session cookie อยู่ใน browser
2. victim เปิดเว็บ attacker.com
3. attacker.com มี HTML ซ่อนอยู่:
   <form action="https://myapp.com/api/employees" method="POST">
     <input name="role" value="owner">
   </form>
   <script>document.forms[0].submit()</script>
4. browser ส่ง POST ไป myapp.com พร้อม cookie ของ victim อัตโนมัติ
5. server เห็น cookie ถูกต้อง → ทำงานตามคำสั่ง attacker
```

เสี่ยงทุก endpoint ที่ใช้ cookie authentication และรับ request จาก form หรือ cross-site

---

### 3.2 การป้องกัน

ระบบนี้ป้องกัน CSRF ใน 2 ชั้น:

#### ชั้นที่ 1 — `SameSite=Lax` Cookie

`src/server/auth/session.ts`

```ts
response.cookies.set('access_token', accessToken, {
  sameSite: 'lax',  // ← บล็อก cross-site POST request
})
```

#### ชั้นที่ 2 — State Parameter ใน Google OAuth

`src/app/api/auth/google/route.ts`

```ts
const state = generateState()          // random string
const codeVerifier = generateCodeVerifier()  // PKCE

// เก็บ state ใน httpOnly cookie ชั่วคราว
response.cookies.set('google_oauth_state', state, { httpOnly: true, maxAge: 600 })

// ส่ง state ไปกับ redirect URL
googleClient.createAuthorizationURL(state, codeVerifier, [...])
```

`src/app/auth/callback/route.ts`

```ts
// ตรวจสอบ state ที่รับกลับมาต้องตรงกับที่เก็บไว้
if (storedState !== state) {
  return new Response('Invalid state', { status: 400 })
}
```

---

### 3.3 วิธีนั้นป้องกัน CSRF ได้อย่างไร

**`SameSite=Lax` ทำงานอย่างไร:**

| Request ประเภท | SameSite=Lax ส่ง cookie ไหม |
| --- | --- |
| user คลิก link มาจากเว็บอื่น (GET) | ✅ ส่ง |
| form POST จากเว็บอื่น | ❌ ไม่ส่ง |
| fetch/XHR จากเว็บอื่น | ❌ ไม่ส่ง |
| request จาก domain เดียวกัน | ✅ ส่ง |

CSRF attack ใช้ form POST หรือ fetch จาก attacker.com → browser จะไม่แนบ cookie ไปด้วย → server เห็นว่าไม่มี token → 401

**State parameter ป้องกัน OAuth CSRF:**

attacker ไม่สามารถรู้ค่า `state` ที่ server สร้างขึ้น random ได้ ถ้า attacker redirect victim ไปยัง callback URL ด้วย `state` ปลอม → callback เช็คแล้วไม่ตรง → ปฏิเสธทันที

---

### 3.4 Demo Attack Test

**ทดสอบ CSRF บน API endpoint:**

สร้างไฟล์ HTML บนเครื่อง (จำลอง attacker.com) แล้วเปิดใน browser ขณะที่ login อยู่:

```html
<!DOCTYPE html>
<html>
<body>
  <h1>attacker.com</h1>
  <form id="csrf" action="http://localhost:3000/api/employees" method="POST">
    <input name="name" value="HACKED">
  </form>
  <script>document.getElementById('csrf').submit()</script>
</body>
</html>
```

**ผลที่คาดว่าได้:**

request ถูกส่งไปจริง แต่ browser ไม่แนบ `access_token` cookie เพราะ `SameSite=Lax` → server ไม่มี token → `requireAuth` throw AuthError → **401 Unauthorized** — CSRF ล้มเหลว

**ทดสอบ OAuth state:**

ลอง access callback URL โดยตรงโดยไม่ผ่าน Google redirect จริง:

```text
http://localhost:3000/auth/callback?code=fakecode&state=fakestate
```

ผล: `storedState !== state` → **400 Invalid state** — OAuth CSRF ล้มเหลว
