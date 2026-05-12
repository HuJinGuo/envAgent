import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Database, FileText, Upload } from 'lucide-react';
import { fetchDocumentDetail, fetchDocumentStatus, fetchDocuments, fetchKnowledgeBases, uploadDocuments, type KnowledgeBase, type KnowledgeDocument, type KnowledgeWorkspace } from '../lib/api';
import { cn } from '../lib/utils';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { EmptyState } from '../components/ui/empty-state';
import { Panel } from '../components/ui/panel';
import { getErrorMessage, InfoTile, MetricCard, PageSkeleton, statusTone } from './shared';

export function KnowledgePage(props: { data?: KnowledgeWorkspace; isLoading: boolean; error: unknown }) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedKnowledgeBaseId, setSelectedKnowledgeBaseId] = useState<string>('all');

  const knowledgeBasesQuery = useQuery({
    queryKey: ['knowledge-bases'],
    queryFn: fetchKnowledgeBases
  });

  const documentsQuery = useQuery({
    queryKey: ['documents', selectedKnowledgeBaseId],
    queryFn: () =>
      fetchDocuments(
        selectedKnowledgeBaseId === 'all'
          ? undefined
          : {
              knowledgeBaseId: selectedKnowledgeBaseId
            }
      )
  });

  const uploadMutation = useMutation({
    mutationFn: (files: File[]) =>
      uploadDocuments({
        files,
        knowledgeBaseId: selectedKnowledgeBaseId === 'all' ? undefined : selectedKnowledgeBaseId
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['documents'] });
      await queryClient.invalidateQueries({ queryKey: ['knowledge-bases'] });
      await queryClient.invalidateQueries({ queryKey: ['workspace-knowledge'] });
      await queryClient.invalidateQueries({ queryKey: ['workspace-dashboard'] });
    }
  });

  const allDocuments = documentsQuery.data?.data ?? props.data?.documents ?? [];
  const documents = useMemo(() => {
    if (selectedKnowledgeBaseId === 'all') {
      return allDocuments;
    }

    return allDocuments.filter(
      (item) =>
        item.knowledgeBaseId === selectedKnowledgeBaseId ||
        item.knowledgeBaseName === selectedKnowledgeBaseId ||
        item.category === selectedKnowledgeBaseId
    );
  }, [allDocuments, selectedKnowledgeBaseId]);
  const pendingDocuments = useMemo(() => documents.filter((item) => !item.isTerminal), [documents]);

  useEffect(() => {
    if (!pendingDocuments.length) {
      return;
    }

    const timer = window.setInterval(() => {
      void Promise.all(
        pendingDocuments.map(async (document) => {
          try {
            return (await fetchDocumentStatus(document.id)).data;
          } catch {
            try {
              return (await fetchDocumentDetail(document.id)).data;
            } catch {
              return null;
            }
          }
        })
      ).then((updates) => {
        const availableUpdates = updates.filter((item): item is KnowledgeDocument => Boolean(item));
        if (!availableUpdates.length) {
          void queryClient.invalidateQueries({ queryKey: ['documents', selectedKnowledgeBaseId] });
          return;
        }

        queryClient.setQueryData(['documents', selectedKnowledgeBaseId], (current: { data?: KnowledgeDocument[] } | undefined) => {
          if (!current?.data) {
            return current;
          }

          return {
            ...current,
            data: current.data.map((item) => {
              const candidate = availableUpdates.find((next) => next.id === item.id);
              return candidate
                ? {
                    ...item,
                    status: candidate.status,
                    statusLabel: candidate.statusLabel,
                    isTerminal: candidate.isTerminal,
                    chunks: candidate.chunks || item.chunks,
                    updatedAt: candidate.updatedAt || item.updatedAt
                  }
                : item;
            })
          };
        });

        if (availableUpdates.some((item) => item.isTerminal)) {
          void queryClient.invalidateQueries({ queryKey: ['documents'] });
          void queryClient.invalidateQueries({ queryKey: ['knowledge-bases'] });
          void queryClient.invalidateQueries({ queryKey: ['workspace-dashboard'] });
        }
      });
    }, 3000);

    return () => {
      window.clearInterval(timer);
    };
  }, [pendingDocuments, queryClient, selectedKnowledgeBaseId]);

  const categoryBadges = useMemo(() => {
    const knowledgeBases = knowledgeBasesQuery.data?.data ?? [];
    if (knowledgeBases.length) {
      return [
        {
          id: 'all',
          label: '全部',
          count: knowledgeBases.reduce((sum, item) => sum + item.documentCount, 0)
        },
        ...knowledgeBases.map((item) => ({
          id: item.id,
          label: item.name,
          count: item.documentCount
        }))
      ];
    }

    const counts = new Map<string, number>();
    documents.forEach((item) => {
      const key = item.knowledgeBaseName || item.category || '未分类';
      counts.set(key, (counts.get(key) ?? 0) + 1);
    });

    return [
      { id: 'all', label: '全部', count: documents.length },
      ...Array.from(counts.entries()).map(([label, count]) => ({
        id: label,
        label,
        count
      }))
    ];
  }, [documents, knowledgeBasesQuery.data]);

  const summaryCards = useMemo(() => {
    if (!documentsQuery.data?.data) {
      return props.data?.summary ?? [];
    }

    const totalDocuments = documents.length;
    const processing = documents.filter((item) => !item.isTerminal).length;
    const totalChunks = documents.reduce((sum, item) => sum + item.chunks, 0);

    return [
      {
        id: 'documents-total',
        label: '知识库总量',
        value: `${totalDocuments} 份`,
        note: '实时来自 documents 列表'
      },
      {
        id: 'documents-processing',
        label: '解析队列',
        value: `${processing} 份`,
        note: processing ? '轮询 document status 中' : '当前没有进行中文档'
      },
      {
        id: 'documents-chunks',
        label: '向量切片',
        value: `${totalChunks.toLocaleString()} 段`,
        note: '以文档详情里的切片数聚合'
      }
    ];
  }, [documents, documentsQuery.data, props.data]);

  if (props.isLoading && !documentsQuery.data && documentsQuery.isLoading) {
    return <PageSkeleton blocks={6} />;
  }

  if (documentsQuery.error && !documents.length) {
    return <EmptyState icon={Database} title="知识库页面加载失败" description={getErrorMessage(documentsQuery.error)} />;
  }

  return (
    <>
      <div className="grid gap-4 md:grid-cols-3">
        {summaryCards.map((item) => (
          <MetricCard key={item.id} label={item.label} value={item.value} note={item.note} accent="emerald" />
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <Panel title="文档列表" description="文档表格已接真实 documents 接口；上传成功后会刷新列表，并对非终态文档轮询状态。">
          <div className="mb-4 flex flex-wrap gap-2">
            {categoryBadges.map((category) => (
              <button key={category.id} type="button" onClick={() => setSelectedKnowledgeBaseId(category.id)}>
                <Badge tone={selectedKnowledgeBaseId === category.id ? 'good' : 'neutral'}>
                  {category.label} · {category.count}
                </Badge>
              </button>
            ))}
          </div>
          {knowledgeBasesQuery.error ? (
            <div className="mb-4 rounded-2xl border border-amber-300/20 bg-amber-300/10 px-3 py-2 text-sm text-amber-50">
              {getErrorMessage(knowledgeBasesQuery.error)}
            </div>
          ) : null}
          <div className="overflow-hidden rounded-[24px] border border-white/10">
            <table className="w-full text-left text-sm">
              <thead className="bg-white/[0.04] text-white/50">
                <tr>
                  <th className="px-4 py-3 font-medium">文档名称</th>
                  <th className="px-4 py-3 font-medium">分类</th>
                  <th className="px-4 py-3 font-medium">大小</th>
                  <th className="px-4 py-3 font-medium">切片数</th>
                  <th className="px-4 py-3 font-medium">上传时间</th>
                  <th className="px-4 py-3 font-medium">状态</th>
                </tr>
              </thead>
              <tbody>
                {documents.length ? (
                  documents.map((item) => (
                    <tr key={item.id} className="border-t border-white/8">
                      <td className="px-4 py-3 text-white">{item.name}</td>
                      <td className="px-4 py-3 text-white/58">{item.knowledgeBaseName || item.category}</td>
                      <td className="px-4 py-3 text-white/58">{item.size}</td>
                      <td className="px-4 py-3 text-white/58">{item.chunks}</td>
                      <td className="px-4 py-3 text-white/45">{item.uploadedAt}</td>
                      <td className="px-4 py-3">
                        <Badge tone={statusTone(item.statusLabel)}>{item.statusLabel}</Badge>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-sm text-white/45">
                      当前分类下暂无文档。
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel title="上传入口" description="真实调用 `/api/v1/documents/upload`，选择文件后立即上传并回刷文档状态。">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(event) => {
              const files = Array.from(event.target.files ?? []);
              if (files.length) {
                uploadMutation.mutate(files);
              }
              event.target.value = '';
            }}
          />
          <div className="rounded-[28px] border border-dashed border-white/14 bg-white/[0.03] px-6 py-12 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#d7ff64]/14 text-[#d7ff64]">
              <Upload className="h-6 w-6" />
            </div>
            <h3 className="mt-4 text-xl font-semibold text-white">选择文件上传到知识库</h3>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-white/55">
              当前会把文件提交到真实 upload 接口，并对解析中、待切片的文档持续轮询状态。
            </p>
            <Button className="mt-5" disabled={uploadMutation.isPending} onClick={() => fileInputRef.current?.click()}>
              <Upload className="h-4 w-4" />
              {uploadMutation.isPending ? '上传中...' : '选择文件'}
            </Button>
          </div>

          {uploadMutation.error ? (
            <div className="mt-4 rounded-2xl border border-amber-300/20 bg-amber-300/10 px-3 py-2 text-sm text-amber-50">
              {getErrorMessage(uploadMutation.error)}
            </div>
          ) : null}

          <div className="mt-5 grid gap-3">
            <InfoTile label="支持格式" value="PDF / DOCX / XLSX / TXT" />
            <InfoTile label="当前策略" value="先上传后轮询异步任务" tone="warn" />
            <InfoTile label="实时状态" value={pendingDocuments.length ? `${pendingDocuments.length} 份文档处理中` : '当前无轮询任务'} tone="good" />
          </div>
        </Panel>
      </div>
    </>
  );
}

