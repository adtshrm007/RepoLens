import prisma from './src/utils/prisma.util.js';

// Check the latest FileMetrics records in the DB
const latest = await prisma.fileMetrics.findMany({
  take: 5,
  orderBy: { id: 'desc' },
  select: {
    id: true,
    linesOfCode: true,
    functionCount: true,
    cyclomaticComplexity: true,
    cognitiveComplexity: true,
    duplicateCodeBlocks: true,
    contentHash: true,
    file: { select: { path: true, scan: { select: { id: true, status: true, createdAt: true } } } }
  }
});

console.log('Latest 5 FileMetrics:\n', JSON.stringify(latest, null, 2));

// Check the latest scan
const latestScan = await prisma.repositoryScan.findFirst({
  orderBy: { createdAt: 'desc' },
  select: { id: true, status: true, totalFiles: true, analyzedFiles: true, createdAt: true }
});
console.log('\nLatest scan:', JSON.stringify(latestScan, null, 2));

// Count how many FileMetrics have non-zero cyclomatic complexity
const nonZero = await prisma.fileMetrics.count({
  where: { cyclomaticComplexity: { gt: 0 } }
});
const total = await prisma.fileMetrics.count();
console.log(`\nFileMetrics with cyclomaticComplexity > 0: ${nonZero} / ${total}`);

await prisma.$disconnect();
