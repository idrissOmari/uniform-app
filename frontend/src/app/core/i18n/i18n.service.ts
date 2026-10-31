import { Injectable, Pipe, PipeTransform, inject, signal } from '@angular/core';
import { FR_DICTIONARY } from './fr.dictionary';

@Injectable({ providedIn: 'root' })
export class I18nService {
  private readonly _dictionary = signal<Readonly<Record<string, string>>>(FR_DICTIONARY);

  translate(key: string | null | undefined, params?: Record<string, string | number>): string {
    if (!key) {
      return '';
    }
    const dict = this._dictionary();
    let translated = dict[key] ?? key;
    if (params) {
      for (const [paramKey, paramValue] of Object.entries(params)) {
        translated = translated.replaceAll(`{{${paramKey}}}`, String(paramValue));
      }
    }
    return translated;
  }
}

@Pipe({
  name: 't',
  standalone: true,
})
export class TranslatePipe implements PipeTransform {
  private readonly i18n = inject(I18nService);

  transform(key: string | null | undefined, params?: Record<string, string | number>): string {
    return this.i18n.translate(key, params);
  }
}
