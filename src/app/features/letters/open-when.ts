import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { ApiService, errorMessage } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { MediaUploadService } from '../../core/media-upload.service';
import type { Couple, OpenWhenLetter, Page } from '../../core/models';
import { safeCloudinaryDownloadUrl } from '../../core/media-url';
import { RichLetterContent } from './rich-letter-content';

const TEMPLATES = [
  'Khi bạn nhớ mình',
  'Khi bạn có một ngày khó khăn',
  'Khi bạn cần một lời động viên',
];

@Component({
  selector: 'app-open-when',
  imports: [DatePipe, ReactiveFormsModule, RichLetterContent],
  template: `
    <main id="main-content">
      <header class="page-heading">
        <div>
          <p class="eyebrow">CHÚNG MÌNH / OPEN WHEN</p>
          <h1>Mở thư <em>khi cần nhau.</em></h1>
        </div>
        <button class="button primary" (click)="start()">Tạo phong thư ↗</button>
      </header>
      @if (error()) {
        <p class="error-banner" role="alert">{{ error() }}</p>
      }
      @if (editing()) {
        <section class="card phase3-form-card">
          <h2>{{ editingId() ? 'Sửa phong thư' : 'Phong thư mới' }}</h2>
          <form [formGroup]="form" (ngSubmit)="save()" class="journal-form">
            <label for="open-recipient">Gửi cho</label>
            <select id="open-recipient" formControlName="recipientId" required>
              @for (member of recipients(); track member.userId) {
                <option [value]="member.userId">{{ member.displayName }}</option>
              }
            </select>
            <label for="open-template">Gợi ý tình huống</label>
            <select id="open-template" (change)="applyTemplate($event)">
              <option value="">Tự viết</option>
              @for (template of templates; track template) {
                <option [value]="template">{{ template }}</option>
              }
            </select>
            <label for="open-condition">Mở khi…</label>
            <input id="open-condition" formControlName="condition" maxlength="240" required />
            <label for="open-title">Tiêu đề</label>
            <input id="open-title" formControlName="title" maxlength="160" required />
            <label for="open-theme">Màu phong thư</label>
            <select id="open-theme" formControlName="theme">
              <option value="classic">Kem ấm</option>
              <option value="rose">Hồng bụi</option>
              <option value="night">Đêm yên</option>
            </select>
            <label for="open-content">Nội dung</label>
            <textarea
              id="open-content"
              formControlName="content"
              maxlength="10000"
              rows="8"
              required
            ></textarea>
            <p class="field-hint">Dùng **chữ đậm** hoặc *chữ nghiêng* nếu bạn muốn nhấn mạnh.</p>
            <label for="open-files">File đính kèm</label>
            <input
              id="open-files"
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp,image/heic,video/mp4,video/quicktime,video/webm,audio/mpeg,audio/mp4,audio/wav"
              (change)="chooseFiles($event)"
            />
            @if (attachmentIds().length) {
              <p class="field-hint">Đã đính kèm {{ attachmentIds().length }} file.</p>
            }
            <div class="form-actions">
              <button class="button primary" [disabled]="busy()">Lưu phong thư ↗</button>
              <button class="button secondary" type="button" (click)="editing.set(false)">
                Đóng
              </button>
            </div>
          </form>
        </section>
      }
      @if (selected(); as item) {
        <section
          class="card phase3-letter"
          [class.theme-rose]="item.theme === 'rose'"
          [class.theme-night]="item.theme === 'night'"
        >
          <p class="eyebrow">MỞ KHI {{ item.condition }}</p>
          <h2>{{ item.title }}</h2>
          @if (item.content) {
            <app-rich-letter-content [content]="item.content" />
            @if (item.mediaIds.length) {
              <p class="field-hint">{{ item.mediaIds.length }} file đính kèm.</p>
              @for (id of item.mediaIds; track id) {
                @if (mediaUrl()[id]; as url) {
                  <a [href]="url" target="_blank" rel="noopener noreferrer">Mở file ↗</a>
                } @else {
                  <button
                    class="button secondary compact"
                    (click)="openMedia(id)"
                    [disabled]="busy()"
                  >
                    Lấy file ↗
                  </button>
                }
              }
            }
          } @else {
            <p>Phong thư vẫn đang chờ bạn mở.</p>
            <button class="button primary" (click)="open(item.id)" [disabled]="busy()">
              Mở phong thư ↗
            </button>
          }
          @if (item.senderId === auth.user()?.id && !item.openedAt) {
            <div class="form-actions">
              <button class="button secondary" (click)="edit(item)">Sửa</button>
              <button class="button secondary" (click)="remove(item.id)" [disabled]="busy()">
                Xóa
              </button>
            </div>
          }
        </section>
      }
      @if (loading()) {
        <p role="status">Đang mở danh sách phong thư…</p>
      }
      @if (page(); as result) {
        <div class="phase3-grid">
          @for (item of result.items; track item.id) {
            <button class="card phase3-item phase3-item-button" (click)="select(item.id)">
              <span class="eyebrow">MỞ KHI {{ item.condition }}</span>
              <strong>{{ item.title }}</strong>
              <small
                >{{ item.openedAt ? 'Đã mở' : 'Chưa mở' }} ·
                {{ item.createdAt | date: 'dd.MM.yyyy' }}</small
              >
            </button>
          }
        </div>
        @if (!result.items.length) {
          <p class="empty-state">Chưa có phong thư nào.</p>
        }
        <div class="pagination">
          <button
            class="button secondary"
            [disabled]="result.meta.page === 1"
            (click)="load(result.meta.page - 1)"
          >
            ← Trước
          </button>
          <span>Trang {{ result.meta.page }}</span>
          <button
            class="button secondary"
            [disabled]="!result.meta.hasNext"
            (click)="load(result.meta.page + 1)"
          >
            Sau →
          </button>
        </div>
      }
    </main>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OpenWhenPage {
  private readonly api = inject(ApiService);
  private readonly uploader = inject(MediaUploadService);
  readonly auth = inject(AuthService);
  readonly templates = TEMPLATES;
  readonly recipients = signal<Couple['members']>([]);
  readonly page = signal<Page<OpenWhenLetter> | null>(null);
  readonly selected = signal<OpenWhenLetter | null>(null);
  readonly editing = signal(false);
  readonly editingId = signal<string | null>(null);
  readonly attachmentIds = signal<string[]>([]);
  readonly mediaUrl = signal<Record<string, string>>({});
  readonly loading = signal(false);
  readonly busy = signal(false);
  readonly error = signal('');
  private files: File[] = [];
  readonly form = inject(FormBuilder).nonNullable.group({
    recipientId: ['', Validators.required],
    condition: ['', Validators.required],
    title: ['', Validators.required],
    content: ['', Validators.required],
    theme: ['classic'],
  });

  constructor() {
    void this.loadSpace();
    void this.load(1);
  }

  private async loadSpace(): Promise<void> {
    try {
      const space = await firstValueFrom(this.api.get<Couple>('couples/current'));
      const recipients = space.members.filter((member) => member.userId !== this.auth.user()?.id);
      this.recipients.set(recipients);
      this.form.controls.recipientId.setValue(recipients[0]?.userId ?? '');
    } catch (error) {
      this.error.set(errorMessage(error));
    }
  }

  async load(page: number): Promise<void> {
    this.loading.set(true);
    try {
      this.page.set(
        await firstValueFrom(this.api.get<Page<OpenWhenLetter>>(`open-when?page=${page}&limit=12`)),
      );
    } catch (error) {
      this.error.set(errorMessage(error));
    } finally {
      this.loading.set(false);
    }
  }

  start(): void {
    this.form.reset({
      recipientId: this.recipients()[0]?.userId ?? '',
      condition: '',
      title: '',
      content: '',
      theme: 'classic',
    });
    this.attachmentIds.set([]);
    this.files = [];
    this.editingId.set(null);
    this.editing.set(true);
  }

  applyTemplate(event: Event): void {
    const target = event.target;
    if (target instanceof HTMLSelectElement && target.value)
      this.form.controls.condition.setValue(target.value);
  }

  chooseFiles(event: Event): void {
    const target = event.target;
    if (target instanceof HTMLInputElement) this.files = Array.from(target.files ?? []);
  }

  async select(id: string): Promise<void> {
    try {
      this.selected.set(await firstValueFrom(this.api.get<OpenWhenLetter>(`open-when/${id}`)));
    } catch (error) {
      this.error.set(errorMessage(error));
    }
  }

  edit(item: OpenWhenLetter): void {
    this.form.setValue({
      recipientId: item.recipientId,
      condition: item.condition,
      title: item.title,
      content: item.content ?? '',
      theme: item.theme,
    });
    this.attachmentIds.set(item.mediaIds);
    this.editingId.set(item.id);
    this.editing.set(true);
  }

  async save(): Promise<void> {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.busy()) return;
    this.busy.set(true);
    try {
      const uploaded = await Promise.all(this.files.map((file) => this.uploader.upload(file)));
      const payload = {
        ...this.form.getRawValue(),
        mediaIds: [...this.attachmentIds(), ...uploaded],
      };
      const current = this.editingId();
      const item = current
        ? await firstValueFrom(this.api.patch<OpenWhenLetter>(`open-when/${current}`, payload))
        : await firstValueFrom(this.api.post<OpenWhenLetter>('open-when', payload));
      this.selected.set(item);
      this.editing.set(false);
      this.files = [];
      await this.load(1);
    } catch (error) {
      this.error.set(errorMessage(error));
    } finally {
      this.busy.set(false);
    }
  }

  async open(id: string): Promise<void> {
    this.busy.set(true);
    try {
      this.selected.set(
        await firstValueFrom(this.api.post<OpenWhenLetter>(`open-when/${id}/open`, {})),
      );
    } catch (error) {
      this.error.set(errorMessage(error));
    } finally {
      this.busy.set(false);
    }
  }

  async openMedia(id: string): Promise<void> {
    this.busy.set(true);
    try {
      const data = await firstValueFrom(this.api.get<{ url: string }>(`media/${id}/download`));
      this.mediaUrl.update((urls) => ({ ...urls, [id]: safeCloudinaryDownloadUrl(data.url) }));
    } catch (error) {
      this.error.set(errorMessage(error));
    } finally {
      this.busy.set(false);
    }
  }

  async remove(id: string): Promise<void> {
    if (this.busy() || !window.confirm('Xóa phong thư chưa mở này?')) return;
    this.busy.set(true);
    try {
      await firstValueFrom(this.api.delete(`open-when/${id}`));
      this.selected.set(null);
      await this.load(1);
    } catch (error) {
      this.error.set(errorMessage(error));
    } finally {
      this.busy.set(false);
    }
  }
}
