import { Routes } from '@angular/router';
import { RootPage } from './pages/root-page/root-page';

export const routes: Routes = [
  { path: '', component: RootPage },
  { path: '**', redirectTo: '' }
];
