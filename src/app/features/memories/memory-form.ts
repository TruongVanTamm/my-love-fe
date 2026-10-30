import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { ApiService, errorMessage } from '../../core/api.service';
import { MediaUploadService } from '../../core/media-upload.service';
import type { Memory } from '../../core/models';

@Component({
  selector: 'app-memory-form',
  imports: [ReactiveFormsModule],
  template: `
    <form [formGroup]="form" (ngSubmit)="save()" class="journal-form" [attr.aria-busy]="busy()">
      <label for="memory-title">Tên kỷ niệm</label
      ><input id="memory-title" formControlName="title" maxlength="160" required />
      <label for="memory-date">Ngày diễn ra</label
      ><input id="memory-date" type="date" formControlName="happenedAt" required />
      <label for="memory-description">Câu chuyện của chúng mình</label
      ><textarea
        id="memory-description"
        formControlName="description"
        maxlength="5000"
        rows="5"
      ></textarea>
      <label for="memory-tags">Nhãn, cách nhau bằng dấu phẩy</label
      ><input id="memory-tags" formControlName="tags" placeholder="hẹn hò, du lịch" />
      <label for="memory-visibility">Ai có thể xem?</label
      ><select id="memory-visibility" formControlName="visibility">
        <option value="shared">Cả hai</option>
        <option value="private">Chỉ mình tôi</option>
      </select>
      <label for="memory-files">Ảnh, video hoặc âm thanh</label
      ><input
        id="memory-files"
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp,image/heic,video/mp4,video/quicktime,video/webm,audio/mpeg,audio/mp4,audio/wav"
        (change)="chooseFiles($event)"
      />
      <p class="field-hint">
        Ảnh tối đa 10 MB, video 100 MB, âm thanh 25 MB. File được tải lên Cloudinary khi bạn lưu.
      </p>
      @if (existing()?.media?.length) {
        <fieldset>
          <legend>File hiện có</legend>
          @for (media of existing()?.media; track media.id) {
            <label class="check-line"
              ><input
                type="checkbox"
                [checked]="keepIds().includes(media.id)"
                (change)="toggleMedia(media.id, $event)"
              />
              {{ media.kind }} · {{ media.id.slice(-6) }}</label
            >
          }
        </fieldset>
      }
      @if (error()) {
        <p class="error-banner" role="alert">{{ error() }}</p>
      }
      <div class="form-actions">
        <button class="button primary" type="submit" [disabled]="busy()">
          {{ busy() ? 'Đang lưu…' : 'Lưu kỷ niệm ↗' }}</button
        ><button class="button secondary" type="button" (click)="cancelled.emit()">Đóng</button>
      </div>
    </form>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MemoryForm {
  readonly existing = input<Memory | null>(null);
  readonly saved = output<Memory>();
  readonly cancelled = output<void>();
  private readonly api = inject(ApiService);
  private readonly uploader = inject(MediaUploadService);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly keepIds = signal<string[]>([]);
  private files: File[] = [];
  private initializedId = '';
  readonly form = inject(FormBuilder).nonNullable.group({
    title: ['', [Validators.required, Validators.maxLength(160)]],
    happenedAt: ['', Validators.required],
    description: [''],
    tags: [''],
    visibility: ['shared'],
  });

  constructor() {
    effect(() => {
      const current = this.existing();
      if (current && this.initializedId !== current.id) {
        this.populate(current);
        this.initializedId = current.id;
      }
    });
  }

  populate(memory: Memory): void {
    this.form.setValue({
      title: memory.title,
      happenedAt: memory.happenedAt.slice(0, 10),
      description: memory.description,
      tags: memory.tags.join(', '),
      visibility: memory.visibility,
    });
    this.keepIds.set([...memory.mediaIds]);
  }

  chooseFiles(event: Event): void {
    const target = event.target;
    if (target instanceof HTMLInputElement) this.files = Array.from(target.files ?? []);
  }

  toggleMedia(id: string, event: Event): void {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) return;
    this.keepIds.update((ids) =>
      target.checked ? [...ids, id] : ids.filter((item) => item !== id),
    );
  }

  async save(): Promise<void> {
    if (this.busy()) return;
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      this.error.set('Vui lòng nhập tiêu đề và ngày diễn ra.');
      return;
    }
    const values = this.form.getRawValue();
    const tags = values.tags
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean);
    if (tags.length > 10 || tags.some((tag) => tag.length > 40)) {
      this.error.set('Tối đa 10 nhãn, mỗi nhãn 40 ký tự.');
      return;
    }
    this.busy.set(true);
    this.error.set('');
    try {
      const uploaded = await Promise.all(this.files.map((file) => this.uploader.upload(file)));
      const payload = {
        title: values.title,
        happenedAt: values.happenedAt,
        description: values.description,
        tags,
        visibility: values.visibility,
        mediaIds: [...this.keepIds(), ...uploaded],
      };
      const current = this.existing();
      const memory = current
        ? await firstValueFrom(this.api.patch<Memory>(`memories/${current.id}`, payload))
        : await firstValueFrom(this.api.post<Memory>('memories', payload));
      this.saved.emit(memory);
    } catch (error) {
      this.error.set(
        error instanceof Error && !(error instanceof HttpErrorResponse)
          ? error.message
          : errorMessage(error),
      );
    } finally {
      this.busy.set(false);
    }
  }
}
