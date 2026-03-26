// Kratos Dashboard Metrics API
// REST endpoints for dashboard metrics consumption.
// Mounted by the dashboard server to expose /api/metrics/* routes.

const path = require('path');
const fs = require('fs');

/**
 * Register metrics API routes on an HTTP server.
 * @param {object} opts - { kratosRoot, memoryDbPath }
 * @returns {function} Request handler for /api/metrics/* routes
 */
function createMetricsHandler(opts) {
  const { kratosRoot, memoryDbPath } = opts;

  return async function metricsHandler(req, res) {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const route = url.pathname.replace('/api/metrics', '');

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');

    try {
      // Lazy-load compiled modules
      const distRoot = path.join(kratosRoot, '..', 'dist', '_kratos');
      const { MemoryManager } = require(
        path.join(distRoot, 'intelligence', 'memory', 'memory-manager.js')
      );

      const mm = new MemoryManager(memoryDbPath);
      await mm.init();

      let data;

      switch (route) {
        case '/sprint': {
          const { SprintMetrics } = require(
            path.join(distRoot, 'observability', 'metrics', 'sprint-metrics.js')
          );
          const statusPath = path.join(
            kratosRoot, '..', 'docs', 'implementation-artifacts', 'sprint-status.yaml'
          );
          const sm = new SprintMetrics(mm);
          data = fs.existsSync(statusPath)
            ? sm.calculate(statusPath)
            : { error: 'No sprint-status.yaml found' };
          break;
        }

        case '/agents': {
          const { AgentMetrics } = require(
            path.join(distRoot, 'observability', 'metrics', 'agent-metrics.js')
          );
          const am = new AgentMetrics(mm);
          data = am.calculate();
          break;
        }

        case '/quality': {
          const { QualityMetrics } = require(
            path.join(distRoot, 'observability', 'metrics', 'quality-metrics.js')
          );
          const qm = new QualityMetrics(mm);
          data = qm.calculate();
          break;
        }

        case '/cost': {
          const period = url.searchParams.get('period') || 'month';
          const { CostMetrics } = require(
            path.join(distRoot, 'observability', 'metrics', 'cost-metrics.js')
          );
          const cm = new CostMetrics(mm);
          data = cm.calculate(period);
          break;
        }

        case '/collector': {
          const type = url.searchParams.get('type');
          const name = url.searchParams.get('name');
          const limit = parseInt(url.searchParams.get('limit') || '100');
          const { MetricsCollector } = require(
            path.join(distRoot, 'observability', 'metrics', 'collector.js')
          );
          const mc = new MetricsCollector(mm);
          data = mc.query({
            metric_type: type || undefined,
            metric_name: name || undefined,
            limit,
          });
          break;
        }

        default:
          await mm.close();
          res.statusCode = 404;
          res.end(JSON.stringify({ error: `Unknown route: ${route}` }));
          return;
      }

      await mm.close();
      res.statusCode = 200;
      res.end(JSON.stringify(data, null, 2));
    } catch (err) {
      res.statusCode = 500;
      res.end(JSON.stringify({ error: err.message }));
    }
  };
}

module.exports = { createMetricsHandler };
