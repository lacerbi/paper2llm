# API Key Security Guide for `paper2llm` Users

## Introduction

`paper2llm` requires API keys from services like [Mistral AI](https://mistral.ai/) and other providers to function. This guide explains how we protect your API keys, the inherent limitations of browser-based security, and recommendations for keeping your keys safe.

`paper2llm` is a client-side web application hosted on GitHub Pages. This means:

- All processing happens entirely in your browser
- **Your data and API keys are not sent to us in any way** (as we don't operate any any servers)
- However, your PDF content and API keys are sent to the third-party AI providers (Mistral AI, Google, etc.) as required for the app's functionality
- All code is open source and can be audited in [our GitHub repository](https://github.com/lacerbi/paper2llm)
- The application code is delivered as fixed files from the [deployment branch](https://github.com/lacerbi/paper2llm/tree/gh-pages) of the repository

## ⚠️ Important API Key Warning ⚠️

**You should NEVER use sensitive or valuable API keys with `paper2llm` or any client-side browser application.**

Instead:

- Use free-tier API keys whenever possible
- Create dedicated API keys specifically for `paper2llm` with spending caps enabled
- NEVER enter API keys with access to substantial credit or production systems

## Security Measures We've Implemented

### Strong Encryption

Your API keys are encrypted using industry-standard AES-GCM encryption. This provides authenticated encryption which ensures your stored data cannot be tampered with.
We implement key derivation using PBKDF2 with high iteration counts to protect against brute force attacks, and use secure random generation for all cryptographic values.

### Flexible Storage Options

We offer two ways to store your API keys, each with different security implications:

| Storage Type   | Duration                     | Password       | Best For                   |
| -------------- | ---------------------------- | -------------- | -------------------------- |
| **Session**    | Current browser session only | Auto-generated | One-time or occasional use |
| **Persistent** | Across browser sessions      | Required       | Regular use (with caution) |

### Password Protection & Security Features

For persistent storage, we require passwords with a minimum of 8 characters and at least 2 character types (letters, numbers, special characters).

We've also implemented several additional protections. You can choose when your stored keys should expire (session, 1 day, 7 days, 30 days, 90 days).
Our system includes a progressive lockout mechanism where failed password attempts trigger increasing lockout periods, with multiple failures potentially triggering a 24-hour lockout.

<details>
<summary><strong>Technical details about our encryption implementation</strong></summary>

Our encryption system uses:

- AES-GCM with 256-bit keys for authenticated encryption
- PBKDF2 key derivation with high iteration counts (100k)
- Secure random generation for salt and initialization vectors

For session-based storage without a password, we generate a random 256-bit key and store it in sessionStorage, providing basic protection during the current browsing session.

</details>

## Understanding the Limitations

Despite these security measures, it's important to understand the inherent limitations of browser-based applications.

### Browser Security Boundaries & Vulnerabilities

All security in `paper2llm` happens in your browser. Since the application is hosted on GitHub Pages, the code is served directly from our GitHub repository, which provides transparency as all code is open source and can be audited.

However, this browser-based approach has inherent security limitations:

- **Client-side limitations**: All security processing happens on your device with no server backend. This means the security of your stored keys ultimately depends on your password strength and local environment
- **Browser environment risks**: Your own browser might have security vulnerabilities, malicious extensions, or a compromised system that could access stored data
- **Storage limitations**: Browser storage is fundamentally less secure than specialized password managers or operating system secure storage
- **Code integrity risks**: Malicious code could potentially be introduced through a compromised GitHub account or supply chain attack via third-party dependencies

These limitations are inherent to any browser-based application, not specific failures of `paper2llm`.
Understanding these boundaries helps you make informed decisions about how to use the application securely.

## Recommendations for Users

To maximize your security when using `paper2llm`:

### Choose the Right Storage and Expiration

For casual or one-time use, use session storage so keys are deleted when you close your browser. If you must store keys persistently, set the shortest expiration time that works for your needs.

### Create Strong Passwords

If storing keys persistently, don't just meet the minimum requirements. Use longer passwords (12+ characters), consider using a passphrase (multiple words with spaces), include a mix of character types, and never reuse passwords from other services.

<details>
<summary><strong>Example of a strong password approach</strong></summary>

Instead of something like `Password123!` which barely meets requirements, consider a memorable passphrase with some modifications:

`correct horse battery staple 1789!`

This is much longer, easier to remember, and significantly harder to crack.

</details>

### Be Mindful of Your Environment

We advise against using `paper2llm` on shared or public computers. Ensure your browser and operating system are up-to-date. Consider using private/incognito browsing when working with API keys.

### API Key Best Practices

Create separate API keys specifically for use with `paper2llm`. When possible, use the free tier offered by providers like Mistral AI and Google Gemini. For paid APIs, set spending limits and usage caps if the provider allows it. Regularly rotate your API keys and monitor your API usage and billing to detect unauthorized usage.

## Conclusion

`paper2llm` implements strong security measures to protect your API keys within the constraints of a client-side browser-based application.
As a GitHub Pages site, all code is open source and can be inspected, which provides transparency. However, browser-based security still has fundamental limitations.

**Remember:** The safest approach is to only use free-tier API keys or keys with strict spending limits. Never use production API keys or keys with access to substantial credit.

By understanding both the protections and limitations, and following the recommendations in this guide, you can use the application more securely.

If you have any questions or security concerns, please open a [GitHub issue](https://github.com/lacerbi/paper2llm/issues) or reach out to the developers.
