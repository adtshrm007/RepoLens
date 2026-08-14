import prisma from './src/utils/prisma.util.js';

// Check the specific scan from the error URL
const scanId = 'cmssw5ab80004ed3536g5wf98';

const scan = await prisma.repositoryScan.findUnique({
  where: { id: scanId },
  select: { id: true, status: true, totalFiles: true, analyzedFiles: true, createdAt: true, summary: true }
});

console.log('Scan from error URL:', JSON.stringify(scan, null, 2));

// Check file metrics for this scan
if (scan) {
  const metricsCount = await prisma.fileMetrics.count({
    where: { file: { scanId } }
  });
  const nonZeroCC = await prisma.fileMetrics.count({
    where: { file: { scanId }, cyclomaticComplexity: { gt: 0 } }
  });
  console.log(`FileMetrics records: ${metricsCount}, non-zero CC: ${nonZeroCC}`);

  const sampleMetrics = await prisma.fileMetrics.findFirst({
    where: { file: { scanId } },
    select: { cyclomaticComplexity: true, cognitiveComplexity: true, duplicateCodeBlocks: true, contentHash: true }
  });
  console.log('Sample metric:', JSON.stringify(sampleMetrics, null, 2));
}

await prisma.$disconnect();
