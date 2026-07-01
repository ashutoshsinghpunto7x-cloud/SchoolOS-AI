import { Link, useNavigate } from 'react-router-dom';
import { Zap, Activity, BookOpen, ArrowRight, TrendingUp, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { useAutomationDashboard } from '../hooks/useWorkflows';
import { useWorkflows } from '../hooks/useWorkflows';

const StatCard = ({ label, value, icon: Icon, color }: { label: string; value: number | string; icon: React.ElementType; color: string }) => (
  <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex items-center gap-4">
    <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${color}`}>
      <Icon className="w-5 h-5 text-white" />
    </div>
    <div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
    </div>
  </div>
);

export function AutomationWorkspace() {
  const navigate = useNavigate();
  const { data: metrics, isLoading: metricsLoading } = useAutomationDashboard();
  const { data: workflows, isLoading: workflowsLoading } = useWorkflows();

  const enabledCount = workflows?.filter((w) => w.config.enabled).length ?? 0;
  const totalWorkflows = workflows?.length ?? 0;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Automation</h1>
          <p className="text-sm text-gray-500 mt-1">Manage and monitor your school's automation workflows</p>
        </div>
        <div className="flex gap-3">
          <Link
            to="/automation/library"
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <BookOpen className="w-4 h-4" />
            Workflow Library
          </Link>
          <Link
            to="/automation/jobs"
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors"
          >
            <Activity className="w-4 h-4" />
            Job Monitor
          </Link>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Executions"
          value={metricsLoading ? '—' : (metrics?.totalExecutions ?? 0)}
          icon={Zap}
          color="bg-indigo-500"
        />
        <StatCard
          label="Successful"
          value={metricsLoading ? '—' : (metrics?.successCount ?? 0)}
          icon={CheckCircle}
          color="bg-green-500"
        />
        <StatCard
          label="Failed"
          value={metricsLoading ? '—' : (metrics?.failureCount ?? 0)}
          icon={XCircle}
          color="bg-red-500"
        />
        <StatCard
          label="Active Workflows"
          value={workflowsLoading ? '—' : `${enabledCount} / ${totalWorkflows}`}
          icon={TrendingUp}
          color="bg-amber-500"
        />
      </div>

      {/* Quick access workflow cards */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-gray-900">Workflows</h2>
          <Link to="/automation/library" className="text-sm text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1">
            Manage all <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {workflowsLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {(workflows ?? []).map((wf) => (
              <button
                key={wf.id}
                onClick={() => navigate(`/automation/library/${wf.id}`)}
                className="text-left bg-white rounded-xl border border-gray-100 shadow-sm p-4 hover:shadow-md hover:border-indigo-200 transition-all group"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${wf.config.enabled ? 'bg-indigo-50' : 'bg-gray-100'}`}>
                    <Zap className={`w-4 h-4 ${wf.config.enabled ? 'text-indigo-600' : 'text-gray-400'}`} />
                  </div>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${wf.config.enabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {wf.config.enabled ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <p className="text-sm font-semibold text-gray-900 group-hover:text-indigo-700 transition-colors leading-snug">{wf.name}</p>
                <p className="text-xs text-gray-500 mt-1 line-clamp-2">{wf.description}</p>
                <div className="flex items-center gap-1 mt-3 text-xs text-gray-400">
                  <span className="bg-gray-50 px-2 py-0.5 rounded text-gray-600 font-mono">{wf.id}</span>
                  <span>·</span>
                  <span>{wf.jobType}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Recent activity by workflow */}
      {metrics && metrics.recentActivity.length > 0 && (
        <div>
          <h2 className="text-base font-semibold text-gray-900 mb-4">Last 7 Days Activity</h2>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Date</th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Total</th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Success</th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Failed</th>
                </tr>
              </thead>
              <tbody>
                {metrics.recentActivity.map((day) => (
                  <tr key={day.date} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-3 px-4 text-gray-700">{day.date}</td>
                    <td className="py-3 px-4 text-right text-gray-700">{day.count}</td>
                    <td className="py-3 px-4 text-right text-green-600">{day.successCount}</td>
                    <td className="py-3 px-4 text-right text-red-500">{day.count - day.successCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
