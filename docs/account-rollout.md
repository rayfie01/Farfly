# Far.Fly account rollout checkpoint

Implementation is not yet released to production. Main remains 4379f3f.

- Supabase project exqhzubidjkvmsklamcg restored; public.provider_connections created with owner-only SELECT/INSERT/UPDATE/DELETE RLS. Passwords/names/email handled by Supabase Auth, names in user metadata. Metadata is not used for authorization.
- Migration farfly_provider_connections applied via Supabase MCP. Security advisor returned no issues. Transactional two-user checks for cross-user read/delete/insert and owner reassignment passed and rolled back.
- Server account routes use HttpOnly Secure SameSite cookies, validated Supabase users, refresh and CSRF origin validation.
- Provider wrapper uses authenticated user JWT for RLS; encrypted saved provider tokens are bound to account ID and provider. OAuth account binding prevents account-switch callbacks. Legacy anonymous provider cookies are intentionally never imported.
- Account UI, protected pages, profile/logout, account-scoped browser saves implemented. Existing library unit suites and Next build/lint pass at initial checkpoint.

Before production:
1. Finish account/connection unit tests, invalid input and concurrent refresh review.
2. Configure Supabase Site URL/email delivery/confirmation; browser dashboard needs user sign-in. Do not disable email confirmation to bypass delivery limits. Verify SMTP for public registration.
3. Check form visually and test actual signup/verification/login/logout; user must create their password in browser.
4. Verify both OAuth callbacks, persistence after logout/login, and two-account isolation end-to-end.
5. Update privacy, commit reviewed files against fresh GitHub main, deploy and verify.

Do not overwrite other uncommitted local work; local Git HEAD predates deployed changes. Push via GitHub API using current remote tree.

