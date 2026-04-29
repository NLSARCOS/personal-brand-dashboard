## ADDED Requirements

### Requirement: Proposal data model
The system SHALL store agent proposals in a `proposals` table with fields: id, post_id (nullable), title, research_summary, suggested_format, suggested_copy, suggested_platforms (JSON), sources (JSON array), agent_notes, status, priority (`normal` | `hot`), images (JSON array of file paths/URLs), created_at, reviewed_at.

#### Scenario: Hermes creates a proposal via API
- **WHEN** a POST request is sent to `/api/proposals` with title, research_summary, suggested_format, suggested_copy, sources, and images
- **THEN** the system SHALL create a new proposal with status `pending`, priority `normal`, store the image references, and return the created record with its ID

### Requirement: Proposal status workflow
The system SHALL enforce a proposal status lifecycle: `pending` → `approved` | `rejected` | `merged`.

#### Scenario: Approving a proposal
- **WHEN** Nelson clicks "Aprobar" on a pending proposal
- **THEN** the system SHALL set the proposal status to `approved`, set `reviewed_at` to now, and create a new post pre-filled with the proposal's copy, format, platforms, research data, and attach all proposal images as post media

#### Scenario: Rejecting a proposal
- **WHEN** Nelson clicks "Rechazar" on a pending proposal
- **THEN** the system SHALL set the proposal status to `rejected` and set `reviewed_at` to now without creating a post

#### Scenario: Merging into existing post
- **WHEN** Nelson clicks "Fusionar con post existente" and selects a target post
- **THEN** the system SHALL update the target post's content with the proposal copy, set the proposal status to `merged`, link the proposal's `post_id` to the target, and set `reviewed_at`

### Requirement: Proposals list panel
The system SHALL display all proposals in a dedicated "Propuestas" tab, sorted by status (pending first) and creation date.

#### Scenario: Viewing pending proposals
- **WHEN** the Propuestas tab is active
- **THEN** pending proposals SHALL appear at the top with an orange left border, showing title, suggested format chip, creation date, and research summary preview (max 3 lines)

#### Scenario: Filtering proposals by status
- **WHEN** Nelson selects a status filter (pending/approved/rejected/merged)
- **THEN** only proposals matching that status SHALL be displayed

### Requirement: Proposal detail view
The system SHALL show a detailed view of a proposal with all fields, research sources, and action buttons.

#### Scenario: Expanding a proposal
- **WHEN** Nelson clicks a proposal in the list
- **THEN** the system SHALL display: full research summary, suggested copy (formatted), suggested format with metadata, list of sources (with clickable URLs), agent notes, and action buttons (Aprobar, Rechazar, Editar y Aprobar, Fusionar)

### Requirement: Edit before approve
The system SHALL allow Nelson to edit the suggested copy and format before approving.

#### Scenario: Editing and approving
- **WHEN** Nelson clicks "Editar y Aprobar" on a proposal
- **THEN** the suggested copy and format fields SHALL become editable, and a "Confirmar y crear post" button SHALL appear — upon clicking, the edited version is used to create the post

### Requirement: Pending proposals badge
The system SHALL display a notification badge on the "Propuestas" tab when there are pending proposals.

#### Scenario: New proposals arrive
- **WHEN** there are 3 pending proposals
- **THEN** the Propuestas tab SHALL show a badge with "3" in orange

### Requirement: Proposal image attachments
The system SHALL support image uploads attached to proposals, allowing Hermes to deliver AI-generated visuals with each piece.

#### Scenario: Hermes uploads images with a proposal
- **WHEN** a POST request is sent to `/api/proposals` with a multipart form containing images
- **THEN** the system SHALL store the images in the `uploads/proposals/` directory and link their paths in the proposal's `images` JSON array

#### Scenario: Viewing proposal images
- **WHEN** Nelson expands a proposal detail view
- **THEN** all attached images SHALL render as a gallery grid below the suggested copy, showing full previews with the ability to enlarge each image

#### Scenario: Images transfer on approval
- **WHEN** a proposal with 3 attached images is approved
- **THEN** all 3 images SHALL be copied to the newly created post's media, maintaining sort order

### Requirement: Daily delivery cadence
The system SHALL support Hermes delivering 2 proposals per publishing day as the standard cadence.

#### Scenario: Daily delivery tracker
- **WHEN** the Propuestas tab loads
- **THEN** the header SHALL show a "Hoy" indicator: e.g., "2/2 propuestas entregadas" or "1/2 — falta 1 pieza" based on proposals created today

#### Scenario: Batch proposal submission
- **WHEN** Hermes sends a POST to `/api/proposals/batch` with an array of 2 proposals
- **THEN** the system SHALL create both proposals in a single transaction and return both IDs
