# Error System Package Fixtures

These directories intentionally violate the System Package contract. Automated tests create zip inputs from them at runtime. Only `corrupt.zip` remains binary because unreadable archive bytes have no valid directory representation.

| Source | Expected issue code |
| --- | --- |
| `corrupt.zip` | `ZIP_READ_FAILED` |
| `missing-manifest/` | `MANIFEST_MISSING` |
| `invalid-manifest-json/` | `MANIFEST_JSON_INVALID` |
| `missing-modules-file/` | `PACKAGE_FILE_MISSING` |
| `unsafe-modules-path/` | `PACKAGE_PATH_UNSAFE` |
| `missing-module-reference/` | `MISSING_MODULE_REFERENCE` |
| `duplicate-stable-ids/` | `DUPLICATE_PAGE_ID`, `DUPLICATE_VALIDATION_CHECK_ID`, `DUPLICATE_CHECKBOX_OPTION_ID`, `MISSING_CHECKBOX_OPTION_REFERENCE` |
| `invalid-card-definition/` | `MISSING_RESOURCE_FIELD_REFERENCE` |
| `invalid-dependency-field/` | `MISSING_RESOURCE_FIELD_REFERENCE` |
| `invalid-validation-script/` | `VALIDATION_SCRIPT_SYNTAX_INVALID` |

The four Validator-focused fixtures also exercise structured `location`, `entities`, and `evidence`. Expand “诊断上下文” in the error panel to inspect them.
