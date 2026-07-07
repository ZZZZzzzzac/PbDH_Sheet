# Error System Package Fixtures

These packages intentionally violate the System Package contract. Use the zip files in this directory for manual upload tests.

| File | Expected issue code |
| --- | --- |
| `corrupt.zip` | `ZIP_READ_FAILED` |
| `missing-manifest.zip` | `MANIFEST_MISSING` |
| `invalid-manifest-json.zip` | `MANIFEST_JSON_INVALID` |
| `missing-modules-file.zip` | `PACKAGE_FILE_MISSING` |
| `unsafe-modules-path.zip` | `PACKAGE_PATH_UNSAFE` |
| `missing-module-reference.zip` | `MISSING_MODULE_REFERENCE` |
