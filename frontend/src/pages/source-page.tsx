import { AlertTriangle, Building2 } from 'lucide-react';
import type { EnterpriseRecord, SourceWorkspace } from '../lib/api';
import { cn } from '../lib/utils';
import { Badge } from '../components/ui/badge';
import { EmptyState } from '../components/ui/empty-state';
import { Panel } from '../components/ui/panel';
import { getErrorMessage, InfoTile, PageSkeleton } from './shared';

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
    <div className="grid gap-5 xl:grid-cols-[300px_minmax(0,1fr)_280px]">
      <Panel title="企业列表" description="按风险等级、许可证和在线监测状态组合成执法入口。">
        <div className="space-y-3">
          {workspace.enterprises.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => props.onSelect(item.id)}
              className={cn(
                'w-full rounded-[24px] border px-4 py-4 text-left transition',
                selectedEnterprise.id === item.id
                  ? 'border-[#d7ff64]/45 bg-[#d7ff64]/10'
                  : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.05]'
              )}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-semibold text-white">{item.name}</div>
                <Badge tone={item.monitorStatus === '超标' ? 'warn' : 'good'}>{item.monitorStatus}</Badge>
              </div>
              <div className="mt-2 text-sm text-white/55">{item.industry}</div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge tone={item.riskLevel === '重点' ? 'warn' : 'neutral'}>{item.riskLevel}</Badge>
                <Badge tone={item.permitStatus === '有效' ? 'good' : 'warn'}>{item.permitStatus}</Badge>
              </div>
            </button>
          ))}
        </div>
      </Panel>

      <Panel title={selectedEnterprise.name} description="将许可、排口、监测和合规备注拆成可扫描的档案中心。">
        <div className="grid gap-4 md:grid-cols-2">
          <InfoTile label="行业" value={selectedEnterprise.industry} />
          <InfoTile label="许可证编号" value={selectedEnterprise.licenseCode} />
          <InfoTile label="设备数量" value={`${selectedEnterprise.devices} 套`} />
          <InfoTile label="许可证数量" value={`${selectedEnterprise.permits} 个`} />
          <InfoTile label="位置" value={selectedEnterprise.location} />
          <InfoTile label="联系人" value={selectedEnterprise.contacts} />
        </div>

        <div className="mt-5 rounded-[28px] border border-amber-300/18 bg-amber-300/10 p-5">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-100" />
            <div>
              <div className="text-sm font-semibold text-white">最新事件</div>
              <div className="mt-1 text-sm leading-6 text-white/68">{selectedEnterprise.latestEvent}</div>
            </div>
          </div>
        </div>
      </Panel>

      <Panel title="合规备注" description="右侧单列更适合执法场景快速比对。">
        <div className="space-y-3">
          {selectedEnterprise.complianceNotes.map((item: string) => (
            <div key={item} className="rounded-[24px] border border-white/10 bg-white/[0.03] p-4 text-sm leading-6 text-white/68">
              {item}
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

