import prisma from './src/utils/prisma.util.js';

async function test() {
  try {
    const scan = await prisma.repositoryScan.findFirst();
    if (!scan) return;
    const id = scan.id;

    const fetchedScan = await prisma.repositoryScan.findUnique({
      where: { id },
      include: {
        repository:      true,
        healthScore:     true,
        architecture:    true,
        onboardingGuide: true,
        dependencyGraph: true,
        securityFindings: true,
        findings:        { orderBy: { severity: 'asc' } },
      }
    });

    const metrics = await prisma.fileMetrics.aggregate({
      where: { file: { scanId: id } },
      _sum: {
        linesOfCode:          true,
        functionCount:        true,
        componentCount:       true,
        hookUsage:            true,
        dependencyCount:      true,
        deadCodeIndicators:   true,
        duplicateCodeBlocks:  true,
      },
      _avg: {
        avgFunctionLength:    true,
        cyclomaticComplexity: true,
        cognitiveComplexity:  true,
      },
      _max: {
        largestFunction: true,
        nestingDepth:    true,
      }
    });

    const largeFilesCount = await prisma.fileMetrics.count({
      where: { file: { scanId: id }, linesOfCode: { gt: 300 } }
    });

    const aggregatedMetrics = {
      totalLines:              metrics._sum.linesOfCode          || 0,
      fileCount:               fetchedScan.analyzedFiles                || 0,
      functionCount:           metrics._sum.functionCount        || 0,
      componentCount:          metrics._sum.componentCount       || 0,
      hookUsageCount:          metrics._sum.hookUsage            || 0,
      avgFunctionLength:       metrics._avg.avgFunctionLength    || 0,
      largestFunction:         metrics._max.largestFunction      || 0,
      maxNestingDepth:         metrics._max.nestingDepth         || 0,
      deadCodeIndicators:      metrics._sum.deadCodeIndicators   || 0,
      largeFilesCount:         largeFilesCount                   || 0,
      dependencyCount:         metrics._sum.dependencyCount      || 0,
      duplicateCodeBlocks:     metrics._sum.duplicateCodeBlocks  || 0,
      // New complexity metrics from tree-sitter
      avgCyclomaticComplexity: metrics._avg.cyclomaticComplexity || 0,
      avgCognitiveComplexity:  metrics._avg.cognitiveComplexity  || 0,
    };

    const resPayload = {
      ...fetchedScan,
      metrics: aggregatedMetrics,
    };
    console.log('Payload success');
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await prisma.$disconnect();
  }
}

test();
