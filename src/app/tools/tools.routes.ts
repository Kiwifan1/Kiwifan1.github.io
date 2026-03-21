import { Routes } from '@angular/router';
import { ToolsLayout } from './tools-layout/tools-layout';

export default [
  {
    path: '',
    component: ToolsLayout,
    children: [
      {
        path: '',
        loadComponent: () => import('./tools').then(m => m.Tools),
      },
      {
        path: 'minecraft',
        loadComponent: () => import('./minecraft/minecraft').then(m => m.Minecraft),
      },
      {
        path: 'minecraft/mekanism',
        loadComponent: () => import('./minecraft/mekanism/mekanism').then(m => m.MekanismPlanner),
      },
    ],
  },
] satisfies Routes;
