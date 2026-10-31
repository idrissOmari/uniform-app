import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { ApplicationConfig, provideZonelessChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { appRoutes } from './app.routes';
import { jwtAuthInterceptor } from './core/auth/auth.store';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZonelessChangeDetection(),
    provideRouter(appRoutes),
    provideHttpClient(withInterceptors([jwtAuthInterceptor])),
  ],
};
