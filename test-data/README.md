# Test Data Directory

This directory contains sample CSV files for testing the Traffboard analytics import functionality.

## Files

### `sample_conversions.csv`
Sample conversions data for testing the conversions import flow.
- **Columns**: 10 (date, foreign_partner_id, foreign_campaign_id, etc.)
- **Rows**: ~9 data rows
- **Purpose**: Testing conversions CSV validation and import

### `sample_players.csv`
Sample players data for testing the players import flow.
- **Columns**: 33+ (player_id, sign_up_date, partner_id, etc.)
- **Rows**: Multiple players with analytics data
- **Purpose**: Testing players CSV validation and import

### `test_single_row.csv`
Minimal test file with single data row.
- **Purpose**: Edge case testing, minimal data validation

### `user_players.csv`
User-specific players data for realistic testing scenarios.
- **Purpose**: Testing with user-provided data structure

## Usage

These files are referenced by:
- Playwright E2E tests (`/apps/web/tests/`)
- Manual testing of CSV import functionality
- Development validation workflows

## Data Privacy

- All test data contains fictional/anonymized information
- No real user data or personally identifiable information
- Safe for development and testing environments

## File Formats

All CSV files follow the expected schema formats:
- **Conversions**: Standard 10-column format
- **Players**: Extended format with 33+ columns including analytics data
- **Headers**: Lowercase with underscores (database-compatible)
