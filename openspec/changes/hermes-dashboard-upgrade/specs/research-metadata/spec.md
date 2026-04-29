## ADDED Requirements

### Requirement: Research fields on post
The system SHALL add research metadata fields to each post: `research_insight` (main insight text), `editorial_angle` (the chosen angle for the piece).

#### Scenario: Editing research metadata
- **WHEN** Nelson expands the "Investigación" section in the post editor
- **THEN** the system SHALL display editable fields for `research_insight` (textarea) and `editorial_angle` (text input)

#### Scenario: Auto-populating from proposal
- **WHEN** a post is created from an approved proposal
- **THEN** the `research_insight` SHALL be populated from the proposal's `research_summary` and `editorial_angle` from the proposal's `agent_notes`

### Requirement: Research sources linked to posts
The system SHALL store research sources in a `research_sources` table linked to posts or proposals.

#### Scenario: Adding a source to a post
- **WHEN** Nelson clicks "Añadir fuente" in the research section of the post editor
- **THEN** the system SHALL display fields for URL, title, source_type (blog, github, paper, docs, social), and excerpt

#### Scenario: Viewing sources for a post
- **WHEN** a post has 3 research sources
- **THEN** the research section SHALL list all 3 sources with clickable URLs, type badges, and excerpt previews

### Requirement: Research completeness indicator
The system SHALL display a visual indicator of research quality based on the manual's guidelines (minimum 2 primary sources + 1 additional).

#### Scenario: Post with insufficient research
- **WHEN** a post has fewer than 2 research sources
- **THEN** the system SHALL display a yellow warning chip "Investigación incompleta" in the post editor and list

#### Scenario: Post with sufficient research
- **WHEN** a post has 2 or more sources with at least one of type `blog` or `github` or `paper` or `docs`
- **THEN** the system SHALL display a green chip "Investigación completa"

### Requirement: Analysis template checklist
The system SHALL display the manual's analysis template as a checklist on each post: ¿Qué pasó?, ¿Por qué importa?, ¿Qué cambia?, ¿Cuál es el riesgo?, ¿Lectura propia?, ¿Qué decidir hoy?

#### Scenario: Viewing the analysis checklist
- **WHEN** the research section is expanded
- **THEN** 6 checklist items SHALL appear, each toggleable, with state persisted in `format_meta`

#### Scenario: Checking items
- **WHEN** Nelson checks "¿Por qué importa?"
- **THEN** the item SHALL be visually marked as done and the state saved to the post's metadata
