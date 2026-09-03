# Storage & Media

Music is S3-only with single-part presign. Trishul routes R2 / Cloudinary / S3 and can still sign legacy URLs after a provider switch.

## Major

| Feature | For | Why it matters | Lives in Trishul | Pri |
|---|---|---|---|---|
| Pluggable storage (R2 / Cloudinary / S3) | System | Music cannot honor `STORAGE_PROVIDER=s3` as a first-class path the way Trishul does, and has no R2/Cloudinary fallback. | `storage/config` + `s3.ts` + `r2.ts` | P1 |
| Cross-provider download signing | Buyer | Detects file origin from URL so old Cloudinary/S3 assets still download after migration. | `download.service.ts` | P1 |
