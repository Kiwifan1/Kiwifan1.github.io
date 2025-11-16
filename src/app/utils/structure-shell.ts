import { ShellBreakdown } from '../models/Shell';

export function computeShellBreakdown(
  width: number,
  height: number,
  length: number,
  faceReplacements: number = 0
): ShellBreakdown {
  const interiorWidth = Math.max(width - 2, 0);
  const interiorHeight = Math.max(height - 2, 0);
  const interiorLength = Math.max(length - 2, 0);

  const totalBlocks = width * height * length;
  const interiorBlocks = interiorWidth * interiorHeight * interiorLength;
  const shellBlocks = totalBlocks - interiorBlocks;

  const glassEligible = Math.max(
    0,
    2 * interiorWidth * interiorHeight +
      2 * interiorLength * interiorHeight +
      2 * interiorWidth * interiorLength
  );

  const edgeBlocks = Math.max(shellBlocks - glassEligible, 0);
  const faceBlocks = shellBlocks - edgeBlocks;

  const faceReplaced = Math.min(faceBlocks, Math.max(faceReplacements, 0));
  const edgeReplaced = Math.max(faceReplacements - faceReplaced, 0);

  const remainingFace = faceBlocks - faceReplaced;
  const remainingEdge = Math.max(edgeBlocks - edgeReplaced, 0);

  const solidCasing = remainingFace + remainingEdge;
  const glassBlocks = remainingFace;

  return {
    solid: {
      casing: solidCasing,
      glass: 0,
    },
    withGlass: {
      casing: remainingEdge,
      glass: glassBlocks,
    },
    totalShell: shellBlocks,
    faceArea: faceBlocks,
    edgeCasing: edgeBlocks,
    replacements: faceReplacements,
  };
}
