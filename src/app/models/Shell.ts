export interface ShellMaterialSet {
  casing: number;
  glass: number;
}

export interface ShellBreakdown {
  solid: ShellMaterialSet;
  withGlass: ShellMaterialSet;
  totalShell: number;
  faceArea: number;
  edgeCasing: number;
  replacements: number;
}