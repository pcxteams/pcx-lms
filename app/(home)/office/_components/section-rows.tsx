import type { CSSProperties, ReactNode } from 'react';
import type { OfficePageSection, RowLayout, RowTemplate } from '@/lib/office-page-content';

/**
 * Responsive row/column layout for office-page sections. Mirrors
 * pcx-admin's builder/section-rows.tsx exactly, so a row/column layout built
 * in the admin renders identically here.
 *
 * A flat, ordered section list is folded into *rows* by `layout.rowId`; within a
 * row each section takes `layout.span` of a 12-unit grid (e.g. 8 + 4 = a 2/3·1/3
 * split). Whether a row divides into columns or stacks into one is a CSS
 * container query on the row's own width (see `.opb-row` in `globals.css`), so it
 * is correct at any viewport width.
 *
 * Presentational only — no hooks/handlers.
 */

export const ALIGN_CSS: Record<NonNullable<RowLayout['align']>, string> = {
  start: 'flex-start',
  center: 'center',
  end: 'flex-end',
  stretch: 'stretch',
};
export const GAP_CSS: Record<NonNullable<RowLayout['gap']>, string> = {
  sm: '0.75rem',
  md: '1.5rem',
  lg: '2.5rem',
};

/** Full width on the layout grid. */
export const ROW_SPAN_UNITS = 12;

export interface SectionRowGroup {
  rowId: string;
  sections: OfficePageSection[];
}

/**
 * Fold consecutive sections sharing a `layout.rowId` into a row. A section with
 * no `layout` becomes its own full-width row keyed by its `key`. Only *consecutive*
 * matches fold together, keeping a row's sections contiguous.
 */
export function groupSectionsIntoRows(sections: OfficePageSection[]): SectionRowGroup[] {
  const rows: SectionRowGroup[] = [];
  for (const section of sections) {
    const rowId = section.layout?.rowId ?? section.key;
    const current = rows[rows.length - 1];
    if (current && current.rowId === rowId) current.sections.push(section);
    else rows.push({ rowId, sections: [section] });
  }
  return rows;
}

/** A section's span, clamped to the 1–12 grid (defaults to full width). */
export function sectionSpan(section: OfficePageSection): number {
  const span = section.layout?.span;
  if (span == null || !Number.isFinite(span)) return ROW_SPAN_UNITS;
  return Math.min(ROW_SPAN_UNITS, Math.max(1, Math.round(span)));
}

/** The `template` for a row, treating anything below 3 sections as plain columns. */
export function rowTemplate(rowLayout: RowLayout | undefined, sectionCount: number): RowTemplate {
  const t = rowLayout?.template;
  if (!t || t === 'columns' || sectionCount < 3) return 'columns';
  return t;
}

/** One cell's placement in a template grid, as CSS `grid-column` / `grid-row`. */
export interface TemplateCell {
  gc: string;
  gr: string;
}

/**
 * CSS-grid column track list + per-section placement for a template row. Sections
 * are placed in array order; span templates dedicate the spanning column to the
 * first (`left-span`) or last (`right-span`) section and stack the rest, while
 * top/bottom-span put one full-width section above/below a row of the others.
 */
export function templatePlacement(
  template: RowTemplate,
  n: number
): { cols: string; cells: TemplateCell[] } {
  const cells: TemplateCell[] = [];
  const wide = 'minmax(0, 2.4fr)';
  const narrow = 'minmax(0, 1fr)';
  switch (template) {
    case 'right-span': {
      for (let i = 0; i < n - 1; i += 1) cells.push({ gc: '1', gr: String(i + 1) });
      cells.push({ gc: '2', gr: `1 / span ${n - 1}` });
      return { cols: `${wide} ${narrow}`, cells };
    }
    case 'left-span': {
      cells.push({ gc: '1', gr: `1 / span ${n - 1}` });
      for (let i = 1; i < n; i += 1) cells.push({ gc: '2', gr: String(i) });
      return { cols: `${narrow} ${wide}`, cells };
    }
    case 'top-span': {
      cells.push({ gc: '1 / -1', gr: '1' });
      for (let i = 1; i < n; i += 1) cells.push({ gc: String(i), gr: '2' });
      return { cols: `repeat(${n - 1}, minmax(0, 1fr))`, cells };
    }
    case 'bottom-span': {
      for (let i = 0; i < n - 1; i += 1) cells.push({ gc: String(i + 1), gr: '1' });
      cells.push({ gc: '1 / -1', gr: '2' });
      return { cols: `repeat(${n - 1}, minmax(0, 1fr))`, cells };
    }
    default:
      return { cols: '', cells: [] };
  }
}

interface SectionRowProps {
  sections: OfficePageSection[];
  rowLayout?: RowLayout;
  children: (section: OfficePageSection) => ReactNode;
}

/**
 * Lay a row's sections out as responsive columns. A lone full-width section
 * renders with no wrapper (identical to the classic stacked layout). `rowLayout`
 * tunes gap, vertical alignment, and the width at which columns stack.
 */
export function SectionRow({ sections, rowLayout, children }: SectionRowProps) {
  if (sections.length <= 1) {
    const only = sections[0];
    return only ? <>{children(only)}</> : null;
  }

  const stack = rowLayout?.stackBelow ?? 'md';
  const template = rowTemplate(rowLayout, sections.length);

  // Template arrangements (spanning columns) use a CSS grid via inline styles;
  // plain columns keep the flex split below. `TEMPLATE_STACK_CSS` collapses the
  // grid to one column on narrow viewports.
  if (template !== 'columns') {
    const { cols, cells } = templatePlacement(template, sections.length);
    const innerStyle: CSSProperties = {
      display: 'grid',
      gridTemplateColumns: cols,
      gap: GAP_CSS[rowLayout?.gap ?? 'md'],
      alignItems: ALIGN_CSS[rowLayout?.align ?? 'start'],
    };
    return (
      <div className="opl-tmpl-inner" style={innerStyle}>
        {sections.map((section, i) => (
          <div
            key={section.key}
            className="opl-cell"
            style={{ gridColumn: cells[i]?.gc, gridRow: cells[i]?.gr, minWidth: 0 }}
          >
            {children(section)}
          </div>
        ))}
      </div>
    );
  }

  const innerStyle = {
    '--opb-gap': GAP_CSS[rowLayout?.gap ?? 'md'],
    '--opb-align': ALIGN_CSS[rowLayout?.align ?? 'stretch'],
  } as CSSProperties;

  return (
    <div className="opb-row">
      <div className={`opb-row-inner opb-stack-${stack}`} style={innerStyle}>
        {sections.map((section) => (
          <div
            key={section.key}
            className="opb-col"
            style={
              {
                '--opb-grow': sectionSpan(section),
                minWidth: section.layout?.minWidth,
              } as CSSProperties
            }
          >
            {children(section)}
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Collapses any row template to a single column on narrow viewports. Rendered
 * once per page as a colocated <style> so it ships with this component rather
 * than depending on globals.css alone.
 */
export const TEMPLATE_STACK_CSS =
  '@media (max-width:640px){.opl-tmpl-inner{grid-template-columns:1fr !important}.opl-tmpl-inner>.opl-cell{grid-column:1/-1 !important;grid-row:auto !important}}';

export function TemplateStyles() {
  return <style dangerouslySetInnerHTML={{ __html: TEMPLATE_STACK_CSS }} />;
}
