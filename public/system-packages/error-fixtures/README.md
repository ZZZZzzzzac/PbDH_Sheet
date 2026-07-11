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
| `duplicate-stable-ids.zip` | `DUPLICATE_PAGE_ID`, `DUPLICATE_ASSET_ID`, `DUPLICATE_VALIDATION_CHECK_ID`, `DUPLICATE_CHECKBOX_OPTION_ID`, `MISSING_CHECKBOX_OPTION_REFERENCE` |
| `invalid-card-definition.zip` | `CARD_DEFINITION_FIELD_MISSING` |
| `invalid-dependency-field.zip` | `MISSING_RESOURCE_FIELD_REFERENCE` |
| `invalid-validation-script.zip` | `VALIDATION_SCRIPT_SYNTAX_INVALID` |

The four Validator-focused fixtures also exercise structured `location`, `entities`, and `evidence`. Expand “诊断上下文” in the error panel to inspect them.
