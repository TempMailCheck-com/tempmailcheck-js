# tempmailcheck

[![npm version](https://img.shields.io/npm/v/tempmailcheck.svg)](https://www.npmjs.com/package/tempmailcheck)
[![license](https://img.shields.io/npm/l/tempmailcheck.svg)](https://github.com/TempMailCheck-com/tempmailcheck-js/blob/main/LICENSE)
[![bundle size](https://img.shields.io/bundlephobia/minzip/tempmailcheck)](https://bundlephobia.com/package/tempmailcheck)

Lightweight, zero-dependency JavaScript/TypeScript client for the [TempMailCheck](https://tempmailcheck.com) disposable email detection API.

- **Zero dependencies** — uses native `fetch` (Node 18+)
- **Tiny** — under 5 KB minified
- **TypeScript** — full type definitions included
- **Dual package** — ESM and CJS exports

## Install

```bash
npm install tempmailcheck
```

## Quick Start

```typescript
import TempMailCheck from 'tempmailcheck';

const tmc = new TempMailCheck('your-api-key');

// Check a single email
const result = await tmc.check('user@mailinator.com');
console.log(result.disposable); // true
console.log(result.score);      // 0.15

// Check a domain
const domain = await tmc.domain('mailinator.com');
console.log(domain.disposable); // true

// Bulk check
const bulk = await tmc.bulk(
  ['a@temp.com', 'b@gmail.com'],
  { poll: true }
);
console.log(bulk.results);
```

## API Reference

### `new TempMailCheck(apiKey, options?)`

| Option    | Type     | Default                              | Description          |
| --------- | -------- | ------------------------------------ | -------------------- |
| `baseUrl` | `string` | `https://api.tempmailcheck.com/v1`   | API base URL         |
| `timeout` | `number` | `30000`                              | Request timeout (ms) |

### `tmc.check(email)`

Check if a single email address is disposable.

```typescript
const result = await tmc.check('test@mailinator.com');
// {
//   status: 200,
//   email: "test@mailinator.com",
//   domain: "mailinator.com",
//   valid_syntax: true,
//   disposable: true,
//   free_provider: false,
//   has_mx: true,
//   score: 0.15,
//   credits_remaining: 950,
//   ms: 12
// }
```

### `tmc.domain(domain)`

Check if a domain is disposable.

```typescript
const result = await tmc.domain('mailinator.com');
```

### `tmc.bulk(emails, options?)`

Submit a bulk check. Returns immediately with a `job_id` by default.

```typescript
// Fire and forget
const job = await tmc.bulk(['a@temp.com', 'b@gmail.com']);
console.log(job.job_id);

// Auto-poll until complete
const results = await tmc.bulk(
  ['a@temp.com', 'b@gmail.com'],
  { poll: true, pollInterval: 2000 }
);
```

| Option         | Type      | Default | Description                     |
| -------------- | --------- | ------- | ------------------------------- |
| `poll`         | `boolean` | `false` | Auto-poll until job completes   |
| `pollInterval` | `number`  | `1000`  | Polling interval in ms          |

### `tmc.bulkStatus(jobId)`

Poll the status of a bulk check job.

```typescript
const status = await tmc.bulkStatus('job_abc123');
// { state: 'completed', results: [...] }
```

### `tmc.account()`

Get account info and usage.

```typescript
const account = await tmc.account();
console.log(account.credits_remaining);
```

## Error Handling

All API errors throw a `TempMailCheckError` with `status`, `message`, and `retryAfter` (for 429 rate limits).

```typescript
import TempMailCheck, { TempMailCheckError } from 'tempmailcheck';

const tmc = new TempMailCheck('your-api-key');

try {
  await tmc.check('user@example.com');
} catch (err) {
  if (err instanceof TempMailCheckError) {
    console.error(err.status);     // 429
    console.error(err.message);    // "Rate limit exceeded"
    console.error(err.retryAfter); // 30 (seconds)
  }
}
```

## Get an API Key

Sign up at [tempmailcheck.com](https://tempmailcheck.com) for a free API key — 1,000 requests/month included.

## License

[MIT](LICENSE)
