import { AlertTriangle, Building2 } from 'lucide-react';
import type { EnterpriseRecord, SourceWorkspace } from '../lib/api';
import { cn } from '../lib/utils';
import { Badge } from '../components/ui/badge';
import { EmptyState } from '../components/ui/empty-state';
import { Panel } from '../components/ui/panel';
import { getErrorMessage, PageSkeleton } from './shared';

export function SourcePage(props: {
  data?: SourceWorkspace;
  isLoading: boolean;
  error: unknown;
  selectedEnterprise: EnterpriseRecord | null;
  onSelect: (id: string) => void;
}) {
  if (props.isLoading) {
    return <PageSkeleton blocks={6} />;
  }

  if (props.error) {
    return <EmptyState icon={Building2} title="污染源档案加载失败" description={getErrorMessage(props.error)} />;
  }

  if (!props.data || !props.selectedEnterprise) {
    return null;
  }

  const workspace = props.data;
  const selectedEnterprise = props.selectedEnterprise;

  return (
    <div className="grid gap-4 xl:grid-cols-[280px_minmax(0,1fr)_260px]">
      <Panel title="企业列表">
        <div className="workspace-table">
          <table className="w-full text-left text-sm">
            <thead>
              <tr>
                <th className="px-4 py-3">企业名称</th>
                <th className="px-4 py-3">风险</th>
                <th className="px-4 py-3">监测</th>
              </tr>
            </thead>
            <tbody>
              {workspace.enterprises.map((item) => (
                <tr
                  key={item.id}
                  className={cn('cursor-pointer transition', selectedEnterprise.id === item.id && 'bg-[#ecf5ff]')}
                  onClick={() => props.onSelect(item.id)}
                >
                  <td className="px-4 py-3">
                    <div className="font-medium text-[#334155]">{item.name}</div>
                    <div className="mt-1 text-xs text-[#94a3b8]">{item.industry}</div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={item.riskLevel === '重点' ? 'warn' : 'neutral'}>{item.riskLevel}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={item.monitorStatus === '超标' ? 'warn' : 'good'}>{item.monitorStatus}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel title={selectedEnterprise.name}>
        <div className="workspace-table">
          <table className="w-full text-left text-sm">
            <tbody>
              <DetailRow label="行业" value={selectedEnterprise.industry} />
              <DetailRow label="许可证编号" value={selectedEnterprise.licenseCode} />
              <DetailRow label="设备数量" value={`${selectedEnterprise.devices} 套`} />
              <DetailRow label="许可证数量" value={`${selectedEnterprise.permits} 个`} />
              <DetailRow label="位置" value={selectedEnterprise.location} />
              <DetailRow label="联系人" value={selectedEnterprise.contacts} />
              <DetailRow label="许可证状态" value={selectedEnterprise.permitStatus} />
            </tbody>
          </table>
        </div>

        <div className="mt-4 rounded border border-[#f3d19e] bg-[#fff8e8] px-4 py-3">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 text-[#d97706]" />
            <div className="min-w-0">
              <div className="text-sm font-medium text-[#92400e]">最新事件</div>
              <div className="mt-1 text-sm leading-6 text-[#b45309]">{selectedEnterprise.latestEvent}</div>
            </div>
          </div>
        </div>
      </Panel>

      <Panel title="合规备注">
        <div className="overflow-hidden rounded border border-[#e2e8f0] bg-white">
          {selectedEnterprise.complianceNotes.map((item: string, index: number) => (
            <div key={item} className={cn('px-4 py-3 text-sm leading-6 text-[#475569]', index > 0 && 'border-t border-[#edf2f7]')}>
              {item}
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

function DetailRow(props: { label: string; value: string }) {
  return (
    <tr>
      <th className="w-[136px] border-b border-[#edf2f7] bg-[#f8fafc] px-4 py-3 text-left text-[12px] font-medium text-[#64748b]">
        {props.label}
      </th>
      <td className="border-b border-[#edf2f7] px-4 py-3 text-sm text-[#334155]">{props.value}</td>
    </tr>
  );
}
