## ADDED Requirements

### Requirement: Hot alert data model
The system SHALL store breaking news alerts in a `hot_alerts` table with fields: id, proposal_id (nullable), title, summary, urgency_reason, source_url, suggested_copy, suggested_format, images (JSON), status (`active` | `published` | `dismissed`), created_at, acted_at.

#### Scenario: Hermes sends a hot alert via API
- **WHEN** a POST request is sent to `/api/hot-alerts` with title, summary, urgency_reason, source_url, and optionally suggested_copy and images
- **THEN** the system SHALL create a new hot alert with status `active` and return the created record

### Requirement: Hot alert banner in dashboard
The system SHALL display a prominent, animated banner at the top of the dashboard when there are active hot alerts.

#### Scenario: Active hot alert exists
- **WHEN** there is 1 or more active hot alerts
- **THEN** the dashboard SHALL display a pulsing red/orange banner at the top of the page showing the alert title, urgency reason, and action buttons — visible from any tab

#### Scenario: No active alerts
- **WHEN** there are no active hot alerts
- **THEN** no banner SHALL be displayed

#### Scenario: Multiple active alerts
- **WHEN** there are 3 active hot alerts
- **THEN** the banner SHALL show the most recent one with a counter "(+2 más)" and left/right arrows to cycle through them

### Requirement: Hot alert quick-publish flow
The system SHALL allow Nelson to approve and publish a hot alert in 2 clicks maximum.

#### Scenario: Approve and create post from alert
- **WHEN** Nelson clicks "Publicar ahora" on a hot alert
- **THEN** the system SHALL create a new post with status `published`, pre-filled with the alert's suggested copy, format, and images — set `published_at` to now, and mark the alert as `published`

#### Scenario: Edit before publishing
- **WHEN** Nelson clicks "Editar y publicar" on a hot alert
- **THEN** the system SHALL open the post editor pre-filled with the alert data, allowing Nelson to modify copy/format before saving

#### Scenario: Dismiss an alert
- **WHEN** Nelson clicks "Descartar" on a hot alert
- **THEN** the system SHALL set the alert status to `dismissed` and hide it from the banner

### Requirement: Hot alert with pre-generated content
The system SHALL support Hermes delivering hot alerts with pre-written copy and AI-generated images ready for immediate publishing.

#### Scenario: Alert with full content package
- **WHEN** Hermes sends a hot alert with suggested_copy, suggested_format, and images
- **THEN** the alert detail SHALL show a live preview of the post as it would appear, with the generated images and formatted copy

#### Scenario: Alert with only summary (no copy yet)
- **WHEN** Hermes sends a hot alert with only title, summary, and source_url (no suggested_copy)
- **THEN** the "Publicar ahora" button SHALL be disabled and replaced with "Preparar post" which opens an empty editor with the summary and source pre-filled

### Requirement: Hot alert history
The system SHALL maintain a history of all hot alerts for review.

#### Scenario: Viewing alert history
- **WHEN** Nelson navigates to the Propuestas tab and clicks "Historial de alertas"
- **THEN** the system SHALL display all past hot alerts sorted by date, with status badges (published/dismissed) and links to the resulting posts if any

### Requirement: Hot alert notification sound
The system SHALL play a subtle notification sound when a new hot alert arrives (if the dashboard is open).

#### Scenario: New alert while dashboard is open
- **WHEN** the dashboard is open and a new hot alert is created via API
- **THEN** the system SHALL play a short notification chime and animate the alert banner into view — using polling every 30 seconds to check for new alerts
