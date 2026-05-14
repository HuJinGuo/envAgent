import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Database, Eye, FileStack, RefreshCw, Search, Trash2, Upload, X } from 'lucide-react';
import {
  deleteDocument,
  fetchDocumentChunks,
  fetchDocumentDetail,
  fetchDocumentStatus,
  fetchDocuments,
  fetchKnowledgeBases,
  uploadDocuments,
  type KnowledgeBase,
  type KnowledgeDocument,
  type KnowledgeDocumentChunk,
  type KnowledgeWorkspace
} from '../lib/api';
import { cn } from '../lib/utils';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { EmptyState } from '../components/ui/empty-state';
import { Input } from '../components/ui/input';
import { Panel } from '../components/ui/panel';
import { getErrorMessage, MetricCard, PageSkeleton, statusTone } from './shared';

type DetailTab = 'overview' | 'chunks';

export function KnowledgePage(props: { data?: KnowledgeWorkspace; isLoading: boolean; error: unknown }) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedKnowledgeBaseId, setSelectedKnowledgeBaseId] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [keyword, setKeyword] = useState('');
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadKnowledgeBaseId, setUploadKnowledgeBaseId] = useState('');
  const [activeDocumentId, setActiveDocumentId] = useState<string | null>(null);
  const [detailTab, setDetailTab] = useState<DetailTab>('overview');

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

  const activeDocumentQuery = useQuery({
    queryKey: ['document-detail', activeDocumentId],
    queryFn: () => fetchDocumentDetail(activeDocumentId!),
    enabled: Boolean(activeDocumentId)
  });

  const activeChunksQuery = useQuery({
    queryKey: ['document-chunks', activeDocumentId],
    queryFn: () => fetchDocumentChunks(activeDocumentId!),
    enabled: Boolean(activeDocumentId)
  });

  const uploadMutation = useMutation({
    mutationFn: (files: File[]) =>
      uploadDocuments({
        files,
        knowledgeBaseId: uploadKnowledgeBaseId
      }),
    onSuccess: async () => {
      setUploadOpen(false);
      await queryClient.invalidateQueries({ queryKey: ['documents'] });
      await queryClient.invalidateQueries({ queryKey: ['knowledge-bases'] });
      await queryClient.invalidateQueries({ queryKey: ['workspace-knowledge'] });
      await queryClient.invalidateQueries({ queryKey: ['workspace-dashboard'] });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteDocument(id),
    onSuccess: async () => {
      setActiveDocumentId((current) => (current && current === activeDocumentId ? null : current));
      await queryClient.invalidateQueries({ queryKey: ['documents'] });
      await queryClient.invalidateQueries({ queryKey: ['knowledge-bases'] });
      await queryClient.invalidateQueries({ queryKey: ['workspace-knowledge'] });
      await queryClient.invalidateQueries({ queryKey: ['workspace-dashboard'] });
    }
  });

  const allDocuments = documentsQuery.data?.data ?? props.data?.documents ?? [];
  const selectedKnowledgeBase = useMemo(
    () => (knowledgeBasesQuery.data?.data ?? []).find((item) => item.id === selectedKnowledgeBaseId) ?? null,
    [knowledgeBasesQuery.data, selectedKnowledgeBaseId]
  );

  const documents = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();
    return allDocuments.filter((item) => {
      if (statusFilter !== 'all' && item.status !== statusFilter) {
        return false;
      }
      if (!normalizedKeyword) {
        return true;
      }
      return [item.name, item.knowledgeBaseName, item.category]
        .filter(Boolean)
        .some((field) => field!.toLowerCase().includes(normalizedKeyword));
    });
  }, [allDocuments, keyword, statusFilter]);

  const processingDocuments = useMemo(() => documents.filter((item) => !item.isTerminal), [documents]);
  const readyDocuments = useMemo(() => documents.filter((item) => item.status === 'READY'), [documents]);
  const totalChunks = useMemo(() => documents.reduce((sum, item) => sum + item.chunks, 0), [documents]);
  const activeDocument = activeDocumentQuery.data?.data ?? documents.find((item) => item.id === activeDocumentId) ?? null;
  const activeChunks = activeChunksQuery.data?.data ?? [];

  useEffect(() => {
    const availableKnowledgeBases = knowledgeBasesQuery.data?.data ?? [];
    if (!uploadKnowledgeBaseId && selectedKnowledgeBaseId !== 'all') {
      setUploadKnowledgeBaseId(selectedKnowledgeBaseId);
      return;
    }
    if (!uploadKnowledgeBaseId && availableKnowledgeBases.length) {
      setUploadKnowledgeBaseId(availableKnowledgeBases[0].id);
    }
  }, [knowledgeBasesQuery.data, selectedKnowledgeBaseId, uploadKnowledgeBaseId]);

  useEffect(() => {
    if (!processingDocuments.length) {
      return;
    }

    const timer = window.setInterval(() => {
      void Promise.all(
        processingDocuments.map(async (document) => {
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
                    updatedAt: candidate.updatedAt || item.updatedAt,
                    errorMessage: candidate.errorMessage || item.errorMessage
                  }
                : item;
            })
          };
        });

        if (availableUpdates.some((item) => item.isTerminal)) {
          void queryClient.invalidateQueries({ queryKey: ['documents'] });
          void queryClient.invalidateQueries({ queryKey: ['knowledge-bases'] });
          void queryClient.invalidateQueries({ queryKey: ['workspace-dashboard'] });
          if (activeDocumentId) {
            void queryClient.invalidateQueries({ queryKey: ['document-detail', activeDocumentId] });
            void queryClient.invalidateQueries({ queryKey: ['document-chunks', activeDocumentId] });
          }
        }
      });
    }, 3000);

    return () => {
      window.clearInterval(timer);
    };
  }, [activeDocumentId, processingDocuments, queryClient, selectedKnowledgeBaseId]);

  const knowledgeBaseOptions = useMemo(() => {
    const bases = knowledgeBasesQuery.data?.data ?? [];
    return [
      { id: 'all', label: '全部知识库', documentCount: bases.reduce((sum, item) => sum + item.documentCount, 0) },
      ...bases.map((item) => ({
        id: item.id,
        label: item.name,
        documentCount: item.documentCount
      }))
    ];
  }, [knowledgeBasesQuery.data]);

  const summaryCards = [
    {
      id: 'documents-total',
      label: '文档总数',
      value: `${documents.length} 份`,
      note: selectedKnowledgeBase ? `${selectedKnowledgeBase.name} 当前文档量` : '当前筛选结果'
    },
    {
      id: 'documents-ready',
      label: '已入库',
      value: `${readyDocuments.length} 份`,
      note: processingDocuments.length ? `${processingDocuments.length} 份处理中` : '当前没有排队任务'
    },
    {
      id: 'documents-chunks',
      label: '切片总数',
      value: `${totalChunks.toLocaleString()} 段`,
      note: '用于后续向量检索和引用定位'
    }
  ];

  if (props.isLoading && !documentsQuery.data && documentsQuery.isLoading) {
    return <PageSkeleton blocks={6} />;
  }

  if (documentsQuery.error && !documents.length) {
    return <EmptyState icon={Database} title="知识库页面加载失败" description={getErrorMessage(documentsQuery.error)} />;
  }

  return (
    <>
      <div className="grid gap-3 md:grid-cols-3">
        {summaryCards.map((item) => (
          <MetricCard key={item.id} label={item.label} value={item.value} note={item.note} accent="emerald" />
        ))}
      </div>

      <Panel
        title="知识内容工作台"
        description="这里负责选择知识库、上传文档、跟踪入库状态以及查看切片与向量结果。知识库本身的新增和维护放在基础管理里。"
      >
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="grid gap-3 md:grid-cols-[220px_160px_minmax(0,1fr)] lg:min-w-0 lg:flex-1">
            <label className="space-y-1.5">
              <span className="text-xs text-[#64748b]">知识库</span>
              <select
                value={selectedKnowledgeBaseId}
                onChange={(event) => setSelectedKnowledgeBaseId(event.target.value)}
                className="h-10 w-full rounded border border-[#dbe7f3] bg-white px-3 text-sm text-[#334155] outline-none transition focus:border-[#93c5fd]"
              >
                {knowledgeBaseOptions.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label} · {item.documentCount}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1.5">
              <span className="text-xs text-[#64748b]">状态</span>
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="h-10 w-full rounded border border-[#dbe7f3] bg-white px-3 text-sm text-[#334155] outline-none transition focus:border-[#93c5fd]"
              >
                <option value="all">全部状态</option>
                <option value="READY">已入库</option>
                <option value="PROCESSING">解析中</option>
                <option value="PENDING">待切片</option>
                <option value="FAILED">失败</option>
              </select>
            </label>

            <label className="space-y-1.5">
              <span className="text-xs text-[#64748b]">搜索文档</span>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94a3b8]" />
                <Input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="按文件名或知识库筛选" className="pl-10" />
              </div>
            </label>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => void documentsQuery.refetch()}>
              <RefreshCw className="h-4 w-4" />
              刷新
            </Button>
            <Button onClick={() => setUploadOpen(true)}>
              <Upload className="h-4 w-4" />
              上传文档
            </Button>
          </div>
        </div>

        <div className="mt-5 workspace-table">
          <table className="w-full text-left text-sm">
            <thead>
              <tr>
                <th className="px-4 py-3">文档名称</th>
                <th className="px-4 py-3">所属知识库</th>
                <th className="px-4 py-3">大小</th>
                <th className="px-4 py-3">切片数</th>
                <th className="px-4 py-3">状态</th>
                <th className="px-4 py-3">更新时间</th>
                <th className="px-4 py-3 text-right">操作</th>
              </tr>
            </thead>
            <tbody>
              {documents.length ? (
                documents.map((item) => (
                  <tr key={item.id}>
                    <td className="px-4 py-3">
                      <div className="font-medium text-[#334155]">{item.name}</div>
                      <div className="mt-1 text-xs text-[#94a3b8]">{item.uploadedAt}</div>
                    </td>
                    <td className="px-4 py-3 text-[#64748b]">{item.knowledgeBaseName || item.category}</td>
                    <td className="px-4 py-3 text-[#64748b]">{item.size}</td>
                    <td className="px-4 py-3 text-[#64748b]">{item.chunks}</td>
                    <td className="px-4 py-3">
                      <Badge tone={statusTone(item.statusLabel)}>{item.statusLabel}</Badge>
                    </td>
                    <td className="px-4 py-3 text-[#64748b]">{item.updatedAt || '--'}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setActiveDocumentId(item.id);
                            setDetailTab('chunks');
                          }}
                        >
                          <Eye className="h-4 w-4" />
                          查看切片
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={deleteMutation.isPending}
                          onClick={() => deleteMutation.mutate(item.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                          删除
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-sm text-[#94a3b8]">
                    当前筛选条件下暂无文档。
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>

      {uploadOpen ? (
        <UploadDialog
          knowledgeBases={knowledgeBasesQuery.data?.data ?? []}
          selectedKnowledgeBaseId={uploadKnowledgeBaseId}
          uploadPending={uploadMutation.isPending}
          error={uploadMutation.error}
          onSelectKnowledgeBase={setUploadKnowledgeBaseId}
          onClose={() => setUploadOpen(false)}
          onPickFiles={() => fileInputRef.current?.click()}
        />
      ) : null}

      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(event) => {
          const files = Array.from(event.target.files ?? []);
          if (files.length && uploadKnowledgeBaseId) {
            uploadMutation.mutate(files);
          }
          event.target.value = '';
        }}
      />

      {activeDocumentId ? (
        <DocumentDetailDrawer
          document={activeDocument}
          chunks={activeChunks}
          detailTab={detailTab}
          detailLoading={activeDocumentQuery.isLoading || activeChunksQuery.isLoading}
          detailError={activeDocumentQuery.error ?? activeChunksQuery.error}
          onClose={() => setActiveDocumentId(null)}
          onTabChange={setDetailTab}
        />
      ) : null}
    </>
  );
}

function UploadDialog(props: {
  knowledgeBases: KnowledgeBase[];
  selectedKnowledgeBaseId: string;
  uploadPending: boolean;
  error: unknown;
  onSelectKnowledgeBase: (value: string) => void;
  onClose: () => void;
  onPickFiles: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0f172a]/35 px-4 py-6 backdrop-blur-[2px]">
      <div className="w-full max-w-[560px] rounded border border-[#dbe7f3] bg-white shadow-[0_18px_48px_rgba(15,23,42,0.16)]">
        <div className="flex items-start justify-between border-b border-[#edf2f7] px-5 py-4">
          <div>
            <h3 className="text-lg font-semibold text-[#303133]">上传文档</h3>
            <p className="mt-1 text-sm text-[#909399]">先选择目标知识库，再上传文件。文档会进入异步解析和切片流程。</p>
          </div>
          <button
            type="button"
            className="rounded border border-transparent p-2 text-[#909399] transition hover:border-[#dcdfe6] hover:bg-[#f5f7fa] hover:text-[#409eff]"
            onClick={props.onClose}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 px-5 py-5">
          <label className="space-y-2">
            <span className="text-xs text-[#606266]">目标知识库</span>
            <select
              value={props.selectedKnowledgeBaseId}
              onChange={(event) => props.onSelectKnowledgeBase(event.target.value)}
              className="h-10 w-full rounded border border-[#dbe7f3] bg-white px-3 text-sm text-[#303133] outline-none transition focus:border-[#93c5fd]"
            >
              <option value="">请选择知识库</option>
              {props.knowledgeBases.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} · {item.documentCount} 份
                </option>
              ))}
            </select>
          </label>

          <div className="rounded border border-dashed border-[#cbd5e1] bg-[#f8fbff] px-6 py-10 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded bg-white text-[#2563eb] shadow-sm">
              <Upload className="h-6 w-6" />
            </div>
            <div className="mt-4 text-base font-semibold text-[#334155]">上传到所选知识库</div>
            <div className="mt-2 text-sm leading-6 text-[#64748b]">支持 `PDF / DOCX / TXT`。上传后会自动解析、切片并生成向量。</div>
            <Button className="mt-5" disabled={!props.selectedKnowledgeBaseId || props.uploadPending} onClick={props.onPickFiles}>
              <Upload className="h-4 w-4" />
              {props.uploadPending ? '上传中...' : '选择文件'}
            </Button>
          </div>

          {props.error ? (
            <div className="rounded border border-[#f3d19e] bg-[#fdf6ec] px-3 py-2 text-sm text-[#a66a00]">
              {getErrorMessage(props.error)}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function DocumentDetailDrawer(props: {
  document: KnowledgeDocument | null;
  chunks: KnowledgeDocumentChunk[];
  detailTab: DetailTab;
  detailLoading: boolean;
  detailError: unknown;
  onClose: () => void;
  onTabChange: (tab: DetailTab) => void;
}) {
  const [activeChunkId, setActiveChunkId] = useState<string | null>(null);
  const [chunkKeyword, setChunkKeyword] = useState('');

  useEffect(() => {
    if (!props.chunks.length) {
      setActiveChunkId(null);
      return;
    }
    setActiveChunkId((current) => (current && props.chunks.some((item) => item.id === current) ? current : props.chunks[0].id));
  }, [props.chunks, props.document?.id]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0f172a]/38 px-4 py-6 backdrop-blur-[2px]">
      <div className="flex h-[min(88vh,920px)] w-full max-w-[1280px] flex-col overflow-hidden rounded-[20px] border border-[#dbe7f3] bg-white shadow-[0_24px_90px_rgba(15,23,42,0.22)]">
        <div className="flex items-start justify-between border-b border-[#edf2f7] bg-[linear-gradient(180deg,#f8fbff_0%,#ffffff_100%)] px-6 py-5">
          <div>
            <h3 className="text-xl font-semibold text-[#303133]">{props.document?.name ?? '文档详情'}</h3>
            <p className="mt-1 text-sm text-[#909399]">这里查看入库概览、切片索引与向量预览。大量切片时可通过左侧索引快速定位。</p>
          </div>
          <button
            type="button"
            className="rounded border border-transparent p-2 text-[#909399] transition hover:border-[#dcdfe6] hover:bg-[#f5f7fa] hover:text-[#409eff]"
            onClick={props.onClose}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex gap-2 border-b border-[#edf2f7] px-6 py-3">
          <button
            type="button"
            className={cn(
              'rounded-full border px-3 py-1.5 text-sm transition',
              props.detailTab === 'overview'
                ? 'border-[#bfdbfe] bg-[#eff6ff] text-[#2563eb]'
                : 'border-[#dbe7f3] bg-white text-[#64748b] hover:bg-[#f8fbff]'
            )}
            onClick={() => props.onTabChange('overview')}
          >
            概览
          </button>
          <button
            type="button"
            className={cn(
              'rounded-full border px-3 py-1.5 text-sm transition',
              props.detailTab === 'chunks'
                ? 'border-[#bfdbfe] bg-[#eff6ff] text-[#2563eb]'
                : 'border-[#dbe7f3] bg-white text-[#64748b] hover:bg-[#f8fbff]'
            )}
            onClick={() => props.onTabChange('chunks')}
          >
            切片与向量
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-hidden px-6 py-5">
          {props.detailLoading ? (
            <PageSkeleton blocks={4} />
          ) : props.detailError ? (
            <EmptyState icon={FileStack} title="文档详情加载失败" description={getErrorMessage(props.detailError)} />
          ) : props.detailTab === 'overview' ? (
            <div className="chat-scrollbar h-full overflow-y-auto pr-1">
              <DocumentOverview document={props.document} chunks={props.chunks} />
            </div>
          ) : (
            <DocumentChunksPanel
              chunks={props.chunks}
              keyword={chunkKeyword}
              activeChunkId={activeChunkId}
              onKeywordChange={setChunkKeyword}
              onSelectChunk={setActiveChunkId}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function DocumentOverview(props: { document: KnowledgeDocument | null; chunks: KnowledgeDocumentChunk[] }) {
  if (!props.document) {
    return <EmptyState icon={FileStack} title="未找到文档信息" description="当前文档详情不存在或已被删除。" />;
  }

  const sampleChunk = props.chunks[0] ?? null;
  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2">
        <OverviewTile label="所属知识库" value={props.document.knowledgeBaseName || props.document.category} />
        <OverviewTile label="当前状态" value={props.document.statusLabel} />
        <OverviewTile label="文件大小" value={props.document.size} />
        <OverviewTile label="切片数量" value={`${props.document.chunks} 段`} />
        <OverviewTile label="上传时间" value={props.document.uploadedAt} />
        <OverviewTile label="最近更新" value={props.document.updatedAt || '--'} />
      </div>

      {props.document.errorMessage ? (
        <div className="rounded border border-[#f3d19e] bg-[#fdf6ec] px-4 py-3 text-sm text-[#a66a00]">
          {props.document.errorMessage}
        </div>
      ) : null}

      <div className="rounded border border-[#dbe7f3] bg-[#f8fbff] px-4 py-4">
        <div className="text-sm font-medium text-[#334155]">入库结果</div>
        <div className="mt-2 text-sm leading-7 text-[#64748b]">
          当前文档已拆分为 <span className="font-medium text-[#334155]">{props.document.chunks}</span> 个切片。
          {sampleChunk ? ` 首个切片类型为 ${sampleChunk.chunkType || 'text'}，token 约 ${sampleChunk.tokenCount}。` : ' 切片详情会在解析完成后展示。'}
        </div>
      </div>
    </div>
  );
}

function DocumentChunksPanel(props: {
  chunks: KnowledgeDocumentChunk[];
  keyword: string;
  activeChunkId: string | null;
  onKeywordChange: (value: string) => void;
  onSelectChunk: (id: string) => void;
}) {
  if (!props.chunks.length) {
    return (
      <EmptyState
        icon={FileStack}
        title="暂无切片结果"
        description="文档仍在解析中，或当前文档尚未生成可展示的切片。"
      />
    );
  }

  const normalizedKeyword = props.keyword.trim().toLowerCase();
  const filteredChunks = props.chunks.filter((chunk) => {
    if (!normalizedKeyword) {
      return true;
    }
    return [
      String(chunk.chunkIndex),
      chunk.chunkType,
      chunk.content,
      chunk.headingPath.join(' / '),
      chunk.metadataJson
    ]
      .filter(Boolean)
      .some((field) => field.toLowerCase().includes(normalizedKeyword));
  });
  const activeChunk =
    filteredChunks.find((chunk) => chunk.id === props.activeChunkId) ??
    filteredChunks[0] ??
    null;

  return (
    <div className="grid h-full min-h-0 gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
      <div className="flex min-h-0 flex-col overflow-hidden rounded-[18px] border border-[#dbe7f3] bg-[#f8fbff]">
        <div className="border-b border-[#e2e8f0] px-4 py-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-[#334155]">切片索引</div>
              <div className="mt-1 text-xs text-[#94a3b8]">
                共 {props.chunks.length} 段，当前筛出 {filteredChunks.length} 段
              </div>
            </div>
            <div className="rounded-full bg-white px-3 py-1 text-xs text-[#64748b]">
              {activeChunk ? `定位到 #${activeChunk.chunkIndex}` : '未命中'}
            </div>
          </div>
          <label className="mt-3 block">
            <span className="sr-only">搜索切片</span>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94a3b8]" />
              <Input
                value={props.keyword}
                onChange={(event) => props.onKeywordChange(event.target.value)}
                placeholder="按内容、章节、类型或序号筛选"
                className="bg-white pl-10"
              />
            </div>
          </label>
        </div>

        <div className="chat-scrollbar min-h-0 flex-1 overflow-y-auto px-3 py-3">
          <div className="space-y-2">
            {filteredChunks.map((chunk) => (
              <button
                key={chunk.id}
                type="button"
                onClick={() => props.onSelectChunk(chunk.id)}
                className={cn(
                  'w-full rounded-[16px] border px-3 py-3 text-left transition',
                  activeChunk?.id === chunk.id
                    ? 'border-[#60a5fa] bg-white shadow-[0_0_0_1px_rgba(96,165,250,0.18),0_10px_24px_rgba(96,165,250,0.12)]'
                    : 'border-transparent bg-white/70 hover:border-[#dbe7f3] hover:bg-white'
                )}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-[#eff6ff] px-2 py-1 text-[11px] font-medium text-[#2563eb]">#{chunk.chunkIndex}</span>
                    <span className="rounded bg-[#f8fafc] px-2 py-1 text-[11px] text-[#64748b]">{chunk.chunkType || 'text'}</span>
                  </div>
                  <span className="text-[11px] text-[#94a3b8]">{chunk.tokenCount} tokens</span>
                </div>
                <div className="mt-2 line-clamp-2 text-sm leading-6 text-[#334155]">{chunk.content}</div>
                <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-[#94a3b8]">
                  {chunk.pageNo ? <span>P.{chunk.pageNo}</span> : null}
                  {chunk.headingPath[0] ? <span>{chunk.headingPath[0]}</span> : <span>未识别章节路径</span>}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="min-h-0 overflow-hidden rounded-[18px] border border-[#dbe7f3] bg-white">
        {activeChunk ? (
          <div className="flex h-full min-h-0 flex-col">
            <div className="border-b border-[#edf2f7] px-5 py-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded bg-[#eff6ff] px-2.5 py-1 text-xs font-medium text-[#2563eb]">Chunk #{activeChunk.chunkIndex}</span>
                  <span className="rounded bg-[#f8fafc] px-2.5 py-1 text-xs text-[#64748b]">{activeChunk.chunkType || 'text'}</span>
                  <span className="rounded bg-[#f8fafc] px-2.5 py-1 text-xs text-[#64748b]">{activeChunk.tokenCount} tokens</span>
                  {activeChunk.pageNo ? <span className="rounded bg-[#f8fafc] px-2.5 py-1 text-xs text-[#64748b]">P.{activeChunk.pageNo}</span> : null}
                </div>
                <div className="text-xs text-[#94a3b8]">
                  {activeChunk.embeddingDimensions ? `${activeChunk.embeddingDimensions} dims` : '向量待生成'}
                </div>
              </div>
            </div>

            <div className="chat-scrollbar min-h-0 flex-1 overflow-y-auto px-5 py-5">
              {activeChunk.headingPath.length ? (
                <div className="mb-4 flex flex-wrap gap-2">
                  {activeChunk.headingPath.map((item) => (
                    <span key={`${activeChunk.id}-${item}`} className="rounded-full border border-[#dbe7f3] bg-[#f8fbff] px-3 py-1 text-xs text-[#64748b]">
                      {item}
                    </span>
                  ))}
                </div>
              ) : null}

              <div className="rounded-[16px] border border-[#edf2f7] bg-[#fbfdff] px-4 py-4 text-sm leading-7 text-[#334155]">
                <div className="mb-2 text-xs font-medium uppercase tracking-[0.12em] text-[#94a3b8]">切片正文</div>
                <div className="whitespace-pre-wrap">{activeChunk.content}</div>
              </div>

              <div className="mt-4 grid gap-4 xl:grid-cols-2">
                <div className="rounded-[16px] border border-[#edf2f7] bg-[#f8fafc] px-4 py-4">
                  <div className="text-xs font-medium uppercase tracking-[0.12em] text-[#94a3b8]">向量预览</div>
                  <div className="mt-3 break-all font-mono text-xs leading-6 text-[#475569]">
                    {activeChunk.embeddingPreview || '当前切片还没有向量预览。'}
                  </div>
                </div>
                <div className="rounded-[16px] border border-[#edf2f7] bg-[#f8fafc] px-4 py-4">
                  <div className="text-xs font-medium uppercase tracking-[0.12em] text-[#94a3b8]">Metadata</div>
                  <div className="mt-3 break-all font-mono text-xs leading-6 text-[#475569]">
                    {activeChunk.metadataJson || '{}'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <EmptyState icon={FileStack} title="未找到匹配切片" description="可以调整筛选关键词，或从左侧重新选择切片。" />
        )}
      </div>
    </div>
  );
}

function OverviewTile(props: { label: string; value: string }) {
  return (
    <div className="rounded border border-[#dbe7f3] bg-white px-4 py-3">
      <div className="text-xs text-[#94a3b8]">{props.label}</div>
      <div className="mt-1 text-sm font-medium text-[#334155]">{props.value}</div>
    </div>
  );
}
