import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

interface Segment {
  text: string;
  style: 'plain' | 'bold' | 'italic';
}

function segments(source: string): Segment[] {
  const result: Segment[] = [];
  const pattern = /\*\*([^*\n]+)\*\*|\*([^*\n]+)\*/g;
  let start = 0;
  for (const match of source.matchAll(pattern)) {
    const index = match.index;
    if (index > start) result.push({ text: source.slice(start, index), style: 'plain' });
    result.push({ text: match[1] ?? match[2], style: match[1] ? 'bold' : 'italic' });
    start = index + match[0].length;
  }
  if (start < source.length) result.push({ text: source.slice(start), style: 'plain' });
  return result;
}

@Component({
  selector: 'app-rich-letter-content',
  template: `<div class="letter-content">
    @for (part of parts(); track $index) {
      @switch (part.style) {
        @case ('bold') {
          <strong>{{ part.text }}</strong>
        }
        @case ('italic') {
          <em>{{ part.text }}</em>
        }
        @default {
          <span>{{ part.text }}</span>
        }
      }
    }
  </div>`,
  styles: [
    `
      .letter-content {
        white-space: pre-wrap;
        overflow-wrap: anywhere;
        line-height: 1.8;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RichLetterContent {
  readonly content = input.required<string>();
  readonly parts = computed(() => segments(this.content()));
}
