import { HttpInterceptorFn } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthSessionResponse, UserRole } from '../models/uniform.models';

const SESSION_STORAGE_KEY = 'uniform_app_auth_session_v1';

@Injectable({ providedIn: 'root' })
export class AuthStore {
  private readonly _session = signal<AuthSessionResponse | null>(this.loadStoredSession());

  readonly session = this._session.asReadonly();
  readonly isAuthenticated = computed<boolean>(() => this._session() !== null);
  readonly currentUsername = computed<string>(() => this._session()?.username ?? '');
  readonly currentFullName = computed<string>(() => this._session()?.fullName ?? '');
  readonly currentEmail = computed<string>(() => this._session()?.email ?? '');
  readonly currentRole = computed<UserRole>(() => this._session()?.role ?? 'ROLE_USER');
  readonly assignedClientId = computed<string | null>(() => this._session()?.assignedClientId ?? null);
  readonly accessToken = computed<string | null>(() => this._session()?.accessToken ?? null);

  readonly isAdmin = computed<boolean>(
    () => this.isAuthenticated() && this._session()?.role === 'ROLE_ADMIN'
  );
  readonly isUser = computed<boolean>(
    () => this.isAuthenticated() && this._session()?.role === 'ROLE_USER'
  );

  setAuthenticatedSession(session: AuthSessionResponse): void {
    this._session.set(session);
    try {
      sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    } catch {
      // Ignore storage errors in private browsing
    }
  }

  clearSession(): void {
    this._session.set(null);
    try {
      sessionStorage.removeItem(SESSION_STORAGE_KEY);
    } catch {
      // Ignore storage errors
    }
  }

  private loadStoredSession(): AuthSessionResponse | null {
    try {
      const raw = sessionStorage.getItem(SESSION_STORAGE_KEY);
      if (!raw) {
        return null;
      }
      const parsed = JSON.parse(raw) as AuthSessionResponse;
      if (parsed && parsed.accessToken && parsed.username && parsed.role) {
        return parsed;
      }
      return null;
    } catch {
      return null;
    }
  }
}

export const jwtAuthInterceptor: HttpInterceptorFn = (req, next) => {
  const authStore = inject(AuthStore);
  const token = authStore.accessToken();
  if (!token) {
    return next(req);
  }
  return next(
    req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
      },
    })
  );
};

export const authGuard: CanActivateFn = () => {
  const authStore = inject(AuthStore);
  const router = inject(Router);
  if (authStore.isAuthenticated()) {
    return true;
  }
  return router.createUrlTree(['/login']);
};

export const guestOnlyGuard: CanActivateFn = () => {
  const authStore = inject(AuthStore);
  const router = inject(Router);
  if (authStore.isAuthenticated()) {
    return router.createUrlTree(['/b2c']);
  }
  return true;
};

export const adminRoleGuard: CanActivateFn = () => {
  const authStore = inject(AuthStore);
  const router = inject(Router);
  if (!authStore.isAuthenticated()) {
    return router.createUrlTree(['/login']);
  }
  if (authStore.isAdmin()) {
    return true;
  }
  return router.createUrlTree(['/b2c']);
};
