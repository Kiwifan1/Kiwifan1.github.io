import { Routes } from '@angular/router';
import { Home } from './home/home';
import { About } from './about/about';
import { Links } from './links/links';
import { Resume } from './resume/resume';

export const routes: Routes = [
  { path: '', component: Home },
  { path: 'about', component: About },
  { path: 'links', component: Links },
  { path: 'resume', component: Resume },
  {
    path: 'tools',
    loadChildren: () => import('./tools/tools.routes'),
  },
  { path: '**', redirectTo: '' },
];
