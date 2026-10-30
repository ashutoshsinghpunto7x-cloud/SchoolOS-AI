## What and why

<!-- One or two sentences. Link the issue or task. -->

## Area

- [ ] Server (API / database)
- [ ] Web
- [ ] Mobile
- [ ] Shared packages
- [ ] CI / config

## Checklist

- [ ] I ran the app and tried the change in a browser or on a device
- [ ] New or changed behaviour has a test (or I explain why not below)
- [ ] No secrets, `.env` files or real student/staff data in this PR
- [ ] New API routes check the signed-in user's role AND their school (no cross-school access)
- [ ] Shared types in `packages/types` were rebuilt if I changed them
- [ ] Screens work at large font sizes and are readable for 40-60 year old users
- [ ] Database changes are backwards compatible (old server code still works during deploy)

## Risk and rollback

<!-- What could break? How do we undo it? -->
