# Owner dashboard setup

The dashboard is at `/admin`. It requires an owner email/password and a six-digit TOTP code from an authenticator app. No default owner account or password is stored in the project.

## 1. Create the local secrets

In PowerShell from the project root, generate an encryption key and a TOTP secret:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
node -e "const c=require('crypto'),a='ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';console.log([...c.randomBytes(20)].map(b=>a[b%32]).join(''))"
```

Add the values to the ignored `.env` file. Use a unique password of at least 12 characters.

```env
OWNER_TOTP_ENCRYPTION_KEY="paste-the-first-generated-value"
OWNER_TOTP_SECRET="paste-the-second-generated-value"
OWNER_EMAIL="owner@example.com"
OWNER_PASSWORD="use-a-long-unique-password"
```

The encryption key must be the full first command output. A 64-character hexadecimal key is also accepted if you generated one elsewhere.

Keep this file private. Changing `OWNER_TOTP_ENCRYPTION_KEY` after creating the account prevents the server from reading the stored TOTP secret; reset the owner account instead.

## 2. Add the TOTP secret to an authenticator app

Open Google Authenticator, Microsoft Authenticator, Authy, or another TOTP app. Add an account manually, use **Time-based** mode, then paste `OWNER_TOTP_SECRET` as the key. The app will display a new six-digit code every 30 seconds.

## 3. Create or reset the local owner account

```powershell
npm.cmd run owner:bootstrap
```

The command creates the owner or resets its password and registered TOTP secret using the values in `.env`.

## 4. Start and access the dashboard

Run the API and Vite app in separate terminals:

```powershell
npm.cmd run server:dev
```

```powershell
npm.cmd run dev
```

Open `http://localhost:5173/admin`, enter `OWNER_EMAIL` and `OWNER_PASSWORD`, then enter the current six-digit code from your authenticator app.

The first dashboard increment displays recent orders. Catalog, capacity, delivery, and order-operation controls are still being built.
