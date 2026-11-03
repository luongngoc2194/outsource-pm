# Outsource PM — Project Rules & Turso Cloud DB Memory

## 1. Turso Cloud SQLite Connection
- **Turso Account**: `luongngoc2194` (`https://app.turso.tech/luongngoc2194`)
- **Database Name**: `outsource-pm`
- **TURSO_DATABASE_URL**: `libsql://outsource-pm-luongngoc2194.aws-ap-southeast-1.turso.io`
- **TURSO_HTTP_URL**: `https://outsource-pm-luongngoc2194.aws-ap-southeast-1.turso.io/v2/pipeline`
- **TURSO_AUTH_TOKEN**: `eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3OTM2NzczNDMsImlkIjoiMDFhMTlmN2YtODkwMS03ZDliLTk0ZGItZGNkMzk3NDY2ZWJhIiwia2lkIjoiQ0diN1RyeVNYQk5oWWxUMnNUakNYdGctQTFtd2RZcm1BaE1oN2d2WDU1USIsInJpZCI6ImZiOWVhNmQ2LWI1MjUtNGYwZS05MDEwLTE2OTkzMzc0MmZmMyJ9.dJAB7-JRKtTEGCxalr17xT6dIPDHx-v6Fo7x9Xp0UjHc3JBzyz7IpgHH2xp5nCHcoRLLI0ddvTH1JkyKW9K6AQ`
- **Config File**: `backend/turso-config.json`
- **Sync Module**: `backend/turso.js`

## 2. Core Conventions
- Đơn vị nỗ lực chính: **MM (Man-Month)** với bước nhảy **`0.01 MM`** (quy đổi phụ `1 MM = 22 MD`).
- Giữ đồng bộ các file giao diện: `Main.dc.html`, `index.html`, `prototype.html`.
