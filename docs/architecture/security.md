# Security and Sensitive Child Data

This system contains data about children. Data minimization and backend authorization are mandatory.

## National ID
Some players may eventually have an optional Israeli national ID.

Do NOT store national ID as ordinary plaintext.

Recommended design when this feature is implemented:
- encrypted value for authorized recovery/display when truly necessary
- separate keyed HMAC/search token for exact equality lookup
- keys stored outside source control in environment/secret management

## National-ID access rules
- General Player APIs must not return full national ID.
- Do not place national ID in JWTs, frontend localStorage, analytics events or application logs.
- Mask any authorized display by default.
- Backend role checks must protect every endpoint that can read/change sensitive identity data.
- Use HTTPS in production.
- Protect backups and database access.
- Maintain an audit trail for sensitive read/change operations where practical.

## Identity matching
When import/integration matching is implemented:
1. national ID exact match first when provided
2. otherwise normalized first name + last name + city
3. conflicting/ambiguous matches require staff review, not automatic merge

## Rich HTML
News/update HTML must be sanitized server-side before storage/rendering or before trusted rendering.
Never render raw user-provided HTML through unsafe mechanisms without sanitization.

## Stage A
Stage A does not require implementing national-ID storage merely because it is documented here.
Do not introduce sensitive-ID collection until the feature that needs it is intentionally implemented and reviewed.
