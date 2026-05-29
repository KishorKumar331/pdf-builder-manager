# PDF Rendering Engine Rules

This project is a production-grade PDF generation system using:

* Handlebars (.hbs)
* Puppeteer
* Dynamic rendering
* A4 printable layouts

The PDF system behaves like a document engine, not a webpage.

## Critical Constraints

DO NOT:

* modify pagination engine
* modify page wrappers
* change root layout structure
* break A4 dimensions
* remove Handlebars helpers
* remove loops or conditions
* modify continuation logic
* break repeated header/footer behavior
* introduce overflow issues
* change PDF rendering flow

## Allowed Changes

AI may:

* redesign section layouts
* improve typography
* improve spacing
* modernize UI
* create premium visual styles
* redesign cards/tables
* improve hierarchy
* generate new template variants

## Template Rules

Each template must:

* preserve same data structure
* preserve rendering logic
* preserve section order
* preserve PDF-safe dimensions
* remain printable
* configure `@page innerPage` with `background-color: #ffffff` to prevent body backgrounds from leaking into page margins
* style running header/footer margin-box selectors to support both in-flow layout and Paged.js paginated layout (e.g. `.pagedjs_margin-top-center .fids-header`)
* include `@media screen` rules to center page sheets, apply shadows, and hide overlapping running headers in the browser preview

## Section Visibility

* If a section (such as Accommodation/Stays, Inclusions/Exclusions, Payment Details, or Cancellation Policy) is empty or not available in the data, the entire page block/container representing that section must be omitted from the output to prevent empty pages.
