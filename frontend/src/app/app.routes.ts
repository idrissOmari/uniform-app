import { Routes } from '@angular/router';
import { adminRoleGuard, authGuard, guestOnlyGuard } from './core/auth/auth.store';
import {
  AdminCatalogListComponent,
  AdminClientsListComponent,
} from './features/admin/admin-client-catalog.component';
import { AdminEstablishmentHubComponent } from './features/admin/admin-establishment-hub.component';
import { AdminGlobalStockComponent } from './features/admin/admin-global-stock.component';
import { AdminSuppliersComponent } from './features/admin/admin-suppliers.component';
import { AdminUserManagementComponent } from './features/admin/admin-user-management.component';
import { AcceptInvitationComponent } from './features/auth/accept-invitation.component';
import { LoginComponent } from './features/auth/login.component';
import { B2bPurchaseOrderEditorComponent } from './features/b2b/b2b-purchase-order-editor.component';
import { B2cOrderCounterComponent } from './features/b2c/b2c-order-counter.component';

export const appRoutes: Routes = [
  {
    path: 'login',
    component: LoginComponent,
    canActivate: [guestOnlyGuard],
  },
  {
    path: 'accept-invitation',
    component: AcceptInvitationComponent,
  },
  {
    path: 'b2c',
    component: B2cOrderCounterComponent,
    canActivate: [authGuard],
  },
  {
    path: 'admin/dashboard',
    component: AdminEstablishmentHubComponent,
    canActivate: [adminRoleGuard],
  },
  {
    path: 'admin/stocks',
    component: AdminGlobalStockComponent,
    canActivate: [adminRoleGuard],
  },
  {
    path: 'admin/clients',
    component: AdminClientsListComponent,
    canActivate: [adminRoleGuard],
  },
  {
    path: 'admin/catalog',
    component: AdminCatalogListComponent,
    canActivate: [adminRoleGuard],
  },
  {
    path: 'admin/suppliers',
    component: AdminSuppliersComponent,
    canActivate: [adminRoleGuard],
  },
  {
    path: 'b2b',
    component: B2bPurchaseOrderEditorComponent,
    canActivate: [adminRoleGuard],
  },
  {
    path: 'admin/users',
    component: AdminUserManagementComponent,
    canActivate: [adminRoleGuard],
  },
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'login',
  },
  {
    path: '**',
    redirectTo: 'login',
  },
];
