## ADDED Requirements

### Requirement: Monthly calendar grid
The system SHALL render a monthly calendar grid (7 columns × 4-6 rows) showing all days of the selected month, with posts placed on their `scheduled_at` date.

#### Scenario: Viewing the current month
- **WHEN** the Calendar tab is active and no month is selected
- **THEN** the system SHALL display the current month with today highlighted, and posts rendered as compact cards on their scheduled dates

#### Scenario: Navigating months
- **WHEN** Nelson clicks the previous/next month arrows
- **THEN** the calendar SHALL re-render with the selected month's data and fetch posts for that date range

### Requirement: Weekly calendar view
The system SHALL provide a weekly view showing 7 day columns with expanded post detail.

#### Scenario: Switching to weekly view
- **WHEN** Nelson clicks the "Semana" toggle
- **THEN** the calendar switches to a 7-column layout for the current week with taller day cells showing post copy preview, format chip, platform chips, and status

### Requirement: Post preview on calendar
The system SHALL display a compact preview of each scheduled post on its calendar date cell.

#### Scenario: Rendering a post on a day cell
- **WHEN** a day cell contains one or more scheduled posts
- **THEN** each post SHALL show: truncated title (max 40 chars), format chip, status chip, and platform icons

#### Scenario: Clicking a post in the calendar
- **WHEN** Nelson clicks a post card in the calendar
- **THEN** a modal or side panel SHALL open showing the full post details with copy, media preview, and action buttons (approve, schedule, edit)

### Requirement: Drag-and-drop rescheduling
The system SHALL allow Nelson to drag a post from one calendar day to another to change its `scheduled_at` date.

#### Scenario: Dragging a post to a new date
- **WHEN** Nelson drags a post card from Monday to Wednesday
- **THEN** the system SHALL call `PUT /api/posts/:id` with the new `scheduled_at` date and update the calendar without full reload

#### Scenario: Drag-and-drop on mobile
- **WHEN** the viewport width is below 768px
- **THEN** drag-and-drop SHALL be disabled and replaced with a "Mover a..." button that opens a date picker

### Requirement: Inline status change from calendar
The system SHALL allow changing a post's status directly from the calendar view.

#### Scenario: Quick-approve from calendar
- **WHEN** Nelson right-clicks or long-presses a post in the calendar and selects "Aprobar"
- **THEN** the post status SHALL change to `approved` and the chip color updates immediately

### Requirement: Empty day indicator
The system SHALL visually distinguish publishing days from empty days.

#### Scenario: Day with no posts
- **WHEN** a day cell has no scheduled posts
- **THEN** the cell SHALL show a subtle "+" button to create a new post scheduled for that date
