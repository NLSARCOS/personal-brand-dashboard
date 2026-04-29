## ADDED Requirements

### Requirement: Guidelines panel with rendered markdown
The system SHALL display the editorial guidelines (from `manual-lineamientos-contenido-nelson.md`) as a formatted, readable panel within the dashboard.

#### Scenario: Viewing guidelines
- **WHEN** Nelson navigates to the "Lineamientos" tab
- **THEN** the system SHALL render the stored markdown content as formatted HTML with proper headings, lists, code blocks, and section dividers

### Requirement: Collapsible sections
The system SHALL render each H2 section of the guidelines as a collapsible accordion.

#### Scenario: Collapsing and expanding sections
- **WHEN** Nelson clicks a section header (e.g., "Tono y enfoque editorial")
- **THEN** the section content SHALL toggle between collapsed and expanded with a smooth animation

#### Scenario: Default state on load
- **WHEN** the guidelines panel loads
- **THEN** all sections SHALL be expanded by default

### Requirement: In-app search
The system SHALL provide a search bar that filters the guidelines content in real-time.

#### Scenario: Searching for a keyword
- **WHEN** Nelson types "hashtag" in the guidelines search bar
- **THEN** only sections containing "hashtag" SHALL remain visible, with matched text highlighted

### Requirement: Editable guidelines
The system SHALL allow Nelson to edit the guidelines markdown from within the dashboard.

#### Scenario: Entering edit mode
- **WHEN** Nelson clicks the "Editar" button in the guidelines panel
- **THEN** the rendered HTML SHALL be replaced with a full-height textarea containing the raw markdown, with "Guardar" and "Cancelar" buttons

#### Scenario: Saving edited guidelines
- **WHEN** Nelson edits the markdown and clicks "Guardar"
- **THEN** the system SHALL call `PUT /api/settings/editorial_guidelines` with the updated content and re-render the formatted view

### Requirement: Initial import from file
The system SHALL seed the guidelines from the local `manual-lineamientos-contenido-nelson.md` file on first run if no `editorial_guidelines` setting exists.

#### Scenario: First launch with existing manual file
- **WHEN** the server starts and `settings.get('editorial_guidelines')` returns null
- **THEN** the system SHALL read `manual-lineamientos-contenido-nelson.md`, store its content in settings, and log "Lineamientos editoriales importados"
