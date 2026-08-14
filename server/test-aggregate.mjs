import prisma from './src/utils/prisma.util.js';

const scanId = 'cmsswm4h500037h361epnoi8l';

const metrics = await prisma.fileMetrics.aggregate({
  where: { file: { scanId } },
  _sum: {
    linesOfCode: true,
    functionCount: true,
    componentCount: true,
    hookUsage: true,
    dependencyCount: true,
    deadCodeIndicators: true,
    duplicateCodeBlocks: true,
  },
  _avg: {
    avgFunctionLength: true,
    cyclomaticComplexity: true,
    cognitiveComplexity: true,
  },
  _max: {
    largestFunction: true,
    nestingDepth: true,
  }
});

console.log('Aggregated metrics for scan:', JSON.stringify(metrics, null, 2));

const aggregatedMetrics = {
  totalLines:              metrics._sum.linesOfCode          || 0,
  functionCount:           metrics._sum.functionCount        || 0,
  componentCount:          metrics._sum.componentCount       || 0,
  hookUsageCount:          metrics._sum.hookUsage            || 0,
  avgFunctionLength:       metrics._avg.avgFunctionLength    || 0,
  largestFunction:         metrics._max.largestFunction      || 0,
  maxNestingDepth:         metrics._max.nestingDepth         || 0,
  deadCodeIndicators:      metrics._sum.deadCodeIndicators   || 0,
  dependencyCount:         metrics._sum.dependencyCount      || 0,
  duplicateCodeBlocks:     metrics._sum.duplicateCodeBlocks  || 0,
  avgCyclomaticComplexity: metrics._avg.cyclomaticComplexity || 0,
  avgCognitiveComplexity:  metrics._avg.cognitiveComplexity  || 0,
};

console.log('\nWhat gets sent to frontend:', JSON.stringify(aggregatedMetrics, null, 2));

await prisma.$disconnect();
