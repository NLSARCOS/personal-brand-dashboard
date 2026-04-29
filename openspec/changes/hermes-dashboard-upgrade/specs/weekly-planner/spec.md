## ADDED Requirements

### Requirement: Weekly overview widget
The system SHALL display a weekly planner showing the distribution of posts across 7 days (Lunes–Domingo) for the selected week.

#### Scenario: Viewing the current week
- **WHEN** the "Planificador" tab is active
- **THEN** the system SHALL display 7 day columns with scheduled posts shown as compact cards, and empty days marked with a dashed border

#### Scenario: Navigating weeks
- **WHEN** Nelson clicks previous/next week arrows
- **THEN** the planner SHALL update to show the selected week's distribution

### Requirement: Publishing frequency compliance
The system SHALL validate the week's publishing schedule against the manual's rules: 2 posts per publishing day, 2-3 days per week.

#### Scenario: Week with 4 publishing days
- **WHEN** the current week has posts scheduled on 4 different days
- **THEN** the system SHALL display a warning: "Superas los 3 días recomendados esta semana"

#### Scenario: Day with only 1 post
- **WHEN** a publishing day has only 1 post scheduled
- **THEN** the system SHALL display a soft notice: "Se recomiendan 2 posts en días de publicación"

#### Scenario: Week within guidelines
- **WHEN** the week has 2-3 publishing days with 2 posts each
- **THEN** the system SHALL display a green indicator: "Semana bien planificada ✓"

### Requirement: Format distribution summary
The system SHALL show a breakdown of formats used in the week.

#### Scenario: Viewing format distribution
- **WHEN** the weekly planner loads with 6 scheduled posts
- **THEN** a summary bar SHALL display: e.g., "3 carruseles · 2 imágenes · 1 text-only"

### Requirement: Platform distribution summary
The system SHALL show which platforms are covered in the week.

#### Scenario: Viewing platform coverage
- **WHEN** the weekly planner loads
- **THEN** a summary row SHALL display the count of posts per platform (e.g., "LinkedIn: 4 · Threads: 2")

### Requirement: Sunday summary generation
The system SHALL generate a structured weekly summary intended for Sunday 8:10 AM review.

#### Scenario: Generating the summary
- **WHEN** Nelson clicks "Generar resumen semanal"
- **THEN** the system SHALL compile the next week's scheduled posts into a formatted summary showing: day, title, format, platform, and status — and display it in a copyable text block

#### Scenario: Summary for week with no posts
- **WHEN** no posts are scheduled for the next week
- **THEN** the system SHALL display: "No hay publicaciones programadas para la próxima semana. Revisa las propuestas pendientes."

### Requirement: Quick-schedule from planner
The system SHALL allow creating a new post directly from the weekly planner by clicking an empty day slot.

#### Scenario: Creating a post from the planner
- **WHEN** Nelson clicks the "+" on an empty day
- **THEN** the system SHALL open the post editor with `scheduled_at` pre-filled to that date at 08:00 and `status` set to `draft`
