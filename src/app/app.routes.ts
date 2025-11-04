import { Routes } from '@angular/router';
import { Home } from './home/home';
import { About } from './about/about';
import { Links } from './links/links';
import { Resume } from './resume/resume';
import { Tools } from './tools/tools';
import { Minecraft } from './tools/minecraft/minecraft';
import { MekanismFission } from './tools/minecraft/mekanism-fission/mekanism-fission';

export const routes: Routes = [
  { path: '', component: Home },
  { path: 'about', component: About },
  { path: 'links', component: Links },
  { path: 'resume', component: Resume },
  { path: 'tools', component: Tools },
  { path: 'tools/minecraft', component: Minecraft },
  { path: 'tools/minecraft/mekanism-fission', component: MekanismFission },
  { path: '**', redirectTo: '' }
];
