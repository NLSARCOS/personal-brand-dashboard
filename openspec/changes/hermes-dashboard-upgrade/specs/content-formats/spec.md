## ADDED Requirements

### Requirement: Post format type field
The system SHALL support a `format` field on each post with the following allowed values: `single-image`, `carousel`, `gif`, `lead-magnet-pdf`, `text-only`.

#### Scenario: Creating a post with carousel format
- **WHEN** a post is created or updated with `format` set to `carousel`
- **THEN** the system stores the format and accepts `format_meta` with fields `slide_count` (integer) and `slide_titles` (array of strings)

#### Scenario: Creating a post with lead-magnet-pdf format
- **WHEN** a post is created or updated with `format` set to `lead-magnet-pdf`
- **THEN** the system stores the format and accepts `format_meta` with field `pdf_url` (string) and `landing_copy` (string)

#### Scenario: Default format for existing posts
- **WHEN** a post has no `format` value (pre-migration data)
- **THEN** the system treats it as `text-only`

### Requirement: Format-specific validation
The system SHALL validate that required assets match the declared format.

#### Scenario: Carousel without enough media
- **WHEN** a post with format `carousel` has fewer than 2 media items attached
- **THEN** the system SHALL display a warning badge "Faltan slides" in the post editor and post list item

#### Scenario: Single-image with no media
- **WHEN** a post with format `single-image` has zero media items
- **THEN** the system SHALL display a warning badge "Falta imagen"

### Requirement: Format selector in editor
The system SHALL display a visual format selector in the post editor showing each format as a selectable card with icon and label.

#### Scenario: Selecting a format
- **WHEN** Nelson clicks a format card in the editor
- **THEN** the `format` field updates and format-specific metadata fields appear below the selector

#### Scenario: Carousel metadata entry
- **WHEN** format `carousel` is selected
- **THEN** the editor SHALL display a `slide_count` number input and a dynamic list of `slide_titles` text inputs matching the count

### Requirement: Format chip in post list
The system SHALL display the post format as a colored chip in the post list alongside status and platform chips.

#### Scenario: Rendering format chips
- **WHEN** the post list renders
- **THEN** each post item SHALL show a chip with the format name using distinct colors per format type
